"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { SigningError, stampAndSign } from "@/lib/pdf-sign";
import { getResumeData } from "@/lib/resume-store";
import {
  MAX_PDF_BYTES,
  type DocLang,
  type DocVisibility,
  type Placement,
  type SignedDoc,
  type StampPosition,
} from "@/lib/signed-docs";
import {
  docPaths,
  getDoc,
  getFile,
  putFile,
  removeFile,
  saveDoc,
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
}

const clamp01 = (n: unknown) => Math.min(1, Math.max(0, Number(n) || 0));

/** Only what the editor can produce, with every number back inside the page. */
function cleanPlacements(raw: unknown): Placement[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((p) => p && (p.kind === "signature" || p.kind === "qr"))
    .slice(0, 200)
    .map((p) => {
      const w = Math.max(0.01, clamp01(p.w));
      const h = Math.max(0.01, clamp01(p.h));
      return {
        kind: p.kind,
        page: Math.max(0, Math.floor(Number(p.page) || 0)),
        x: Math.min(clamp01(p.x), 1 - w),
        y: Math.min(clamp01(p.y), 1 - h),
        w,
        h,
      };
    });
}

export async function signDocumentAction(input: SignInput): Promise<Result<{ doc: SignedDoc }>> {
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

  try {
    const signatureImage = placements.some((p) => p.kind === "signature")
      ? await getFile(docPaths.signatureImage)
      : null;
    const result = await stampAndSign(original, {
      id,
      signerName: shared.name,
      signerEmail: shared.email,
      lang,
      stamp: input.stamp === "bottom" ? "bottom" : "side",
      placements,
      signatureImage,
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
    return { ok: true, doc };
  } catch (error) {
    if (error instanceof SigningError) return { ok: false, error: error.message };
    console.error("[firmas] signing failed:", error);
    return { ok: false, error: "No pude firmar el documento. Revisa el registro del servidor." };
  }
}

/** Public ↔ private, revoke with a reason, or undo a revocation. */
export async function updateDocAction(
  id: string,
  change:
    | { visibility: DocVisibility }
    | { revoke: string }
    | { restore: true },
): Promise<Result<{ doc: SignedDoc }>> {
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
  return { ok: true, doc: next };
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
