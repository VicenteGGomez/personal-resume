export type Lang = "en" | "es";

// The five sections are anchored by fixed ids so that in-page navigation and
// deep links stay stable. Only the label of each nav item is editable.
export const SECTION_IDS = [
  "about",
  "experience",
  "education",
  "skills",
  "contact",
] as const;

export type SectionId = (typeof SECTION_IDS)[number];

export interface NavItem {
  id: SectionId;
  label: string;
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

export interface Experience {
  /**
   * Stable id used to associate projects with this experience. Existing content
   * saved before this field was added is back-filled on read (see
   * `lib/resume-store.ts`); new experiences get a generated id in the admin.
   */
  id: string;
  role: string;
  place: string;
  date: string;
  text: string;
  /**
   * Free-form skill tags, separated by commas or "·", shown as subtle chips on
   * the experience card. Optional; absent on content saved before this field.
   */
  skills: string;
}

export interface Education {
  /** Stable id so projects/publications can be associated with this entry. */
  id: string;
  title: string;
  place: string;
  date: string;
  text: string;
}

/** An award, honor, or recognition. Shares Education's shape. */
export interface Award {
  id: string;
  title: string;
  place: string;
  date: string;
  text: string;
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
  /** Card image — an uploaded image or a pasted URL. Empty = text-only card. */
  imageUrl: string;
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
 * An additional image shown in a project's gallery (below the body). Gallery
 * images render at their natural aspect ratio — scaled to the column width but
 * never cropped — so there is no fit setting here.
 */
export interface ProjectImage {
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
   */
  coverFit: "contain" | "cover";
  /** Extra images shown as a gallery below the body, at their natural size. */
  gallery: ProjectImage[];
  links: ProjectLink[];
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
  // Publications page labels. The list of publications itself is shared (see
  // SharedContent.publications); only these labels differ per language.
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
  publications: Publication[];
}

export interface ResumeData {
  shared: SharedContent;
  /** Project posts (English-only); each may reference an Experience by id. */
  projects: ProjectPost[];
  en: LangContent;
  es: LangContent;
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
    publications: [],
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

  en: {
    badgeEnabled: true,
    badge: "Open to internships & analyst opportunities · 2026",
    nav: [
      { id: "about", label: "About" },
      { id: "experience", label: "Experience" },
      { id: "education", label: "Education" },
      { id: "skills", label: "Skills" },
      { id: "contact", label: "Contact" },
    ],
    subtitle:
      "Economics student working across finance, data, and teaching — with an international academic track.",
    description:
      "Strong quantitative training combined with hands-on experience in finance, data validation, and process automation. Capital Management Intern at Banco Santander, Business Analyst Intern at Bridge Ventures, and Teaching Assistant across 7+ economics and finance courses. Transferring from Universidad de Chile to UC3M Madrid to continue my Economics degree.",
    primaryCta: "Download CV",
    secondaryCta: "Contact me",
    aboutTitle: "Positioning",
    about:
      "High-achieving Economics student with a sustained record of academic excellence — FEN Honor Roll and top 1% of class at Universidad de Chile — combined with formal teaching and leadership experience and early professional exposure to banking, capital management, and business. I work at the intersection of economics, finance, and data, moving comfortably between financial concepts and the tools used to analyze them (Excel/VBA, SQL, Python, R, Databricks). Internationally, I've studied at Universität Mannheim in Germany and the University of Pennsylvania in the U.S., and I'm now transferring from Universidad de Chile to Universidad Carlos III de Madrid to deepen my Economics training and build an international career across economics, finance, data, and operations.",
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
        text: "Support the CEO across business operations, technology, and strategy — including the development and launch of an internal platform for communication, process automation, billing, and payments — and contribute to market research and data collection for real estate opportunities.",
        skills: "Business operations · Process automation · Market research · Strategy",
      },
      {
        id: "exp-santander",
        role: "Capital Management Intern",
        place: "Banco Santander",
        date: "Mar 2026 – Jun 2026",
        text: "Supported the Capital Management team through data validation and process automation using VBA, JavaScript, SQL, and Databricks, with hands-on exposure to capital and regulatory concepts including Basel III, RWA, RORWA, and RORAC.",
        skills: "VBA · SQL · Databricks · Data validation · Basel III · RWA",
      },
      {
        id: "exp-ta",
        role: "Teaching Assistant",
        place: "Universidad de Chile",
        date: "Feb 2024 – Present",
        text: "Teaching assistant across 7+ courses at the Faculty of Economics and Business, including Econometrics, Macroeconomics, Accounting, Finance, Statistics, Economics, and Communication Skills.",
        skills: "Teaching · Econometrics · Macroeconomics · Finance · Statistics",
      },
      {
        id: "exp-tutor",
        role: "Economics & Microeconomics Tutor",
        place: "Department of Economics, Universidad de Chile",
        date: "Mar 2025 – Jun 2026",
        text: "Designed and delivered weekly lessons and supplementary materials to strengthen students' understanding of core Microeconomics and Economics concepts.",
        skills: "Microeconomics · Lesson design · Tutoring",
      },
      {
        id: "exp-project-designer",
        role: "Project Designer",
        place: "Provost's Office, Universidad de Chile",
        date: "Jul 2024 – Sep 2024",
        text: "Designed strategic guidelines, governance principles, and operational objectives for the University of Chile Alumni Network, structuring the professional and entrepreneurial mentoring frameworks used to strengthen alumni engagement.",
        skills: "Program design · Governance · Stakeholder management",
      },
    ],
    educationTitle: "Education",
    education: [
      {
        id: "edu-uc3m",
        title: "B.S. in Economics",
        place: "Universidad Carlos III de Madrid",
        date: "Sep 2026 – Present",
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
        text: "Selected among ~90 students from 150,000+ applicants via Santander Open Academy; coursework in Leadership, Positive Psychology, and American Values & Immigration.",
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
        text: "Python · R · SQL · Advanced Excel & VBA · Databricks · Stata · LaTeX",
      },
      {
        title: "Leadership & Communication",
        text: "Teaching · Public speaking · Project design · Academic representation",
      },
    ],
    awardsTitle: "Awards & honors",
    awards: [],
    coursesTitle: "Additional courses",
    courses: [],
    volunteeringTitle: "Volunteering",
    volunteering: [],
    publicationsNav: "Publications",
    publicationsTitle: "Publications",
    publicationsIntro:
      "A selection of my LinkedIn posts and writing. Each one links to the original post.",
    publicationsEmpty: "New posts are coming soon.",
    contactTitle: "Let's connect",
    contactText:
      "Open to internships and analyst opportunities in finance, data, economics, and operations — across Europe, the U.S., and Latin America. I usually reply within a day.",
    metaTitle: "Vicente G. Gómez | Economics, Finance & Data",
    metaDescription:
      "Economics student transferring to UC3M Madrid (from Universidad de Chile), Capital Management Intern at Banco Santander, and Teaching Assistant. Finance, data, and international experience in Germany and the U.S.",
  },

  es: {
    badgeEnabled: true,
    badge: "Disponible para prácticas y oportunidades de analista · 2026",
    nav: [
      { id: "about", label: "Sobre mí" },
      { id: "experience", label: "Experiencia" },
      { id: "education", label: "Educación" },
      { id: "skills", label: "Habilidades" },
      { id: "contact", label: "Contacto" },
    ],
    subtitle:
      "Estudiante de Economía en finanzas, datos y docencia, con una trayectoria académica internacional.",
    description:
      "Sólida formación cuantitativa junto con experiencia práctica en finanzas, validación de datos y automatización de procesos. Practicante en Gestión de Capital en Banco Santander, practicante como Analista de Negocios en Bridge Ventures y ayudante docente en más de 7 cursos de economía y finanzas. En proceso de traslado desde la Universidad de Chile a la UC3M de Madrid para continuar mi carrera de Economía.",
    primaryCta: "Descargar CV",
    secondaryCta: "Contáctame",
    aboutTitle: "Perfil profesional",
    about:
      "Estudiante de Economía con un historial sostenido de excelencia académica —Lista de Honor FEN y top 1% de mi generación en la Universidad de Chile—, junto con experiencia formal en docencia y liderazgo y exposición profesional temprana a banca, gestión de capital y negocios. Trabajo en la intersección entre economía, finanzas y datos, moviéndome con comodidad entre los conceptos financieros y las herramientas para analizarlos (Excel/VBA, SQL, Python, R, Databricks). En el plano internacional, he estudiado en la Universität Mannheim (Alemania) y en la University of Pennsylvania (EE. UU.), y ahora me traslado desde la Universidad de Chile a la Universidad Carlos III de Madrid para profundizar mi formación en Economía y construir una carrera internacional en economía, finanzas, datos y operaciones.",
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
        text: "Apoyo al CEO en operaciones, tecnología y estrategia —incluida la creación y el lanzamiento de una plataforma interna de comunicación, automatización de procesos, facturación y pagos— y colaboro en investigación de mercado y recolección de datos para oportunidades inmobiliarias.",
        skills: "Operaciones · Automatización de procesos · Investigación de mercado · Estrategia",
      },
      {
        id: "exp-santander",
        role: "Practicante en Gestión de Capital",
        place: "Banco Santander",
        date: "Mar 2026 – Jun 2026",
        text: "Apoyé al equipo de Gestión de Capital mediante validación de datos y automatización de procesos con VBA, JavaScript, SQL y Databricks, con exposición práctica a conceptos de capital y regulación como Basilea III, RWA, RORWA y RORAC.",
        skills: "VBA · SQL · Databricks · Validación de datos · Basilea III · RWA",
      },
      {
        id: "exp-ta",
        role: "Ayudante docente",
        place: "Universidad de Chile",
        date: "Feb 2024 – Presente",
        text: "Ayudante en más de 7 cursos de la Facultad de Economía y Negocios, incluidos Econometría, Macroeconomía, Contabilidad, Finanzas, Estadística, Economía y Comunicación.",
        skills: "Docencia · Econometría · Macroeconomía · Finanzas · Estadística",
      },
      {
        id: "exp-tutor",
        role: "Tutor de Economía y Microeconomía",
        place: "Departamento de Economía, Universidad de Chile",
        date: "Mar 2025 – Jun 2026",
        text: "Diseñé y dicté clases semanales y material complementario para reforzar la comprensión de conceptos clave de Microeconomía y Economía.",
        skills: "Microeconomía · Diseño de clases · Tutoría",
      },
      {
        id: "exp-project-designer",
        role: "Diseñador de proyecto",
        place: "Prorrectoría, Universidad de Chile",
        date: "Jul 2024 – Sep 2024",
        text: "Diseñé lineamientos estratégicos, principios de gobernanza y objetivos operativos para la Red Alumni de la Universidad de Chile, estructurando los modelos de mentoría profesional y de emprendimiento para fortalecer el vínculo con los egresados.",
        skills: "Diseño de programas · Gobernanza · Gestión de stakeholders",
      },
    ],
    educationTitle: "Educación",
    education: [
      {
        id: "edu-uc3m",
        title: "Licenciatura en Economía",
        place: "Universidad Carlos III de Madrid",
        date: "Sep 2026 – Presente",
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
        text: "Seleccionado entre ~90 estudiantes de más de 150.000 postulantes mediante Santander Open Academy; cursos de Liderazgo, Psicología Positiva y American Values & Immigration.",
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
        text: "Python · R · SQL · Excel avanzado y VBA · Databricks · Stata · LaTeX",
      },
      {
        title: "Liderazgo y comunicación",
        text: "Docencia · Oratoria · Diseño de proyectos · Representación académica",
      },
    ],
    awardsTitle: "Reconocimientos",
    awards: [],
    coursesTitle: "Cursos adicionales",
    courses: [],
    volunteeringTitle: "Voluntariado",
    volunteering: [],
    publicationsNav: "Publicaciones",
    publicationsTitle: "Publicaciones",
    publicationsIntro:
      "Una selección de mis publicaciones y escritos en LinkedIn. Cada una enlaza al post original.",
    publicationsEmpty: "Pronto publicaré nuevos posts aquí.",
    contactTitle: "Conectemos",
    contactText:
      "Abierto a prácticas y oportunidades de analista en finanzas, datos, economía y operaciones —en Europa, EE. UU. y Latinoamérica—. Suelo responder dentro de un día.",
    metaTitle: "Vicente G. Gómez | Economía, Finanzas y Datos",
    metaDescription:
      "Estudiante de Economía en traslado a la UC3M de Madrid (desde la Universidad de Chile), practicante en Gestión de Capital en Banco Santander y ayudante docente. Finanzas, datos y experiencia internacional en Alemania y EE. UU.",
  },
};
