import assert from "node:assert/strict";
import { test } from "node:test";
import { Vector3 } from "three";
import { SECTIONS, getSectionFace } from "../../data/navigation.ts";
import { FACE_NORMALS } from "../rubik/model.ts";
import { HERO_ORIENTATION, visibleFaces } from "../rubik/orientation.ts";
import { FINALE, computeScenePose, createScenePose, type ScenePose } from "./choreography.ts";
import { PIN_SCREENS, STAGE_SCREENS, TRACK_SCREENS } from "./phases.ts";
import { buildTimeline, createSnapshot, resolveTimeline } from "./timeline.ts";

const H = 1000;
/** `angleTo` goes through acos, which magnifies rounding error near zero. */
const ANGLE_EPSILON = 1e-6;

let y = 0;
const sections = SECTIONS.map((section, index) => {
  const isFace = section.face !== null;
  const isFinale = index === SECTIONS.length - 1;
  if (index > 0) y += TRACK_SCREENS[index === 1 ? "fromHero" : isFinale ? "finale" : "between"] * H;
  const pin = isFace || isFinale ? PIN_SCREENS * H : 0;
  const height = (isFace ? 1 + STAGE_SCREENS.dwell : 1) * H;
  const bounds = { id: section.id, top: y + pin, bottom: y + pin + height };
  y += pin + height;
  return bounds;
});
const timeline = buildTimeline({ viewport: H, sections });
const maxScroll = sections.at(-1)!.bottom - H;

const snapshot = createSnapshot();
const poseAt = (scroll: number): ScenePose => computeScenePose(createScenePose(), resolveTimeline(snapshot, timeline, scroll));
const stateAt = (scroll: number) => resolveTimeline(createSnapshot(), timeline, scroll).state;

const flatten = (pose: ScenePose) => [
  ...pose.orientation.toArray(),
  pose.stage,
  pose.dolly,
  pose.presence,
  pose.idle,
  pose.shown,
  pose.iris,
  pose.glow,
  pose.veil,
  pose.spread,
  pose.tint,
  pose.tintSection,
];

test("the pose is continuous over the entire scroll range, including every state boundary", () => {
  const keys = ["turn", "dolly", "stage", "presence", "iris", "glow", "veil", "tint", "spread"] as const;
  let previous = poseAt(0);
  const worst: Record<(typeof keys)[number], number> & { scroll: number } = {
    scroll: 0, turn: 0, dolly: 0, stage: 0, presence: 0, iris: 0, glow: 0, veil: 0, tint: 0, spread: 0,
  };
  for (let scroll = 1; scroll <= maxScroll; scroll += 1) {
    const current = poseAt(scroll);
    const step = {
      turn: previous.orientation.angleTo(current.orientation),
      dolly: Math.abs(current.dolly - previous.dolly),
      stage: Math.abs(current.stage - previous.stage),
      presence: Math.abs(current.presence - previous.presence),
      // The window only matters while the scene is drawn around it.
      iris: current.shown && previous.shown ? Math.abs(current.iris - previous.iris) : 0,
      glow: Math.abs(current.glow - previous.glow),
      veil: Math.abs(current.veil - previous.veil),
      tint: Math.abs(current.tint - previous.tint),
      spread: Math.abs(current.spread - previous.spread),
    };
    for (const key of keys) {
      if (step[key] > worst[key]) {
        worst[key] = step[key];
        worst.scroll = scroll;
      }
    }
    previous = current;
  }
  // One pixel of scroll never moves anything by more than a sliver. The fastest
  // legitimate motion is a 180° turn at the peak of its easing, about 0.0105 rad
  // per pixel at this viewport height; a real discontinuity would be far larger.
  assert.ok(worst.turn < 0.012, `orientation jumps ${worst.turn} rad near ${worst.scroll}`);
  assert.ok(worst.dolly < 0.01, `camera jumps ${worst.dolly} near ${worst.scroll}`);
  assert.ok(worst.stage < 0.01, `placement jumps ${worst.stage} near ${worst.scroll}`);
  assert.ok(worst.presence < 0.01, `visibility jumps ${worst.presence} near ${worst.scroll}`);
  // The portal's window and the environment light move a little faster, but never snap.
  assert.ok(worst.iris < 0.03, `the window jumps ${worst.iris} near ${worst.scroll}`);
  assert.ok(worst.glow < 0.03, `the glow jumps ${worst.glow} near ${worst.scroll}`);
  assert.ok(worst.veil < 0.03, `the veil jumps ${worst.veil} near ${worst.scroll}`);
  assert.ok(worst.tint < 0.01, `the light jumps ${worst.tint} near ${worst.scroll}`);
  assert.ok(worst.spread < 0.01, `the separation jumps ${worst.spread} near ${worst.scroll}`);
});

test("scrolling back retraces exactly the poses of scrolling forward", () => {
  const forward: unknown[][] = [];
  for (let scroll = 0; scroll <= maxScroll; scroll += 53) forward.push(flatten(poseAt(scroll)));
  const backward: unknown[][] = [];
  for (let scroll = Math.floor(maxScroll / 53) * 53; scroll >= 0; scroll -= 53) backward.push(flatten(poseAt(scroll)));
  assert.deepEqual(backward.reverse(), forward);
});

test("the hero is at rest: resting orientation, on its anchor, fully idle", () => {
  const pose = poseAt(0);
  assert.ok(pose.orientation.angleTo(HERO_ORIENTATION) < ANGLE_EPSILON);
  assert.deepEqual([pose.stage, pose.dolly, pose.presence, pose.idle, pose.shown], [0, 0, 1, 1, true]);
});

test("once aligned, exactly the destination face looks at the camera — for all six faces", () => {
  for (const { id, top } of sections) {
    const face = getSectionFace(id);
    if (!face) continue;
    // Sample the whole aligned → approach → portal stretch just before the section.
    for (const offset of [H * (1 + STAGE_SCREENS.approach + STAGE_SCREENS.aligned) - 1, H * 1.3, H, H * 0.4, 1]) {
      const scroll = top - offset;
      const pose = poseAt(scroll);
      assert.deepEqual(visibleFaces(pose.orientation), [face], `${id} at ${stateAt(scroll)}`);
      const normal = new Vector3(...FACE_NORMALS[face]).applyQuaternion(pose.orientation);
      assert.ok(normal.distanceTo(new Vector3(0, 0, 1)) < 1e-9, `${id} is perpendicular to the camera`);
      assert.equal(pose.stage, 1);
    }
  }
});

test("the rotation is done before the camera moves, and the camera only moves toward an aligned face", () => {
  for (let scroll = 0; scroll <= maxScroll; scroll += 3) {
    const state = stateAt(scroll);
    const pose = poseAt(scroll);
    if (state === "ROTATING" || state === "ALIGNED" || state === "HERO" || state === "FINALE") {
      assert.equal(pose.dolly, 0, `${state} at ${scroll}`);
    }
    if (pose.dolly > 0) assert.equal(visibleFaces(pose.orientation).length, 1, `${state} at ${scroll}`);
  }
});

test("the scene is not drawn while a section is being read and is fully present while the cube turns", () => {
  for (let scroll = 0; scroll <= maxScroll; scroll += 3) {
    const state = stateAt(scroll);
    const pose = poseAt(scroll);
    if (state === "INSIDE_SECTION") {
      // Reading: no scene, no backdrop, the window fully open.
      assert.deepEqual([pose.shown, pose.veil, pose.glow, pose.iris], [false, 0, 0, 1], `at ${scroll}`);
    }
    if (state === "ROTATING" || state === "ALIGNED" || state === "APPROACHING") {
      assert.deepEqual([pose.shown, pose.presence], [true, 1], `${state} at ${scroll}`);
      // The next section may already be under the viewport: its window stays shut.
      assert.equal(pose.iris, 0, `${state} at ${scroll}`);
    }
    if (state !== "HERO" && state !== "ROTATING") assert.equal(pose.idle, 0, `${state} at ${scroll}`);
  }
});

test("the scene is only dropped or restored while the portal window covers the whole view", () => {
  let previous = poseAt(0);
  let flips = 0;
  for (let scroll = 1; scroll <= maxScroll; scroll += 1) {
    const current = poseAt(scroll);
    if (current.shown !== previous.shown) {
      flips += 1;
      // On the side where the scene is still drawn, the camera has arrived at the
      // panel, the window is fully open and its backdrop is opaque: nothing shows.
      const drawn = current.shown ? current : previous;
      assert.ok(Math.abs(drawn.dolly - 2) < 1e-9, `camera not at the panel at ${scroll} (${stateAt(scroll)})`);
      assert.equal(drawn.iris, 1, `window not open at ${scroll}`);
      assert.equal(drawn.veil, 1, `backdrop not opaque at ${scroll}`);
    }
    previous = current;
  }
  // In and out of each of the six sections.
  assert.equal(flips, 12);
});

test("the environment light rises during the approach and belongs to the face being approached", () => {
  for (const { id, top } of sections) {
    if (!getSectionFace(id)) continue;
    const approachStart = top - H * (1 + STAGE_SCREENS.approach);
    let previous = -1;
    for (let scroll = approachStart; scroll <= top - H; scroll += 10) {
      const pose = poseAt(scroll);
      assert.equal(pose.tintSection, id);
      assert.ok(pose.tint >= previous, `light dims during the approach to ${id}`);
      previous = pose.tint;
    }
    assert.ok(poseAt(approachStart).tint < 1e-9);
    assert.equal(poseAt(top - H).tint, 1);
    assert.equal(poseAt(top).tint, 1);
  }
});

test("the camera travels in, through the panel, and back out symmetrically", () => {
  const skills = sections.find((section) => section.id === "skills")!;
  assert.equal(poseAt(skills.top - H).dolly, 1); // approach complete: the face fills the view
  assert.equal(poseAt(skills.top).dolly, 2); // portal complete: inside the panel
  assert.equal(poseAt(skills.bottom - H).dolly, 2); // exit begins from inside
  assert.ok(Math.abs(poseAt(skills.bottom).dolly) < 1e-9); // exit complete: back at rest
  let previous = Infinity;
  for (let scroll = skills.bottom - H; scroll <= skills.bottom; scroll += 5) {
    const { dolly } = poseAt(scroll);
    assert.ok(dolly <= previous + 1e-9, `camera moves back in during the exit at ${scroll}`);
    previous = dolly;
  }
});

test("the finale returns the cube to its three-quarter view", () => {
  const pose = poseAt(maxScroll);
  assert.ok(pose.orientation.angleTo(HERO_ORIENTATION) < ANGLE_EPSILON);
  assert.equal(pose.stage, 1);
  assert.equal(pose.dolly, 0);
  assert.deepEqual([pose.shown, pose.presence], [true, 1]);
});

test("the cube stays whole everywhere except the finale, where it comes apart only after a pause", () => {
  const finale = timeline.segments.find((segment) => segment.state === "FINALE")!;
  const length = finale.end - finale.start;
  let previous = 0;
  for (let scroll = 0; scroll <= maxScroll; scroll += 5) {
    const { spread } = poseAt(scroll);
    if (stateAt(scroll) !== "FINALE") {
      assert.equal(spread, 0, `the cube is apart outside the finale at ${scroll}`);
      continue;
    }
    const progress = (scroll - finale.start) / length;
    // Turning back and holding solved: still one piece.
    if (progress <= FINALE.separate[0]) assert.equal(spread, 0, `apart before the pause ends (${progress.toFixed(2)})`);
    // The turn is complete before the hold begins.
    if (progress >= FINALE.turnEnd) assert.ok(poseAt(scroll).orientation.angleTo(HERO_ORIENTATION) < ANGLE_EPSILON);
    assert.ok(spread >= previous, "the separation runs backward while scrolling down");
    previous = spread;
  }
  assert.ok(FINALE.separate[0] > FINALE.turnEnd, "there is a pause between the turn and the separation");
  assert.equal(poseAt(maxScroll).spread, 1);
});
