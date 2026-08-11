"use client";

import { useEffect } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import type { ProjectPost, ResumeData } from "@/lib/resume-content";
import SiteHeader from "@/components/SiteHeader";

function Reveal({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <>{children}</>;
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, ease: "easeOut", delay }}
    >
      {children}
    </motion.div>
  );
}

function BriefcaseGlyph() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

export default function ProjectPostView({
  data,
  project,
  bodyHtml,
  experienceLabel,
}: {
  data: ResumeData;
  project: ProjectPost;
  bodyHtml: string;
  experienceLabel: string | null;
}) {
  const { shared } = data;
  // Content saved before the gallery field existed has no `gallery` key (reads
  // are not normalized — see getResumeData), so default it to keep this safe.
  const gallery = project.gallery ?? [];

  // English-only page; keep the document language in sync with the shared layout.
  useEffect(() => {
    document.documentElement.lang = "en";
  }, []);

  return (
    <main className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f] transition-colors dark:bg-[#050505] dark:text-white">
      <SiteHeader lang="en" data={data} />

      <article className="mx-auto max-w-3xl px-5 pb-20 pt-12 md:pt-16">
        <Reveal>
          {project.date && <p className="text-sm text-neutral-400">{project.date}</p>}
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">
            {project.title || "Untitled project"}
          </h1>

          {experienceLabel && (
            <Link
              href="/en#experience"
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-black/5 px-3.5 py-1.5 text-sm font-medium text-neutral-700 transition hover:bg-black/10 dark:bg-white/10 dark:text-neutral-200 dark:hover:bg-white/20"
            >
              <BriefcaseGlyph />
              {experienceLabel}
            </Link>
          )}

          {project.summary && (
            <p className="mt-6 text-lg leading-8 text-neutral-600 dark:text-neutral-300">
              {project.summary}
            </p>
          )}
        </Reveal>

        {project.coverImage && (
          <Reveal delay={0.05}>
            {/* eslint-disable-next-line @next/next/no-img-element -- user-provided, backend-agnostic URL */}
            <img
              src={project.coverImage}
              alt=""
              className={`mt-8 aspect-[16/9] w-full rounded-3xl ring-1 ring-black/5 dark:ring-white/10 ${
                project.coverFit === "cover"
                  ? "object-cover"
                  : "bg-neutral-50 object-contain dark:bg-white/5"
              }`}
            />
          </Reveal>
        )}

        {bodyHtml && (
          <Reveal delay={0.05}>
            <div
              className="markdown mt-10 text-base text-neutral-700 dark:text-neutral-200"
              // Sanitized server-side by renderMarkdown (escapes HTML, filters URLs).
              dangerouslySetInnerHTML={{ __html: bodyHtml }}
            />
          </Reveal>
        )}

        {gallery.length > 0 && (
          <Reveal delay={0.05}>
            <div className="mt-10 grid gap-8">
              {gallery.map((img, i) => (
                <figure key={i}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- user-provided, backend-agnostic URL */}
                  <img
                    src={img.url}
                    alt={img.caption || ""}
                    // Scale down to the column width but never crop or upscale past
                    // the image's natural size — "fit by size", no cropping.
                    className="mx-auto max-w-full rounded-2xl ring-1 ring-black/5 dark:ring-white/10"
                    loading="lazy"
                  />
                  {img.caption && (
                    <figcaption className="mt-3 text-center text-sm text-neutral-500 dark:text-neutral-400">
                      {img.caption}
                    </figcaption>
                  )}
                </figure>
              ))}
            </div>
          </Reveal>
        )}

        {project.links.length > 0 && (
          <Reveal delay={0.05}>
            <div className="mt-10 border-t border-black/10 pt-6 dark:border-white/10">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                Links
              </h2>
              <ul className="mt-3 grid gap-2">
                {project.links.map((link, i) => (
                  <li key={i}>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 font-medium text-[#0a66c2] hover:underline dark:text-[#70b5f9]"
                    >
                      {link.label || link.url}
                      <span aria-hidden="true">↗</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        )}

        <div className="mt-12">
          <Link
            href="/en/projects"
            className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-600 transition hover:text-black dark:text-neutral-300 dark:hover:text-white"
          >
            <span aria-hidden="true">←</span>
            All projects
          </Link>
        </div>
      </article>

      <footer className="px-5 py-8 text-center text-xs text-neutral-400">
        © {new Date().getFullYear()} {shared.name}. All rights reserved.
      </footer>
    </main>
  );
}
