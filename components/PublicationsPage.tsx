"use client";

import { useEffect } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import type { ResumeData, Lang, Publication } from "@/lib/resume-content";

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

function PublicationCard({
  pub,
  lang,
  delay,
}: {
  pub: Publication;
  lang: Lang;
  delay: number;
}) {
  const cta = lang === "en" ? "Read on LinkedIn" : "Ver en LinkedIn";
  const hasLink = pub.url.trim().length > 0;

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
        <h2 className="mt-2 text-lg font-semibold leading-snug tracking-tight md:text-xl">
          {pub.title}
        </h2>
      )}
      {pub.excerpt && (
        <p className="mt-3 line-clamp-4 text-sm leading-6 text-neutral-600 dark:text-neutral-300">
          {pub.excerpt}
        </p>
      )}
      {hasLink && (
        <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#0a66c2] dark:text-[#70b5f9]">
          <LinkedInGlyph />
          {cta}
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
          href={pub.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`${cardClass} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0a66c2]`}
        >
          {inner}
        </a>
      ) : (
        <article className={cardClass}>{inner}</article>
      )}
    </Reveal>
  );
}

export default function PublicationsPage({
  lang,
  data,
}: {
  lang: Lang;
  data: ResumeData;
}) {
  const t = lang === "en" ? data.en : data.es;
  const { shared } = data;

  // The root layout is shared, so keep the document language in sync per locale.
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const homeHref = `/${lang}`;
  const switchHref = lang === "en" ? "/es/publicaciones" : "/en/publications";
  const switchLabel = lang === "en" ? "ES" : "EN";
  const backLabel = lang === "en" ? "Résumé" : "Currículum";

  const publications = shared.publications ?? [];

  return (
    <main className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f] transition-colors dark:bg-[#050505] dark:text-white">
      <header className="sticky top-0 z-50 border-b border-black/5 bg-white/75 backdrop-blur-2xl dark:border-white/10 dark:bg-black/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-4">
          <Link
            href={homeHref}
            className="flex items-center gap-2 text-sm font-semibold tracking-tight text-neutral-600 transition hover:text-black dark:text-neutral-300 dark:hover:text-white"
          >
            <span aria-hidden="true">←</span>
            {backLabel}
          </Link>

          <Link
            href={switchHref}
            className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold shadow-sm transition hover:scale-[1.03] dark:border-white/15 dark:bg-white/10"
            aria-label={lang === "en" ? "Cambiar a español" : "Switch to English"}
          >
            {switchLabel}
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-5 pb-10 pt-16 text-center md:pb-14 md:pt-24">
        <Reveal>
          <h1 className="mx-auto max-w-4xl text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
            {t.publicationsTitle}
          </h1>
          {t.publicationsIntro && (
            <p className="mx-auto mt-5 max-w-2xl text-lg text-neutral-600 dark:text-neutral-300">
              {t.publicationsIntro}
            </p>
          )}
        </Reveal>
      </section>

      {/* Publications */}
      <section className="mx-auto max-w-6xl px-5 pb-20">
        {publications.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {publications.map((pub, i) => (
              <PublicationCard
                key={`${pub.title}-${i}`}
                pub={pub}
                lang={lang}
                delay={(i % 3) * 0.05}
              />
            ))}
          </div>
        ) : (
          <Reveal>
            <div className="mx-auto max-w-xl rounded-[28px] bg-white p-10 text-center shadow-sm ring-1 ring-black/5 dark:bg-white/10 dark:ring-white/10">
              <p className="text-base text-neutral-500 dark:text-neutral-400">
                {t.publicationsEmpty}
              </p>
              {shared.linkedin && (
                <a
                  href={shared.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#0a66c2] px-5 py-2.5 text-sm font-semibold text-white transition hover:scale-[1.03]"
                >
                  <LinkedInGlyph />
                  {lang === "en" ? "Visit my LinkedIn" : "Visita mi LinkedIn"}
                </a>
              )}
            </div>
          </Reveal>
        )}
      </section>

      <footer className="px-5 py-8 text-center text-xs text-neutral-400">
        © {new Date().getFullYear()} {shared.name}.{" "}
        {lang === "en" ? "All rights reserved." : "Todos los derechos reservados."}
      </footer>
    </main>
  );
}
