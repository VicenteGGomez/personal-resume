import type { Metadata } from "next";
import AdminLogin from "@/components/AdminLogin";
import ShareLinks, { type VisitsByTag } from "@/components/ShareLinks";
import { getAnalytics, recentDayKeys } from "@/lib/analytics-store";
import { getSession } from "@/lib/auth";
import { getSourceTags } from "@/lib/source-tags-store";

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
  const [analytics, tags] = await Promise.all([getAnalytics(), getSourceTags()]);
  const last30 = new Set(recentDayKeys(30));
  const visits: VisitsByTag = { totals: {}, recent: {} };
  for (const [day, stats] of Object.entries(analytics.days)) {
    for (const [source, count] of Object.entries(stats.sources ?? {})) {
      // Links made in /qr with a context (`qr-feria`) are still QR shares.
      const tag = source.startsWith("qr-") ? "qr" : source;
      visits.totals[tag] = (visits.totals[tag] ?? 0) + count;
      if (last30.has(day)) visits.recent[tag] = (visits.recent[tag] ?? 0) + count;
    }
  }

  return <ShareLinks visits={visits} email={session.email} tags={tags} />;
}
