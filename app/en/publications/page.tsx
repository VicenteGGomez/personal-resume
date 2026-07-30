import type { Metadata } from "next";
import PublicationsPage from "@/components/PublicationsPage";
import { getResumeData } from "@/lib/resume-store";

// Always render with the latest edited content.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { en, shared } = await getResumeData();
  return {
    title: en.publicationsTitle,
    description: en.publicationsIntro,
    alternates: {
      canonical: "/en/publications",
      languages: { en: "/en/publications", es: "/es/publicaciones" },
    },
    openGraph: {
      title: `${en.publicationsTitle} · ${shared.name}`,
      description: en.publicationsIntro,
      url: "/en/publications",
      locale: "en_US",
      images: shared.photoUrl ? [{ url: shared.photoUrl }] : undefined,
    },
  };
}

export default async function EnglishPublicationsPage() {
  const data = await getResumeData();
  return <PublicationsPage lang="en" data={data} />;
}
