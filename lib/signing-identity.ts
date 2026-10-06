import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";
import { X509Certificate, createHash, createPrivateKey, type KeyObject } from "node:crypto";
import { createSelfSignedIdentity } from "@/lib/self-signed-cert";

/**
 * The certificate and key that sign every PDF from `/admin/firmas`.
 *
 * Production reads them from SIGNING_CERT_PEM / SIGNING_KEY_PEM (made once with
 * `node scripts/create-signing-cert.mjs`). Without them, local dev mints a
 * throwaway identity under `data/` so the flow can be tried end to end;
 * production refuses instead, because a key that changes between deploys
 * would make yesterday's signatures look like someone else's.
 */

export interface SigningIdentity {
  certPem: string;
  certDer: Buffer;
  cert: X509Certificate;
  key: KeyObject;
  /** SHA-256 of the certificate, uppercase hex with colons (Adobe's format). */
  fingerprint: string;
}

const DEV_IDENTITY_FILE = path.join(process.cwd(), "data", "dev-signing-identity.json");

/**
 * Vercel env vars hold PEMs fine, but pasted ones often arrive with literal
 * `\n` — and sometimes with the quotes the script printed around them.
 */
function pemFromEnv(value: string | undefined): string | null {
  if (!value) return null;
  const pem = value.trim().replace(/^"|"$/g, "").replace(/\\n/g, "\n");
  return pem.includes("-----BEGIN") ? pem : null;
}

async function devIdentity(): Promise<{ certPem: string; keyPem: string }> {
  try {
    return JSON.parse(await fs.readFile(DEV_IDENTITY_FILE, "utf8"));
  } catch {
    console.warn("[firmas] SIGNING_CERT_PEM not set — minting a local dev certificate.");
    const identity = createSelfSignedIdentity({
      commonName: "Vicente G. Gómez (DEV)",
      email: "vicente@vicentegomez.cl",
    });
    await fs.mkdir(path.dirname(DEV_IDENTITY_FILE), { recursive: true });
    await fs.writeFile(DEV_IDENTITY_FILE, JSON.stringify(identity, null, 2), "utf8");
    return identity;
  }
}

export function hasSigningIdentity(): boolean {
  return Boolean(process.env.SIGNING_CERT_PEM && process.env.SIGNING_KEY_PEM);
}

let loaded: Promise<SigningIdentity> | null = null;

export function getSigningIdentity(): Promise<SigningIdentity> {
  loaded ??= (async () => {
    let certPem = pemFromEnv(process.env.SIGNING_CERT_PEM);
    let keyPem = pemFromEnv(process.env.SIGNING_KEY_PEM);
    if (!certPem || !keyPem) {
      if (process.env.NODE_ENV === "production") {
        throw new Error("SIGNING_CERT_PEM / SIGNING_KEY_PEM are not set.");
      }
      ({ certPem, keyPem } = await devIdentity());
    }
    const cert = new X509Certificate(certPem);
    return {
      certPem,
      certDer: cert.raw,
      cert,
      key: createPrivateKey(keyPem),
      fingerprint: cert.fingerprint256,
    };
  })().catch((error) => {
    loaded = null;
    throw error;
  });
  return loaded;
}

export function sha256Hex(data: Uint8Array): string {
  return createHash("sha256").update(data).digest("hex");
}
