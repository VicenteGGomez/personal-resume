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

export interface Experience {
  role: string;
  place: string;
  date: string;
  text: string;
}

export interface Education {
  title: string;
  place: string;
  date: string;
  text: string;
}

export interface Skill {
  title: string;
  text: string;
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
}

export interface ResumeData {
  shared: SharedContent;
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
    photoUrl: "",
    photoAlt: "Vicente G. Gómez",
    email: "vicente@vicentegomez.cl",
    linkedin: "https://www.linkedin.com/in/vicenteggomez",
    whatsapp: "56920926785",
    cvEn: "/cv-vicente-gomez-en.pdf",
    cvEs: "/cv-vicente-gomez-en.pdf",
  },

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
      "Economics student, Capital Management Intern, and Teaching Assistant.",
    description:
      "Focused on finance, data analysis, teaching, and project design. I build structured solutions for academic, financial, and educational environments.",
    primaryCta: "Download CV",
    secondaryCta: "Contact me",
    aboutTitle: "Positioning",
    about:
      "Economics student at Universidad de Chile, ranked in the top 1% of the class. Experience across capital management, teaching, academic leadership, project design, and data-oriented problem solving.",
    highlights: [
      { value: "Top 1%", label: "Honor Roll · Universidad de Chile" },
      { value: "Santander", label: "Capital Management Intern" },
      { value: "+7 courses", label: "Teaching Assistant experience" },
      { value: "B2+", label: "Professional English proficiency" },
    ],
    experienceTitle: "Experience",
    experiences: [
      {
        role: "Capital Management Intern",
        place: "Banco Santander",
        date: "Mar 2026 – Present",
        text: "Supporting financial analysis, reporting, and internal management processes related to capital planning, monitoring, and decision-making.",
      },
      {
        role: "Teaching Assistant",
        place: "Universidad de Chile",
        date: "Feb 2024 – Present",
        text: "Teaching assistant in Macroeconomics, Econometrics, Accounting, Finance, Statistics, Communication Skills, and Economics.",
      },
      {
        role: "Economics and Microeconomics Tutor",
        place: "Department of Economics, Universidad de Chile",
        date: "Mar 2025 – Present",
        text: "Developing weekly lessons and supplementary materials to strengthen student understanding of Economics and Microeconomics.",
      },
      {
        role: "Project Designer",
        place: "Provost Office, Universidad de Chile",
        date: "Jul 2024 – Sep 2024",
        text: "Designed strategic guidelines and governance principles for the University of Chile Alumni Network.",
      },
    ],
    educationTitle: "Education",
    education: [
      {
        title: "B.S. in Economics",
        place: "Universidad de Chile",
        date: "2023 – Present",
        text: "Honor Roll · Ranked 3rd out of 554 students.",
      },
      {
        title: "Business Administration / BWL",
        place: "Universität Mannheim",
        date: "Fall 2025",
        text: "Semester abroad · Baden-Württemberg Scholarship.",
      },
    ],
    skillsTitle: "Skills",
    skills: [
      {
        title: "Finance & Economics",
        text: "Capital management · Macroeconomics · Econometrics · Finance · Accounting",
      },
      {
        title: "Data & Tools",
        text: "Python · R · Stata · Advanced Excel · VBA · LaTeX",
      },
      {
        title: "Leadership",
        text: "Teaching · Public speaking · Project coordination · Academic representation",
      },
    ],
    contactTitle: "Let’s connect",
    contactText:
      "Open to opportunities in banking, consulting, finance, education, and data-oriented projects. I usually reply within a day.",
    metaTitle: "Vicente G. Gómez | Resume",
    metaDescription:
      "Economics student at Universidad de Chile, Capital Management Intern at Banco Santander, and Teaching Assistant. Finance, data analysis, and project design.",
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
      "Estudiante de Economía, practicante en Gestión de Capital y ayudante docente.",
    description:
      "Enfocado en finanzas, análisis de datos, docencia y diseño de proyectos. Desarrollo soluciones estructuradas para entornos académicos, financieros y educativos.",
    primaryCta: "Descargar CV",
    secondaryCta: "Contáctame",
    aboutTitle: "Perfil profesional",
    about:
      "Estudiante de Economía en la Universidad de Chile, ubicado dentro del top 1% de su generación. Experiencia en gestión de capital, docencia, liderazgo académico, diseño de proyectos y resolución de problemas con datos.",
    highlights: [
      { value: "Top 1%", label: "Lista de Honor · Universidad de Chile" },
      { value: "Santander", label: "Practicante en Gestión de Capital" },
      { value: "+7 cursos", label: "Experiencia como ayudante docente" },
      { value: "B2+", label: "Inglés profesional" },
    ],
    experienceTitle: "Experiencia",
    experiences: [
      {
        role: "Practicante en Gestión de Capital",
        place: "Banco Santander",
        date: "Mar 2026 – Presente",
        text: "Apoyo en análisis financiero, reportes y procesos internos asociados a planificación, monitoreo y toma de decisiones de capital.",
      },
      {
        role: "Ayudante docente",
        place: "Universidad de Chile",
        date: "Feb 2024 – Presente",
        text: "Ayudante en Macroeconomía, Econometría, Contabilidad, Finanzas, Estadística, Comunicación y Economía.",
      },
      {
        role: "Tutor de Economía y Microeconomía",
        place: "Departamento de Economía, Universidad de Chile",
        date: "Mar 2025 – Presente",
        text: "Desarrollo de clases semanales y material complementario para reforzar el aprendizaje de Economía y Microeconomía.",
      },
      {
        role: "Diseñador de proyecto",
        place: "Prorrectoría, Universidad de Chile",
        date: "Jul 2024 – Sep 2024",
        text: "Diseño de lineamientos estratégicos y principios de gobernanza para la Red Alumni de la Universidad de Chile.",
      },
    ],
    educationTitle: "Educación",
    education: [
      {
        title: "Licenciatura en Economía",
        place: "Universidad de Chile",
        date: "2023 – Presente",
        text: "Lista de Honor · Puesto 3 de 554 estudiantes.",
      },
      {
        title: "Administración de Empresas / BWL",
        place: "Universität Mannheim",
        date: "Otoño 2025",
        text: "Semestre de intercambio · Beca Baden-Württemberg.",
      },
    ],
    skillsTitle: "Habilidades",
    skills: [
      {
        title: "Finanzas y economía",
        text: "Gestión de capital · Macroeconomía · Econometría · Finanzas · Contabilidad",
      },
      {
        title: "Datos y herramientas",
        text: "Python · R · Stata · Excel avanzado · VBA · LaTeX",
      },
      {
        title: "Liderazgo",
        text: "Docencia · Oratoria · Coordinación de proyectos · Representación académica",
      },
    ],
    contactTitle: "Conectemos",
    contactText:
      "Abierto a oportunidades en banca, consultoría, finanzas, educación y proyectos orientados a datos. Suelo responder dentro de un día.",
    metaTitle: "Vicente G. Gómez | CV",
    metaDescription:
      "Estudiante de Economía en la Universidad de Chile, practicante en Gestión de Capital en Banco Santander y ayudante docente. Finanzas, análisis de datos y proyectos.",
  },
};
