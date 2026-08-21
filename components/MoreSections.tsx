"use client";

import { useEffect } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  type AnchorType,
  type Lang,
  type ProjectPost,
  type Publication,
  type ResumeData,
  anchorMatches,
} from "@/lib/resume-content";

/**
 * "More about me" — the projects and LinkedIn posts that used to live on a
 * standalone `/en/more` page. They now sit inside the résumé itself, wrapped
 * between the two contact cards (see ResumePage), so a visitor never has to
 * leave the page to see the work behind the CV.
 *
 * Both languages render it: the section chrome is translated here, while the
 * project posts themselves stay English-only (their own pages live at
 * `/en/projects/<slug>`), which is why the Spanish "read more" label says so.
 *
 * Publications keep their deep-link behaviour: landing on `#pub-<post-id>` —
 * from a résumé "Related" chip or a project page — pulses that card.
 */

// Fixed layout metrics used to pack project groups next to each other. Each
// group box is capped to a whole number of card columns so a small group sizes
// to its content and flows beside its neighbours.
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

function ProjectCard({
  project,
  readMore,
}: {
  project: ProjectPost;
  readMore: string;
}) {
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
        <h4 className="mt-2 text-lg font-semibold leading-snug tracking-tight md:text-xl">
          {project.title}
        </h4>
      )}
      {project.summary && (
        <p className="mt-3 line-clamp-4 text-sm leading-6 text-neutral-600 dark:text-neutral-300">
          {project.summary}
        </p>
      )}
      <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold">
        {readMore}
        <span aria-hidden="true">→</span>
      </span>
    </Link>
  );
}

function PublicationCard({
  pub,
  delay,
  readOn,
}: {
  pub: Publication;
  delay: number;
  readOn: string;
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
        <h4 className="mt-2 text-lg font-semibold leading-snug tracking-tight md:text-xl">
          {pub.title}
        </h4>
      )}
      {pub.excerpt && (
        <p className="mt-3 line-clamp-4 text-sm leading-6 text-neutral-600 dark:text-neutral-300">
          {pub.excerpt}
        </p>
      )}
      {hasLink && (
        <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#0a66c2] dark:text-[#70b5f9]">
          <LinkedInGlyph />
          {readOn}
          <span aria-hidden="true">↗</span>
        </span>
      )}
    </>
  );

  const cardClass =
    "flex h-full scroll-mt-24 flex-col rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-black/5 transition hover:-translate-y-1 hover:shadow-md dark:bg-white/10 dark:ring-white/10";

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

const COPY = {
  en: {
    title: "More about me",
    intro:
      "A closer look at the work behind the CV — selected projects from across my roles, plus a few LinkedIn posts.",
    projects: "Projects",
    other: "Other projects",
    readMore: "Read more",
    readOn: "Read on LinkedIn",
  },
  es: {
    title: "Más sobre mí",
    intro:
      "Una mirada al trabajo detrás del CV: proyectos seleccionados de mis distintos roles y algunas publicaciones de LinkedIn.",
    projects: "Proyectos",
    other: "Otros proyectos",
    // Project pages are written in English, so the label says where it leads.
    readMore: "Leer más (EN)",
    readOn: "Leer en LinkedIn",
  },
} as const;

export default function MoreSections({
  lang,
  data,
}: {
  lang: Lang;
  data: ResumeData;
}) {
  const reduce = useReducedMotion();
  const t = lang === "en" ? data.en : data.es;
  const l = COPY[lang];
  const projects = data.projects ?? [];
  const publications = data.shared.publications ?? [];

  // Deep link to a single post: `#pub-<id>` scrolls that card into view and
  // pulses it. Also honours the legacy `?highlight=<id>` links that the old
  // /en/more page handed out. Done as a direct DOM side-effect, not React state.
  useEffect(() => {
    const prefersReduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    let timer = 0;
    const highlight = () => {
      const hash = window.location.hash.replace(/^#/, "");
      const legacy = new URLSearchParams(window.location.search).get(
        "highlight",
      );
      const domId = hash.startsWith("pub-")
        ? hash
        : legacy
          ? `pub-${legacy}`
          : "";
      if (!domId) return;
      const el = document.getElementById(domId);
      if (!el) return;
      requestAnimationFrame(() =>
        el.scrollIntoView({
          behavior: prefersReduce ? "auto" : "smooth",
          block: "center",
        }),
      );
      el.classList.add("pub-glow");
      window.clearTimeout(timer);
      timer = window.setTimeout(() => el.classList.remove("pub-glow"), 3200);
    };
    highlight();
    window.addEventListener("hashchange", highlight);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("hashchange", highlight);
    };
  }, []);

  // Group projects under whatever résumé item they are associated with, in that
  // order, with a trailing "Other" bucket for anything unmatched. The ids are
  // shared across languages, so the current language's labels are used.
  type Target = { type: AnchorType; id: string; role: string; place: string };
  const targets: Target[] = [
    ...(t.experiences ?? []).map((e) => ({
      type: "experience" as const,
      id: e.id,
      role: e.role,
      place: e.place,
    })),
    ...(t.education ?? []).map((e) => ({
      type: "education" as const,
      id: e.id,
      role: e.title,
      place: e.place,
    })),
    ...(t.awards ?? []).map((a) => ({
      type: "award" as const,
      id: a.id,
      role: a.title,
      place: a.place,
    })),
    ...(t.courses ?? []).map((c) => ({
      type: "course" as const,
      id: c.id,
      role: c.title,
      place: c.place,
    })),
    ...(t.volunteering ?? []).map((v) => ({
      type: "volunteering" as const,
      id: v.id,
      role: v.title,
      place: v.place,
    })),
  ];

  const groups = targets
    .map((target) => ({
      target,
      items: projects.filter((p) => anchorMatches(p, target.type, target.id)),
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
      key: `${g.target.type}:${g.target.id}`,
      role: g.target.role,
      place: g.target.place,
      items: g.items,
    })),
    ...(ungrouped.length > 0
      ? [
          {
            key: "__other",
            role: groups.length > 0 ? l.other : "",
            place: "",
            items: ungrouped,
          },
        ]
      : []),
  ];

  const hasProjects = projects.length > 0;
  const hasPublications = publications.length > 0;
  // Nothing to show yet: the résumé simply skips the section (the navbar hides
  // its "More" link under the same condition, see SiteHeader).
  if (!hasProjects && !hasPublications) return null;

  return (
    <section id="more" className="scroll-mt-24">
      <div className="mx-auto max-w-6xl px-5">
        <Reveal>
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
            {l.title}
          </h2>
          <p className="mt-3 max-w-2xl text-base text-neutral-600 dark:text-neutral-300">
            {l.intro}
          </p>
        </Reveal>
      </div>

      {hasProjects && (
        <section id="projects" className="scroll-mt-24">
          <div className="mx-auto max-w-6xl px-5 pt-10">
            <Reveal>
              <h3 className="text-xl font-semibold tracking-tight md:text-2xl">
                {l.projects}
              </h3>
            </Reveal>
            <div className="mt-6 flex flex-wrap items-start justify-start gap-x-5 gap-y-6">
              {clusters.map((cluster, index) => (
                <motion.div
                  key={cluster.key}
                  role={cluster.role ? "group" : undefined}
                  aria-label={
                    cluster.role
                      ? [cluster.role, cluster.place].filter(Boolean).join(" · ")
                      : undefined
                  }
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
                      <p className="text-lg font-semibold tracking-tight md:text-xl">
                        {cluster.role}
                      </p>
                      {cluster.place && (
                        <p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
                          {cluster.place}
                        </p>
                      )}
                    </div>
                  )}
                  <div className="flex w-full flex-wrap justify-center gap-4">
                    {cluster.items.map((project) => (
                      <ProjectCard
                        key={project.slug}
                        project={project}
                        readMore={l.readMore}
                      />
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {hasPublications && (
        <section id="publications" className="scroll-mt-24">
          <div className="mx-auto max-w-6xl px-5 pt-10">
            <Reveal>
              <h3 className="text-xl font-semibold tracking-tight md:text-2xl">
                {t.publicationsTitle}
              </h3>
              {t.publicationsIntro && (
                <p className="mt-3 max-w-2xl text-base text-neutral-600 dark:text-neutral-300">
                  {t.publicationsIntro}
                </p>
              )}
            </Reveal>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {publications.map((pub, i) => (
                <PublicationCard
                  key={`${pub.title}-${i}`}
                  pub={pub}
                  delay={(i % 3) * 0.05}
                  readOn={l.readOn}
                />
              ))}
            </div>
          </div>
        </section>
      )}
    </section>
  );
}
