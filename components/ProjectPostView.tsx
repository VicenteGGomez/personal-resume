"use client";

import { useEffect } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  type ProjectPost,
  type ResumeData,
  anchorMatches,
  projectImages,
} from "@/lib/resume-content";
import SiteHeader from "@/components/SiteHeader";
import ImageCarousel from "@/components/ImageCarousel";

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

function LinkedInMiniGlyph() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className="shrink-0"
    >
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.35V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.55V9h3.57v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
    </svg>
  );
}

export default function ProjectPostView({
  data,
  project,
  bodyHtml,
  anchor,
}: {
  data: ResumeData;
  project: ProjectPost;
  bodyHtml: string;
  anchor: { label: string; href: string } | null;
}) {
  const { shared } = data;
  // Cover first, then the gallery — the same list the card on the résumé shows,
  // so both views carousel through the same pictures. Content saved before the
  // gallery field existed has no `gallery` key (reads are not normalized — see
  // getResumeData); projectImages defaults it.
  const images = projectImages(project);
  // LinkedIn posts associated with this project (a publication anchored to it).
  const relatedPosts = (shared.publications ?? []).filter((p) =>
    anchorMatches(p, "project", project.slug),
  );

  // English-only page; keep the document language in sync with the shared layout.
  useEffect(() => {
    document.documentElement.lang = "en";
  }, []);

  // A project always opens at the top of its page. The router resets the scroll
  // on its own, but that reset can lose to the browser restoring the position
  // the résumé was left at (Safari does this a beat after the navigation), and
  // the visitor lands halfway down the article. Force it instantly — `instant`
  // beats the `scroll-smooth` on <html>, which would otherwise glide the whole
  // way — once on mount and once after the browser has had its turn. Keyed by
  // slug so hopping straight from one project to another counts as an opening.
  useEffect(() => {
    const toTop = () =>
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    toTop();
    const frame = requestAnimationFrame(toTop);
    return () => cancelAnimationFrame(frame);
  }, [project.slug]);

  return (
    <main className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f] transition-colors dark:bg-[#050505] dark:text-white">
      <SiteHeader lang="en" data={data} />

      <article className="mx-auto max-w-3xl px-5 pb-20 pt-12 md:pt-16">
        <Reveal>
          {project.date && <p className="text-sm text-neutral-400">{project.date}</p>}
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">
            {project.title || "Untitled project"}
          </h1>

          {anchor && (
            <Link
              href={anchor.href}
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-black/5 px-3.5 py-1.5 text-sm font-medium text-neutral-700 transition hover:bg-black/10 dark:bg-white/10 dark:text-neutral-200 dark:hover:bg-white/20"
            >
              <BriefcaseGlyph />
              {anchor.label}
            </Link>
          )}

          {project.summary && (
            <p className="mt-6 text-lg leading-8 text-neutral-600 dark:text-neutral-300">
              {project.summary}
            </p>
          )}
        </Reveal>

        {images.length > 0 && (
          <Reveal delay={0.05}>
            <ImageCarousel
              slides={images}
              alt={project.title}
              showCaptions
              className="mt-8"
              frameClassName="aspect-[16/9] w-full rounded-3xl ring-1 ring-black/5 dark:ring-white/10"
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

        {relatedPosts.length > 0 && (
          <Reveal delay={0.05}>
            <div className="mt-10 border-t border-black/10 pt-6 dark:border-white/10">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                Related posts
              </h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {relatedPosts.map((pub) => (
                  <Link
                    key={pub.id}
                    href={`/en#pub-${pub.id}`}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#0a66c2]/10 px-3 py-1.5 text-sm font-medium text-[#0a66c2] transition hover:bg-[#0a66c2]/20 dark:bg-[#70b5f9]/15 dark:text-[#70b5f9] dark:hover:bg-[#70b5f9]/25"
                  >
                    <LinkedInMiniGlyph />
                    {pub.title || "LinkedIn post"}
                  </Link>
                ))}
              </div>
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
            href="/en#projects"
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
