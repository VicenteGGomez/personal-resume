import {
  type AnchorType,
  type CardImage,
  type Award,
  type Course,
  type Education,
  type Experience,
  type ExperienceRole,
  type Highlight,
  type LangContent,
  type NavItem,
  type ProjectImage,
  type ProjectLink,
  type ProjectPost,
  type Publication,
  type ResumeData,
  type Skill,
  type SpokenLanguage,
  type Story,
  type StoryEntry,
  type StoryImage,
  type StoryIntro,
  type StoryLink,
  type StoryMilestone,
  type Volunteering,
  MAX_LIST_ITEMS,
  experienceRoles,
  navFromSections,
  seedResumeData,
  withRoles,
} from "@/lib/resume-content";
import { type Fit, MAX_ZOOM, MIN_ZOOM } from "@/lib/image-framing";
import { randomUUID } from "node:crypto";
import { uniqueSlug } from "@/lib/slug";
import { asThemeChoice } from "@/lib/theme";

/**
 * Coerces arbitrary client input into a valid ResumeData shape. The admin
 * editor is trusted only after this pass: every field is forced to a string,
 * capped in length, and arrays are capped in count. Unknown fields are dropped.
 */

const MAX_ITEMS = MAX_LIST_ITEMS;

function str(value: unknown, max = 4000): string {
  if (value == null) return "";
  return String(value).slice(0, max);
}

/** An image URL: trimmed, so a stray-whitespace paste is not stored as a picture. */
function imageUrl(value: unknown): string {
  return str(value, 2000).trim();
}

function arr<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value.slice(0, MAX_ITEMS) as T[]) : [];
}

/**
 * A focal-point percentage. Absent stays absent — a picture with no focus is
 * centred at the point of use, and writing 50s everywhere would only bloat the
 * stored content.
 */
function pct(value: unknown): number | undefined {
  if (value == null || value === "") return undefined;
  const n = Number(value);
  if (!Number.isFinite(n)) return undefined;
  return Math.min(100, Math.max(0, Math.round(n)));
}

/**
 * A zoom factor. Anything at or below 1 is the picture at its fitted size, so
 * it is stored as nothing at all — same reasoning as the focus percentages.
 */
function zoom(value: unknown): number | undefined {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= MIN_ZOOM) return undefined;
  return Math.min(MAX_ZOOM, Math.round(n * 100) / 100);
}

/** An explicit fit. Absent means "whatever this picture's context defaults to". */
function fit(value: unknown): Fit | undefined {
  return value === "contain" || value === "cover" ? value : undefined;
}

/** Drop every framing key that is only saying "leave this one alone". */
function framing(value: { focusX?: unknown; focusY?: unknown; zoom?: unknown; fit?: unknown }) {
  const focusX = pct(value?.focusX);
  const focusY = pct(value?.focusY);
  const scale = zoom(value?.zoom);
  const how = fit(value?.fit);
  return {
    ...(focusX == null ? {} : { focusX }),
    ...(focusY == null ? {} : { focusY }),
    ...(scale == null ? {} : { zoom: scale }),
    ...(how == null ? {} : { fit: how }),
  };
}

const ANCHOR_TYPES: AnchorType[] = [
  "experience",
  "education",
  "award",
  "course",
  "volunteering",
  "project",
];

/** Coerce arbitrary input into a valid AnchorType (empty string = none). */
function anchorType(value: unknown): AnchorType {
  return ANCHOR_TYPES.includes(value as AnchorType) ? (value as AnchorType) : "";
}

function normalizeNav(value: unknown, seed: NavItem[]): NavItem[] {
  // Rebuilt from the fixed section ids so anchors can never break; only the
  // labels come from the client, capped like every other field.
  return navFromSections(
    seed,
    arr<Partial<NavItem>>(value).map((item) => ({
      id: item?.id,
      label: str(item?.label, 60),
    })),
  );
}

function normalizeHighlights(value: unknown): Highlight[] {
  return arr<Partial<Highlight>>(value).map((h) => ({
    value: str(h?.value, 40),
    label: str(h?.label, 120),
  }));
}

function normalizeExperienceRoles(value: unknown): ExperienceRole[] {
  return (
    arr<Partial<ExperienceRole>>(value)
      .map((r) => ({
        id: str(r?.id, 80),
        role: str(r?.role, 160),
        date: str(r?.date, 80),
        text: str(r?.text, 1200),
        skills: str(r?.skills, 400),
      }))
      // Drop blank rows so an abandoned "+ Añadir cargo" never reaches the site.
      .filter((r) => r.role || r.date || r.text || r.skills)
      // Ids are the association target, so keep the ones we were given and only
      // mint for positions added client-side without one.
      .map((r) => ({ ...r, id: r.id || randomUUID() }))
  );
}

function normalizeExperiences(value: unknown): Experience[] {
  return arr<Partial<Experience>>(value).map((e) => {
    const base: Experience = {
      // Preserve the association id; only mint one for experiences that never
      // had it (e.g. added client-side without an id).
      id: str(e?.id, 80) || randomUUID(),
      role: str(e?.role, 160),
      place: str(e?.place, 160),
      date: str(e?.date, 80),
      text: str(e?.text, 1200),
      skills: str(e?.skills, 400),
    };
    // Every experience is stored as the list of positions held at its company,
    // most recent first. One that only carries the flat fields (content saved
    // before roles existed) becomes a single role under the experience's own
    // id, so the projects and posts pointing at it keep resolving.
    const roles = normalizeExperienceRoles(e?.roles);
    return withRoles(base, roles.length > 0 ? roles : experienceRoles(base));
  });
}

function normalizeEducation(value: unknown): Education[] {
  return arr<Partial<Education>>(value).map((e) => ({
    // Stable id (association target); mint one only when it is missing.
    id: str(e?.id, 80) || randomUUID(),
    title: str(e?.title, 160),
    place: str(e?.place, 160),
    date: str(e?.date, 80),
    text: str(e?.text, 1200),
  }));
}

function normalizeAwards(value: unknown): Award[] {
  return arr<Partial<Award>>(value).map((e) => {
    const type = anchorType(e?.anchorType);
    return {
      id: str(e?.id, 80) || randomUUID(),
      title: str(e?.title, 160),
      place: str(e?.place, 160),
      date: str(e?.date, 80),
      text: str(e?.text, 1200),
      anchorType: type,
      anchorId: type ? str(e?.anchorId, 80) : "",
    };
  });
}

function normalizeCourses(value: unknown): Course[] {
  return arr<Partial<Course>>(value).map((e) => ({
    id: str(e?.id, 80) || randomUUID(),
    title: str(e?.title, 160),
    place: str(e?.place, 160),
    date: str(e?.date, 80),
    text: str(e?.text, 1200),
    certificateUrl: str(e?.certificateUrl, 500),
  }));
}

function normalizeVolunteering(value: unknown): Volunteering[] {
  return arr<Partial<Volunteering>>(value).map((e) => ({
    id: str(e?.id, 80) || randomUUID(),
    title: str(e?.title, 160),
    place: str(e?.place, 160),
    date: str(e?.date, 80),
    text: str(e?.text, 1200),
  }));
}

function normalizeLanguages(value: unknown): SpokenLanguage[] {
  return (
    arr<Partial<SpokenLanguage>>(value)
      .map((l) => ({ name: str(l?.name, 60), level: str(l?.level, 80) }))
      // An abandoned "+ Añadir idioma" row must not reach the generated CV.
      .filter((l) => l.name || l.level)
  );
}

function normalizeSkills(value: unknown): Skill[] {
  return arr<Partial<Skill>>(value).map((s) => ({
    title: str(s?.title, 120),
    text: str(s?.text, 600),
  }));
}

/**
 * A publication's pictures. Once the list exists it is the only source; before
 * that — content saved by an older admin — it is built from the three flat
 * slots the list replaced, so nothing disappears on the first save.
 */
function normalizePublicationImages(p: Partial<Publication>): CardImage[] {
  if (Array.isArray(p?.images)) {
    return arr<Partial<CardImage>>(p.images)
      .map((img) => ({ url: imageUrl(img?.url), ...framing(img ?? {}) }))
      // Drop the blank row the editor keeps while a picture is being added.
      .filter((img) => img.url);
  }
  return [p?.imageUrl, p?.imageUrl2, p?.imageUrl3]
    .map(imageUrl)
    .filter(Boolean)
    .map((url) => ({ url }));
}

function normalizePublications(value: unknown): Publication[] {
  return arr<Partial<Publication>>(value).map((p) => {
    const type = anchorType(p?.anchorType);
    const images = normalizePublicationImages(p ?? {});
    return {
      id: str(p?.id, 80) || randomUUID(),
      title: str(p?.title, 200),
      date: str(p?.date, 80),
      excerpt: str(p?.excerpt, 600),
      url: str(p?.url, 500),
      images,
      // Mirror the first three into the flat slots the list replaced, so they
      // never fall out of step with it.
      imageUrl: images[0]?.url ?? "",
      imageUrl2: images[1]?.url ?? "",
      imageUrl3: images[2]?.url ?? "",
      anchorType: type,
      // An id is only meaningful when a target kind is set.
      anchorId: type ? str(p?.anchorId, 80) : "",
    };
  });
}

function normalizeProjectLinks(value: unknown): ProjectLink[] {
  return arr<Partial<ProjectLink>>(value)
    .map((l) => ({ label: str(l?.label, 120), url: str(l?.url, 500) }))
    .filter((l) => l.label || l.url);
}

function normalizeProjectGallery(value: unknown): ProjectImage[] {
  return arr<Partial<ProjectImage>>(value)
    .map((g) => ({
      url: imageUrl(g?.url),
      caption: str(g?.caption, 300),
      ...framing(g ?? {}),
    }))
    // Drop empty rows (an image with no URL), but keep any image with a URL.
    .filter((g) => g.url);
}

function normalizeProjects(value: unknown): ProjectPost[] {
  const taken = new Set<string>();
  return arr<Partial<ProjectPost>>(value).map((p, i) => {
    const title = str(p?.title, 200);
    // Slugs are the URL of each post, so they must be unique and stable.
    const slug = uniqueSlug(str(p?.slug, 80) || title, taken, `project-${i + 1}`);
    taken.add(slug);

    // Resolve the association: prefer the generic anchor, fall back to the
    // legacy `experienceId`. Keep `experienceId` mirrored for the experience
    // case so older readers keep working.
    const legacyExp = str(p?.experienceId, 80);
    let type = anchorType(p?.anchorType);
    let anchorId = type ? str(p?.anchorId, 80) : "";
    if (!type && legacyExp) {
      type = "experience";
      anchorId = legacyExp;
    }

    return {
      slug,
      title,
      date: str(p?.date, 80),
      summary: str(p?.summary, 400),
      body: str(p?.body, 20000),
      experienceId: type === "experience" ? anchorId : "",
      anchorType: type,
      anchorId,
      coverImage: imageUrl(p?.coverImage),
      coverFit: p?.coverFit === "cover" ? "cover" : "contain",
      ...(pct(p?.coverFocusX) == null ? {} : { coverFocusX: pct(p?.coverFocusX) }),
      ...(pct(p?.coverFocusY) == null ? {} : { coverFocusY: pct(p?.coverFocusY) }),
      ...(zoom(p?.coverZoom) == null ? {} : { coverZoom: zoom(p?.coverZoom) }),
      gallery: normalizeProjectGallery(p?.gallery),
      links: normalizeProjectLinks(p?.links),
    };
  });
}

/* -------------------------------------------------------------------------- */
/* My story                                                                   */
/* -------------------------------------------------------------------------- */

function normalizeStoryIntro(value: unknown): StoryIntro {
  const v = (value ?? {}) as Partial<StoryIntro>;
  return {
    label: str(v.label, 60),
    heading: str(v.heading, 300),
    intro: str(v.intro, 1500),
    outro: str(v.outro, 600),
    metaTitle: str(v.metaTitle, 160),
    metaDescription: str(v.metaDescription, 320),
  };
}

function normalizeStoryEntry(value: unknown): StoryEntry {
  const v = (value ?? {}) as Partial<StoryEntry>;
  const date = str(v.date, 60);
  return {
    title: str(v.title, 200),
    text: str(v.text, 4000),
    // Absent stays absent: an empty override only means "use the year", and
    // writing it everywhere would bloat the stored content.
    ...(date ? { date } : {}),
  };
}

function normalizeStoryImages(value: unknown): StoryImage[] {
  return arr<Partial<StoryImage>>(value)
    .map((img) => ({
      url: imageUrl(img?.url),
      caption: str(img?.caption, 300),
      ...framing(img ?? {}),
    }))
    .filter((img) => img.url);
}

/**
 * A milestone's links to the résumé. Blank rows go, and so do duplicates: the
 * same target twice would draw the same chip twice.
 */
function normalizeStoryLinks(value: unknown): StoryLink[] {
  const seen = new Set<string>();
  const out: StoryLink[] = [];
  for (const l of arr<Partial<StoryLink>>(value)) {
    const type = anchorType(l?.type);
    const id = type ? str(l?.id, 80) : "";
    if (!type || !id) continue;
    const key = `${type}:${id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ type, id });
  }
  return out;
}

function normalizeStory(value: unknown): Story {
  const v = (value ?? {}) as Partial<Story>;
  return {
    en: normalizeStoryIntro(v.en),
    es: normalizeStoryIntro(v.es),
    milestones: arr<Partial<StoryMilestone>>(v.milestones)
      .map((m) => ({
        // Ids are the deep-link target and survive reordering, so keep the one
        // we were given and only mint for a milestone added client-side.
        id: str(m?.id, 80) || randomUUID(),
        date: str(m?.date, 60),
        en: normalizeStoryEntry(m?.en),
        es: normalizeStoryEntry(m?.es),
        images: normalizeStoryImages(m?.images),
        links: normalizeStoryLinks(m?.links),
      }))
      // Drop the blank row an abandoned "+ Añadir hito" leaves behind.
      .filter(
        (m) =>
          m.date ||
          m.en.title ||
          m.en.text ||
          m.es.title ||
          m.es.text ||
          m.images.length > 0,
      ),
  };
}

function normalizeLang(value: unknown, seed: LangContent): LangContent {
  const v = (value ?? {}) as Partial<LangContent>;
  return {
    badgeEnabled: v.badgeEnabled !== false,
    badge: str(v.badge, 160),
    nav: normalizeNav(v.nav, seed.nav),
    subtitle: str(v.subtitle, 300),
    description: str(v.description, 600),
    primaryCta: str(v.primaryCta, 60),
    secondaryCta: str(v.secondaryCta, 60),
    aboutTitle: str(v.aboutTitle, 120),
    about: str(v.about, 1500),
    highlights: normalizeHighlights(v.highlights),
    experienceTitle: str(v.experienceTitle, 120),
    experiences: normalizeExperiences(v.experiences),
    educationTitle: str(v.educationTitle, 120),
    education: normalizeEducation(v.education),
    skillsTitle: str(v.skillsTitle, 120),
    skills: normalizeSkills(v.skills),
    awardsTitle: str(v.awardsTitle, 120),
    awards: normalizeAwards(v.awards),
    coursesTitle: str(v.coursesTitle, 120),
    courses: normalizeCourses(v.courses),
    volunteeringTitle: str(v.volunteeringTitle, 120),
    volunteering: normalizeVolunteering(v.volunteering),
    publicationsNav: str(v.publicationsNav, 60),
    publicationsTitle: str(v.publicationsTitle, 120),
    publicationsIntro: str(v.publicationsIntro, 600),
    publicationsEmpty: str(v.publicationsEmpty, 300),
    contactTitle: str(v.contactTitle, 120),
    contactText: str(v.contactText, 800),
    metaTitle: str(v.metaTitle, 160),
    metaDescription: str(v.metaDescription, 320),
  };
}

export function normalizeResumeData(input: unknown): ResumeData {
  const data = (input ?? {}) as Partial<ResumeData>;
  const s = (data.shared ?? {}) as Partial<ResumeData["shared"]>;
  return {
    shared: {
      name: str(s.name, 120),
      location: str(s.location, 120),
      photoUrl: str(s.photoUrl, 2000),
      photoAlt: str(s.photoAlt, 200),
      email: str(s.email, 200),
      linkedin: str(s.linkedin, 300),
      whatsapp: str(s.whatsapp, 40),
      cvEn: str(s.cvEn, 500),
      cvEs: str(s.cvEs, 500),
      // Default to reusing the English CV when the flag is absent (old data).
      cvEsUseEn: s.cvEsUseEn !== false,
      phone: str(s.phone, 40),
      languages: normalizeLanguages(s.languages),
      // The whole LaTeX document, so the cap is a document's worth rather than
      // a field's. Absent on content saved before the CV lived here, in which
      // case the seed's template is merged back in on read.
      cvLatex: str(s.cvLatex, 60000),
      // Anything other than "light"/"dark" means "follow the visitor's device".
      defaultTheme: asThemeChoice(s.defaultTheme),
      publications: normalizePublications(s.publications),
    },
    projects: normalizeProjects(data.projects),
    story: normalizeStory(data.story),
    en: normalizeLang(data.en, seedResumeData.en),
    es: normalizeLang(data.es, seedResumeData.es),
  };
}
