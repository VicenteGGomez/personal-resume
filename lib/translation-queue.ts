import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";
import type { Lang } from "@/lib/resume-content";
import type { PendingTranslation } from "@/lib/translation-sync";
import { isSupabaseMode, supabase } from "@/lib/supabase";

export type { PendingTranslation };

/**
 * The "leave it for later" list behind the bell in /admin.
 *
 * When a save changes one language and the translation is deferred, the groups
 * that changed are parked here. It is a to-do list, not content: it holds group
 * and field **keys** (see `lib/translation-sync.ts`), never values, so reopening
 * an entry always shows what the two languages say right now rather than a
 * stale copy of what they said when it was queued.
 *
 * It lives next to the content — the same `resume_content` table under its own
 * row id in production, a small JSON file in local dev — so the list is the
 * same on every device you edit from. No schema change: the table is a generic
 * `id`/`data` pair.
 */

const QUEUE_ROW_ID = "translation-queue";
const LOCAL_QUEUE_FILE = path.join(process.cwd(), "data", "translation-queue.json");
const MAX_ENTRIES = 200;

function str(value: unknown, max: number): string {
  if (value == null) return "";
  return String(value).slice(0, max);
}

/** Coerce stored or client-sent entries into the shape above. */
export function normalizeQueue(input: unknown): PendingTranslation[] {
  const raw = Array.isArray(input)
    ? input
    : Array.isArray((input as { items?: unknown })?.items)
      ? ((input as { items: unknown[] }).items as unknown[])
      : [];

  const seen = new Set<string>();
  const out: PendingTranslation[] = [];
  for (const item of raw.slice(0, MAX_ENTRIES)) {
    const entry = (item ?? {}) as Partial<PendingTranslation>;
    const key = str(entry.key, 200);
    const from: Lang = entry.from === "es" ? "es" : "en";
    if (!key) continue;
    // One entry per group and direction; a re-save of the same group merges
    // into it (see mergePending).
    const dedupe = `${from}:${key}`;
    if (seen.has(dedupe)) continue;
    seen.add(dedupe);
    const fieldKeys = Array.isArray(entry.fieldKeys)
      ? Array.from(
          new Set(
            entry.fieldKeys.map((f) => str(f, 120)).filter((f): f is string => !!f),
          ),
        ).slice(0, 100)
      : [];
    if (fieldKeys.length === 0) continue;
    out.push({
      key,
      from,
      title: str(entry.title, 300),
      fieldKeys,
      queuedAt: str(entry.queuedAt, 40) || new Date().toISOString(),
    });
  }
  return out;
}

async function readFromSupabase(): Promise<unknown> {
  const { data, error } = await supabase()
    .from("resume_content")
    .select("data")
    .eq("id", QUEUE_ROW_ID)
    .maybeSingle();
  if (error) throw error;
  return data?.data ?? null;
}

async function readFromFile(): Promise<unknown> {
  try {
    return JSON.parse(await fs.readFile(LOCAL_QUEUE_FILE, "utf8"));
  } catch {
    return null;
  }
}

/** The pending list, or an empty one when there is nothing (or a read fails). */
export async function getTranslationQueue(): Promise<PendingTranslation[]> {
  try {
    const stored = isSupabaseMode() ? await readFromSupabase() : await readFromFile();
    return normalizeQueue(stored);
  } catch (error) {
    // The queue is a convenience: never let it take the editor down with it.
    console.error("getTranslationQueue failed, starting empty:", error);
    return [];
  }
}

export async function saveTranslationQueue(
  items: PendingTranslation[],
): Promise<void> {
  const payload = { items: normalizeQueue(items) };
  if (isSupabaseMode()) {
    const { error } = await supabase()
      .from("resume_content")
      .upsert({
        id: QUEUE_ROW_ID,
        data: payload,
        updated_at: new Date().toISOString(),
      });
    if (error) throw error;
    return;
  }
  await fs.mkdir(path.dirname(LOCAL_QUEUE_FILE), { recursive: true });
  await fs.writeFile(LOCAL_QUEUE_FILE, JSON.stringify(payload, null, 2), "utf8");
}
