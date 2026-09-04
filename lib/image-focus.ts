import type { CSSProperties } from "react";

/**
 * The focal point of a picture that gets cropped to fill its frame, in percent
 * of the picture's own width and height. Absent on anything saved before the
 * picker existed, so both fields are read through the helpers below rather than
 * directly.
 */
export interface Focus {
  focusX?: number;
  focusY?: number;
}

const CENTRE = 50;

/** `object-position` for a cropped picture — centred when no focus is set. */
export function focusStyle(focus: Focus): CSSProperties {
  return {
    objectPosition: `${focus.focusX ?? CENTRE}% ${focus.focusY ?? CENTRE}%`,
  };
}

/** Whether a focal point has been moved off the centre. */
export function isCentred(focus: Focus): boolean {
  return (focus.focusX ?? CENTRE) === CENTRE && (focus.focusY ?? CENTRE) === CENTRE;
}

function clamp(value: number): number {
  return Math.round(Math.min(100, Math.max(0, value)));
}

/**
 * Where the focal point lands after dragging a cropped picture by (dx, dy)
 * pixels inside its frame.
 *
 * `object-fit: cover` scales the picture until it covers the frame, so the
 * excess hangs off two opposite edges, and `object-position: p%` puts `p`
 * percent of that excess before the frame. Dragging the picture to the right
 * therefore *lowers* the horizontal percentage. An axis with no excess — the
 * picture already fits it exactly — cannot move at all.
 *
 * `drag` is measured from where the gesture started, against the focus the
 * picture had at that moment, so repeated calls during one drag do not drift.
 */
export function panFocus(
  focus: Focus,
  drag: { dx: number; dy: number },
  frame: { width: number; height: number },
  natural: { width: number; height: number },
): { focusX: number; focusY: number } {
  const x = focus.focusX ?? CENTRE;
  const y = focus.focusY ?? CENTRE;
  if (!frame.width || !frame.height || !natural.width || !natural.height) {
    return { focusX: x, focusY: y };
  }
  const scale = Math.max(frame.width / natural.width, frame.height / natural.height);
  const spareX = natural.width * scale - frame.width;
  const spareY = natural.height * scale - frame.height;
  // Half a pixel of slack: a picture that matches the frame's aspect ratio can
  // land a hair off zero, and nudging it would only jitter.
  return {
    focusX: spareX > 0.5 ? clamp(x - (drag.dx / spareX) * 100) : x,
    focusY: spareY > 0.5 ? clamp(y - (drag.dy / spareY) * 100) : y,
  };
}
