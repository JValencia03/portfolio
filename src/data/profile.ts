import type { Localized } from "./content";

export interface InfoBlock {
  label: Localized;
  value: Localized;
}

export interface Profile {
  name: string;
  /** Short professional introduction shown in the hero. */
  intro: Localized;
  /** Technology names for the hero stack summary. */
  stack: string[];
  /** Compact information blocks in the hero's right column. */
  highlights: InfoBlock[];
  about: {
    introduction: Localized;
    approach: Localized;
    interests: Localized;
    objectives: Localized;
  };
  contact: {
    email: string | null;
    github: string | null;
    linkedin: string | null;
  };
  resume: {
    /** Public path of the PDF. */
    href: string;
    /** Set to `true` once the PDF exists at `href`. Until then no link is rendered. */
    available: boolean;
    closingStatement: Localized;
  };
}

export const profile: Profile = {
  name: "Juan F. Valencia",
  intro: {
    en: "I'm an enthusiastic developer who enjoys taking an idea apart and putting it back together as a working product. I use AI as an assistant, never as a substitute: the planning, the judgment and the final call on every change stay mine.",
    es: "Soy un desarrollador entusiasta al que le gusta desarmar una idea y volver a armarla como un producto que funciona. Uso la IA como ayudante, nunca como sustituto: la planificación, el criterio y la última palabra sobre cada cambio siguen siendo míos.",
  },
  stack: [
    "TypeScript",
    "React",
    "Next.js",
    "Astro",
    "Node.js",
    "Go",
    "FastAPI",
    "PostgreSQL",
    "Docker",
    "Linux",
    "AI coding agents",
    "Local LLMs & RAG",
    "Rust",
  ],
  highlights: [
    {
      label: { en: "Experience", es: "Experiencia" },
      value: { en: "2+ years", es: "2+ años" },
    },
    {
      label: { en: "Based in", es: "Ubicación" },
      value: { en: "Boca Raton, FL", es: "Boca Raton, FL" },
    },
    {
      label: { en: "Languages", es: "Idiomas" },
      value: { en: "Spanish · English", es: "Español · Inglés" },
    },
    {
      label: { en: "Off the keyboard", es: "Fuera del teclado" },
      value: { en: "Rubik's cubes, reading, travel", es: "Cubos Rubik, leer, viajar" },
    },
  ],
  about: {
    introduction: {
      en: "I'm Juan, a full-stack developer who likes problems that come apart into smaller, solvable pieces — which is also why this site is a Rubik's cube.",
      es: "Soy Juan, desarrollador full-stack. Me gustan los problemas que se pueden desarmar en piezas más pequeñas y resolubles; por eso este sitio es un cubo Rubik.",
    },
    approach: {
      en: "I break engineering goals into scoped tasks, work with AI coding agents for exploration, implementation and debugging, and keep the review, verification and responsibility for every change that gets integrated.",
      es: "Divido los objetivos en tareas acotadas, trabajo con agentes de IA para explorar, implementar y depurar, y mantengo la revisión, la verificación y la responsabilidad de cada cambio que se integra.",
    },
    interests: {
      en: "Backend architecture in Go, authentication and permission models, local LLM and RAG workflows on constrained hardware, and Rust, which I'm currently learning. Away from the screen: reading, travelling and Rubik's cubes, the puzzle that inspired this portfolio's look.",
      es: "Arquitectura backend en Go, modelos de autenticación y permisos, flujos locales de LLM y RAG en hardware limitado, y Rust, que estoy aprendiendo. Lejos de la pantalla: leer, viajar y los cubos Rubik, el rompecabezas que inspiró el estilo de este portafolio.",
    },
    objectives: {
      en: "Join a product team as a software engineer, ship reliable full-stack features end to end, and keep growing toward backend and systems work.",
      es: "Unirme a un equipo de producto como ingeniero de software, entregar funcionalidades full-stack confiables de principio a fin y seguir creciendo hacia el backend y los sistemas.",
    },
  },
  contact: {
    email: "jfvalenciasa@gmail.com",
    github: "https://github.com/JValencia03",
    linkedin: "https://www.linkedin.com/in/juan-valencia-s/",
  },
  resume: {
    href: "/resume.pdf",
    available: true,
    closingStatement: {
      en: "Two years building web apps, APIs and document systems — from an insurance platform at Inverseguros to a research dashboard for Universidad Nacional de Colombia. The full story is in the PDF.",
      es: "Dos años construyendo aplicaciones web, APIs y sistemas documentales: desde una plataforma de seguros en Inverseguros hasta un dashboard de investigación para la Universidad Nacional de Colombia. La historia completa está en el PDF.",
    },
  },
};
