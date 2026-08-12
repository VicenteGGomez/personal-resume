/**
 * Shapes shared by the analytics writer (`lib/analytics-store.ts`, server only)
 * and the admin dashboard (`components/StatsDashboard.tsx`, a client component).
 * Kept in their own module so the client bundle never pulls in `server-only`.
 */

/** Day buckets are cut at midnight in this timezone. Change it if you move. */
export const DAY_TIMEZONE = "Europe/Madrid";

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

/** What the admin dashboard receives: the same data minus visitor hashes. */
export type PublicAnalytics = Omit<AnalyticsData, "days"> & {
  days: Record<string, Omit<DayStats, "ids">>;
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
}
