import type { CSSProperties } from "react";

/** How a picture fills its frame. */
export type Fit = "contain" | "cover";

/**
 * How a picture sits inside its frame — everything the "Encuadre" dialog
 * edits. Every field is optional: pictures saved before each control existed
 * carry none of them, so all of it is read through the helpers below rather
 * than directly.
 */
export interface Framing {
  /** Focal point, in percent of the picture's own width and height. */
  focusX?: number;
  focusY?: number;
  /** Scale on top of the fitted size; 1 (or absent) is the picture unzoomed. */
  zoom?: number;
  /**
   * - "contain": the whole picture inside the frame, with margins around it.
   * - "cover": fill the frame, cropping whatever overflows.
   *
   * Absent falls back to whatever the picture's context has always used.
   */
  fit?: Fit;
}

const CENTRE = 50;
export const MIN_ZOOM = 1;
export const MAX_ZOOM = 4;

/** The fit a picture is drawn with, given the default for where it appears. */
export function fitOf(framing: Framing, fallback: Fit = "cover"): Fit {
  return framing.fit === "contain" || framing.fit === "cover" ? framing.fit : fallback;
}

/** The zoom a picture is drawn at — never below 1, never past {@link MAX_ZOOM}. */
export function zoomOf(framing: Framing): number {
  const zoom = Number(framing.zoom);
  if (!Number.isFinite(zoom)) return MIN_ZOOM;
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

/**
 * The picture's own styles: how it fills the frame, which part of it is in
 * view, and how far it is zoomed in.
 *
 * `object-position: p%` lines the point at p% of the picture up with the point
 * at p% of the frame. Scaling about that very same point therefore leaves it
 * exactly where it is and grows the picture around it, which comes out
 * identical to fitting the picture at `zoom` times its size and positioning it
 * at the same percentages — so {@link panFraming} can reason in those terms
 * alone, whether the zoom came from the slider or was never touched.
 *
 * A zoomed picture spills past its own box, so whatever draws it has to clip
 * (the carousel's slides and the dialog's frame both do).
 */
export function framingStyle(framing: Framing, fallbackFit: Fit = "cover"): CSSProperties {
  const x = framing.focusX ?? CENTRE;
  const y = framing.focusY ?? CENTRE;
  const zoom = zoomOf(framing);
  return {
    objectFit: fitOf(framing, fallbackFit),
    objectPosition: `${x}% ${y}%`,
    ...(zoom > MIN_ZOOM
      ? { transform: `scale(${zoom})`, transformOrigin: `${x}% ${y}%` }
      : {}),
  };
}

/** Whether the focal point is still in the middle of the picture. */
export function isCentred(framing: Framing): boolean {
  return (framing.focusX ?? CENTRE) === CENTRE && (framing.focusY ?? CENTRE) === CENTRE;
}

/** Whether anything has been moved or zoomed — i.e. there is a framing to undo. */
export function isFramed(framing: Framing): boolean {
  return !isCentred(framing) || zoomOf(framing) > MIN_ZOOM;
}

function clamp(value: number): number {
  return Math.round(Math.min(100, Math.max(0, value)));
}

/** The size one picture is drawn at inside a frame, fit and zoom included. */
function drawnSize(
  framing: Framing,
  frame: { width: number; height: number },
  natural: { width: number; height: number },
  fallbackFit: Fit,
): { width: number; height: number } {
  const wide = frame.width / natural.width;
  const tall = frame.height / natural.height;
  const base = fitOf(framing, fallbackFit) === "cover" ? Math.max(wide, tall) : Math.min(wide, tall);
  const scale = base * zoomOf(framing);
  return { width: natural.width * scale, height: natural.height * scale };
}

/**
 * Where the focal point lands after dragging a picture by (dx, dy) pixels
 * inside its frame.
 *
 * On an axis where the picture overflows, `object-position: p%` puts p percent
 * of the excess before the frame, so dragging to the right *lowers* the
 * percentage. On an axis with room to spare — a "contain" picture, letterboxed
 * — p slides it inside that room instead, and dragging to the right raises the
 * percentage. Both are the same formula: the spare space is simply negative in
 * the second case. An axis the picture fills exactly cannot move at all.
 *
 * `drag` is measured from where the gesture started, against the framing the
 * picture had at that moment, so repeated calls during one drag do not drift.
 */
export function panFraming(
  framing: Framing,
  drag: { dx: number; dy: number },
  frame: { width: number; height: number },
  natural: { width: number; height: number },
  fallbackFit: Fit = "cover",
): { focusX: number; focusY: number } {
  const x = framing.focusX ?? CENTRE;
  const y = framing.focusY ?? CENTRE;
  if (!frame.width || !frame.height || !natural.width || !natural.height) {
    return { focusX: x, focusY: y };
  }
  const drawn = drawnSize(framing, frame, natural, fallbackFit);
  const spareX = drawn.width - frame.width;
  const spareY = drawn.height - frame.height;
  // Half a pixel of slack: a picture that matches the frame's aspect ratio can
  // land a hair off zero, and nudging it would only jitter.
  const movable = (spare: number) => Math.abs(spare) > 0.5;
  return {
    focusX: movable(spareX) ? clamp(x - (drag.dx / spareX) * 100) : x,
    focusY: movable(spareY) ? clamp(y - (drag.dy / spareY) * 100) : y,
  };
}
