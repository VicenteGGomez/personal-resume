import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";
import { revalidatePath } from "next/cache";
import {
  type ResumeData,
  type LangContent,
  type SharedContent,
  seedResumeData,
} from "@/lib/resume-content";

/**
 * Storage abstraction for the resume content and uploaded images.
 *
 * Two backends are supported and picked automatically:
 *   - Vercel Blob  — used when BLOB_READ_WRITE_TOKEN is present (production).
 *   - Local files  — used otherwise (local dev / self-hosted with a disk).
 *
 * Reads always fall back to the seed content baked into the repo, and stored
 * content is deep-merged onto the seed so new fields keep working after a
 * schema change without re-saving.
 */

const CONTENT_PATHNAME = "resume/content.json";
const LOCAL_DATA_FILE = path.join(process.cwd(), "data", "resume.json");
const LOCAL_UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

function isBlobMode(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

// -- Merging -----------------------------------------------------------------

/**
 * Back-fill a stable, positional id on items saved before their `id` field
 * existed, so projects/publications can reference them. Position-based ids are
 * only a bootstrap: the next admin save persists real ids (see normalize.ts).
 */
function withIds<T extends { id?: string }>(
  list: T[] | undefined,
  prefix: string,
): T[] {
  return (list ?? []).map((item, i) =>
    item && item.id ? item : { ...item, id: `${prefix}-${i}` },
  );
}

function mergeLang(seed: LangContent, stored: Partial<LangContent> | undefined): LangContent {
  if (!stored) return seed;
  return {
    ...seed,
    ...stored,
    // Arrays are replaced wholesale when present, otherwise keep the seed.
    nav: stored.nav ?? seed.nav,
    highlights: stored.highlights ?? seed.highlights,
    // Association targets get their ids back-filled so chips keep matching.
    experiences: withIds(stored.experiences ?? seed.experiences, "exp"),
    education: withIds(stored.education ?? seed.education, "edu"),
    skills: stored.skills ?? seed.skills,
    awards: withIds(stored.awards ?? seed.awards, "award"),
    courses: withIds(stored.courses ?? seed.courses, "course"),
    volunteering: withIds(stored.volunteering ?? seed.volunteering, "vol"),
  };
}

function mergeShared(
  seed: SharedContent,
  stored: Partial<SharedContent> | undefined,
): SharedContent {
  const merged = { ...seed, ...(stored ?? {}) };
  // Back-fill publication ids so résumé association chips can deep-link to them.
  return { ...merged, publications: withIds(merged.publications, "pub") };
}

function mergeWithSeed(stored: Partial<ResumeData> | null | undefined): ResumeData {
  if (!stored) return seedResumeData;
  return {
    shared: mergeShared(seedResumeData.shared, stored.shared),
    projects: stored.projects ?? seedResumeData.projects,
    en: mergeLang(seedResumeData.en, stored.en),
    es: mergeLang(seedResumeData.es, stored.es),
  };
}

// -- Reads -------------------------------------------------------------------

async function readFromBlob(): Promise<Partial<ResumeData> | null> {
  const { list } = await import("@vercel/blob");
  const { blobs } = await list({ prefix: CONTENT_PATHNAME, limit: 1 });
  const blob = blobs.find((b) => b.pathname === CONTENT_PATHNAME);
  if (!blob) return null;
  // Cache-bust so freshly saved content is reflected immediately.
  const res = await fetch(`${blob.url}?v=${Date.now()}`, { cache: "no-store" });
  if (!res.ok) return null;
  return (await res.json()) as Partial<ResumeData>;
}

async function readFromFile(): Promise<Partial<ResumeData> | null> {
  try {
    const raw = await fs.readFile(LOCAL_DATA_FILE, "utf8");
    return JSON.parse(raw) as Partial<ResumeData>;
  } catch {
    return null;
  }
}

export async function getResumeData(): Promise<ResumeData> {
  try {
    const stored = isBlobMode() ? await readFromBlob() : await readFromFile();
    return mergeWithSeed(stored);
  } catch (error) {
    console.error("getResumeData failed, using seed content:", error);
    return seedResumeData;
  }
}

// -- Writes ------------------------------------------------------------------

async function writeToBlob(data: ResumeData): Promise<void> {
  const { put } = await import("@vercel/blob");
  await put(CONTENT_PATHNAME, JSON.stringify(data, null, 2), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 60,
  });
}

async function writeToFile(data: ResumeData): Promise<void> {
  await fs.mkdir(path.dirname(LOCAL_DATA_FILE), { recursive: true });
  await fs.writeFile(LOCAL_DATA_FILE, JSON.stringify(data, null, 2), "utf8");
}

export async function saveResumeData(data: ResumeData): Promise<void> {
  if (isBlobMode()) {
    await writeToBlob(data);
  } else {
    await writeToFile(data);
  }
  // Refresh the public pages so edits appear right away.
  revalidatePath("/", "layout");
}

// -- Image uploads -----------------------------------------------------------

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
]);

function safeExtension(fileName: string, contentType: string): string {
  const fromName = path.extname(fileName).toLowerCase().replace(/[^a-z0-9.]/g, "");
  if (fromName) return fromName;
  const map: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/avif": ".avif",
    "image/gif": ".gif",
  };
  return map[contentType] ?? ".img";
}

/** Validate, store an uploaded image and return its public URL. */
export async function saveImage(file: File): Promise<string> {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error("Unsupported image type. Use JPG, PNG, WebP, AVIF or GIF.");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("Image is too large (max 5 MB).");
  }

  const ext = safeExtension(file.name, file.type);
  const base = `profile-${Date.now()}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  if (isBlobMode()) {
    const { put } = await import("@vercel/blob");
    const result = await put(`resume/uploads/${base}${ext}`, buffer, {
      access: "public",
      contentType: file.type,
      addRandomSuffix: true,
    });
    return result.url;
  }

  await fs.mkdir(LOCAL_UPLOAD_DIR, { recursive: true });
  const fileName = `${base}${ext}`;
  await fs.writeFile(path.join(LOCAL_UPLOAD_DIR, fileName), buffer);
  return `/uploads/${fileName}`;
}

// -- CV (PDF) uploads --------------------------------------------------------

const MAX_CV_BYTES = 5 * 1024 * 1024; // 5 MB (kept in sync with serverActions body limit)

/**
 * Delete a previously stored CV so the storage bucket doesn't accumulate old
 * copies. Only removes files we own: uploaded blobs and local dev uploads.
 * The repo-static seed (e.g. "/cv-vicente-gomez-en.pdf") and any externally
 * pasted URL are left untouched.
 */
async function deletePreviousCv(previousUrl: string): Promise<void> {
  if (!previousUrl) return;
  try {
    if (previousUrl.includes(".blob.vercel-storage.com")) {
      const { del } = await import("@vercel/blob");
      await del(previousUrl);
    } else if (previousUrl.startsWith("/uploads/")) {
      await fs.unlink(path.join(process.cwd(), "public", previousUrl));
    }
  } catch (error) {
    // Best-effort cleanup: a failed delete must not block the new upload.
    console.warn("deletePreviousCv failed for", previousUrl, error);
  }
}

/**
 * Validate and store an uploaded CV (PDF), returning its public URL. When a
 * `previousUrl` is given, the old file is removed from storage afterwards.
 */
export async function saveCv(file: File, previousUrl = ""): Promise<string> {
  if (file.type !== "application/pdf") {
    throw new Error("Unsupported file type. Upload a PDF.");
  }
  if (file.size > MAX_CV_BYTES) {
    throw new Error("PDF is too large (max 5 MB).");
  }

  const base = `cv-${Date.now()}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  let url: string;
  if (isBlobMode()) {
    const { put } = await import("@vercel/blob");
    const result = await put(`resume/uploads/${base}.pdf`, buffer, {
      access: "public",
      contentType: "application/pdf",
      addRandomSuffix: true,
    });
    url = result.url;
  } else {
    await fs.mkdir(LOCAL_UPLOAD_DIR, { recursive: true });
    const fileName = `${base}.pdf`;
    await fs.writeFile(path.join(LOCAL_UPLOAD_DIR, fileName), buffer);
    url = `/uploads/${fileName}`;
  }

  if (previousUrl && previousUrl !== url) {
    await deletePreviousCv(previousUrl);
  }
  return url;
}

export function storageMode(): "blob" | "file" {
  return isBlobMode() ? "blob" : "file";
}
