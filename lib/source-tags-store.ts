import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";
import {
  DEFAULT_SOURCE_TAGS,
  normalizeSourceTags,
  type SourceTag,
} from "@/lib/source-tags";
import { isSupabaseMode, supabase } from "@/lib/supabase";

/**
 * Where your `?src=` names live (see `lib/source-tags.ts`). Same arrangement as
 * the translation queue: its own row id in the `resume_content` table in
 * production, a small JSON file in local dev. No schema change.
 */

const TAGS_ROW_ID = "source-tags";
const LOCAL_TAGS_FILE = path.join(process.cwd(), "data", "source-tags.json");

async function readStored(): Promise<unknown> {
  if (isSupabaseMode()) {
    const { data, error } = await supabase()
      .from("resume_content")
      .select("data")
      .eq("id", TAGS_ROW_ID)
      .maybeSingle();
    if (error) throw error;
    return data?.data ?? null;
  }
  try {
    return JSON.parse(await fs.readFile(LOCAL_TAGS_FILE, "utf8"));
  } catch {
    return null;
  }
}

/** Your tags, or the defaults until the list is first saved. */
export async function getSourceTags(): Promise<SourceTag[]> {
  try {
    const stored = await readStored();
    // Saved at least once: that list is the truth, even when emptied.
    if (stored) return normalizeSourceTags(stored);
  } catch (error) {
    // Names are a convenience: never let them take the dashboard down.
    console.error("getSourceTags failed, using defaults:", error);
  }
  return DEFAULT_SOURCE_TAGS;
}

export async function saveSourceTags(tags: SourceTag[]): Promise<void> {
  const payload = { tags: normalizeSourceTags(tags) };
  if (isSupabaseMode()) {
    const { error } = await supabase()
      .from("resume_content")
      .upsert({
        id: TAGS_ROW_ID,
        data: payload,
        updated_at: new Date().toISOString(),
      });
    if (error) throw error;
    return;
  }
  await fs.mkdir(path.dirname(LOCAL_TAGS_FILE), { recursive: true });
  await fs.writeFile(LOCAL_TAGS_FILE, JSON.stringify(payload, null, 2), "utf8");
}
