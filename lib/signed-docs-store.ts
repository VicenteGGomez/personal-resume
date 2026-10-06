import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";
import { isSupabaseMode, supabase } from "@/lib/supabase";
import type { SignedDoc, SignerRecord } from "@/lib/signed-docs";

/**
 * Where signed documents live. Same two backends as the résumé content:
 *   - Supabase — the `signed_documents` table (one row per document, the
 *                record as JSON plus its two hashes as indexed columns) and
 *                the PRIVATE `signed-documents` bucket. Nothing is readable
 *                without the service key: public PDFs are handed out through
 *                short-lived signed URLs by /verify, never linked directly.
 *   - Local    — `data/signed-documents.json` and `data/signed-documents/`.
 *
 * Unlike the résumé, nothing here falls back to anything: a verifier that
 * can't reach its records must say "couldn't check", never "not found".
 */

export const SIGNED_DOCS_BUCKET = "signed-documents";

const LOCAL_INDEX = path.join(process.cwd(), "data", "signed-documents.json");
const LOCAL_SIGNERS = path.join(process.cwd(), "data", "document-signers.json");
const LOCAL_DIR = path.join(process.cwd(), "data", "signed-documents");

export const docPaths = {
  original: (id: string) => `docs/${id}/original.pdf`,
  signed: (id: string) => `docs/${id}/signed.pdf`,
  upload: (key: string) => `uploads/${key}.pdf`,
  signatureImage: "settings/signature.png",
  audit: (id: string) => `docs/${id}/audit.pdf`,
  /** Your signature as it was when you sent it, so replacing it later can't change a pending document. */
  ownerSignature: (id: string) => `docs/${id}/owner-signature.png`,
  signerSignature: (id: string, signerId: string) => `docs/${id}/signers/${signerId}.png`,
};

// -- Records ------------------------------------------------------------------

interface Row {
  id: string;
  data: SignedDoc;
}

async function readLocalIndex(): Promise<SignedDoc[]> {
  try {
    return JSON.parse(await fs.readFile(LOCAL_INDEX, "utf8")) as SignedDoc[];
  } catch {
    return [];
  }
}

async function writeLocalIndex(docs: SignedDoc[]): Promise<void> {
  await fs.mkdir(path.dirname(LOCAL_INDEX), { recursive: true });
  await fs.writeFile(LOCAL_INDEX, JSON.stringify(docs, null, 2), "utf8");
}

/** Every document, newest first. */
export async function listDocs(): Promise<SignedDoc[]> {
  if (!isSupabaseMode()) {
    const docs = await readLocalIndex();
    return docs.sort((a, b) => b.signedAt.localeCompare(a.signedAt));
  }
  const { data, error } = await supabase()
    .from("signed_documents")
    .select("id, data")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as Row[]).map((row) => row.data);
}

export async function getDoc(id: string): Promise<SignedDoc | null> {
  if (!isSupabaseMode()) {
    return (await readLocalIndex()).find((doc) => doc.id === id) ?? null;
  }
  const { data, error } = await supabase()
    .from("signed_documents")
    .select("id, data")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as Row | null)?.data ?? null;
}

/** A document whose signed (or original) bytes hash to `sha256`. */
export async function findByHash(
  sha256: string,
): Promise<{ doc: SignedDoc; match: "signed" | "original" } | null> {
  // Also keeps the PostgREST filter below free of anything but hex.
  if (!/^[0-9a-f]{64}$/.test(sha256)) return null;
  const docs = isSupabaseMode()
    ? await (async () => {
        const { data, error } = await supabase()
          .from("signed_documents")
          .select("id, data")
          .or(`signed_sha256.eq.${sha256},original_sha256.eq.${sha256}`)
          .limit(5);
        if (error) throw error;
        return (data as Row[]).map((row) => row.data);
      })()
    : await readLocalIndex();
  const signed = docs.find((doc) => doc.signedSha256 === sha256);
  if (signed) return { doc: signed, match: "signed" };
  const original = docs.find((doc) => doc.originalSha256 === sha256);
  return original ? { doc: original, match: "original" } : null;
}

export async function saveDoc(doc: SignedDoc): Promise<void> {
  if (!isSupabaseMode()) {
    const docs = (await readLocalIndex()).filter((d) => d.id !== doc.id);
    await writeLocalIndex([doc, ...docs]);
    return;
  }
  const { error } = await supabase().from("signed_documents").upsert({
    id: doc.id,
    data: doc,
    original_sha256: doc.originalSha256,
    signed_sha256: doc.signedSha256,
    // Only requests sent to others need the column (added later in
    // schema.sql), so documents you sign alone keep working without it.
    ...(doc.status ? { status: doc.status } : {}),
  });
  if (error) throw error;
}

/**
 * Takes the right to finish a pending document: true for exactly one caller,
 * however many signers finish at the same moment. `release` hands it back
 * when finishing failed, so the next attempt can run.
 */
export async function claimFinalize(id: string): Promise<boolean> {
  if (!isSupabaseMode()) {
    const docs = await readLocalIndex();
    const doc = docs.find((d) => d.id === id);
    if (!doc || (doc.status ?? "completed") !== "pending") return false;
    doc.status = "completed";
    // Locally a single process: marking it is enough; saveDoc writes the rest.
    return true;
  }
  const { data, error } = await supabase()
    .from("signed_documents")
    .update({ status: "finalizing" })
    .eq("id", id)
    .eq("status", "pending")
    .select("id");
  if (error) throw error;
  return (data ?? []).length === 1;
}

export async function releaseFinalize(id: string): Promise<void> {
  if (!isSupabaseMode()) return;
  await supabase()
    .from("signed_documents")
    .update({ status: "pending" })
    .eq("id", id)
    .eq("status", "finalizing");
}

// -- Signers --------------------------------------------------------------------

interface SignerRow {
  id: string;
  doc_id: string;
  data: SignerRecord;
}

async function readLocalSigners(): Promise<SignerRecord[]> {
  try {
    return JSON.parse(await fs.readFile(LOCAL_SIGNERS, "utf8")) as SignerRecord[];
  } catch {
    return [];
  }
}

/** The signers of these documents, in the order they were added. */
export async function listSigners(docIds: string[]): Promise<SignerRecord[]> {
  if (docIds.length === 0) return [];
  if (!isSupabaseMode()) {
    const wanted = new Set(docIds);
    return (await readLocalSigners()).filter((s) => wanted.has(s.docId));
  }
  const { data, error } = await supabase()
    .from("document_signers")
    .select("id, doc_id, data")
    .in("doc_id", docIds)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data as SignerRow[]).map((row) => row.data);
}

export async function getSigner(id: string): Promise<SignerRecord | null> {
  if (!isSupabaseMode()) {
    return (await readLocalSigners()).find((s) => s.id === id) ?? null;
  }
  const { data, error } = await supabase()
    .from("document_signers")
    .select("id, doc_id, data")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as SignerRow | null)?.data ?? null;
}

/** One row per signer, so two people signing at once never overwrite each other. */
export async function saveSigner(signer: SignerRecord): Promise<void> {
  if (!isSupabaseMode()) {
    const all = await readLocalSigners();
    const index = all.findIndex((s) => s.id === signer.id);
    if (index >= 0) all[index] = signer;
    else all.push(signer);
    await fs.mkdir(path.dirname(LOCAL_SIGNERS), { recursive: true });
    await fs.writeFile(LOCAL_SIGNERS, JSON.stringify(all, null, 2), "utf8");
    return;
  }
  const { error } = await supabase()
    .from("document_signers")
    .upsert({ id: signer.id, doc_id: signer.docId, data: signer });
  if (error) throw error;
}

// -- Files --------------------------------------------------------------------

function localPath(objectPath: string): string {
  const resolved = path.join(LOCAL_DIR, objectPath);
  if (!resolved.startsWith(LOCAL_DIR + path.sep)) throw new Error("Bad path");
  return resolved;
}

export async function putFile(
  objectPath: string,
  bytes: Uint8Array,
  contentType: string,
): Promise<void> {
  if (!isSupabaseMode()) {
    const file = localPath(objectPath);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, bytes);
    return;
  }
  const { error } = await supabase()
    .storage.from(SIGNED_DOCS_BUCKET)
    .upload(objectPath, bytes, { contentType, upsert: true });
  if (error) throw error;
}

/** The file's bytes, or null when there is none. */
export async function getFile(objectPath: string): Promise<Buffer | null> {
  if (!isSupabaseMode()) {
    try {
      return await fs.readFile(localPath(objectPath));
    } catch {
      return null;
    }
  }
  const { data, error } = await supabase().storage.from(SIGNED_DOCS_BUCKET).download(objectPath);
  if (error || !data) return null;
  return Buffer.from(await data.arrayBuffer());
}

export async function removeFile(objectPath: string): Promise<void> {
  if (!isSupabaseMode()) {
    await fs.rm(localPath(objectPath), { force: true });
    return;
  }
  await supabase().storage.from(SIGNED_DOCS_BUCKET).remove([objectPath]);
}

/**
 * A link the browser can fetch the file from: a signed URL valid for a minute
 * in Supabase mode, or null locally (the caller streams the bytes). With a
 * `fileName` it downloads under that name; without one it opens in place.
 */
export async function downloadUrl(
  objectPath: string,
  fileName: string | null,
): Promise<string | null> {
  if (!isSupabaseMode()) return null;
  const { data, error } = await supabase()
    .storage.from(SIGNED_DOCS_BUCKET)
    .createSignedUrl(objectPath, 60, fileName ? { download: fileName } : undefined);
  if (error) throw error;
  return data.signedUrl;
}

/**
 * Where the browser PUTs a PDF before it is signed. Uploads skip the server
 * (Vercel caps request bodies at 4.5 MB): Supabase hands out a one-time URL
 * for the private bucket. Locally the dev server takes the PUT itself.
 */
export async function uploadTarget(key: string): Promise<string> {
  if (!isSupabaseMode()) return `/admin/firmas/upload?key=${key}`;
  const { data, error } = await supabase()
    .storage.from(SIGNED_DOCS_BUCKET)
    .createSignedUploadUrl(docPaths.upload(key));
  if (error) throw error;
  return data.signedUrl;
}
