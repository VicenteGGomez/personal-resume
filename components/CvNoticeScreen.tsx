import { headers } from "next/headers";
import { redirect } from "next/navigation";
import CvNotice from "@/components/CvNotice";
import { track } from "@/lib/analytics-server";
import { cvNoticeInfo } from "@/lib/cv-version";
import type { Lang } from "@/lib/resume-content";
import { getResumeData } from "@/lib/resume-store";

/**
 * The page at /cv and /cv-es: counts the open (as the PDF route used to, so
 * the referrer is still the visitor's own), then shows when the CV was last
 * updated before opening it. With no date to tell, it opens the PDF at once.
 *
 * The PDFs are fetched with `?via=notice` so they aren't counted twice.
 */
export default async function CvNoticeScreen({
  lang,
  src,
}: {
  lang: Lang;
  src: string | undefined;
}) {
  const path = lang === "en" ? "/cv" : "/cv-es";
  const requestHeaders = await headers();
  const request = new Request(new URL(path, "https://resume.vicentegomez.cl"), {
    headers: requestHeaders,
  });
  // Awaited rather than deferred with `after`: in a page, `after` can't reach
  // the cookies `track` checks to skip my own visits. It never throws.
  const [{ shared }] = await Promise.all([
    getResumeData(),
    track(request, { kind: "event", name: `cv:${lang}`, path, src }),
  ]);

  const pdfHref = `${path}/pdf?via=notice`;
  const info = cvNoticeInfo(shared, lang);
  if (!info) redirect(pdfHref);

  return (
    <CvNotice
      lang={lang}
      info={info}
      pdfHref={pdfHref}
      englishHref="/cv/pdf?via=notice"
    />
  );
}
