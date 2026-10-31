"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
} from "framer-motion";
import type { CardImage } from "@/lib/resume-content";
import { FLICK_SPEED, SPRING, SPRING_FLICK, project } from "@/lib/motion";

/**
 * A picture at full size, over the page.
 *
 * The timeline shows its photographs small and cropped — a circle on the rail
 * is a mark, not a view — so this is where one is actually looked at: the whole
 * frame, uncropped and uncentred by anything the "Encuadre" dialog decided,
 * since the framing exists for the thumbnail and would only hide half the
 * picture here.
 *
 * A milestone that carries more than one picture is a row you swipe along, the
 * way the project and publication carousels are: the track follows the finger
 * 1:1, can be grabbed mid-slide, and lands on the picture the throw is headed
 * for. A downward throw lets go of the picture altogether, dragging the
 * backdrop away with it. Escape, a tap outside the picture and the close
 * button also dismiss it; ← and → walk the row for a keyboard.
 *
 * Like the carousel, `pos` is unbounded and only the three pictures around the
 * one on screen are rendered, so the row wraps without a jump.
 */

/** Only the last stretch of the gesture says how fast it was going at the end. */
const VELOCITY_WINDOW_MS = 100;
/** Travel (px) before a touch commits to an axis, so a tap stays a tap. */
const SLOP = 8;
/** How far a downward drag has to be headed (px, projected) to let go. */
const DISMISS_DISTANCE = 140;

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
  const reduce = useReducedMotion();
  const n = slides.length;
  const stageRef = useRef<HTMLDivElement>(null);
  /** Track offset in px. Slide `k` sits at `k * width`, so rest is `-pos * width`. */
  const x = useMotionValue(0);
  /** Vertical offset of the whole picture while it is being dragged away. */
  const y = useMotionValue(0);
  const dim = useTransform(y, (v) => 1 - Math.min(Math.abs(v) / 320, 1) * 0.7);
  const widthRef = useRef(0);
  const posRef = useRef(startIndex);
  const [pos, setPos] = useState(startIndex);
  const [view, setView] = useState(startIndex);
  const closing = useRef(false);
  const gesture = useRef<{
    id: number;
    target: EventTarget | null;
    startX: number;
    startY: number;
    base: number;
    axis: "x" | "y" | null;
    inFlight: boolean;
    samples: { t: number; x: number; y: number }[];
  } | null>(null);

  useMotionValueEvent(x, "change", (latest) => {
    const w = widthRef.current;
    if (w) setView(Math.round(-latest / w));
  });

  // Keeps the track on its picture when the stage changes width (rotation).
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      widthRef.current = entry.contentRect.width;
      x.stop();
      x.set(-posRef.current * widthRef.current);
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      x.stop();
    };
  }, [x]);

  /** Head for a picture: a spring from wherever the track is, at the speed it has. */
  const goTo = useCallback(
    (target: number, options: { velocity?: number; flick?: boolean } = {}) => {
      posRef.current = target;
      setPos(target);
      const to = -target * widthRef.current;
      if (reduce) {
        x.stop();
        x.set(to);
        return;
      }
      animate(x, to, {
        ...(options.flick ? SPRING_FLICK : SPRING),
        ...(options.velocity === undefined ? {} : { velocity: options.velocity }),
      });
    },
    [reduce, x],
  );

  /** Throw the picture off the bottom (or top) of the screen, then close. */
  const dismiss = useCallback(
    (velocity = 0) => {
      if (closing.current) return;
      closing.current = true;
      if (reduce) {
        onClose();
        return;
      }
      const side = velocity < 0 || y.get() < 0 ? -1 : 1;
      animate(y, side * window.innerHeight, {
        ...SPRING,
        velocity,
        onComplete: onClose,
      });
    },
    [onClose, reduce, y],
  );

  // Escape closes, the arrows walk, and the page underneath is pinned so a
  // scroll gesture over the backdrop does not move what is behind it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
      if (n < 2) return;
      if (e.key === "ArrowRight") goTo(posRef.current + 1);
      if (e.key === "ArrowLeft") goTo(posRef.current - 1);
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [dismiss, goTo, n]);

  if (n === 0) return null;

  const active = ((pos % n) + n) % n;
  const caption = slides[active]?.caption?.trim();

  const l = {
    close: lang === "en" ? "Close" : "Cerrar",
    next: lang === "en" ? "Next picture" : "Siguiente imagen",
    previous: lang === "en" ? "Previous picture" : "Imagen anterior",
  };

  function startGesture(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0 || closing.current) return;
    // Grabbing a track that is still sliding stops it where it is on screen,
    // and that touch is not a tap.
    const inFlight = x.isAnimating() || y.isAnimating();
    x.stop();
    y.stop();
    gesture.current = {
      id: e.pointerId,
      target: e.target,
      startX: e.clientX,
      startY: e.clientY,
      base: x.get(),
      axis: null,
      inFlight,
      samples: [{ t: e.timeStamp, x: e.clientX, y: e.clientY }],
    };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* no capture — pointer events keep arriving while inside the stage */
    }
  }

  function moveGesture(e: React.PointerEvent<HTMLDivElement>) {
    const g = gesture.current;
    if (!g || g.id !== e.pointerId) return;
    const dx = e.clientX - g.startX;
    const dy = e.clientY - g.startY;
    // Decide the axis from the first real movement, then stay on it.
    if (!g.axis) {
      if (Math.hypot(dx, dy) < SLOP) return;
      g.axis = Math.abs(dx) > Math.abs(dy) && n > 1 ? "x" : "y";
    }
    g.samples.push({ t: e.timeStamp, x: e.clientX, y: e.clientY });
    while (g.samples.length > 2 && e.timeStamp - g.samples[0].t > VELOCITY_WINDOW_MS) {
      g.samples.shift();
    }
    if (g.axis === "x") x.set(g.base + dx);
    else y.set(dy);
  }

  function endGesture(e: React.PointerEvent<HTMLDivElement>) {
    const g = gesture.current;
    if (!g || g.id !== e.pointerId) return;
    gesture.current = null;

    // A touch that never became a drag is a tap: on the picture it does
    // nothing, anywhere else on the backdrop it closes.
    if (!g.axis) {
      const onPicture = g.target instanceof HTMLImageElement;
      if (e.type === "pointerup" && !g.inFlight && !onPicture) dismiss();
      else if (g.inFlight) goTo(posRef.current);
      return;
    }

    const first = g.samples[0];
    const last = g.samples[g.samples.length - 1];
    const dt = last.t - first.t;
    const stale = e.timeStamp - last.t > VELOCITY_WINDOW_MS;
    const live = dt > 0 && !stale;

    if (g.axis === "y") {
      const vy = live ? ((last.y - first.y) / dt) * 1000 : 0;
      const here = y.get();
      if (Math.abs(here + project(vy)) > DISMISS_DISTANCE) dismiss(vy);
      else animate(y, 0, { ...SPRING, velocity: vy });
      return;
    }

    const velocity = live ? ((last.x - first.x) / dt) * 1000 : 0;
    const w = widthRef.current;
    const here = x.get();
    const nearest = Math.round(-here / w);
    // Land on the picture the throw is headed for, one step at most.
    const target = Math.max(
      nearest - 1,
      Math.min(nearest + 1, Math.round(-(here + project(velocity)) / w)),
    );
    goTo(target, { velocity, flick: Math.abs(velocity) > FLICK_SPEED });
  }

  const control =
    "absolute z-10 flex size-11 items-center justify-center rounded-full bg-black/30 text-white/80 backdrop-blur-md transition hover:bg-white/15 hover:text-white active:scale-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      className="fixed inset-0 z-[100]"
    >
      <motion.div
        aria-hidden="true"
        style={{ opacity: dim }}
        className="absolute inset-0 bg-black/90 backdrop-blur-sm"
      />

      <motion.div
        ref={stageRef}
        // Both axes are handled here, so the browser keeps its own scroll and
        // pinch out of the gesture.
        style={{ touchAction: "none", y }}
        initial={reduce ? false : { opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={SPRING}
        className="absolute inset-0 overflow-hidden"
        onPointerDown={startGesture}
        onPointerMove={moveGesture}
        onPointerUp={endGesture}
        onPointerCancel={endGesture}
        aria-roledescription={n > 1 ? "carousel" : undefined}
      >
        <motion.div className="absolute inset-0" style={{ x }}>
          {[view - 1, view, view + 1].map((k) => {
            const slide = slides[((k % n) + n) % n];
            // With one picture there is nothing to slide to.
            if (n < 2 && k !== 0) return null;
            return (
              <div
                key={k}
                className="absolute top-0 flex h-full w-full items-center justify-center px-3 pb-24 pt-16 sm:px-20"
                style={{ left: `${k * 100}%` }}
                aria-hidden={k !== view}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- user-uploaded, backend-agnostic URL */}
                <img
                  src={slide.url}
                  alt={k === view ? alt : ""}
                  draggable={false}
                  className="max-h-full max-w-full select-none rounded-xl object-contain shadow-2xl sm:rounded-2xl"
                />
              </div>
            );
          })}
        </motion.div>
      </motion.div>

      <button
        type="button"
        onClick={() => dismiss()}
        aria-label={l.close}
        style={{ top: "max(1rem, env(safe-area-inset-top))" }}
        className={`${control} right-4`}
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

      {n > 1 && (
        <>
          {/* A finger swipes; the buttons are for a mouse, so they stay off
              the narrowest screens where they would cover the picture. */}
          <button
            type="button"
            onClick={() => goTo(posRef.current - 1)}
            aria-label={l.previous}
            className={`${control} left-4 top-1/2 hidden -translate-y-1/2 sm:flex`}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="size-5"
            >
              <path d="M15 18 9 12l6-6" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => goTo(posRef.current + 1)}
            aria-label={l.next}
            className={`${control} right-4 top-1/2 hidden -translate-y-1/2 sm:flex`}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="size-5"
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </>
      )}

      {(caption || n > 1) && (
        <p
          style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
          className="pointer-events-none absolute inset-x-0 bottom-0 px-6 pt-3 text-center text-sm text-white/75"
        >
          {caption}
          {n > 1 && (
            // Read aloud as well as seen, so the two carry a separator rather
            // than only the margin between them.
            <span className="text-white/45">
              {caption ? " · " : ""}
              {active + 1} / {n}
            </span>
          )}
        </p>
      )}
    </div>
  );
}
