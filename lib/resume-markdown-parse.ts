import { type Lang, MAX_LIST_ITEMS as MAX_ITEMS } from "@/lib/resume-content";
import {
  ASSOCIATION_LABEL,
  EMPTY_HEADING,
  ID_MARKER_RE,
  LANG_MARKER_RE,
  LIST_SECTIONS,
  META_RE,
  NAV_IDS,
  ROLE_META,
  SCALAR_SECTIONS,
  SECTIONS,
  SECTION_KEYS,
  SECTION_TITLE_LABEL,
} from "@/lib/resume-markdown-format";

/**
 * Reading a Markdown document back into résumé content.
 *
 * The counterpart of `lib/resume-markdown.ts`: what an AI hands back after
 * rewriting the export is pasted in here, turned into the plain shape below,
 * and then diffed against the live content by `lib/resume-import.ts`.
 *
 * The reader is deliberately forgiving about **whitespace** and unforgiving
 * about **structure**. It ignores blank lines, stray prose and anything it does
 * not recognise, but it never guesses: a section that is not there is reported
 * as not there, which is what lets the import leave it alone instead of wiping
 * it (see {@link ParsedDocument.sections}).
 *
 * Nothing here writes anything. It is pure text in, plain objects out, so it
 * runs happily in the browser.
 */

/** One item of a repeatable section, as the document spelled it out. */
export interface ParsedItem {
  /** From the `<!-- id: … -->` comment; "" when the document carried none. */
  id: string;
  /** Item fields, keyed as in `LIST_SECTIONS` ("title", "place", "text"…). */
  fields: Record<string, string>;
  /** The positions under a company. Experience only. */
  roles?: ParsedItem[];
}

export interface ParsedDocument {
  /** The language the block declared, or null when no marker was found. */
  lang: Lang | null;
  /** True when the paste carried both language blocks — one at a time only. */
  bothLanguages: boolean;
  /**
   * The `##` sections the document actually contains. Everything else is left
   * untouched: a heading that is not here was never offered, so it cannot have
   * been an instruction to empty anything.
   */
  sections: Set<string>;
  /** Single-line and long-text `LangContent` fields, by key. */
  scalars: Record<string, string>;
  /** `LangContent` booleans (today: `badgeEnabled`), by key. */
  booleans: Record<string, boolean>;
  /** Nav labels, by section id. */
  nav: Record<string, string>;
  /** Items of each repeatable section, keyed by section heading. */
  lists: Record<string, ParsedItem[]>;
  /** Things worth saying out loud before anyone publishes this. */
  warnings: string[];
}

/** True when the paste looks like nothing this reader understands at all. */
export function isEmptyDocument(doc: ParsedDocument): boolean {
  return doc.sections.size === 0;
}

/* -------------------------------------------------------------------------- */
/* Entry point                                                                */
/* -------------------------------------------------------------------------- */

export function parseResumeMarkdown(markdown: string): ParsedDocument {
  const doc: ParsedDocument = {
    lang: null,
    bothLanguages: false,
    sections: new Set(),
    scalars: {},
    booleans: {},
    nav: {},
    lists: {},
    warnings: [],
  };

  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const markers = structuralLines(lines)
    .map((i) => ({ index: i, match: lines[i].match(LANG_MARKER_RE) }))
    .filter((m): m is { index: number; match: RegExpMatchArray } => !!m.match);

  let body = lines;
  if (markers.length > 1) {
    doc.bothLanguages = true;
    return doc;
  }
  if (markers.length === 1) {
    doc.lang = markers[0].match[1].toLowerCase() as Lang;
    body = lines.slice(markers[0].index + 1);
  } else {
    doc.warnings.push(
      "El documento no trae la marca `<!-- resume:lang … -->`, así que no sé de " +
        "qué idioma es. Elígelo abajo antes de revisar los cambios.",
    );
  }

  for (const [key, section] of splitSections(body)) {
    if (doc.sections.has(key)) {
      doc.warnings.push(`«## ${key}» aparece dos veces; se usó la primera.`);
      continue;
    }
    doc.sections.add(key);
    const kind = SECTIONS.find((s) => s.key === key)?.kind;
    if (kind === "scalar") readScalarSection(key, section, doc);
    else if (kind === "nav") readNavSection(section, doc);
    else readListSection(key, section, doc);
  }

  return doc;
}

/* -------------------------------------------------------------------------- */
/* Cutting the document up                                                    */
/* -------------------------------------------------------------------------- */

/**
 * The indexes of the lines that may carry structure — everything outside a
 * fenced code block. A `## Heading` inside a fence is text someone is quoting,
 * not a section of this document.
 */
function structuralLines(lines: string[]): number[] {
  const out: number[] = [];
  let inFence = false;
  for (let i = 0; i < lines.length; i++) {
    if (/^\s{0,3}(```|~~~)/.test(lines[i])) {
      inFence = !inFence;
      continue;
    }
    if (!inFence) out.push(i);
  }
  return out;
}

/** True for a line that opens something: any ATX heading, outside a fence. */
function isHeading(line: string, level?: number): boolean {
  const m = line.match(/^(#{1,6})\s+\S/);
  if (!m) return false;
  return level === undefined || m[1].length === level;
}

function headingText(line: string): string {
  return line.replace(/^#{1,6}\s+/, "").trim();
}

/**
 * The document's known `## ` sections, each with the lines under it. Unknown
 * `##` headings close the section before them and open nothing, so the prose an
 * AI likes to add around its answer ("## Notes") is skipped rather than read.
 */
function splitSections(lines: string[]): Array<[string, string[]]> {
  const out: Array<[string, string[]]> = [];
  const structural = new Set(structuralLines(lines));
  let current: [string, string[]] | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (structural.has(i) && isHeading(line, 2)) {
      const key = headingText(line);
      current = SECTION_KEYS.has(key) ? [key, []] : null;
      if (current) out.push(current);
      continue;
    }
    // A new `#` block (the next language's title, or the AI's own preamble)
    // ends whatever section was open.
    if (structural.has(i) && isHeading(line, 1)) {
      current = null;
      continue;
    }
    current?.[1].push(line);
  }
  return out;
}

/**
 * Split a section's lines at every heading of `level`: what came before the
 * first one, then one chunk per heading with its title.
 */
function splitAt(
  lines: string[],
  level: number,
): { preamble: string[]; chunks: Array<{ title: string; lines: string[] }> } {
  const structural = new Set(structuralLines(lines));
  const preamble: string[] = [];
  const chunks: Array<{ title: string; lines: string[] }> = [];

  for (let i = 0; i < lines.length; i++) {
    if (structural.has(i) && isHeading(lines[i], level)) {
      chunks.push({ title: headingText(lines[i]), lines: [] });
      continue;
    }
    (chunks.length ? chunks[chunks.length - 1].lines : preamble).push(lines[i]);
  }
  return { preamble, chunks };
}

/* -------------------------------------------------------------------------- */
/* Reading one item                                                           */
/* -------------------------------------------------------------------------- */

/**
 * The `<!-- id: … -->` comment, the `- **Key:**` lines and the free text of one
 * item.
 *
 * Metadata is only metadata while nothing else has been said: the first line
 * that is neither blank, nor the id, nor a key this section knows, starts the
 * body — and everything after it is body, key-shaped or not. That keeps a
 * bulleted description from being mistaken for fields, and vice versa.
 */
function readItem(
  lines: string[],
  known: Set<string>,
): { id: string; meta: Record<string, string>; body: string } {
  const structural = new Set(structuralLines(lines));
  const meta: Record<string, string> = {};
  const body: string[] = [];
  let id = "";
  let started = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (started) {
      body.push(line);
      continue;
    }
    if (!line.trim()) continue;
    if (structural.has(i)) {
      const idMatch = line.match(ID_MARKER_RE);
      if (idMatch && !id) {
        id = idMatch[1].trim();
        continue;
      }
      const metaMatch = line.match(META_RE);
      if (metaMatch && known.has(metaMatch[1].trim().toLowerCase())) {
        meta[metaMatch[1].trim().toLowerCase()] = cleanValue(metaMatch[2]);
        continue;
      }
    }
    started = true;
    body.push(line);
  }

  return { id, meta, body: body.join("\n").trim() };
}

/** A `- **Key:**` value: trailing HTML comments dropped, ends trimmed. */
function cleanValue(raw: string): string {
  return raw.replace(/<!--[\s\S]*?-->/g, "").trim();
}

/** `yes` / `sí` / `true` / `1` — anything else reads as off. */
function readBoolean(value: string): boolean {
  return /^(yes|y|s[ií]|true|1|on)$/i.test(value.trim());
}

/* -------------------------------------------------------------------------- */
/* Reading each kind of section                                               */
/* -------------------------------------------------------------------------- */

function readScalarSection(key: string, lines: string[], doc: ParsedDocument) {
  const spec = SCALAR_SECTIONS[key];
  const known = new Set(spec.meta.map((f) => f.label.toLowerCase()));
  const { preamble, chunks } = splitAt(lines, 3);
  const { meta } = readItem(preamble, known);

  for (const f of spec.meta) {
    const value = meta[f.label.toLowerCase()];
    if (value === undefined) continue;
    if (f.boolean) doc.booleans[f.field] = readBoolean(value);
    else doc.scalars[f.field] = value;
  }

  if (!spec.body) return;
  const wanted = spec.body.heading.toLowerCase();
  let chunk = chunks.find((c) => c.title.toLowerCase() === wanted);
  if (!chunk && chunks.length === 1) {
    // The heading was renamed but there is only one block of text under the
    // section, so there is no ambiguity about what it was meant to be.
    chunk = chunks[0];
    doc.warnings.push(
      `En «## ${key}» el texto venía bajo «### ${chunks[0].title}» en vez de ` +
        `«### ${spec.body.heading}»; se leyó igual.`,
    );
  }
  if (chunk) doc.scalars[spec.body.field] = chunk.lines.join("\n").trim();
}

function readNavSection(lines: string[], doc: ParsedDocument) {
  const known = new Set(NAV_IDS.map((id) => id.toLowerCase()));
  const { meta } = readItem(lines, known);
  for (const id of NAV_IDS) {
    const value = meta[id.toLowerCase()];
    if (value !== undefined) doc.nav[id] = value;
  }
}

function readListSection(key: string, lines: string[], doc: ParsedDocument) {
  const spec = LIST_SECTIONS[key];
  if (!spec) return;

  const { preamble, chunks } = splitAt(lines, 3);
  const titleKey = SECTION_TITLE_LABEL.toLowerCase();
  const { meta: sectionMeta } = readItem(preamble, new Set([titleKey]));
  if (spec.titleField && sectionMeta[titleKey] !== undefined) {
    doc.scalars[spec.titleField] = sectionMeta[titleKey];
  }

  // `Associated with` is round-tripped for the reader's benefit but never
  // imported: it wires items to each other rather than saying anything, and it
  // is edited in the admin tabs. Naming it here only keeps it out of the body.
  const known = new Set([
    ...spec.meta.map((f) => f.label.toLowerCase()),
    ASSOCIATION_LABEL.toLowerCase(),
  ]);

  const items: ParsedItem[] = chunks.map((chunk) =>
    key === "Experience"
      ? readExperience(chunk, doc)
      : readPlainItem(chunk, spec, known),
  );

  if (items.length > MAX_ITEMS) {
    doc.warnings.push(
      `«${spec.label}» trae ${items.length} elementos y el máximo es ` +
        `${MAX_ITEMS}: los últimos se perderían al guardar.`,
    );
  }
  doc.lists[key] = items;
}

function readPlainItem(
  chunk: { title: string; lines: string[] },
  spec: (typeof LIST_SECTIONS)[string],
  known: Set<string>,
): ParsedItem {
  const { id, meta, body } = readItem(chunk.lines, known);
  const fields: Record<string, string> = {
    [spec.heading]: emptyHeading(chunk.title),
  };
  for (const f of spec.meta) {
    fields[f.field] = meta[f.label.toLowerCase()] ?? "";
  }
  if (spec.body) fields[spec.body] = body;
  return { id, fields };
}

/** A company plus every `#### ` position under it. */
function readExperience(
  chunk: { title: string; lines: string[] },
  doc: ParsedDocument,
): ParsedItem {
  const { preamble, chunks } = splitAt(chunk.lines, 4);
  const company = readItem(preamble, new Set());
  if (company.body) {
    doc.warnings.push(
      `«${chunk.title}» trae texto suelto antes de su primer cargo (####); ` +
        "en Experiencia la descripción va dentro de cada cargo, así que se ignoró.",
    );
  }

  const roleKeys = new Set(ROLE_META.map((f) => f.label.toLowerCase()));
  const roles: ParsedItem[] = chunks.map((role) => {
    const { id, meta, body } = readItem(role.lines, roleKeys);
    return {
      id,
      fields: {
        role: emptyHeading(role.title),
        date: meta.dates ?? "",
        skills: meta.skills ?? "",
        text: body,
      },
    };
  });

  if (roles.length === 0) {
    doc.warnings.push(
      `«${chunk.title}» no trae ningún cargo (####); se ignoró esa experiencia.`,
    );
  }

  return { id: company.id, fields: { place: emptyHeading(chunk.title) }, roles };
}

/** The writer's stand-in for an empty heading reads back as empty. */
function emptyHeading(title: string): string {
  const t = title.trim();
  return t === EMPTY_HEADING ? "" : t;
}
