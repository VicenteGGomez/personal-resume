import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";
import { isSupabaseMode, supabase } from "@/lib/supabase";
import type { SignedDoc } from "@/lib/signed-docs";

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
const LOCAL_DIR = path.join(process.cwd(), "data", "signed-documents");

export const docPaths = {
  original: (id: string) => `docs/${id}/original.pdf`,
  signed: (id: string) => `docs/${id}/signed.pdf`,
  upload: (key: string) => `uploads/${key}.pdf`,
  signatureImage: "settings/signature.png",
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
  });
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
