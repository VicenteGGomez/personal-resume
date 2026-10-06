import { generateKeyPairSync, randomBytes } from "node:crypto";
import forge from "node-forge";

/**
 * A self-signed certificate for signing PDFs: free, and enough for Adobe to
 * show who signed and that nothing changed since — though it will call the
 * identity "unknown" until the reader trusts this certificate (the one
 * /verify/certificate hands out).
 *
 * No `server-only` here: `scripts/create-signing-cert.mjs` runs it directly.
 */

const VALID_YEARS = 10;

export function createSelfSignedIdentity({
  commonName,
  email,
  country = "CL",
}: {
  commonName: string;
  email: string;
  country?: string;
}): { certPem: string; keyPem: string } {
  const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 3072 });
  const keyPem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
  const publicPem = publicKey.export({ type: "spki", format: "pem" }).toString();

  const cert = forge.pki.createCertificate();
  cert.publicKey = forge.pki.publicKeyFromPem(publicPem);
  // Positive, 16 random bytes: what RFC 5280 asks of a serial.
  const serial = randomBytes(16);
  serial[0] &= 0x7f;
  cert.serialNumber = serial.toString("hex");
  const now = new Date();
  cert.validity.notBefore = new Date(now.getTime() - 60_000);
  cert.validity.notAfter = new Date(now);
  cert.validity.notAfter.setFullYear(now.getFullYear() + VALID_YEARS);

  const subject = [
    { name: "commonName", value: commonName, valueTagClass: forge.asn1.Type.UTF8 },
    { name: "emailAddress", value: email },
    { name: "countryName", value: country },
  ] as forge.pki.CertificateField[];
  cert.setSubject(subject);
  cert.setIssuer(subject);
  cert.setExtensions([
    { name: "basicConstraints", cA: false, critical: true },
    { name: "keyUsage", digitalSignature: true, nonRepudiation: true, critical: true },
    { name: "extKeyUsage", emailProtection: true },
    { name: "subjectAltName", altNames: [{ type: 1, value: email }] },
    { name: "subjectKeyIdentifier" },
  ]);
  cert.sign(forge.pki.privateKeyFromPem(keyPem), forge.md.sha256.create());

  return { certPem: forge.pki.certificateToPem(cert), keyPem };
}
