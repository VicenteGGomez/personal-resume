import {
  type Anchored,
  type Lang,
  type LangContent,
  type ResumeData,
  type StoryLink,
  experienceRoles,
  findExperiencePosition,
  milestoneDate,
  milestoneEntry,
  milestoneLinks,
  resolveAnchor,
  storyOf,
} from "@/lib/resume-content";
import {
  ASSOCIATION_LABEL,
  DOC_MARKER,
  EMPTY_HEADING,
  LIST_SECTIONS,
  NAV_IDS,
  ROLE_META,
  SCALAR_SECTIONS,
  SECTIONS,
  SECTION_TITLE_LABEL,
  idMarker,
  langMarker,
} from "@/lib/resume-markdown-format";
import { SITE_ORIGIN } from "@/lib/share-links";

/**
 * Writing the résumé out as Markdown.
 *
 * The document has two jobs at once: it is the context you paste into an AI
 * ("here is my whole professional life"), and it is the shape that AI has to
 * answer in for the result to be pasted back and published — see
 * `lib/resume-markdown-parse.ts` for the reader and
 * `lib/resume-markdown-format.ts` for the grammar both sides share.
 *
 * A document is one **Context** block (identity, projects, publications — read
 * on the way out, never on the way back, since none of it is per-language)
 * followed by one or two **language blocks**, each opened by a
 * `<!-- resume:lang … -->` marker and holding everything in `LangContent`.
 */

export type MarkdownTarget = Lang | "both";

/**
 * The switchable blocks of the document. They are coarser than the `##`
 * sections on purpose: what you decide when preparing a paste is "does the AI
 * need my volunteering for this?", not "does it need `## Navigation`".
 *
 * A block that is switched off leaves its sections out entirely — which the
 * reader treats as "say nothing about these", so a document copied without
 * Experience can be pasted back without touching a single job.
 */
export type MarkdownBlock =
  | "contact"
  | "projects"
  | "publications"
  | "intro"
  | "highlights"
  | "experience"
  | "education"
  | "skills"
  | "awards"
  | "courses"
  | "volunteering"
  | "story"
  | "site";

export const MARKDOWN_BLOCKS: Array<{
  key: MarkdownBlock;
  label: string;
  hint: string;
  /** The `##` sections of a language block this switch controls. */
  sections: string[];
}> = [
  {
    key: "contact",
    label: "Identidad y contacto",
    hint: "Nombre, ubicación, correo, teléfono, LinkedIn, idiomas y CV",
    sections: [],
  },
  {
    key: "intro",
    label: "Presentación",
    hint: "Insignia, subtítulo, descripción y «Sobre mí»",
    sections: ["Header", "About"],
  },
  { key: "highlights", label: "Destacados", hint: "Las cifras del encabezado", sections: ["Highlights"] },
  { key: "experience", label: "Experiencia", hint: "Compañías y cargos", sections: ["Experience"] },
  { key: "education", label: "Educación", hint: "Títulos y programas", sections: ["Education"] },
  { key: "skills", label: "Habilidades", hint: "Bloques de habilidades", sections: ["Skills"] },
  { key: "awards", label: "Reconocimientos", hint: "Premios y distinciones", sections: ["Awards"] },
  { key: "courses", label: "Cursos", hint: "Cursos y certificaciones", sections: ["Courses"] },
  {
    key: "volunteering",
    label: "Voluntariado",
    hint: "Cargos de representación y voluntariado",
    sections: ["Volunteering"],
  },
  {
    key: "story",
    label: "Mi historia",
    hint: "La línea de tiempo de /story: de dónde vengo y cómo llegué acá",
    sections: [],
  },
  { key: "projects", label: "Proyectos", hint: "Los posts largos de /projects", sections: [] },
  { key: "publications", label: "Publicaciones", hint: "Tus posts de LinkedIn", sections: [] },
  {
    key: "site",
    label: "Textos del sitio",
    hint: "Menú, títulos de sección, contacto y SEO — solo sirven para la web",
    sections: ["Navigation", "More about me", "Contact", "SEO"],
  },
];

export interface MarkdownOptions {
  /** Which blocks to write. Defaults to all of them. */
  blocks?: ReadonlySet<MarkdownBlock>;
  /**
   * Include the "how to give it back" rules. On when the answer is meant to be
   * pasted back here; off when the document is only context for something else
   * — a CV in LaTeX, say — and asking for this format would be noise.
   */
  contract?: boolean;
}

/** Every block on — what you want unless you say otherwise. */
export const ALL_BLOCKS: ReadonlySet<MarkdownBlock> = new Set(
  MARKDOWN_BLOCKS.map((b) => b.key),
);

/** The `##` sections a set of blocks lets through. */
function allowedSections(blocks: ReadonlySet<MarkdownBlock>): Set<string> {
  const out = new Set<string>();
  for (const block of MARKDOWN_BLOCKS) {
    if (!blocks.has(block.key)) continue;
    for (const section of block.sections) out.add(section);
  }
  return out;
}

const LANG_TITLE: Record<Lang, string> = {
  en: "English content",
  es: "Contenido en español",
};

/**
 * The whole résumé as one Markdown document. `target` picks which language
 * blocks it carries: one of them, or both for a side-by-side read.
 */
export function resumeToMarkdown(
  data: ResumeData,
  target: MarkdownTarget = "en",
  { blocks = ALL_BLOCKS, contract: withContract = true }: MarkdownOptions = {},
): string {
  const langs: Lang[] = target === "both" ? ["en", "es"] : [target];
  const sections = allowedSections(blocks);
  const name = data.shared.name?.trim() || "Professional Profile";
  const subtitle =
    target === "both"
      ? "English & Español"
      : target === "en"
        ? "English"
        : "Español";

  const out: string[] = [DOC_MARKER, `# ${name} — Résumé source (${subtitle})`];
  if (withContract) out.push(contract(langs, blocks));

  const context = contextBlock(data, blocks, langs);
  if (context) out.push("---", context);

  for (const lang of langs) {
    out.push("---", langMarker(lang), `# ${LANG_TITLE[lang]}`);
    out.push(...languageSections(data[lang], sections));
  }

  return out.join("\n\n") + "\n";
}

/**
 * Fields whose text carries a Markdown heading, which the format reserves for
 * its own structure. Nothing on the résumé does this today; if something ever
 * does, the copy panel says so rather than letting the round trip quietly
 * misread it.
 */
export function headingWarnings(
  data: ResumeData,
  target: MarkdownTarget = "en",
): string[] {
  const langs: Lang[] = target === "both" ? ["en", "es"] : [target];
  const out: string[] = [];
  const check = (where: string, text: string | undefined) => {
    if (text && /^\s{0,3}#{1,6}\s/m.test(text)) out.push(where);
  };
  for (const lang of langs) {
    const c = data[lang];
    const tag = lang === "en" ? "English" : "Español";
    check(`${tag} · Descripción`, c.description);
    check(`${tag} · Sobre mí`, c.about);
    check(`${tag} · Contacto`, c.contactText);
    check(`${tag} · «More about me»`, c.publicationsIntro);
    (c.experiences ?? []).forEach((exp, i) => {
      for (const role of experienceRoles(exp))
        check(`${tag} · Experiencia #${i + 1} · ${role.role || "cargo"}`, role.text);
    });
    for (const [section, spec] of Object.entries(LIST_SECTIONS)) {
      if (!spec.body || section === "Experience") continue;
      listOf(c, spec.field).forEach((item, i) =>
        check(`${tag} · ${spec.label} #${i + 1}`, String(item[spec.body!] ?? "")),
      );
    }
  }
  return out;
}

/* -------------------------------------------------------------------------- */
/* The contract                                                               */
/* -------------------------------------------------------------------------- */

/** The instructions the AI reads before rewriting anything. */
function contract(
  langs: Lang[],
  blocks: ReadonlySet<MarkdownBlock>,
): string {
  const partial = MARKDOWN_BLOCKS.some(
    (b) => b.sections.length > 0 && !blocks.has(b.key),
  );
  const which =
    langs.length > 1
      ? "one of the two language blocks below"
      : "the language block below";
  return [
    "> **What this is.** An export of my résumé, written to be read by an AI.",
    "> Everything under a `<!-- resume:lang … -->` marker is the live content of my",
    "> site in that language. Everything under **Context** is background you may use",
    "> but must not rewrite.",
    "",
    "## Before you change anything",
    "",
    "**Do not rewrite anything yet.** First tell me, in plain prose, what you would",
    "change and why — section by section — and then wait for me to say yes. If you",
    "see something worth improving that I did not ask for, raise it as a question",
    "instead of doing it. Only once I have confirmed should you produce the",
    "document below.",
    "",
    "## How to give it back",
    "",
    `Return ${which}, **complete and on its own** — the \`<!-- resume:lang … -->\``,
    "marker, then every `##` section under it, in this exact format. One language",
    "per answer: they are uploaded one at a time.",
    "",
    "1. **The scaffolding stays in English.** `## Experience`, `- **Dates:**` and",
    "   every other heading and key are structure, not content. Only the values",
    "   change language.",
    "2. **Keep every `<!-- id: … -->` comment** on the item it sits under. Ids are",
    "   how a rewritten item is recognised as the same item; lose one and the",
    "   projects, awards and links anchored to it come loose.",
    "3. **A new item carries no id comment** — leave it out and one is minted.",
    "4. **A section you leave out is left alone.** Write `## Skills` and its list is",
    "   replaced by yours, with anything you dropped offered for deletion; leave the",
    "   `## Skills` heading out entirely and the skills on the site stay as they",
    "   are. If you have to cut your answer short, drop whole sections — never half",
    "   a section.",
    "5. **Order is the order on the site.** Items appear as you write them.",
    "6. **Free text is Markdown** — paragraphs, `-` bullets, `**bold**`, `*italic*`,",
    "   `[links](https://example.com)`. Do not put `#` headings inside it: headings",
    "   belong to the structure of this document.",
    "7. `- **Badge shown:**` takes `yes` or `no`. `- **Associated with:**` is",
    "   plumbing between items — copy it through unchanged.",
    ...(partial
      ? [
          "",
          "Some sections were deliberately left out of this export because they are",
          "not relevant to what I am asking. Do not invent them: answer with the",
          "sections you were given.",
        ]
      : []),
  ].join("\n");
}

/* -------------------------------------------------------------------------- */
/* Context: everything that is not per-language                               */
/* -------------------------------------------------------------------------- */

/**
 * Identity, projects and publications. None of these is per-language — the
 * "More about me" block is shown in English on both résumés — so they are
 * written for the AI to read and ignored on the way back in.
 */
function contextBlock(
  data: ResumeData,
  blocks: ReadonlySet<MarkdownBlock>,
  langs: Lang[],
): string | null {
  const { shared } = data;
  // The story is the one part of this block that *is* per-language. It is
  // written once, in the first language asked for — a document meant to be read
  // rather than uploaded, so there is nothing to be gained from saying it twice.
  const storyLang = langs[0] ?? "en";
  const milestones = blocks.has("story") ? storyOf(data).milestones : [];
  const projects = blocks.has("projects")
    ? (data.projects ?? []).filter((p) => p && (p.title || p.body))
    : [];
  const publications = blocks.has("publications")
    ? (shared.publications ?? []).filter((p) => p.title || p.excerpt || p.url)
    : [];

  const parts: string[] = [
    "# Context (read-only)",
    "*The same in both languages, and edited only in the admin panel. Read it for" +
      " background; changes to it are ignored on upload.*",
  ];

  const contact: string[] = [];
  const add = (label: string, value?: string) => {
    const v = value?.trim();
    if (v) contact.push(`- **${label}:** ${v}`);
  };
  add("Name", shared.name);
  add("Location", shared.location);
  add("Email", shared.email);
  add("LinkedIn", shared.linkedin);
  if (shared.whatsapp?.trim()) {
    const wa = shared.whatsapp.trim();
    add(
      "WhatsApp",
      /^https?:\/\//i.test(wa) ? wa : `https://wa.me/${wa.replace(/\D/g, "")}`,
    );
  }
  add("Phone", shared.phone);
  add("Website", SITE_ORIGIN);
  add("Full CV (PDF)", shared.cvEn);
  const languages = (shared.languages ?? []).filter((l) => l.name || l.level);
  if (languages.length) {
    add(
      "Languages",
      languages.map((l) => [l.name, l.level].filter(Boolean).join(": ")).join(" · "),
    );
  }
  if (blocks.has("contact") && contact.length) {
    parts.push(["## Identity & contact", "", ...contact].join("\n"));
  }

  if (milestones.length) {
    const items = milestones.map((m) => {
      const entry = milestoneEntry(m, storyLang);
      const when = milestoneDate(m, storyLang).trim();
      const lines: string[] = [`### ${dashed(when, oneLine(entry.title))}`];
      if (entry.text?.trim()) lines.push("", demoteHeadings(entry.text.trim(), 3));
      const related = milestoneLinks(m)
        .map((link) => storyLinkLabel(data, storyLang, link))
        .filter(Boolean);
      if (related.length) {
        lines.push("", `**In my résumé:** ${related.join("; ")}`);
      }
      return lines.join("\n");
    });
    parts.push(
      [
        "## My story",
        "",
        "*The timeline behind the résumé, in my own words — where I come from and",
        "how the entries in it came about. Background, not a section of the CV.*",
        "",
        items.join("\n\n"),
      ].join("\n"),
    );
  }

  if (projects.length) {
    const items = projects.map((p) => {
      const lines: string[] = [`### ${p.title?.trim() || "Untitled project"}`];
      const meta: string[] = [];
      if (p.date?.trim()) meta.push(`*${p.date.trim()}*`);
      const anchor = resolveAnchor(p);
      const pos =
        anchor.type === "experience"
          ? findExperiencePosition(data.en.experiences, anchor.id)
          : null;
      if (pos) meta.push(`Related experience: ${dashed(pos.role, pos.place)}`);
      if (meta.length) lines.push(meta.join(" · "));
      if (p.slug?.trim()) lines.push(`URL: /en/projects/${p.slug.trim()}`);
      if (p.summary?.trim()) lines.push("", `**Summary:** ${p.summary.trim()}`);
      if (p.body?.trim()) lines.push("", demoteHeadings(p.body.trim(), 3));
      const links = (p.links ?? []).filter((l) => l.label || l.url);
      if (links.length) {
        lines.push("", "**Links:**");
        for (const l of links)
          lines.push(`- [${l.label?.trim() || l.url?.trim()}](${l.url?.trim()})`);
      }
      return lines.join("\n");
    });
    parts.push(["## Projects", "", items.join("\n\n")].join("\n"));
  }

  if (publications.length) {
    const items = publications.map((p) => {
      const lines: string[] = [`### ${p.title?.trim() || "Untitled post"}`];
      const meta: string[] = [];
      if (p.date?.trim()) meta.push(`*${p.date.trim()}*`);
      if (p.url?.trim()) meta.push(`[View post](${p.url.trim()})`);
      if (meta.length) lines.push(meta.join(" · "));
      if (p.excerpt?.trim()) lines.push("", p.excerpt.trim());
      return lines.join("\n");
    });
    parts.push(["## Publications", "", items.join("\n\n")].join("\n"));
  }

  // Nothing but the title left: the reader has no context to read, so the
  // document goes straight from the instructions to the content.
  if (parts.length <= 2) return null;
  return parts.join("\n\n");
}

/* -------------------------------------------------------------------------- */
/* One language block                                                         */
/* -------------------------------------------------------------------------- */

/** Every `##` section of one language version, in the order of `SECTIONS`. */
function languageSections(content: LangContent, allowed: Set<string>): string[] {
  const out: string[] = [];
  for (const section of SECTIONS) {
    if (!allowed.has(section.key)) continue;
    switch (section.kind) {
      case "scalar":
        out.push(scalarSection(section.key, content));
        break;
      case "nav":
        out.push(navSection(content));
        break;
      case "list":
        out.push(listSection(section.key, content));
        break;
    }
  }
  return out;
}

/** `## Header` and friends: a few one-line fields plus one block of text. */
function scalarSection(key: string, content: LangContent): string {
  const spec = SCALAR_SECTIONS[key];
  const lines: string[] = [`## ${key}`, ""];
  for (const f of spec.meta) {
    const raw = content[f.field as keyof LangContent];
    const value = f.boolean ? (raw ? "yes" : "no") : oneLine(String(raw ?? ""));
    lines.push(`- **${f.label}:** ${value}`);
  }
  if (spec.body) {
    const text = String(content[spec.body.field as keyof LangContent] ?? "").trim();
    lines.push("", `### ${spec.body.heading}`, "", text);
  }
  return trimBlanks(lines).join("\n");
}

/** `## Navigation`: one line per fixed section id. */
function navSection(content: LangContent): string {
  const byId = new Map((content.nav ?? []).map((n) => [n.id, n.label ?? ""]));
  return [
    "## Navigation",
    "",
    ...NAV_IDS.map((id) => `- **${id}:** ${oneLine(byId.get(id) ?? "")}`),
  ].join("\n");
}

/** `## Experience` and the other repeatable sections. */
function listSection(key: string, content: LangContent): string {
  const spec = LIST_SECTIONS[key];
  const lines: string[] = [`## ${key}`, ""];
  if (spec.titleField) {
    const title = String(content[spec.titleField as keyof LangContent] ?? "");
    lines.push(`- **${SECTION_TITLE_LABEL}:** ${oneLine(title)}`, "");
  }

  const items = listOf(content, spec.field);

  const rendered = items.map((item) =>
    key === "Experience"
      ? experienceItem(item as never)
      : plainItem(item, spec, content),
  );
  lines.push(rendered.join("\n\n"));
  return trimBlanks(lines).join("\n");
}

/** One item: `### heading`, its id, its `- **Key:**` lines, then free text. */
function plainItem(
  item: Record<string, unknown>,
  spec: (typeof LIST_SECTIONS)[string],
  content: LangContent,
): string {
  const lines: string[] = [`### ${heading(String(item[spec.heading] ?? ""))}`];
  if (spec.identified && String(item.id ?? "").trim()) {
    lines.push(idMarker(String(item.id).trim()));
  }
  const meta: string[] = spec.meta
    .map((f) => ({ label: f.label, value: oneLine(String(item[f.field] ?? "")) }))
    .filter((f) => f.value)
    .map((f) => `- **${f.label}:** ${f.value}`);
  const association = associationLine(item as Anchored, content);
  if (association) meta.push(association);
  if (meta.length) lines.push(...meta);

  const body = spec.body ? String(item[spec.body] ?? "").trim() : "";
  if (body) lines.push("", body);
  return lines.join("\n");
}

/**
 * A company, then one `#### ` per position held there. Even a single-position
 * job is written this way: a uniform shape is one less thing for the AI — and
 * for the reader — to get wrong.
 */
function experienceItem(exp: Parameters<typeof experienceRoles>[0]): string {
  const lines: string[] = [`### ${heading(exp.place ?? "")}`];
  if (exp.id?.trim()) lines.push(idMarker(exp.id.trim()));

  for (const role of experienceRoles(exp)) {
    lines.push("", `#### ${heading(role.role)}`);
    if (role.id?.trim()) lines.push(idMarker(role.id.trim()));
    for (const f of ROLE_META) {
      const value = oneLine(role[f.field]);
      if (value) lines.push(`- **${f.label}:** ${value}`);
    }
    const text = role.text?.trim();
    if (text) lines.push("", text);
  }
  return lines.join("\n");
}

/**
 * `- **Associated with:** award:…`, with the item's human name in a trailing
 * comment so the line means something to a reader too.
 */
function associationLine(item: Anchored, content: LangContent): string | null {
  if (!("anchorType" in item)) return null;
  const { type, id } = resolveAnchor(item);
  if (!type || !id) return null;
  const label = anchorLabel(type, id, content);
  const suffix = label ? ` <!-- ${label} -->` : "";
  return `- **${ASSOCIATION_LABEL}:** ${type}:${id}${suffix}`;
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

/** Human name of the item an association points at, for the trailing comment. */
function anchorLabel(type: string, id: string, c: LangContent): string {
  const find = (list: Array<{ id: string; title?: string; place?: string }>) => {
    const hit = list.find((x) => x.id === id);
    return hit ? dashed(hit.title ?? "", hit.place ?? "") : "";
  };
  switch (type) {
    case "experience": {
      const pos = findExperiencePosition(c.experiences, id);
      return pos ? dashed(pos.role, pos.place) : "";
    }
    case "education":
      return find(c.education ?? []);
    case "award":
      return find(c.awards ?? []);
    case "course":
      return find(c.courses ?? []);
    case "volunteering":
      return find(c.volunteering ?? []);
    default:
      return "";
  }
}

/**
 * One of `LangContent`'s item arrays, read by name. The specs in
 * `resume-markdown-format.ts` address the fields as strings so the writer and
 * the reader can share them, which is exactly the shape TypeScript cannot
 * narrow — so the cast lives here, once.
 */
function listOf(content: LangContent, field: string): Array<Record<string, unknown>> {
  const value = content[field as keyof LangContent];
  return Array.isArray(value)
    ? (value as unknown as Array<Record<string, unknown>>).filter(Boolean)
    : [];
}

/** "Role — Place", dropping whichever side is empty. */
function dashed(a: string, b: string): string {
  const left = a?.trim();
  const right = b?.trim();
  if (left && right) return `${left} — ${right}`;
  return left || right || EMPTY_HEADING;
}

/**
 * A milestone's link to the résumé, named the way the reader will find it —
 * "Education · B.S. in Economics (Universidad de Chile)". A link whose target
 * has since been deleted resolves to nothing and is dropped by the caller.
 */
function storyLinkLabel(data: ResumeData, lang: Lang, link: StoryLink): string {
  const t = data[lang];
  const named = (kind: string, title: string, place: string) =>
    `${kind} · ${place ? `${title} (${place})` : title}`;

  if (link.type === "project") {
    const project = (data.projects ?? []).find((p) => p.slug === link.id);
    return project ? `Project · ${project.title || project.slug}` : "";
  }
  if (link.type === "experience") {
    const pos = findExperiencePosition(t.experiences ?? [], link.id);
    return pos ? named("Experience", pos.role, pos.place) : "";
  }
  const lists: Record<string, { kind: string; list: Array<{ id: string; title: string; place: string }> }> = {
    education: { kind: "Education", list: t.education ?? [] },
    award: { kind: "Award", list: t.awards ?? [] },
    course: { kind: "Course", list: t.courses ?? [] },
    volunteering: { kind: "Volunteering", list: t.volunteering ?? [] },
  };
  const spec = lists[link.type];
  if (!spec) return "";
  const item = spec.list.find((i) => i.id === link.id);
  return item ? named(spec.kind, item.title, item.place) : "";
}

/** An item heading: never empty, never spilling onto a second line. */
function heading(value: string): string {
  return oneLine(value) || EMPTY_HEADING;
}

/**
 * A value safe to write on a `- **Key:**` line: newlines collapsed to spaces,
 * and any `-->` neutralised so it cannot close a comment it is not in.
 */
function oneLine(value: string): string {
  return (value ?? "")
    .replace(/\s*\n+\s*/g, " ")
    .replace(/-->/g, "→")
    .trim();
}

/** Drop trailing blank lines so a section never ends with empty space. */
function trimBlanks(lines: string[]): string[] {
  const out = [...lines];
  while (out.length && out[out.length - 1].trim() === "") out.pop();
  return out;
}

/**
 * Push the ATX headings of an embedded Markdown fragment `by` levels deeper
 * (capped at 6), so a project body's `## Context` nests under the `### Project`
 * heading above it instead of competing with the document's own sections.
 * Fenced code is left alone.
 */
function demoteHeadings(md: string, by: number): string {
  let inFence = false;
  return md
    .split("\n")
    .map((line) => {
      if (/^\s*(```|~~~)/.test(line)) {
        inFence = !inFence;
        return line;
      }
      if (inFence) return line;
      const h = line.match(/^(#{1,6})(\s.*)$/);
      if (!h) return line;
      return "#".repeat(Math.min(6, h[1].length + by)) + h[2];
    })
    .join("\n");
}
