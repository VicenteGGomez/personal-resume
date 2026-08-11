"use client";

import { useEffect } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import type { ProjectPost, ResumeData } from "@/lib/resume-content";
import SiteHeader from "@/components/SiteHeader";

// Fixed layout metrics used to pack experience groups next to each other.
// Each group box is capped to a whole number of card columns so a group with
// one or two projects sizes to its content and flows beside its neighbours
// instead of stretching across a full-width row.
const CARD_W = 300; // px — card width on sm+ screens
const CARD_GAP = 16; // px — gap-4 between cards inside a group
const GROUP_PAD = 20; // px — p-5 padding around each group box

/** How many card columns a group of `n` projects lays out in. */
function columnsFor(n: number) {
  if (n <= 3) return n; // 1–3 → a single row
  if (n === 4) return 2; // 4 → a tidy 2×2 rather than 3 + 1
  return 3; // 5+ → 3 per row
}

/** Max width (incl. padding) that caps a group to `columnsFor(n)` columns. */
function groupMaxWidth(n: number) {
  const cols = columnsFor(n);
  return cols * CARD_W + (cols - 1) * CARD_GAP + GROUP_PAD * 2;
}

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

function ProjectCard({ project }: { project: ProjectPost }) {
  return (
    <Link
      href={`/en/projects/${project.slug}`}
      className="flex h-full w-full shrink-0 flex-col rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-black/5 transition hover:-translate-y-1 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black sm:w-[300px] dark:bg-white/10 dark:ring-white/10 dark:focus-visible:outline-white"
    >
      {project.coverImage && (
        // eslint-disable-next-line @next/next/no-img-element -- user-provided, backend-agnostic URL
        <img
          src={project.coverImage}
          alt=""
          className={`mb-5 aspect-[16/9] w-full rounded-2xl ring-1 ring-black/5 dark:ring-white/10 ${
            project.coverFit === "cover"
              ? "object-cover"
              : "bg-neutral-50 object-contain dark:bg-white/5"
          }`}
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
  );
}

export default function ProjectsPage({ data }: { data: ResumeData }) {
  const reduce = useReducedMotion();
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

  // Flatten into content-sized "clusters" (one per experience, plus a trailing
  // "Other" bucket) that flow next to each other and wrap, so small groups pack
  // beside their neighbours instead of each taking a full-width row.
  type Cluster = {
    key: string;
    role: string;
    place: string;
    items: ProjectPost[];
  };
  const clusters: Cluster[] = [
    ...groups.map((g) => ({
      key: g.exp.id,
      role: g.exp.role,
      place: g.exp.place,
      items: g.items,
    })),
    ...(ungrouped.length > 0
      ? [
          {
            key: "__other",
            role: groups.length > 0 ? "Other projects" : "",
            place: "",
            items: ungrouped,
          },
        ]
      : []),
  ];

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
          <div className="flex flex-wrap items-start justify-start gap-x-5 gap-y-6">
            {clusters.map((cluster, index) => (
              <motion.div
                key={cluster.key}
                className="box-border w-full rounded-[32px] bg-black/[0.03] p-5 ring-1 ring-black/[0.05] sm:w-auto dark:bg-white/[0.03] dark:ring-white/[0.06]"
                style={{ maxWidth: groupMaxWidth(cluster.items.length) }}
                {...(reduce
                  ? {}
                  : {
                      initial: { opacity: 0, y: 24 },
                      whileInView: { opacity: 1, y: 0 },
                      viewport: { once: true, margin: "-80px" },
                      transition: {
                        duration: 0.6,
                        ease: "easeOut",
                        delay: Math.min(index, 4) * 0.05,
                      },
                    })}
              >
                {cluster.role && (
                  <div className="mb-4 px-1">
                    <h2 className="text-lg font-semibold tracking-tight md:text-xl">
                      {cluster.role}
                    </h2>
                    {cluster.place && (
                      <p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
                        {cluster.place}
                      </p>
                    )}
                  </div>
                )}
                <div className="flex w-full flex-wrap justify-center gap-4">
                  {cluster.items.map((project) => (
                    <ProjectCard key={project.slug} project={project} />
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      <footer className="px-5 py-8 text-center text-xs text-neutral-400">
        © {new Date().getFullYear()} {shared.name}. All rights reserved.
      </footer>
    </main>
  );
}
