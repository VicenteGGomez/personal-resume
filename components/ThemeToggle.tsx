"use client";

import { useEffect, useRef, useState } from "react";
import { animate, motion, useMotionValue, useReducedMotion } from "framer-motion";
import { SPRING } from "@/lib/motion";
import type { Lang } from "@/lib/resume-content";
import { THEME_COOKIE, THEME_COOKIE_MAX_AGE, type ThemeMode } from "@/lib/theme";

/**
 * Day/night switch: a sliding pill with a sun on one side and a moon on the
 * other, styled like the other header pills.
 *
 * The knob and both glyphs are positioned purely with the `dark:` variant, so
 * the switch already shows the right side on the very first paint — including
 * under the "system" default, which only CSS can resolve (see
 * `app/globals.css`). A click writes the pick to the theme cookie and flips
 * `data-theme` on <html> in place, so the change is instant and the next server
 * render agrees (see `lib/theme.ts` and `app/layout.tsx`).
 *
 * The knob's resting side is CSS, so it is right before any script runs. A click
 * moves the rest position instantly and the knob's own offset is set to the
 * distance it just "lost", then sprung back to zero: it travels from where it
 * was on screen, even if the last flip is still in flight.
 */

/** Whether the page is currently showing day or night, as rendered. */
function effectiveTheme(): ThemeMode {
  const stamped = document.documentElement.dataset.theme;
  if (stamped === "light" || stamped === "dark") return stamped;
  // "system" (or nothing at all): the device decides, same as the CSS does.
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function SunGlyph({ className }: { className: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
      className={className}
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

function MoonGlyph({ className }: { className: string }) {
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
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  );
}

export default function ThemeToggle({
  lang,
  compact = false,
}: {
  lang: Lang;
  /** Tighter geometry for the admin top bar, whose pills are `text-xs`. */
  compact?: boolean;
}) {
  // Only knowable once mounted: under the "system" default the server cannot
  // tell which side the switch is on. Until then the button is announced
  // without a pressed state, while the visible state is already correct.
  const [night, setNight] = useState<boolean | null>(null);
  const reduce = useReducedMotion();
  const knobRef = useRef<HTMLSpanElement>(null);
  const knobX = useMotionValue(0);

  useEffect(() => {
    const sync = () => setNight(effectiveTheme() === "dark");
    sync();
    // Keeps the announced state honest while the site is following the device.
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  function toggle() {
    const next: ThemeMode = effectiveTheme() === "dark" ? "light" : "dark";
    // The rest position is about to jump by one cell; offset the knob by the
    // same amount the other way so it stays where the eye last saw it.
    const travel = knobRef.current?.offsetWidth ?? 0;
    knobX.set(knobX.get() + (next === "dark" ? -travel : travel));
    if (!reduce) animate(knobX, 0, SPRING);
    else knobX.set(0);
    document.documentElement.dataset.theme = next;
    const secure = window.location.protocol === "https:" ? "; secure" : "";
    document.cookie =
      `${THEME_COOKIE}=${next}; path=/; max-age=${THEME_COOKIE_MAX_AGE}` +
      `; samesite=lax${secure}`;
    setNight(next === "dark");
  }

  // No width of its own: the two glyph cells plus the padding size the pill, so
  // the knob lands exactly on a cell without having to account for the border.
  const box = compact ? "h-7 px-0.5" : "h-10 px-1";
  const cell = compact ? "size-6" : "size-7";
  const knob = compact
    ? "left-0.5 size-6 dark:translate-x-6"
    : "left-1 size-7 dark:translate-x-7";
  const glyph = compact ? "size-3.5" : "size-4";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={night ?? undefined}
      aria-label={lang === "es" ? "Modo noche" : "Night mode"}
      title={
        lang === "es" ? "Cambiar entre día y noche" : "Switch between day and night"
      }
      className={`relative inline-flex shrink-0 items-center rounded-full border border-black/10 bg-white shadow-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current dark:border-white/15 dark:bg-white/10 ${box}`}
    >
      <motion.span
        ref={knobRef}
        aria-hidden="true"
        style={{ x: knobX }}
        className={`absolute inset-y-0 my-auto rounded-full bg-black/[0.07] dark:bg-white/20 ${knob}`}
      />
      <span
        className={`relative flex items-center justify-center text-amber-500 dark:text-neutral-500 ${cell}`}
      >
        <SunGlyph className={glyph} />
      </span>
      <span
        className={`relative flex items-center justify-center text-neutral-400 dark:text-indigo-200 ${cell}`}
      >
        <MoonGlyph className={glyph} />
      </span>
    </button>
  );
}
