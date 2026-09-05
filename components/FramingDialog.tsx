"use client";

import { useEffect, useRef } from "react";
import {
  type Fit,
  type Framing,
  MAX_ZOOM,
  MIN_ZOOM,
  fitOf,
  framingStyle,
  isFramed,
  panFraming,
  zoomOf,
} from "@/lib/image-framing";

/** How far one wheel notch or one +/- key moves the zoom. */
const ZOOM_STEP = 0.1;
/** How far one arrow key drags the picture, in pixels of the preview. */
const NUDGE_PX = 8;

/**
 * The "Encuadre" window: how one picture sits inside the 16:9 frame the cards
 * and project pages give it. It opens over the editor from the picture itself,
 * so the controls cost no room in the form until they are wanted.
 *
 * The preview crops exactly the way the card does — same helper, same numbers —
 * and the picture is dragged inside it, the same gesture as repositioning a
 * cover photo. Everything applies as you go: there is nothing to confirm here,
 * only "Guardar cambios" back in the editor.
 */
export default function FramingDialog({
  url,
  framing,
  fallbackFit = "cover",
  onChange,
  onClose,
  hint,
}: {
  url: string;
  framing: Framing;
  /** The fit to show when the picture has never been given one of its own. */
  fallbackFit?: Fit;
  onChange: (framing: Framing) => void;
  onClose: () => void;
  hint?: string;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  // The gesture is measured from where it started, against the framing the
  // picture had at that moment, so a long drag does not accumulate rounding.
  const gesture = useRef<{ id: number; x: number; y: number; from: Framing } | null>(
    null,
  );

  const fit = fitOf(framing, fallbackFit);
  const zoom = zoomOf(framing);

  function set(patch: Framing) {
    onChange({ ...framing, fit, zoom, ...patch });
  }

  /** Move the picture by (dx, dy) pixels of the preview. */
  function dragBy(from: Framing, dx: number, dy: number) {
    const frame = frameRef.current;
    const image = imageRef.current;
    if (!frame || !image) return;
    const box = frame.getBoundingClientRect();
    set(
      panFraming(
        from,
        { dx, dy },
        { width: box.width, height: box.height },
        { width: image.naturalWidth, height: image.naturalHeight },
        fallbackFit,
      ),
    );
  }

  function pan(e: React.PointerEvent) {
    const g = gesture.current;
    if (!g || g.id !== e.pointerId) return;
    dragBy(g.from, e.clientX - g.x, e.clientY - g.y);
  }

  function setZoom(value: number) {
    set({ zoom: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(value * 100) / 100)) });
  }

  // Escape closes, like every other overlay on the site.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // The wheel zooms rather than scrolling the editor behind the window. React
  // registers its own wheel handlers as passive, which cannot stop that scroll,
  // so this one is attached by hand.
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      setZoom(zoom - Math.sign(e.deltaY) * ZOOM_STEP);
    }
    frame.addEventListener("wheel", onWheel, { passive: false });
    return () => frame.removeEventListener("wheel", onWheel);
    // No dependency list on purpose: the handler reads the current zoom, so it
    // is re-attached on every render rather than kept stale.
  });

  const pill = "rounded-full px-3 py-1 text-xs font-semibold transition";
  const chosen = "bg-white shadow-sm dark:bg-white/25";
  const unchosen = "text-neutral-500 dark:text-neutral-400";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Encuadre de la imagen"
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg rounded-3xl bg-white p-6 text-black shadow-2xl dark:bg-neutral-900 dark:text-white"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold tracking-tight">Encuadre</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex size-8 items-center justify-center rounded-full text-neutral-400 transition hover:bg-black/5 hover:text-black dark:hover:bg-white/10 dark:hover:text-white"
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
        </div>

        <div
          ref={frameRef}
          tabIndex={0}
          role="group"
          aria-label="Arrastra la imagen para elegir qué parte se ve"
          className={`relative mt-4 aspect-[16/9] w-full cursor-grab touch-none overflow-hidden rounded-2xl ring-1 ring-black/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black active:cursor-grabbing dark:ring-white/15 dark:focus-visible:outline-white ${
            fit === "cover" ? "bg-black/5 dark:bg-white/10" : "bg-neutral-50 dark:bg-white/5"
          }`}
          onPointerDown={(e) => {
            if (e.button !== 0) return;
            gesture.current = { id: e.pointerId, x: e.clientX, y: e.clientY, from: framing };
            try {
              e.currentTarget.setPointerCapture(e.pointerId);
            } catch {
              /* no capture — the drag still works inside the frame */
            }
          }}
          onPointerMove={pan}
          onPointerUp={(e) => {
            pan(e);
            gesture.current = null;
          }}
          onPointerCancel={() => {
            gesture.current = null;
          }}
          onKeyDown={(e) => {
            const step: Record<string, [number, number]> = {
              // Dragging the picture the other way is what brings that side of
              // it into view, so "→" shows what is further right.
              ArrowLeft: [NUDGE_PX, 0],
              ArrowRight: [-NUDGE_PX, 0],
              ArrowUp: [0, NUDGE_PX],
              ArrowDown: [0, -NUDGE_PX],
            };
            const move = step[e.key];
            if (move) {
              e.preventDefault();
              dragBy(framing, move[0], move[1]);
            } else if (e.key === "+" || e.key === "=") {
              e.preventDefault();
              setZoom(zoom + ZOOM_STEP);
            } else if (e.key === "-") {
              e.preventDefault();
              setZoom(zoom - ZOOM_STEP);
            }
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- preview of a URL/uploaded image */}
          <img
            ref={imageRef}
            src={url}
            alt="Encuadre de la imagen"
            className="h-full w-full select-none"
            style={framingStyle(framing, fallbackFit)}
            draggable={false}
          />
          {/* Thirds, so the drag reads as framing a photo rather than scrolling. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3"
          >
            {Array.from({ length: 9 }, (_, i) => (
              <div key={i} className="border border-white/15" />
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="w-16 shrink-0 text-sm font-medium">Tamaño</span>
            <div
              role="group"
              aria-label="Ajuste de la imagen"
              className="inline-flex w-fit rounded-full bg-black/5 p-0.5 dark:bg-white/10"
            >
              <button
                type="button"
                onClick={() => set({ fit: "contain" })}
                aria-pressed={fit === "contain"}
                className={`${pill} ${fit === "contain" ? chosen : unchosen}`}
              >
                Ajustar
              </button>
              <button
                type="button"
                onClick={() => set({ fit: "cover" })}
                aria-pressed={fit === "cover"}
                className={`${pill} ${fit === "cover" ? chosen : unchosen}`}
              >
                Rellenar
              </button>
            </div>
            <span className="text-xs text-neutral-400">
              {fit === "cover"
                ? "Llena el marco y recorta los bordes."
                : "Muestra la imagen completa, con márgenes."}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <label htmlFor="framing-zoom" className="w-16 shrink-0 text-sm font-medium">
              Zoom
            </label>
            <input
              id="framing-zoom"
              type="range"
              min={MIN_ZOOM * 100}
              max={MAX_ZOOM * 100}
              step={5}
              value={Math.round(zoom * 100)}
              onChange={(e) => setZoom(Number(e.target.value) / 100)}
              className="w-full min-w-0 cursor-pointer accent-black dark:accent-white"
            />
            <span className="w-12 shrink-0 text-right text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
              {Math.round(zoom * 100)}%
            </span>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <span className="min-w-[14rem] flex-1 text-xs leading-5 text-neutral-400">
            {hint ?? "Arrastra la imagen para mover el encuadre; la rueda acerca y aleja."}
          </span>
          <div className="ml-auto flex items-center gap-3">
            {isFramed(framing) && (
              <button
                type="button"
                onClick={() => set({ focusX: 50, focusY: 50, zoom: MIN_ZOOM })}
                className="text-sm font-medium text-neutral-500 hover:underline dark:text-neutral-400"
              >
                Restablecer
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-black px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90 dark:bg-white dark:text-black"
            >
              Listo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
