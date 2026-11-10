import assert from "node:assert/strict";
import { test } from "node:test";
import { SECTIONS, type SectionId } from "../../data/navigation.ts";
import { PIN_SCREENS, STAGE_SCREENS, TRACK_SCREENS, type ScrollState } from "./phases.ts";
import {
  activeSectionOf,
  buildTimeline,
  createSnapshot,
  resolveTimeline,
  type ScrollLayout,
  type Timeline,
} from "./timeline.ts";

const H = 1000;

/**
 * Lays the sections out the way the page does: an empty track before each
 * section, and each face section pinned for a screen before its content
 * scrolls. `sceneScale` 0 reproduces the page without a scene: no tracks, no pins.
 */
function layoutWith(sceneScale: number, contentScreens = 1 + STAGE_SCREENS.dwell): ScrollLayout {
  let y = 0;
  const sections = SECTIONS.map((section, index) => {
    const isFace = section.face !== null;
    const isFinale = index === SECTIONS.length - 1;
    if (index > 0) {
      const kind = index === 1 ? "fromHero" : isFinale ? "finale" : "between";
      y += TRACK_SCREENS[kind] * H * sceneScale;
    }
    // Face sections and the finale are pinned for a screen before they scroll.
    const pin = isFace || isFinale ? PIN_SCREENS * H * sceneScale : 0;
    const height = (isFace ? contentScreens : 1) * H;
    // Reading starts where the pin ends.
    const bounds = { id: section.id, top: y + pin, bottom: y + pin + height };
    y += pin + height;
    return bounds;
  });
  return { viewport: H, sections };
}

const layout = layoutWith(1);
const timeline = buildTimeline(layout);
const maxScroll = layout.sections.at(-1)!.bottom - H;
const at = (scroll: number, source: Timeline = timeline) => resolveTimeline(createSnapshot(), source, scroll);
const boundsOf = (id: SectionId) => layout.sections.find((section) => section.id === id)!;

test("segments are contiguous and cover the whole scroll range from the top", () => {
  assert.equal(timeline.segments[0].start, 0);
  timeline.segments.forEach((segment, index) => {
    assert.ok(segment.end >= segment.start, `segment ${index} has a negative length`);
    if (index > 0) assert.equal(segment.start, timeline.segments[index - 1].end, `gap before segment ${index}`);
  });
  assert.equal(timeline.segments.at(-1)!.end, boundsOf("resume").top);
});

test("every transition between sections runs through the states in order", () => {
  const sequence = timeline.segments.map((segment) => segment.state);
  const perSection: ScrollState[] = ["EXITING", "ROTATING", "ALIGNED", "APPROACHING", "PORTAL_TRANSITION", "INSIDE_SECTION"];
  const expected: ScrollState[] = [
    "HERO", // resting in the hero
    "HERO", // the short hold at the top
    "ROTATING",
    "ALIGNED",
    "APPROACHING",
    "PORTAL_TRANSITION",
    "INSIDE_SECTION",
    ...Array.from({ length: 5 }, () => perSection).flat(),
    "EXITING",
    "FINALE",
  ];
  assert.deepEqual(sequence, expected);
});

test("all eight states occur", () => {
  const states = new Set(timeline.segments.filter((segment) => segment.end > segment.start).map((segment) => segment.state));
  assert.equal(states.size, 8);
});

test("stage lengths match the configuration", () => {
  const lengthOf = (state: ScrollState, to: SectionId) => {
    const segment = timeline.segments.find((candidate) => candidate.state === state && candidate.to === to && candidate.end > candidate.start)!;
    return (segment.end - segment.start) / H;
  };
  const near = (actual: number, expected: number) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} ≠ ${expected}`);
  for (const to of ["projects", "skills", "dodaman"] as const) {
    near(lengthOf("ROTATING", to), STAGE_SCREENS.rotate);
    near(lengthOf("ALIGNED", to), STAGE_SCREENS.aligned);
    near(lengthOf("APPROACHING", to), STAGE_SCREENS.approach);
    near(lengthOf("PORTAL_TRANSITION", to), 1);
    near(lengthOf("INSIDE_SECTION", to), STAGE_SCREENS.dwell);
  }
  near(lengthOf("EXITING", "projects"), 1);
  // The finale runs through its free scroll and then through its content's pin.
  near(lengthOf("FINALE", "resume"), STAGE_SCREENS.finale + PIN_SCREENS);
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

test("a section's anchor resolves to that section, already inside it", () => {
  for (const section of SECTIONS) {
    const snapshot = at(boundsOf(section.id).top);
    assert.equal(activeSectionOf(snapshot), section.id, section.id);
    if (section.face) {
      assert.equal(snapshot.state, "INSIDE_SECTION", section.id);
      assert.equal(snapshot.progress, 0, section.id);
    }
  }
  assert.equal(at(0).state, "HERO");
  assert.equal(at(maxScroll).state, "FINALE");
  assert.equal(at(maxScroll).progress, 1);
});

test("the same scroll position always resolves to the same snapshot, whatever came before", () => {
  const forward: string[] = [];
  for (let scroll = 0; scroll <= maxScroll; scroll += 137) forward.push(JSON.stringify(at(scroll)));
  const backward: string[] = [];
  for (let scroll = Math.floor(maxScroll / 137) * 137; scroll >= 0; scroll -= 137) backward.push(JSON.stringify(at(scroll)));
  assert.deepEqual(backward.reverse(), forward);

  // Reusing one snapshot object across arbitrary jumps leaves no residue either.
  const reused = createSnapshot();
  for (const scroll of [maxScroll, 0, 5000, 12, 9999, 5000]) resolveTimeline(reused, timeline, scroll);
  assert.deepEqual(reused, at(5000));
});

test("progress advances monotonically and the segment index never goes back while scrolling down", () => {
  let previous = at(0);
  for (let scroll = 1; scroll <= maxScroll; scroll += 7) {
    const current = at(scroll);
    assert.ok(current.index >= previous.index, `index went back at ${scroll}`);
    if (current.index === previous.index) assert.ok(current.progress >= previous.progress, `progress went back at ${scroll}`);
    assert.ok(current.progress >= 0 && current.progress <= 1);
    previous = current;
  }
});

test("the active section changes once per transition, when the approach begins", () => {
  const order: SectionId[] = [];
  const changes: Array<{ to: SectionId; state: ScrollState }> = [];
  for (let scroll = 0; scroll <= maxScroll; scroll += 1) {
    const snapshot = at(scroll);
    const active = activeSectionOf(snapshot);
    if (order.at(-1) !== active) {
      order.push(active);
      changes.push({ to: active, state: snapshot.state });
    }
  }
  assert.deepEqual(order, SECTIONS.map((section) => section.id));
  for (const change of changes.slice(1, -1)) assert.equal(change.state, "APPROACHING", change.to);
  assert.equal(changes.at(-1)!.state, "FINALE");
});

test("positions outside the scrollable range clamp to the first and last states", () => {
  assert.deepEqual(at(-500), at(0));
  assert.equal(at(maxScroll + 5000).state, "FINALE");
  assert.equal(at(maxScroll + 5000).progress, 1);
});

test("with the tracks collapsed (no scene, reduced motion) the model degrades without gaps", () => {
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
});

test("a hero taller than the viewport rests in HERO until its end comes into view", () => {
  const tall = layoutWith(1);
  const extra = 400;
  tall.sections = tall.sections.map((section, index) =>
    index === 0 ? { ...section, bottom: section.bottom + extra } : { ...section, top: section.top + extra, bottom: section.bottom + extra },
  );
  const tallTimeline = buildTimeline(tall);
  assert.equal(at(extra, tallTimeline).state, "HERO");
  assert.equal(at(extra + STAGE_SCREENS.heroHold * H + 1, tallTimeline).state, "ROTATING");
});
