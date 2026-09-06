import type { Metadata } from "next";
import { cookies } from "next/headers";
import AdminLogin from "@/components/AdminLogin";
import StatsDashboard, {
  type RecentRow,
  type VisitEntryRow,
  type VisitRow,
} from "@/components/StatsDashboard";
import { getAnalytics, recentDayKeys } from "@/lib/analytics-store";
import { DAY_TIMEZONE, OPT_OUT_COOKIE } from "@/lib/analytics-types";
import { getSession } from "@/lib/auth";
import { getResumeData, storageMode } from "@/lib/resume-store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Métricas",
  robots: { index: false, follow: false },
};

/** Longest range the dashboard offers (90 days) plus its comparison window. */
const HISTORY_DAYS = 180;
/** Sessions are only stored for a fortnight (see `lib/analytics-store.ts`). */
const VISIT_DAYS = 14;
/** Most visits shown at once, newest first. */
const VISIT_LIMIT = 60;
/** A post's title is only a label here, so long ones are cut short. */
const TITLE_LIMIT = 70;

export default async function StatsPage() {
  const session = await getSession();
  if (!session) {
    return <AdminLogin />;
  }

  const analytics = await getAnalytics();

  // `publication:<id>` events carry the post's id; the dashboard needs its
  // title to name it. A post deleted since the click simply isn't in here.
  const { shared } = await getResumeData();
  const publications: Record<string, string> = {};
  for (const post of shared.publications) {
    if (!post.id || !post.title) continue;
    publications[post.id] =
      post.title.length > TITLE_LIMIT
        ? `${post.title.slice(0, TITLE_LIMIT).trimEnd()}…`
        : post.title;
  }

  // Timestamps are formatted here so the client renders exactly what the server
  // rendered (no locale/ICU drift between Node and the browser).
  const formatter = new Intl.DateTimeFormat("es-ES", {
    timeZone: DAY_TIMEZONE,
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  const clock = new Intl.DateTimeFormat("es-ES", {
    timeZone: DAY_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
  });
  const recent: RecentRow[] = analytics.recent.map((hit) => ({
    ...hit,
    when: formatter.format(new Date(hit.t)),
  }));

  const visitDays = recentDayKeys(VISIT_DAYS);
  const [today, yesterday] = [
    visitDays[visitDays.length - 1],
    visitDays[visitDays.length - 2],
  ];
  const dayLabel = (key: string): string => {
    if (key === today) return "Hoy";
    if (key === yesterday) return "Ayer";
    const [year, month, day] = key.split("-").map(Number);
    return new Intl.DateTimeFormat("es-ES", {
      timeZone: DAY_TIMEZONE,
      day: "numeric",
      month: "short",
      // Midday, so the label can't slip a day when formatting back.
    }).format(new Date(Date.UTC(year, month - 1, day, 12)));
  };

  // Newest day first, and inside it the newest visit first.
  const visits: VisitRow[] = [];
  for (const key of [...visitDays].reverse()) {
    const stored = analytics.days[key]?.visits ?? [];
    for (const visit of [...stored].reverse()) {
      if (visits.length >= VISIT_LIMIT) break;
      const entries: VisitEntryRow[] = [
        ...visit.steps.map((step) => ({
          t: step.t,
          at: clock.format(new Date(step.t)),
          kind: "page" as const,
          value: step.path,
          seconds: step.seconds ?? null,
          depth: step.depth ?? null,
        })),
        ...visit.events.map((event) => ({
          t: event.t,
          at: clock.format(new Date(event.t)),
          kind: "action" as const,
          value: event.name,
          seconds: null,
          depth: null,
        })),
      ].sort((a, b) => a.t - b.t);

      const measured = visit.steps.filter((step) => step.seconds !== undefined);
      visits.push({
        key: `${key}-${visit.visitor}-${visit.startedAt}`,
        dayKey: key,
        day: dayLabel(key),
        visitor: visit.visitor,
        started: clock.format(new Date(visit.startedAt)),
        seconds: measured.reduce((total, step) => total + (step.seconds ?? 0), 0),
        // A page still open (or a beacon the browser dropped) leaves a gap.
        partial: measured.length < visit.steps.length,
        src: visit.src,
        country: visit.country,
        city: visit.city,
        device: visit.device,
        browser: visit.browser,
        entries,
      });
    }
  }

  const optedOut = (await cookies()).has(OPT_OUT_COOKIE);

  return (
    <StatsDashboard
      analytics={analytics}
      dayKeys={recentDayKeys(HISTORY_DAYS)}
      recent={recent}
      visits={visits}
      publications={publications}
      optedOut={optedOut}
      updatedAt={
        analytics.updatedAt ? formatter.format(new Date(analytics.updatedAt)) : ""
      }
      email={session.email}
      mode={storageMode()}
    />
  );
}
