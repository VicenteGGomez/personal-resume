/**
 * Your own names for the `?src=` tags.
 *
 * A tag is whatever follows `?src=` in a link you handed out — `gmail`,
 * `uc3m-gmail`, `cvenweb`. The tracker stores it as-is; this list is what turns
 * it back into something readable in the dashboard, and decides which tags get
 * a ready-to-copy link in /admin/share. A hidden tag keeps its name in the stats
 * but has no card there: handy for short or one-off tags you only want to
 * recognise.
 *
 * The same list can name a referrer host too (`l.instagram.com`), since the
 * dashboard groups both in «Origen de las visitas».
 *
 * Shared by the admin pages and the server store — no server-only imports.
 */

export interface SourceTag {
  /** The `?src=` value, as the tracker stores it. */
  tag: string;
  /** What you call it, e.g. «Firma del correo UC3M». */
  label: string;
  /** Where the link lives or what it's for. Optional. */
  note: string;
  emoji: string;
  /** Recognised in the stats, but no link card in /admin/share. */
  hidden: boolean;
}

/** Same characters the tracker keeps (see `lib/analytics-server.ts`). */
const TAG_MAX = 32;

/**
 * Turn anything typed into a usable tag: "Feria Empleo UC3M!" → "feria-empleo-uc3m".
 * Accents are folded and spaces become dashes; dots stay, so a domain such as
 * `vicentegomez.cl` survives. What you see here is what the dashboard groups by.
 */
export function normalizeTag(tag: string): string {
  return tag
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9.-]/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, TAG_MAX)
    .replace(/^[-.]+|[-.]+$/g, "");
}

function str(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

const MAX_TAGS = 100;

/** Coerce stored or client-sent tags into the shape above, one per tag. */
export function normalizeSourceTags(input: unknown): SourceTag[] {
  const raw = Array.isArray(input)
    ? input
    : Array.isArray((input as { tags?: unknown })?.tags)
      ? ((input as { tags: unknown[] }).tags as unknown[])
      : [];
  const seen = new Set<string>();
  const out: SourceTag[] = [];
  for (const item of raw.slice(0, MAX_TAGS)) {
    const entry = (item ?? {}) as Partial<Record<keyof SourceTag, unknown>>;
    const tag = normalizeTag(str(entry.tag, 64));
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    out.push({
      tag,
      label: str(entry.label, 60) || tag,
      note: str(entry.note, 140),
      emoji: str(entry.emoji, 8) || "🏷️",
      hidden: entry.hidden === true,
    });
  }
  return out;
}

/** What the list holds until you first save it. */
export const DEFAULT_SOURCE_TAGS: SourceTag[] = [
  { tag: "linkedin", label: "LinkedIn", note: "Tu perfil, un post o un mensaje directo.", emoji: "💼", hidden: false },
  { tag: "instagram", label: "Instagram", note: "Bio, historia o DM.", emoji: "📸", hidden: false },
  { tag: "whatsapp", label: "WhatsApp", note: "Chats y grupos.", emoji: "💬", hidden: false },
  { tag: "qr", label: "QR", note: "CV en papel, tarjeta o pantalla, y todo lo compartido desde /qr (qr-<contexto>).", emoji: "🔳", hidden: false },
  { tag: "vcard", label: "Desde tu contacto (vCard)", note: "Los enlaces dentro del contacto que entrega /vcard.", emoji: "👤", hidden: false },
  { tag: "email", label: "Correo personal", note: "Postulaciones y contactos por mail.", emoji: "✉️", hidden: false },
  { tag: "gmail", label: "Firma del correo UChile", note: "Pie de firma de la cuenta de la Universidad de Chile.", emoji: "🎓", hidden: false },
  { tag: "uc3m-gmail", label: "Firma del correo UC3M", note: "Pie de firma de la cuenta de la UC3M.", emoji: "🎓", hidden: false },
  { tag: "firma", label: "Firma de correo", note: "Pie de firma genérico.", emoji: "✍️", hidden: false },
  { tag: "cvenweb", label: "CV en PDF (inglés)", note: "Enlace dentro del CV en inglés descargado de la web.", emoji: "📄", hidden: true },
  { tag: "cventoesweb", label: "CV en inglés → versión en español", note: "«Versión en español», desde el PDF en inglés.", emoji: "📄", hidden: true },
  { tag: "cv-pdf", label: "CV en PDF", note: "Enlaces dentro de un CV en PDF.", emoji: "📄", hidden: false },
  { tag: "vicentegomez.cl", label: "vicentegomez.cl/cv", note: "La redirección desde el dominio principal.", emoji: "🌐", hidden: true },
];

/** `tag → label`, for the dashboard. */
export function sourceLabelMap(tags: SourceTag[]): Record<string, string> {
  return Object.fromEntries(tags.map((entry) => [entry.tag, entry.label]));
}
