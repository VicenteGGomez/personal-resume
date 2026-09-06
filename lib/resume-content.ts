import { DEFAULT_CV_LATEX } from "@/lib/cv-latex-template";
import type { Fit, Framing } from "@/lib/image-framing";
import type { ThemeChoice } from "@/lib/theme";

export type Lang = "en" | "es";

// The sections are anchored by fixed ids so that in-page navigation and deep
// links stay stable. Only the label of each nav item is editable. "more" is the
// projects-and-publications block that sits between the two contact cards.
export const SECTION_IDS = [
  "about",
  "experience",
  "education",
  "skills",
  "awards",
  "contact",
  "more",
] as const;

export type SectionId = (typeof SECTION_IDS)[number];

/**
 * How many items one résumé list may hold. Enforced when content is written
 * (`normalizeResumeData`); read here so the Markdown import can warn about a
 * paste that would be truncated on save rather than silently losing its tail.
 */
export const MAX_LIST_ITEMS = 30;

export interface NavItem {
  id: SectionId;
  label: string;
}

/**
 * The nav rebuilt from the fixed section ids: a stored label wins where there is
 * one, the seed fills the rest, and ids that no longer exist are dropped. This
 * runs on read as well as on save, so a section added after the last admin save
 * still gets its link without anyone having to re-save (see `lib/resume-store.ts`).
 */
export function navFromSections(
  seed: NavItem[],
  stored: Array<Partial<NavItem>> | undefined,
): NavItem[] {
  const byId = new Map<string, string>();
  for (const item of stored ?? []) {
    if (item && typeof item.id === "string") byId.set(item.id, item.label ?? "");
  }
  return SECTION_IDS.map((id) => {
    const stored = byId.get(id);
    const seedLabel = seed.find((n) => n.id === id)?.label ?? id;
    return { id, label: stored && stored.trim() ? stored : seedLabel };
  });
}

export interface Highlight {
  value: string;
  label: string;
}

/**
 * The kind of item a project or publication is associated with. Empty string
 * means "not associated". Every résumé target kind (experience, education,
 * award, course, volunteering) carries a stable `id`; a `project` target is
 * keyed by its unique `slug`. The association survives reordering and is looked
 * up the same way regardless of kind. Only publications use the `project` target
 * (so a project can surface its related posts); projects never anchor to a
 * project.
 */
export type AnchorType =
  | ""
  | "experience"
  | "education"
  | "award"
  | "course"
  | "volunteering"
  | "project";

/** Anything that can point at a résumé item (a project or a publication). */
export interface Anchored {
  anchorType?: AnchorType;
  anchorId?: string;
  /** Legacy: projects used to reference an experience only. */
  experienceId?: string;
}

/**
 * Resolve an item's association to a `{ type, id }` pair, transparently
 * upgrading the legacy `experienceId` field (older projects) to the generic
 * anchor shape. Returns `{ type: "", id: "" }` when there is no association.
 */
export function resolveAnchor(item: Anchored): { type: AnchorType; id: string } {
  if (item.anchorType && item.anchorId) {
    return { type: item.anchorType, id: item.anchorId };
  }
  if (item.experienceId) return { type: "experience", id: item.experienceId };
  return { type: "", id: "" };
}

/** True when `item` is associated with the given target kind and id. */
export function anchorMatches(item: Anchored, type: AnchorType, id: string): boolean {
  if (!type || !id) return false;
  const a = resolveAnchor(item);
  return a.type === type && a.id === id;
}

/**
 * One position held at a company. A promotion or an internal move adds a role
 * to the same {@link Experience} instead of repeating the company as a second
 * card.
 */
export interface ExperienceRole {
  /**
   * Stable id, in the same space as `Experience.id`: a project or a post can be
   * associated with this exact position (see {@link resolveAnchor}). The role a
   * single-role experience is read as carries the experience's own id, so
   * associations made before roles existed keep resolving.
   */
  id: string;
  role: string;
  date: string;
  text: string;
  /**
   * Free-form skill tags, separated by commas or "·", shown as subtle chips
   * under this position. Optional.
   */
  skills: string;
}

/**
 * One company on the résumé, holding every position held there. The flat
 * `role`/`date`/`text`/`skills` fields describe the most recent position and
 * are kept mirrored from `roles[0]` on save, so a reader that knows nothing
 * about `roles` still shows the current one.
 */
export interface Experience {
  /**
   * Stable id used to associate projects with this experience. Existing content
   * saved before this field was added is back-filled on read (see
   * `lib/resume-store.ts`); new experiences get a generated id in the admin.
   */
  id: string;
  role: string;
  /** The company or organization; shared by every position in `roles`. */
  place: string;
  date: string;
  text: string;
  /**
   * Free-form skill tags, separated by commas or "·", shown as subtle chips on
   * the experience card. Optional; absent on content saved before this field.
   */
  skills: string;
  /**
   * Every position held at `place`, most recent first — how a promotion or an
   * internal move is recorded. Absent on content saved before this field (reads
   * are not normalized, see `getResumeData`), so always go through
   * {@link experienceRoles} rather than reading it directly.
   */
  roles?: ExperienceRole[];
}

/**
 * The positions of an experience, most recent first — never empty. An entry
 * with no `roles` list (content saved before it existed, or a plain single-role
 * job) reads as one role under the experience's own id, so every consumer can
 * treat an experience as a list of positions.
 *
 * A blank position is kept rather than skipped: the admin editor works on this
 * list directly, and a row it has just added has to survive being read back.
 * Writers drop the blanks instead (see `normalizeResumeData`).
 */
export function experienceRoles(exp: Experience): ExperienceRole[] {
  const stored = (exp.roles ?? []).filter(Boolean);
  if (stored.length === 0) {
    return [
      {
        id: exp.id,
        role: exp.role ?? "",
        date: exp.date ?? "",
        text: exp.text ?? "",
        skills: exp.skills ?? "",
      },
    ];
  }
  return stored.map((role, i) => ({
    // Ids are minted on save; back-fill positionally for hand-edited content.
    id: role.id?.trim() || (i === 0 ? exp.id : `${exp.id}-role-${i}`),
    role: role.role ?? "",
    date: role.date ?? "",
    text: role.text ?? "",
    skills: role.skills ?? "",
  }));
}

/**
 * An experience with `roles` replaced by `next` and its flat fields re-synced to
 * the current position (`next[0]`). Every writer — the admin editor and
 * `normalizeResumeData` — goes through this so the two representations can
 * never drift apart.
 */
export function withRoles(exp: Experience, next: ExperienceRole[]): Experience {
  const current = next[0];
  return {
    ...exp,
    roles: next,
    role: current?.role ?? "",
    date: current?.date ?? "",
    text: current?.text ?? "",
    skills: current?.skills ?? "",
  };
}

/** An en/em dash, or a hyphen with spaces around it: "Jun 2026 – Present". */
const DATE_RANGE_SEPARATOR = /\s*[–—]\s*|\s+-\s+/;

/**
 * The overall span shown on a company card that holds several positions: from
 * the start of the oldest one to the end of the most recent. Dates are
 * free-form strings, so this only splits on the dash separating a range and
 * gives up — returning "" — when there is nothing to read. Single-role
 * experiences show their one date as-is instead.
 */
export function experienceSpan(exp: Experience): string {
  const dates = experienceRoles(exp)
    .map((role) => role.date.trim())
    .filter(Boolean);
  if (dates.length === 0) return "";
  // Roles run newest first, so the span starts in the last one and ends in the
  // first one.
  const oldest = dates[dates.length - 1].split(DATE_RANGE_SEPARATOR);
  const newest = dates[0].split(DATE_RANGE_SEPARATOR);
  const start = oldest[0].trim();
  const end = newest[newest.length - 1].trim();
  if (!start || !end) return "";
  return start === end ? start : `${start} – ${end}`;
}

/** A position offered as an `experience` association target. */
export interface ExperiencePosition {
  /** The anchor id — the role's id, not the company's. */
  id: string;
  role: string;
  place: string;
}

/**
 * Every position across every experience, flattened — the canonical list of
 * `experience` association targets. A company contributes one entry per role,
 * so a project or a post can point at the exact position it came out of.
 */
export function experiencePositions(
  experiences: Experience[] | undefined,
): ExperiencePosition[] {
  return (experiences ?? []).flatMap((exp) =>
    experienceRoles(exp).map((role) => ({
      id: role.id,
      role: role.role,
      place: exp.place,
    })),
  );
}

/** The position an `experience` anchor points at, or null when it dangles. */
export function findExperiencePosition(
  experiences: Experience[] | undefined,
  id: string,
): ExperiencePosition | null {
  if (!id) return null;
  return experiencePositions(experiences).find((pos) => pos.id === id) ?? null;
}

export interface Education {
  /** Stable id so projects/publications can be associated with this entry. */
  id: string;
  title: string;
  place: string;
  date: string;
  text: string;
}

/**
 * An award, honor, or recognition. Shares Education's shape, and can itself be
 * associated with another résumé item (typically an education) so it surfaces
 * as a chip on that item's card — see {@link resolveAnchor}.
 */
export interface Award {
  id: string;
  title: string;
  place: string;
  date: string;
  text: string;
  anchorType: AnchorType;
  anchorId: string;
}

/** An additional course or certification. Shares Education's shape, plus an
 * optional link to the certificate. */
export interface Course {
  id: string;
  title: string;
  place: string;
  date: string;
  text: string;
  /** Optional URL to the course certificate. Empty = no link shown. */
  certificateUrl: string;
}

/** A volunteering role. `title` holds the role, `place` the organization. */
export interface Volunteering {
  id: string;
  title: string;
  place: string;
  date: string;
  text: string;
}

export interface Skill {
  title: string;
  text: string;
}

/**
 * A language and how well it is spoken. Not shown on the résumé site — the two
 * language versions say that already — but the LaTeX CV has a Languages
 * section, so it is edited in the admin rather than frozen inside a template
 * (see `lib/cv-latex.ts`).
 */
export interface SpokenLanguage {
  name: string;
  level: string;
}

/**
 * A curated LinkedIn post surfaced on the /publications page. Each entry links
 * out to the original post on LinkedIn. The list is shared across languages
 * (a post has a single URL); only the surrounding page labels are localized.
 */
export interface Publication {
  /**
   * Stable id used to deep-link to (and highlight) this post when it is opened
   * from an association chip on the résumé. Back-filled on read; persisted on
   * the next admin save.
   */
  id: string;
  title: string;
  date: string;
  excerpt: string;
  url: string;
  /**
   * Every picture of the card, in the order they are shown, each with its own
   * focal point. Absent on content saved before the list existed, so read it
   * through {@link publicationImages} (or {@link publicationImageSlots} when
   * editing) rather than directly.
   */
  images?: CardImage[];
  /**
   * The flat slots the list replaced. Still written on every save, mirroring
   * the first three pictures, so anything that reads them keeps working.
   */
  imageUrl: string;
  imageUrl2?: string;
  imageUrl3?: string;
  /**
   * Optional association with a résumé item (experience, education, course, or
   * volunteering). When set, the post surfaces as a chip on that item and, when
   * clicked from the résumé, opens the publications page with this post
   * highlighted instead of jumping straight to LinkedIn.
   */
  anchorType: AnchorType;
  anchorId: string;
}

/** An external link shown on a project post. */
export interface ProjectLink {
  label: string;
  url: string;
}

/**
 * An additional image of a project, shown in the same carousel as the cover.
 * Its framing is its own; a picture that has never been through the "Encuadre"
 * dialog inherits the project's `coverFit` (see {@link projectImages}).
 */
export interface ProjectImage extends Framing {
  url: string;
  /** Optional caption shown under the image. */
  caption: string;
}

/**
 * A project "post" — English-only, so it lives at the top level of ResumeData
 * (not inside a per-language block). Each project may be associated with one
 * résumé item through the generic anchor (`anchorType`/`anchorId`); the legacy
 * `experienceId` is kept in sync for the experience case and read as a
 * fallback. `body` is Markdown, rendered to HTML on the project page.
 */
export interface ProjectPost {
  slug: string;
  title: string;
  date: string;
  summary: string;
  body: string;
  /** Legacy experience association; mirrors the anchor when it is an experience. */
  experienceId: string;
  /** Generic association target — see {@link resolveAnchor}. */
  anchorType: AnchorType;
  anchorId: string;
  coverImage: string;
  /**
   * How the cover image fills its 16:9 frame:
   * - "contain": show the whole image, never cropped (margins around it).
   * - "cover": fill the frame, cropping whatever overflows.
   *
   * It is also what a gallery picture is drawn with until it is given a fit of
   * its own, which is how projects framed before the dialog keep their look.
   */
  coverFit: Fit;
  /** Framing of the cover — which part of it is in view, and how close. */
  coverFocusX?: number;
  coverFocusY?: number;
  coverZoom?: number;
  /** The pictures shown after the cover, in the order they are carouselled. */
  gallery: ProjectImage[];
  links: ProjectLink[];
}

/**
 * A publication's pictures as the admin edits them: the stored list, or — the
 * first time round, before anything has been saved against it — the three flat
 * slots it replaced. Empty rows survive, so the editor can hold a blank one the
 * user is still filling in. Reads are not normalized (see `getResumeData`), so
 * everything here is read defensively.
 */
export function publicationImageSlots(pub: Publication): CardImage[] {
  if (Array.isArray(pub.images)) return pub.images;
  return [pub.imageUrl, pub.imageUrl2, pub.imageUrl3]
    .filter((url): url is string => typeof url === "string" && url.trim() !== "")
    .map((url) => ({ url }));
}

/** The pictures a publication card actually shows, in order. */
export function publicationImages(pub: Publication): CardImage[] {
  return publicationImageSlots(pub).filter((img) => img?.url?.trim());
}

/**
 * The pictures a project shows — its cover first, then the gallery. Both the
 * card on the résumé and the project page run through the same list so the two
 * views always carry the same images in the same order.
 */
export function projectImages(project: ProjectPost): CardImage[] {
  // Reads are not normalized (see `getResumeData`), so an older project can
  // arrive without a fit at all: "contain" is what it has always been drawn
  // with, and it is also what its gallery inherits.
  const projectFit: Fit = project.coverFit === "cover" ? "cover" : "contain";
  const cover = project.coverImage?.trim()
    ? [
        {
          url: project.coverImage,
          focusX: project.coverFocusX,
          focusY: project.coverFocusY,
          zoom: project.coverZoom,
          fit: projectFit,
        },
      ]
    : [];
  const gallery = (project.gallery ?? [])
    .filter((img) => img?.url?.trim())
    .map((img) => ({
      url: img.url,
      caption: img.caption,
      focusX: img.focusX,
      focusY: img.focusY,
      zoom: img.zoom,
      fit: img.fit ?? projectFit,
    }));
  return [...cover, ...gallery];
}

/** One slide of a card carousel — see `components/ImageCarousel`. */
export interface CardImage extends Framing {
  url: string;
  caption?: string;
}

/* -------------------------------------------------------------------------- */
/* My story                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * A picture of one milestone. Framed like every other picture on the site, so
 * the same "Encuadre" dialog and the same carousel carry it.
 */
export interface StoryImage extends Framing {
  url: string;
  caption: string;
}

/**
 * A résumé item a milestone belongs with.
 *
 * A milestone can name several — the year I started at Universidad de Chile is
 * the degree, the honour roll and the teaching assistantship at once — which is
 * why this is a list of its own rather than the single {@link Anchored} pair a
 * project or a publication carries. The link only runs one way: the milestone
 * shows a chip pointing at the résumé, and the résumé's cards are left alone.
 */
export interface StoryLink {
  type: AnchorType;
  id: string;
}

/** One milestone's words, in one language. */
export interface StoryEntry {
  title: string;
  text: string;
  /**
   * Only for a date that has to be said in words — "I don't remember the year".
   * Left empty it falls back to the milestone's own {@link StoryMilestone.date},
   * which is what a year or a range is: the same in both languages.
   */
  date?: string;
}

/**
 * One stop on the timeline.
 *
 * Unlike the résumé, whose two languages are two parallel objects, a milestone
 * holds both of its languages at once: its date, its pictures and its links to
 * the résumé are the same fact in either language, and splitting them would
 * mean framing every photograph twice. Only the words are per-language.
 */
export interface StoryMilestone {
  /** Stable id — the deep-link target, `#milestone-<id>`. */
  id: string;
  /**
   * Shown exactly as written, so a year I am unsure of can say so: "2004",
   * "2021 – 2022", "I don't remember the year".
   */
  date: string;
  en: StoryEntry;
  es: StoryEntry;
  images: StoryImage[];
  links: StoryLink[];
}

/** The story page's own words, in one language. */
export interface StoryIntro {
  /** The navbar link, and the button that leads here from the résumé. */
  label: string;
  /**
   * The opening line. Whatever is written in **bold** comes out in the accent
   * gradient, which is how the name is picked out of the greeting.
   */
  heading: string;
  /** Markdown under the heading. */
  intro: string;
  /** A closing line under the last milestone. Empty leaves it out. */
  outro: string;
  metaTitle: string;
  metaDescription: string;
}

/** The whole story page: its words in both languages, and the timeline. */
export interface Story {
  en: StoryIntro;
  es: StoryIntro;
  milestones: StoryMilestone[];
}

const EMPTY_STORY_INTRO: StoryIntro = {
  label: "",
  heading: "",
  intro: "",
  outro: "",
  metaTitle: "",
  metaDescription: "",
};

/**
 * The story as every reader of it should take it: both language blocks
 * complete, and a milestone list that is really a list.
 *
 * Reads are not normalized (see `getResumeData`) and this field arrived long
 * after content had been saved, so the whole of it is defaulted here rather
 * than at each of the dozen places that touch it.
 */
export function storyOf(data: ResumeData): Story {
  const story = data.story;
  return {
    en: { ...EMPTY_STORY_INTRO, ...(story?.en ?? {}) },
    es: { ...EMPTY_STORY_INTRO, ...(story?.es ?? {}) },
    milestones: (story?.milestones ?? []).filter(Boolean),
  };
}

/** One milestone's words in `lang`, falling back to the other language. */
export function milestoneEntry(m: StoryMilestone, lang: Lang): StoryEntry {
  const own = m[lang];
  const other = m[lang === "en" ? "es" : "en"];
  return {
    title: own?.title?.trim() ? own.title : (other?.title ?? ""),
    text: own?.text?.trim() ? own.text : (other?.text ?? ""),
  };
}

/**
 * What the rail reads beside a milestone: the language's own wording where it
 * has one, and otherwise the year — which needs no translating.
 */
export function milestoneDate(m: StoryMilestone, lang: Lang): string {
  const own = m[lang]?.date?.trim();
  return own || (m.date ?? "");
}

/**
 * The pictures a milestone shows, in order. Blank rows are dropped, and a
 * picture that has never been through the "Encuadre" dialog fills its frame —
 * a timeline is photographs, not diagrams.
 */
export function milestoneImages(m: StoryMilestone): CardImage[] {
  return (m.images ?? [])
    .filter((img) => img?.url?.trim())
    .map((img) => ({
      url: img.url,
      caption: img.caption,
      focusX: img.focusX,
      focusY: img.focusY,
      zoom: img.zoom,
      fit: img.fit ?? "cover",
    }));
}

/** A milestone's links to the résumé, with the blank rows of the editor gone. */
export function milestoneLinks(m: StoryMilestone): StoryLink[] {
  return (m.links ?? []).filter((l) => l?.type && l?.id);
}

/**
 * True when the story is worth a page: a milestone to tell, or at least an
 * opening line. Its navbar link, the hero button and the invitation under
 * "About" all appear together, under this one condition.
 */
export function hasStory(data: ResumeData): boolean {
  const story = storyOf(data);
  return (
    story.milestones.length > 0 ||
    Boolean(story.en.heading.trim() || story.es.heading.trim())
  );
}

/** Where the story lives, per language. */
export function storyHref(lang: Lang): string {
  return lang === "en" ? "/en/story" : "/es/historia";
}

/** The label for the story link, with a fallback for content that has none. */
export function storyLabel(data: ResumeData, lang: Lang): string {
  const stored = storyOf(data)[lang].label.trim();
  if (stored) return stored;
  return lang === "en" ? "My story" : "Mi historia";
}

/** Content that is specific to a single language. */
export interface LangContent {
  badgeEnabled: boolean;
  badge: string;
  nav: NavItem[];
  subtitle: string;
  description: string;
  primaryCta: string;
  secondaryCta: string;
  aboutTitle: string;
  about: string;
  highlights: Highlight[];
  experienceTitle: string;
  experiences: Experience[];
  educationTitle: string;
  education: Education[];
  skillsTitle: string;
  skills: Skill[];
  // Awards / honors / recognition, shown after Skills.
  awardsTitle: string;
  awards: Award[];
  // Additional courses / certifications, shown after Awards.
  coursesTitle: string;
  courses: Course[];
  // Volunteering, shown after Additional courses.
  volunteeringTitle: string;
  volunteering: Volunteering[];
  // Labels for the publications block inside the résumé's "More about me"
  // section. The list itself is shared (see SharedContent.publications); only
  // these labels differ per language.
  publicationsNav: string;
  publicationsTitle: string;
  publicationsIntro: string;
  publicationsEmpty: string;
  contactTitle: string;
  contactText: string;
  metaTitle: string;
  metaDescription: string;
}

/** Content shared between both languages (identity, photo, links). */
export interface SharedContent {
  name: string;
  location: string;
  photoUrl: string;
  photoAlt: string;
  email: string;
  linkedin: string;
  whatsapp: string;
  cvEn: string;
  cvEs: string;
  /** When true, /cv-es redirects to the English CV instead of cvEs. */
  cvEsUseEn: boolean;
  /**
   * Phone number as it should read on the CV ("+56 9 2092 6785"). The site
   * itself shows WhatsApp instead, so this exists only for the generated CV.
   */
  phone: string;
  /** Spoken languages and levels, for the CV's Languages section. */
  languages: SpokenLanguage[];
  /**
   * The LaTeX source of the CV: both the shape the AI is asked to follow and
   * where the CV it writes is kept once it is pasted back. Edited in the admin
   * panel — see `lib/cv-latex.ts` for the default and the prompt built from it.
   */
  cvLatex: string;
  /**
   * Day/night default for every visitor who has not picked one themselves:
   * "light", "dark", or "system" to follow the visitor's device. Absent on
   * content saved before this field existed, so read it through
   * {@link asThemeChoice} rather than directly (see `lib/theme.ts`).
   */
  defaultTheme: ThemeChoice;
  publications: Publication[];
}

export interface ResumeData {
  shared: SharedContent;
  /** Project posts (English-only); each may reference an Experience by id. */
  projects: ProjectPost[];
  /**
   * The timeline behind the résumé — bilingual, and its own page rather than a
   * section of this one. Read it through {@link storyOf}: content saved before
   * it existed has no `story` key at all.
   */
  story: Story;
  en: LangContent;
  es: LangContent;
}

/**
 * The monogram for a name: the first letter of each of its first two words,
 * upper-cased — "Vicente G. Gómez" comes out as "VG". Used as the navbar logo
 * and as the stand-in avatar when there is no photo, so the two always agree.
 */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * True when there is anything to show in the résumé's "More about me" block —
 * i.e. at least one project or one publication. The block, its navbar link and
 * the second contact card all appear together, under this one condition.
 */
export function hasMoreContent(data: ResumeData): boolean {
  return (
    (data.projects ?? []).length > 0 ||
    (data.shared.publications ?? []).length > 0
  );
}

/**
 * Default content. This is the source of truth shipped in the repo and the
 * fallback whenever no edited version exists in storage yet. The admin panel
 * edits a copy of this shape which is persisted separately (see
 * `lib/resume-store.ts`).
 */
export const seedResumeData: ResumeData = {
  shared: {
    name: "Vicente G. Gómez",
    location: "Santiago, Chile",
    photoUrl:
      "https://lqkylxrxpm0kncmx.public.blob.vercel-storage.com/resume/uploads/profile-1784963408506-EADRkmqnZP2RBqrSMH4DHQpJcAWpSg.png",
    photoAlt: "Vicente G. Gómez",
    email: "vicente@vicentegomez.cl",
    linkedin: "https://www.linkedin.com/in/vicenteggomez",
    whatsapp: "56920926785",
    cvEn: "/cv-vicente-gomez-en.pdf",
    cvEs: "",
    cvEsUseEn: true,
    phone: "+56 9 2092 6785",
    languages: [
      { name: "Spanish", level: "Native Proficiency" },
      { name: "English", level: "Professional Proficiency (C1)" },
    ],
    cvLatex: DEFAULT_CV_LATEX,
    defaultTheme: "system",
    // Restored from the pre-outage site: titles and résumé associations are the
    // originals, but the LinkedIn URLs were lost with the Blob store. A post
    // with an empty `url` still renders (as a plain card, and its chip opens
    // the résumé) — paste each link back in /admin to make them clickable again.
    publications: [
      {
        id: "pub-mannheim",
        title: "A semester of growth at Universität Mannheim",
        date: "",
        excerpt: "",
        url: "",
        imageUrl: "",
        anchorType: "education",
        anchorId: "edu-mannheim",
      },
      {
        id: "pub-penn",
        title: "Understanding a country through its people",
        date: "",
        excerpt: "",
        url: "",
        imageUrl: "",
        anchorType: "education",
        anchorId: "edu-upenn",
      },
      {
        id: "pub-fen-gala",
        title: "Honor Roll recognition at the FEN Alumni Gala",
        date: "",
        excerpt: "",
        url: "",
        imageUrl: "",
        anchorType: "award",
        anchorId: "award-honor-roll",
      },
      {
        id: "pub-honor-roll-3y",
        title: "Three consecutive years on the FEN Honor Roll",
        date: "",
        excerpt: "",
        url: "",
        imageUrl: "",
        anchorType: "award",
        anchorId: "award-honor-roll",
      },
    ],
  },

  projects: [
    {
      slug: "alumni-uchile-mentorship-program",
      title: "Designing the Alumni UChile Mentorship Program",
      date: "Jul – Sep 2024",
      summary:
        "As Project Designer at the Provost's Office of Universidad de Chile, I redesigned the mentorship model for the university's Alumni Network — two structured tracks, professional and entrepreneurial — into a ~6-month program run with a strategically selected cohort of ~15 mentor–mentee pairs.",
      experienceId: "exp-project-designer",
      anchorType: "experience",
      anchorId: "exp-project-designer",
      coverImage: "",
      coverFit: "contain",
      gallery: [],
      links: [],
      body: `## Context

Universidad de Chile was building a formal **Alumni Network** to strengthen the long-term relationship between the university, its graduates, and its current students. Within the Provost's Office, I joined as Project Designer to define how one of the network's flagship offerings — **mentorship** — would actually work.

## Objective

Design a mentorship model that could scale across a large and diverse alumni base while staying simple to run: clear roles, a strategic selection of participants, and a program structure that created real value for both mentors and mentees.

## What I designed

I structured the program around **two complementary tracks**:

- **Professional mentoring** — pairing alumni with students and recent graduates for career guidance, industry insight, and professional development.
- **Entrepreneurial mentoring** — connecting experienced alumni founders and operators with student entrepreneurs to pressure-test ideas and navigate their first steps.

The guidelines I wrote defined, for each track:

- **Governance and guiding principles** — the objectives, scope, and operating rules of the program.
- **Strategic matching** — how mentors and mentees were selected and paired, by field, interests, and goals.
- **Program structure** — a **~6-month** mentoring arc, with session cadence and clear expectations for each side.
- **Operational objectives** — the measurable goals the program would be run and evaluated against.

I built on an **earlier pilot**, reworking significant parts of it — from participant selection to the structure of the relationship — into the model above.

## Outcome

The framework was adopted to run a cohort of **~15 strategically selected mentor–mentee pairs**, giving the Alumni UChile network a repeatable model to connect its community across generations and keep graduates engaged over the long term.`,
    },
  ],

  story: {
    en: {
      label: "My story",
      heading: "Hi there! I'm **Vicente**, and this is my story.",
      intro:
        "The CV is the short version — dates, titles, results. This is the longer one: the trips, the projects and the people that got me here. It grows as I do.",
      outro:
        "The story is still going. If any of it resonates, [let's talk](/en#contact).",
      metaTitle: "My story",
      metaDescription:
        "How I got here: from Viña del Mar to Madrid — the milestones, trips and projects behind my CV.",
    },
    es: {
      label: "Mi historia",
      heading: "¡Hola! Soy **Vicente** y esta es mi historia.",
      intro:
        "El currículum es la versión corta: fechas, cargos y resultados. Esta es la larga — los viajes, los proyectos y la gente que me trajeron hasta acá. Crece conmigo.",
      outro:
        "La historia sigue. Si algo de esto te hace sentido, [conversemos](/es#contact).",
      metaTitle: "Mi historia",
      metaDescription:
        "Cómo llegué hasta acá: de Viña del Mar a Madrid — los hitos, los viajes y los proyectos que hay detrás de mi CV.",
    },
    milestones: [
      {
        id: "story-born",
        date: "2004",
        en: {
          title: "I was born in Viña del Mar, Chile",
          text: "On the Chilean coast, where the hills run down to the sea. Everything below starts here.",
        },
        es: {
          title: "Nací en Viña del Mar, Chile",
          text: "En la costa de Chile, donde los cerros bajan hasta el mar. Todo lo que viene después empieza acá.",
        },
        images: [],
        links: [],
      },
      {
        id: "story-cuidemos-la-naturaleza",
        date: "",
        en: {
          title: "Cuidemos La Naturaleza",
          date: "I don't remember the year",
          text: "A project I co-founded with Imix: every weekend we invited people to come and clean the forest with us. It was the first time I saw that a small idea, repeated, moves people.",
        },
        es: {
          title: "Cuidemos La Naturaleza",
          date: "No recuerdo el año",
          text: "Un proyecto que cofundé con Imix: cada fin de semana invitábamos a gente a limpiar el bosque con nosotros. Fue la primera vez que vi que una idea pequeña, repetida, mueve a las personas.",
        },
        images: [],
        links: [],
      },
      {
        id: "story-first-trip",
        date: "2017",
        en: {
          title: "My first trip outside Chile",
          text: "The United States, and the first time the world turned out to be bigger than the map I had of it. The week I came back I started English lessons — a decision most of this page depends on.",
        },
        es: {
          title: "Mi primer viaje fuera de Chile",
          text: "Estados Unidos, y la primera vez que el mundo resultó ser más grande que el mapa que tenía de él. La semana en que volví empecé mis clases de inglés — una decisión de la que depende casi todo lo que sigue.",
        },
        images: [],
        links: [],
      },
      {
        id: "story-community-garden",
        date: "2021",
        en: {
          title: "A community garden, in the middle of the pandemic",
          text: "We co-founded a garden for the neighbourhood: somewhere to put our hands while everything else was shut, and a reason for the block to see each other again.",
        },
        es: {
          title: "Una huerta comunitaria, en plena pandemia",
          text: "Cofundamos una huerta para el barrio: un lugar donde poner las manos mientras todo lo demás estaba cerrado, y una excusa para que la cuadra volviera a verse.",
        },
        images: [],
        links: [],
      },
      {
        id: "story-debate",
        date: "2021 – 2022",
        en: {
          title: "The debate team",
          text: "I joined in 2021 and led the team in 2022, my final year of school. Debating taught me what I still use most: build the argument, then say it so that someone else can follow it.",
        },
        es: {
          title: "El equipo de debate",
          text: "Entré en 2021 y lo lideré en 2022, mi último año de colegio. El debate me enseñó lo que más ocupo hasta hoy: armar el argumento y después decirlo de manera que otro lo pueda seguir.",
        },
        images: [],
        links: [{ type: "award", id: "award-critical-thinking" }],
      },
      {
        id: "story-high-school",
        date: "2022",
        en: {
          title: "Graduated from high school with honours",
          text: "A 6.8 / 7.0 GPA, and four years on the honour roll at Seminario San Rafael.",
        },
        es: {
          title: "Salí del colegio con distinción",
          text: "Promedio 6,8 / 7,0 y cuatro años en el Cuadro de Honor del Seminario San Rafael.",
        },
        images: [],
        links: [{ type: "award", id: "award-hs-honor-roll" }],
      },
      {
        id: "story-uchile",
        date: "2023",
        en: {
          title: "Economics at Universidad de Chile",
          text: "Honour roll in each of my three years there, on the Beca Excelencia Académica, and a teaching assistant for 7+ courses along the way — econometrics, macro, accounting, finance, statistics. Teaching turned out to be the fastest way to find out what I actually understood.",
        },
        es: {
          title: "Economía en la Universidad de Chile",
          text: "Cuadro de Honor los tres años, con la Beca Excelencia Académica, y ayudante en más de 7 cursos por el camino — econometría, macro, contabilidad, finanzas, estadística. Hacer clases resultó ser la forma más rápida de descubrir qué entendía de verdad.",
        },
        images: [],
        links: [
          { type: "education", id: "edu-uchile" },
          { type: "award", id: "award-honor-roll" },
          { type: "experience", id: "exp-ta" },
        ],
      },
      {
        id: "story-mannheim",
        date: "2025",
        en: {
          title: "A semester in Germany",
          text: "An exchange at Universität Mannheim, funded by a €4,000 Baden-Württemberg scholarship. Studying in a third language, in a country where I knew nobody, was the hardest and the best thing I had done.",
        },
        es: {
          title: "Un semestre en Alemania",
          text: "Intercambio en la Universität Mannheim, con una beca Baden-Württemberg de 4.000 €. Estudiar en un tercer idioma, en un país donde no conocía a nadie, fue lo más difícil y lo mejor que había hecho.",
        },
        images: [],
        links: [
          { type: "education", id: "edu-mannheim" },
          { type: "award", id: "award-bw" },
        ],
      },
      {
        id: "story-upenn",
        date: "2026",
        en: {
          title: "Summer School at UPenn",
          text: "Selected among ~90 students out of more than 150,000 applicants, with the program fully funded. Leadership, positive psychology, and American values and immigration — in Philadelphia, nine years after that first trip.",
        },
        es: {
          title: "Summer School en UPenn",
          text: "Seleccionado entre ~90 estudiantes de más de 150.000 postulantes, con el programa financiado por completo. Liderazgo, psicología positiva y valores estadounidenses e inmigración — en Filadelfia, nueve años después de aquel primer viaje.",
        },
        images: [],
        links: [
          { type: "education", id: "edu-upenn" },
          { type: "award", id: "award-penn" },
        ],
      },
    ],
  },

  en: {
    badgeEnabled: false,
    badge: "Open to internships & analyst opportunities · 2026",
    nav: [
      { id: "about", label: "About" },
      { id: "experience", label: "Experience" },
      { id: "education", label: "Education" },
      { id: "skills", label: "Skills" },
      { id: "awards", label: "Awards" },
      { id: "contact", label: "Contact" },
      { id: "more", label: "More" },
    ],
    subtitle:
      "Economics student working across finance, data, and teaching — with an international academic track.",
    description:
      "Strong quantitative training combined with hands-on experience in finance, data validation, and process automation. Capital Management Intern at Banco Santander, Business Analyst Intern at Bridge Ventures, and Teaching Assistant across 7+ economics and finance courses. Transferring from Universidad de Chile to UC3M Madrid to continue my Economics degree.",
    primaryCta: "Download CV",
    secondaryCta: "Let's talk",
    aboutTitle: "What I focus on",
    about:
      "My main professional interest is using data and analytics to improve decisions in finance and operations. In practice, this has meant validating capital-management data and automating recurring processes at Santander Chile, as well as supporting platform development, business operations, and process improvement at Bridge Ventures Group.\n\nI approach problems by first understanding the underlying business or economic question, then structuring the information and using tools such as Excel and VBA, SQL, Python, R, JavaScript, and Databricks to make the analysis useful. I am particularly interested in work that connects quantitative thinking with real operational challenges: improving a process, validating a model or project, reducing repetitive work, or helping teams make better-informed decisions.\n\nTeaching is a complementary part of this profile. Serving as a Teaching Assistant across seven university courses has strengthened my ability to break down technical concepts, communicate clearly, and adapt explanations to different audiences. My academic experiences in Chile, Germany, and the United States have also shaped how I collaborate and approach problems across different institutional and cultural settings.",
    highlights: [
      { value: "Top 1%", label: "FEN Honor Roll · Universidad de Chile" },
      { value: "Santander", label: "Capital Management Intern" },
      { value: "+7 courses", label: "Teaching Assistant experience" },
      {
        value: "3 countries",
        label: "Academic experience in Chile, Germany & the U.S.",
      },
    ],
    experienceTitle: "Experience",
    experiences: [
      {
        id: "exp-bridge",
        role: "Business Analyst Intern",
        place: "Bridge Ventures Group",
        date: "Jun 2026 – Present",
        text: "- Work directly with the CEO across business operations, technology, and strategic initiatives, connecting day-to-day operational needs with broader business priorities.\n- Contribute to the development, testing, launch, and adoption of an internal platform supporting leasing and factoring operations through improved communication, workflow automation, billing, and payments.",
        skills: "Business operations · Process automation",
      },
      {
        id: "exp-santander",
        role: "Capital Management Intern",
        place: "Banco Santander",
        date: "Mar 2026 – Jun 2026",
        text: "- Validated capital-management data and automated recurring processes using VBA, JavaScript, SQL, and Databricks, reducing the time required for manual processing.\n- Performed data checks supporting the development and validation of internal analytical tools and capital-management projects.\n- Worked with capital-management data and regulatory concepts including Basel III, Risk-Weighted Assets (RWA), RORWA, and RORAC.",
        skills: "SQL · VBA · Basel III / RWA",
      },
      {
        id: "exp-ta",
        role: "Teaching Assistant",
        place: "Universidad de Chile",
        date: "Feb 2024 – Present",
        text: "- Teaching assistant across 7+ courses at the Faculty of Economics and Business, including Econometrics, Macroeconomics, Accounting, Finance, Statistics, Economics, and Communication Skills.\n- Prepare learning materials and lead problem-solving sessions that translate technical concepts into clear, structured, and applicable explanations.\n- Grade assessments and answer student questions.",
        skills: "Econometrics · Macroeconomics · Finance",
      },
      {
        id: "exp-tutor",
        role: "Microeconomics Tutor",
        place: "Department of Economics, Universidad de Chile",
        date: "Mar 2025 – Jun 2026",
        text: "- Designed lesson plans and supplementary materials to connect economic theory with structured examples and problem-solving exercises.\n- Guided students through core concepts, clarified questions, and adapted explanations to strengthen their understanding of the material.",
        skills: "Microeconomics · Lesson design",
      },
      {
        id: "exp-project-designer",
        role: "Project Designer",
        place: "Provost's Office, Universidad de Chile",
        date: "Jul 2024 – Sep 2024",
        text: "- Redesigned the mentorship model for the university's Alumni Network, structuring separate professional and entrepreneurial mentoring tracks.\n- Defined the program's governance principles, participant roles, session structure, and operational objectives.",
        skills: "Program design · Governance",
      },
    ],
    educationTitle: "Education",
    education: [
      {
        id: "edu-uc3m",
        title: "B.S. in Economics",
        place: "Universidad Carlos III de Madrid",
        date: "From Sep 2026",
        text: "Continuing my Economics degree as a transfer student from Universidad de Chile.",
      },
      {
        id: "edu-uchile",
        title: "B.S. in Economics",
        place: "Universidad de Chile",
        date: "2023 – 2025",
        text: "FEN Honor Roll · Top 1% of class (2023–2025) · ranked 3rd of 554 students.",
      },
      {
        id: "edu-mannheim",
        title: "Business Administration (BWL)",
        place: "Universität Mannheim",
        date: "Fall 2025",
        text: "Semester abroad · Baden-Württemberg Scholarship.",
      },
      {
        id: "edu-upenn",
        title: "English Language Program",
        place: "University of Pennsylvania",
        date: "Summer 2026",
        text: "Coursework in Leadership, Positive Psychology, and American Values & Immigration.",
      },
    ],
    skillsTitle: "Skills",
    skills: [
      {
        title: "Finance & Economics",
        text: "Capital management · Macroeconomics · Econometrics · Finance · Accounting · Regulatory concepts (Basel III, RWA)",
      },
      {
        title: "Data & Tools",
        text: "Python · R · SQL · Advanced Excel & VBA · Databricks · JavaScript",
      },
      {
        title: "Leadership & Communication",
        text: "Quantitative instruction · Public speaking · Project design · Academic representation",
      },
    ],
    awardsTitle: "Awards & honors",
    awards: [
      {
        id: "award-penn",
        title: "USA Summer Experience - Penn 2026",
        place: "Santander Open Academy",
        date: "Jul 2025",
        text: "Selected among ~90 students from 150,000+ applicants for a Summer Program in the U.S.",
        anchorType: "education",
        anchorId: "edu-upenn",
      },
      {
        id: "award-honor-roll",
        title: "Honor Roll Student",
        place: "Universidad de Chile",
        date: "2024, 2025 & 2026",
        text: "Top 1% of students in my cohort. Received the distinction for three consecutive years (2023–2025)",
        anchorType: "education",
        anchorId: "edu-uchile",
      },
      {
        id: "award-bw",
        title: "Baden-Württemberg-Stipendium",
        place: "Baden-Württemberg Stiftung",
        date: "May 2025",
        text: "Academic merit-based scholarship which funded my exchange program.",
        anchorType: "education",
        anchorId: "edu-mannheim",
      },
      {
        id: "award-critical-thinking",
        title: "Critical Thinking Award",
        place: "Universidad Andrés Bello",
        date: "Sep 2022",
        text: "Debate between school teams about random topics prepared within 50 minutes. We were recognized by our critical thinking.",
        anchorType: "",
        anchorId: "",
      },
      {
        id: "award-hs-honor-roll",
        title: "High School Honor Roll",
        place: "Seminario San Rafael",
        date: "2019, 2020, 2021 & 2022",
        text: "Part of the Honor Roll during my 4 years of high school.",
        anchorType: "",
        anchorId: "",
      },
    ],
    coursesTitle: "Additional courses",
    courses: [],
    volunteeringTitle: "Volunteering",
    volunteering: [
      {
        id: "vol-school-council",
        title: "School Council Representative",
        place: "School of Business and Economics",
        date: "Nov 2024 - Oct 2025",
        text: "Elected to represent more than 2000 students of the Faculty of Economics and Business (FEN), University of Chile. Participated in the School Council, bringing student perspectives to discussions on academic affairs, student experience, and faculty development while collaborating with faculty leadership and fellow student representatives.",
      },
      {
        id: "vol-class-rep",
        title: "Class Representative",
        place: "Students Council - School of Business and Economics",
        date: "Jun 2023 - Oct 2024",
        text: "Elected twice to represent my cohort (2023 and 2024). Acted as a liaison between students, the Student Council, and the university, gathering student feedback, communicating key concerns, and contributing to solutions that improved the academic experience.",
      },
      {
        id: "vol-marketing",
        title: "Marketing Staff",
        place: "Espacio Mejor Foundation",
        date: "Apr 2022 - Mar 2024",
        text: "",
      },
      {
        id: "vol-techo",
        title: "Student tutor",
        place: "Techo Chile",
        date: "2021 - 2022",
        text: "Provided academic tutoring and socio-emotional support to a primary school student from a vulnerable community, helping strengthen learning outcomes across multiple subjects.",
      },
    ],
    publicationsNav: "Publications",
    publicationsTitle: "Publications",
    publicationsIntro:
      "A selection of my LinkedIn posts and writing. Each one links to the original post.",
    publicationsEmpty: "New posts are coming soon.",
    contactTitle: "Let's grab a coffee",
    contactText:
      "I'm always up for a good conversation — over coffee or a call. Open to internships and analyst opportunities where data and analytics support decision-making in finance, operations, or process improvement.",
    metaTitle: "Vicente G. Gómez | Economics, Finance & Data",
    metaDescription:
      "Economics student transferring to UC3M Madrid (from Universidad de Chile), Capital Management Intern at Banco Santander, and Teaching Assistant. Finance, data, and international experience in Germany and the U.S.",
  },

  es: {
    badgeEnabled: false,
    badge: "Disponible para prácticas y oportunidades de analista · 2026",
    nav: [
      { id: "about", label: "Sobre mí" },
      { id: "experience", label: "Experiencia" },
      { id: "education", label: "Educación" },
      { id: "skills", label: "Habilidades" },
      { id: "awards", label: "Reconocimientos" },
      { id: "contact", label: "Contacto" },
      { id: "more", label: "Más" },
    ],
    subtitle:
      "Estudiante de Economía en finanzas, datos y docencia, con una trayectoria académica internacional.",
    description:
      "Sólida formación cuantitativa junto con experiencia práctica en finanzas, validación de datos y automatización de procesos. Practicante en Gestión de Capital en Banco Santander, practicante como Analista de Negocios en Bridge Ventures y ayudante docente en más de 7 cursos de economía y finanzas. En proceso de traslado desde la Universidad de Chile a la UC3M de Madrid para continuar mi carrera de Economía.",
    primaryCta: "Descargar CV",
    secondaryCta: "Conversemos",
    aboutTitle: "En qué me enfoco",
    about:
      "Mi principal interés profesional es usar datos y análisis para mejorar decisiones en finanzas y operaciones. En la práctica, eso ha significado validar datos de gestión de capital y automatizar procesos recurrentes en Santander Chile, además de apoyar el desarrollo de plataformas, las operaciones del negocio y la mejora de procesos en Bridge Ventures Group.\n\nAbordo los problemas partiendo por entender la pregunta de negocio o económica de fondo, para luego estructurar la información y usar herramientas como Excel y VBA, SQL, Python, R, JavaScript y Databricks que hagan útil el análisis. Me interesa especialmente el trabajo que conecta el pensamiento cuantitativo con desafíos operativos reales: mejorar un proceso, validar un modelo o proyecto, reducir tareas repetitivas o ayudar a que los equipos decidan mejor informados.\n\nLa docencia es una parte complementaria de este perfil. Ser ayudante en siete cursos universitarios ha fortalecido mi capacidad de desglosar conceptos técnicos, comunicar con claridad y adaptar las explicaciones a distintas audiencias. Mis experiencias académicas en Chile, Alemania y Estados Unidos también han moldeado cómo colaboro y cómo enfrento problemas en distintos contextos institucionales y culturales.",
    highlights: [
      { value: "Top 1%", label: "Lista de Honor FEN · Universidad de Chile" },
      { value: "Santander", label: "Practicante en Gestión de Capital" },
      { value: "+7 cursos", label: "Experiencia como ayudante docente" },
      {
        value: "3 países",
        label: "Experiencia académica en Chile, Alemania y EE. UU.",
      },
    ],
    experienceTitle: "Experiencia",
    experiences: [
      {
        id: "exp-bridge",
        role: "Practicante Analista de Negocios",
        place: "Bridge Ventures Group",
        date: "Jun 2026 – Presente",
        text: "- Trabajo directamente con el CEO en operaciones, tecnología e iniciativas estratégicas, conectando las necesidades operativas del día a día con las prioridades más amplias del negocio.\n- Contribuyo al desarrollo, prueba, lanzamiento y adopción de una plataforma interna que apoya las operaciones de leasing y factoring mediante mejor comunicación, automatización de flujos de trabajo, facturación y pagos.",
        skills: "Operaciones · Automatización de procesos",
      },
      {
        id: "exp-santander",
        role: "Practicante en Gestión de Capital",
        place: "Banco Santander",
        date: "Mar 2026 – Jun 2026",
        text: "- Validé datos de gestión de capital y automaticé procesos recurrentes con VBA, JavaScript, SQL y Databricks, reduciendo el tiempo necesario para el procesamiento manual.\n- Realicé controles de datos que apoyaron el desarrollo y la validación de herramientas analíticas internas y proyectos de gestión de capital.\n- Trabajé con datos de gestión de capital y conceptos regulatorios como Basilea III, Activos Ponderados por Riesgo (RWA), RORWA y RORAC.",
        skills: "SQL · VBA · Basilea III / RWA",
      },
      {
        id: "exp-ta",
        role: "Ayudante docente",
        place: "Universidad de Chile",
        date: "Feb 2024 – Presente",
        text: "- Ayudante en más de 7 cursos de la Facultad de Economía y Negocios, incluidos Econometría, Macroeconomía, Contabilidad, Finanzas, Estadística, Economía y Comunicación.\n- Preparo material de aprendizaje y dirijo sesiones de ejercicios que traducen conceptos técnicos en explicaciones claras, estructuradas y aplicables.\n- Corrijo evaluaciones y respondo las consultas de los estudiantes.",
        skills: "Econometría · Macroeconomía · Finanzas",
      },
      {
        id: "exp-tutor",
        role: "Tutor de Microeconomía",
        place: "Departamento de Economía, Universidad de Chile",
        date: "Mar 2025 – Jun 2026",
        text: "- Diseñé planes de clase y material complementario para conectar la teoría económica con ejemplos estructurados y ejercicios de resolución de problemas.\n- Guié a los estudiantes por los conceptos centrales, aclaré dudas y adapté las explicaciones para reforzar su comprensión de la materia.",
        skills: "Microeconomía · Diseño de clases",
      },
      {
        id: "exp-project-designer",
        role: "Diseñador de proyecto",
        place: "Prorrectoría, Universidad de Chile",
        date: "Jul 2024 – Sep 2024",
        text: "- Rediseñé el modelo de mentoría de la Red Alumni de la universidad, estructurando vías separadas de mentoría profesional y de emprendimiento.\n- Definí los principios de gobernanza del programa, los roles de los participantes, la estructura de las sesiones y los objetivos operativos.",
        skills: "Diseño de programas · Gobernanza",
      },
    ],
    educationTitle: "Educación",
    education: [
      {
        id: "edu-uc3m",
        title: "Licenciatura en Economía",
        place: "Universidad Carlos III de Madrid",
        date: "Desde Sep 2026",
        text: "Continuación de mi carrera de Economía como estudiante de traslado desde la Universidad de Chile.",
      },
      {
        id: "edu-uchile",
        title: "Licenciatura en Economía",
        place: "Universidad de Chile",
        date: "2023 – 2025",
        text: "Lista de Honor FEN · Top 1% de la generación (2023–2025) · puesto 3 de 554 estudiantes.",
      },
      {
        id: "edu-mannheim",
        title: "Administración de Empresas (BWL)",
        place: "Universität Mannheim",
        date: "Otoño 2025",
        text: "Semestre de intercambio · Beca Baden-Württemberg.",
      },
      {
        id: "edu-upenn",
        title: "Programa de Inglés",
        place: "University of Pennsylvania",
        date: "Verano 2026",
        text: "Cursos de Liderazgo, Psicología Positiva y American Values & Immigration.",
      },
    ],
    skillsTitle: "Habilidades",
    skills: [
      {
        title: "Finanzas y economía",
        text: "Gestión de capital · Macroeconomía · Econometría · Finanzas · Contabilidad · Conceptos regulatorios (Basilea III, RWA)",
      },
      {
        title: "Datos y herramientas",
        text: "Python · R · SQL · Excel avanzado y VBA · Databricks · JavaScript",
      },
      {
        title: "Liderazgo y comunicación",
        text: "Instrucción cuantitativa · Oratoria · Diseño de proyectos · Representación académica",
      },
    ],
    awardsTitle: "Reconocimientos",
    awards: [
      {
        id: "award-penn",
        title: "USA Summer Experience - Penn 2026",
        place: "Santander Open Academy",
        date: "Jul 2025",
        text: "Seleccionado entre ~90 estudiantes de más de 150.000 postulantes para un programa de verano en EE. UU.",
        anchorType: "education",
        anchorId: "edu-upenn",
      },
      {
        id: "award-honor-roll",
        title: "Lista de Honor",
        place: "Universidad de Chile",
        date: "2024, 2025 y 2026",
        text: "Top 1% de los estudiantes de mi generación. Recibí la distinción durante tres años consecutivos (2023–2025)",
        anchorType: "education",
        anchorId: "edu-uchile",
      },
      {
        id: "award-bw",
        title: "Baden-Württemberg-Stipendium",
        place: "Baden-Württemberg Stiftung",
        date: "May 2025",
        text: "Beca de mérito académico que financió mi programa de intercambio.",
        anchorType: "education",
        anchorId: "edu-mannheim",
      },
      {
        id: "award-critical-thinking",
        title: "Premio de Pensamiento Crítico",
        place: "Universidad Andrés Bello",
        date: "Sep 2022",
        text: "Debate entre equipos de colegios sobre temas aleatorios preparados en 50 minutos. Fuimos reconocidos por nuestro pensamiento crítico.",
        anchorType: "",
        anchorId: "",
      },
      {
        id: "award-hs-honor-roll",
        title: "Cuadro de Honor escolar",
        place: "Seminario San Rafael",
        date: "2019, 2020, 2021 y 2022",
        text: "Parte del Cuadro de Honor durante mis 4 años de enseñanza media.",
        anchorType: "",
        anchorId: "",
      },
    ],
    coursesTitle: "Cursos adicionales",
    courses: [],
    volunteeringTitle: "Voluntariado",
    volunteering: [
      {
        id: "vol-school-council",
        title: "Representante ante el Consejo de Facultad",
        place: "Facultad de Economía y Negocios",
        date: "Nov 2024 - Oct 2025",
        text: "Electo para representar a más de 2000 estudiantes de la Facultad de Economía y Negocios (FEN) de la Universidad de Chile. Participé en el Consejo de Facultad, aportando la perspectiva estudiantil a las discusiones sobre asuntos académicos, experiencia estudiantil y desarrollo del cuerpo docente, en colaboración con las autoridades de la facultad y otros representantes estudiantiles.",
      },
      {
        id: "vol-class-rep",
        title: "Representante de generación",
        place: "Centro de Estudiantes - Facultad de Economía y Negocios",
        date: "Jun 2023 - Oct 2024",
        text: "Electo dos veces para representar a mi generación (2023 y 2024). Actué como enlace entre los estudiantes, el Centro de Estudiantes y la universidad, recogiendo comentarios, comunicando las inquietudes principales y contribuyendo a soluciones que mejoraron la experiencia académica.",
      },
      {
        id: "vol-marketing",
        title: "Equipo de Marketing",
        place: "Fundación Espacio Mejor",
        date: "Abr 2022 - Mar 2024",
        text: "",
      },
      {
        id: "vol-techo",
        title: "Tutor estudiantil",
        place: "Techo Chile",
        date: "2021 - 2022",
        text: "Brindé apoyo académico y socioemocional a un estudiante de enseñanza básica de una comunidad vulnerable, ayudando a fortalecer sus aprendizajes en varias asignaturas.",
      },
    ],
    publicationsNav: "Publicaciones",
    publicationsTitle: "Publicaciones",
    publicationsIntro:
      "Una selección de mis publicaciones y escritos en LinkedIn. Cada una enlaza al post original.",
    publicationsEmpty: "Pronto publicaré nuevos posts aquí.",
    contactTitle: "¿Nos tomamos un café?",
    contactText:
      "Siempre disponible para conversar, con un café o por llamada. Abierto a prácticas y oportunidades de analista donde los datos y el análisis apoyen la toma de decisiones en finanzas, operaciones o mejora de procesos.",
    metaTitle: "Vicente G. Gómez | Economía, Finanzas y Datos",
    metaDescription:
      "Estudiante de Economía en traslado a la UC3M de Madrid (desde la Universidad de Chile), practicante en Gestión de Capital en Banco Santander y ayudante docente. Finanzas, datos y experiencia internacional en Alemania y EE. UU.",
  },
};
