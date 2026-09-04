"use client";

import { useRef } from "react";
import { type Focus, focusStyle, isCentred, panFocus } from "@/lib/image-focus";

/**
 * Pick which part of a picture stays in view once it is cropped to fill a card.
 * The preview crops exactly the way the card does, and the picture is dragged
 * inside it — the same gesture as repositioning a cover photo. An axis with
 * nothing to spare simply will not move (see `panFocus`).
 */
export default function FocusPicker({
  url,
  focus,
  onChange,
  hint,
}: {
  url: string;
  focus: Focus;
  onChange: (focus: { focusX: number; focusY: number }) => void;
  hint?: string;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  // The gesture is measured from where it started, against the focus the
  // picture had at that moment, so a long drag does not accumulate rounding.
  const gesture = useRef<{ id: number; x: number; y: number; from: Focus } | null>(
    null,
  );

  function pan(e: React.PointerEvent) {
    const g = gesture.current;
    const frame = frameRef.current;
    const image = imageRef.current;
    if (!g || g.id !== e.pointerId || !frame || !image) return;
    const box = frame.getBoundingClientRect();
    onChange(
      panFocus(
        g.from,
        { dx: e.clientX - g.x, dy: e.clientY - g.y },
        { width: box.width, height: box.height },
        { width: image.naturalWidth, height: image.naturalHeight },
      ),
    );
  }

  return (
    <div className="grid gap-2">
      <span className="text-sm font-medium">Encuadre</span>
      <div
        ref={frameRef}
        className="relative aspect-[16/9] w-full max-w-[320px] cursor-grab touch-none overflow-hidden rounded-lg bg-black/5 ring-1 ring-black/10 active:cursor-grabbing dark:bg-white/10 dark:ring-white/15"
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          gesture.current = { id: e.pointerId, x: e.clientX, y: e.clientY, from: focus };
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
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- preview of a URL/uploaded image */}
        <img
          ref={imageRef}
          src={url}
          alt="Encuadre de la imagen"
          className="h-full w-full select-none object-cover"
          style={focusStyle(focus)}
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
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs text-neutral-400">
          {hint ?? "Arrastra la imagen para elegir qué parte se ve."}
        </span>
        {!isCentred(focus) && (
          <button
            type="button"
            onClick={() => onChange({ focusX: 50, focusY: 50 })}
            className="text-sm font-medium text-neutral-500 hover:underline dark:text-neutral-400"
          >
            Centrar
          </button>
        )}
      </div>
    </div>
  );
}
