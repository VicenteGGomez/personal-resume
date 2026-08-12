import type { Metadata } from "next";
import AdminLogin from "@/components/AdminLogin";
import StatsDashboard, { type RecentRow } from "@/components/StatsDashboard";
import { getAnalytics, recentDayKeys } from "@/lib/analytics-store";
import { DAY_TIMEZONE } from "@/lib/analytics-types";
import { getSession } from "@/lib/auth";
import { storageMode } from "@/lib/resume-store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Métricas",
  robots: { index: false, follow: false },
};

/** Longest range the dashboard offers (90 days) plus its comparison window. */
const HISTORY_DAYS = 180;

export default async function StatsPage() {
  const session = await getSession();
  if (!session) {
    return <AdminLogin />;
  }

  const analytics = await getAnalytics();

  // Timestamps are formatted here so the client renders exactly what the server
  // rendered (no locale/ICU drift between Node and the browser).
  const formatter = new Intl.DateTimeFormat("es-ES", {
    timeZone: DAY_TIMEZONE,
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  const recent: RecentRow[] = analytics.recent.map((hit) => ({
    ...hit,
    when: formatter.format(new Date(hit.t)),
  }));

  return (
    <StatsDashboard
      analytics={analytics}
      dayKeys={recentDayKeys(HISTORY_DAYS)}
      recent={recent}
      updatedAt={
        analytics.updatedAt ? formatter.format(new Date(analytics.updatedAt)) : ""
      }
      email={session.email}
      mode={storageMode()}
    />
  );
}
