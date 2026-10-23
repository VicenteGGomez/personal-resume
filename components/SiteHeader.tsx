"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MotionConfig, motion } from "framer-motion";
import { SPRING } from "@/lib/motion";
import {
  type ResumeData,
  type Lang,
  hasMoreContent,
  hasStory,
  initials,
  storyHref,
  storyLabel,
} from "@/lib/resume-content";
import ReadingThread from "@/components/ReadingThread";
import ThemeToggle from "@/components/ThemeToggle";

/**
 * Shared sticky site header. Rendered on the résumé pages (`onResumePage`, where
 * the section links are in-page anchors) and on the secondary pages (where those
 * links jump back to the résumé at `/{lang}#section`).
 *
 * Projects and publications live inside the résumé now, in the "More about me"
 * block, so "More" is just another section anchor — hidden while there is
 * neither a project nor a publication to show. "My story" is the exception: it
 * has a page of its own, so it leads the nav as a link rather than an anchor,
 * and disappears while there is no story to tell.
 */

// The panel and the menu glyph are springs, so a second tap while one is still
// moving turns it around from where it is on screen, carrying its speed.
const PANEL_OPEN = { opacity: 1, y: 0, scale: 1 };
const PANEL_CLOSED = { opacity: 0, y: -10, scale: 0.95 };

export default function SiteHeader({
  lang,
  data,
  onResumePage = false,
  onStoryPage = false,
}: {
  lang: Lang;
  data: ResumeData;
  onResumePage?: boolean;
  /** Marks the story link as the page being read. */
  onStoryPage?: boolean;
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

  /**
   * The nav as one list, so the desktop row and the mobile panel below draw
   * the same links in the same order without repeating the reasoning.
   *
   * `page` says which element to use: a section of the résumé being read is a
   * plain in-page anchor — the router has nothing to do — while anything that
   * navigates goes through `next/link`. "My story" leads, standing in for the
   * "About" link the nav deliberately drops, and is the only one marked
   * `accent`: every other link goes to a section of the page you are on, so
   * this one is written in the story's own gradient — the same colour as the
   * name in its greeting, and as the dot on the hero button and the invitation
   * under "About", which is what makes the three read as one destination.
   */
  const links: Array<{
    key: string;
    label: string;
    href: string;
    page: boolean;
    current: boolean;
    accent: boolean;
  }> = [];
  if (hasStory(data)) {
    links.push({
      key: "story",
      label: storyLabel(data, lang),
      href: storyHref(lang),
      page: true,
      current: onStoryPage,
      accent: true,
    });
  }
  for (const item of navItems) {
    links.push({
      key: item.id,
      label: item.label,
      href: sectionHref(item.id),
      page: !onResumePage,
      current: false,
      accent: false,
    });
  }

  const linkClass =
    "rounded transition hover:text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current dark:hover:text-white";
  const mobileLinkClass =
    "block rounded-2xl px-4 py-3 text-[15px] font-medium text-neutral-700 transition-colors hover:bg-black/5 active:bg-black/10 dark:text-neutral-200 dark:hover:bg-white/10 dark:active:bg-white/15";
  // The gradient is painted through the text, which means the letters
  // themselves are transparent: a hover that changes `color`, and the focus
  // ring drawn in `currentColor`, would both come out invisible. So this link
  // brightens instead of recolouring, and `.story-accent:focus-visible` in
  // globals.css gives the ring a colour of its own.
  const accentLinkClass =
    "story-accent rounded font-semibold transition-opacity hover:opacity-75 focus-visible:outline-2 focus-visible:outline-offset-2";

  return (
    // "user": with reduced motion the movement is dropped and the fades stay.
    <MotionConfig reducedMotion="user" transition={SPRING}>
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
          {links.map((link) =>
            link.page ? (
              <Link
                key={link.key}
                href={link.href}
                aria-current={link.current ? "page" : undefined}
                className={
                  link.accent
                    ? accentLinkClass
                    : `${linkClass} ${
                        link.current
                          ? "font-semibold text-black dark:text-white"
                          : ""
                      }`
                }
              >
                {link.label}
              </Link>
            ) : (
              <a key={link.key} href={link.href} className={linkClass}>
                {link.label}
              </a>
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
              <motion.svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
                className="absolute"
                initial={false}
                animate={
                  menuOpen
                    ? { rotate: 90, scale: 0.75, opacity: 0 }
                    : { rotate: 0, scale: 1, opacity: 1 }
                }
              >
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </motion.svg>
              <motion.svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
                className="absolute"
                initial={false}
                animate={
                  menuOpen
                    ? { rotate: 0, scale: 1, opacity: 1 }
                    : { rotate: -90, scale: 0.75, opacity: 0 }
                }
              >
                <line x1="6" y1="6" x2="18" y2="18" />
                <line x1="6" y1="18" x2="18" y2="6" />
              </motion.svg>
            </span>
          </button>
        </div>
      </div>

      {/* The signature: see ReadingThread. */}
      <ReadingThread />

      {/* A floating card rather than a full-bleed drawer: it hangs just under the
          header, covers ~86% of the width and stays clear of both edges, so the
          page reads as continuing underneath it.

          The panel stays mounted and is moved by a spring rather than by being
          added and removed, which is what lets the closing half of the gesture
          animate at all, and lets either half be turned around mid-flight from
          where the card is on screen. It is faded to nothing rather than
          hidden, so `inert` takes the links out of reach for taps, the tab
          order and assistive tech the moment the panel starts leaving.

          The card is solid rather than the header's blurred glass: the header
          above it already sets `backdrop-blur`, which makes it a backdrop root,
          so a blur here has nothing to sample for the part hanging below the
          header — the page just reads straight through it. The lift comes from
          the shadow and the hairline border instead. */}
      <motion.nav
        ref={panelRef}
        id="mobile-nav"
        inert={!menuOpen}
        initial={false}
        animate={menuOpen ? PANEL_OPEN : PANEL_CLOSED}
        className={`absolute top-full right-4 mt-2 w-[86%] max-w-[22rem] max-h-[calc(100svh-5.5rem)] origin-top-right overflow-y-auto overscroll-contain rounded-3xl border border-black/10 bg-white p-2 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.35)] md:hidden dark:border-white/15 dark:bg-neutral-900 dark:shadow-[0_24px_60px_-20px_rgba(0,0,0,0.9)] ${
          menuOpen ? "" : "pointer-events-none"
        }`}
      >
        <ul className="flex flex-col">
          {links.map((link) => (
            <li key={link.key}>
              {link.page ? (
                <Link
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  aria-current={link.current ? "page" : undefined}
                  className={`${mobileLinkClass} ${
                    link.accent ? "story-accent font-semibold" : ""
                  } ${
                    link.current
                      ? "bg-black/5 font-semibold text-black dark:bg-white/10 dark:text-white"
                      : ""
                  }`}
                >
                  {link.label}
                </Link>
              ) : (
                <a
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className={mobileLinkClass}
                >
                  {link.label}
                </a>
              )}
            </li>
          ))}
        </ul>
      </motion.nav>
    </header>
    </MotionConfig>
  );
}
