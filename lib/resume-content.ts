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
