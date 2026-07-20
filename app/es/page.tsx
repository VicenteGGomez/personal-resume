import type { Metadata } from "next";
import ResumePage from "@/components/ResumePage";
import { getResumeData } from "@/lib/resume-store";

// Always render with the latest edited content.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const data = await getResumeData();
  const { es, shared } = data;
  return {
    title: es.metaTitle,
    description: es.metaDescription,
    alternates: {
      canonical: "/es",
      languages: { en: "/en", es: "/es" },
    },
    openGraph: {
      title: es.metaTitle,
      description: es.metaDescription,
      url: "/es",
      locale: "es_CL",
      images: shared.photoUrl ? [{ url: shared.photoUrl }] : undefined,
    },
  };
}

export default async function SpanishPage() {
  const data = await getResumeData();
  return <ResumePage lang="es" data={data} />;
}
