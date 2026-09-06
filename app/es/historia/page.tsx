import type { Metadata } from "next";
import StoryPage from "@/components/StoryPage";
import { getResumeData } from "@/lib/resume-store";
import { storyLabel, storyOf } from "@/lib/resume-content";

// Siempre con el contenido editado más reciente.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const data = await getResumeData();
  const story = storyOf(data).es;
  const title = story.metaTitle || storyLabel(data, "es");
  return {
    // Sin `absolute`: aquí la plantilla "%s | Vicente G. Gómez" del layout raíz
    // es justo lo que se quiere — "Mi historia | Vicente G. Gómez".
    title,
    description: story.metaDescription,
    alternates: {
      canonical: "/es/historia",
      languages: { en: "/en/story", es: "/es/historia" },
    },
    openGraph: {
      title,
      description: story.metaDescription,
      url: "/es/historia",
      locale: "es_CL",
      images: data.shared.photoUrl ? [{ url: data.shared.photoUrl }] : undefined,
    },
  };
}

export default async function SpanishStoryPage() {
  const data = await getResumeData();
  return <StoryPage lang="es" data={data} />;
}
