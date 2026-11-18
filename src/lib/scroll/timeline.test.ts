import assert from "node:assert/strict";
import { test } from "node:test";
import { SECTIONS, type SectionId } from "../../data/navigation.ts";
import { H, layoutWith } from "./layout.fixture.ts";
import { PIN_SCREENS, STAGE_SCREENS, TRACK_SCREENS, type ScrollState } from "./phases.ts";
import { activeSectionOf, buildTimeline, createSnapshot, resolveTimeline, type Timeline } from "./timeline.ts";

const layout = layoutWith(1);
const timeline = buildTimeline(layout);
const loopEnd = layout.loopEnd!;
const at = (scroll: number, source: Timeline = timeline) => resolveTimeline(createSnapshot(), source, scroll);
const boundsOf = (id: SectionId) => layout.sections.find((section) => section.id === id)!;

test("segments are contiguous and cover the whole scroll range, from the top to where the document loops", () => {
  assert.equal(timeline.segments[0].start, 0);
  timeline.segments.forEach((segment, index) => {
    assert.ok(segment.end >= segment.start, `segment ${index} has a negative length`);
    if (index > 0) assert.equal(segment.start, timeline.segments[index - 1].end, `gap before segment ${index}`);
  });
  assert.equal(timeline.segments.at(-1)!.end, loopEnd);
});

test("every transition between sections runs through the states in order", () => {
  const sequence = timeline.segments.map((segment) => segment.state);
  const throughFace: ScrollState[] = ["ROTATING", "ALIGNED", "APPROACHING", "PORTAL_TRANSITION", "INSIDE_SECTION"];
  const expected: ScrollState[] = [
    "HERO", // resting in the hero
    "HERO", // the short hold at the top
    // The cube opens and reveals the projects…
    "UNLOCKING",
    "OPENING",
    // …which are read one after another, each taking over halfway through the handover.
    ...Array.from({ length: 3 }, (): ScrollState[] => ["INSIDE_SECTION", "INSIDE_SECTION"]).flat(),
    "INSIDE_SECTION",
    // The cube closes, then leads through its faces.
    "CLOSING",
    ...throughFace,
    "EXITING",
    ...throughFace,
    "EXITING",
    ...throughFace,
    "EXITING",
    "FINALE",
    "FINALE_HOLD",
    "LOOP",
  ];
  assert.deepEqual(sequence, expected);
});

test("all thirteen states occur", () => {
  const states = new Set(timeline.segments.filter((segment) => segment.end > segment.start).map((segment) => segment.state));
  assert.equal(states.size, 13);
});

test("stage lengths match the configuration", () => {
  const lengthOf = (state: ScrollState, to: SectionId) => {
    const segment = timeline.segments.find((candidate) => candidate.state === state && candidate.to === to && candidate.end > candidate.start)!;
    return (segment.end - segment.start) / H;
  };
  const near = (actual: number, expected: number) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} ≠ ${expected}`);
  for (const to of ["skills", "about", "contact"] as const) {
    near(lengthOf("ROTATING", to), STAGE_SCREENS.rotate);
    near(lengthOf("ALIGNED", to), STAGE_SCREENS.aligned);
    near(lengthOf("APPROACHING", to), STAGE_SCREENS.approach);
    near(lengthOf("PORTAL_TRANSITION", to), 1);
    near(lengthOf("INSIDE_SECTION", to), STAGE_SCREENS.dwell);
  }
  // The cube is turned while the hero scrolls away and across the track; its pieces leave over the pin.
  near(lengthOf("UNLOCKING", "projects"), 1 + STAGE_SCREENS.unlock - STAGE_SCREENS.heroHold);
  near(lengthOf("OPENING", "projects"), PIN_SCREENS);
  near(lengthOf("CLOSING", "lcdr"), 1);
  near(lengthOf("EXITING", "skills"), 1);
  // The finale runs through its free scroll and then through its content's pin.
  near(lengthOf("FINALE", "resume"), STAGE_SCREENS.finale + PIN_SCREENS);
  near(lengthOf("FINALE_HOLD", "resume"), STAGE_SCREENS.finaleHold);
  // The way back: the finale scrolls away, the track, and the hero is where it started.
  near(lengthOf("LOOP", "hero"), 1 + STAGE_SCREENS.loop);
});

test("the portal plays exactly during the section's pin, and the exit as its bottom crosses the viewport", () => {
  const skills = boundsOf("skills");
  // The portal ends exactly where reading begins…
  assert.deepEqual([at(skills.top - 1).state, at(skills.top).state], ["PORTAL_TRANSITION", "INSIDE_SECTION"]);
  // …and begins one pinned screen earlier, when the section element reaches the top of the viewport.
  assert.deepEqual([at(skills.top - H - 1).state, at(skills.top - H).state], ["APPROACHING", "PORTAL_TRANSITION"]);
  // The exit begins when the section's bottom reaches the bottom of the viewport.
  assert.deepEqual([at(skills.bottom - H - 1).state, at(skills.bottom - H).state], ["INSIDE_SECTION", "EXITING"]);
  assert.equal(at(skills.bottom).state, "ROTATING");
});

test("the cube opens exactly during the pin of the projects, and closes as the last one scrolls away", () => {
  const projects = boundsOf("projects");
  assert.deepEqual([at(projects.top - 1).state, at(projects.top).state], ["OPENING", "INSIDE_SECTION"]);
  assert.deepEqual([at(projects.top - H - 1).state, at(projects.top - H).state], ["UNLOCKING", "OPENING"]);

  const last = boundsOf("lcdr");
  assert.deepEqual([at(last.bottom - H - 1).state, at(last.bottom - H).state], ["INSIDE_SECTION", "CLOSING"]);
  assert.equal(at(last.bottom).state, "ROTATING");
});

test("the projects follow one another with nothing in between", () => {
  const projects = boundsOf("projects");
  const distance = boundsOf("distance");
  assert.equal(distance.top, projects.bottom);
  // The cube stays open across the handover: one resting state, from one section to the next.
  for (let scroll = projects.top; scroll < boundsOf("lcdr").bottom - H; scroll += 25) {
    assert.equal(at(scroll).state, "INSIDE_SECTION", `at ${scroll}`);
  }
  // The next one takes over as it crosses the middle of the viewport.
  assert.equal(activeSectionOf(at(distance.top - H / 2 - 1)), "projects");
  assert.equal(activeSectionOf(at(distance.top - H / 2)), "distance");
});

test("a section's anchor resolves to that section, already inside it", () => {
  for (const section of SECTIONS) {
    const snapshot = at(boundsOf(section.id).top);
    assert.equal(activeSectionOf(snapshot), section.id, section.id);
    if (section.entry === "portal" || section.entry === "opening") {
      assert.equal(snapshot.state, "INSIDE_SECTION", section.id);
      assert.equal(snapshot.progress, 0, section.id);
    }
  }
  assert.equal(at(0).state, "HERO");
  // The finale's anchor is where its content has just been revealed, at the start of its rest.
  assert.deepEqual([at(boundsOf("resume").top - 1).state, at(boundsOf("resume").top).state], ["FINALE", "FINALE_HOLD"]);
});

test("the same scroll position always resolves to the same snapshot, whatever came before", () => {
  const forward: string[] = [];
  for (let scroll = 0; scroll <= loopEnd; scroll += 137) forward.push(JSON.stringify(at(scroll)));
  const backward: string[] = [];
  for (let scroll = Math.floor(loopEnd / 137) * 137; scroll >= 0; scroll -= 137) backward.push(JSON.stringify(at(scroll)));
  assert.deepEqual(backward.reverse(), forward);

  // Reusing one snapshot object across arbitrary jumps leaves no residue either.
  const reused = createSnapshot();
  for (const scroll of [loopEnd, 0, 5000, 12, 9999, 5000]) resolveTimeline(reused, timeline, scroll);
  assert.deepEqual(reused, at(5000));
});

test("progress advances monotonically and the segment index never goes back while scrolling down", () => {
  let previous = at(0);
  for (let scroll = 1; scroll <= loopEnd; scroll += 7) {
    const current = at(scroll);
    assert.ok(current.index >= previous.index, `index went back at ${scroll}`);
    if (current.index === previous.index) assert.ok(current.progress >= previous.progress, `progress went back at ${scroll}`);
    assert.ok(current.progress >= 0 && current.progress <= 1);
    previous = current;
  }
});

test("the active section changes once per transition, and the loop hands back to the hero", () => {
  const order: SectionId[] = [];
  const changes: Array<{ to: SectionId; state: ScrollState }> = [];
  for (let scroll = 0; scroll <= loopEnd; scroll += 1) {
    const snapshot = at(scroll);
    const active = activeSectionOf(snapshot);
    if (order.at(-1) !== active) {
      order.push(active);
      changes.push({ to: active, state: snapshot.state });
    }
  }
  // Every section once, in order, and then the hero again: the document has gone round.
  assert.deepEqual(order, [...SECTIONS.map((section) => section.id), "hero"]);
  const takeover: Record<string, ScrollState> = {
    opening: "OPENING",
    inside: "INSIDE_SECTION",
    portal: "APPROACHING",
    finale: "FINALE",
  };
  for (const change of changes.slice(1, -1)) {
    assert.equal(change.state, takeover[SECTIONS.find((section) => section.id === change.to)!.entry], change.to);
  }
  assert.equal(changes.at(-1)!.state, "LOOP");
});

test("where the document loops, the timeline is back in the hero's hands, complete", () => {
  const end = at(loopEnd);
  assert.deepEqual([end.state, end.progress, end.to], ["LOOP", 1, "hero"]);
  assert.equal(activeSectionOf(end), "hero");
  // The finale's content rests before the way back begins, and is still in charge as it scrolls away.
  const resume = boundsOf("resume");
  assert.equal(at(resume.top + resume.hold! - 1).state, "FINALE_HOLD");
  assert.equal(at(resume.top + resume.hold!).state, "LOOP");
  assert.equal(activeSectionOf(at(resume.top + resume.hold! + 10)), "resume");
});

test("positions outside the scrollable range clamp to the first and last states", () => {
  assert.deepEqual(at(-500), at(0));
  assert.equal(at(loopEnd + 5000).state, "LOOP");
  assert.equal(at(loopEnd + 5000).progress, 1);
});

test("with the tracks collapsed (no scene, reduced motion) the model degrades without gaps and does not loop", () => {
  const collapsedLayout = layoutWith(0, 1);
  const collapsed = buildTimeline(collapsedLayout);
  collapsed.segments.forEach((segment, index) => {
    assert.ok(Number.isFinite(segment.start) && Number.isFinite(segment.end));
    assert.ok(segment.end >= segment.start);
    if (index > 0) assert.equal(segment.start, collapsed.segments[index - 1].end);
  });
  for (const section of collapsedLayout.sections) {
    const snapshot = at(section.top, collapsed);
    assert.ok(Number.isFinite(snapshot.progress));
    assert.equal(activeSectionOf(snapshot), section.id, section.id);
  }
  // The document simply ends in the finale.
  assert.equal(collapsed.segments.at(-1)!.state, "FINALE");
  assert.equal(at(1e9, collapsed).state, "FINALE");
  assert.equal(activeSectionOf(at(1e9, collapsed)), "resume");
});

test("a hero taller than the viewport rests in HERO until its end comes into view", () => {
  const tall = layoutWith(1);
  const extra = 400;
  tall.sections = tall.sections.map((section, index) =>
    index === 0 ? { ...section, bottom: section.bottom + extra } : { ...section, top: section.top + extra, bottom: section.bottom + extra },
  );
  const tallTimeline = buildTimeline(tall);
  assert.equal(at(extra, tallTimeline).state, "HERO");
  assert.equal(at(extra + STAGE_SCREENS.heroHold * H + 1, tallTimeline).state, "UNLOCKING");
});

test("track heights hold exactly the free-scroll stages", () => {
  assert.equal(TRACK_SCREENS.portal, STAGE_SCREENS.rotate + STAGE_SCREENS.aligned + STAGE_SCREENS.approach);
  assert.equal(TRACK_SCREENS.opening, STAGE_SCREENS.unlock);
  assert.equal(TRACK_SCREENS.loop, STAGE_SCREENS.loop);
});
