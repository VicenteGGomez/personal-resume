"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { resumeContent, type Lang } from "@/lib/resume-content";

function Reveal({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.65, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

export default function ResumePage({ lang }: { lang: Lang }) {
  const t = resumeContent[lang];

  return (
    <main className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f] transition-colors dark:bg-[#050505] dark:text-white">
      <header className="sticky top-0 z-50 border-b border-black/5 bg-white/75 backdrop-blur-2xl dark:border-white/10 dark:bg-black/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link href={`/${lang}`} className="text-sm font-semibold tracking-tight">
            Vicente G. Gómez
          </Link>

          <nav className="hidden gap-6 text-sm text-neutral-600 dark:text-neutral-300 md:flex">
            {t.nav.map(([id, label]) => (
              <a key={id} href={`#${id}`} className="transition hover:text-black dark:hover:text-white">
                {label}
              </a>
            ))}
          </nav>

          <Link
            href={t.switchHref}
            className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold shadow-sm transition hover:scale-[1.03] dark:border-white/15 dark:bg-white/10"
          >
            {t.switchLabel}
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 pb-20 pt-20 text-center md:pt-28">
        <Reveal>
          <div className="mx-auto mb-6 w-fit rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-medium shadow-sm dark:border-white/15 dark:bg-white/10">
            {t.badge}
          </div>

          <h1 className="mx-auto max-w-4xl text-5xl font-semibold tracking-tight md:text-7xl">
            {t.title}
          </h1>

          <p className="mx-auto mt-6 max-w-3xl text-xl text-neutral-600 dark:text-neutral-300 md:text-2xl">
            {t.subtitle}
          </p>

          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-neutral-500 dark:text-neutral-400">
            {t.description}
          </p>

          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <a
              href={lang === "en" ? "/cv-vicente-gomez-en.pdf" : "/cv-vicente-gomez-es.pdf"}
              className="rounded-full bg-black px-6 py-3 text-sm font-semibold text-white transition hover:scale-[1.03] dark:bg-white dark:text-black"
            >
              {t.primaryCta}
            </a>

            <a
              href="mailto:vicentek@gmx.de"
              className="rounded-full border border-black/10 bg-white px-6 py-3 text-sm font-semibold shadow-sm transition hover:scale-[1.03] dark:border-white/15 dark:bg-white/10"
            >
              {t.secondaryCta}
            </a>
          </div>
        </Reveal>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-5 pb-16 md:grid-cols-4">
        {t.highlights.map(([number, label]) => (
          <Reveal key={label}>
            <div className="h-full rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-black/5 transition hover:-translate-y-1 hover:shadow-md dark:bg-white/10 dark:ring-white/10">
              <p className="text-3xl font-semibold">{number}</p>
              <p className="mt-2 text-sm leading-6 text-neutral-500 dark:text-neutral-400">
                {label}
              </p>
            </div>
          </Reveal>
        ))}
      </section>

      <section id="about" className="scroll-mt-24">
        <div className="mx-auto max-w-6xl px-5 py-12">
          <Reveal>
            <div className="rounded-[32px] bg-white p-8 shadow-sm ring-1 ring-black/5 dark:bg-white/10 dark:ring-white/10 md:p-12">
              <h2 className="text-3xl font-semibold tracking-tight">
                {t.aboutTitle}
              </h2>
              <p className="mt-5 max-w-3xl text-lg leading-8 text-neutral-600 dark:text-neutral-300">
                {t.about}
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      <section id="experience" className="scroll-mt-24">
        <div className="mx-auto max-w-6xl px-5 py-12">
          <h2 className="mb-8 text-3xl font-semibold tracking-tight">
            {t.experienceTitle}
          </h2>

          <div className="grid gap-4">
            {t.experiences.map((item) => (
              <Reveal key={item.role}>
                <article className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-black/5 transition hover:-translate-y-1 hover:shadow-md dark:bg-white/10 dark:ring-white/10">
                  <div className="flex flex-col justify-between gap-2 md:flex-row md:items-start">
                    <div>
                      <h3 className="text-xl font-semibold">{item.role}</h3>
                      <p className="mt-1 text-sm font-medium text-neutral-500 dark:text-neutral-400">
                        {item.place}
                      </p>
                    </div>
                    <span className="text-sm text-neutral-400">{item.date}</span>
                  </div>
                  <p className="mt-4 max-w-3xl text-sm leading-6 text-neutral-600 dark:text-neutral-300">
                    {item.text}
                  </p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="education" className="scroll-mt-24">
        <div className="mx-auto max-w-6xl px-5 py-12">
          <h2 className="mb-8 text-3xl font-semibold tracking-tight">
            {t.educationTitle}
          </h2>

          <div className="grid gap-4 md:grid-cols-2">
            {t.education.map((item) => (
              <Reveal key={item.title}>
                <article className="h-full rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-black/5 dark:bg-white/10 dark:ring-white/10">
                  <p className="text-sm text-neutral-400">{item.date}</p>
                  <h3 className="mt-2 text-xl font-semibold">{item.title}</h3>
                  <p className="mt-1 text-sm font-medium text-neutral-500 dark:text-neutral-400">
                    {item.place}
                  </p>
                  <p className="mt-4 text-sm leading-6 text-neutral-600 dark:text-neutral-300">
                    {item.text}
                  </p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="skills" className="scroll-mt-24">
        <div className="mx-auto max-w-6xl px-5 py-12">
          <h2 className="mb-8 text-3xl font-semibold tracking-tight">
            {t.skillsTitle}
          </h2>

          <div className="grid gap-4 md:grid-cols-3">
            {t.skills.map(([title, text]) => (
              <Reveal key={title}>
                <div className="h-full rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-black/5 dark:bg-white/10 dark:ring-white/10">
                  <h3 className="text-lg font-semibold">{title}</h3>
                  <p className="mt-4 text-sm leading-6 text-neutral-600 dark:text-neutral-300">
                    {text}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="contact" className="scroll-mt-24">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <Reveal>
            <div className="rounded-[36px] bg-black p-8 text-white shadow-xl dark:bg-white dark:text-black md:p-12">
              <h2 className="text-4xl font-semibold tracking-tight">
                {t.contactTitle}
              </h2>
              <p className="mt-4 max-w-2xl text-neutral-300 dark:text-neutral-600">
                {t.contactText}
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a
                  href="mailto:vicentek@gmx.de"
                  className="rounded-full bg-white px-6 py-3 text-center text-sm font-semibold text-black dark:bg-black dark:text-white"
                >
                  Email
                </a>
                <a
                  href="https://www.linkedin.com/in/vicenteggomez"
                  target="_blank"
                  className="rounded-full border border-white/20 px-6 py-3 text-center text-sm font-semibold dark:border-black/20"
                >
                  LinkedIn
                </a>
                <a
                  href="https://wa.me/56920926785"
                  target="_blank"
                  className="rounded-full border border-white/20 px-6 py-3 text-center text-sm font-semibold dark:border-black/20"
                >
                  WhatsApp
                </a>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <footer className="px-5 py-8 text-center text-xs text-neutral-400">
        © {new Date().getFullYear()} Vicente G. Gómez. All rights reserved.
      </footer>
    </main>
  );
}