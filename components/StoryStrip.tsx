"use client";

import Link from "next/link";
import {
  type Lang,
  type ResumeData,
  milestoneDate,
  milestoneImages,
  storyHref,
  storyImageRadius,
  storyOf,
} from "@/lib/resume-content";
import { framingStyle } from "@/lib/image-framing";

/**
 * The invitation into "My story", as a handful of its own photographs.
 *
 * A line of text saying the story exists is easy to skip; the faces and places
 * behind the CV are not. So where there are pictures on the timeline this shows
 * the first few with their years, cut to the same shape the story cuts them to,
 * and the whole strip is the link. Until there is a single photograph it is the
 * plain invitation instead — a strip of nothing would say less than a sentence.
 */

/** As many as sit comfortably in the "About" card without becoming a gallery. */
const MAX = 6;

export default function StoryStrip({
  lang,
  data,
}: {
  lang: Lang;
  data: ResumeData;
}) {
  const story = storyOf(data);
  const radius = storyImageRadius(story.imageShape);
  const stops = story.milestones
    .map((milestone) => ({
      id: milestone.id,
      date: milestoneDate(milestone, lang),
      image: milestoneImages(milestone)[0],
    }))
    .filter((stop) => stop.image)
    .slice(0, MAX);

  const read = lang === "en" ? "Read my story" : "Leer mi historia";

  if (stops.length === 0) {
    return (
      <Link
        href={storyHref(lang)}
        className="mt-7 inline-flex items-center gap-2 rounded-full border border-black/10 px-4 py-2 text-sm font-semibold transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
      >
        <span aria-hidden="true" className="story-dot size-2 rounded-full" />
        {read}
        <span aria-hidden="true">→</span>
      </Link>
    );
  }

  return (
    <Link
      href={storyHref(lang)}
      className="group mt-7 flex flex-col gap-4 rounded-3xl border border-black/10 p-4 transition hover:bg-black/[0.03] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current sm:flex-row sm:items-center sm:justify-between dark:border-white/15 dark:hover:bg-white/[0.06]"
    >
      {/* Narrow screens scroll it sideways rather than dropping stops: which
          moments are in the strip is the point of it. */}
      <span className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1 sm:mx-0 sm:overflow-visible sm:px-0 sm:pb-0">
        {stops.map((stop) => (
          <span key={stop.id} className="flex shrink-0 flex-col items-center gap-1.5">
            <span
              className={`block size-12 overflow-hidden ring-2 ring-black/10 transition group-hover:scale-105 motion-reduce:transition-none md:size-14 dark:ring-white/15 ${radius}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- user-uploaded, backend-agnostic URL */}
              <img
                src={stop.image!.url}
                alt=""
                loading="lazy"
                decoding="async"
                className="h-full w-full"
                style={framingStyle(stop.image!, "cover")}
              />
            </span>
            {stop.date && (
              <span className="story-accent text-[11px] font-semibold tracking-wide">
                {stop.date}
              </span>
            )}
          </span>
        ))}
      </span>
      <span className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold">
        {read}
        <span aria-hidden="true" className="transition group-hover:translate-x-0.5">
          →
        </span>
      </span>
    </Link>
  );
}
