/**
 * Documents signed from `/admin/firmas` and checked at `/verify`.
 *
 * Shared by the admin editor, the public verifier and the server code behind
 * them — no server-only imports here.
 */

import { SITE_ORIGIN } from "@/lib/share-links";

/** Public: anyone with the ID sees and downloads the PDF. Private: only its record. */
export type DocVisibility = "public" | "private";

/** Where the "signed electronically · ID …" line runs on every page. */
export type StampPosition = "side" | "bottom";

export type DocLang = "es" | "en";

/**
 * Something drawn on a page, in fractions of the page *as displayed* (after
 * its /Rotate), measured from its top-left corner — the same frame the editor
 * shows, so the server never has to guess what "top" meant.
 */
export interface Placement {
  kind: "signature" | "qr";
  /** 0-based page index. */
  page: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** The RFC 3161 timestamp a third party put on the signature. */
export interface DocTimestamp {
  authority: string;
  /** ISO time the authority vouched for. */
  time: string;
}

export interface SignedDoc {
  /** Envelope-style id stamped on every page: an uppercase UUID. */
  id: string;
  title: string;
  /** Optional context shown on /verify ("Carta de recomendación para…"). */
  note: string;
  fileName: string;
  pages: number;
  lang: DocLang;
  visibility: DocVisibility;
  signerName: string;
  signedAt: string;
  /** SHA-256 (hex) of the PDF as uploaded, before anything was stamped. */
  originalSha256: string;
  /** SHA-256 (hex) of the PDF handed out — the one a copy must match. */
  signedSha256: string;
  /** SHA-256 of the signing certificate (DER), to compare with Adobe's panel. */
  certFingerprint: string | null;
  timestamp: DocTimestamp | null;
  revokedAt: string | null;
  revokedReason: string;
}

export const MAX_PDF_BYTES = 25 * 1024 * 1024;

/** `1A2B…` with or without dashes, any case → the canonical id, or null. */
export function normalizeDocId(input: string): string | null {
  const hex = input.trim().toUpperCase().replace(/[^0-9A-F]/g, "");
  if (hex.length !== 32) return null;
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
}

/** The verifier in each language: two separate pages, not one bilingual one. */
export const VERIFY_PATH: Record<DocLang, string> = { en: "/verify", es: "/verificar" };

/** Where a document's QR points: its record, in the language of its stamp. */
export function verifyUrl(id: string, lang: DocLang): string {
  return `${SITE_ORIGIN}${VERIFY_PATH[lang]}/${id}`;
}

/**
 * The short domain printed on the pages. It is the classes site's: its
 * /verify and /verificar redirect here, so the stamp stays short to type.
 */
export const STAMP_DOMAIN = "vicentegomez.cl";

export function stampText(id: string, signerName: string, lang: DocLang): string {
  const where = `${STAMP_DOMAIN}${VERIFY_PATH[lang]}`;
  return lang === "en"
    ? `Electronically signed by ${signerName} · Doc ID: ${id} · Verify at ${where}`
    : `Firmado electrónicamente por ${signerName} · Doc ID: ${id} · Verificar en ${where}`;
}

export const QR_CAPTION: Record<DocLang, string> = {
  es: "Escanea para verificar",
  en: "Scan to verify",
};

/** The date under a signature, in the timezone the site's stats use. */
export function signatureCaption(signerName: string, at: Date, lang: DocLang): string {
  const date = at.toLocaleDateString(lang === "en" ? "en-GB" : "es-CL", {
    timeZone: "Europe/Madrid",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  return `${signerName} · ${date}`;
}
