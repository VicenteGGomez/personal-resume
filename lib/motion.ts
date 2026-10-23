import type { Transition } from "framer-motion";

/**
 * Shared motion vocabulary. Everything a visitor can touch moves on a spring,
 * because a spring has no script to finish: new input only moves the target,
 * and the value carries on from wherever it is, at the speed it has.
 *
 * `duration` here is Motion's "perceptual duration" (Apple's `response`), not a
 * length of time the animation is held to; `bounce` 0 is critically damped.
 */

/** Settles without overshoot: toggles, menus, anything a tap set off. */
export const SPRING: Transition = { type: "spring", duration: 0.4, bounce: 0 };

/** Content arriving as it scrolls into view. */
export const SPRING_REVEAL: Transition = { type: "spring", duration: 0.55, bounce: 0 };

/** A release that carried momentum: a flick earns a little bounce. */
export const SPRING_FLICK: Transition = { type: "spring", duration: 0.4, bounce: 0.2 };

/** How fast a release has to be (px/s) before it counts as a flick. */
export const FLICK_SPEED = 600;

/**
 * Where a release at `velocity` (px/s) would come to rest if it decelerated like
 * scroll does. Exponential decay, the form Apple ships, not v²/2a.
 */
export function project(velocity: number, decelerationRate = 0.998): number {
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}
