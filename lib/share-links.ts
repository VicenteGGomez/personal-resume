import { normalizeTag } from "@/lib/source-tags";

/**
 * Tagged sharing links.
 *
 * Every link you hand out carries a `?src=` tag, which the tracker stores and
 * the dashboard groups under "Origen de las visitas" (see
 * `lib/analytics-server.ts`). The tag sticks for the whole visit, so a CV
 * download can be traced back to the channel that brought the person in.
 * Which tags exist, and what they're called, is your own editable list (see
 * `lib/source-tags.ts`).
 *
 * Shared by the admin sharing panel and the public share dialog — no
 * server-only imports here.
 */

/**
 * Public address of the site. Links and QR codes always point here, even when
 * the admin panel is being used from localhost or a preview deployment — you
 * never want to print a QR aiming at `localhost`.
 */
export const SITE_ORIGIN = "https://resume.vicentegomez.cl";

/** Tag used by the share dialog on the public site (visitor passes it on). */
export const RESHARE_TAG = "reshare";

export interface ShareTarget {
  path: string;
  label: string;
  hint: string;
}

export const SHARE_TARGETS: ShareTarget[] = [
  { path: "/en", label: "CV en inglés", hint: "La portada, en inglés." },
  { path: "/es", label: "CV en español", hint: "La portada, en español." },
  {
    path: "/en#more",
    label: "Proyectos y publicaciones",
    hint: "El CV en inglés, abierto en el bloque «More about me».",
  },
  {
    path: "/cv",
    label: "PDF del CV (inglés)",
    hint: "Abre el PDF directamente, sin pasar por el sitio.",
  },
];

/**
 * `https://host/en?src=linkedin` — an untagged path when the tag is empty. A
 * path may carry a `#fragment` (e.g. `/en#more`); it is kept last so the tag
 * stays a real query parameter the tracker can read.
 */
export function buildShareUrl(
  origin: string,
  path: string,
  tag: string,
): string {
  const clean = normalizeTag(tag);
  const hashAt = path.indexOf("#");
  const pathname = hashAt === -1 ? path : path.slice(0, hashAt);
  const fragment = hashAt === -1 ? "" : path.slice(hashAt);
  const base = `${origin.replace(/\/$/, "")}${pathname}`;
  return clean ? `${base}?src=${clean}${fragment}` : `${base}${fragment}`;
}

/** URL of the QR image for a link (see `app/api/qr/route.ts`). */
export function qrImageUrl(
  target: string,
  { format = "svg", size }: { format?: "svg" | "png"; size?: number } = {},
): string {
  const params = new URLSearchParams({ u: target });
  if (format === "png") params.set("fmt", "png");
  if (size) params.set("size", String(size));
  return `/api/qr?${params.toString()}`;
}
