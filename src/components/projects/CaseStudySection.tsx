"use client";

import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import { SectionShell } from "@/components/sections/SectionShell";
import { Placeholder } from "@/components/ui/Placeholder";
import { SectionLink } from "@/components/ui/SectionLink";
import { CASE_STUDY_BLOCKS, getProject, projects, type Project } from "@/data/projects";
import { useI18n } from "@/lib/i18n/I18nProvider";

/** Case study frame shared by every project. All content comes from `src/data/projects.ts`. */
export function CaseStudySection({ projectId }: { projectId: Project["id"] }) {
  const { locale, dictionary } = useI18n();
  const copy = dictionary.caseStudy;
  const project = getProject(projectId);
  const position = projects.findIndex((candidate) => candidate.id === projectId);
  const previous = projects[position - 1];
  const next = projects[position + 1];

  return (
    <SectionShell id={project.id} eyebrow={copy.eyebrow} title={project.name} subtitle={project.expandedName}>
      <div className="grid gap-x-16 gap-y-12 md:grid-cols-2">
        {CASE_STUDY_BLOCKS.map((block) => (
          <div key={block} className="reveal border-t border-white/10 pt-6">
            <h3 className="block-label">{copy.blocks[block]}</h3>
            <p className="mt-3 max-w-prose leading-relaxed text-fog-300">
              {project.caseStudy[block][locale] ?? <Placeholder label={copy.blocks[block]} />}
            </p>
          </div>
        ))}

        <div className="reveal border-t border-white/10 pt-6">
          <h3 className="block-label">{copy.links}</h3>
          {project.links.length > 0 ? (
            <ul className="mt-3 flex flex-wrap gap-3">
              {project.links.map((link) => (
                <li key={link.href}>
                  <a href={link.href} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">
                    {link.label[locale] ?? link.href}
                    <ArrowUpRight aria-hidden="true" className="size-4" />
                    <span className="sr-only">({dictionary.common.opensInNewTab})</span>
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3">
              <Placeholder label={copy.placeholders.links} />
            </p>
          )}
        </div>
      </div>

      <nav aria-label={project.name} className="mt-16 flex flex-wrap items-center gap-3 border-t border-white/10 pt-8">
        <SectionLink to="projects" className="btn btn-ghost btn-back">
          <ArrowLeft aria-hidden="true" className="size-4" />
          {copy.backToProjects}
        </SectionLink>
        {previous && (
          <SectionLink to={previous.id} className="btn btn-ghost btn-back sm:ml-auto">
            <ArrowLeft aria-hidden="true" className="size-4" />
            <span className="sr-only">{copy.previousProject}: </span>
            {previous.name}
          </SectionLink>
        )}
        {next && (
          <SectionLink to={next.id} className="btn btn-ghost sm:ml-auto">
            <span className="sr-only">{copy.nextProject}: </span>
            {next.name}
            <ArrowRight aria-hidden="true" className="size-4" />
          </SectionLink>
        )}
      </nav>
    </SectionShell>
  );
}
