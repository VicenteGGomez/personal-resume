"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import type { ResumeData, Lang } from "@/lib/resume-content";

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

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function whatsappHref(value: string): string {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  const digits = value.replace(/\D/g, "");
  return digits ? `https://wa.me/${digits}` : "";
}

function Avatar({ url, alt, name }: { url: string; alt: string; name: string }) {
  const ring =
    "ring-1 ring-black/10 shadow-lg shadow-black/5 dark:ring-white/15";
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- user-uploaded, backend-agnostic URL
      <img
        src={url}
        alt={alt || name}
        width={144}
        height={144}
        loading="eager"
        className={`mx-auto mb-7 size-28 rounded-full object-cover md:size-36 ${ring}`}
      />
    );
  }
  return (
    <div
      aria-hidden="true"
      className={`mx-auto mb-7 flex size-28 items-center justify-center rounded-full bg-gradient-to-br from-neutral-200 to-neutral-100 text-3xl font-semibold text-neutral-500 md:size-36 md:text-4xl dark:from-white/15 dark:to-white/5 dark:text-neutral-300 ${ring}`}
    >
      {initials(name)}
    </div>
  );
}

export default function ResumePage({
  lang,
  data,
}: {
  lang: Lang;
  data: ResumeData;
}) {
  const t = lang === "en" ? data.en : data.es;
  const { shared } = data;
  const [menuOpen, setMenuOpen] = useState(false);

  // The root layout is shared, so keep the document language in sync per locale.
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const switchHref = lang === "en" ? "/es" : "/en";
  const switchLabel = lang === "en" ? "ES" : "EN";
  const cvHref = lang === "en" ? shared.cvEn : shared.cvEs;
  const wa = whatsappHref(shared.whatsapp);
  const mailto = shared.email ? `mailto:${shared.email}` : "";

  const personJsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: shared.name,
    jobTitle: t.subtitle,
    description: t.description,
    address: shared.location
      ? { "@type": "PostalAddress", addressLocality: shared.location }
      : undefined,
    email: shared.email || undefined,
    image: shared.photoUrl || undefined,
    url: "https://resume.vicentegomez.cl",
    sameAs: [shared.linkedin].filter(Boolean),
  };

  return (
    <main className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f] transition-colors dark:bg-[#050505] dark:text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
      />

      {/* Skip link for keyboard users */}
      <a
        href="#about"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-black focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white dark:focus:bg-white dark:focus:text-black"
      >
        {lang === "en" ? "Skip to content" : "Saltar al contenido"}
      </a>

      <header className="sticky top-0 z-50 border-b border-black/5 bg-white/75 backdrop-blur-2xl dark:border-white/10 dark:bg-black/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-4">
          <Link
            href={`/${lang}`}
            className="text-sm font-semibold tracking-tight"
          >
            {shared.name}
          </Link>

          <nav className="hidden gap-6 text-sm text-neutral-600 md:flex dark:text-neutral-300">
            {t.nav.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="rounded transition hover:text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current dark:hover:text-white"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href={switchHref}
              className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold shadow-sm transition hover:scale-[1.03] dark:border-white/15 dark:bg-white/10"
              aria-label={
                lang === "en" ? "Cambiar a español" : "Switch to English"
              }
            >
              {switchLabel}
            </Link>

            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
              aria-controls="mobile-nav"
              aria-label={lang === "en" ? "Menu" : "Menú"}
              className="flex size-10 items-center justify-center rounded-full border border-black/10 bg-white text-neutral-700 shadow-sm md:hidden dark:border-white/15 dark:bg-white/10 dark:text-neutral-200"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                {menuOpen ? (
                  <>
                    <line x1="6" y1="6" x2="18" y2="18" />
                    <line x1="6" y1="18" x2="18" y2="6" />
                  </>
                ) : (
                  <>
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                  </>
                )}
              </svg>
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav
            id="mobile-nav"
            className="border-t border-black/5 bg-white/95 px-5 py-3 md:hidden dark:border-white/10 dark:bg-black/90"
          >
            <ul className="flex flex-col">
              {t.nav.map((item) => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    onClick={() => setMenuOpen(false)}
                    className="block rounded-lg px-2 py-2.5 text-base font-medium text-neutral-700 hover:bg-black/5 dark:text-neutral-200 dark:hover:bg-white/10"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-5 pb-16 pt-16 text-center md:pb-20 md:pt-24">
        <Reveal>
          <Avatar url={shared.photoUrl} alt={shared.photoAlt} name={shared.name} />

          {t.badgeEnabled && t.badge && (
            <div className="mx-auto mb-6 w-fit rounded-full border border-emerald-500/20 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 shadow-sm dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300">
              <span className="mr-2 inline-block size-2 rounded-full bg-emerald-500 align-middle dark:bg-emerald-400" />
              {t.badge}
            </div>
          )}

          <h1 className="mx-auto max-w-4xl text-4xl font-semibold tracking-tight sm:text-5xl md:text-7xl">
            {shared.name}
          </h1>

          <p className="mx-auto mt-5 max-w-3xl text-lg text-neutral-600 sm:text-xl md:mt-6 md:text-2xl dark:text-neutral-300">
            {t.subtitle}
          </p>

          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-neutral-500 dark:text-neutral-400">
            {t.description}
          </p>

          {shared.location && (
            <p className="mt-4 text-sm text-neutral-400">
              <svg
                className="mr-1 inline-block align-[-2px]"
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M12 21s-7-6.5-7-11a7 7 0 0 1 14 0c0 4.5-7 11-7 11Z" />
                <circle cx="12" cy="10" r="2.5" />
              </svg>
              {shared.location}
            </p>
          )}

          <div className="mt-9 flex flex-row flex-wrap justify-center gap-3">
            {cvHref && (
              <a
                href={cvHref}
                className="whitespace-nowrap rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:scale-[1.03] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black sm:px-6 sm:py-3 dark:bg-white dark:text-black dark:focus-visible:outline-white"
              >
                {t.primaryCta}
              </a>
            )}
            <a
              href="#contact"
              className="whitespace-nowrap rounded-full border border-black/10 bg-white px-5 py-2.5 text-sm font-semibold shadow-sm transition hover:scale-[1.03] sm:px-6 sm:py-3 dark:border-white/15 dark:bg-white/10"
            >
              {t.secondaryCta}
            </a>
          </div>
        </Reveal>
      </section>

      {/* Highlights */}
      {t.highlights.length > 0 && (
        <section className="mx-auto grid max-w-6xl gap-4 px-5 pb-16 sm:grid-cols-2 md:grid-cols-4">
          {t.highlights.map((h, i) => (
            <Reveal key={`${h.value}-${i}`} delay={i * 0.05}>
              <div className="h-full rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-black/5 transition hover:-translate-y-1 hover:shadow-md dark:bg-white/10 dark:ring-white/10">
                <p className="text-3xl font-semibold">{h.value}</p>
                <p className="mt-2 text-sm leading-6 text-neutral-500 dark:text-neutral-400">
                  {h.label}
                </p>
              </div>
            </Reveal>
          ))}
        </section>
      )}

      {/* About */}
      <section id="about" className="scroll-mt-24">
        <div className="mx-auto max-w-6xl px-5 py-12">
          <Reveal>
            <div className="rounded-[32px] bg-white p-7 shadow-sm ring-1 ring-black/5 md:p-12 dark:bg-white/10 dark:ring-white/10">
              <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
                {t.aboutTitle}
              </h2>
              <p className="mt-5 max-w-3xl text-base leading-8 text-neutral-600 md:text-lg dark:text-neutral-300">
                {t.about}
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Experience */}
      {t.experiences.length > 0 && (
        <section id="experience" className="scroll-mt-24">
          <div className="mx-auto max-w-6xl px-5 py-12">
            <h2 className="mb-8 text-2xl font-semibold tracking-tight md:text-3xl">
              {t.experienceTitle}
            </h2>
            <div className="grid gap-4">
              {t.experiences.map((item, i) => (
                <Reveal key={`${item.role}-${i}`}>
                  <article className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-black/5 transition hover:-translate-y-1 hover:shadow-md dark:bg-white/10 dark:ring-white/10">
                    <div className="flex flex-col justify-between gap-1 md:flex-row md:items-start md:gap-4">
                      <div>
                        <h3 className="text-lg font-semibold md:text-xl">
                          {item.role}
                        </h3>
                        <p className="mt-1 text-sm font-medium text-neutral-500 dark:text-neutral-400">
                          {item.place}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm text-neutral-400">
                        {item.date}
                      </span>
                    </div>
                    {item.text && (
                      <p className="mt-4 max-w-3xl text-sm leading-6 text-neutral-600 dark:text-neutral-300">
                        {item.text}
                      </p>
                    )}
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Education */}
      {t.education.length > 0 && (
        <section id="education" className="scroll-mt-24">
          <div className="mx-auto max-w-6xl px-5 py-12">
            <h2 className="mb-8 text-2xl font-semibold tracking-tight md:text-3xl">
              {t.educationTitle}
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {t.education.map((item, i) => (
                <Reveal key={`${item.title}-${i}`}>
                  <article className="h-full rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-black/5 dark:bg-white/10 dark:ring-white/10">
                    <p className="text-sm text-neutral-400">{item.date}</p>
                    <h3 className="mt-2 text-lg font-semibold md:text-xl">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-sm font-medium text-neutral-500 dark:text-neutral-400">
                      {item.place}
                    </p>
                    {item.text && (
                      <p className="mt-4 text-sm leading-6 text-neutral-600 dark:text-neutral-300">
                        {item.text}
                      </p>
                    )}
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Skills */}
      {t.skills.length > 0 && (
        <section id="skills" className="scroll-mt-24">
          <div className="mx-auto max-w-6xl px-5 py-12">
            <h2 className="mb-8 text-2xl font-semibold tracking-tight md:text-3xl">
              {t.skillsTitle}
            </h2>
            <div className="grid gap-4 md:grid-cols-3">
              {t.skills.map((skill, i) => (
                <Reveal key={`${skill.title}-${i}`} delay={i * 0.05}>
                  <div className="h-full rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-black/5 dark:bg-white/10 dark:ring-white/10">
                    <h3 className="text-lg font-semibold">{skill.title}</h3>
                    <p className="mt-4 text-sm leading-6 text-neutral-600 dark:text-neutral-300">
                      {skill.text}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Contact */}
      <section id="contact" className="scroll-mt-24">
        <div className="mx-auto max-w-6xl px-5 py-16 md:py-20">
          <Reveal>
            <div className="rounded-[36px] bg-black p-7 text-white shadow-xl md:p-12 dark:bg-white dark:text-black">
              <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
                {t.contactTitle}
              </h2>
              <p className="mt-4 max-w-2xl text-neutral-300 dark:text-neutral-600">
                {t.contactText}
              </p>

              <div className="mt-8 flex flex-row flex-wrap gap-3">
                {mailto && (
                  <a
                    href={mailto}
                    className="whitespace-nowrap rounded-full bg-white px-5 py-2.5 text-center text-sm font-semibold text-black transition hover:scale-[1.03] sm:px-6 sm:py-3 dark:bg-black dark:text-white"
                  >
                    Email
                  </a>
                )}
                {shared.linkedin && (
                  <a
                    href={shared.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="whitespace-nowrap rounded-full border border-white/20 px-5 py-2.5 text-center text-sm font-semibold transition hover:bg-white/10 sm:px-6 sm:py-3 dark:border-black/20 dark:hover:bg-black/5"
                  >
                    LinkedIn
                  </a>
                )}
                {wa && (
                  <a
                    href={wa}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="whitespace-nowrap rounded-full border border-white/20 px-5 py-2.5 text-center text-sm font-semibold transition hover:bg-white/10 sm:px-6 sm:py-3 dark:border-black/20 dark:hover:bg-black/5"
                  >
                    WhatsApp
                  </a>
                )}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <footer className="px-5 py-8 text-center text-xs text-neutral-400">
        © {new Date().getFullYear()} {shared.name}.{" "}
        {lang === "en" ? "All rights reserved." : "Todos los derechos reservados."}
      </footer>
    </main>
  );
}
