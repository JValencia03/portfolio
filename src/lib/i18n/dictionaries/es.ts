import type { Dictionary } from "./en";

/** Spanish interface copy. Must match the shape defined by `en.ts`. */
const es: Dictionary = {
  meta: {
    role: "Desarrollador Full Stack",
    titles: {
      hero: "Desarrollador Full Stack",
      projects: "Proyectos",
      skills: "Habilidades",
      about: "Sobre mí",
      contact: "Contacto",
      distance: "Distance — Caso de estudio",
      dodaman: "Dodaman — Caso de estudio",
      resume: "Currículum",
    },
    descriptions: {
      hero: "Portfolio de {name}, Desarrollador Full Stack.",
      projects: "Proyectos de {name}, Desarrollador Full Stack.",
      skills: "Habilidades técnicas de {name}, Desarrollador Full Stack.",
      about: "Sobre {name}, Desarrollador Full Stack.",
      contact: "Contacta con {name}, Desarrollador Full Stack.",
      distance: "Caso de estudio de Distance, un proyecto de {name}.",
      dodaman: "Caso de estudio de Dodaman (Document Dashboard Management), un proyecto de {name}.",
      resume: "Currículum de {name}, Desarrollador Full Stack.",
    },
  },
  common: {
    skipToContent: "Saltar al contenido",
    placeholder: "Pendiente",
    opensInNewTab: "se abre en una pestaña nueva",
  },
  nav: {
    label: "Navegación principal",
    home: "Inicio",
    menu: "Menú",
    projects: "Proyectos",
    skills: "Habilidades",
    about: "Sobre mí",
    contact: "Contacto",
    resume: "Currículum",
    language: "Idioma",
  },
  hero: {
    role: "Desarrollador Full Stack",
    primaryCta: "Ver proyectos",
    secondaryCta: "Contactar",
    scrollHint: "Desplázate para explorar",
    stackTitle: "Stack tecnológico",
    placeholders: {
      intro: "Breve introducción profesional",
      stack: "Resumen del stack tecnológico",
      highlights: "Bloques de información compactos",
    },
  },
  projects: {
    eyebrow: "Proyectos",
    title: "Proyectos",
    technologies: "Tecnologías",
    status: "Estado",
    caseStudyLink: "Ver caso de estudio",
    placeholders: {
      description: "Descripción breve",
      visual: "Recurso visual",
      technologies: "Tecnologías",
      status: "Estado del proyecto",
    },
  },
  skills: {
    eyebrow: "Habilidades",
    title: "Habilidades",
    categories: {
      frontend: "Frontend",
      backend: "Backend",
      databases: "Bases de datos",
      systems: "Sistemas y herramientas",
      ai: "Desarrollo asistido por IA",
    },
    placeholders: {
      items: "Tecnologías de esta categoría",
    },
  },
  about: {
    eyebrow: "Sobre mí",
    title: "Sobre mí",
    blocks: {
      introduction: "Introducción personal",
      approach: "Enfoque de desarrollo",
      interests: "Intereses técnicos",
      objectives: "Objetivos profesionales",
    },
  },
  contact: {
    eyebrow: "Contacto",
    title: "Construyamos algo.",
    email: "Correo",
    github: "GitHub",
    linkedin: "LinkedIn",
    placeholders: {
      email: "Dirección de correo",
      github: "URL del perfil de GitHub",
      linkedin: "URL del perfil de LinkedIn",
    },
  },
  caseStudy: {
    eyebrow: "Caso de estudio",
    blocks: {
      overview: "Resumen",
      problem: "Problema",
      approach: "Enfoque",
      architecture: "Arquitectura",
      decisions: "Decisiones técnicas",
      challenges: "Desafíos",
      results: "Resultados",
    },
    links: "Enlaces",
    backToProjects: "Volver a proyectos",
    previousProject: "Proyecto anterior",
    nextProject: "Siguiente proyecto",
    placeholders: {
      links: "Enlaces del proyecto",
    },
  },
  resume: {
    eyebrow: "Currículum",
    title: "Currículum",
    open: "Abrir currículum",
    unavailable: "El PDF del currículum aún no está disponible",
    contactLink: "Contactar",
    placeholders: {
      closingStatement: "Mensaje de cierre (opcional)",
    },
  },
  notFound: {
    title: "Página no encontrada",
    description: "La página que buscas no existe.",
    home: "Volver al portfolio",
  },
};

export default es;
