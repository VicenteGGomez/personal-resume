import {
  type Experience,
  type Lang,
  type LangContent,
  type NavItem,
  type SectionId,
  experienceRoles,
  withRoles,
} from "@/lib/resume-content";

/**
 * Pairing the two language versions of the résumé, field by field.
 *
 * The English and Spanish content are two objects of the same shape
 * (`LangContent`), edited in separate tabs, so it is easy to change one and
 * forget the other. This module describes that shape as a flat list of
 * translatable **groups** — one per item ("Experiencia #1 · Bridge Ventures
 * Group"), not one per field — and uses it for three things:
 *
 *   1. {@link diffTranslations} — what changed in one language since the last
 *      save, paired with what the other language currently says.
 *   2. {@link applyTranslations} — write the reviewed values back.
 *   3. The pending queue (`lib/translation-queue.ts`), which stores group and
 *      field keys and re-resolves their values when the panel is reopened.
 *
 * Only `LangContent` is covered. `shared` (name, photo, links, publications)
 * and `projects` are not per-language — the "More about me" block is shown in
 * English on both résumés — so there is nothing to pair for them.
 *
 * Two languages are matched **by position** (`slot`): "Experiencia #1" pairs
 * with "Experiencia #1", which is how the two tabs are kept in step, and it
 * still works when the ids drifted apart (an item added in one tab gets its own
 * id). Against its own previous version a group is matched **by id** (`key`)
 * where it has one, so reordering a list is not mistaken for an edit.
 */

/* -------------------------------------------------------------------------- */
/* Shapes                                                                     */
/* -------------------------------------------------------------------------- */

/** One translatable field inside a group. */
export interface TranslatableField {
  /** Identifies the field within its group: "place", "role#0:text", "label". */
  fieldKey: string;
  label: string;
  /** Rendered as a textarea rather than a single-line input. */
  multiline: boolean;
  value: string;
}

export interface TranslatableGroup {
  /**
   * Identity used by the pending queue and by the diff against the same
   * language: id-based where the item has an id (`experience:exp-bridge`),
   * position-based otherwise (`highlight:#2`).
   */
  key: string;
  /**
   * Position-based address of the item within its own language:
   * `experience:#0`. The panel keys its edits by this, and
   * {@link applyTranslations} pairs it with the other language.
   */
  slot: string;
  /** The list this group belongs to ("experience"), or "" for a fixed group. */
  kind: string;
  /** The item's own id, when it has one — the strongest pairing signal. */
  itemId: string;
  /** Position within its list. */
  index: number;
  /** "Experiencia #1 · Bridge Ventures Group" */
  title: string;
  fields: TranslatableField[];
}

/** A group with fields that changed, ready for the side-by-side panel. */
export interface TranslationChange {
  key: string;
  slot: string;
  title: string;
  fields: Array<{
    fieldKey: string;
    label: string;
    multiline: boolean;
    /** The value in the language that was edited. */
    from: string;
    /** What the other language says today — the editable default. */
    to: string;
  }>;
}

/** One reviewed value, ready to be written into the target language. */
export interface TranslationEdit {
  slot: string;
  fieldKey: string;
  value: string;
}

/**
 * One deferred group in the bell's list. It stores keys, never values, so
 * reopening it shows what the two languages say now — see
 * {@link selectTranslations} and `lib/translation-queue.ts`.
 */
export interface PendingTranslation {
  /** Group key, e.g. `experience:exp-bridge` or `hero`. */
  key: string;
  /** The language that was edited; the translation goes into the other one. */
  from: Lang;
  /** The group's label when it was queued, shown in the bell list. */
  title: string;
  /** Which fields of the group are waiting. */
  fieldKeys: string[];
  /** ISO timestamp of when it was parked. */
  queuedAt: string;
}

/**
 * Park these changes for later, folding them into whatever is already waiting:
 * one entry per group and direction, with the field lists merged so two edits
 * to the same experience do not become two notifications.
 */
export function mergePending(
  existing: PendingTranslation[],
  changes: TranslationChange[],
  from: Lang,
): PendingTranslation[] {
  const next = [...existing];
  for (const change of changes) {
    const at = next.findIndex((p) => p.key === change.key && p.from === from);
    const fieldKeys = change.fields.map((f) => f.fieldKey);
    if (at === -1) {
      next.push({
        key: change.key,
        from,
        title: change.title,
        fieldKeys,
        queuedAt: new Date().toISOString(),
      });
    } else {
      next[at] = {
        ...next[at],
        // Keep the freshest label: an item renamed since it was queued should
        // show its current name in the bell.
        title: change.title,
        fieldKeys: Array.from(new Set([...next[at].fieldKeys, ...fieldKeys])),
        queuedAt: new Date().toISOString(),
      };
    }
  }
  return next;
}

/** Drop the entries just resolved (or dismissed) from the pending list. */
export function dropPending(
  existing: PendingTranslation[],
  from: Lang,
  keys: string[],
): PendingTranslation[] {
  const gone = new Set(keys);
  return existing.filter((p) => !(p.from === from && gone.has(p.key)));
}

function field(
  fieldKey: string,
  label: string,
  value: string | undefined,
  multiline = false,
): TranslatableField {
  return { fieldKey, label, multiline, value: value ?? "" };
}

/* -------------------------------------------------------------------------- */
/* The map: which fields are translatable, and how they group                 */
/* -------------------------------------------------------------------------- */

/** Single-value fields of `LangContent`, gathered into the cards of the panel. */
const SCALAR_GROUPS: Array<{
  key: string;
  title: string;
  fields: Array<[keyof LangContent & string, string, boolean?]>;
}> = [
  {
    key: "hero",
    title: "Encabezado",
    fields: [
      ["badge", "Insignia de disponibilidad"],
      ["subtitle", "Subtítulo"],
      ["description", "Descripción", true],
      ["primaryCta", "Botón principal"],
      ["secondaryCta", "Botón secundario"],
    ],
  },
  {
    key: "about",
    title: "Sobre mí",
    fields: [
      ["aboutTitle", "Título de la sección"],
      ["about", "Texto", true],
    ],
  },
  {
    key: "sections",
    title: "Títulos de las secciones",
    fields: [
      ["experienceTitle", "Experiencia"],
      ["educationTitle", "Educación"],
      ["skillsTitle", "Habilidades"],
      ["awardsTitle", "Reconocimientos"],
      ["coursesTitle", "Cursos adicionales"],
      ["volunteeringTitle", "Voluntariado"],
    ],
  },
  {
    key: "more",
    title: "Bloque «More about me»",
    fields: [
      ["publicationsNav", "Enlace del menú"],
      ["publicationsTitle", "Título"],
      ["publicationsIntro", "Introducción", true],
      ["publicationsEmpty", "Texto cuando no hay publicaciones"],
    ],
  },
  {
    key: "contact",
    title: "Contacto",
    fields: [
      ["contactTitle", "Título"],
      ["contactText", "Texto", true],
    ],
  },
  {
    key: "seo",
    title: "SEO / metadatos",
    fields: [
      ["metaTitle", "Título de la página"],
      ["metaDescription", "Descripción para buscadores", true],
    ],
  },
];

/** Every `LangContent` key the panel is allowed to write, for validation. */
const SCALAR_KEYS = new Set<string>(
  SCALAR_GROUPS.flatMap((g) => g.fields.map(([key]) => key)),
);

/**
 * The repeatable sections. Each item becomes one group, so every field of
 * "Experiencia #1" is reviewed together instead of scattered among the fields
 * of every other experience.
 */
const LIST_SPECS: Array<{
  kind: string;
  /** Singular name used in the group title. */
  title: string;
  groups: (
    content: LangContent,
  ) => Array<{ id: string; subtitle: string; fields: TranslatableField[] }>;
}> = [
  {
    kind: "highlight",
    title: "Destacado",
    groups: (c) =>
      (c.highlights ?? []).map((h) => ({
        id: "",
        subtitle: h.value ?? "",
        fields: [field("value", "Valor", h.value), field("label", "Etiqueta", h.label)],
      })),
  },
  {
    kind: "experience",
    title: "Experiencia",
    groups: (c) =>
      (c.experiences ?? []).map((exp) => {
        const roles = experienceRoles(exp);
        const many = roles.length > 1;
        return {
          id: exp.id ?? "",
          subtitle: exp.place ?? "",
          fields: [
            field("place", "Compañía / lugar", exp.place),
            ...roles.flatMap((role, i) => {
              const tag = many ? `Cargo ${i + 1} · ` : "";
              return [
                field(`role#${i}:role`, `${tag}Cargo`, role.role),
                field(`role#${i}:date`, `${tag}Fecha`, role.date),
                field(`role#${i}:text`, `${tag}Descripción`, role.text, true),
                field(`role#${i}:skills`, `${tag}Habilidades`, role.skills),
              ];
            }),
          ],
        };
      }),
  },
  {
    kind: "education",
    title: "Educación",
    groups: (c) =>
      (c.education ?? []).map((e) => ({
        id: e.id ?? "",
        subtitle: e.title ?? "",
        fields: [
          field("title", "Título / programa", e.title),
          field("place", "Institución", e.place),
          field("date", "Fecha", e.date),
          field("text", "Texto", e.text, true),
        ],
      })),
  },
  {
    kind: "skill",
    title: "Habilidad",
    groups: (c) =>
      (c.skills ?? []).map((s) => ({
        id: "",
        subtitle: s.title ?? "",
        fields: [
          field("title", "Título", s.title),
          field("text", "Texto", s.text, true),
        ],
      })),
  },
  {
    kind: "award",
    title: "Reconocimiento",
    groups: (c) =>
      (c.awards ?? []).map((a) => ({
        id: a.id ?? "",
        subtitle: a.title ?? "",
        fields: [
          field("title", "Título", a.title),
          field("place", "Otorgado por", a.place),
          field("date", "Fecha", a.date),
          field("text", "Texto", a.text, true),
        ],
      })),
  },
  {
    kind: "course",
    title: "Curso",
    groups: (c) =>
      (c.courses ?? []).map((k) => ({
        id: k.id ?? "",
        subtitle: k.title ?? "",
        fields: [
          field("title", "Título", k.title),
          field("place", "Institución", k.place),
          field("date", "Fecha", k.date),
          field("text", "Texto", k.text, true),
          field("certificateUrl", "Enlace al certificado", k.certificateUrl),
        ],
      })),
  },
  {
    kind: "volunteering",
    title: "Voluntariado",
    groups: (c) =>
      (c.volunteering ?? []).map((v) => ({
        id: v.id ?? "",
        subtitle: v.title ?? "",
        fields: [
          field("title", "Cargo", v.title),
          field("place", "Organización", v.place),
          field("date", "Fecha", v.date),
          field("text", "Texto", v.text, true),
        ],
      })),
  },
];

const LIST_KINDS = new Set(LIST_SPECS.map((s) => s.kind));

/** The `LangContent` array each list kind lives in. */
const LIST_KEYS: Record<string, keyof LangContent> = {
  highlight: "highlights",
  experience: "experiences",
  education: "education",
  skill: "skills",
  award: "awards",
  course: "courses",
  volunteering: "volunteering",
};

/* -------------------------------------------------------------------------- */
/* Describing                                                                 */
/* -------------------------------------------------------------------------- */

/** Every translatable group of one language version, in panel order. */
export function describeGroups(content: LangContent): TranslatableGroup[] {
  const out: TranslatableGroup[] = [];

  for (const spec of SCALAR_GROUPS) {
    out.push({
      key: spec.key,
      slot: spec.key,
      kind: "",
      itemId: "",
      index: 0,
      title: spec.title,
      fields: spec.fields.map(([key, label, multiline]) =>
        field(key, label, content[key] as string, multiline),
      ),
    });
  }

  // The nav is a fixed set of sections, so each label is keyed by section id
  // rather than by position.
  out.push({
    key: "nav",
    slot: "nav",
    kind: "",
    itemId: "",
    index: 0,
    title: "Menú de navegación",
    fields: (content.nav ?? []).map((item) =>
      field(`nav:${item.id}`, `Etiqueta: ${item.id}`, item.label),
    ),
  });

  for (const spec of LIST_SPECS) {
    spec.groups(content).forEach((group, index) => {
      out.push({
        key: group.id ? `${spec.kind}:${group.id}` : `${spec.kind}:#${index}`,
        slot: `${spec.kind}:#${index}`,
        kind: spec.kind,
        itemId: group.id,
        index,
        title: `${spec.title} #${index + 1}${
          group.subtitle ? ` · ${group.subtitle}` : ""
        }`,
        fields: group.fields,
      });
    });
  }

  return out;
}

/* -------------------------------------------------------------------------- */
/* Pairing the two languages                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Which item of `target` says the same thing as each item of `source`.
 *
 * Matching is **by id first, by position second**. Position alone is not
 * enough: the two lists drift (an item added in one tab only), and pairing
 * "Experiencia #3" with the third Spanish experience when Spanish is missing
 * the second one would put the translation on the wrong company — or invent a
 * duplicate. Ids are shared by everything that came from the same seed or was
 * created through this panel, so they pin the pairs down; position covers the
 * rest, including the lists that carry no ids at all (destacados, habilidades).
 *
 * Returns `-1` for a source item the target simply does not have yet. Writing
 * one of those creates it, in place, at the position the source has it (see
 * {@link applyTranslations}).
 */
function pairIndexes(
  source: Array<{ id: string }>,
  target: Array<{ id: string }>,
): number[] {
  const taken = new Set<number>();
  const paired: number[] = source.map(() => -1);

  const byId = new Map<string, number>();
  target.forEach((item, i) => {
    if (item.id && !byId.has(item.id)) byId.set(item.id, i);
  });

  source.forEach((item, i) => {
    if (!item.id) return;
    const at = byId.get(item.id);
    if (at !== undefined && !taken.has(at)) {
      taken.add(at);
      paired[i] = at;
    }
  });

  // Position for whatever is left, as long as that position is free and the
  // item sitting there is not the id-match of some other source item.
  const sourceIds = new Set(source.map((item) => item.id).filter(Boolean));
  source.forEach((item, i) => {
    if (paired[i] !== -1) return;
    const candidate = target[i];
    if (!candidate || taken.has(i)) return;
    if (candidate.id && sourceIds.has(candidate.id)) return;
    taken.add(i);
    paired[i] = i;
  });

  return paired;
}

/** The target group paired with each source group, keyed by the source's key. */
function pairGroups(
  source: TranslatableGroup[],
  target: TranslatableGroup[],
): Map<string, TranslatableGroup | null> {
  const pairs = new Map<string, TranslatableGroup | null>();

  // Scalar groups and the nav are a fixed set: same key, same group.
  const targetByKey = new Map(target.map((g) => [g.key, g]));
  for (const group of source) {
    if (!group.kind) pairs.set(group.key, targetByKey.get(group.key) ?? null);
  }

  for (const spec of LIST_SPECS) {
    const src = source.filter((g) => g.kind === spec.kind);
    const tgt = target.filter((g) => g.kind === spec.kind);
    const paired = pairIndexes(
      src.map((g) => ({ id: g.itemId })),
      tgt.map((g) => ({ id: g.itemId })),
    );
    src.forEach((group, i) => {
      pairs.set(group.key, paired[i] === -1 ? null : tgt[paired[i]]);
    });
  }

  return pairs;
}

/* -------------------------------------------------------------------------- */
/* Diffing                                                                    */
/* -------------------------------------------------------------------------- */

function pairedField(
  group: TranslatableGroup | null | undefined,
  fieldKey: string,
): string {
  return group?.fields.find((f) => f.fieldKey === fieldKey)?.value ?? "";
}

/**
 * The groups whose fields changed in `source` since `baseline` (the last saved
 * version of that same language), each paired with what `target` says today.
 *
 * A group the target does not have yet — an item added in one language only —
 * comes back with empty `to` values, so the panel offers blank fields to fill
 * in with the source alongside for reference.
 */
export function diffTranslations(
  baseline: LangContent,
  source: LangContent,
  target: LangContent,
): TranslationChange[] {
  const sourceGroups = describeGroups(source);
  // Against its own previous version a group is found by key, which is id-based
  // where the item has an id: reordering a list is then not read as an edit.
  const before = new Map(describeGroups(baseline).map((g) => [g.key, g]));
  const pairs = pairGroups(sourceGroups, describeGroups(target));
  const changes: TranslationChange[] = [];

  for (const group of sourceGroups) {
    const baseGroup = before.get(group.key);
    const targetGroup = pairs.get(group.key);
    const fields: TranslationChange["fields"] = [];

    for (const f of group.fields) {
      const was = pairedField(baseGroup, f.fieldKey);
      if (f.value === was) continue;
      // A field that is blank on both sides of the edit carries no change worth
      // reviewing (e.g. an item that grew a role, shifting the field keys).
      if (!f.value.trim() && !was.trim()) continue;
      fields.push({
        fieldKey: f.fieldKey,
        label: f.label,
        multiline: f.multiline,
        from: f.value,
        to: pairedField(targetGroup, f.fieldKey),
      });
    }

    if (fields.length > 0) {
      changes.push({ key: group.key, slot: group.slot, title: group.title, fields });
    }
  }

  return changes;
}

/**
 * The same pairing, but for groups picked by key rather than by what changed —
 * how a pending entry is reopened once its values have moved on. Entries whose
 * group no longer exists (the item was deleted) are dropped.
 */
export function selectTranslations(
  source: LangContent,
  target: LangContent,
  wanted: Array<{ key: string; fieldKeys: string[] }>,
): TranslationChange[] {
  const sourceGroups = describeGroups(source);
  const byKey = new Map(sourceGroups.map((g) => [g.key, g]));
  const pairs = pairGroups(sourceGroups, describeGroups(target));
  const changes: TranslationChange[] = [];

  for (const want of wanted) {
    const group = byKey.get(want.key);
    if (!group) continue;
    const targetGroup = pairs.get(group.key);
    const fields = group.fields
      .filter((f) => want.fieldKeys.includes(f.fieldKey))
      .map((f) => ({
        fieldKey: f.fieldKey,
        label: f.label,
        multiline: f.multiline,
        from: f.value,
        to: pairedField(targetGroup, f.fieldKey),
      }));
    if (fields.length > 0) {
      changes.push({ key: group.key, slot: group.slot, title: group.title, fields });
    }
  }

  return changes;
}

/**
 * Lists whose two languages have a different number of items. Renaming or
 * rewording is paired automatically, but adding an item in one language and not
 * the other is a structural gap the panel can only point at.
 */
export function listLengthGaps(
  source: LangContent,
  target: LangContent,
): Array<{ title: string; source: number; target: number }> {
  const gaps: Array<{ title: string; source: number; target: number }> = [];
  for (const spec of LIST_SPECS) {
    const a = spec.groups(source).length;
    const b = spec.groups(target).length;
    if (a !== b) gaps.push({ title: spec.title, source: a, target: b });
  }
  return gaps;
}

/* -------------------------------------------------------------------------- */
/* Applying                                                                   */
/* -------------------------------------------------------------------------- */

/** Split "experience:#3" into its kind and index. */
function parseSlot(slot: string): { kind: string; index: number } | null {
  const at = slot.indexOf(":#");
  if (at === -1) return null;
  const kind = slot.slice(0, at);
  const index = Number(slot.slice(at + 2));
  if (!LIST_KINDS.has(kind) || !Number.isInteger(index) || index < 0) return null;
  return { kind, index };
}

type RoleFieldKey = "role" | "date" | "text" | "skills";

/** Split "role#2:text" into the role's index and the field it names. */
function parseRoleField(
  fieldKey: string,
): { index: number; key: RoleFieldKey } | null {
  const match = /^role#(\d+):(role|date|text|skills)$/.exec(fieldKey);
  if (!match) return null;
  return { index: Number(match[1]), key: match[2] as RoleFieldKey };
}

/** The fields a plain (education-shaped) item may receive from the panel. */
const PLAIN_FIELDS = new Set(["title", "place", "date", "text", "certificateUrl"]);

/** A list item as this module handles it: an id plus string fields. */
type AnyItem = Record<string, unknown> & { id: string };

/**
 * Resolve where each edited source item is written, growing `list` as needed.
 *
 * Items the target already has are written in place. One it does not have is
 * created — adopting the source item's id, so the projects and posts associated
 * with it surface on both résumés — and **inserted right after the item paired
 * with the closest preceding source item**, so it lands where the source has it
 * without moving anything that was already there.
 */
function resolveTargets(
  list: AnyItem[],
  sourceItems: AnyItem[],
  editedIndexes: number[],
  blank: (source: AnyItem) => AnyItem,
): { list: AnyItem[]; indexOf: Map<number, number> } {
  const paired = pairIndexes(sourceItems, list);
  const next = [...list];
  // Track pairs by identity: an insertion shifts the indexes around it.
  const anchor: Array<AnyItem | null> = paired.map((at) =>
    at === -1 ? null : list[at],
  );

  for (const i of [...editedIndexes].sort((a, b) => a - b)) {
    if (anchor[i] || !sourceItems[i]) continue;
    let at = 0;
    for (let j = i - 1; j >= 0; j--) {
      const previous = anchor[j];
      if (previous) {
        at = next.indexOf(previous) + 1;
        break;
      }
    }
    const created = blank(sourceItems[i]);
    next.splice(at, 0, created);
    anchor[i] = created;
  }

  const indexOf = new Map<number, number>();
  anchor.forEach((item, i) => {
    if (item) indexOf.set(i, next.indexOf(item));
  });
  return { list: next, indexOf };
}

/**
 * Write reviewed values into one language version. `source` is the language
 * they were translated from, used to pair the two lists (see
 * {@link pairIndexes}) and to seed the id of anything created here.
 *
 * Unknown slots and field keys are ignored rather than trusted, so a stale
 * pending entry can never write a field that no longer exists.
 */
export function applyTranslations(
  target: LangContent,
  source: LangContent,
  edits: TranslationEdit[],
): LangContent {
  const next: LangContent = { ...target };

  // Group the edits by the source item they came from, so each one is written
  // once and each list is rebuilt once.
  const byKind = new Map<string, Map<number, TranslationEdit[]>>();
  for (const edit of edits) {
    if (!edit.slot.includes(":#")) {
      // Scalar groups and the nav write straight onto the content.
      if (edit.fieldKey.startsWith("nav:")) {
        const id = edit.fieldKey.slice(4) as SectionId;
        next.nav = (next.nav ?? []).map((item: NavItem) =>
          item.id === id ? { ...item, label: edit.value } : item,
        );
      } else if (SCALAR_KEYS.has(edit.fieldKey)) {
        // Every scalar in the map is a string field of LangContent.
        (next as unknown as Record<string, string>)[edit.fieldKey] = edit.value;
      }
      continue;
    }
    const parsed = parseSlot(edit.slot);
    if (!parsed) continue;
    const perIndex = byKind.get(parsed.kind) ?? new Map<number, TranslationEdit[]>();
    perIndex.set(parsed.index, [...(perIndex.get(parsed.index) ?? []), edit]);
    byKind.set(parsed.kind, perIndex);
  }

  for (const [kind, perIndex] of byKind) {
    const listKey = LIST_KEYS[kind];
    const current = ((next[listKey] ?? []) as unknown as AnyItem[]).map((item) => ({
      ...item,
      id: typeof item.id === "string" ? item.id : "",
    }));
    const sourceItems = ((source[listKey] ?? []) as unknown as AnyItem[]).map(
      (item) => ({ ...item, id: typeof item.id === "string" ? item.id : "" }),
    );

    const { list, indexOf } = resolveTargets(
      current,
      sourceItems,
      [...perIndex.keys()],
      (from) => blankItem(kind, from.id),
    );

    for (const [sourceIndex, group] of perIndex) {
      const at = indexOf.get(sourceIndex);
      if (at === undefined) continue;
      list[at] = writeFields(kind, list[at], group, sourceItems[sourceIndex]);
    }

    (next as unknown as Record<string, unknown>)[listKey] = list;
  }

  return next;
}

/** A fresh, empty item of `kind`, carrying the id of the one it translates. */
function blankItem(kind: string, id: string): AnyItem {
  switch (kind) {
    case "highlight":
      return { id: "", value: "", label: "" };
    case "skill":
      return { id: "", title: "", text: "" };
    case "experience":
      return { id, role: "", place: "", date: "", text: "", skills: "", roles: [] };
    case "course":
      return { id, title: "", place: "", date: "", text: "", certificateUrl: "" };
    case "award":
      return {
        id,
        title: "",
        place: "",
        date: "",
        text: "",
        anchorType: "",
        anchorId: "",
      };
    default:
      return { id, title: "", place: "", date: "", text: "" };
  }
}

/** Apply one group of edits to one item, by kind. */
function writeFields(
  kind: string,
  item: AnyItem,
  edits: TranslationEdit[],
  sourceItem: AnyItem | undefined,
): AnyItem {
  const next: AnyItem = { ...item };

  if (kind === "highlight") {
    for (const edit of edits) {
      if (edit.fieldKey === "value" || edit.fieldKey === "label") {
        next[edit.fieldKey] = edit.value;
      }
    }
    return next;
  }

  if (kind === "skill") {
    for (const edit of edits) {
      if (edit.fieldKey === "title" || edit.fieldKey === "text") {
        next[edit.fieldKey] = edit.value;
      }
    }
    return next;
  }

  if (kind === "experience") {
    let experience = next as unknown as Experience;
    // Roles are paired by position: they are short, ordered most-recent-first in
    // both languages, and a change to that order always shows up in the panel as
    // every affected row at once (see diffTranslations).
    const roles = experienceRoles(experience).map((role) => ({ ...role }));
    const sourceRoles = sourceItem
      ? experienceRoles(sourceItem as unknown as Experience)
      : [];
    let rolesTouched = false;

    for (const edit of edits) {
      if (edit.fieldKey === "place") {
        experience = { ...experience, place: edit.value };
        continue;
      }
      const roleField = parseRoleField(edit.fieldKey);
      if (!roleField) continue;
      while (roles.length <= roleField.index) {
        const position = roles.length;
        roles.push({
          id: sourceRoles[position]?.id ?? "",
          role: "",
          date: "",
          text: "",
          skills: "",
        });
      }
      roles[roleField.index][roleField.key] = edit.value;
      rolesTouched = true;
    }

    // `withRoles` re-syncs the flat mirror of the current position, so the card
    // keeps rendering what the roles list says.
    if (rolesTouched) experience = withRoles(experience, roles);
    return experience as unknown as AnyItem;
  }

  // education / award / course / volunteering share one shape.
  for (const edit of edits) {
    if (PLAIN_FIELDS.has(edit.fieldKey)) next[edit.fieldKey] = edit.value;
  }
  return next;
}
