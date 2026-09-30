"use client";

import { useEffect, useRef, useState } from "react";
import type { CvNoticeInfo } from "@/lib/cv-version";
import type { Lang } from "@/lib/resume-content";

/** How often the countdown ticks; small enough for the bar to move smoothly. */
const TICK_MS = 100;

/**
 * The short card in front of /cv and /cv-es: when the CV was last updated,
 * then the PDF opens by itself after a visible countdown — or at once, on a
 * button. Leaving uses `location.replace`, so the card never sits in history:
 * Back from the PDF returns to wherever the visitor came from.
 *
 * The countdown only runs while the tab is visible, so a CV opened in a
 * background tab still shows its notice when the visitor gets to it.
 */
export default function CvNotice({
  lang,
  info,
  pdfHref,
  englishHref,
}: {
  lang: Lang;
  info: CvNoticeInfo;
  /** The PDF this route serves; where the countdown ends. */
  pdfHref: string;
  /** The English PDF, offered when it is newer than the Spanish one. */
  englishHref: string;
}) {
  const choice = info.kind === "english-newer";
  // More to read when there is a choice to make, so a little more time.
  const totalMs = choice ? 5000 : 3000;
  const [remaining, setRemaining] = useState(totalMs);
  const [leaving, setLeaving] = useState(false);
  const primary = useRef<HTMLButtonElement>(null);

  const go = (href: string) => {
    setLeaving(true);
    window.location.replace(href);
  };

  useEffect(() => {
    primary.current?.focus();
  }, []);

  useEffect(() => {
    if (leaving) return;
    let left = totalMs;
    const id = window.setInterval(() => {
      if (document.hidden) return;
      left -= TICK_MS;
      setRemaining(left);
      if (left <= 0) {
        window.clearInterval(id);
        setLeaving(true);
        window.location.replace(pdfHref);
      }
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [leaving, totalMs, pdfHref]);

  const seconds = Math.max(0, Math.ceil(remaining / 1000));
  const t = lang === "en" ? EN : ES;

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="cv-notice-title"
        className={`w-full ${choice ? "max-w-md" : "max-w-sm"} overflow-hidden rounded-3xl bg-white shadow-[0_20px_60px_-30px_rgba(0,0,0,0.35)] ring-1 ring-black/5 dark:bg-neutral-900 dark:ring-white/10`}
      >
        <div className="px-7 pb-6 pt-7">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400">
            Curriculum Vitae
          </p>
          <h1 id="cv-notice-title" className="sr-only">
            {t.title}
          </h1>

          {info.kind === "english-newer" ? (
            <dl className="mt-5 grid gap-4">
              <div>
                <dt className="text-sm text-neutral-500 dark:text-neutral-400">
                  {ES.spanishVersion}
                </dt>
                <dd className="mt-0.5 text-xl font-semibold tracking-tight first-letter:uppercase">
                  {info.month}
                </dd>
              </div>
              <div className="border-t border-black/5 pt-4 dark:border-white/10">
                <dt className="text-sm text-neutral-500 dark:text-neutral-400">
                  {ES.englishNewer}
                </dt>
                <dd className="mt-0.5 text-xl font-semibold tracking-tight first-letter:uppercase">
                  {info.englishMonth}
                </dd>
              </div>
            </dl>
          ) : (
            <dl className="mt-5">
              <dt className="text-sm text-neutral-500 dark:text-neutral-400">
                {t.lastUpdated}
              </dt>
              <dd className="mt-0.5 text-2xl font-semibold tracking-tight first-letter:uppercase">
                {info.month}
              </dd>
            </dl>
          )}

          {info.kind === "english-only" && (
            <p className="mt-4 text-sm leading-6 text-neutral-500 dark:text-neutral-400">
              {ES.englishOnly}
            </p>
          )}

          <div className={`mt-7 grid gap-2 ${choice ? "sm:grid-cols-2" : ""}`}>
            {choice && (
              <button
                type="button"
                onClick={() => go(englishHref)}
                disabled={leaving}
                className="whitespace-nowrap rounded-full border border-black/10 px-5 py-2.5 text-sm font-semibold transition hover:bg-black/5 disabled:opacity-60 dark:border-white/15 dark:hover:bg-white/10"
              >
                {ES.seeEnglish}
              </button>
            )}
            <button
              ref={primary}
              type="button"
              onClick={() => go(pdfHref)}
              disabled={leaving}
              className="whitespace-nowrap rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:opacity-60 dark:bg-white dark:text-black dark:focus-visible:outline-white"
            >
              {choice ? ES.stayInSpanish : t.ok}
            </button>
          </div>

          <p
            className="mt-4 text-center text-xs tabular-nums text-neutral-400"
            aria-hidden={leaving}
          >
            {leaving ? t.opening : t.opensIn(seconds, choice)}
          </p>
        </div>

        {/* The countdown, drawn as a bar draining along the card's bottom edge. */}
        <div className="h-1 bg-black/5 dark:bg-white/10" aria-hidden>
          <div
            className="h-full bg-black/60 transition-[width] duration-100 ease-linear dark:bg-white/60"
            style={{ width: `${(Math.max(0, remaining) / totalMs) * 100}%` }}
          />
        </div>
      </section>
    </main>
  );
}

const EN = {
  title: "Latest version of the CV",
  lastUpdated: "Last updated",
  ok: "OK",
  opening: "Opening…",
  opensIn: (s: number) => `Opens in ${s} s`,
};

const ES = {
  title: "Última versión del CV",
  lastUpdated: "Última actualización",
  ok: "Ok",
  opening: "Abriendo…",
  opensIn: (s: number, choice: boolean) =>
    choice ? `Se abrirá la versión en español en ${s} s` : `Se abrirá en ${s} s`,
  spanishVersion: "Versión en español · última actualización",
  englishNewer: "Versión en inglés más reciente",
  englishOnly: "Por ahora el CV está disponible solo en inglés.",
  seeEnglish: "Ver versión en inglés",
  stayInSpanish: "Seguir en español",
};
