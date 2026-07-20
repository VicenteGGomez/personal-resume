import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { createHash, timingSafeEqual } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";

/**
 * Minimal single-tenant admin auth: an allow-listed email plus a shared
 * password (stored as an environment variable), backed by a signed,
 * httpOnly session cookie. No database or third-party account required.
 */

const COOKIE_NAME = "admin_session";
const SESSION_DAYS = 7;
const DEV_SECRET = "dev-only-insecure-secret-change-me";
const DEV_PASSWORD = "admin";

export const ALLOWED_EMAILS: string[] = (
  process.env.ADMIN_EMAILS ?? "vicente@vicentegomez.cl,vgomezo@fen.uchile.cl"
)
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export interface Session {
  email: string;
}

function isProd(): boolean {
  return process.env.NODE_ENV === "production";
}

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (secret) return new TextEncoder().encode(secret);
  if (isProd()) {
    throw new Error("SESSION_SECRET is not set. Refusing to sign sessions.");
  }
  console.warn("[auth] SESSION_SECRET not set — using an insecure dev secret.");
  return new TextEncoder().encode(DEV_SECRET);
}

function getAdminPassword(): string | null {
  const password = process.env.ADMIN_PASSWORD;
  if (password) return password;
  if (isProd()) {
    console.error("[auth] ADMIN_PASSWORD is not set. Logins are disabled.");
    return null;
  }
  console.warn(`[auth] ADMIN_PASSWORD not set — using dev password "${DEV_PASSWORD}".`);
  return DEV_PASSWORD;
}

function constantTimeEquals(a: string, b: string): boolean {
  // Hash to a fixed length first so we never leak the length of the secret.
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function isAllowedEmail(email: string): boolean {
  return ALLOWED_EMAILS.includes(email.trim().toLowerCase());
}

/** Returns true when the email is allow-listed and the password matches. */
export function verifyCredentials(email: string, password: string): boolean {
  const expected = getAdminPassword();
  if (!expected) return false;
  if (!isAllowedEmail(email)) return false;
  return constantTimeEquals(password, expected);
}

export async function createSession(email: string): Promise<void> {
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  const token = await new SignJWT({ email: email.trim().toLowerCase() })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(getSecretKey());

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd(),
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/** Reads and verifies the current session. Memoized per request. */
export const getSession = cache(async (): Promise<Session | null> => {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      algorithms: ["HS256"],
    });
    const email = typeof payload.email === "string" ? payload.email : "";
    if (!email || !isAllowedEmail(email)) return null;
    return { email };
  } catch {
    return null;
  }
});
