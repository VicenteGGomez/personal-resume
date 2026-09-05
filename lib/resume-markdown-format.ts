import type { SectionId } from "@/lib/resume-content";

/**
 * The vocabulary of the round-trip Markdown format, shared by the writer
 * (`lib/resume-markdown.ts`) and the reader (`lib/resume-markdown-parse.ts`).
 *
 * The résumé is exported as Markdown so it can be handed to an AI as context,
 * and the AI's rewrite is pasted straight back in. That only works if both
 * sides agree on the grammar down to the exact heading text, so it lives here
 * once rather than being spelled out twice.
 *
 * Two deliberate choices shape it:
 *
 *   - **The scaffolding is always English.** `## Experience`, `- **Dates:**`
 *     and friends are structure, not content: keeping them fixed means the
 *     same parser reads the English and the Spanish document. Only the values
 *     are in the document's language.
 *   - **Every item that owns a stable id carries it** in an HTML comment right
 *     under its heading. Ids are what projects, publications and awards are
 *     anchored to (see `resolveAnchor`), and what tells an edit ("Analyst" →
 *     "Senior Analyst") apart from a delete plus an add. A comment is invisible
 *     wherever the Markdown is rendered, so it costs nothing to read.
 */

/** Bumped when the grammar changes in a way an older document would fail. */
export const FORMAT_VERSION = 1;

/** Opens the document; carries the version so a stale paste can be spotted. */
export const DOC_MARKER = `<!-- resume-format: v${FORMAT_VERSION} -->`;

/** Opens one language block: `<!-- resume:lang en -->`. */
export function langMarker(lang: string): string {
  return `<!-- resume:lang ${lang} -->`;
}

/** Matches {@link langMarker} on a line of its own. */
export const LANG_MARKER_RE = /^<!--\s*resume:lang\s+(en|es)\s*-->\s*$/i;

/** Matches the id comment under an item heading: `<!-- id: exp-bridge -->`. */
export const ID_MARKER_RE = /^<!--\s*id:\s*([^\s>]+)\s*-->\s*$/i;

/** Builds the id comment for an item that has one. */
export function idMarker(id: string): string {
  return `<!-- id: ${id} -->`;
}

/** A `- **Key:** value` metadata line, the only shape a field may take. */
export const META_RE = /^-\s+\*\*([^*]+?):\*\*\s*(.*)$/;

/**
 * The `##` sections of a language block, in document order. `key` is the
 * heading text; `kind` decides how the body under it is read.
 */
export const SECTIONS = [
  { key: "Header", kind: "scalar" },
  { key: "Navigation", kind: "nav" },
  { key: "About", kind: "scalar" },
  { key: "Highlights", kind: "list" },
  { key: "Experience", kind: "list" },
  { key: "Education", kind: "list" },
  { key: "Skills", kind: "list" },
  { key: "Awards", kind: "list" },
  { key: "Courses", kind: "list" },
  { key: "Volunteering", kind: "list" },
  { key: "More about me", kind: "scalar" },
  { key: "Contact", kind: "scalar" },
  { key: "SEO", kind: "scalar" },
] as const;

export type SectionKey = (typeof SECTIONS)[number]["key"];

export const SECTION_KEYS = new Set<string>(SECTIONS.map((s) => s.key));

/** The fixed nav ids, in the order they are written under `## Navigation`. */
export const NAV_IDS: SectionId[] = [
  "about",
  "experience",
  "education",
  "skills",
  "awards",
  "contact",
  "more",
];

/**
 * The single-line fields of each scalar section, as `- **Key:**` lines, plus
 * the one long-text field each carries under its own `###` heading.
 *
 * Every entry names a `LangContent` key directly, so the reader can write what
 * it finds without a second lookup table.
 */
export const SCALAR_SECTIONS: Record<
  string,
  {
    /** `- **Key:** value` lines, in order. */
    meta: Array<{ label: string; field: string; boolean?: true }>;
    /** The `### Heading` holding this section's long text, when it has one. */
    body?: { heading: string; field: string };
  }
> = {
  Header: {
    meta: [
      { label: "Badge shown", field: "badgeEnabled", boolean: true },
      { label: "Badge", field: "badge" },
      { label: "Subtitle", field: "subtitle" },
      { label: "Primary button", field: "primaryCta" },
      { label: "Secondary button", field: "secondaryCta" },
    ],
    body: { heading: "Description", field: "description" },
  },
  About: {
    meta: [{ label: "Section title", field: "aboutTitle" }],
    body: { heading: "Text", field: "about" },
  },
  "More about me": {
    meta: [
      { label: "Menu label", field: "publicationsNav" },
      { label: "Title", field: "publicationsTitle" },
      { label: "Empty state", field: "publicationsEmpty" },
    ],
    body: { heading: "Intro", field: "publicationsIntro" },
  },
  Contact: {
    meta: [{ label: "Title", field: "contactTitle" }],
    body: { heading: "Text", field: "contactText" },
  },
  SEO: {
    meta: [{ label: "Page title", field: "metaTitle" }],
    body: { heading: "Meta description", field: "metaDescription" },
  },
};

/**
 * The repeatable sections. `heading` names the item field that becomes the
 * `### ` heading; `meta` the `- **Key:**` lines under it; `body` the free
 * Markdown that follows. `identified` sections carry an id comment.
 */
export const LIST_SECTIONS: Record<
  string,
  {
    /** The `LangContent` array this section is stored in. */
    field: string;
    /** The `LangContent` key holding this section's own title, if any. */
    titleField?: string;
    /** The item field written as the `### ` heading. */
    heading: string;
    meta: Array<{ label: string; field: string }>;
    /** The item field holding the free Markdown under the metadata. */
    body?: string;
    /** Items carry a stable id, written as `<!-- id: … -->`. */
    identified: boolean;
    /** Spanish label used in the review panel: "Experiencia #1". */
    label: string;
  }
> = {
  Highlights: {
    field: "highlights",
    heading: "value",
    meta: [{ label: "Label", field: "label" }],
    identified: false,
    label: "Destacado",
  },
  Experience: {
    field: "experiences",
    titleField: "experienceTitle",
    heading: "place",
    meta: [],
    identified: true,
    label: "Experiencia",
  },
  Education: {
    field: "education",
    titleField: "educationTitle",
    heading: "title",
    meta: [
      { label: "Place", field: "place" },
      { label: "Dates", field: "date" },
    ],
    body: "text",
    identified: true,
    label: "Educación",
  },
  Skills: {
    field: "skills",
    titleField: "skillsTitle",
    heading: "title",
    meta: [],
    body: "text",
    identified: false,
    label: "Habilidad",
  },
  Awards: {
    field: "awards",
    titleField: "awardsTitle",
    heading: "title",
    meta: [
      { label: "Place", field: "place" },
      { label: "Dates", field: "date" },
    ],
    body: "text",
    identified: true,
    label: "Reconocimiento",
  },
  Courses: {
    field: "courses",
    titleField: "coursesTitle",
    heading: "title",
    meta: [
      { label: "Place", field: "place" },
      { label: "Dates", field: "date" },
      { label: "Certificate", field: "certificateUrl" },
    ],
    body: "text",
    identified: true,
    label: "Curso",
  },
  Volunteering: {
    field: "volunteering",
    titleField: "volunteeringTitle",
    heading: "title",
    meta: [
      { label: "Place", field: "place" },
      { label: "Dates", field: "date" },
    ],
    body: "text",
    identified: true,
    label: "Voluntariado",
  },
};

/** The `- **Key:**` lines of one position under `#### <role>`. */
export const ROLE_META = [
  { label: "Dates", field: "date" },
  { label: "Skills", field: "skills" },
] as const;

/** Written as the heading of an item whose heading field is empty. */
export const EMPTY_HEADING = "—";

/** The heading every section carries for its own on-site title. */
export const SECTION_TITLE_LABEL = "Section title";

/**
 * An award's association with another résumé item. It is round-tripped so the
 * document stays a faithful picture, but never imported: it is plumbing between
 * items rather than content, and is edited in the admin tabs.
 */
export const ASSOCIATION_LABEL = "Associated with";
