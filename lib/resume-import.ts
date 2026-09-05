import {
  type Award,
  type Course,
  type Education,
  type Experience,
  type ExperienceRole,
  type Highlight,
  type LangContent,
  type Skill,
  type Volunteering,
  experienceRoles,
  withRoles,
} from "@/lib/resume-content";
import type { ParsedDocument, ParsedItem } from "@/lib/resume-markdown-parse";
import {
  LIST_SECTIONS,
  NAV_IDS,
  SCALAR_SECTIONS,
  SECTIONS,
} from "@/lib/resume-markdown-format";

/**
 * Turning a pasted Markdown document into a reviewable set of changes.
 *
 * {@link planImport} says what the paste would do to one language, grouped by
 * item the way the translation panel is — "Experiencia #1 · Bridge Ventures
 * Group", not a heap of loose fields — and {@link applyImport} carries out the
 * groups that were ticked. Nothing is written until then.
 *
 * Two rules decide what a paste is allowed to mean, and both exist because the
 * document is written by an AI that can run out of room mid-answer:
 *
 *   - **A section that is not in the document is not touched.** Only the lists
 *     that appear are treated as complete; see `ParsedDocument.sections`.
 *   - **Anything that erases is opt-in.** Deleting an item, dropping a position
 *     from a company, or replacing text with nothing arrives unticked and has
 *     to be chosen by hand. Everything else — edits and new items — arrives
 *     ticked, ready to publish.
 */

export type ChangeKind = "edit" | "add" | "remove";

/** One field of a group, before and after. */
export interface ImportField {
  label: string;
  multiline: boolean;
  before: string;
  after: string;
}

export interface ImportGroup {
  /** Identity of the tick box, and what {@link applyImport} reads back. */
  key: string;
  title: string;
  kind: ChangeKind;
  /** Applying this would erase something that exists today. */
  destructive: boolean;
  fields: ImportField[];
}

export interface ImportPlan {
  groups: ImportGroup[];
  /** Lists the document puts in a different order than the site has today. */
  reordered: string[];
  /** Everything worth reading before publishing, the parser's notes included. */
  warnings: string[];
}

/** The groups that start ticked: everything that does not erase. */
export function defaultSelection(plan: ImportPlan): Set<string> {
  return new Set(plan.groups.filter((g) => !g.destructive).map((g) => g.key));
}

/* -------------------------------------------------------------------------- */
/* Labels                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * What each field is called in the review panel, and whether it holds a
 * paragraph or a line. Deliberately the same words the translation panel uses
 * (`lib/translation-sync.ts`), so the same item reads the same in both.
 */
const FIELD_LABELS: Record<string, { label: string; multiline?: true }> = {
  badgeEnabled: { label: "Insignia visible" },
  badge: { label: "Insignia de disponibilidad" },
  subtitle: { label: "Subtítulo" },
  description: { label: "Descripción", multiline: true },
  primaryCta: { label: "Botón principal" },
  secondaryCta: { label: "Botón secundario" },
  aboutTitle: { label: "Título de la sección" },
  about: { label: "Texto", multiline: true },
  publicationsNav: { label: "Enlace del menú" },
  publicationsTitle: { label: "Título" },
  publicationsIntro: { label: "Introducción", multiline: true },
  publicationsEmpty: { label: "Texto cuando no hay publicaciones" },
  contactTitle: { label: "Título" },
  contactText: { label: "Texto", multiline: true },
  metaTitle: { label: "Título de la página" },
  metaDescription: { label: "Descripción para buscadores", multiline: true },
};

/** Field labels inside an item, per section. */
const ITEM_LABELS: Record<string, Record<string, { label: string; multiline?: true }>> =
  {
    Highlights: { value: { label: "Valor" }, label: { label: "Etiqueta" } },
    Experience: { place: { label: "Compañía / lugar" } },
    Education: {
      title: { label: "Título / programa" },
      place: { label: "Institución" },
      date: { label: "Fecha" },
      text: { label: "Texto", multiline: true },
    },
    Skills: { title: { label: "Título" }, text: { label: "Texto", multiline: true } },
    Awards: {
      title: { label: "Título" },
      place: { label: "Otorgado por" },
      date: { label: "Fecha" },
      text: { label: "Texto", multiline: true },
    },
    Courses: {
      title: { label: "Título" },
      place: { label: "Institución" },
      date: { label: "Fecha" },
      text: { label: "Texto", multiline: true },
      certificateUrl: { label: "Enlace al certificado" },
    },
    Volunteering: {
      title: { label: "Cargo" },
      place: { label: "Organización" },
      date: { label: "Fecha" },
      text: { label: "Texto", multiline: true },
    },
  };

/** The `- **Key:**` lines of a position, in the order they are shown. */
const ROLE_FIELDS: Array<{ field: string; label: string; multiline?: true }> = [
  { field: "role", label: "Cargo" },
  { field: "date", label: "Fecha" },
  { field: "text", label: "Descripción", multiline: true },
  { field: "skills", label: "Habilidades" },
];

/** Spanish name of a `##` section, for the group titles. */
const SECTION_LABELS: Record<string, string> = {
  Header: "Encabezado",
  Navigation: "Menú de navegación",
  About: "Sobre mí",
  "More about me": "Bloque «More about me»",
  Contact: "Contacto",
  SEO: "SEO / metadatos",
};

/* -------------------------------------------------------------------------- */
/* Planning                                                                   */
/* -------------------------------------------------------------------------- */

/** What the pasted document would change about `current`, group by group. */
export function planImport(
  current: LangContent,
  doc: ParsedDocument,
): ImportPlan {
  const plan: ImportPlan = {
    groups: [],
    reordered: [],
    warnings: [...doc.warnings],
  };

  for (const section of SECTIONS) {
    if (!doc.sections.has(section.key)) continue;
    if (section.kind === "scalar") scalarGroup(section.key, current, doc, plan);
    else if (section.kind === "nav") navGroup(current, doc, plan);
    else listGroups(section.key, current, doc, plan);
  }

  return plan;
}

/** One group per scalar section: its handful of fields, reviewed together. */
function scalarGroup(
  key: string,
  current: LangContent,
  doc: ParsedDocument,
  plan: ImportPlan,
) {
  const spec = SCALAR_SECTIONS[key];
  const fields: ImportField[] = [];

  for (const f of spec.meta) {
    if (f.boolean) {
      const after = doc.booleans[f.field];
      if (after === undefined) continue;
      const before = Boolean(current[f.field as keyof LangContent]);
      if (before === after) continue;
      fields.push({
        label: FIELD_LABELS[f.field].label,
        multiline: false,
        before: before ? "Sí" : "No",
        after: after ? "Sí" : "No",
      });
      continue;
    }
    pushField(fields, f.field, current, doc.scalars[f.field]);
  }
  if (spec.body) pushField(fields, spec.body.field, current, doc.scalars[spec.body.field]);

  if (fields.length) {
    plan.groups.push({
      key: `scalar:${key}`,
      title: SECTION_LABELS[key] ?? key,
      kind: "edit",
      destructive: fields.some(erases),
      fields,
    });
  }
}

/** The seven nav labels, reviewed as one group. */
function navGroup(current: LangContent, doc: ParsedDocument, plan: ImportPlan) {
  const byId = new Map((current.nav ?? []).map((n) => [n.id, n.label ?? ""]));
  const fields: ImportField[] = [];
  for (const id of NAV_IDS) {
    const after = doc.nav[id];
    if (after === undefined) continue;
    const before = byId.get(id) ?? "";
    if (before === after) continue;
    fields.push({ label: `Etiqueta: ${id}`, multiline: false, before, after });
  }
  if (fields.length) {
    plan.groups.push({
      key: "nav",
      title: SECTION_LABELS.Navigation,
      kind: "edit",
      destructive: fields.some(erases),
      fields,
    });
  }
}

/** A list section: its own title, then one group per item added, changed or gone. */
function listGroups(
  key: string,
  current: LangContent,
  doc: ParsedDocument,
  plan: ImportPlan,
) {
  const spec = LIST_SECTIONS[key];

  if (spec.titleField) {
    const fields: ImportField[] = [];
    pushField(fields, spec.titleField, current, doc.scalars[spec.titleField], {
      label: "Título de la sección",
    });
    if (fields.length) {
      plan.groups.push({
        key: `title:${key}`,
        title: `${spec.label} · título de la sección`,
        kind: "edit",
        destructive: fields.some(erases),
        fields,
      });
    }
  }

  const items = listOf(current, spec.field);
  const parsed = doc.lists[key] ?? [];
  const { pairs, removed, byPosition, reordered } = pairItems(
    items,
    parsed,
    spec.identified,
  );
  // A section that came back empty has no ids to have lost, so pairing it by
  // position says nothing worth warning about.
  if (byPosition && spec.identified && parsed.length > 0 && items.length > 0) {
    plan.warnings.push(
      `«${key}» volvió sin los comentarios \`<!-- id: … -->\`, así que sus ` +
        "elementos se emparejaron por posición. Revisa bien esa sección.",
    );
  }
  if (reordered) plan.reordered.push(spec.label);

  pairs.forEach(({ doc: docIndex, cur }, i) => {
    const item = parsed[docIndex];
    const title = (label: string) =>
      `${spec.label} #${i + 1}${label ? ` · ${label}` : ""}`;

    if (cur === null) {
      const fields =
        key === "Experience"
          ? experienceFields(null, item)
          : itemFields(key, spec, null, item);
      plan.groups.push({
        key: `add:${key}:${docIndex}`,
        title: title(String(item.fields[spec.heading] ?? "")),
        kind: "add",
        destructive: false,
        fields,
      });
      return;
    }

    const before = items[cur];
    const fields =
      key === "Experience"
        ? experienceFields(before as unknown as Experience, item)
        : itemFields(key, spec, before, item);
    if (!fields.length) return;
    plan.groups.push({
      key: `edit:${key}:${docIndex}`,
      title: title(String(before[spec.heading] ?? "")),
      kind: "edit",
      destructive: fields.some(erases),
      fields,
    });
  });

  for (const cur of removed) {
    const before = items[cur];
    const fields =
      key === "Experience"
        ? experienceFields(before as unknown as Experience, null)
        : itemFields(key, spec, before, null);
    plan.groups.push({
      key: `remove:${key}:${cur}`,
      title: `${spec.label} · eliminar «${
        String(before[spec.heading] ?? "") || "—"
      }»`,
      kind: "remove",
      destructive: true,
      fields,
    });
  }
}

/* -------------------------------------------------------------------------- */
/* Field-level diffing                                                        */
/* -------------------------------------------------------------------------- */

/** Add a `LangContent` field to `fields` when the document changes it. */
function pushField(
  fields: ImportField[],
  field: string,
  current: LangContent,
  after: string | undefined,
  override?: { label: string },
) {
  if (after === undefined) return;
  const before = String(current[field as keyof LangContent] ?? "");
  if (before === after) return;
  const spec = FIELD_LABELS[field];
  fields.push({
    label: override?.label ?? spec?.label ?? field,
    multiline: Boolean(spec?.multiline),
    before,
    after,
  });
}

/** The changed fields of one plain item, in the order the section lists them. */
function itemFields(
  key: string,
  spec: (typeof LIST_SECTIONS)[string],
  before: Record<string, unknown> | null,
  after: ParsedItem | null,
): ImportField[] {
  const labels = ITEM_LABELS[key] ?? {};
  const order = [spec.heading, ...spec.meta.map((m) => m.field)];
  if (spec.body) order.push(spec.body);

  const out: ImportField[] = [];
  for (const field of order) {
    const was = String(before?.[field] ?? "");
    const now = after ? String(after.fields[field] ?? "") : "";
    if (before && after && was === now) continue;
    if (!was && !now) continue;
    out.push({
      label: labels[field]?.label ?? field,
      multiline: Boolean(labels[field]?.multiline),
      before: was,
      after: now,
    });
  }
  return out;
}

/**
 * The changed fields of one company: its name, then every position under it,
 * matched the same way the companies themselves are. A position the document
 * drops shows up as its fields going blank — which is what makes the whole
 * group count as erasing, and so arrive unticked.
 */
function experienceFields(
  before: Experience | null,
  after: ParsedItem | null,
): ImportField[] {
  const out: ImportField[] = [];
  const wasPlace = before?.place ?? "";
  const nowPlace = after ? String(after.fields.place ?? "") : "";
  if (wasPlace !== nowPlace && (wasPlace || nowPlace)) {
    out.push({
      label: ITEM_LABELS.Experience.place.label,
      multiline: false,
      before: wasPlace,
      after: nowPlace,
    });
  }

  const currentRoles = before ? experienceRoles(before) : [];
  const parsedRoles = after?.roles ?? [];
  const { pairs, removed } = pairItems(
    currentRoles as unknown as Array<Record<string, unknown>>,
    parsedRoles,
    true,
  );

  const many = Math.max(currentRoles.length, parsedRoles.length) > 1;
  const row = (index: number, field: (typeof ROLE_FIELDS)[number], was: string, now: string) => {
    if (was === now || (!was && !now)) return;
    out.push({
      label: `${many ? `Cargo ${index + 1} · ` : ""}${field.label}`,
      multiline: Boolean(field.multiline),
      before: was,
      after: now,
    });
  };

  pairs.forEach(({ doc: docIndex, cur }, i) => {
    const parsed = parsedRoles[docIndex];
    const role = cur === null ? null : currentRoles[cur];
    for (const field of ROLE_FIELDS) {
      row(
        i,
        field,
        String(role?.[field.field as keyof ExperienceRole] ?? ""),
        String(parsed.fields[field.field] ?? ""),
      );
    }
  });
  for (const cur of removed) {
    const role = currentRoles[cur];
    for (const field of ROLE_FIELDS) {
      row(cur, field, String(role[field.field as keyof ExperienceRole] ?? ""), "");
    }
  }
  return out;
}

/** True when a field replaces something with nothing. */
function erases(field: ImportField): boolean {
  return field.before.trim() !== "" && field.after.trim() === "";
}

/* -------------------------------------------------------------------------- */
/* Pairing the document's items with the ones on the site                     */
/* -------------------------------------------------------------------------- */

interface Pairing {
  /** Document items in document order, each with the item it replaces. */
  pairs: Array<{ doc: number; cur: number | null }>;
  /** Indexes of items the document has no counterpart for. */
  removed: number[];
  /** True when ids were unavailable and positions had to stand in for them. */
  byPosition: boolean;
  /** True when the document's order differs from the one on the site. */
  reordered: boolean;
}

/**
 * Which item on the site each item in the document is.
 *
 * Ids decide it whenever the document still carries them: that is what tells
 * "Analyst" renamed to "Senior Analyst" apart from one deleted and another
 * added, and it is what keeps the projects and awards anchored to an item from
 * coming loose. When an identified section comes back with **no** ids at all —
 * an AI that dropped every comment — falling back to position is much kinder
 * than treating the whole list as deleted and rewritten, so that is what
 * happens, and the caller says so out loud.
 */
function pairItems(
  current: Array<Record<string, unknown>>,
  parsed: ParsedItem[],
  identified: boolean,
): Pairing {
  const useIds = identified && parsed.some((p) => p.id);
  const pairs: Array<{ doc: number; cur: number | null }> = [];
  const taken = new Set<number>();

  if (useIds) {
    const byId = new Map<string, number>();
    current.forEach((item, i) => {
      const id = String(item.id ?? "").trim();
      if (id && !byId.has(id)) byId.set(id, i);
    });
    parsed.forEach((item, i) => {
      const cur = item.id ? byId.get(item.id) : undefined;
      if (cur === undefined || taken.has(cur)) {
        pairs.push({ doc: i, cur: null });
        return;
      }
      taken.add(cur);
      pairs.push({ doc: i, cur });
    });
  } else {
    parsed.forEach((_, i) => {
      const cur = i < current.length ? i : null;
      if (cur !== null) taken.add(cur);
      pairs.push({ doc: i, cur });
    });
  }

  const removed = current.map((_, i) => i).filter((i) => !taken.has(i));
  const matched = pairs.map((p) => p.cur).filter((c): c is number => c !== null);
  const reordered = matched.some((c, i) => i > 0 && c < matched[i - 1]);

  return { pairs, removed, byPosition: !useIds && identified, reordered };
}

/* -------------------------------------------------------------------------- */
/* Applying                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * `current` with every ticked group carried out. Groups left unticked are not
 * applied at all — an item whose deletion was not chosen stays where it was,
 * an item whose edit was not chosen keeps the text it has.
 */
export function applyImport(
  current: LangContent,
  doc: ParsedDocument,
  selected: ReadonlySet<string>,
): LangContent {
  const next: LangContent = structuredClone(current);

  for (const section of SECTIONS) {
    if (!doc.sections.has(section.key)) continue;

    if (section.kind === "scalar") {
      if (!selected.has(`scalar:${section.key}`)) continue;
      const spec = SCALAR_SECTIONS[section.key];
      for (const f of spec.meta) {
        if (f.boolean) {
          const value = doc.booleans[f.field];
          if (value !== undefined) assign(next, f.field, value);
        } else if (doc.scalars[f.field] !== undefined) {
          assign(next, f.field, doc.scalars[f.field]);
        }
      }
      if (spec.body && doc.scalars[spec.body.field] !== undefined) {
        assign(next, spec.body.field, doc.scalars[spec.body.field]);
      }
      continue;
    }

    if (section.kind === "nav") {
      if (!selected.has("nav")) continue;
      next.nav = (next.nav ?? []).map((item) =>
        doc.nav[item.id] === undefined
          ? item
          : { ...item, label: doc.nav[item.id] },
      );
      continue;
    }

    const spec = LIST_SECTIONS[section.key];
    if (spec.titleField && selected.has(`title:${section.key}`)) {
      const value = doc.scalars[spec.titleField];
      if (value !== undefined) assign(next, spec.titleField, value);
    }
    assign(
      next,
      spec.field,
      applyList(section.key, listOf(current, spec.field), doc, selected),
    );
  }

  return next;
}

/**
 * One list rebuilt. The document's order wins for everything it mentions;
 * anything whose deletion was not ticked is put back where it used to be.
 */
function applyList(
  key: string,
  items: Array<Record<string, unknown>>,
  doc: ParsedDocument,
  selected: ReadonlySet<string>,
): unknown[] {
  const spec = LIST_SECTIONS[key];
  const parsed = doc.lists[key] ?? [];
  const { pairs, removed } = pairItems(items, parsed, spec.identified);
  const out: unknown[] = [];

  for (const { doc: docIndex, cur } of pairs) {
    const item = parsed[docIndex];
    if (cur === null) {
      if (selected.has(`add:${key}:${docIndex}`)) out.push(buildItem(key, null, item));
      continue;
    }
    out.push(
      selected.has(`edit:${key}:${docIndex}`)
        ? buildItem(key, items[cur], item)
        : items[cur],
    );
  }

  // Kept items go back at the index they had, so a list that was only partly
  // rewritten does not quietly pile its survivors at the end.
  for (const cur of removed) {
    if (selected.has(`remove:${key}:${cur}`)) continue;
    out.splice(Math.min(cur, out.length), 0, items[cur]);
  }
  return out;
}

/**
 * One item of `key`, built from what the document says and whatever the item it
 * replaces was carrying that the document does not describe — its id above all,
 * and an award's association with another résumé item.
 */
function buildItem(
  key: string,
  before: Record<string, unknown> | null,
  item: ParsedItem,
): unknown {
  const id = String(before?.id ?? item.id ?? "");
  const f = item.fields;

  switch (key) {
    case "Highlights":
      return { value: f.value ?? "", label: f.label ?? "" } satisfies Highlight;
    case "Skills":
      return { title: f.title ?? "", text: f.text ?? "" } satisfies Skill;
    case "Education":
      return {
        id,
        title: f.title ?? "",
        place: f.place ?? "",
        date: f.date ?? "",
        text: f.text ?? "",
      } satisfies Education;
    case "Awards":
      return {
        id,
        title: f.title ?? "",
        place: f.place ?? "",
        date: f.date ?? "",
        text: f.text ?? "",
        // Associations are plumbing between items, not content: the document
        // carries them so it reads whole, but only the admin tabs change them.
        anchorType: (before?.anchorType as Award["anchorType"]) ?? "",
        anchorId: String(before?.anchorId ?? ""),
      } satisfies Award;
    case "Courses":
      return {
        id,
        title: f.title ?? "",
        place: f.place ?? "",
        date: f.date ?? "",
        text: f.text ?? "",
        certificateUrl: f.certificateUrl ?? "",
      } satisfies Course;
    case "Volunteering":
      return {
        id,
        title: f.title ?? "",
        place: f.place ?? "",
        date: f.date ?? "",
        text: f.text ?? "",
      } satisfies Volunteering;
    case "Experience":
      return buildExperience(before as Experience | null, item);
    default:
      return before ?? {};
  }
}

/** A company with its positions rebuilt, ids kept wherever they still match. */
function buildExperience(before: Experience | null, item: ParsedItem): Experience {
  const currentRoles = before ? experienceRoles(before) : [];
  const parsedRoles = item.roles ?? [];
  const { pairs } = pairItems(
    currentRoles as unknown as Array<Record<string, unknown>>,
    parsedRoles,
    true,
  );

  const roles: ExperienceRole[] = pairs.map(({ doc: docIndex, cur }) => {
    const parsed = parsedRoles[docIndex];
    return {
      // A position the document brought back keeps its id, so the projects and
      // posts anchored to it keep resolving. A new one is left blank and gets
      // one minted on save (see `normalizeExperienceRoles`).
      id: cur === null ? parsed.id : currentRoles[cur].id,
      role: parsed.fields.role ?? "",
      date: parsed.fields.date ?? "",
      text: parsed.fields.text ?? "",
      skills: parsed.fields.skills ?? "",
    };
  });

  const base: Experience = {
    ...(before ?? { id: item.id, role: "", date: "", text: "", skills: "" }),
    id: before?.id ?? item.id,
    place: item.fields.place ?? "",
  };
  return withRoles(base, roles);
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * `LangContent`'s fields are addressed by name here, because the format specs
 * the writer, the reader and this module share name them as strings. The one
 * cast that costs lives in these two helpers.
 */
function listOf(content: LangContent, field: string): Array<Record<string, unknown>> {
  const value = content[field as keyof LangContent];
  return Array.isArray(value)
    ? (value as unknown as Array<Record<string, unknown>>).filter(Boolean)
    : [];
}

function assign(content: LangContent, field: string, value: unknown): void {
  (content as unknown as Record<string, unknown>)[field] = value;
}
