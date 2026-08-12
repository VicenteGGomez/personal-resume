import type { Metadata } from "next";
import AdminLogin from "@/components/AdminLogin";
import ShareLinks, { type VisitsByTag } from "@/components/ShareLinks";
import { getAnalytics, recentDayKeys } from "@/lib/analytics-store";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Compartir",
  robots: { index: false, follow: false },
};

export default async function SharePage() {
  const session = await getSession();
  if (!session) {
    return <AdminLogin />;
  }

  // How many visits each `?src=` tag has actually brought, so the panel shows
  // which channels are worth repeating.
  const analytics = await getAnalytics();
  const last30 = new Set(recentDayKeys(30));
  const visits: VisitsByTag = { totals: {}, recent: {} };
  for (const [day, stats] of Object.entries(analytics.days)) {
    for (const [tag, count] of Object.entries(stats.sources ?? {})) {
      visits.totals[tag] = (visits.totals[tag] ?? 0) + count;
      if (last30.has(day)) visits.recent[tag] = (visits.recent[tag] ?? 0) + count;
    }
  }

  return <ShareLinks visits={visits} email={session.email} />;
}
