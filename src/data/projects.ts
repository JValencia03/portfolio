import type { Localized } from "./content";
import type { SectionId } from "./navigation";

export const CASE_STUDY_BLOCKS = [
  "overview",
  "problem",
  "approach",
  "architecture",
  "decisions",
  "challenges",
  "results",
] as const;

export type CaseStudyBlock = (typeof CASE_STUDY_BLOCKS)[number];

export interface ProjectLink {
  label: Localized;
  href: string;
}

export interface Project {
  /** Matches the section id of the project's case study. */
  id: Extract<SectionId, "distance" | "dodaman" | "lcdr">;
  /** Project names are never translated. */
  name: string;
  expandedName?: string;
  description: Localized;
  /** Public path of the card's visual asset. */
  image: string | null;
  technologies: string[];
  status: Localized;
  caseStudy: Record<CaseStudyBlock, Localized>;
  links: ProjectLink[];
}

const live = (href: string): ProjectLink => ({ label: { en: "Live site", es: "Sitio en vivo" }, href });

/**
 * Sources: the CV (Distance, Dodaman) and each project's public site.
 * Screenshots in /public/projects are captures of those sites.
 */
export const projects: Project[] = [
  {
    id: "distance",
    name: "Distance",
    description: {
      en: "A cross-platform app that turns “I feel like doing something” into plans with people nearby: pick an activity, see who's around on a live map, and meet up.",
      es: "Una app multiplataforma que convierte las ganas de hacer algo en planes con gente cerca: eliges una actividad, ves quién está alrededor en un mapa en vivo y se encuentran.",
    },
    image: "/projects/distance.png",
    technologies: ["Go", "Flutter", "Docker", "WSL2"],
    status: { en: "In development · 2026", es: "En desarrollo · 2026" },
    caseStudy: {
      overview: {
        en: "Distance connects people who want to do the same thing at the same time — read, run, grab a coffee — with others close by. The Flutter web client is live; the Go backend is being built underneath it.",
        es: "Distance conecta a personas que quieren hacer lo mismo al mismo tiempo (leer, correr, tomar un café) con otras que están cerca. El cliente Flutter web ya está publicado; el backend en Go se construye debajo.",
      },
      problem: {
        en: "Wanting to do something and having someone nearby to do it with rarely line up. Social apps are built around existing contacts, not around an activity and a place right now.",
        es: "Querer hacer algo y tener a alguien cerca con quien hacerlo rara vez coinciden. Las redes sociales giran en torno a contactos existentes, no a una actividad y un lugar en este momento.",
      },
      approach: {
        en: "Three steps, mirrored in the onboarding: choose what you feel like doing, see people and places for it on a live city map, then join, propose a time in chat or post your own invite.",
        es: "Tres pasos, reflejados en el onboarding: elegir qué te provoca, ver gente y lugares para eso en un mapa vivo de la ciudad, y unirte, proponer una hora en el chat o publicar tu aviso.",
      },
      architecture: {
        en: "A Flutter client shared across web and mobile talks to a Go backend service. I designed the initial architecture and implemented the service bootstrap and its /health endpoint.",
        es: "Un cliente Flutter compartido entre web y móvil se comunica con un servicio backend en Go. Diseñé la arquitectura inicial e implementé el arranque del servicio y su endpoint /health.",
      },
      decisions: {
        en: "Go for a small, fast, easily containerized backend; Flutter to ship one codebase to every platform; a Docker-first workflow on Linux/WSL2 so the backend runs the same on every machine.",
        es: "Go para un backend pequeño, rápido y fácil de contenerizar; Flutter para llevar un solo código a todas las plataformas; un flujo basado en Docker sobre Linux/WSL2 para que el backend corra igual en cualquier máquina.",
      },
      challenges: {
        en: "Keeping backend execution reproducible across environments from day one, and defining a development and deployment path that grows with the app instead of being rebuilt later.",
        es: "Mantener la ejecución del backend reproducible entre entornos desde el primer día y definir un camino de desarrollo y despliegue que crezca con la app en lugar de rehacerse después.",
      },
      results: {
        en: "A published web client with the full onboarding flow, and a containerized backend foundation ready for the matching, map and chat features.",
        es: "Un cliente web publicado con el flujo de onboarding completo y una base de backend contenerizada lista para el emparejamiento, el mapa y el chat.",
      },
    },
    links: [live("https://distance.jfvalenciasa.workers.dev/")],
  },
  {
    id: "dodaman",
    name: "Dodaman",
    expandedName: "Document Dashboard Management",
    description: {
      en: "A document management dashboard for researchers at Universidad Nacional de Colombia, with granular roles, per-document permissions and administrative approval flows.",
      es: "Un dashboard de gestión documental para investigadores de la Universidad Nacional de Colombia, con roles granulares, permisos por documento y flujos de aprobación administrativa.",
    },
    image: "/projects/dodaman.png",
    technologies: ["React", "TypeScript", "REST API", "Encryption", "Docker", "Monorepo"],
    status: { en: "Live demo · 2024–2025", es: "Demo en vivo · 2024–2025" },
    caseStudy: {
      overview: {
        en: "Built while working at Universidad Nacional de Colombia (May 2024 – June 2025): a dashboard where researchers store, describe and share documents, and administrators control who can see and do what. I started it before AI tools were as capable as they are today, so I worked through most of it on my own — which made it a great opportunity to learn a lot.",
        es: "Desarrollado mientras trabajaba en la Universidad Nacional de Colombia (mayo 2024 – junio 2025): un dashboard donde los investigadores guardan, describen y comparten documentos, y los administradores controlan quién puede ver y hacer qué. Lo empecé antes de que la IA estuviera tan avanzada como hoy, así que resolví la mayor parte por mi cuenta, y eso lo convirtió en una gran oportunidad para aprender muchísimo.",
      },
      problem: {
        en: "Research documents were sensitive and scattered, with no single place to manage them, attach metadata or control access per person and per document.",
        es: "Los documentos de investigación eran sensibles y estaban dispersos, sin un lugar único para gestionarlos, añadir metadatos ni controlar el acceso por persona y por documento.",
      },
      approach: {
        en: "A React and TypeScript dashboard on top of a REST API that owns routing, authentication and authorization, with registration gated by validation and administrative approval.",
        es: "Un dashboard en React y TypeScript sobre una API REST que gestiona el enrutamiento, la autenticación y la autorización, con un registro protegido por validaciones y aprobación administrativa.",
      },
      architecture: {
        en: "A monorepo shares types and validations between frontend and backend so both sides agree on every payload. The whole project is containerized with Docker, and users get real-time notifications.",
        es: "Un monorepo comparte tipos y validaciones entre frontend y backend para que ambos lados coincidan en cada payload. Todo el proyecto está contenerizado con Docker y los usuarios reciben notificaciones en tiempo real.",
      },
      decisions: {
        en: "Granular roles plus document-specific permissions instead of a flat admin/user split; shared validation code to avoid drift; Docker to make development and deployment identical.",
        es: "Roles granulares más permisos específicos por documento en lugar de un simple admin/usuario; código de validación compartido para evitar desajustes; Docker para que desarrollo y despliegue sean idénticos.",
      },
      challenges: {
        en: "Protecting sensitive user data: personal information is encrypted before it is stored and validated at every step of registration. On top of that, permissions had to be flexible enough for real research groups without becoming unmanageable.",
        es: "Proteger los datos sensibles de los usuarios: la información personal se cifra antes de almacenarse y se valida en cada paso del registro. Además, los permisos debían ser lo bastante flexibles para grupos de investigación reales sin volverse inmanejables.",
      },
      results: {
        en: "A working system with metadata, encrypted user data, permissions, approval flows and an analytics view, now available as a public demo with an administrator account. Building it largely without AI gave me a solid grounding in authentication, data protection and full-stack architecture.",
        es: "Un sistema funcional con metadatos, datos de usuario cifrados, permisos, flujos de aprobación y una vista de análisis, disponible como demo pública con una cuenta de administrador. Construirlo casi sin IA me dio una base sólida en autenticación, protección de datos y arquitectura full-stack.",
      },
    },
    links: [{ label: { en: "Live demo", es: "Demo en vivo" }, href: "https://pfronteras.jfvalenciasa.workers.dev/" }],
  },
  {
    id: "lcdr",
    name: "LCDR",
    expandedName: "La Catedral del Reino",
    description: {
      en: "The website of Iglesia Cristiana La Catedral del Reino, a church with campuses in Palm Beach and Miami: services, locations, ministries, events and prayer requests.",
      es: "El sitio web de la Iglesia Cristiana La Catedral del Reino, con sedes en Palm Beach y Miami: horarios, sedes, ministerios, eventos y peticiones de oración.",
    },
    image: "/projects/lcdr.png",
    technologies: ["Astro", "React", "TypeScript", "Cloudflare"],
    status: { en: "Live", es: "En producción" },
    caseStudy: {
      overview: {
        en: "A fast, content-first website for a Spanish-speaking church in South Florida, giving visitors everything they need before their first Sunday.",
        es: "Un sitio rápido y centrado en el contenido para una iglesia hispana en el sur de Florida, que da a los visitantes todo lo que necesitan antes de su primer domingo.",
      },
      problem: {
        en: "The church needed one clear place for service times, both campuses, its ministries and upcoming events — and a simple way for people to ask for prayer or get in touch.",
        es: "La iglesia necesitaba un lugar claro para sus horarios, sus dos sedes, sus ministerios y los próximos eventos, y una forma sencilla de pedir oración o contactar.",
      },
      approach: {
        en: "A homepage that answers “when and where” immediately, then walks through the vision, six ministries, events and a prayer-request call to action, with directions to each campus.",
        es: "Una portada que responde de inmediato «cuándo y dónde» y luego recorre la visión, seis ministerios, los eventos y una invitación a pedir oración, con indicaciones para llegar a cada sede.",
      },
      architecture: {
        en: "Built with Astro and deployed on Cloudflare. Pages ship as static HTML, and the interactive parts are React islands: the only places where JavaScript is loaded.",
        es: "Construido con Astro y desplegado en Cloudflare. Las páginas se sirven como HTML estático y las partes interactivas son islas de React: los únicos lugares donde se carga JavaScript.",
      },
      decisions: {
        en: "I chose Astro for speed: instead of shipping a full single-page app, the site only loads JavaScript in the islands that use React, so it loads fast on any phone. Visually, a dark, editorial style with a single warm accent for calls to action.",
        es: "Escogí Astro por velocidad: en lugar de enviar una aplicación de una sola página completa, el sitio solo carga JavaScript en las islas donde se usa React, así que carga rápido en cualquier teléfono. En lo visual, un estilo oscuro y editorial con un único acento cálido para las llamadas a la acción.",
      },
      challenges: {
        en: "Keeping a lot of community information — two campuses, ministries, events, donations — easy to scan for first-time visitors on mobile.",
        es: "Mantener mucha información de la comunidad (dos sedes, ministerios, eventos, donaciones) fácil de recorrer para quien visita por primera vez desde el móvil.",
      },
      results: {
        en: "A live production site at lcdr.church that the church uses as its main public presence.",
        es: "Un sitio en producción en lcdr.church que la iglesia usa como su principal presencia pública.",
      },
    },
    links: [live("https://lcdr.church/")],
  },
];

/** Whether a section is the case study of a project. */
export function isProjectSection(id: SectionId): id is Project["id"] {
  return projects.some((candidate) => candidate.id === id);
}

export function getProject(id: Project["id"]): Project {
  const project = projects.find((candidate) => candidate.id === id);
  if (!project) throw new Error(`Unknown project: ${id}`);
  return project;
}
