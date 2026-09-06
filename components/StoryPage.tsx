"use client";

import { useEffect } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  type Lang,
  type ResumeData,
  type StoryLink,
  type StoryMilestone,
  findExperiencePosition,
  milestoneDate,
  milestoneEntry,
  milestoneImages,
  milestoneLinks,
  storyOf,
} from "@/lib/resume-content";
import SiteHeader from "@/components/SiteHeader";
import ImageCarousel from "@/components/ImageCarousel";
import { BlockMarkdown, InlineMarkdown } from "@/components/RichText";

/**
 * "My story" — the long version of the résumé, at `/en/story` and `/es/historia`.
 *
 * The CV answers *what* I have done; this page answers *how I got there*, as a
 * timeline of milestones with their photographs. It is the one part of the site
 * that is bilingual **and** picture-led, which is why a milestone keeps both of
 * its languages in one object: the date, the pictures and the links back to the
 * résumé are the same fact either way (see `StoryMilestone`).
 *
 * The timeline is a rail down the middle with the milestones falling to
 * alternating sides, each one facing its own year across the rail. A phone has
 * no room for two columns, so there the rail moves to the left edge and every
 * milestone stacks under its year — the same markup, re-laid out at `md`.
 */

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

/** A milestone's link to the résumé, resolved into something clickable. */
function resolveLink(
  data: ResumeData,
  lang: Lang,
  link: StoryLink,
): { label: string; href: string } | null {
  const t = data[lang];
  const dashed = (title: string, place: string) =>
    [title, place].filter(Boolean).join(" · ");

  if (link.type === "project") {
    const project = (data.projects ?? []).find((p) => p.slug === link.id);
    // Projects are English-only, so the chip leads to the English page from
    // both résumés — as the "More about me" block does.
    return project
      ? { label: project.title || project.slug, href: `/en/projects/${project.slug}` }
      : null;
  }
  if (link.type === "experience") {
    const pos = findExperiencePosition(t.experiences ?? [], link.id);
    return pos
      ? { label: dashed(pos.role, pos.place), href: `/${lang}#experience` }
      : null;
  }

  // The remaining kinds are all `{ id, title, place }` lists on the language
  // block, and each has a section of the résumé to land on.
  const where: Record<string, { list: Array<{ id: string; title: string; place: string }>; hash: string }> = {
    education: { list: t.education ?? [], hash: "education" },
    award: { list: t.awards ?? [], hash: "awards" },
    course: { list: t.courses ?? [], hash: "courses" },
    volunteering: { list: t.volunteering ?? [], hash: "volunteering" },
  };
  const spec = where[link.type];
  if (!spec) return null;
  const item = spec.list.find((i) => i.id === link.id);
  return item
    ? { label: dashed(item.title, item.place), href: `/${lang}#${spec.hash}` }
    : null;
}

function MilestoneCard({
  data,
  lang,
  milestone,
}: {
  data: ResumeData;
  lang: Lang;
  milestone: StoryMilestone;
}) {
  const entry = milestoneEntry(milestone, lang);
  const images = milestoneImages(milestone);
  const links = milestoneLinks(milestone)
    .map((link) => resolveLink(data, lang, link))
    .filter((link): link is { label: string; href: string } => link !== null);

  return (
    <article
      id={`milestone-${milestone.id}`}
      className="scroll-mt-28 rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-black/5 transition hover:shadow-md md:p-7 dark:bg-white/10 dark:ring-white/10"
    >
      {entry.title && (
        <h2 className="text-xl font-semibold tracking-tight md:text-2xl">
          <InlineMarkdown text={entry.title} />
        </h2>
      )}

      {images.length > 0 && (
        <ImageCarousel
          slides={images}
          alt={entry.title}
          showCaptions
          className={entry.title ? "mt-5" : ""}
          frameClassName="aspect-[4/3] w-full rounded-2xl ring-1 ring-black/5 dark:ring-white/10"
        />
      )}

      {entry.text && (
        <BlockMarkdown
          text={entry.text}
          className="mt-4 text-[15px] leading-7 text-neutral-600 dark:text-neutral-300"
        />
      )}

      {links.length > 0 && (
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
            {lang === "en" ? "In my CV" : "En mi CV"}
          </span>
          {links.map((link) => (
            <Link
              key={`${link.href}-${link.label}`}
              href={link.href}
              className="inline-flex items-center gap-1 rounded-full bg-black/5 px-3 py-1.5 text-xs font-medium text-neutral-700 transition hover:bg-black/10 dark:bg-white/10 dark:text-neutral-200 dark:hover:bg-white/20"
            >
              {link.label}
              <span aria-hidden="true">→</span>
            </Link>
          ))}
        </div>
      )}
    </article>
  );
}

export default function StoryPage({
  lang,
  data,
}: {
  lang: Lang;
  data: ResumeData;
}) {
  const story = storyOf(data);
  const t = story[lang];
  const { shared } = data;
  const milestones = story.milestones;

  // The root layout is shared, so keep the document language in sync per locale.
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return (
    <main className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f] transition-colors dark:bg-[#050505] dark:text-white">
      <SiteHeader lang={lang} data={data} onStoryPage />

      {/* The greeting. Whatever the admin wrote in **bold** comes out in the
          accent gradient — which is how the name is picked out of the line
          without the editor having to know any HTML. */}
      <section className="mx-auto max-w-3xl px-5 pb-4 pt-14 md:pt-20">
        <Reveal>
          <h1 className="story-heading text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
            <InlineMarkdown text={t.heading} />
          </h1>
          {t.intro && (
            <BlockMarkdown
              text={t.intro}
              className="mt-6 text-lg leading-8 text-neutral-600 dark:text-neutral-300"
            />
          )}
        </Reveal>
      </section>

      {milestones.length > 0 && (
        <section className="mx-auto max-w-5xl px-5 py-10 md:py-16">
          <div className="relative">
            {/* The rail. It fades out at both ends rather than stopping on a
                hard edge, so the timeline reads as continuing past what is on
                the page. */}
            <span
              aria-hidden="true"
              className="story-rail absolute bottom-0 top-0 left-[7px] w-px md:left-1/2"
            />

            <ol className="grid gap-12 md:gap-16">
              {milestones.map((milestone, i) => {
                // Milestones fall to alternating sides on a wide screen; the
                // year faces its own card across the rail.
                const left = i % 2 === 0;
                const date = milestoneDate(milestone, lang);
                return (
                  <li
                    key={milestone.id}
                    className="relative grid gap-2 pl-9 md:grid-cols-2 md:gap-x-16 md:pl-0"
                  >
                    <span
                      aria-hidden="true"
                      className="story-dot absolute top-1.5 left-0 size-[15px] rounded-full ring-4 ring-[#f5f5f7] md:left-1/2 md:-translate-x-1/2 dark:ring-[#050505]"
                    />
                    {date && (
                      <p
                        className={`story-accent text-sm font-semibold tracking-wide md:row-start-1 md:self-start md:text-lg ${
                          left
                            ? "md:col-start-2 md:pt-0.5 md:text-left"
                            : "md:col-start-1 md:pt-0.5 md:text-right"
                        }`}
                      >
                        {date}
                      </p>
                    )}
                    <div
                      className={`md:row-start-1 ${
                        left ? "md:col-start-1" : "md:col-start-2"
                      }`}
                    >
                      <Reveal>
                        <MilestoneCard
                          data={data}
                          lang={lang}
                          milestone={milestone}
                        />
                      </Reveal>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-3xl px-5 pb-16">
        {t.outro && (
          <Reveal>
            <BlockMarkdown
              text={t.outro}
              className="text-lg leading-8 text-neutral-600 dark:text-neutral-300"
            />
          </Reveal>
        )}
        <div className="mt-10">
          <Link
            href={`/${lang}`}
            className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-600 transition hover:text-black dark:text-neutral-300 dark:hover:text-white"
          >
            <span aria-hidden="true">←</span>
            {lang === "en" ? "Back to my CV" : "Volver a mi CV"}
          </Link>
        </div>
      </section>

      <footer className="px-5 py-8 text-center text-xs text-neutral-400">
        © {new Date().getFullYear()} {shared.name}.{" "}
        {lang === "en" ? "All rights reserved." : "Todos los derechos reservados."}
      </footer>
    </main>
  );
}
