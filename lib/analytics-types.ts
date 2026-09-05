/**
 * Shapes shared by the analytics writer (`lib/analytics-store.ts`, server only)
 * and the admin dashboard (`components/StatsDashboard.tsx`, a client component).
 * Kept in their own module so the client bundle never pulls in `server-only`.
 */

/** Day buckets are cut at midnight in this timezone. Change it if you move. */
export const DAY_TIMEZONE = "Europe/Madrid";

/**
 * Long-lived cookie that opts a browser out of every metric: page views,
 * clicks and CV downloads. Set from the dashboard (see `app/admin/actions.ts`)
 * and honoured server-side, so it works even when the admin session expires.
 */
export const OPT_OUT_COOKIE = "resume_no_track";

/** One page inside a visit, in the order it was opened. */
export interface VisitStep {
  /** Epoch ms when the page was opened. */
  t: number;
  path: string;
  /** Seconds spent here. Filled in when the visitor leaves the page. */
  seconds?: number;
  /** Deepest scroll percentage reached here (0 | 25 | 50 | 75 | 100). */
  depth?: number;
}

/** A click or download made during a visit. */
export interface VisitEvent {
  t: number;
  /** Event name, e.g. `cv:es` or `contact:whatsapp`. */
  name: string;
  /** Page the visitor was on. */
  path: string;
}

/**
 * One session: everything a single visitor did in one sitting. Sessions are
 * cut after 30 minutes of inactivity, and never span two days — the visitor
 * hash rotates at midnight, so nobody can be followed from one day to another.
 */
export interface Visit {
  /**
   * Daily visitor hash. Stripped before the data reaches the browser, and
   * blanked once the day is no longer current: by then `visitor` already
   * carries the grouping.
   */
  id: string;
  /** 1, 2, 3… in order of first appearance that day. Stable once assigned. */
  visitor: number;
  startedAt: number;
  lastAt: number;
  src: string;
  country: string;
  city: string;
  device: string;
  browser: string;
  steps: VisitStep[];
  events: VisitEvent[];
}

export interface DayStats {
  /** Page views (a reload counts again). */
  views: number;
  /** Distinct daily visitor hashes seen. */
  visitors: number;
  /** Path → views, e.g. `/en`. */
  pages: Record<string, number>;
  /** `?src=` tag, else referrer host, else `direct`. */
  sources: Record<string, number>;
  /** ISO country code → views. */
  countries: Record<string, number>;
  /** `mobile` | `desktop` | `tablet` → views. */
  devices: Record<string, number>;
  /** Named events: `cv:en`, `contact:whatsapp`, `scroll:75`, `dwell:60plus`… */
  events: Record<string, number>;
  /** Daily visitor hashes, kept only for the last couple of days. */
  ids?: string[];
  /** Per-visitor sessions for this day, oldest first. Kept ~2 weeks. */
  visits?: Visit[];
}

export interface RecentHit {
  /** Epoch ms. */
  t: number;
  path: string;
  src: string;
  country: string;
  city: string;
  device: string;
  browser: string;
  /** `view` or the event name. */
  event: string;
}

export interface AnalyticsData {
  version: 1;
  /** `YYYY-MM-DD` → aggregates. */
  days: Record<string, DayStats>;
  recent: RecentHit[];
  updatedAt: number;
}

/** A session as the dashboard sees it: same shape, without the hash. */
export type PublicVisit = Omit<Visit, "id">;

/** What the admin dashboard receives: the same data minus visitor hashes. */
export type PublicAnalytics = Omit<AnalyticsData, "days"> & {
  days: Record<string, Omit<DayStats, "ids" | "visits"> & { visits: PublicVisit[] }>;
};

/** One recorded hit, already enriched by `lib/analytics-server.ts`. */
export interface Hit {
  /** `view` counts as a page view; `event` only increments its named counter. */
  kind: "view" | "event";
  /** Event name when `kind === "event"` (e.g. `cv:en`). */
  name?: string;
  path: string;
  src: string;
  country: string;
  city: string;
  device: string;
  browser: string;
  /** Daily, salted visitor hash. */
  visitorId: string;
  /** Seconds spent on `path`, reported when the visitor leaves it. */
  seconds?: number;
  /** Deepest scroll percentage reached on `path`. */
  depth?: number;
}
