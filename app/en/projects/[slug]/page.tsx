import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProjectPostView from "@/components/ProjectPostView";
import {
  type ProjectPost,
  type ResumeData,
  findExperiencePosition,
  resolveAnchor,
} from "@/lib/resume-content";
import { renderMarkdown } from "@/lib/markdown";
import { getResumeData } from "@/lib/resume-store";

// Always render with the latest edited content.
export const dynamic = "force-dynamic";

/**
 * The résumé item a project is associated with, resolved to a display label and
 * a link back to the matching section on the English résumé. Works for any
 * anchor kind (experience, education, course, volunteering).
 */
function anchorInfo(
  data: ResumeData,
  project: ProjectPost,
): { label: string; href: string } | null {
  const { type, id } = resolveAnchor(project);
  if (!type || !id) return null;
  const fmt = (title: string, place: string) =>
    place ? `${title} · ${place}` : title;
  const { experiences, education, awards, courses, volunteering } = data.en;
  switch (type) {
    case "experience": {
      // The anchor points at one position, which may be one of several held at
      // the same company (see `experienceRoles`).
      const pos = findExperiencePosition(experiences, id);
      return pos
        ? { label: fmt(pos.role, pos.place), href: "/en#experience" }
        : null;
    }
    case "education": {
      const e = education.find((x) => x.id === id);
      return e ? { label: fmt(e.title, e.place), href: "/en#education" } : null;
    }
    case "award": {
      const a = awards.find((x) => x.id === id);
      return a ? { label: fmt(a.title, a.place), href: "/en#awards" } : null;
    }
    case "course": {
      const c = courses.find((x) => x.id === id);
      return c ? { label: fmt(c.title, c.place), href: "/en#courses" } : null;
    }
    case "volunteering": {
      const v = volunteering.find((x) => x.id === id);
      return v ? { label: fmt(v.title, v.place), href: "/en#volunteering" } : null;
    }
    default:
      return null;
  }
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
      anchor={anchorInfo(data, project)}
    />
  );
}
