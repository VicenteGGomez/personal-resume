"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  type ResumeData,
  type Lang,
  hasMoreContent,
  initials,
} from "@/lib/resume-content";
import ThemeToggle from "@/components/ThemeToggle";

/**
 * Shared sticky site header. Rendered on the résumé pages (`onResumePage`, where
 * the section links are in-page anchors) and on the English-only secondary pages
 * (where those links jump back to the résumé at `/{lang}#section`).
 *
 * Projects and publications live inside the résumé now, in the "More about me"
 * block, so "More" is just another section anchor — hidden while there is
 * neither a project nor a publication to show.
 */

// Soft, decelerating on the way in and a little quicker on the way out, which
// is what makes the panel read as settling into place rather than popping.
const EASE_OPEN = "cubic-bezier(0.22, 1, 0.36, 1)";
const EASE_CLOSE = "cubic-bezier(0.4, 0, 1, 1)";

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
  const panelRef = useRef<HTMLElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Dismiss the mobile panel the way every other floating menu does: a tap
  // anywhere outside it, or Escape. The toggle button is excluded from the
  // outside test — otherwise pointerdown would close the panel and the click
  // that follows would toggle it straight back open. Crossing into the desktop
  // breakpoint closes it too: the panel is only hidden there, not unmounted, so
  // otherwise it would still be sitting open on the way back down.
  useEffect(() => {
    if (!menuOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (buttonRef.current?.contains(target)) return;
      setMenuOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMenuOpen(false);
      buttonRef.current?.focus();
    };
    const desktop = window.matchMedia("(min-width: 768px)");
    const onBreakpoint = () => {
      if (desktop.matches) setMenuOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    desktop.addEventListener("change", onBreakpoint);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      desktop.removeEventListener("change", onBreakpoint);
    };
  }, [menuOpen]);

  // Keep the navbar focused on the sections worth jumping to. "About" and
  // "Skills" still exist as anchored sections on the page — they are just not
  // surfaced as nav links. "Awards" and "More" are dropped while the section
  // they point at has nothing in it, since the résumé skips it too.
  const HIDDEN_NAV_IDS = new Set(["about", "skills"]);
  if ((t.awards ?? []).length === 0) HIDDEN_NAV_IDS.add("awards");
  if (!hasMoreContent(data)) HIDDEN_NAV_IDS.add("more");
  const navItems = t.nav.filter((item) => !HIDDEN_NAV_IDS.has(item.id));

  const switchHref = lang === "en" ? "/es" : "/en";
  const switchLabel = lang === "en" ? "ES" : "EN";
  const sectionHref = (id: string) => (onResumePage ? `#${id}` : `/${lang}#${id}`);

  const linkClass =
    "rounded transition hover:text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current dark:hover:text-white";
  const mobileLinkClass =
    "block rounded-2xl px-4 py-3 text-[15px] font-medium text-neutral-700 transition-colors hover:bg-black/5 active:bg-black/10 dark:text-neutral-200 dark:hover:bg-white/10 dark:active:bg-white/15";

  return (
    <header className="sticky top-0 z-50 border-b border-black/5 bg-white/75 backdrop-blur-2xl dark:border-white/10 dark:bg-black/60">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-4">
        {/* The wordmark is the monogram, not the full name: it leaves the
            navbar room for the photo that arrives from the hero on the way
            down. The name itself stays in the link for screen readers. */}
        <Link
          href={`/${lang}`}
          className="flex items-center text-base font-bold tracking-tight"
        >
          <span className="sr-only">{shared.name}</span>
          <span aria-hidden="true">{initials(shared.name)}</span>
          {onResumePage && shared.photoUrl && (
            <span
              className="nav-photo-slot inline-block shrink-0 overflow-hidden align-middle"
              aria-hidden="true"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- user-uploaded, backend-agnostic URL */}
              <img
                src={shared.photoUrl}
                alt=""
                width={28}
                height={28}
                className="nav-photo size-7 rounded-full object-cover ring-1 ring-black/10 dark:ring-white/15"
              />
            </span>
          )}
        </Link>

        <nav className="hidden gap-6 text-sm text-neutral-600 md:flex dark:text-neutral-300">
          {navItems.map((item) =>
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
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle lang={lang} />

          <Link
            href={switchHref}
            className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold shadow-sm transition hover:scale-[1.03] dark:border-white/15 dark:bg-white/10"
            aria-label={lang === "en" ? "Cambiar a español" : "Switch to English"}
          >
            {switchLabel}
          </Link>

          <button
            ref={buttonRef}
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            aria-label={lang === "en" ? "Menu" : "Menú"}
            className={`flex size-10 items-center justify-center rounded-full border shadow-sm transition-colors md:hidden ${
              menuOpen
                ? "border-black/15 bg-black/5 text-neutral-900 dark:border-white/25 dark:bg-white/20 dark:text-white"
                : "border-black/10 bg-white text-neutral-700 dark:border-white/15 dark:bg-white/10 dark:text-neutral-200"
            }`}
          >
            {/* Both glyphs are stacked and cross-faded through a quarter turn,
                so the bars and the cross trade places instead of snapping. */}
            <span className="relative flex size-[18px] items-center justify-center">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
                className={`absolute transition duration-200 ease-out motion-reduce:transition-none ${
                  menuOpen ? "rotate-90 scale-75 opacity-0" : "opacity-100"
                }`}
              >
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
                className={`absolute transition duration-200 ease-out motion-reduce:transition-none ${
                  menuOpen ? "opacity-100" : "-rotate-90 scale-75 opacity-0"
                }`}
              >
                <line x1="6" y1="6" x2="18" y2="18" />
                <line x1="6" y1="18" x2="18" y2="6" />
              </svg>
            </span>
          </button>
        </div>
      </div>

      {/* A floating card rather than a full-bleed drawer: it hangs just under the
          header, covers ~86% of the width and stays clear of both edges, so the
          page reads as continuing underneath it.

          The panel stays mounted and is animated by transition rather than by
          being added and removed, which is what lets the closing half of the
          gesture animate at all. `visibility` is in the transition list so it
          only flips to hidden once the fade has finished — and `inert` takes the
          links out of reach for taps and for the tab order the moment the panel
          starts leaving, well before that.

          The card is solid rather than the header's blurred glass: the header
          above it already sets `backdrop-blur`, which makes it a backdrop root,
          so a blur here has nothing to sample for the part hanging below the
          header — the page just reads straight through it. The lift comes from
          the shadow and the hairline border instead. */}
      <nav
        ref={panelRef}
        id="mobile-nav"
        inert={!menuOpen}
        style={{
          transitionDuration: menuOpen ? "280ms" : "180ms",
          transitionTimingFunction: menuOpen ? EASE_OPEN : EASE_CLOSE,
        }}
        className={`absolute top-full right-4 mt-2 w-[86%] max-w-[22rem] max-h-[calc(100svh-5.5rem)] origin-top-right overflow-y-auto overscroll-contain rounded-3xl border border-black/10 bg-white p-2 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.35)] transition-[opacity,transform,visibility] md:hidden motion-reduce:transition-none dark:border-white/15 dark:bg-neutral-900 dark:shadow-[0_24px_60px_-20px_rgba(0,0,0,0.9)] ${
          menuOpen
            ? "visible translate-y-0 scale-100 opacity-100"
            : "invisible -translate-y-2.5 scale-95 opacity-0"
        }`}
      >
        <ul className="flex flex-col">
          {navItems.map((item, i) => (
            <li
              key={item.id}
              // The links trail the panel by a beat each, so the card fills in
              // rather than arriving all at once — capped so a longer nav still
              // finishes promptly. Closing drops the delays and they go at once.
              style={{
                transitionDelay: menuOpen
                  ? `${60 + Math.min(i, 5) * 30}ms`
                  : "0ms",
              }}
              className={`transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none ${
                menuOpen ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0"
              }`}
            >
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
        </ul>
      </nav>
    </header>
  );
}
