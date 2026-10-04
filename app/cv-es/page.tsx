import type { Metadata } from "next";
import CvNoticeScreen from "@/components/CvNoticeScreen";

// Always resolve against the latest stored CV.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "CV (español)",
  robots: { index: false, follow: false },
};

// The `?src=` tag is read by the page itself, which reports the open (see
// components/CvNotice.tsx).
export default function CvPage() {
  return <CvNoticeScreen lang="es" />;
}
