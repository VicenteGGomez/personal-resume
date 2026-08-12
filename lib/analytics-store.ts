import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";
import {
  DAY_TIMEZONE,
  type AnalyticsData,
  type DayStats,
  type Hit,
  type PublicAnalytics,
} from "@/lib/analytics-types";

/**
 * Self-hosted, cookie-less visit analytics.
 *
 * Same storage strategy as the résumé content (see `lib/resume-store.ts`):
 * Vercel Blob when `BLOB_READ_WRITE_TOKEN` is present, a local JSON file
 * otherwise. Everything is stored **pre-aggregated per day** plus a short feed
 * of recent visits, so the dashboard is one small read and the file never grows
 * with traffic.
 *
 * Privacy: no cookies, no raw IPs and no cross-day identifiers are stored. A
 * visitor only exists here as a salted hash that changes every day, which is
 * just enough to count unique visits (see `lib/analytics-server.ts`).
 */

export type {
  AnalyticsData,
  DayStats,
  Hit,
  PublicAnalytics,
  RecentHit,
} from "@/lib/analytics-types";

const STATS_PATHNAME = "analytics/stats.json";
const LOCAL_DATA_FILE = path.join(process.cwd(), "data", "analytics.json");

/** How much history to keep. Older days are dropped on the next write. */
const RETENTION_DAYS = 365;
/** Size of the "recent activity" feed. */
const RECENT_LIMIT = 60;
/** Cap per breakdown, so a noisy crawler can't grow the file without bound. */
const MAX_KEYS = 60;
/** Visitor hashes are only useful to de-duplicate within the same day. */
const ID_RETENTION_DAYS = 2;
const MAX_IDS_PER_DAY = 5000;

// -- Empty / defaulted shapes ------------------------------------------------

function emptyDay(): DayStats {
  return {
    views: 0,
    visitors: 0,
    pages: {},
    sources: {},
    countries: {},
    devices: {},
    events: {},
    ids: [],
  };
}

/** Default missing fields at read time so older stored files keep working. */
function normalizeDay(day: Partial<DayStats> | undefined): DayStats {
  const base = emptyDay();
  if (!day) return base;
  return {
    views: day.views ?? 0,
    visitors: day.visitors ?? 0,
    pages: day.pages ?? base.pages,
    sources: day.sources ?? base.sources,
    countries: day.countries ?? base.countries,
    devices: day.devices ?? base.devices,
    events: day.events ?? base.events,
    ids: day.ids ?? base.ids,
  };
}

function normalize(stored: Partial<AnalyticsData> | null): AnalyticsData {
  const days: Record<string, DayStats> = {};
  for (const [key, value] of Object.entries(stored?.days ?? {})) {
    days[key] = normalizeDay(value);
  }
  return {
    version: 1,
    days,
    recent: stored?.recent ?? [],
    updatedAt: stored?.updatedAt ?? 0,
  };
}

// -- Day keys ----------------------------------------------------------------

const dayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: DAY_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** `YYYY-MM-DD` for a timestamp, in `DAY_TIMEZONE`. */
export function dayKey(timestamp: number = Date.now()): string {
  return dayFormatter.format(new Date(timestamp));
}

/** The last `count` day keys, oldest first, ending today. */
export function recentDayKeys(count: number): string[] {
  const keys: string[] = [];
  const day = 24 * 60 * 60 * 1000;
  const now = Date.now();
  for (let i = count - 1; i >= 0; i--) keys.push(dayKey(now - i * day));
  return keys;
}

// -- Storage backends --------------------------------------------------------

function isBlobMode(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

/** Cached so repeated reads skip the `list()` lookup. */
let blobUrl: string | null = null;

async function readFromBlob(): Promise<Partial<AnalyticsData> | null> {
  if (!blobUrl) {
    const { list } = await import("@vercel/blob");
    const { blobs } = await list({ prefix: STATS_PATHNAME, limit: 1 });
    const found = blobs.find((b) => b.pathname === STATS_PATHNAME);
    if (!found) return null;
    blobUrl = found.url;
  }
  // Cache-bust: this file changes on every visit.
  const res = await fetch(`${blobUrl}?v=${Date.now()}`, { cache: "no-store" });
  if (!res.ok) {
    blobUrl = null;
    return null;
  }
  return (await res.json()) as Partial<AnalyticsData>;
}

async function writeToBlob(data: AnalyticsData): Promise<void> {
  const { put } = await import("@vercel/blob");
  const result = await put(STATS_PATHNAME, JSON.stringify(data), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 0,
  });
  blobUrl = result.url;
}

async function readFromFile(): Promise<Partial<AnalyticsData> | null> {
  try {
    return JSON.parse(
      await fs.readFile(LOCAL_DATA_FILE, "utf8"),
    ) as Partial<AnalyticsData>;
  } catch {
    return null;
  }
}

async function writeToFile(data: AnalyticsData): Promise<void> {
  await fs.mkdir(path.dirname(LOCAL_DATA_FILE), { recursive: true });
  await fs.writeFile(LOCAL_DATA_FILE, JSON.stringify(data, null, 2), "utf8");
}

async function load(): Promise<AnalyticsData> {
  try {
    const stored = isBlobMode() ? await readFromBlob() : await readFromFile();
    return normalize(stored);
  } catch (error) {
    console.error("analytics: read failed", error);
    return normalize(null);
  }
}

async function save(data: AnalyticsData): Promise<void> {
  if (isBlobMode()) await writeToBlob(data);
  else await writeToFile(data);
}

// -- Writes ------------------------------------------------------------------

/**
 * Serialize writes inside this instance so a burst of hits (a view plus its
 * clicks) can't clobber each other through read-modify-write. Two *different*
 * serverless instances writing in the very same moment can still lose a hit —
 * an acceptable trade for a personal site with no database.
 */
let writeQueue: Promise<unknown> = Promise.resolve();

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = writeQueue.then(fn, fn);
  writeQueue = run.catch(() => undefined);
  return run;
}

function bump(map: Record<string, number>, key: string): void {
  if (!key) return;
  // Only new keys are capped, so existing counters always keep counting.
  if (map[key] === undefined && Object.keys(map).length >= MAX_KEYS) return;
  map[key] = (map[key] ?? 0) + 1;
}

function prune(data: AnalyticsData): void {
  const keep = new Set(recentDayKeys(RETENTION_DAYS));
  const keepIds = new Set(recentDayKeys(ID_RETENTION_DAYS));
  for (const [key, day] of Object.entries(data.days)) {
    if (!keep.has(key)) {
      delete data.days[key];
      continue;
    }
    // Visitor hashes are only needed while their day is still current.
    if (!keepIds.has(key) && day.ids?.length) day.ids = [];
  }
}

/** Record a single enriched hit. Safe to call from `after()`. */
export async function recordHit(hit: Hit): Promise<void> {
  try {
    await withLock(async () => {
      const data = await load();
      const key = dayKey();
      const day = (data.days[key] ??= emptyDay());

      if (hit.visitorId) {
        const ids = (day.ids ??= []);
        if (!ids.includes(hit.visitorId)) {
          day.visitors += 1;
          if (ids.length < MAX_IDS_PER_DAY) ids.push(hit.visitorId);
        }
      }

      if (hit.kind === "view") {
        day.views += 1;
        bump(day.pages, hit.path);
        bump(day.sources, hit.src);
        bump(day.countries, hit.country);
        bump(day.devices, hit.device);
      } else if (hit.name) {
        bump(day.events, hit.name);
      }

      // Events worth seeing in the feed; plain scroll/dwell pings are noise.
      const feedWorthy =
        hit.kind === "view" ||
        Boolean(hit.name && !/^(scroll|dwell):/.test(hit.name));
      if (feedWorthy) {
        data.recent.unshift({
          t: Date.now(),
          path: hit.path,
          src: hit.src,
          country: hit.country,
          city: hit.city,
          device: hit.device,
          browser: hit.browser,
          event: hit.kind === "view" ? "view" : (hit.name ?? "event"),
        });
        data.recent = data.recent.slice(0, RECENT_LIMIT);
      }

      data.updatedAt = Date.now();
      prune(data);
      await save(data);
    });
  } catch (error) {
    // Analytics must never break a page or a CV download.
    console.error("analytics: write failed", error);
  }
}

// -- Reads -------------------------------------------------------------------

/** Dashboard data, with the visitor hashes stripped out. */
export async function getAnalytics(): Promise<PublicAnalytics> {
  const data = await load();
  const days: PublicAnalytics["days"] = {};
  for (const [key, day] of Object.entries(data.days)) {
    // Copied field by field so visitor hashes never reach the browser.
    days[key] = {
      views: day.views,
      visitors: day.visitors,
      pages: day.pages,
      sources: day.sources,
      countries: day.countries,
      devices: day.devices,
      events: day.events,
    };
  }
  return { ...data, days };
}

/** Wipe every stored metric (admin action). */
export async function resetAnalytics(): Promise<void> {
  await withLock(async () => {
    await save({ version: 1, days: {}, recent: [], updatedAt: Date.now() });
  });
}
