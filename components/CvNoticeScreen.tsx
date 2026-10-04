import CvNotice, { CvOpenNow } from "@/components/CvNotice";
import { cvNoticeInfo } from "@/lib/cv-version";
import type { Lang } from "@/lib/resume-content";
import { getResumeData } from "@/lib/resume-store";

/**
 * The page at /cv and /cv-es: shows when the CV was last updated, then opens
 * the PDF. With no date to tell, it opens the PDF at once.
 *
 * The open is counted by the browser (see `components/CvNotice.tsx`), not
 * here: anything that fetches this URL without running the page — link
 * scanners, uptime monitors — would otherwise count as a person. The PDFs are
 * then fetched with `?via=notice`, which tells their route a person was here.
 */
export default async function CvNoticeScreen({ lang }: { lang: Lang }) {
  const path = lang === "en" ? "/cv" : "/cv-es";
  const { shared } = await getResumeData();

  const pdfHref = `${path}/pdf?via=notice`;
  const info = cvNoticeInfo(shared, lang);
  if (!info) return <CvOpenNow lang={lang} pdfHref={pdfHref} />;

  return (
    <CvNotice
      lang={lang}
      info={info}
      pdfHref={pdfHref}
      englishHref="/cv/pdf?via=notice"
    />
  );
}
