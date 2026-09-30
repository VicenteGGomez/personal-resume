import type { Metadata } from "next";
import CvNoticeScreen from "@/components/CvNoticeScreen";

// Always resolve against the latest stored CV.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "CV",
  robots: { index: false, follow: false },
};

export default async function CvPage({
  searchParams,
}: {
  searchParams: Promise<{ src?: string | string[] }>;
}) {
  const { src } = await searchParams;
  return (
    <CvNoticeScreen lang="en" src={typeof src === "string" ? src : undefined} />
  );
}
