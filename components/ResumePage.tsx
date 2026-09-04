"use client";

import {
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  type AnchorType,
  type Award,
  type Experience,
  type Lang,
  type ProjectPost,
  type Publication,
  type ResumeData,
  anchorMatches,
  experienceRoles,
  experienceSpan,
  hasMoreContent,
} from "@/lib/resume-content";
import {
  RESHARE_TAG,
  SITE_ORIGIN,
  buildShareUrl,
  qrImageUrl,
} from "@/lib/share-links";
import MoreSections from "@/components/MoreSections";
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

function AwardMiniGlyph() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      <circle cx="12" cy="8" r="6" />
      <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
    </svg>
  );
}

/** Subtle, low-emphasis skill tags shown on an experience card. */
function SkillTags({ skills }: { skills?: string }) {
  const tags = (skills ?? "")
    .split(/[,·]/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (tags.length === 0) return null;
  return (
    <div className="mt-4 flex flex-wrap gap-1.5">
      {tags.map((tag, i) => (
        <span
          key={`${tag}-${i}`}
          className="rounded-md bg-black/[0.04] px-2 py-0.5 text-[11px] font-medium text-neutral-500 ring-1 ring-black/5 dark:bg-white/[0.06] dark:text-neutral-400 dark:ring-white/10"
        >
          {tag}
        </span>
      ))}
    </div>
  );
}

/**
 * Chips for the awards, projects, and LinkedIn posts associated with a résumé
 * item. Awards jump to the Awards section; projects open their own page; posts
 * open the "More" page with the post highlighted (they do not jump straight to
 * LinkedIn — that only happens from the "More" page itself).
 */
function AssociatedLinks({
  lang,
  awards = [],
  projects,
  publications,
}: {
  lang: Lang;
  awards?: Award[];
  projects: ProjectPost[];
  publications: Publication[];
}) {
  if (
    awards.length === 0 &&
    projects.length === 0 &&
    publications.length === 0
  )
    return null;
  // Posts live further down this same page, in the "More about me" block; the
  // chip jumps to the card and pulses it rather than going straight to LinkedIn.
  const postFallback = lang === "en" ? "LinkedIn post" : "Publicación";
  const awardFallback = lang === "en" ? "Award" : "Reconocimiento";

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
        {lang === "en" ? "Related" : "Relacionado"}
      </span>
      {awards.map((a) => (
        <a
          key={`award-${a.id}`}
          href="#awards"
          className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-700 transition hover:bg-amber-500/20 dark:bg-amber-400/15 dark:text-amber-300 dark:hover:bg-amber-400/25"
        >
          <AwardMiniGlyph />
          {a.title || awardFallback}
        </a>
      ))}
      {projects.map((p) => (
        <Link
          key={`proj-${p.slug}`}
          href={`/en/projects/${p.slug}`}
          className="inline-flex items-center gap-1 rounded-full bg-black/5 px-3 py-1.5 text-xs font-medium text-neutral-700 transition hover:bg-black/10 dark:bg-white/10 dark:text-neutral-200 dark:hover:bg-white/20"
        >
          {p.title}
          <span aria-hidden="true">→</span>
        </Link>
      ))}
      {publications.map((pub) => (
        <a
          key={`pub-${pub.id}`}
          href={`#pub-${pub.id}`}
          className="inline-flex items-center gap-1.5 rounded-full bg-[#0a66c2]/10 px-3 py-1.5 text-xs font-medium text-[#0a66c2] transition hover:bg-[#0a66c2]/20 dark:bg-[#70b5f9]/15 dark:text-[#70b5f9] dark:hover:bg-[#70b5f9]/25"
        >
          <LinkedInMiniGlyph />
          {pub.title || postFallback}
        </a>
      ))}
    </div>
  );
}

/**
 * One company's card. A single position reads as a plain entry — role, company,
 * dates. Several of them (a promotion, or an internal move) put the company in
 * the heading and list the positions under it, most recent first, each with its
 * own dates, description, skills and related chips.
 */
function ExperienceCard({
  experience,
  associated,
}: {
  experience: Experience;
  associated: (type: AnchorType, id: string) => React.ReactNode;
}) {
  const roles = experienceRoles(experience);
  // Chips pointing at the company itself rather than at one of its positions —
  // only possible on hand-edited content, since every list keeps one role under
  // the experience's own id. Shown at the foot of the card so none is ever lost.
  const companyChips = roles.some((role) => role.id === experience.id)
    ? null
    : associated("experience", experience.id);

  const card =
    "rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-black/5 transition hover:-translate-y-1 hover:shadow-md dark:bg-white/10 dark:ring-white/10";
  const headingRow =
    "flex flex-col justify-between gap-1 md:flex-row md:items-start md:gap-4";
  const dateClass = "shrink-0 text-sm text-neutral-400";

  if (roles.length === 1) {
    const [role] = roles;
    return (
      <article className={card}>
        <div className={headingRow}>
          <div>
            <h3 className="text-lg font-semibold md:text-xl">{role.role}</h3>
            <p className="mt-1 text-sm font-medium text-neutral-500 dark:text-neutral-400">
              {experience.place}
            </p>
          </div>
          <span className={dateClass}>{role.date}</span>
        </div>
        {role.text && (
          <BlockMarkdown
            text={role.text}
            className="mt-4 max-w-3xl text-sm text-neutral-600 dark:text-neutral-300"
          />
        )}
        <SkillTags skills={role.skills} />
        {associated("experience", role.id)}
        {companyChips}
      </article>
    );
  }

  return (
    <article className={card}>
      <div className={headingRow}>
        <h3 className="text-lg font-semibold md:text-xl">{experience.place}</h3>
        <span className={dateClass}>{experienceSpan(experience)}</span>
      </div>
      <ol className="mt-5 grid gap-6 border-l border-black/[0.07] pl-5 dark:border-white/10">
        {roles.map((role) => (
          <li key={role.id} className="relative">
            <span
              aria-hidden="true"
              className="absolute -left-6 top-1.5 size-2 rounded-full bg-neutral-300 dark:bg-white/40"
            />
            <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-start sm:gap-4">
              <p className="font-semibold">{role.role}</p>
              <span className={dateClass}>{role.date}</span>
            </div>
            {role.text && (
              <BlockMarkdown
                text={role.text}
                className="mt-3 max-w-3xl text-sm text-neutral-600 dark:text-neutral-300"
              />
            )}
            <SkillTags skills={role.skills} />
            {associated("experience", role.id)}
          </li>
        ))}
      </ol>
      {companyChips}
    </article>
  );
}

function CertificateGlyph() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      <circle cx="12" cy="8" r="6" />
      <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
    </svg>
  );
}

/**
 * A card for an education / award / course / volunteering entry (they share a
 * shape). `associated` renders the related-links row; `link` is an optional
 * outbound link (e.g. a course certificate).
 */
function TimelineEntryCard({
  item,
  associated,
  link,
}: {
  item: { title: string; place: string; date: string; text: string };
  associated: React.ReactNode;
  link?: { url: string; label: string } | null;
}) {
  return (
    <article className="flex h-full flex-col rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-black/5 dark:bg-white/10 dark:ring-white/10">
      {item.date && <p className="text-sm text-neutral-400">{item.date}</p>}
      {item.title && (
        <h3 className="mt-2 text-lg font-semibold md:text-xl">{item.title}</h3>
      )}
      {item.place && (
        <p className="mt-1 text-sm font-medium text-neutral-500 dark:text-neutral-400">
          {item.place}
        </p>
      )}
      {item.text && (
        <p className="mt-4 text-sm leading-6 text-neutral-600 dark:text-neutral-300">
          <InlineMarkdown text={item.text} />
        </p>
      )}
      {link && link.url && (
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-[#0a66c2] transition hover:underline dark:text-[#70b5f9]"
        >
          <CertificateGlyph />
          {link.label}
          <span aria-hidden="true">↗</span>
        </a>
      )}
      {associated}
    </article>
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

/** `navigator.share` never appears or disappears at runtime — nothing to watch. */
const subscribeNever = () => () => {};

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
  // Client-only capability: `navigator` does not exist while rendering on the
  // server, so the server snapshot is `false` and the client re-reads it after
  // hydration — no setState inside an effect.
  const canShare = useSyncExternalStore(
    subscribeNever,
    () => typeof navigator.share === "function",
    () => false,
  );

  useEffect(() => {
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

/**
 * The "let's talk" card. It is rendered twice — once above the "More about me"
 * block and once below it — so that whichever way a visitor reads the page, the
 * ways to reach out are the last thing they see. Only the first one carries the
 * `#contact` anchor the navbar and the hero button point at.
 */
function ContactCard({
  id,
  lang,
  title,
  text,
  linkedin,
  mailto,
  wa,
  onShare,
}: {
  id: string;
  lang: Lang;
  title: string;
  text: string;
  linkedin: string;
  mailto: string;
  wa: string;
  onShare: () => void;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="mx-auto max-w-6xl px-5 py-14 md:py-16">
        <Reveal>
          <div className="rounded-[36px] bg-black p-7 text-white shadow-xl md:p-12 dark:bg-white dark:text-black">
            <div className="min-w-0">
              <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
                {title}
              </h2>
              <p className="mt-4 max-w-2xl text-neutral-300 dark:text-neutral-600">
                <InlineMarkdown text={text} />
              </p>

              <div className="mt-8 flex flex-row flex-wrap items-center justify-center gap-3 md:justify-start">
                {linkedin && (
                  <a
                    href={linkedin}
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
                  onClick={onShare}
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
  // Tagged so visits arriving from a visitor's re-share are attributable in
  // /admin/stats. The QR below encodes this same URL.
  const shareUrl = buildShareUrl(SITE_ORIGIN, "/en", RESHARE_TAG);
  const [shareOpen, setShareOpen] = useState(false);
  const projects = data.projects ?? [];
  // Publications are shared across languages; awards/courses/volunteering are
  // per-lang and may be absent on content saved before those fields existed.
  const publications = shared.publications ?? [];
  // The second contact card is the closing half of a sandwich: it only earns its
  // place when there is a "More about me" block between the two.
  const hasMore = hasMoreContent(data);
  const awards = t.awards ?? [];
  const courses = t.courses ?? [];
  const volunteering = t.volunteering ?? [];
  const certificateLabel = lang === "en" ? "View certificate" : "Ver certificado";

  // Association helpers: everything a given résumé item points at. Projects hold
  // English-only content but are linked from both languages; posts are shared.
  const awardsFor = (type: AnchorType, id: string) =>
    awards.filter((a) => anchorMatches(a, type, id));
  const projectsFor = (type: AnchorType, id: string) =>
    projects.filter((p) => anchorMatches(p, type, id));
  const pubsFor = (type: AnchorType, id: string) =>
    publications.filter((p) => anchorMatches(p, type, id));
  const associated = (type: AnchorType, id: string) => (
    <AssociatedLinks
      lang={lang}
      awards={awardsFor(type, id)}
      projects={projectsFor(type, id)}
      publications={pubsFor(type, id)}
    />
  );

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
              {t.experiences.map((item, i) => (
                <Reveal key={`${item.id}-${i}`}>
                  <ExperienceCard experience={item} associated={associated} />
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
                  <TimelineEntryCard
                    item={item}
                    associated={associated("education", item.id)}
                  />
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

      {/* Awards & honors */}
      {awards.length > 0 && (
        <section id="awards" className="scroll-mt-24">
          <div className="mx-auto max-w-6xl px-5 py-12">
            <h2 className="mb-8 text-2xl font-semibold tracking-tight md:text-3xl">
              {t.awardsTitle}
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {awards.map((item, i) => (
                <Reveal key={`${item.title}-${i}`}>
                  <TimelineEntryCard
                    item={item}
                    associated={associated("award", item.id)}
                  />
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Additional courses */}
      {courses.length > 0 && (
        <section id="courses" className="scroll-mt-24">
          <div className="mx-auto max-w-6xl px-5 py-12">
            <h2 className="mb-8 text-2xl font-semibold tracking-tight md:text-3xl">
              {t.coursesTitle}
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {courses.map((item, i) => (
                <Reveal key={`${item.title}-${i}`}>
                  <TimelineEntryCard
                    item={item}
                    link={
                      item.certificateUrl
                        ? { url: item.certificateUrl, label: certificateLabel }
                        : null
                    }
                    associated={associated("course", item.id)}
                  />
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Volunteering */}
      {volunteering.length > 0 && (
        <section id="volunteering" className="scroll-mt-24">
          <div className="mx-auto max-w-6xl px-5 py-12">
            <h2 className="mb-8 text-2xl font-semibold tracking-tight md:text-3xl">
              {t.volunteeringTitle}
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {volunteering.map((item, i) => (
                <Reveal key={`${item.title}-${i}`}>
                  <TimelineEntryCard
                    item={item}
                    associated={associated("volunteering", item.id)}
                  />
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Contact, "More about me", then contact again: the two cards wrap the
          extra material so the call to action is never far from the reader. */}
      <ContactCard
        id="contact"
        lang={lang}
        title={t.contactTitle}
        text={t.contactText}
        linkedin={shared.linkedin}
        mailto={mailto}
        wa={wa}
        onShare={() => setShareOpen(true)}
      />

      <MoreSections lang={lang} data={data} />

      {hasMore && (
        <ContactCard
          id="contact-again"
          lang={lang}
          title={t.contactTitle}
          text={t.contactText}
          linkedin={shared.linkedin}
          mailto={mailto}
          wa={wa}
          onShare={() => setShareOpen(true)}
        />
      )}

      <footer className="px-5 py-8 text-center text-xs text-neutral-400">
        © {new Date().getFullYear()} {shared.name}.{" "}
        {lang === "en" ? "All rights reserved." : "Todos los derechos reservados."}
      </footer>

      {shareOpen && (
        <ShareDialog
          lang={lang}
          url={shareUrl}
          qrSrc={qrImageUrl(shareUrl)}
          onClose={() => setShareOpen(false)}
        />
      )}
    </main>
  );
}
