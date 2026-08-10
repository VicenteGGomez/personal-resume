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

function ProjectCard({
  project,
  delay,
}: {
  project: ProjectPost;
  delay: number;
}) {
  return (
    <Reveal delay={delay}>
      <Link
        href={`/en/projects/${project.slug}`}
        className="flex h-full flex-col rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-black/5 transition hover:-translate-y-1 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black dark:bg-white/10 dark:ring-white/10 dark:focus-visible:outline-white"
      >
        {project.coverImage && (
          // eslint-disable-next-line @next/next/no-img-element -- user-provided, backend-agnostic URL
          <img
            src={project.coverImage}
            alt=""
            className="mb-5 aspect-[16/9] w-full rounded-2xl object-cover ring-1 ring-black/5 dark:ring-white/10"
            loading="lazy"
          />
        )}
        {project.date && <p className="text-sm text-neutral-400">{project.date}</p>}
        {project.title && (
          <h3 className="mt-2 text-lg font-semibold leading-snug tracking-tight md:text-xl">
            {project.title}
          </h3>
        )}
        {project.summary && (
          <p className="mt-3 line-clamp-4 text-sm leading-6 text-neutral-600 dark:text-neutral-300">
            {project.summary}
          </p>
        )}
        <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold">
          Read more
          <span aria-hidden="true">→</span>
        </span>
      </Link>
    </Reveal>
  );
}

export default function ProjectsPage({ data }: { data: ResumeData }) {
  const { shared, en } = data;
  const projects = data.projects ?? [];
  const experiences = en.experiences ?? [];

  // English-only page; keep the document language in sync with the shared layout.
  useEffect(() => {
    document.documentElement.lang = "en";
  }, []);

  // Group projects under their experience, preserving experience order. Anything
  // without a (matching) experience falls into a trailing "Other" group.
  const knownIds = new Set(experiences.map((e) => e.id));
  const groups = experiences
    .map((exp) => ({ exp, items: projects.filter((p) => p.experienceId === exp.id) }))
    .filter((group) => group.items.length > 0);
  const ungrouped = projects.filter(
    (p) => !p.experienceId || !knownIds.has(p.experienceId),
  );

  return (
    <main className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f] transition-colors dark:bg-[#050505] dark:text-white">
      <SiteHeader lang="en" data={data} />

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-5 pb-10 pt-16 text-center md:pb-14 md:pt-24">
        <Reveal>
          <h1 className="mx-auto max-w-4xl text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
            Projects
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-neutral-600 dark:text-neutral-300">
            Selected work from across my roles and experiences.
          </p>
        </Reveal>
      </section>

      {/* Projects */}
      <section className="mx-auto max-w-6xl px-5 pb-20">
        {projects.length === 0 ? (
          <Reveal>
            <div className="mx-auto max-w-xl rounded-[28px] bg-white p-10 text-center shadow-sm ring-1 ring-black/5 dark:bg-white/10 dark:ring-white/10">
              <p className="text-base text-neutral-500 dark:text-neutral-400">
                New projects are coming soon.
              </p>
            </div>
          </Reveal>
        ) : (
          <div className="grid gap-12">
            {groups.map((group) => (
              <div key={group.exp.id}>
                <Reveal>
                  <div className="mb-5">
                    <h2 className="text-xl font-semibold tracking-tight md:text-2xl">
                      {group.exp.role}
                    </h2>
                    {group.exp.place && (
                      <p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
                        {group.exp.place}
                      </p>
                    )}
                  </div>
                </Reveal>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {group.items.map((project, i) => (
                    <ProjectCard
                      key={project.slug}
                      project={project}
                      delay={(i % 3) * 0.05}
                    />
                  ))}
                </div>
              </div>
            ))}

            {ungrouped.length > 0 && (
              <div>
                {groups.length > 0 && (
                  <Reveal>
                    <div className="mb-5">
                      <h2 className="text-xl font-semibold tracking-tight md:text-2xl">
                        Other projects
                      </h2>
                    </div>
                  </Reveal>
                )}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {ungrouped.map((project, i) => (
                    <ProjectCard
                      key={project.slug}
                      project={project}
                      delay={(i % 3) * 0.05}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      <footer className="px-5 py-8 text-center text-xs text-neutral-400">
        © {new Date().getFullYear()} {shared.name}. All rights reserved.
      </footer>
    </main>
  );
}
