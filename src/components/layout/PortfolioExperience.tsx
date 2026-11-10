"use client";

import { Fragment, type ComponentType } from "react";
import { CaseStudySection } from "@/components/projects/CaseStudySection";
import { TransitionTrack } from "@/components/scroll/TransitionTrack";
import { AboutSection } from "@/components/sections/AboutSection";
import { ContactSection } from "@/components/sections/ContactSection";
import { ProjectsSection } from "@/components/sections/ProjectsSection";
import { ResumeFinale } from "@/components/sections/ResumeFinale";
import { SkillsSection } from "@/components/sections/SkillsSection";
import { SECTIONS, type SectionId } from "@/data/navigation";
import type { TrackKind } from "@/lib/scroll/phases";
import { Hero } from "./Hero";

const SECTION_COMPONENTS: Record<SectionId, ComponentType> = {
  hero: Hero,
  projects: ProjectsSection,
  skills: SkillsSection,
  about: AboutSection,
  contact: ContactSection,
  distance: () => <CaseStudySection projectId="distance" />,
  dodaman: () => <CaseStudySection projectId="dodaman" />,
  resume: ResumeFinale,
};

function trackKind(index: number): TrackKind {
  if (index === 1) return "fromHero";
  return index === SECTIONS.length - 1 ? "finale" : "between";
}

/**
 * The whole portfolio as one continuous document, rendered in the order
 * defined by `SECTIONS`, with a transition track between consecutive
 * sections. It is server-rendered in full, so every section is present in
 * the HTML of every entry URL.
 */
export function PortfolioExperience() {
  return SECTIONS.map(({ id }, index) => {
    const SectionComponent = SECTION_COMPONENTS[id];
    return (
      <Fragment key={id}>
        {index > 0 && <TransitionTrack to={id} kind={trackKind(index)} />}
        <SectionComponent />
      </Fragment>
    );
  });
}
