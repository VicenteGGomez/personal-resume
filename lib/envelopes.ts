import "server-only";

import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { getSecretKey } from "@/lib/auth";
import { emailLayout, escapeHtml, sendEmail, textFrom, type Attachment } from "@/lib/mailer";
import { drawable, signPdfDocument, stampAndSign } from "@/lib/pdf-sign";
import { getResumeData } from "@/lib/resume-store";
import { SITE_ORIGIN } from "@/lib/share-links";
import {
  docStatus,
  signatureCaption,
  verifyUrl,
  type AuditEvent,
  type AuditEventType,
  type DocLang,
  type SignedDoc,
  type SignerRecord,
} from "@/lib/signed-docs";
import {
  claimFinalize,
  docPaths,
  getDoc,
  getFile,
  getSigner,
  listSigners,
  putFile,
  releaseFinalize,
  saveDoc,
  saveSigner,
} from "@/lib/signed-docs-store";
import { sha256Hex } from "@/lib/signing-identity";

/**
 * Documents sent to other people for signing: their links, the emailed codes
 * that prove each one controls their address, what happened when (the audit
 * trail), and the final PDF and audit certificate once the last one signs.
 */

const CODE_TTL_MS = 10 * 60 * 1000;
const CODE_RESEND_MS = 60 * 1000;
const CODES_PER_DAY = 8;
const CODE_ATTEMPTS = 5;
const VERIFIED_HOURS = 2;

// -- Request context --------------------------------------------------------------

/** Who did something: their IP and browser, as the audit trail records them. */
async function requestContext(): Promise<{ ip?: string; userAgent?: string }> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || undefined;
  const userAgent = h.get("user-agent")?.slice(0, 300) || undefined;
  return { ip, userAgent };
}

export async function auditEvent(type: AuditEventType): Promise<AuditEvent> {
  return { type, at: new Date().toISOString(), ...(await requestContext()) };
}

export async function recordSignerEvent(signer: SignerRecord, type: AuditEventType) {
  signer.events = [...signer.events, await auditEvent(type)];
}

// -- Links ------------------------------------------------------------------------

export function newSignerId(): string {
  return randomBytes(9).toString("base64url");
}

/** A fresh secret for a signer's link; the old link stops working. */
export function issueToken(signer: SignerRecord): string {
  const secret = randomBytes(24).toString("base64url");
  signer.tokenHash = createHash("sha256").update(secret).digest("hex");
  return secret;
}

export function signerLink(signer: SignerRecord, secret: string): string {
  return `${SITE_ORIGIN}/sign/${signer.docId}/${signer.id}.${secret}`;
}

export type LinkProblem = "completed" | "declined" | "cancelled" | "expired" | "done";

/**
 * The document and signer behind a link, or why it can't be used. "done"
 * means this person already signed or declined; the document may still wait
 * on others.
 */
export async function resolveLink(
  docId: string,
  token: string,
): Promise<{ doc: SignedDoc; signer: SignerRecord; problem: LinkProblem | null } | null> {
  const [signerId, secret] = token.split(".");
  if (!signerId || !secret) return null;
  const [doc, signer] = await Promise.all([getDoc(docId), getSigner(signerId)]);
  if (!doc || !signer || signer.docId !== doc.id) return null;
  const given = createHash("sha256").update(secret).digest();
  const expected = Buffer.from(signer.tokenHash, "hex");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;

  const status = docStatus(doc);
  const problem: LinkProblem | null =
    status === "pending"
      ? signer.status === "pending"
        ? null
        : "done"
      : status === "completed"
        ? "completed"
        : status;
  return { doc, signer, problem };
}

// -- Email codes ------------------------------------------------------------------

function hashCode(signer: SignerRecord, code: string): string {
  return createHmac("sha256", getSecretKey()).update(`${signer.id}:${code}`).digest("hex");
}

export type CodeResult = { ok: true } | { ok: false; reason: "wait" | "limit" | "email" };

export async function sendCode(doc: SignedDoc, signer: SignerRecord): Promise<CodeResult> {
  const now = Date.now();
  const today = new Date(now).toISOString().slice(0, 10);
  const otp = signer.otp;
  if (otp && now - Date.parse(otp.sentAt) < CODE_RESEND_MS) return { ok: false, reason: "wait" };
  const sentToday = otp?.day === today ? otp.sentOnDay : 0;
  if (sentToday >= CODES_PER_DAY) return { ok: false, reason: "limit" };

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  signer.otp = {
    hash: hashCode(signer, code),
    expiresAt: new Date(now + CODE_TTL_MS).toISOString(),
    attempts: 0,
    sentAt: new Date(now).toISOString(),
    sentOnDay: sentToday + 1,
    day: today,
  };
  await recordSignerEvent(signer, "code_sent");
  await saveSigner(signer);

  const T = EMAIL[doc.lang];
  try {
    await sendEmail({
      to: signer.email,
      subject: T.codeSubject(code),
      text: T.codeText(code, doc.title),
      html: emailLayout(T.codeHtml(code, escapeHtml(doc.title))),
    });
  } catch (error) {
    console.error("[envelopes] code email failed:", error);
    return { ok: false, reason: "email" };
  }
  return { ok: true };
}

export type VerifyResult = { ok: true } | { ok: false; reason: "wrong" | "expired" | "locked" };

/** Checks a typed code; on success the signer's browser is trusted for a while. */
export async function verifyCode(signer: SignerRecord, code: string): Promise<VerifyResult> {
  const otp = signer.otp;
  if (!otp || Date.parse(otp.expiresAt) < Date.now()) return { ok: false, reason: "expired" };
  if (otp.attempts >= CODE_ATTEMPTS) return { ok: false, reason: "locked" };

  const given = Buffer.from(hashCode(signer, code.replace(/\D/g, "")), "hex");
  const expected = Buffer.from(otp.hash, "hex");
  if (!timingSafeEqual(given, expected)) {
    signer.otp = { ...otp, attempts: otp.attempts + 1 };
    await recordSignerEvent(signer, "code_failed");
    await saveSigner(signer);
    return { ok: false, reason: signer.otp.attempts >= CODE_ATTEMPTS ? "locked" : "wrong" };
  }

  signer.otp = null;
  signer.verifiedAt = new Date().toISOString();
  await recordSignerEvent(signer, "verified");
  await saveSigner(signer);

  const token = await new SignJWT({ sid: signer.id, th: signer.tokenHash })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${VERIFIED_HOURS}h`)
    .sign(getSecretKey());
  (await cookies()).set(`sign_${signer.id}`, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: VERIFIED_HOURS * 3600,
    path: `/sign/${signer.docId}`,
  });
  return { ok: true };
}

/** Whether this browser entered this signer's code recently (and for this link). */
export async function isVerified(signer: SignerRecord): Promise<boolean> {
  const token = (await cookies()).get(`sign_${signer.id}`)?.value;
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), { algorithms: ["HS256"] });
    return payload.sid === signer.id && payload.th === signer.tokenHash;
  } catch {
    return false;
  }
}

// -- Emails -----------------------------------------------------------------------

const EMAIL = {
  es: {
    inviteSubject: (owner: string, title: string) => `${owner} te envió «${title}» para firmar`,
    inviteHtml: (name: string, owner: string, title: string, note: string, days: number) => [
      `Hola ${name}:`,
      `<strong>${owner}</strong> te envió el documento <strong>«${title}»</strong> para que lo firmes electrónicamente.`,
      ...(note ? [`<em>${note}</em>`] : []),
      `Para firmar te enviaremos un código a este correo. El enlace vence en ${days} días.`,
    ],
    inviteText: (name: string, owner: string, title: string, link: string, days: number) =>
      `Hola ${name}:\n\n${owner} te envió «${title}» para firmar.\n\nAbre este enlace para revisarlo y firmarlo (vence en ${days} días):\n${link}\n`,
    inviteButton: "Revisar y firmar",
    codeSubject: (code: string) => `${code} es tu código para firmar`,
    codeHtml: (code: string, title: string) => [
      `Tu código para firmar <strong>«${title}»</strong> es:`,
      `<span style="font-size:30px;font-weight:700;letter-spacing:6px">${code}</span>`,
      `Vence en 10 minutos. Si no lo pediste tú, ignora este correo.`,
    ],
    codeText: (code: string, title: string) =>
      `Tu código para firmar «${title}» es ${code}. Vence en 10 minutos.`,
    ownerSignedSubject: (who: string, title: string) => `${who} firmó «${title}»`,
    ownerDeclinedSubject: (who: string, title: string) => `${who} rechazó firmar «${title}»`,
    ownerSignedHtml: (who: string, title: string, left: number) => [
      `<strong>${who}</strong> firmó <strong>«${title}»</strong>.`,
      left === 0
        ? `Era la última firma: el documento está completo.`
        : left === 1
          ? `Falta 1 firma.`
          : `Faltan ${left} firmas.`,
    ],
    ownerDeclinedHtml: (who: string, title: string, reason: string) => [
      `<strong>${who}</strong> rechazó firmar <strong>«${title}»</strong>.`,
      `Motivo: <em>${reason}</em>`,
      `El documento quedó como rechazado y nadie más puede firmarlo.`,
    ],
    completedSubject: (title: string) => `«${title}» está firmado por todos`,
    completedHtml: (title: string) => [
      `Todas las partes firmaron <strong>«${title}»</strong>.`,
      `Adjuntamos el PDF firmado y su certificado de auditoría. También puedes verificarlo en cualquier momento:`,
    ],
    completedText: (title: string, url: string) =>
      `Todas las partes firmaron «${title}». Adjuntamos el PDF firmado y su certificado de auditoría.\n\nVerificación: ${url}\n`,
    verifyButton: "Ver verificación",
    viewButton: "Ver en el panel",
  },
  en: {
    inviteSubject: (owner: string, title: string) => `${owner} sent you “${title}” to sign`,
    inviteHtml: (name: string, owner: string, title: string, note: string, days: number) => [
      `Hi ${name},`,
      `<strong>${owner}</strong> sent you <strong>“${title}”</strong> to sign electronically.`,
      ...(note ? [`<em>${note}</em>`] : []),
      `To sign, we'll email you a code at this address. The link expires in ${days} days.`,
    ],
    inviteText: (name: string, owner: string, title: string, link: string, days: number) =>
      `Hi ${name},\n\n${owner} sent you “${title}” to sign.\n\nOpen this link to review and sign it (expires in ${days} days):\n${link}\n`,
    inviteButton: "Review and sign",
    codeSubject: (code: string) => `${code} is your signing code`,
    codeHtml: (code: string, title: string) => [
      `Your code to sign <strong>“${title}”</strong> is:`,
      `<span style="font-size:30px;font-weight:700;letter-spacing:6px">${code}</span>`,
      `It expires in 10 minutes. If you didn't ask for it, ignore this email.`,
    ],
    codeText: (code: string, title: string) =>
      `Your code to sign “${title}” is ${code}. It expires in 10 minutes.`,
    ownerSignedSubject: (who: string, title: string) => `${who} signed “${title}”`,
    ownerDeclinedSubject: (who: string, title: string) => `${who} declined to sign “${title}”`,
    ownerSignedHtml: (who: string, title: string, left: number) => [
      `<strong>${who}</strong> signed <strong>“${title}”</strong>.`,
      left > 0 ? `${left} signature${left === 1 ? "" : "s"} to go.` : `That was the last one: the document is complete.`,
    ],
    ownerDeclinedHtml: (who: string, title: string, reason: string) => [
      `<strong>${who}</strong> declined to sign <strong>“${title}”</strong>.`,
      `Reason: <em>${reason}</em>`,
      `The document is now declined and no one else can sign it.`,
    ],
    completedSubject: (title: string) => `“${title}” has been signed by everyone`,
    completedHtml: (title: string) => [
      `Everyone has signed <strong>“${title}”</strong>.`,
      `The signed PDF and its audit certificate are attached. You can also verify it at any time:`,
    ],
    completedText: (title: string, url: string) =>
      `Everyone has signed “${title}”. The signed PDF and its audit certificate are attached.\n\nVerification: ${url}\n`,
    verifyButton: "View verification",
    viewButton: "Open the dashboard",
  },
} satisfies Record<DocLang, Record<string, unknown>>;

export async function sendInvitation(
  doc: SignedDoc,
  signer: SignerRecord,
  secret: string,
  owner: { name: string; email: string },
  days: number,
): Promise<void> {
  const T = EMAIL[doc.lang];
  const link = signerLink(signer, secret);
  await sendEmail({
    to: signer.email,
    replyTo: owner.email,
    subject: T.inviteSubject(owner.name, doc.title),
    text: T.inviteText(signer.name, owner.name, doc.title, link, days),
    html: emailLayout(
      T.inviteHtml(
        escapeHtml(signer.name),
        escapeHtml(owner.name),
        escapeHtml(doc.title),
        escapeHtml(doc.note),
        days,
      ),
      { label: T.inviteButton, url: link },
    ),
  });
}

/** Tells you someone signed or declined. Never fails the signer's action. */
export async function notifyOwner(doc: SignedDoc, signer: SignerRecord, left: number) {
  const { shared } = await getResumeData();
  const T = EMAIL[doc.lang];
  const declined = signer.status === "declined";
  const who = escapeHtml(signer.name);
  const title = escapeHtml(doc.title);
  const paragraphs = declined
    ? T.ownerDeclinedHtml(who, title, escapeHtml(signer.declineReason))
    : T.ownerSignedHtml(who, title, left);
  try {
    await sendEmail({
      to: shared.email,
      subject: declined
        ? T.ownerDeclinedSubject(signer.name, doc.title)
        : T.ownerSignedSubject(signer.name, doc.title),
      text: textFrom(paragraphs),
      html: emailLayout(paragraphs, { label: T.viewButton, url: `${SITE_ORIGIN}/admin/firmas` }),
    });
  } catch (error) {
    console.error("[envelopes] owner notification failed:", error);
  }
}

// -- Finishing ------------------------------------------------------------------

/**
 * Once every signer has signed: draws all the signatures onto the original,
 * signs it, writes the audit certificate, and emails both to everyone. Safe
 * to call after every signature — only the call that finds the document
 * complete (and wins the claim) does anything.
 */
export async function finalizeIfComplete(docId: string): Promise<SignedDoc | null> {
  const doc = await getDoc(docId);
  if (!doc || docStatus(doc) !== "pending" || !doc.layout) return null;
  const signers = await listSigners([docId]);
  if (signers.length === 0 || signers.some((s) => s.status !== "signed")) return null;
  if (!(await claimFinalize(docId))) return null;

  let finished: SignedDoc;
  let signed: Buffer;
  let audit: Buffer;
  try {
    const { shared } = await getResumeData();
    const original = await getFile(docPaths.original(docId));
    if (!original) throw new Error("original missing");

    const marks: Record<string, { image: Uint8Array; caption: string }> = {};
    const sentAt = new Date(doc.sentAt ?? doc.signedAt);
    if (doc.ownerSigns) {
      const image = await getFile(docPaths.ownerSignature(docId));
      if (!image) throw new Error("owner signature missing");
      marks.owner = { image, caption: signatureCaption(shared.name, sentAt, doc.lang) };
    }
    for (const signer of signers) {
      const image = await getFile(docPaths.signerSignature(docId, signer.id));
      if (!image) throw new Error(`signature missing for ${signer.id}`);
      marks[signer.id] = {
        image,
        caption: signatureCaption(signer.name, new Date(signer.signedAt!), doc.lang),
      };
    }

    const completedAt = new Date();
    const names = [...(doc.ownerSigns ? [shared.name] : []), ...signers.map((s) => s.name)];
    const result = await stampAndSign(original, {
      id: docId,
      signerNames: names,
      ownerName: shared.name,
      ownerEmail: shared.email,
      lang: doc.lang,
      stamp: doc.layout.stamp,
      placements: doc.layout.placements,
      marks,
      signatureCaption: doc.layout.signatureCaption,
      signedAt: completedAt,
    });
    signed = result.pdf;

    finished = {
      ...doc,
      status: "completed",
      signerName: names.join(", "),
      signedAt: completedAt.toISOString(),
      signedSha256: sha256Hex(signed),
      pages: result.pages,
      timestamp: result.timestamp,
      certFingerprint: result.certFingerprint,
      events: [...(doc.events ?? []), { type: "completed", at: completedAt.toISOString() }],
    };
    audit = await buildAuditPdf(finished, signers, { name: shared.name, email: shared.email }, marks);
    finished.auditSha256 = sha256Hex(audit);

    await putFile(docPaths.signed(docId), signed, "application/pdf");
    await putFile(docPaths.audit(docId), audit, "application/pdf");
    await saveDoc(finished);
  } catch (error) {
    await releaseFinalize(docId);
    throw error;
  }

  const { shared } = await getResumeData();
  const base = finished.fileName.replace(/\.pdf$/i, "");
  const attachments: Attachment[] = [
    { filename: `${base} (${finished.lang === "en" ? "signed" : "firmado"}).pdf`, content: signed },
    { filename: `${base} (${finished.lang === "en" ? "audit" : "auditoría"}).pdf`, content: audit },
  ];
  const T = EMAIL[finished.lang];
  const url = verifyUrl(docId, finished.lang);
  for (const to of [...signers.map((s) => s.email), shared.email]) {
    try {
      await sendEmail({
        to,
        replyTo: shared.email,
        subject: T.completedSubject(finished.title),
        text: T.completedText(finished.title, url),
        html: emailLayout(T.completedHtml(escapeHtml(finished.title)), {
          label: T.verifyButton,
          url,
        }),
        attachments,
      });
    } catch (error) {
      console.error(`[envelopes] completion email to ${to} failed:`, error);
    }
  }
  return finished;
}

// -- Audit certificate ------------------------------------------------------------

const AUDIT_COPY = {
  es: {
    title: "Certificado de firmas",
    subtitle: "Registro de auditoría del documento",
    document: "Documento",
    docId: "Doc ID",
    file: "Archivo",
    pages: "Páginas",
    originalHash: "SHA-256 del original",
    signedHash: "SHA-256 del firmado",
    sentBy: "Enviado por",
    sentAt: "Enviado",
    completedAt: "Completado",
    verify: "Verificación",
    signers: "Firmantes",
    owner: "Emisor y firmante",
    signer: "Firmante",
    identity: "Identidad",
    ownerIdentity: "Sesión de administrador del emisor; firma guardada",
    codeIdentity: "Código de un solo uso enviado a su correo",
    method: "Firma",
    drawn: "dibujada en pantalla",
    typed: "escrita (nombre en letra manuscrita)",
    saved: "imagen guardada del emisor",
    events: {
      sent: "Documento enviado",
      owner_signed: "Firmó el emisor",
      completed: "Documento completado",
      cancelled: "Envío cancelado",
      invited: "Invitación enviada",
      opened: "Abrió el enlace",
      code_sent: "Código enviado al correo",
      code_failed: "Código incorrecto",
      verified: "Correo verificado",
      downloaded: "Descargó el original",
      signed: "Firmó",
      declined: "Rechazó",
    },
    footer:
      "Generado por resume.vicentegomez.cl y firmado digitalmente con el mismo certificado que el documento. Horas en UTC.",
  },
  en: {
    title: "Certificate of completion",
    subtitle: "Audit trail of the document",
    document: "Document",
    docId: "Doc ID",
    file: "File",
    pages: "Pages",
    originalHash: "Original SHA-256",
    signedHash: "Signed SHA-256",
    sentBy: "Sent by",
    sentAt: "Sent",
    completedAt: "Completed",
    verify: "Verification",
    signers: "Signers",
    owner: "Sender and signer",
    signer: "Signer",
    identity: "Identity",
    ownerIdentity: "Sender's admin session; saved signature",
    codeIdentity: "One-time code sent to their email",
    method: "Signature",
    drawn: "drawn on screen",
    typed: "typed (name in handwriting style)",
    saved: "sender's saved image",
    events: {
      sent: "Document sent",
      owner_signed: "Sender signed",
      completed: "Document completed",
      cancelled: "Request cancelled",
      invited: "Invitation sent",
      opened: "Opened the link",
      code_sent: "Code emailed",
      code_failed: "Wrong code",
      verified: "Email verified",
      downloaded: "Downloaded the original",
      signed: "Signed",
      declined: "Declined",
    },
    footer:
      "Generated by resume.vicentegomez.cl and digitally signed with the same certificate as the document. Times in UTC.",
  },
} as const;

const utc = (iso: string) => `${iso.slice(0, 19).replace("T", " ")} UTC`;

/** A cursor that writes lines down A4 pages, starting a new page when full. */
class AuditWriter {
  private page: PDFPage;
  private y: number;
  static readonly W = 595;
  static readonly H = 842;
  static readonly M = 50;

  constructor(
    private readonly pdf: PDFDocument,
    readonly font: PDFFont,
    readonly bold: PDFFont,
  ) {
    this.page = pdf.addPage([AuditWriter.W, AuditWriter.H]);
    this.y = AuditWriter.H - AuditWriter.M;
  }

  ensure(height: number) {
    if (this.y - height < AuditWriter.M) {
      this.page = this.pdf.addPage([AuditWriter.W, AuditWriter.H]);
      this.y = AuditWriter.H - AuditWriter.M;
    }
  }

  gap(points: number) {
    this.y -= points;
  }

  /** Text wrapped to the page width (or `width`), starting at `x`. */
  text(
    text: string,
    { size = 9, bold = false, x = AuditWriter.M, color = rgb(0.11, 0.11, 0.12), width }: {
      size?: number;
      bold?: boolean;
      x?: number;
      color?: ReturnType<typeof rgb>;
      width?: number;
    } = {},
  ) {
    const font = bold ? this.bold : this.font;
    const room = width ?? AuditWriter.W - AuditWriter.M - x;
    const words = drawable(font, text).split(/(\s+)/);
    const lines: string[] = [];
    let line = "";
    for (const word of words) {
      const next = line + word;
      if (font.widthOfTextAtSize(next, size) > room && line.trim()) {
        lines.push(line.trimEnd());
        line = word.trimStart();
      } else {
        line = next;
      }
      // A single unbreakable run (a hash) longer than the line: cut it.
      while (font.widthOfTextAtSize(line, size) > room) {
        let cut = line.length - 1;
        while (cut > 1 && font.widthOfTextAtSize(line.slice(0, cut), size) > room) cut--;
        lines.push(line.slice(0, cut));
        line = line.slice(cut);
      }
    }
    if (line.trim()) lines.push(line);
    for (const l of lines) {
      this.ensure(size + 3);
      this.y -= size + 3;
      this.page.drawText(l, { x, y: this.y, size, font, color });
    }
  }

  /** A label in grey and its value beside it. */
  row(label: string, value: string, x = AuditWriter.M) {
    const top = this.y;
    this.text(label, { x, size: 8.5, color: rgb(0.45, 0.45, 0.5), width: 130 });
    const after = this.y;
    this.y = top;
    this.text(value, { x: x + 135, size: 8.5 });
    this.y = Math.min(this.y, after);
    this.gap(2);
  }

  async image(png: Uint8Array, x: number, maxW: number, maxH: number) {
    const image = await this.pdf.embedPng(png);
    const scale = Math.min(maxW / image.width, maxH / image.height);
    const w = image.width * scale;
    const h = image.height * scale;
    this.ensure(h + 4);
    this.y -= h + 4;
    this.page.drawImage(image, { x, y: this.y, width: w, height: h });
  }

  rule() {
    this.ensure(10);
    this.y -= 6;
    this.page.drawLine({
      start: { x: AuditWriter.M, y: this.y },
      end: { x: AuditWriter.W - AuditWriter.M, y: this.y },
      thickness: 0.5,
      color: rgb(0.85, 0.85, 0.87),
    });
    this.y -= 4;
  }
}

async function buildAuditPdf(
  doc: SignedDoc,
  signers: SignerRecord[],
  owner: { name: string; email: string },
  marks: Record<string, { image: Uint8Array }>,
): Promise<Buffer> {
  const T = AUDIT_COPY[doc.lang];
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${T.title} · ${doc.title}`);
  const out = new AuditWriter(
    pdf,
    await pdf.embedFont(StandardFonts.Helvetica),
    await pdf.embedFont(StandardFonts.HelveticaBold),
  );

  out.text(T.title, { size: 18, bold: true });
  out.text(T.subtitle, { size: 10, color: rgb(0.45, 0.45, 0.5) });
  out.gap(10);

  out.text(T.document, { size: 11, bold: true });
  out.gap(4);
  out.row(T.document, doc.title);
  out.row(T.docId, doc.id);
  out.row(T.file, doc.fileName);
  out.row(T.pages, String(doc.pages));
  out.row(T.originalHash, doc.originalSha256);
  out.row(T.signedHash, doc.signedSha256);
  out.row(T.sentBy, `${owner.name} <${owner.email}>`);
  if (doc.sentAt) out.row(T.sentAt, utc(doc.sentAt));
  out.row(T.completedAt, utc(doc.signedAt));
  out.row(T.verify, verifyUrl(doc.id, doc.lang));
  out.rule();

  out.text(T.signers, { size: 11, bold: true });
  out.gap(4);

  const describe = (events: AuditEvent[]) => {
    for (const event of events) {
      const who = [event.ip, event.userAgent].filter(Boolean).join(" · ");
      out.text(`${utc(event.at)} — ${T.events[event.type]}${who ? ` (${who})` : ""}`, {
        size: 7.5,
        x: AuditWriter.M + 10,
      });
    }
  };

  if (doc.ownerSigns) {
    out.text(`${owner.name} — ${T.owner}`, { size: 10, bold: true });
    out.row(T.identity, T.ownerIdentity);
    out.row(T.method, T.saved);
    if (marks.owner) await out.image(marks.owner.image, AuditWriter.M + 10, 140, 45);
    describe((doc.events ?? []).filter((e) => e.type === "owner_signed"));
    out.rule();
  }
  for (const signer of signers) {
    out.text(`${signer.name} — ${T.signer}`, { size: 10, bold: true });
    out.row("Email", signer.email);
    out.row(T.identity, T.codeIdentity);
    out.row(T.method, signer.signatureMethod === "typed" ? T.typed : T.drawn);
    if (marks[signer.id]) await out.image(marks[signer.id].image, AuditWriter.M + 10, 140, 45);
    describe(signer.events);
    out.rule();
  }
  describe((doc.events ?? []).filter((e) => e.type !== "owner_signed"));
  out.gap(8);
  out.text(T.footer, { size: 7.5, color: rgb(0.45, 0.45, 0.5) });

  const { pdf: sealed } = await signPdfDocument(pdf, {
    reason: `Audit · Doc ID ${doc.id}`,
    name: owner.name,
    email: owner.email,
    location: verifyUrl(doc.id, doc.lang),
    signedAt: new Date(doc.signedAt),
  });
  return sealed;
}
