import type { Metadata } from "next";
import PublicationsPage from "@/components/PublicationsPage";
import { getResumeData } from "@/lib/resume-store";

// Always render with the latest edited content.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { es, shared } = await getResumeData();
  return {
    title: es.publicationsTitle,
    description: es.publicationsIntro,
    alternates: {
      canonical: "/es/publicaciones",
      languages: { en: "/en/publications", es: "/es/publicaciones" },
    },
    openGraph: {
      title: `${es.publicationsTitle} · ${shared.name}`,
      description: es.publicationsIntro,
      url: "/es/publicaciones",
      locale: "es_CL",
      images: shared.photoUrl ? [{ url: shared.photoUrl }] : undefined,
    },
  };
}

export default async function PublicacionesPage() {
  const data = await getResumeData();
  return <PublicationsPage lang="es" data={data} />;
}
