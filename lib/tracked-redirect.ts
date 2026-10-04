import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { after } from "next/server";
import { track } from "@/lib/analytics-server";

/**
 * Short links that leave the site — `/linkedin`, `/whatsapp`, `/clases`,
 * `/go` — and the contact card at `/vcard`.
 *
 * Each one is counted as a page view of its own path, with the `?src=` it
 * arrived with, so the dashboard shows it under "Origen de las visitas" and in
 * the visitor's session like any other page. The write happens in `after()`:
 * the redirect never waits on analytics.
 */

/**
 * Count this request as a view of `path`, then send the visitor to
 * `destination`. `no-store`, so every open reaches the server and counts.
 */
export function trackedRedirect(
  request: Request,
  path: string,
  destination: string,
): Response {
  countView(request, path);
  return new Response(null, {
    status: 302,
    headers: { Location: destination, "Cache-Control": "no-store" },
  });
}

/** Record a view of `path` with the request's own `?src=`. */
export function countView(request: Request, path: string): void {
  const src = new URL(request.url).searchParams.get("src") ?? undefined;
  after(() => track(request, { kind: "view", path, src }));
}

/* -------------------------------------------------------------------------- */
/* Signed links for /go                                                       */
/* -------------------------------------------------------------------------- */

/*
 * `/go?u=<url>&s=<signature>` redirects anywhere, so it only follows URLs this
 * server signed — and it signs only for a signed-in admin (see
 * `app/qr/actions.ts`). Without that, anyone could mint links on this domain
 * that lead to a phishing page under your name.
 */

function signingKey(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET is not set. Refusing to sign links.");
  }
  return "dev-only-insecure-secret-change-me";
}

/** 128 bits of HMAC, base64url: short enough to keep the QR readable. */
export function signGoUrl(target: string): string {
  return createHmac("sha256", `go-link:${signingKey()}`)
    .update(target)
    .digest("base64url")
    .slice(0, 22);
}

export function verifyGoUrl(target: string, signature: string): boolean {
  const expected = Buffer.from(signGoUrl(target));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/** An absolute http(s) URL, or `null`. Bare hosts get `https://`. */
export function parseExternalUrl(input: string): string | null {
  const raw = input.trim();
  if (!raw || raw.length > 2000) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (!url.hostname.includes(".")) return null;
    return url.toString();
  } catch {
    return null;
  }
}
