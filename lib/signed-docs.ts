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
  /** "signature" is yours, "signer" someone you sent it to (`signerId`). */
  kind: "signature" | "qr" | "signer";
  signerId?: string;
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

/**
 * A document you sign alone is "completed" the moment it is made. One sent to
 * others stays "pending" until the last of them signs, or ends "declined",
 * "cancelled" or "expired". Records saved before this field existed have none:
 * read them through `docStatus`.
 */
export type DocStatus = "completed" | "pending" | "declined" | "cancelled" | "expired";

/** How long people have to sign before the request lapses. */
export const SIGNING_WINDOW_DAYS = 30;

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

  // -- Sent to others for signing (all absent on documents you signed alone) --
  status?: DocStatus;
  /** Whether your own signature is on it. */
  ownerSigns?: boolean;
  /** When it was sent; `signedAt` becomes the moment the last person signed. */
  sentAt?: string;
  expiresAt?: string;
  /** Kept until the last signature, then drawn onto the original. */
  layout?: { stamp: StampPosition; signatureCaption: boolean; placements: Placement[] };
  /** SHA-256 of the separate audit-certificate PDF. */
  auditSha256?: string;
  /** What happened to the document itself: sent, your signature, completed. */
  events?: AuditEvent[];
}

/** A record's status, counting a pending request past its deadline as expired. */
export function docStatus(doc: SignedDoc, now = Date.now()): DocStatus {
  const status = doc.status ?? "completed";
  if (status === "pending" && doc.expiresAt && Date.parse(doc.expiresAt) < now) return "expired";
  return status;
}

export type AuditEventType =
  | "sent"
  | "owner_signed"
  | "completed"
  | "cancelled"
  | "invited"
  | "opened"
  | "code_sent"
  | "code_failed"
  | "verified"
  | "downloaded"
  | "signed"
  | "declined";

export interface AuditEvent {
  type: AuditEventType;
  at: string;
  ip?: string;
  userAgent?: string;
}

/**
 * Someone a document was sent to. Stored server-side only — `tokenHash`, the
 * code and the events never leave the server; the pages get `PublicSigner`.
 */
export interface SignerRecord {
  id: string;
  docId: string;
  name: string;
  email: string;
  status: "pending" | "signed" | "declined";
  /** SHA-256 of the secret in their link; a new invitation replaces it. */
  tokenHash: string;
  invitedAt: string;
  otp: {
    hash: string;
    expiresAt: string;
    attempts: number;
    sentAt: string;
    /** Codes sent on `day`, to cap how many one link can trigger. */
    sentOnDay: number;
    day: string;
  } | null;
  verifiedAt: string | null;
  signedAt: string | null;
  signatureMethod: "drawn" | "typed" | null;
  declinedAt: string | null;
  declineReason: string;
  events: AuditEvent[];
}

/** What a page may know about a signer. */
export interface PublicSigner {
  id: string;
  name: string;
  /** `j••••@gmail.com` — full addresses only in the admin and the audit. */
  email: string;
  status: SignerRecord["status"];
  signedAt: string | null;
  declinedAt: string | null;
  declineReason: string;
}

export function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!domain) return "•••";
  return `${user.slice(0, 1)}${"•".repeat(Math.max(3, Math.min(6, user.length - 1)))}@${domain}`;
}

export function publicSigner(signer: SignerRecord, { fullEmail = false } = {}): PublicSigner {
  return {
    id: signer.id,
    name: signer.name,
    email: fullEmail ? signer.email : maskEmail(signer.email),
    status: signer.status,
    signedAt: signer.signedAt,
    declinedAt: signer.declinedAt,
    declineReason: signer.declineReason,
  };
}

/** A document as the admin list shows it: with its signers, emails in full. */
export type AdminDoc = SignedDoc & { signers: PublicSigner[] };

/** Which signature a placement shows: yours ("owner") or a signer's id. */
export function placementKey(placement: Placement): string {
  return placement.kind === "signer" ? (placement.signerId ?? "") : "owner";
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

/** The line on every page. Names only fit when there are one or two of them. */
export function stampText(id: string, signerNames: string[], lang: DocLang): string {
  const where = `${STAMP_DOMAIN}${VERIFY_PATH[lang]}`;
  const names =
    signerNames.length > 0 && signerNames.length <= 2
      ? signerNames.join(lang === "en" ? " and " : " y ")
      : "";
  return lang === "en"
    ? `Electronically signed${names ? ` by ${names}` : ""} · Doc ID: ${id} · Verify at ${where}`
    : `Firmado electrónicamente${names ? ` por ${names}` : ""} · Doc ID: ${id} · Verificar en ${where}`;
}

/** Under the QR: where to verify by hand, for whoever can't scan it. */
export const QR_CAPTION: Record<DocLang, string> = {
  es: `${STAMP_DOMAIN}${VERIFY_PATH.es}`,
  en: `${STAMP_DOMAIN}${VERIFY_PATH.en}`,
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
