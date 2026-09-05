"use client";

import { type CSSProperties, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { type Framing, fitOf, framingStyle } from "@/lib/image-framing";

/**
 * A small image carousel used by the publication cards and by the project
 * cards / project pages. One image renders as a plain picture (no controls, no
 * autoplay); two or more get an infinite loop that advances on its own, can be
 * swiped with a finger or the mouse, and shows a pair of faint chevrons.
 *
 * The loop is seamless because `pos` is unbounded: it only ever moves by ±1 and
 * the track keeps sliding in the same direction, so there is never a jump back
 * to the first slide. Only the three slides around `pos` are rendered, each one
 * parked at its own multiple of 100% and filled with `slides[pos mod n]`.
 */

/**
 * One picture of the carousel, with the framing chosen for it in the admin
 * ("Encuadre"): how it fills the frame, which part of it stays in view and how
 * far it is zoomed in. A picture with no framing of its own fills the frame and
 * is centred, which is what every card did before the dialog existed.
 */
export type CarouselSlide = Framing & {
  url: string;
  caption?: string;
};

/** Drag distance (px) that counts as a swipe instead of a tap. */
const SWIPE_PX = 40;
/** How long each slide stays put before the carousel advances on its own. */
const AUTOPLAY_MS = 5000;
const SLIDE_EASE = "transform 450ms cubic-bezier(0.22, 1, 0.36, 1)";

function Chevron({ back }: { back?: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={back ? "M15 18 9 12l6-6" : "m9 18 6-6-6-6"} />
    </svg>
  );
}

export default function ImageCarousel({
  slides,
  className = "",
  frameClassName = "",
  alt = "",
  showCaptions = false,
  autoPlay = true,
  onActivate,
}: {
  slides: CarouselSlide[];
  /** Wrapper classes — margins, and the z-index that lifts the controls over a
   *  card's stretched link. */
  className?: string;
  /** The picture frame itself: aspect ratio, rounding, ring. */
  frameClassName?: string;
  alt?: string;
  /** Show the current slide's caption under the frame (project pages). */
  showCaptions?: boolean;
  autoPlay?: boolean;
  /** Tapping the picture (as opposed to dragging it) — used by cards, where
   *  the carousel sits above the link that covers the rest of the card. */
  onActivate?: () => void;
}) {
  const reduce = useReducedMotion();
  const n = slides.length;
  const frameRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(0);
  const [drag, setDrag] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [onScreen, setOnScreen] = useState(false);
  const [hovering, setHovering] = useState(false);
  const gesture = useRef<{ id: number; x: number; moved: boolean } | null>(null);

  // Autoplay only while the carousel is actually on screen and nobody is
  // touching it — a page full of cards should not animate out of view.
  useEffect(() => {
    if (n < 2) return;
    const el = frameRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setOnScreen(entry.isIntersecting),
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [n]);

  useEffect(() => {
    if (n < 2 || !autoPlay || reduce || !onScreen || hovering || dragging) return;
    const id = window.setInterval(() => setPos((p) => p + 1), AUTOPLAY_MS);
    return () => window.clearInterval(id);
    // `pos` restarts the clock after a manual arrow or swipe, so the next
    // automatic slide is a full interval away rather than right on its heels.
  }, [n, autoPlay, reduce, onScreen, hovering, dragging, pos]);

  if (n === 0) return null;

  const active = ((pos % n) + n) % n;
  const single = n < 2;

  const trackStyle: CSSProperties = {
    transform: `translate3d(calc(${-pos * 100}% + ${drag}px), 0, 0)`,
    transition: dragging || reduce ? "none" : SLIDE_EASE,
  };

  function startGesture(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    gesture.current = { id: e.pointerId, x: e.clientX, moved: false };
    setDragging(true);
    // Keep following the pointer once it leaves the frame. Not every pointer
    // can be captured (a stale id throws), and the drag still works without it.
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* no capture — pointer events keep arriving while inside the frame */
    }
  }

  function moveGesture(e: React.PointerEvent<HTMLDivElement>) {
    const g = gesture.current;
    if (!g || g.id !== e.pointerId) return;
    const dx = e.clientX - g.x;
    if (Math.abs(dx) > 4) g.moved = true;
    if (!single) setDrag(dx);
  }

  function endGesture(e: React.PointerEvent<HTMLDivElement>) {
    const g = gesture.current;
    if (!g || g.id !== e.pointerId) return;
    gesture.current = null;
    const dx = e.clientX - g.x;
    setDragging(false);
    setDrag(0);
    // Past the threshold the release flows straight into the slide animation:
    // the track transitions from wherever the finger left it to the next slot.
    if (!single && Math.abs(dx) >= SWIPE_PX) setPos((p) => p + (dx < 0 ? 1 : -1));
    else if (!g.moved) onActivate?.();
  }

  const arrow =
    "absolute top-1/2 z-10 -translate-y-1/2 p-1.5 text-white/50 transition hover:text-white focus-visible:text-white focus-visible:outline-none [filter:drop-shadow(0_1px_2px_rgb(0_0_0/0.55))]";

  return (
    <div className={className}>
      <div
        ref={frameRef}
        className={`relative overflow-hidden ${frameClassName}`}
        style={{ touchAction: "pan-y" }}
        onPointerDown={startGesture}
        onPointerMove={moveGesture}
        onPointerUp={endGesture}
        onPointerCancel={endGesture}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        aria-roledescription={single ? undefined : "carousel"}
      >
        <div className="absolute inset-0" style={trackStyle}>
          {[pos - 1, pos, pos + 1].map((k) => {
            const slide = slides[((k % n) + n) % n];
            // With one image there is nothing to slide to: render it alone so a
            // static card keeps exactly the markup it had before.
            if (single && k !== pos) return null;
            return (
              <div
                key={k}
                // Each slide clips its own picture: a zoomed one spills past
                // the frame, and it must not bleed into the slide next door.
                className={`absolute top-0 h-full w-full overflow-hidden ${
                  fitOf(slide) === "contain" ? "bg-neutral-50 dark:bg-white/5" : ""
                }`}
                style={{ left: `${k * 100}%` }}
                aria-hidden={k !== pos}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- user-provided, backend-agnostic URL */}
                <img
                  src={slide.url}
                  alt={k === pos ? slide.caption || alt : ""}
                  className="h-full w-full select-none"
                  style={framingStyle(slide)}
                  draggable={false}
                  loading="lazy"
                />
              </div>
            );
          })}
        </div>

        {!single && (
          <>
            <button
              type="button"
              aria-label="Previous image"
              className={`${arrow} left-1`}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setPos((p) => p - 1);
              }}
            >
              <Chevron back />
            </button>
            <button
              type="button"
              aria-label="Next image"
              className={`${arrow} right-1`}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setPos((p) => p + 1);
              }}
            >
              <Chevron />
            </button>
          </>
        )}
      </div>

      {showCaptions && slides[active]?.caption && (
        <p className="mt-3 text-center text-sm text-neutral-500 dark:text-neutral-400">
          {slides[active].caption}
        </p>
      )}
    </div>
  );
}
