"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  motion,
  useInView,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
} from "framer-motion";
import {
  type CardImage,
  type Lang,
  type ResumeData,
  type StoryLink,
  type StoryMilestone,
  findExperiencePosition,
  milestoneDate,
  milestoneEntry,
  milestoneImages,
  milestoneLinks,
  storyImageRadius,
  storyOf,
} from "@/lib/resume-content";
import { framingStyle } from "@/lib/image-framing";
import { slugify } from "@/lib/slug";
import SiteHeader from "@/components/SiteHeader";
import ImageLightbox from "@/components/ImageLightbox";
import ViewToggle from "@/components/ViewToggle";
import { BlockMarkdown, InlineMarkdown } from "@/components/RichText";
import { trackEvent } from "@/components/SiteAnalytics";

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
 * alternating sides, each one facing its own year across the rail. From `md` up
 * a milestone's pictures *are* its mark on the rail — small, cropped to the
 * shape chosen in the admin, and opening full size when clicked; a milestone
 * with no picture keeps a plain dot. A phone has neither the room for two
 * columns nor for a 64px gutter, so there the rail moves to the left edge with
 * its dot and the pictures sit beside the milestone's title instead.
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

/**
 * How many circles the stack draws before it starts counting instead. Three is
 * what the channel between the two columns can hold: any wider and the stack
 * would climb over the cards on either side of the rail.
 */
const STACKED_IMAGES = 3;

/**
 * A milestone's pictures as one mark: a stack of circles (or squares — the
 * shape is chosen once for the whole page), overlapping the way a row of
 * avatars does, the first one on top. Each opens the full picture, and a fourth
 * and beyond are folded into a "+N" on the last one.
 *
 * Rendered twice per milestone — on the rail from `md` up, beside the title
 * below it — and only ever one of the two is displayed, so a screen reader
 * meets a single set of buttons.
 */
function MilestoneImages({
  images,
  radius,
  label,
  lang,
  passed,
  onOpen,
  className = "",
}: {
  images: CardImage[];
  radius: string;
  /** What these pictures are of, for the button's accessible name. */
  label: string;
  lang: Lang;
  /** Has the rail reached this milestone? Until it has, the mark is unlit. */
  passed: boolean;
  onOpen: (index: number) => void;
  className?: string;
}) {
  const shown = images.slice(0, STACKED_IMAGES);
  const rest = images.length - shown.length;

  return (
    <div className={`flex items-center ${className}`}>
      {shown.map((image, i) => {
        const last = i === shown.length - 1;
        const counts = rest > 0 && last;
        return (
          <button
            key={`${image.url}-${i}`}
            type="button"
            onClick={() => onOpen(i)}
            aria-label={
              counts
                ? lang === "en"
                  ? `${label} — ${rest + 1} more pictures`
                  : `${label} — ${rest + 1} imágenes más`
                : images.length > 1
                  ? `${label} (${i + 1}/${images.length})`
                  : label
            }
            // The first picture sits on top of the ones behind it, and whichever
            // is hovered comes forward — otherwise the ones underneath could only
            // ever be clicked on the sliver that shows.
            style={{ zIndex: shown.length - i }}
            className={`story-mark relative block size-14 shrink-0 overflow-hidden shadow-sm ring-2 ring-black/10 hover:z-10 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current md:size-16 dark:ring-white/15 ${radius} ${
              passed ? "story-mark-lit" : ""
            } ${i > 0 ? "-ml-6" : ""}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- user-uploaded, backend-agnostic URL */}
            <img
              src={image.url}
              alt=""
              // A long story is a long column of photographs, and all of them
              // are full-size files cropped down to 64px: fetching the ones
              // still far below only slows the ones being looked at.
              loading="lazy"
              decoding="async"
              className="h-full w-full"
              // The thumbnail is where the framing chosen in the admin applies;
              // the window it opens shows the whole picture instead.
              style={framingStyle(image, "cover")}
            />
            {counts && (
              <span
                aria-hidden="true"
                className="absolute inset-0 flex items-center justify-center bg-black/55 text-xs font-semibold text-white"
              >
                +{rest}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * A word set into the rail: the name of a chapter as it opens, and "Today" at
 * the very end, where the line stops.
 *
 * `relative` is not decoration: the rail is absolutely positioned, so a static
 * sibling's background would be painted *under* it and the line would run
 * straight through the words. Positioned and later in the DOM, it wins — and
 * that opaque background is exactly what makes the label read as a break in the
 * line rather than a caption floating over it.
 */
function RailLabel({
  children,
  className = "",
  chapter = false,
}: {
  children: string;
  className?: string;
  /** Marks it as a chapter opening, which the sticky strip above reads. */
  chapter?: boolean;
}) {
  return (
    <div className={`relative pl-9 md:pl-0 md:text-center ${className}`}>
      <span
        {...(chapter ? { "data-chapter": children } : {})}
        className="story-accent inline-block bg-[#f5f5f7] text-[11px] font-semibold uppercase tracking-[0.2em] md:px-6 dark:bg-[#050505]"
      >
        {children}
      </span>
    </div>
  );
}

function MilestoneCard({
  data,
  lang,
  milestone,
  radius,
  passed,
  compact,
  onOpenImage,
}: {
  data: ResumeData;
  lang: Lang;
  milestone: StoryMilestone;
  radius: string;
  passed: boolean;
  compact: boolean;
  onOpenImage: (index: number) => void;
}) {
  const entry = milestoneEntry(milestone, lang);
  const images = milestoneImages(milestone);
  const links = milestoneLinks(milestone)
    .map((link) => resolveLink(data, lang, link))
    .filter((link): link is { label: string; href: string } => link !== null);

  return (
    <article
      id={`milestone-${milestone.id}`}
      className={`scroll-mt-28 rounded-[28px] bg-white shadow-sm ring-1 ring-black/5 transition hover:shadow-md dark:bg-white/10 dark:ring-white/10 ${
        compact ? "px-5 py-4" : "p-6 md:p-7"
      }`}
    >
      {/* The phone's copy of the pictures: above the title rather than beside
          it, because a stack of three leaves barely 130px of a 375px screen for
          a heading. From `md` up they are gone from here altogether — there
          they are the mark on the rail. */}
      {images.length > 0 && !compact && (
        <MilestoneImages
          images={images}
          radius={radius}
          label={entry.title || milestoneDate(milestone, lang)}
          lang={lang}
          passed={passed}
          onOpen={onOpenImage}
          className="mb-4 md:hidden"
        />
      )}
      {entry.title && (
        <h2
          className={`font-semibold tracking-tight ${
            compact ? "text-base md:text-lg" : "text-xl md:text-2xl"
          }`}
        >
          <InlineMarkdown text={entry.title} />
        </h2>
      )}

      {entry.text && !compact && (
        <BlockMarkdown
          text={entry.text}
          className="mt-4 text-[15px] leading-7 text-neutral-600 dark:text-neutral-300"
        />
      )}

      {links.length > 0 && !compact && (
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

/**
 * One stop on the timeline: the chapter label where it opens one, its mark on
 * the rail, its year across the rail from the card, and the card.
 *
 * It watches itself, which is why it is a component of its own: the moment the
 * rail's leading edge reaches this row, its pictures come up out of grey — the
 * line arriving and the photograph lighting are meant to read as one event, not
 * two. The watch latches, exactly as the rail's own high-water mark does, so
 * scrolling back up neither un-draws the line nor un-lives the moment.
 */
function Milestone({
  data,
  lang,
  milestone,
  left,
  last,
  radius,
  compact,
  onView,
}: {
  data: ResumeData;
  lang: Lang;
  milestone: StoryMilestone;
  left: boolean;
  /** The last stop on the timeline, which is what "read to the end" means. */
  last: boolean;
  radius: string;
  compact: boolean;
  onView: (viewing: {
    slides: CardImage[];
    index: number;
    alt: string;
  }) => void;
}) {
  const reduce = useReducedMotion();
  const row = useRef<HTMLDivElement>(null);
  // The detection area is the top 65% of the viewport — the very line the
  // rail's leading edge rides on — so a row counts as reached the moment its
  // top crosses it. Reduced motion has the whole rail drawn from the start, so
  // every mark is lit from the start too.
  const reached = useInView(row, { margin: "0px 0px -35% 0px", once: true });
  const passed = reduce || reached;

  const entry = milestoneEntry(milestone, lang);
  const date = milestoneDate(milestone, lang);
  const images = milestoneImages(milestone);
  const label = entry.title || date;
  const openImage = (index: number) => {
    // Which photographs get opened is worth knowing, and the milestone's id is
    // what names one — /admin/stats turns it back into its title.
    trackEvent(`story:photo:${milestone.id}`);
    onView({ slides: images, index, alt: label });
  };

  // How far down the story a visitor actually gets. Reported off `reached`
  // rather than `passed`: with reduced motion every mark is lit from the start,
  // and "reached" would then mean nothing at all.
  useEffect(() => {
    if (!reached) return;
    if (entry.chapter) trackEvent(`story:chapter:${slugify(entry.chapter)}`);
    if (last) trackEvent("story:end");
    // Fires once per page view — the watch above latches.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reached]);

  return (
    <li>
      {entry.chapter && (
        <RailLabel chapter className="mb-9 md:mb-11">
          {entry.chapter}
        </RailLabel>
      )}
      <div
        ref={row}
        className="relative grid gap-2 pl-9 md:grid-cols-2 md:gap-x-40 md:pl-0"
      >
        {/* The mark on the rail: the pictures themselves wherever there are any
            and there is room for them, and a dot otherwise — which is also what
            a phone always gets. Either way it is unlit until the line arrives. */}
        <span
          aria-hidden="true"
          className={`story-dot story-mark absolute top-1.5 left-0 size-[15px] rounded-full ring-4 ring-[#f5f5f7] md:left-1/2 md:-translate-x-1/2 dark:ring-[#050505] ${
            passed ? "story-mark-lit" : ""
          } ${images.length > 0 && !compact ? "md:hidden" : ""}`}
        />
        {images.length > 0 && !compact && (
          <MilestoneImages
            images={images}
            radius={radius}
            label={label}
            lang={lang}
            passed={passed}
            onOpen={openImage}
            className="absolute top-0 left-1/2 hidden -translate-x-1/2 md:flex"
          />
        )}

        {date && (
          <p
            className={`story-accent text-sm font-semibold tracking-wide md:row-start-1 md:self-start md:pt-0.5 md:text-lg ${
              left
                ? "md:col-start-2 md:text-left"
                : "md:col-start-1 md:text-right"
            }`}
          >
            {date}
          </p>
        )}
        <div
          className={`md:row-start-1 ${left ? "md:col-start-1" : "md:col-start-2"}`}
        >
          <Reveal>
            <MilestoneCard
              data={data}
              lang={lang}
              milestone={milestone}
              radius={radius}
              passed={passed}
              compact={compact}
              onOpenImage={openImage}
            />
          </Reveal>
        </div>
      </div>
    </li>
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
  const radius = storyImageRadius(story.imageShape);

  /** The picture being looked at full size, and which milestone it came from. */
  const [viewing, setViewing] = useState<{
    slides: CardImage[];
    index: number;
    alt: string;
  } | null>(null);
  // The timeline down to dates and titles — a choice the reader makes for this
  // visit, not something the page remembers for them, exactly as the résumé's
  // experience list works.
  const [compact, setCompact] = useState(false);
  /** The chapter being read, for the strip that hangs under the navbar. */
  const [chapter, setChapter] = useState("");

  // The root layout is shared, so keep the document language in sync per locale.
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  // The rail fills in as the timeline is read: a faint track the whole way down
  // with the gradient drawn over it, scaled from the top by how far through the
  // list the reader is. The measure is taken against the list itself rather than
  // the page, so the line is empty at the first milestone and full at the last,
  // whatever sits above and below them. Reduced motion gets the finished line.
  const timeline = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: timeline,
    offset: ["start 65%", "end 65%"],
  });
  // How far the rail has ever been drawn, which is not the same as how far down
  // the reader is now: a picture that has been lit keeps its colour (there is
  // no un-seeing a moment, and a latch is also the only way to keep the two in
  // step — see `Milestone`), so the line must not creep back up either.
  const drawn = useMotionValue(scrollYProgress.get());
  useMotionValueEvent(scrollYProgress, "change", (value) => {
    if (value > drawn.get()) drawn.set(value);
  });

  // Which chapter the reader is inside. Taken from the labels' own positions
  // rather than tracked milestone by milestone, because the answer is simply
  // "the last one above the fold": one pass over a handful of elements, and no
  // coordination between children. The offset the strip hangs at is measured
  // from the header rather than guessed, since that bar wraps on narrow
  // windows — published as a custom property, the way ResumePage publishes the
  // photo hand-off.
  useEffect(() => {
    const root = timeline.current;
    if (!root) return;
    const header = document.querySelector("header");
    let frame = 0;

    const read = () => {
      frame = 0;
      const line = (header?.offsetHeight ?? 64) + 12;
      document.documentElement.style.setProperty(
        "--story-chapter-top",
        `${line}px`,
      );
      const box = root.getBoundingClientRect();
      // Nothing while the timeline is still ahead or already behind: the
      // greeting and the closing line belong to no chapter.
      if (box.bottom < line || box.top > window.innerHeight) {
        setChapter("");
        return;
      }
      let current = "";
      for (const label of root.querySelectorAll<HTMLElement>("[data-chapter]")) {
        if (label.getBoundingClientRect().top <= line) {
          current = label.dataset.chapter ?? "";
        }
      }
      setChapter(current);
    };

    const onScroll = () => {
      frame ||= requestAnimationFrame(read);
    };
    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
      document.documentElement.style.removeProperty("--story-chapter-top");
    };
  }, [milestones, compact]);

  return (
    <main className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f] transition-colors dark:bg-[#050505] dark:text-white">
      <SiteHeader lang={lang} data={data} onStoryPage />

      {/* The chapter you are inside, hanging just under the navbar. A repeat of
          a label already on the page, so it is hidden from screen readers and
          takes no clicks. */}
      {chapter && (
        <div
          aria-hidden="true"
          style={{ top: "var(--story-chapter-top, 4.75rem)" }}
          className="pointer-events-none fixed left-1/2 z-40 -translate-x-1/2 rounded-full border border-black/10 bg-white/85 px-4 py-1.5 shadow-sm backdrop-blur-md dark:border-white/15 dark:bg-black/70"
        >
          <span className="story-accent text-[11px] font-semibold uppercase tracking-[0.18em]">
            {chapter}
          </span>
        </div>
      )}

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
          {/* Only worth offering once the timeline is long enough that skimming
              it is a real wish. */}
          {milestones.length > 3 && (
            <div className="mb-10 flex justify-end md:mb-14">
              <ViewToggle lang={lang} compact={compact} onChange={setCompact} />
            </div>
          )}
          <div ref={timeline} className="relative">
            {/* The track, and the gradient drawn along it. Both fade out at the
                ends rather than stopping on an edge, so the timeline reads as
                continuing past what is on the page. */}
            <span
              aria-hidden="true"
              className="story-rail-track absolute bottom-0 top-0 left-[7px] w-px md:left-1/2"
            />
            <motion.span
              aria-hidden="true"
              style={reduce ? undefined : { scaleY: drawn }}
              className="story-rail-progress absolute bottom-0 top-0 left-[7px] w-px origin-top md:left-1/2"
            />

            <ol className={compact ? "grid gap-6" : "grid gap-12 md:gap-16"}>
              {milestones.map((milestone, i) => (
                <Milestone
                  key={milestone.id}
                  data={data}
                  lang={lang}
                  milestone={milestone}
                  // Milestones fall to alternating sides on a wide screen.
                  left={i % 2 === 0}
                  last={i === milestones.length - 1}
                  radius={radius}
                  compact={compact}
                  onView={setViewing}
                />
              ))}
            </ol>

            {/* Where the line stops. The label's own background is what stops
                it — see RailLabel — so the rail runs into the word and ends
                there instead of trailing off the bottom of the list. */}
            <RailLabel className={compact ? "mt-8" : "mt-12 md:mt-16"}>
              {lang === "en" ? "Today" : "Hoy"}
            </RailLabel>
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

      {viewing && (
        <ImageLightbox
          slides={viewing.slides}
          startIndex={viewing.index}
          alt={viewing.alt}
          lang={lang}
          onClose={() => setViewing(null)}
        />
      )}
    </main>
  );
}
