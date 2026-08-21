/**
 * Tagged sharing links.
 *
 * Every link you hand out carries a `?src=` tag, which the tracker stores and
 * the dashboard groups under "Origen de las visitas" (see
 * `lib/analytics-server.ts`). The tag sticks for the whole visit, so a CV
 * download can be traced back to the channel that brought the person in.
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

export interface ShareChannel {
  /** The `?src=` value. Keep it short, lowercase and stable. */
  tag: string;
  label: string;
  /** What this link is for, shown under the label in the admin panel. */
  hint: string;
  emoji: string;
}

export const SHARE_CHANNELS: ShareChannel[] = [
  {
    tag: "linkedin",
    label: "LinkedIn",
    hint: "Tu perfil, un post o un mensaje directo.",
    emoji: "💼",
  },
  {
    tag: "instagram",
    label: "Instagram",
    hint: "Bio, historia o DM.",
    emoji: "📸",
  },
  {
    tag: "whatsapp",
    label: "WhatsApp",
    hint: "Chats y grupos.",
    emoji: "💬",
  },
  {
    tag: "qr",
    label: "QR impreso",
    hint: "CV en papel, tarjeta, presentación o pantalla.",
    emoji: "🔳",
  },
  {
    tag: "email",
    label: "Correo",
    hint: "Postulaciones y contactos por mail.",
    emoji: "✉️",
  },
  {
    tag: RESHARE_TAG,
    label: "Reenvíos desde el sitio",
    hint: "Se aplica solo: es el enlace del botón «Compartir» que ven los visitantes.",
    emoji: "🔁",
  },
];

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
 * Turn anything typed into a usable tag: "Feria Empleo UC3M!" → "feria-empleo-uc3m".
 * Accents are folded and spaces become dashes; the tracker sanitises again on
 * the way in, so what you see here is what the dashboard will group by.
 */
export function normalizeTag(tag: string): string {
  return tag
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 24)
    .replace(/^-+|-+$/g, "");
}

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
