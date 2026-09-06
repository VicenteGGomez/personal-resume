import type { Metadata } from "next";
import StoryPage from "@/components/StoryPage";
import { getResumeData } from "@/lib/resume-store";
import { storyLabel, storyOf } from "@/lib/resume-content";

// Always render with the latest edited content.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const data = await getResumeData();
  const story = storyOf(data).en;
  const title = story.metaTitle || storyLabel(data, "en");
  return {
    // Not absolute: the root layout's "%s | Vicente G. Gómez" template is
    // exactly what this page wants — "My story | Vicente G. Gómez".
    title,
    description: story.metaDescription,
    alternates: {
      canonical: "/en/story",
      languages: { en: "/en/story", es: "/es/historia" },
    },
    openGraph: {
      title,
      description: story.metaDescription,
      url: "/en/story",
      locale: "en_US",
      images: data.shared.photoUrl ? [{ url: data.shared.photoUrl }] : undefined,
    },
  };
}

export default async function EnglishStoryPage() {
  const data = await getResumeData();
  return <StoryPage lang="en" data={data} />;
}
