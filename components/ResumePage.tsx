"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import type { ResumeData, Lang } from "@/lib/resume-content";
import SiteHeader from "@/components/SiteHeader";
import { InlineMarkdown, BlockMarkdown } from "@/components/RichText";

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

function QrIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <rect width="5" height="5" x="3" y="3" rx="1" />
      <rect width="5" height="5" x="16" y="3" rx="1" />
      <rect width="5" height="5" x="3" y="16" rx="1" />
      <path d="M21 16h-3a2 2 0 0 0-2 2v3" />
      <path d="M21 21v.01" />
      <path d="M12 7v3a2 2 0 0 1-2 2H7" />
      <path d="M3 12h.01" />
      <path d="M12 3h.01" />
      <path d="M12 16v.01" />
      <path d="M16 12h1" />
      <path d="M21 12v.01" />
      <path d="M12 21v-1" />
    </svg>
  );
}

function ShareDialog({
  lang,
  url,
  qrSrc,
  onClose,
}: {
  lang: Lang;
  url: string;
  qrSrc: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (insecure context / permissions) — leave the URL visible to copy manually.
    }
  }, [url]);

  const nativeShare = useCallback(async () => {
    try {
      await navigator.share({ title: "Vicente Gómez", url });
    } catch {
      // User dismissed the share sheet, or it's unavailable — nothing to do.
    }
  }, [url]);

  const l = {
    title: lang === "en" ? "Share my site" : "Comparte mi sitio",
    subtitle:
      lang === "en"
        ? "Scan the QR code or copy the link"
        : "Escanea el código QR o copia el enlace",
    copy: lang === "en" ? "Copy link" : "Copiar enlace",
    copied: lang === "en" ? "Copied!" : "¡Copiado!",
    share: lang === "en" ? "Share…" : "Compartir…",
    close: lang === "en" ? "Close" : "Cerrar",
    qrAlt: lang === "en" ? "QR code linking to my site" : "Código QR a mi sitio",
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={l.title}
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm rounded-3xl bg-white p-7 text-black shadow-2xl dark:bg-neutral-900 dark:text-white"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={l.close}
          className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-full text-neutral-400 transition hover:bg-black/5 hover:text-black dark:hover:bg-white/10 dark:hover:text-white"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
            className="size-5"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        <h3 className="text-center text-xl font-semibold tracking-tight">{l.title}</h3>
        <p className="mt-1 text-center text-sm text-neutral-500 dark:text-neutral-400">
          {l.subtitle}
        </p>

        <div className="mt-6 flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- static asset in /public */}
          <img
            src={qrSrc}
            alt={l.qrAlt}
            width={224}
            height={224}
            className="size-56 rounded-2xl bg-white p-3 shadow-md ring-1 ring-black/10"
          />
        </div>

        <div className="mt-5 flex items-center rounded-full bg-black/5 px-4 py-2.5 dark:bg-white/10">
          <span className="min-w-0 flex-1 truncate text-sm text-neutral-600 dark:text-neutral-300">
            {url.replace(/^https?:\/\//, "")}
          </span>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={copyLink}
            className="flex-1 rounded-full bg-black px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 dark:bg-white dark:text-black"
          >
            {copied ? l.copied : l.copy}
          </button>
          {canShare && (
            <button
              type="button"
              onClick={nativeShare}
              className="rounded-full border border-black/15 px-4 py-2.5 text-sm font-semibold transition hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
            >
              {l.share}
            </button>
          )}
        </div>
      </div>
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

  // The root layout is shared, so keep the document language in sync per locale.
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  // Point to the stable routes (/cv, /cv-es) which redirect to the current
  // stored PDF. Hide the button only when there's genuinely nothing to serve:
  // for Spanish, that also accounts for the "use English CV" toggle.
  const hasCv =
    lang === "en"
      ? Boolean(shared.cvEn)
      : Boolean(shared.cvEsUseEn ? shared.cvEn : shared.cvEs);
  const cvHref = hasCv ? (lang === "en" ? "/cv" : "/cv-es") : "";
  const wa = whatsappHref(shared.whatsapp);
  const mailto = shared.email ? `mailto:${shared.email}` : "";
  // The QR asset encodes this URL, so the share dialog copies the same link.
  const shareUrl = "https://resume.vicentegomez.cl/en";
  const [shareOpen, setShareOpen] = useState(false);
  const projects = data.projects ?? [];
  // Projects hold English-only content, but they are linked from both languages
  // (the Spanish site links out to the English project pages), so surface the
  // associated-project chips whenever any project exists.
  const hasProjects = projects.length > 0;

  // On laptops (md+) the highlights grid is 4 columns. With fewer than 4 cards
  // that leaves an empty trailing column, so narrow the grid and center it.
  const highlightCount = t.highlights.length;
  const highlightGrid =
    highlightCount >= 4
      ? "max-w-6xl sm:grid-cols-2 md:grid-cols-4"
      : highlightCount === 3
        ? "max-w-6xl sm:grid-cols-2 md:max-w-4xl md:grid-cols-3"
        : highlightCount === 2
          ? "max-w-6xl sm:grid-cols-2 md:max-w-2xl"
          : "max-w-sm";

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

      <SiteHeader lang={lang} data={data} onResumePage />


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
            <InlineMarkdown text={t.subtitle} />
          </p>

          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-neutral-500 dark:text-neutral-400">
            <InlineMarkdown text={t.description} />
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
        <section className={`mx-auto grid gap-4 px-5 pb-16 ${highlightGrid}`}>
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
              <BlockMarkdown
                text={t.about}
                className="mt-5 text-base text-neutral-600 md:text-lg dark:text-neutral-300"
              />
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
              {t.experiences.map((item, i) => {
                const itemProjects = hasProjects
                  ? projects.filter((p) => p.experienceId === item.id)
                  : [];
                return (
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
                        <BlockMarkdown
                          text={item.text}
                          className="mt-4 max-w-3xl text-sm text-neutral-600 dark:text-neutral-300"
                        />
                      )}
                      {itemProjects.length > 0 && (
                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          <span className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                            {lang === "en" ? "Projects" : "Proyectos"}
                          </span>
                          {itemProjects.map((p) => (
                            <Link
                              key={p.slug}
                              href={`/en/projects/${p.slug}`}
                              className="inline-flex items-center gap-1 rounded-full bg-black/5 px-3 py-1.5 text-xs font-medium text-neutral-700 transition hover:bg-black/10 dark:bg-white/10 dark:text-neutral-200 dark:hover:bg-white/20"
                            >
                              {p.title}
                              <span aria-hidden="true">→</span>
                            </Link>
                          ))}
                        </div>
                      )}
                    </article>
                  </Reveal>
                );
              })}
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
                        <InlineMarkdown text={item.text} />
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
                      <InlineMarkdown text={skill.text} />
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
              <div className="min-w-0">
                <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
                  {t.contactTitle}
                </h2>
                <p className="mt-4 max-w-2xl text-neutral-300 dark:text-neutral-600">
                  <InlineMarkdown text={t.contactText} />
                </p>

                <div className="mt-8 flex flex-row flex-wrap items-center justify-center gap-3 md:justify-start">
                  {shared.linkedin && (
                    <a
                      href={shared.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="whitespace-nowrap rounded-full bg-white px-5 py-2.5 text-center text-sm font-semibold text-black transition hover:scale-[1.03] sm:px-6 sm:py-3 dark:bg-black dark:text-white"
                    >
                      LinkedIn
                    </a>
                  )}
                  {mailto && (
                    <a
                      href={mailto}
                      className="whitespace-nowrap rounded-full border border-white/20 px-5 py-2.5 text-center text-sm font-semibold transition hover:bg-white/10 sm:px-6 sm:py-3 dark:border-black/20 dark:hover:bg-black/5"
                    >
                      Email
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
                  <button
                    type="button"
                    onClick={() => setShareOpen(true)}
                    aria-haspopup="dialog"
                    className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-2.5 text-sm font-medium text-neutral-400 transition hover:text-white sm:py-3 dark:text-neutral-500 dark:hover:text-black"
                  >
                    <QrIcon className="size-4" />
                    {lang === "en" ? "Share" : "Compartir"}
                  </button>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <footer className="px-5 py-8 text-center text-xs text-neutral-400">
        © {new Date().getFullYear()} {shared.name}.{" "}
        {lang === "en" ? "All rights reserved." : "Todos los derechos reservados."}
      </footer>

      {shareOpen && (
        <ShareDialog
          lang={lang}
          url={shareUrl}
          qrSrc="/qr-resume.svg"
          onClose={() => setShareOpen(false)}
        />
      )}
    </main>
  );
}
