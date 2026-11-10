"use client";

import { ArrowRight } from "lucide-react";
import { Placeholder } from "@/components/ui/Placeholder";
import { SectionLink } from "@/components/ui/SectionLink";
import { TiltCard } from "@/components/ui/TiltCard";
import { projects, type Project } from "@/data/projects";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { SectionShell } from "./SectionShell";

function ProjectCard({ project }: { project: Project }) {
  const { locale, dictionary } = useI18n();
  const copy = dictionary.projects;
  const titleId = `project-${project.id}-title`;

  return (
    <li className="reveal">
      <TiltCard className="h-full">
        <article aria-labelledby={titleId} className="card flex h-full flex-col">
          <div className="media-slot">
            {project.image ? (
              // eslint-disable-next-line @next/next/no-img-element -- dimensions are unknown until real assets exist
              <img src={project.image} alt="" className="size-full object-cover" />
            ) : (
              <Placeholder label={copy.placeholders.visual} />
            )}
          </div>

          <div className="flex flex-1 flex-col p-6 md:p-8">
            <h3 id={titleId} className="card-title text-2xl md:text-3xl">
              {project.name}
            </h3>
            {project.expandedName && (
              <p className="mt-1 font-mono text-xs tracking-wide text-fog-400">{project.expandedName}</p>
            )}

            <p className="mt-4 leading-relaxed text-fog-300">
              {project.description[locale] ?? <Placeholder label={copy.placeholders.description} />}
            </p>

            <dl className="mt-6 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="block-label">{copy.technologies}</dt>
                <dd className="mt-2">
                  {project.technologies.length > 0 ? (
                    <ul className="flex flex-wrap gap-2">
                      {project.technologies.map((technology) => (
                        <li key={technology} className="chip">
                          {technology}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <Placeholder label={copy.placeholders.technologies} />
                  )}
                </dd>
              </div>
              <div>
                <dt className="block-label">{copy.status}</dt>
                <dd className="mt-2 text-fog-100">
                  {project.status[locale] ?? <Placeholder label={copy.placeholders.status} />}
                </dd>
              </div>
            </dl>

            <SectionLink to={project.id} className="btn btn-ghost mt-8 self-start">
              {copy.caseStudyLink}
              <span className="sr-only">: {project.name}</span>
              <ArrowRight aria-hidden="true" className="size-4" />
            </SectionLink>
          </div>
        </article>
      </TiltCard>
    </li>
  );
}

export function ProjectsSection() {
  const { dictionary } = useI18n();
  const copy = dictionary.projects;

  return (
    <SectionShell id="projects" eyebrow={copy.eyebrow} title={copy.title}>
      <ul className="grid gap-6 lg:grid-cols-2 lg:gap-8">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </ul>
    </SectionShell>
  );
}
