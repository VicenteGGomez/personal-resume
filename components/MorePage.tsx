"use client";

import { useEffect } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  type AnchorType,
  type ProjectPost,
  type Publication,
  type ResumeData,
  anchorMatches,
} from "@/lib/resume-content";
import SiteHeader from "@/components/SiteHeader";

/**
 * Combined, English-only "More about me" page. It gathers the two secondary
 * views — Projects and Publications — into a single page so the navbar stays
 * lean: projects first (#projects), then LinkedIn posts (#publications).
 *
 * The publications section keeps the résumé's deep-link behaviour: arriving with
 * `?highlight=<post-id>` scrolls that post into view and pulses it.
 */

// Fixed layout metrics used to pack project groups next to each other (see the
// former ProjectsPage). Each group box is capped to a whole number of card
// columns so a small group sizes to its content and flows beside its neighbours.
const CARD_W = 300; // px — card width on sm+ screens
const CARD_GAP = 16; // px — gap-4 between cards inside a group
const GROUP_PAD = 20; // px — p-5 padding around each group box

function columnsFor(n: number) {
  if (n <= 3) return n;
  if (n === 4) return 2;
  return 3;
}

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

function LinkedInGlyph() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className="shrink-0"
    >
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.35V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.55V9h3.57v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
    </svg>
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

function PublicationCard({
  pub,
  delay,
}: {
  pub: Publication;
  delay: number;
}) {
  const hasLink = pub.url.trim().length > 0;
  const domId = `pub-${pub.id}`;

  const inner = (
    <>
      {pub.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- user-provided, backend-agnostic URL
        <img
          src={pub.imageUrl}
          alt=""
          className="mb-5 aspect-[16/9] w-full rounded-2xl object-cover ring-1 ring-black/5 dark:ring-white/10"
          loading="lazy"
        />
      )}
      {pub.date && <p className="text-sm text-neutral-400">{pub.date}</p>}
      {pub.title && (
        <h3 className="mt-2 text-lg font-semibold leading-snug tracking-tight md:text-xl">
          {pub.title}
        </h3>
      )}
      {pub.excerpt && (
        <p className="mt-3 line-clamp-4 text-sm leading-6 text-neutral-600 dark:text-neutral-300">
          {pub.excerpt}
        </p>
      )}
      {hasLink && (
        <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#0a66c2] dark:text-[#70b5f9]">
          <LinkedInGlyph />
          Read on LinkedIn
          <span aria-hidden="true">↗</span>
        </span>
      )}
    </>
  );

  const cardClass =
    "flex h-full flex-col rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-black/5 transition hover:-translate-y-1 hover:shadow-md dark:bg-white/10 dark:ring-white/10";

  return (
    <Reveal delay={delay}>
      {hasLink ? (
        <a
          id={domId}
          href={pub.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`${cardClass} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0a66c2]`}
        >
          {inner}
        </a>
      ) : (
        <article id={domId} className={cardClass}>
          {inner}
        </article>
      )}
    </Reveal>
  );
}

export default function MorePage({ data }: { data: ResumeData }) {
  const reduce = useReducedMotion();
  const { shared, en } = data;
  const projects = data.projects ?? [];
  const publications = shared.publications ?? [];

  // English-only page; keep the document language in sync with the shared layout.
  useEffect(() => {
    document.documentElement.lang = "en";
  }, []);

  // Deep-link highlight: arriving with ?highlight=<id> scrolls the post into
  // view and pulses it (done as a direct DOM side-effect, not React state).
  useEffect(() => {
    const target = new URLSearchParams(window.location.search).get("highlight");
    if (!target) return;
    const el = document.getElementById(`pub-${target}`);
    if (!el) return;
    const prefersReduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    requestAnimationFrame(() =>
      el.scrollIntoView({
        behavior: prefersReduce ? "auto" : "smooth",
        block: "center",
      }),
    );
    el.classList.add("pub-glow");
    const timer = window.setTimeout(() => el.classList.remove("pub-glow"), 3200);
    return () => window.clearTimeout(timer);
  }, []);

  // Group projects under whatever résumé item they are associated with, in that
  // order, with a trailing "Other" bucket for anything unmatched.
  type Target = { type: AnchorType; id: string; role: string; place: string };
  const targets: Target[] = [
    ...(en.experiences ?? []).map((e) => ({
      type: "experience" as const,
      id: e.id,
      role: e.role,
      place: e.place,
    })),
    ...(en.education ?? []).map((e) => ({
      type: "education" as const,
      id: e.id,
      role: e.title,
      place: e.place,
    })),
    ...(en.awards ?? []).map((a) => ({
      type: "award" as const,
      id: a.id,
      role: a.title,
      place: a.place,
    })),
    ...(en.courses ?? []).map((c) => ({
      type: "course" as const,
      id: c.id,
      role: c.title,
      place: c.place,
    })),
    ...(en.volunteering ?? []).map((v) => ({
      type: "volunteering" as const,
      id: v.id,
      role: v.title,
      place: v.place,
    })),
  ];

  const groups = targets
    .map((t) => ({
      t,
      items: projects.filter((p) => anchorMatches(p, t.type, t.id)),
    }))
    .filter((g) => g.items.length > 0);
  const assigned = new Set(groups.flatMap((g) => g.items.map((p) => p.slug)));
  const ungrouped = projects.filter((p) => !assigned.has(p.slug));

  type Cluster = {
    key: string;
    role: string;
    place: string;
    items: ProjectPost[];
  };
  const clusters: Cluster[] = [
    ...groups.map((g) => ({
      key: `${g.t.type}:${g.t.id}`,
      role: g.t.role,
      place: g.t.place,
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

  const hasProjects = projects.length > 0;
  const hasPublications = publications.length > 0;

  return (
    <main className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f] transition-colors dark:bg-[#050505] dark:text-white">
      <SiteHeader lang="en" data={data} />

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-5 pb-10 pt-16 text-center md:pb-14 md:pt-24">
        <Reveal>
          <h1 className="mx-auto max-w-4xl text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
            More about me
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-neutral-600 dark:text-neutral-300">
            A closer look at my projects and writing — selected work from across
            my roles, plus a few LinkedIn posts.
          </p>
        </Reveal>
      </section>

      {/* Projects */}
      {hasProjects && (
        <section id="projects" className="scroll-mt-24">
          <div className="mx-auto max-w-6xl px-5 pb-6 pt-6 md:pb-10">
            <Reveal>
              <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
                Projects
              </h2>
            </Reveal>
            <div className="mt-8 flex flex-wrap items-start justify-start gap-x-5 gap-y-6">
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
                      <h3 className="text-lg font-semibold tracking-tight md:text-xl">
                        {cluster.role}
                      </h3>
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
          </div>
        </section>
      )}

      {/* Publications */}
      {hasPublications && (
        <section id="publications" className="scroll-mt-24">
          <div className="mx-auto max-w-6xl px-5 pb-20 pt-6">
            <Reveal>
              <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
                {en.publicationsTitle}
              </h2>
              {en.publicationsIntro && (
                <p className="mt-3 max-w-2xl text-base text-neutral-600 dark:text-neutral-300">
                  {en.publicationsIntro}
                </p>
              )}
            </Reveal>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {publications.map((pub, i) => (
                <PublicationCard
                  key={`${pub.title}-${i}`}
                  pub={pub}
                  delay={(i % 3) * 0.05}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Empty state — no projects and no posts yet */}
      {!hasProjects && !hasPublications && (
        <section className="mx-auto max-w-6xl px-5 pb-20">
          <Reveal>
            <div className="mx-auto max-w-xl rounded-[28px] bg-white p-10 text-center shadow-sm ring-1 ring-black/5 dark:bg-white/10 dark:ring-white/10">
              <p className="text-base text-neutral-500 dark:text-neutral-400">
                New work is coming soon.
              </p>
            </div>
          </Reveal>
        </section>
      )}

      <footer className="px-5 py-8 text-center text-xs text-neutral-400">
        © {new Date().getFullYear()} {shared.name}. All rights reserved.
      </footer>
    </main>
  );
}
