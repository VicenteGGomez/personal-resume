import { DAY_TIMEZONE } from "@/lib/analytics-types";
import type { Lang, SharedContent } from "@/lib/resume-content";

/**
 * When a CV was last declared current. The stored stamp wins; without one
 * (content saved before stamps existed) the upload's own filename still says
 * when it went up — `saveCv` names files `cv-<epoch ms>.pdf`. A CV with
 * neither, like the seed's bundled PDF, has no known date.
 */
export function cvUpdatedAt(url: string, stamp: string | undefined): Date | null {
  if (!url) return null;
  if (stamp) {
    const date = new Date(stamp);
    if (!Number.isNaN(date.getTime())) return date;
  }
  const match = /\/cv-(\d{13})\.pdf$/.exec(url);
  return match ? new Date(Number(match[1])) : null;
}

/** "September 2026" / "septiembre de 2026", in the site's own time zone. */
export function formatCvMonth(date: Date, lang: Lang): string {
  return new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "es-ES", {
    month: "long",
    year: "numeric",
    timeZone: DAY_TIMEZONE,
  }).format(date);
}

/** Year and month as one comparable number, so "newer" means a later month. */
function monthIndex(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    month: "numeric",
    year: "numeric",
    timeZone: DAY_TIMEZONE,
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return get("year") * 12 + get("month");
}

/** What the notice in front of /cv or /cv-es has to say. */
export type CvNoticeInfo =
  | { kind: "plain"; month: string }
  /** /cv-es while the English PDF stands in for the Spanish one. */
  | { kind: "english-only"; month: string }
  /** /cv-es when the English CV is from a later month than the Spanish one. */
  | { kind: "english-newer"; month: string; englishMonth: string };

/** `null` when there is no date to tell, and the PDF should just open. */
export function cvNoticeInfo(shared: SharedContent, lang: Lang): CvNoticeInfo | null {
  const en = cvUpdatedAt(shared.cvEn, shared.cvEnUpdatedAt);
  if (lang === "en") {
    return en ? { kind: "plain", month: formatCvMonth(en, "en") } : null;
  }
  if (shared.cvEsUseEn) {
    return en ? { kind: "english-only", month: formatCvMonth(en, "es") } : null;
  }
  const es = cvUpdatedAt(shared.cvEs, shared.cvEsUpdatedAt);
  if (!es) return null;
  const month = formatCvMonth(es, "es");
  if (en && monthIndex(en) > monthIndex(es)) {
    return { kind: "english-newer", month, englishMonth: formatCvMonth(en, "es") };
  }
  return { kind: "plain", month };
}
