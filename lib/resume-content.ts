export type Lang = "en" | "es";

export const resumeContent = {
  en: {
    lang: "en",
    switchLabel: "ES",
    switchHref: "/es",
    nav: [
      ["about", "About"],
      ["experience", "Experience"],
      ["education", "Education"],
      ["skills", "Skills"],
      ["contact", "Contact"],
    ],
    badge: "Interactive Resume",
    title: "Vicente G. Gómez",
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
      ["Top 1%", "Honor Roll · Universidad de Chile"],
      ["Santander", "Capital Management Intern"],
      ["+7 courses", "Teaching Assistant experience"],
      ["B2+", "Professional English proficiency"],
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
      ["Finance & Economics", "Capital management · Macroeconomics · Econometrics · Finance · Accounting"],
      ["Data & Tools", "Python · R · Stata · Advanced Excel · VBA · LaTeX"],
      ["Leadership", "Teaching · Public speaking · Project coordination · Academic representation"],
    ],
    contactTitle: "Let’s connect",
    contactText:
      "Open to opportunities in banking, consulting, finance, education, and data-oriented projects.",
  },

  es: {
    lang: "es",
    switchLabel: "EN",
    switchHref: "/en",
    nav: [
      ["about", "Sobre mí"],
      ["experience", "Experiencia"],
      ["education", "Educación"],
      ["skills", "Habilidades"],
      ["contact", "Contacto"],
    ],
    badge: "CV Interactivo",
    title: "Vicente G. Gómez",
    subtitle:
      "Estudiante de Economía, practicante en Gestión de Capital y ayudante docente.",
    description:
      "Enfocado en finanzas, análisis de datos, docencia y diseño de proyectos. Desarrollo soluciones estructuradas para entornos académicos, financieros y educativos.",
    primaryCta: "Descargar CV",
    secondaryCta: "Contactarme",
    aboutTitle: "Perfil profesional",
    about:
      "Estudiante de Economía en la Universidad de Chile, ubicado dentro del top 1% de su generación. Experiencia en gestión de capital, docencia, liderazgo académico, diseño de proyectos y resolución de problemas con datos.",
    highlights: [
      ["Top 1%", "Lista de Honor · Universidad de Chile"],
      ["Santander", "Practicante en Gestión de Capital"],
      ["+7 cursos", "Experiencia como ayudante docente"],
      ["B2+", "Inglés profesional"],
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
        date: "Fall 2025",
        text: "Semestre de intercambio · Beca Baden-Württemberg.",
      },
    ],
    skillsTitle: "Habilidades",
    skills: [
      ["Finanzas y economía", "Gestión de capital · Macroeconomía · Econometría · Finanzas · Contabilidad"],
      ["Datos y herramientas", "Python · R · Stata · Excel avanzado · VBA · LaTeX"],
      ["Liderazgo", "Docencia · Oratoria · Coordinación de proyectos · Representación académica"],
    ],
    contactTitle: "Conectemos",
    contactText:
      "Abierto a oportunidades en banca, consultoría, finanzas, educación y proyectos orientados a datos.",
  },
} as const;