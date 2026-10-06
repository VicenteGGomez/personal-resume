"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { PDFDocument } from "pdf-lib";
import { getSession } from "@/lib/auth";
import {
  auditEvent,
  finalizeIfComplete,
  issueToken,
  newSignerId,
  sendInvitation,
} from "@/lib/envelopes";
import { canSendEmail } from "@/lib/mailer";
import { SigningError, stampAndSign } from "@/lib/pdf-sign";
import { getResumeData } from "@/lib/resume-store";
import {
  MAX_PDF_BYTES,
  SIGNING_WINDOW_DAYS,
  docStatus,
  publicSigner,
  signatureCaption,
  type AdminDoc,
  type DocLang,
  type DocVisibility,
  type Placement,
  type SignedDoc,
  type SignerRecord,
  type StampPosition,
} from "@/lib/signed-docs";
import {
  docPaths,
  getDoc,
  getFile,
  getSigner,
  listSigners,
  putFile,
  removeFile,
  saveDoc,
  saveSigner,
  uploadTarget,
} from "@/lib/signed-docs-store";
import { sha256Hex } from "@/lib/signing-identity";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const EXPIRED = "Tu sesión expiró. Vuelve a iniciar sesión.";
const MAX_SIGNATURE_BYTES = 2 * 1024 * 1024;
const UPLOAD_KEY = /^[0-9a-f-]{36}$/;

/** Where the browser should PUT the PDF it's about to sign. */
export async function prepareUploadAction(): Promise<Result<{ key: string; url: string }>> {
  if (!(await getSession())) return { ok: false, error: EXPIRED };
  const key = randomUUID();
  try {
    return { ok: true, key, url: await uploadTarget(key) };
  } catch (error) {
    console.error("[firmas] upload target failed:", error);
    return { ok: false, error: "No pude preparar la subida. Revisa el almacenamiento." };
  }
}

export interface SignInput {
  uploadKey: string;
  fileName: string;
  title: string;
  note: string;
  lang: DocLang;
  visibility: DocVisibility;
  stamp: StampPosition;
  signatureCaption: boolean;
  placements: Placement[];
  /**
   * People to send it to. `key` is the editor's own id for each, which their
   * placements carry as `signerId` until the server mints the real one.
   */
  signers: { key: string; name: string; email: string }[];
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_SIGNERS = 10;

const clamp01 = (n: unknown) => Math.min(1, Math.max(0, Number(n) || 0));

/** Only what the editor can produce, with every number back inside the page. */
function cleanPlacements(raw: unknown): Placement[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((p) => p && (p.kind === "signature" || p.kind === "qr" || p.kind === "signer"))
    .slice(0, 200)
    .map((p) => {
      const w = Math.max(0.01, clamp01(p.w));
      const h = Math.max(0.01, clamp01(p.h));
      return {
        kind: p.kind,
        ...(p.kind === "signer" ? { signerId: String(p.signerId ?? "") } : {}),
        page: Math.max(0, Math.floor(Number(p.page) || 0)),
        x: Math.min(clamp01(p.x), 1 - w),
        y: Math.min(clamp01(p.y), 1 - h),
        w,
        h,
      };
    });
}

/** Signs it now, or — with signers — sends it to them and waits. */
export async function signDocumentAction(input: SignInput): Promise<Result<{ doc: AdminDoc }>> {
  if (!(await getSession())) return { ok: false, error: EXPIRED };
  if (!UPLOAD_KEY.test(input.uploadKey)) return { ok: false, error: "Subida no válida." };
  const title = input.title.trim().slice(0, 200);
  if (!title) return { ok: false, error: "Ponle un título al documento." };

  const uploadPath = docPaths.upload(input.uploadKey);
  const original = await getFile(uploadPath);
  if (!original) return { ok: false, error: "No encontré el PDF subido. Vuelve a subirlo." };
  if (original.length > MAX_PDF_BYTES) {
    return { ok: false, error: "El PDF supera los 25 MB." };
  }
  if (original.subarray(0, 5).toString("latin1") !== "%PDF-") {
    return { ok: false, error: "El archivo no es un PDF." };
  }

  const placements = cleanPlacements(input.placements);
  const lang: DocLang = input.lang === "en" ? "en" : "es";
  const { shared } = await getResumeData();
  const id = randomUUID().toUpperCase();
  const signedAt = new Date();

  if (Array.isArray(input.signers) && input.signers.length > 0) {
    return sendForSignature({ input, original, uploadPath, placements, lang, title, id });
  }

  try {
    const ownerImage = placements.some((p) => p.kind === "signature")
      ? await getFile(docPaths.signatureImage)
      : null;
    const result = await stampAndSign(original, {
      id,
      signerNames: [shared.name],
      ownerName: shared.name,
      ownerEmail: shared.email,
      lang,
      stamp: input.stamp === "bottom" ? "bottom" : "side",
      placements: placements.filter((p) => p.kind !== "signer"),
      marks: ownerImage
        ? { owner: { image: ownerImage, caption: signatureCaption(shared.name, signedAt, lang) } }
        : {},
      signatureCaption: Boolean(input.signatureCaption),
      signedAt,
    });

    const doc: SignedDoc = {
      id,
      title,
      note: input.note.trim().slice(0, 1000),
      fileName: input.fileName.trim().slice(0, 200) || "documento.pdf",
      pages: result.pages,
      lang,
      visibility: input.visibility === "private" ? "private" : "public",
      signerName: shared.name,
      signedAt: signedAt.toISOString(),
      originalSha256: sha256Hex(original),
      signedSha256: sha256Hex(result.pdf),
      certFingerprint: result.certFingerprint,
      timestamp: result.timestamp,
      revokedAt: null,
      revokedReason: "",
    };
    await putFile(docPaths.original(id), original, "application/pdf");
    await putFile(docPaths.signed(id), result.pdf, "application/pdf");
    await saveDoc(doc);
    await removeFile(uploadPath).catch(() => {});
    revalidatePath("/admin/firmas");
    return { ok: true, doc: { ...doc, signers: [] } };
  } catch (error) {
    if (error instanceof SigningError) return { ok: false, error: error.message };
    console.error("[firmas] signing failed:", error);
    return { ok: false, error: "No pude firmar el documento. Revisa el registro del servidor." };
  }
}

/**
 * Saves a document as pending, with your signature frozen if you sign it, one
 * record per signer, and an invitation to each. Nothing is drawn yet: that
 * happens once, when the last person signs (see finalizeIfComplete).
 */
async function sendForSignature({
  input,
  original,
  uploadPath,
  placements,
  lang,
  title,
  id,
}: {
  input: SignInput;
  original: Buffer;
  uploadPath: string;
  placements: Placement[];
  lang: DocLang;
  title: string;
  id: string;
}): Promise<Result<{ doc: AdminDoc }>> {
  if (!canSendEmail()) {
    return { ok: false, error: "Falta RESEND_API_KEY en Vercel: sin ella no puedo enviar las invitaciones." };
  }
  const wanted = input.signers.slice(0, MAX_SIGNERS + 1);
  if (wanted.length > MAX_SIGNERS) {
    return { ok: false, error: `Máximo ${MAX_SIGNERS} firmantes por documento.` };
  }
  const seen = new Set<string>();
  const people: { key: string; name: string; email: string }[] = [];
  for (const raw of wanted) {
    const name = String(raw.name ?? "").trim().slice(0, 120);
    const email = String(raw.email ?? "").trim().toLowerCase().slice(0, 200);
    if (!name) return { ok: false, error: "Falta el nombre de un firmante." };
    if (!EMAIL_RE.test(email)) return { ok: false, error: `«${email || name}» no es un correo válido.` };
    if (seen.has(email)) return { ok: false, error: `${email} está dos veces.` };
    seen.add(email);
    people.push({ key: String(raw.key), name, email });
  }

  const { shared } = await getResumeData();
  const ownerSigns = placements.some((p) => p.kind === "signature");
  const ownerImage = ownerSigns ? await getFile(docPaths.signatureImage) : null;
  if (ownerSigns && !ownerImage) return { ok: false, error: "Sube primero la imagen de tu firma." };

  const now = new Date();
  const records: SignerRecord[] = people.map((person) => ({
    id: newSignerId(),
    docId: id,
    name: person.name,
    email: person.email,
    status: "pending",
    tokenHash: "",
    invitedAt: now.toISOString(),
    otp: null,
    verifiedAt: null,
    signedAt: null,
    signatureMethod: null,
    declinedAt: null,
    declineReason: "",
    events: [],
  }));
  const idByKey = new Map(people.map((person, i) => [person.key, records[i].id]));
  const layoutPlacements: Placement[] = [];
  for (const placement of placements) {
    if (placement.kind !== "signer") {
      layoutPlacements.push(placement);
      continue;
    }
    const signerId = idByKey.get(placement.signerId ?? "");
    if (signerId) layoutPlacements.push({ ...placement, signerId });
  }
  for (const record of records) {
    if (!layoutPlacements.some((p) => p.signerId === record.id)) {
      return { ok: false, error: `Ubica dónde firma ${record.name}.` };
    }
  }

  let pages = 0;
  try {
    pages = (await PDFDocument.load(original, { updateMetadata: false })).getPageCount();
  } catch {
    return {
      ok: false,
      error: "No pude leer el PDF. Si tiene contraseña, quítasela y vuelve a subirlo.",
    };
  }

  const sent = await auditEvent("sent");
  const doc: SignedDoc = {
    id,
    title,
    note: input.note.trim().slice(0, 1000),
    fileName: input.fileName.trim().slice(0, 200) || "documento.pdf",
    pages,
    lang,
    visibility: input.visibility === "private" ? "private" : "public",
    signerName: [...(ownerSigns ? [shared.name] : []), ...records.map((r) => r.name)].join(", "),
    signedAt: now.toISOString(),
    originalSha256: sha256Hex(original),
    signedSha256: "",
    certFingerprint: null,
    timestamp: null,
    revokedAt: null,
    revokedReason: "",
    status: "pending",
    ownerSigns,
    sentAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + SIGNING_WINDOW_DAYS * 86_400_000).toISOString(),
    layout: {
      stamp: input.stamp === "bottom" ? "bottom" : "side",
      signatureCaption: Boolean(input.signatureCaption),
      placements: layoutPlacements,
    },
    events: [sent, ...(ownerSigns ? [{ ...sent, type: "owner_signed" as const }] : [])],
  };

  try {
    await putFile(docPaths.original(id), original, "application/pdf");
    if (ownerImage) await putFile(docPaths.ownerSignature(id), ownerImage, "image/png");
    await saveDoc(doc);
    const failed: string[] = [];
    for (const record of records) {
      const secret = issueToken(record);
      record.events.push({ type: "invited", at: now.toISOString() });
      await saveSigner(record);
      try {
        await sendInvitation(doc, record, secret, shared, SIGNING_WINDOW_DAYS);
      } catch (error) {
        console.error("[firmas] invitation failed:", error);
        failed.push(record.email);
      }
    }
    await removeFile(uploadPath).catch(() => {});
    revalidatePath("/admin/firmas");
    if (failed.length > 0) {
      return {
        ok: false,
        error: `Quedó guardado, pero no pude enviar la invitación a ${failed.join(", ")}. Usa «Reenviar» en la lista.`,
      };
    }
    return {
      ok: true,
      doc: { ...doc, signers: records.map((r) => publicSigner(r, { fullEmail: true })) },
    };
  } catch (error) {
    console.error("[firmas] send for signature failed:", error);
    return { ok: false, error: "No pude guardar el envío. Revisa el registro del servidor." };
  }
}

/** A new link for a signer (the old one stops working), emailed to them again. */
export async function resendInvitationAction(signerId: string): Promise<Result> {
  if (!(await getSession())) return { ok: false, error: EXPIRED };
  const signer = await getSigner(signerId);
  const doc = signer ? await getDoc(signer.docId) : null;
  if (!signer || !doc) return { ok: false, error: "Ese firmante ya no existe." };
  if (docStatus(doc) !== "pending" || signer.status !== "pending") {
    return { ok: false, error: "Ya no está pendiente." };
  }
  const { shared } = await getResumeData();
  const secret = issueToken(signer);
  signer.events = [...signer.events, { type: "invited", at: new Date().toISOString() }];
  await saveSigner(signer);
  const daysLeft = Math.max(1, Math.ceil((Date.parse(doc.expiresAt!) - Date.now()) / 86_400_000));
  try {
    await sendInvitation(doc, signer, secret, shared, daysLeft);
  } catch (error) {
    console.error("[firmas] resend failed:", error);
    return { ok: false, error: "No pude enviar el correo." };
  }
  return { ok: true };
}

/** Stops a pending request: its links stop working and /verify says so. */
export async function cancelRequestAction(id: string): Promise<Result<{ doc: AdminDoc }>> {
  if (!(await getSession())) return { ok: false, error: EXPIRED };
  const doc = await getDoc(id);
  if (!doc || docStatus(doc) !== "pending") return { ok: false, error: "Ya no está pendiente." };
  const next: SignedDoc = {
    ...doc,
    status: "cancelled",
    events: [...(doc.events ?? []), await auditEvent("cancelled")],
  };
  await saveDoc(next);
  revalidatePath("/admin/firmas");
  const signers = await listSigners([id]);
  return {
    ok: true,
    doc: { ...next, signers: signers.map((s) => publicSigner(s, { fullEmail: true })) },
  };
}

/** For a request everyone signed but whose final PDF failed to build. */
export async function finalizeAction(id: string): Promise<Result<{ doc: AdminDoc }>> {
  if (!(await getSession())) return { ok: false, error: EXPIRED };
  try {
    const doc = await finalizeIfComplete(id);
    if (!doc) return { ok: false, error: "Todavía faltan firmas, o ya estaba listo." };
    revalidatePath("/admin/firmas");
    const signers = await listSigners([id]);
    return {
      ok: true,
      doc: { ...doc, signers: signers.map((s) => publicSigner(s, { fullEmail: true })) },
    };
  } catch (error) {
    console.error("[firmas] finalize failed:", error);
    return { ok: false, error: "No pude generar el PDF final. Revisa el registro del servidor." };
  }
}

/** Public ↔ private, revoke with a reason, or undo a revocation. */
export async function updateDocAction(
  id: string,
  change:
    | { visibility: DocVisibility }
    | { revoke: string }
    | { restore: true },
): Promise<Result<{ doc: AdminDoc }>> {
  if (!(await getSession())) return { ok: false, error: EXPIRED };
  const doc = await getDoc(id);
  if (!doc) return { ok: false, error: "Ese documento ya no existe." };

  let next: SignedDoc;
  if ("visibility" in change) {
    next = { ...doc, visibility: change.visibility === "private" ? "private" : "public" };
  } else if ("revoke" in change) {
    const reason = change.revoke.trim().slice(0, 500);
    if (!reason) return { ok: false, error: "Escribe el motivo de la revocación." };
    next = { ...doc, revokedAt: new Date().toISOString(), revokedReason: reason };
  } else {
    next = { ...doc, revokedAt: null, revokedReason: "" };
  }
  await saveDoc(next);
  revalidatePath("/admin/firmas");
  revalidatePath(`/verify/${id}`);
  revalidatePath(`/verificar/${id}`);
  const signers = await listSigners([id]);
  return {
    ok: true,
    doc: { ...next, signers: signers.map((s) => publicSigner(s, { fullEmail: true })) },
  };
}

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** Your signature as a PNG (ideally transparent), reused on every document. */
export async function saveSignatureImageAction(formData: FormData): Promise<Result> {
  if (!(await getSession())) return { ok: false, error: EXPIRED };
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Elige una imagen PNG." };
  }
  if (file.size > MAX_SIGNATURE_BYTES) {
    return { ok: false, error: "La imagen supera los 2 MB." };
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  if (!bytes.subarray(0, 8).equals(PNG_MAGIC)) {
    return { ok: false, error: "La firma debe ser un PNG." };
  }
  await putFile(docPaths.signatureImage, bytes, "image/png");
  revalidatePath("/admin/firmas");
  return { ok: true };
}
