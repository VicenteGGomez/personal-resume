"use client";

import { useCallback, useEffect, useState } from "react";
import type { CardImage } from "@/lib/resume-content";

/**
 * A picture at full size, over the page.
 *
 * The timeline shows its photographs small and cropped — a circle on the rail
 * is a mark, not a view — so this is where one is actually looked at: the whole
 * frame, uncropped and uncentred by anything the "Encuadre" dialog decided,
 * since the framing exists for the thumbnail and would only hide half the
 * picture here.
 *
 * Escape or a click outside closes it; ← and → walk a milestone that carries
 * more than one picture, which is also what its stacked circles open into.
 */
export default function ImageLightbox({
  slides,
  startIndex = 0,
  alt,
  lang,
  onClose,
}: {
  slides: CardImage[];
  startIndex?: number;
  /** What the picture is of, for anyone who cannot see it. */
  alt: string;
  lang: "en" | "es";
  onClose: () => void;
}) {
  const [index, setIndex] = useState(startIndex);
  const count = slides.length;
  const slide = slides[Math.min(index, count - 1)];

  const step = useCallback(
    (by: number) => setIndex((i) => (i + by + count) % count),
    [count],
  );

  // Escape closes, the arrows walk, and the page underneath is pinned so a
  // scroll gesture over the backdrop does not move what is behind it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (count < 2) return;
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose, step, count]);

  if (!slide) return null;

  const l = {
    close: lang === "en" ? "Close" : "Cerrar",
    next: lang === "en" ? "Next picture" : "Siguiente imagen",
    previous: lang === "en" ? "Previous picture" : "Imagen anterior",
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      onClick={onClose}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-black/85 p-4 backdrop-blur-sm sm:p-8"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label={l.close}
        className="absolute right-4 top-4 flex size-10 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
          className="size-6"
        >
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>

      {/* Stopping the click here is what lets the backdrop close it: everything
          a visitor might actually want to press lives inside this box. */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex min-h-0 max-w-full flex-col items-center gap-4"
      >
        <div className="flex min-h-0 items-center gap-2 sm:gap-4">
          {count > 1 && (
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label={l.previous}
              className="flex size-10 shrink-0 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className="size-6"
              >
                <path d="M15 18 9 12l6-6" />
              </svg>
            </button>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element -- user-uploaded, backend-agnostic URL */}
          <img
            src={slide.url}
            alt={alt}
            className="max-h-[78svh] min-h-0 w-auto max-w-full rounded-2xl object-contain shadow-2xl"
          />
          {count > 1 && (
            <button
              type="button"
              onClick={() => step(1)}
              aria-label={l.next}
              className="flex size-10 shrink-0 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className="size-6"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          )}
        </div>

        {(slide.caption?.trim() || count > 1) && (
          <p className="max-w-xl text-center text-sm text-white/70">
            {slide.caption?.trim()}
            {count > 1 && (
              // Read aloud as well as seen, so the two carry a separator rather
              // than only the margin between them.
              <span className="text-white/40">
                {slide.caption?.trim() ? " · " : ""}
                {index + 1} / {count}
              </span>
            )}
          </p>
        )}
      </div>
    </div>
  );
}
