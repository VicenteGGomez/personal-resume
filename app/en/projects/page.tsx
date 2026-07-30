import type { Metadata } from "next";
import ProjectsPage from "@/components/ProjectsPage";
import { getResumeData } from "@/lib/resume-store";

// Always render with the latest edited content.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { shared } = await getResumeData();
  const title = "Projects";
  const description = `Selected work from across the roles and experiences of ${shared.name}.`;
  return {
    title,
    description,
    alternates: { canonical: "/en/projects" },
    openGraph: {
      title: `${title} · ${shared.name}`,
      description,
      url: "/en/projects",
      locale: "en_US",
      images: shared.photoUrl ? [{ url: shared.photoUrl }] : undefined,
    },
  };
}

export default async function EnglishProjectsPage() {
  const data = await getResumeData();
  return <ProjectsPage data={data} />;
}
