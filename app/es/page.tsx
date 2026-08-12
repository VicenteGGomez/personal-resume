import type { Metadata } from "next";
import ResumePage from "@/components/ResumePage";
import { getResumeData } from "@/lib/resume-store";

// Always render with the latest edited content.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const data = await getResumeData();
  const { es, shared } = data;
  return {
    // Absoluto para que la plantilla "%s | Vicente G. Gómez" del layout raíz no
    // repita el nombre. El `metaTitle` largo se sigue usando para previews.
    title: { absolute: `${shared.name} | CV` },
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
