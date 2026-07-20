import type { Metadata } from "next";
import ResumePage from "@/components/ResumePage";
import { getResumeData } from "@/lib/resume-store";

// Always render with the latest edited content.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const data = await getResumeData();
  const { en, shared } = data;
  return {
    title: en.metaTitle,
    description: en.metaDescription,
    alternates: {
      canonical: "/en",
      languages: { en: "/en", es: "/es" },
    },
    openGraph: {
      title: en.metaTitle,
      description: en.metaDescription,
      url: "/en",
      locale: "en_US",
      images: shared.photoUrl ? [{ url: shared.photoUrl }] : undefined,
    },
  };
}

export default async function EnglishPage() {
  const data = await getResumeData();
  return <ResumePage lang="en" data={data} />;
}
