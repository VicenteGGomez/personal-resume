import {
  type Education,
  type Experience,
  type Highlight,
  type LangContent,
  type NavItem,
  type ResumeData,
  type SectionId,
  type Skill,
  SECTION_IDS,
  seedResumeData,
} from "@/lib/resume-content";

/**
 * Coerces arbitrary client input into a valid ResumeData shape. The admin
 * editor is trusted only after this pass: every field is forced to a string,
 * capped in length, and arrays are capped in count. Unknown fields are dropped.
 */

const MAX_ITEMS = 30;

function str(value: unknown, max = 4000): string {
  if (value == null) return "";
  return String(value).slice(0, max);
}

function arr<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value.slice(0, MAX_ITEMS) as T[]) : [];
}

function normalizeNav(value: unknown, seed: NavItem[]): NavItem[] {
  const provided = arr<Partial<NavItem>>(value);
  const byId = new Map<string, string>();
  for (const item of provided) {
    if (item && typeof item.id === "string") {
      byId.set(item.id, str(item.label, 60));
    }
  }
  // Rebuild from the fixed section ids so anchors can never break.
  return SECTION_IDS.map((id: SectionId) => {
    const seedLabel = seed.find((n) => n.id === id)?.label ?? id;
    const label = byId.get(id);
    return { id, label: label && label.trim() ? label : seedLabel };
  });
}

function normalizeHighlights(value: unknown): Highlight[] {
  return arr<Partial<Highlight>>(value).map((h) => ({
    value: str(h?.value, 40),
    label: str(h?.label, 120),
  }));
}

function normalizeExperiences(value: unknown): Experience[] {
  return arr<Partial<Experience>>(value).map((e) => ({
    role: str(e?.role, 160),
    place: str(e?.place, 160),
    date: str(e?.date, 80),
    text: str(e?.text, 1200),
  }));
}

function normalizeEducation(value: unknown): Education[] {
  return arr<Partial<Education>>(value).map((e) => ({
    title: str(e?.title, 160),
    place: str(e?.place, 160),
    date: str(e?.date, 80),
    text: str(e?.text, 1200),
  }));
}

function normalizeSkills(value: unknown): Skill[] {
  return arr<Partial<Skill>>(value).map((s) => ({
    title: str(s?.title, 120),
    text: str(s?.text, 600),
  }));
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
    },
    en: normalizeLang(data.en, seedResumeData.en),
    es: normalizeLang(data.es, seedResumeData.es),
  };
}
