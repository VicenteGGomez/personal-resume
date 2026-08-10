"use client";

import { useState } from "react";
import Link from "next/link";
import type { ResumeData, Lang } from "@/lib/resume-content";

/**
 * Shared sticky site header. Rendered on the résumé pages (`onResumePage`, where
 * the section links are in-page anchors) and on the English-only project pages
 * (where those links jump back to the résumé at `/{lang}#section`).
 *
 * Projects are English-only, so the Projects link always points to
 * `/en/projects`; on the Spanish site it is labelled "(EN)" to make that clear.
 */
export default function SiteHeader({
  lang,
  data,
  onResumePage = false,
}: {
  lang: Lang;
  data: ResumeData;
  onResumePage?: boolean;
}) {
  const t = lang === "en" ? data.en : data.es;
  const { shared } = data;
  const [menuOpen, setMenuOpen] = useState(false);

  const switchHref = lang === "en" ? "/es" : "/en";
  const switchLabel = lang === "en" ? "ES" : "EN";
  const publicationsHref =
    lang === "en" ? "/en/publications" : "/es/publicaciones";
  const hasPublications = (shared.publications ?? []).length > 0;
  const hasProjects = (data.projects ?? []).length > 0;
  const projectsLabel = lang === "en" ? "Projects" : "Proyectos (EN)";
  const sectionHref = (id: string) => (onResumePage ? `#${id}` : `/${lang}#${id}`);

  const linkClass =
    "rounded transition hover:text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current dark:hover:text-white";
  const mobileLinkClass =
    "block rounded-lg px-2 py-2.5 text-base font-medium text-neutral-700 hover:bg-black/5 dark:text-neutral-200 dark:hover:bg-white/10";

  return (
    <header className="sticky top-0 z-50 border-b border-black/5 bg-white/75 backdrop-blur-2xl dark:border-white/10 dark:bg-black/60">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-4">
        <Link href={`/${lang}`} className="text-sm font-semibold tracking-tight">
          {shared.name}
        </Link>

        <nav className="hidden gap-6 text-sm text-neutral-600 md:flex dark:text-neutral-300">
          {t.nav.map((item) =>
            onResumePage ? (
              <a key={item.id} href={sectionHref(item.id)} className={linkClass}>
                {item.label}
              </a>
            ) : (
              <Link
                key={item.id}
                href={sectionHref(item.id)}
                className={linkClass}
              >
                {item.label}
              </Link>
            ),
          )}
          {hasPublications && (
            <Link href={publicationsHref} className={linkClass}>
              {t.publicationsNav}
            </Link>
          )}
          {hasProjects && (
            <Link href="/en/projects" className={linkClass}>
              {projectsLabel}
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href={switchHref}
            className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold shadow-sm transition hover:scale-[1.03] dark:border-white/15 dark:bg-white/10"
            aria-label={lang === "en" ? "Cambiar a español" : "Switch to English"}
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
                {onResumePage ? (
                  <a
                    href={sectionHref(item.id)}
                    onClick={() => setMenuOpen(false)}
                    className={mobileLinkClass}
                  >
                    {item.label}
                  </a>
                ) : (
                  <Link
                    href={sectionHref(item.id)}
                    onClick={() => setMenuOpen(false)}
                    className={mobileLinkClass}
                  >
                    {item.label}
                  </Link>
                )}
              </li>
            ))}
            {hasPublications && (
              <li>
                <Link
                  href={publicationsHref}
                  onClick={() => setMenuOpen(false)}
                  className={mobileLinkClass}
                >
                  {t.publicationsNav}
                </Link>
              </li>
            )}
            {hasProjects && (
              <li>
                <Link
                  href="/en/projects"
                  onClick={() => setMenuOpen(false)}
                  className={mobileLinkClass}
                >
                  {projectsLabel}
                </Link>
              </li>
            )}
          </ul>
        </nav>
      )}
    </header>
  );
}
