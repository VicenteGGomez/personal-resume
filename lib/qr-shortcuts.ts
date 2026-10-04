/**
 * The `/qr` shortcut: one place to pick what to share (CV, LinkedIn, WhatsApp,
 * a web page, a contact card or any link) and get a tagged link + QR for it.
 *
 * Everything it hands out points at this site, even when the destination is
 * elsewhere: `/linkedin`, `/whatsapp`, `/clases` and `/go` count the hit and
 * then redirect (see `lib/tracked-redirect.ts`), so a share is measured the
 * same way whether it lands on the résumé or leaves it.
 *
 * Shared by the `/qr` page (client) and the routes behind it — no server-only
 * imports here.
 */

import { SITE_ORIGIN, normalizeTag } from "@/lib/share-links";

/** The tag every link made from `/qr` starts with. */
export const QR_TAG = "qr";

/**
 * Where `/clases` sends people: the classes site, a separate project. Its own
 * `?src=` tells that site the visit came from here.
 */
export const CLASES_URL = "https://www.vicentegomez.cl/?src=qr-cv";

export type ShareLang = "en" | "es";

/**
 * `qr`, or `qr-feria-uc3m` when a context was typed. The dashboard labels
 * every `qr-*` tag as a QR share, so the context reads as a detail of it.
 */
export function qrTag(context: string): string {
  const clean = normalizeTag(context);
  return clean ? normalizeTag(`${QR_TAG}-${clean}`) : QR_TAG;
}

/** `https://site/path?…&src=tag`, keeping any query the path already has. */
export function trackedUrl(
  path: string,
  tag: string,
  params: Record<string, string> = {},
): string {
  const url = new URL(path, SITE_ORIGIN);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  if (tag) url.searchParams.set("src", tag);
  return url.toString();
}

/* -------------------------------------------------------------------------- */
/* Contact card                                                               */
/* -------------------------------------------------------------------------- */

export type VcardField =
  | "name"
  | "phone"
  | "email"
  | "linkedin"
  | "web"
  | "clases"
  | "location"
  | "title";

export const VCARD_FIELDS: {
  key: VcardField;
  label: string;
  defaultOn: boolean;
}[] = [
  { key: "name", label: "Nombre", defaultOn: true },
  { key: "phone", label: "Teléfono", defaultOn: true },
  { key: "email", label: "Correo", defaultOn: true },
  { key: "linkedin", label: "LinkedIn", defaultOn: false },
  { key: "web", label: "Web CV", defaultOn: false },
  { key: "clases", label: "Web clases", defaultOn: false },
  { key: "location", label: "Ubicación", defaultOn: false },
  { key: "title", label: "Cargo actual", defaultOn: false },
];

export const DEFAULT_VCARD_FIELDS: VcardField[] = VCARD_FIELDS.filter(
  (field) => field.defaultOn,
).map((field) => field.key);

/** `name-phone-email`: dashes, so the QR's URL stays free of `%2C`. */
export function encodeVcardFields(fields: VcardField[]): string {
  return fields.join("-");
}

/** The fields asked for, in display order; the defaults when none parse. */
export function decodeVcardFields(raw: string | null): VcardField[] {
  if (!raw) return DEFAULT_VCARD_FIELDS;
  const asked = new Set(raw.split("-"));
  const fields = VCARD_FIELDS.map((field) => field.key).filter((key) =>
    asked.has(key),
  );
  return fields.length > 0 ? fields : DEFAULT_VCARD_FIELDS;
}
