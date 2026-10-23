"use client";

import { useEffect, useRef } from "react";

/**
 * The site's one signature: a thread that starts under the monogram and is drawn
 * along the page as it is read, in the same amber-to-pink as the story's rail.
 * It is the same figure as the route through "Experience" and the rail of "My
 * story" — one line that is the path from the first screen to the last — shown
 * at the one place every page has, the header.
 *
 * The progress goes straight onto the element as a clip instead of through
 * React state: it changes on every scroll frame (and a clip, unlike a scale, keeps the gradient at full width, so a half-read page is half a gradient), and re-rendering the header
 * that often would be wasted work. It is scroll-linked rather than animated by
 * itself, so there is nothing to switch off for reduced motion.
 */
export default function ReadingThread() {
  const fill = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = fill.current;
    if (!el) return;
    let frame = 0;

    const update = () => {
      frame = 0;
      const root = document.documentElement;
      const room = root.scrollHeight - window.innerHeight;
      const progress = room > 0 ? Math.min(1, Math.max(0, window.scrollY / room)) : 0;
      el.style.clipPath = `inset(0 ${((1 - progress) * 100).toFixed(2)}% 0 0)`;
    };
    const onScroll = () => {
      frame ||= requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-5 bottom-0 mx-auto block h-[2px] max-w-6xl overflow-hidden"
    >
      <span
        ref={fill}
        className="thread-fill block h-full"
        style={{ clipPath: "inset(0 100% 0 0)" }}
      />
    </span>
  );
}
