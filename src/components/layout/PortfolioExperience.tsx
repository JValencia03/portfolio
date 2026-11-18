"use client";

import { Fragment, type ComponentType } from "react";
import { CaseStudySection } from "@/components/projects/CaseStudySection";
import { TransitionTrack } from "@/components/scroll/TransitionTrack";
import { AboutSection } from "@/components/sections/AboutSection";
import { ContactSection } from "@/components/sections/ContactSection";
import { ProjectsSection } from "@/components/sections/ProjectsSection";
import { ResumeFinale } from "@/components/sections/ResumeFinale";
import { SkillsSection } from "@/components/sections/SkillsSection";
import { SECTIONS, type SectionEntry, type SectionId } from "@/data/navigation";
import type { TrackKind } from "@/lib/scroll/phases";
import { Hero } from "./Hero";
import { LoopSeam } from "./LoopSeam";

const SECTION_COMPONENTS: Record<SectionId, ComponentType> = {
  hero: Hero,
  projects: ProjectsSection,
  distance: () => <CaseStudySection projectId="distance" />,
  dodaman: () => <CaseStudySection projectId="dodaman" />,
  lcdr: () => <CaseStudySection projectId="lcdr" />,
  skills: SkillsSection,
  about: AboutSection,
  contact: ContactSection,
  resume: ResumeFinale,
};

/**
 * The track the scene needs before a section, by how the section is reached.
 * The hero has nothing before it, and a section read inside the open cube
 * follows the previous one directly.
 */
const TRACK_BEFORE: Record<SectionEntry, TrackKind | null> = {
  start: null,
  opening: "opening",
  inside: null,
  portal: "portal",
  finale: "finale",
};

/**
 * The whole portfolio as one continuous document, rendered in the order
 * defined by `SECTIONS`, with a transition track before every section the
 * scene leads into. It is server-rendered in full, so every section is
 * present in the HTML of every entry URL. The seam that closes the loop
 * comes last.
 */
export function PortfolioExperience() {
  return (
    <>
      {SECTIONS.map(({ id, entry }) => {
        const SectionComponent = SECTION_COMPONENTS[id];
        const track = TRACK_BEFORE[entry];
        return (
          <Fragment key={id}>
            {track && <TransitionTrack to={id} kind={track} />}
            <SectionComponent />
          </Fragment>
        );
      })}
      <LoopSeam />
    </>
  );
}
