import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";
import { cache } from "react";
import { revalidatePath } from "next/cache";
import {
  type ResumeData,
  type LangContent,
  type SharedContent,
  navFromSections,
  seedResumeData,
} from "@/lib/resume-content";
import { isSupabaseMode, supabase, RESUME_UPLOADS_BUCKET } from "@/lib/supabase";

/**
 * Storage abstraction for the resume content and uploaded images.
 *
 * Two backends are supported and picked automatically:
 *   - Supabase    — used when SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set
 *                    (production). Content lives in the `resume_content`
 *                    table; uploads live in the `resume-uploads` bucket.
 *   - Local files — used otherwise (local dev / self-hosted with a disk).
 *
 * Reads always fall back to the seed content baked into the repo, and stored
 * content is deep-merged onto the seed so new fields keep working after a
 * schema change without re-saving.
 */

const CONTENT_ROW_ID = "main";
const LOCAL_DATA_FILE = path.join(process.cwd(), "data", "resume.json");
const LOCAL_UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

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
    // The nav is the exception: it is rebuilt from the fixed section ids, so a
    // section added since the last admin save still gets its link.
    nav: navFromSections(seed.nav, stored.nav),
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

async function readFromSupabase(): Promise<Partial<ResumeData> | null> {
  const { data, error } = await supabase()
    .from("resume_content")
    .select("data")
    .eq("id", CONTENT_ROW_ID)
    .maybeSingle();
  if (error) throw error;
  return (data?.data as Partial<ResumeData> | undefined) ?? null;
}

async function readFromFile(): Promise<Partial<ResumeData> | null> {
  try {
    const raw = await fs.readFile(LOCAL_DATA_FILE, "utf8");
    return JSON.parse(raw) as Partial<ResumeData>;
  } catch {
    return null;
  }
}

/**
 * The content for the current request. Wrapped in React's `cache` so the
 * several readers of a single render — the root layout (which needs the default
 * theme), `generateMetadata`, and the page itself — share one storage round
 * trip instead of one each.
 */
export const getResumeData = cache(async (): Promise<ResumeData> => {
  try {
    const stored = isSupabaseMode() ? await readFromSupabase() : await readFromFile();
    return mergeWithSeed(stored);
  } catch (error) {
    console.error("getResumeData failed, using seed content:", error);
    return seedResumeData;
  }
});

// -- Writes ------------------------------------------------------------------

async function writeToSupabase(data: ResumeData): Promise<void> {
  const { error } = await supabase()
    .from("resume_content")
    .upsert({ id: CONTENT_ROW_ID, data, updated_at: new Date().toISOString() });
  if (error) throw error;
}

async function writeToFile(data: ResumeData): Promise<void> {
  await fs.mkdir(path.dirname(LOCAL_DATA_FILE), { recursive: true });
  await fs.writeFile(LOCAL_DATA_FILE, JSON.stringify(data, null, 2), "utf8");
}

export async function saveResumeData(data: ResumeData): Promise<void> {
  if (isSupabaseMode()) {
    await writeToSupabase(data);
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

/** Upload a buffer to the public uploads bucket and return its public URL. */
async function uploadToSupabase(
  objectPath: string,
  buffer: Buffer,
  contentType: string,
): Promise<string> {
  const { error } = await supabase()
    .storage.from(RESUME_UPLOADS_BUCKET)
    .upload(objectPath, buffer, { contentType, upsert: true });
  if (error) throw error;
  const { data } = supabase().storage.from(RESUME_UPLOADS_BUCKET).getPublicUrl(objectPath);
  return data.publicUrl;
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

  if (isSupabaseMode()) {
    return uploadToSupabase(`uploads/${base}${ext}`, buffer, file.type);
  }

  await fs.mkdir(LOCAL_UPLOAD_DIR, { recursive: true });
  const fileName = `${base}${ext}`;
  await fs.writeFile(path.join(LOCAL_UPLOAD_DIR, fileName), buffer);
  return `/uploads/${fileName}`;
}

// -- CV (PDF) uploads --------------------------------------------------------

const MAX_CV_BYTES = 5 * 1024 * 1024; // 5 MB (kept in sync with serverActions body limit)

/** The object path inside the bucket for a public URL we issued, or null. */
function supabaseObjectPath(url: string): string | null {
  const marker = `/storage/v1/object/public/${RESUME_UPLOADS_BUCKET}/`;
  const i = url.indexOf(marker);
  return i === -1 ? null : url.slice(i + marker.length);
}

/**
 * Delete a previously stored CV so the storage bucket doesn't accumulate old
 * copies. Only removes files we own: Supabase uploads and local dev uploads.
 * The repo-static seed (e.g. "/cv-vicente-gomez-en.pdf") and any externally
 * pasted URL are left untouched.
 */
async function deletePreviousCv(previousUrl: string): Promise<void> {
  if (!previousUrl) return;
  try {
    const objectPath = supabaseObjectPath(previousUrl);
    if (objectPath) {
      await supabase().storage.from(RESUME_UPLOADS_BUCKET).remove([objectPath]);
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
  if (isSupabaseMode()) {
    url = await uploadToSupabase(`uploads/${base}.pdf`, buffer, "application/pdf");
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

export function storageMode(): "supabase" | "file" {
  return isSupabaseMode() ? "supabase" : "file";
}
