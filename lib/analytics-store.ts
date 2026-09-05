import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";
import {
  DAY_TIMEZONE,
  type AnalyticsData,
  type DayStats,
  type Hit,
  type PublicAnalytics,
  type Visit,
  type VisitStep,
} from "@/lib/analytics-types";
import { isSupabaseMode, supabase } from "@/lib/supabase";

/**
 * Self-hosted, cookie-less visit analytics.
 *
 * Same storage strategy as the résumé content (see `lib/resume-store.ts`):
 * Supabase when SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set, a local
 * JSON file otherwise. Everything is stored **pre-aggregated per day** plus a
 * short feed of recent visits, so a read/write is one small row and the data
 * never grows with traffic.
 *
 * Privacy: no cookies, no raw IPs and no cross-day identifiers are stored. A
 * visitor only exists here as a salted hash that changes every day, which is
 * just enough to count unique visits (see `lib/analytics-server.ts`). The
 * `analytics_data` table has Row Level Security enabled with no policies, so
 * only the service role key (server-only) can read or write it — unlike the
 * old Blob store, nothing here is reachable by anyone who finds a URL.
 */

export type {
  AnalyticsData,
  DayStats,
  Hit,
  PublicAnalytics,
  PublicVisit,
  RecentHit,
  Visit,
  VisitEvent,
  VisitStep,
} from "@/lib/analytics-types";

const ANALYTICS_ROW_ID = "main";
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

/** How long the per-visitor sessions stay readable in the dashboard. */
const VISIT_RETENTION_DAYS = 14;
/** A new hit after this much silence starts a new session. */
const SESSION_GAP_MS = 30 * 60 * 1000;
/** Caps, so one busy day can never blow up the single stored row. */
const MAX_VISITS_PER_DAY = 120;
const MAX_STEPS_PER_VISIT = 30;
const MAX_EVENTS_PER_VISIT = 20;
/** Longest dwell we believe: past this the tab was simply left open. */
const MAX_STEP_SECONDS = 3600;

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
    visits: [],
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
    visits: day.visits ?? base.visits,
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

async function readFromSupabase(): Promise<Partial<AnalyticsData> | null> {
  const { data, error } = await supabase()
    .from("analytics_data")
    .select("data")
    .eq("id", ANALYTICS_ROW_ID)
    .maybeSingle();
  if (error) throw error;
  return (data?.data as Partial<AnalyticsData> | undefined) ?? null;
}

async function writeToSupabase(data: AnalyticsData): Promise<void> {
  const { error } = await supabase()
    .from("analytics_data")
    .upsert({ id: ANALYTICS_ROW_ID, data, updated_at: new Date().toISOString() });
  if (error) throw error;
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
    const stored = isSupabaseMode() ? await readFromSupabase() : await readFromFile();
    return normalize(stored);
  } catch (error) {
    console.error("analytics: read failed", error);
    return normalize(null);
  }
}

async function save(data: AnalyticsData): Promise<void> {
  if (isSupabaseMode()) await writeToSupabase(data);
  else await writeToFile(data);
}

// -- Writes ------------------------------------------------------------------

/**
 * Serialize writes inside this instance so a burst of hits (a view plus its
 * clicks) can't clobber each other through read-modify-write. Two *different*
 * serverless instances writing in the very same moment can still lose a hit —
 * an acceptable trade for a personal site with no database transaction here.
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

/* -- Sessions -------------------------------------------------------------- */

/** The visitor's session if it is still open, or `null` when it lapsed. */
function openVisit(day: DayStats, visitorId: string, now: number): Visit | null {
  const visits = day.visits;
  if (!visits?.length) return null;
  for (let i = visits.length - 1; i >= 0; i--) {
    const visit = visits[i];
    if (visit.id !== visitorId) continue;
    return now - visit.lastAt <= SESSION_GAP_MS ? visit : null;
  }
  return null;
}

/** Someone who already came by today keeps the number they were given. */
function visitorNumber(visits: Visit[], visitorId: string): number {
  for (const visit of visits) {
    if (visit.id === visitorId) return visit.visitor;
  }
  return visits.reduce((max, visit) => Math.max(max, visit.visitor), 0) + 1;
}

function startVisit(day: DayStats, hit: Hit, now: number): Visit | null {
  const visits = (day.visits ??= []);
  if (visits.length >= MAX_VISITS_PER_DAY) return null;
  const visit: Visit = {
    id: hit.visitorId,
    visitor: visitorNumber(visits, hit.visitorId),
    startedAt: now,
    lastAt: now,
    src: hit.src,
    country: hit.country,
    city: hit.city,
    device: hit.device,
    browser: hit.browser,
    steps: [],
    events: [],
  };
  visits.push(visit);
  return visit;
}

/**
 * Write a measurement onto the page it belongs to: the last time that path was
 * opened. A reload reports the same path twice, so the still-open step wins and
 * an already-closed one only grows.
 */
function closeStep(
  visit: Visit,
  path: string,
  field: "seconds" | "depth",
  value: number,
): void {
  let latest: VisitStep | null = null;
  for (let i = visit.steps.length - 1; i >= 0; i--) {
    const step = visit.steps[i];
    if (step.path !== path) continue;
    if (step[field] === undefined) {
      step[field] = value;
      return;
    }
    if (!latest) latest = step;
  }
  if (latest) latest[field] = Math.max(latest[field] ?? 0, value);
}

/**
 * Fold one hit into its visitor's session: a view opens a page, the `dwell:`
 * and `scroll:` pings sent on leaving close it, and everything else (a CV
 * download, a WhatsApp click) is filed as an action of that visit.
 */
function recordVisit(day: DayStats, hit: Hit, now: number): void {
  if (!hit.visitorId) return;
  const name = hit.kind === "event" ? (hit.name ?? "") : "";
  const isMeasurement = name.startsWith("dwell:") || name.startsWith("scroll:");

  // A leaving ping only closes a page the session already has. It must never
  // open one of its own: a tab left open all afternoon and closed at night
  // would otherwise file an empty visit against the wrong hour.
  const visit =
    openVisit(day, hit.visitorId, now) ??
    (isMeasurement ? null : startVisit(day, hit, now));
  if (!visit) return;
  visit.lastAt = now;

  if (hit.kind === "view") {
    if (visit.steps.length < MAX_STEPS_PER_VISIT) {
      visit.steps.push({ t: now, path: hit.path });
    }
    return;
  }

  if (name.startsWith("dwell:")) {
    if (hit.seconds !== undefined) {
      closeStep(visit, hit.path, "seconds", Math.min(hit.seconds, MAX_STEP_SECONDS));
    }
    return;
  }
  if (name.startsWith("scroll:")) {
    // The depth is in the event name when an older client doesn't send it.
    const depth = hit.depth ?? Number(name.slice(7));
    if (Number.isFinite(depth)) closeStep(visit, hit.path, "depth", depth);
    return;
  }
  if (visit.events.length < MAX_EVENTS_PER_VISIT) {
    visit.events.push({ t: now, name, path: hit.path });
  }
}

function prune(data: AnalyticsData): void {
  const keep = new Set(recentDayKeys(RETENTION_DAYS));
  const keepIds = new Set(recentDayKeys(ID_RETENTION_DAYS));
  const keepVisits = new Set(recentDayKeys(VISIT_RETENTION_DAYS));
  for (const [key, day] of Object.entries(data.days)) {
    if (!keep.has(key)) {
      delete data.days[key];
      continue;
    }
    // Visitor hashes are only needed while their day is still current.
    if (!keepIds.has(key)) {
      if (day.ids?.length) day.ids = [];
      // The grouping already lives in `visit.visitor`, so the hash can go.
      for (const visit of day.visits ?? []) visit.id = "";
    }
    // Older days keep their totals, but the sessions behind them are dropped.
    if (!keepVisits.has(key) && day.visits?.length) day.visits = [];
  }
}

/** Record a single enriched hit. Safe to call from `after()`. */
export async function recordHit(hit: Hit): Promise<void> {
  try {
    await withLock(async () => {
      const data = await load();
      const now = Date.now();
      const key = dayKey(now);
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

      recordVisit(day, hit, now);

      // Events worth seeing in the feed; plain scroll/dwell pings are noise.
      const feedWorthy =
        hit.kind === "view" ||
        Boolean(hit.name && !/^(scroll|dwell):/.test(hit.name));
      if (feedWorthy) {
        data.recent.unshift({
          t: now,
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

      data.updatedAt = now;
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
      visits: (day.visits ?? []).map((visit) => ({
        visitor: visit.visitor,
        startedAt: visit.startedAt,
        lastAt: visit.lastAt,
        src: visit.src,
        country: visit.country,
        city: visit.city,
        device: visit.device,
        browser: visit.browser,
        steps: visit.steps,
        events: visit.events,
      })),
    };
  }
  return { ...data, days };
}

/**
 * End-to-end check of the storage path: read the row, write it straight back.
 * Tracking failures are swallowed on purpose (a broken counter must never
 * break a page), so this is how you find out that writes are failing.
 */
export async function checkStorage(): Promise<{
  ok: boolean;
  mode: "supabase" | "file";
  detail: string;
}> {
  const mode = isSupabaseMode() ? "supabase" : "file";
  try {
    await withLock(async () => {
      const data = await load();
      data.updatedAt = Date.now();
      await save(data);
    });
    return {
      ok: true,
      mode,
      detail:
        mode === "supabase"
          ? "Lectura y escritura correctas en Supabase."
          : "Lectura y escritura correctas en data/analytics.json.",
    };
  } catch (error) {
    return {
      ok: false,
      mode,
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

/** Wipe every stored metric (admin action). */
export async function resetAnalytics(): Promise<void> {
  await withLock(async () => {
    await save({ version: 1, days: {}, recent: [], updatedAt: Date.now() });
  });
}
