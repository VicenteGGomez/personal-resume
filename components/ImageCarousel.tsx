"use client";

import { useEffect, useRef, useState } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
} from "framer-motion";
import { type Framing, fitOf, framingStyle } from "@/lib/image-framing";
import { FLICK_SPEED, SPRING, SPRING_FLICK, project } from "@/lib/motion";

/**
 * A small image carousel used by the publication cards and by the project
 * cards / project pages. One image renders as a plain picture (no controls, no
 * autoplay); two or more get an infinite loop that advances on its own, can be
 * swiped with a finger or the mouse, and shows a pair of faint chevrons.
 *
 * The loop is seamless because `pos` is unbounded: it only ever moves by ±1 and
 * the track keeps sliding in the same direction, so there is never a jump back
 * to the first slide. Only the three slides around what is on screen are
 * rendered, each one parked at its own multiple of 100% and filled with
 * `slides[k mod n]`.
 *
 * The track's offset is a motion value in pixels, not a CSS transition, so it
 * can be grabbed at any instant: a touch stops it where it is on screen and
 * the finger takes over from there. On release the spring starts from that live
 * offset at the finger's own velocity, and the slide it lands on is chosen from
 * where the throw would come to rest, not from where the finger lifted.
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

/** Only the last stretch of the gesture says how fast it was going at the end. */
const VELOCITY_WINDOW_MS = 100;
/** How long each slide stays put before the carousel advances on its own. */
const AUTOPLAY_MS = 5000;

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
  /** Track offset in px. Slide `k` sits at `k * width`, so rest is `-pos * width`. */
  const x = useMotionValue(0);
  const widthRef = useRef(0);
  /** The slide the carousel is heading for (or resting on). */
  const posRef = useRef(0);
  const [pos, setPos] = useState(0);
  /** The slide nearest the middle of the frame right now, wherever the spring is. */
  const [view, setView] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [onScreen, setOnScreen] = useState(false);
  const [hovering, setHovering] = useState(false);
  const gesture = useRef<{
    id: number;
    startX: number;
    base: number;
    moved: boolean;
    samples: { t: number; x: number }[];
  } | null>(null);

  useMotionValueEvent(x, "change", (latest) => {
    const w = widthRef.current;
    if (w) setView(Math.round(-latest / w));
  });

  // Keeps the track on its slide when the frame changes width.
  useEffect(() => {
    const el = frameRef.current;
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

  /** Head for a slide: a spring from wherever the track is, at the speed it has. */
  function goTo(
    target: number,
    options: { velocity?: number; flick?: boolean } = {},
  ) {
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
  }

  useEffect(() => {
    if (n < 2 || !autoPlay || reduce || !onScreen || hovering || dragging) return;
    const id = window.setInterval(() => goTo(posRef.current + 1), AUTOPLAY_MS);
    return () => window.clearInterval(id);
    // `pos` restarts the clock after a manual arrow or swipe, so the next
    // automatic slide is a full interval away rather than right on its heels.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- goTo only reads refs and stable values
  }, [n, autoPlay, reduce, onScreen, hovering, dragging, pos]);

  if (n === 0) return null;

  const active = ((pos % n) + n) % n;
  const single = n < 2;

  function startGesture(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    // Grabbing a track that is still sliding stops it right where it is on
    // screen, and that touch is not a tap on the picture underneath.
    const inFlight = x.isAnimating();
    x.stop();
    gesture.current = {
      id: e.pointerId,
      startX: e.clientX,
      base: x.get(),
      moved: inFlight,
      samples: [{ t: e.timeStamp, x: e.clientX }],
    };
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
    const dx = e.clientX - g.startX;
    if (Math.abs(dx) > 4) g.moved = true;
    g.samples.push({ t: e.timeStamp, x: e.clientX });
    while (g.samples.length > 2 && e.timeStamp - g.samples[0].t > VELOCITY_WINDOW_MS) {
      g.samples.shift();
    }
    // 1:1 with the finger, from the offset the track had when it was grabbed.
    if (!single) x.set(g.base + dx);
  }

  function endGesture(e: React.PointerEvent<HTMLDivElement>) {
    const g = gesture.current;
    if (!g || g.id !== e.pointerId) return;
    gesture.current = null;
    setDragging(false);
    if (single) {
      if (!g.moved && e.type === "pointerup") onActivate?.();
      return;
    }
    // Release velocity from the last stretch of the drag; a finger that had
    // already stopped before lifting hands over nothing.
    const first = g.samples[0];
    const last = g.samples[g.samples.length - 1];
    const dt = last.t - first.t;
    const stale = e.timeStamp - last.t > VELOCITY_WINDOW_MS;
    const velocity = dt > 0 && !stale ? ((last.x - first.x) / dt) * 1000 : 0;

    const w = widthRef.current;
    const here = x.get();
    const nearest = Math.round(-here / w);
    // Land on the slide the throw is headed for, one step at most.
    const target = Math.max(
      nearest - 1,
      Math.min(nearest + 1, Math.round(-(here + project(velocity)) / w)),
    );
    goTo(target, { velocity, flick: Math.abs(velocity) > FLICK_SPEED });
    if (!g.moved && e.type === "pointerup") onActivate?.();
  }

  const arrow =
    "absolute top-1/2 z-10 -translate-y-1/2 p-1.5 text-white/50 transition active:scale-90 hover:text-white focus-visible:text-white focus-visible:outline-none [filter:drop-shadow(0_1px_2px_rgb(0_0_0/0.55))]";

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
        <motion.div className="absolute inset-0" style={{ x }}>
          {[view - 1, view, view + 1].map((k) => {
            const slide = slides[((k % n) + n) % n];
            // With one image there is nothing to slide to: render it alone so a
            // static card keeps exactly the markup it had before.
            if (single && k !== 0) return null;
            return (
              <div
                key={k}
                // Each slide clips its own picture: a zoomed one spills past
                // the frame, and it must not bleed into the slide next door.
                className={`absolute top-0 h-full w-full overflow-hidden ${
                  fitOf(slide) === "contain" ? "bg-neutral-50 dark:bg-white/5" : ""
                }`}
                style={{ left: `${k * 100}%` }}
                aria-hidden={k !== view}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- user-provided, backend-agnostic URL */}
                <img
                  src={slide.url}
                  alt={k === view ? slide.caption || alt : ""}
                  className="h-full w-full select-none"
                  style={framingStyle(slide)}
                  draggable={false}
                  loading="lazy"
                />
              </div>
            );
          })}
        </motion.div>

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
                goTo(posRef.current - 1);
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
                goTo(posRef.current + 1);
              }}
            >
              <Chevron />
            </button>
          </>
        )}
      </div>

      {showCaptions && slides[active]?.caption && (
        <p className="mt-3 text-center text-sm text-mute dark:text-mute-dark">
          {slides[active].caption}
        </p>
      )}
    </div>
  );
}
