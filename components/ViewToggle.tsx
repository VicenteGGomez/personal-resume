"use client";

import type { Lang } from "@/lib/resume-content";

/**
 * Long view / short view, for a list that has both.
 *
 * Two plain buttons rather than a sliding switch: which of the two you are
 * reading has to be legible at a glance, and the labels themselves say what
 * each one gives you.
 *
 * Shared by the résumé's experience list and the story's timeline, so the same
 * gesture means the same thing wherever the site offers it.
 */
export default function ViewToggle({
  lang,
  compact,
  onChange,
}: {
  lang: Lang;
  compact: boolean;
  onChange: (compact: boolean) => void;
}) {
  const options: { value: boolean; label: string }[] = [
    { value: false, label: lang === "en" ? "Extended" : "Extendida" },
    { value: true, label: lang === "en" ? "Compact" : "Compacta" },
  ];
  return (
    <div
      role="group"
      aria-label={lang === "en" ? "Level of detail" : "Nivel de detalle"}
      className="inline-flex shrink-0 items-center gap-0.5 rounded-full border border-black/10 bg-white p-1 shadow-sm dark:border-white/15 dark:bg-white/10"
    >
      {options.map((option) => (
        <button
          key={String(option.value)}
          type="button"
          aria-pressed={compact === option.value}
          onClick={() => onChange(option.value)}
          className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current sm:text-sm ${
            compact === option.value
              ? "bg-black text-white dark:bg-white dark:text-black"
              : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
