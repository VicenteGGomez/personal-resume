import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProjectPostView from "@/components/ProjectPostView";
import type { ResumeData } from "@/lib/resume-content";
import { renderMarkdown } from "@/lib/markdown";
import { getResumeData } from "@/lib/resume-store";

// Always render with the latest edited content.
export const dynamic = "force-dynamic";

/** Human-readable "Role · Place" for the experience a project belongs to. */
function experienceLabel(data: ResumeData, experienceId: string): string | null {
  if (!experienceId) return null;
  const exp = data.en.experiences.find((e) => e.id === experienceId);
  if (!exp) return null;
  return exp.place ? `${exp.role} · ${exp.place}` : exp.role;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await getResumeData();
  const project = data.projects.find((p) => p.slug === slug);
  if (!project) return { title: "Project not found", robots: { index: false } };

  const description = project.summary || `A project by ${data.shared.name}.`;
  const image = project.coverImage || data.shared.photoUrl;
  return {
    title: project.title || "Project",
    description,
    alternates: { canonical: `/en/projects/${project.slug}` },
    openGraph: {
      title: `${project.title} · ${data.shared.name}`,
      description,
      url: `/en/projects/${project.slug}`,
      type: "article",
      locale: "en_US",
      images: image ? [{ url: image }] : undefined,
    },
  };
}

export default async function ProjectPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getResumeData();
  const project = data.projects.find((p) => p.slug === slug);
  if (!project) notFound();

  const bodyHtml = renderMarkdown(project.body);
  return (
    <ProjectPostView
      data={data}
      project={project}
      bodyHtml={bodyHtml}
      experienceLabel={experienceLabel(data, project.experienceId)}
    />
  );
}
