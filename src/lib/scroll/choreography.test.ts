import assert from "node:assert/strict";
import { test } from "node:test";
import { Vector3 } from "three";
import { getSectionFace, type SectionId } from "../../data/navigation.ts";
import { FACE_NORMALS } from "../rubik/model.ts";
import { SCRAMBLED } from "../rubik/opening.ts";
import { HERO_ORIENTATION, visibleFaces } from "../rubik/orientation.ts";
import { FINALE, computeScenePose, createScenePose, type ScenePose } from "./choreography.ts";
import { H, layoutWith } from "./layout.fixture.ts";
import { STAGE_SCREENS, type ScrollState } from "./phases.ts";
import { buildTimeline, createSnapshot, resolveTimeline } from "./timeline.ts";

/** `angleTo` goes through acos, which magnifies rounding error near zero. */
const ANGLE_EPSILON = 1e-6;

const layout = layoutWith(1);
const { sections } = layout;
const timeline = buildTimeline(layout);
const loopEnd = layout.loopEnd!;
const boundsOf = (id: SectionId) => sections.find((section) => section.id === id)!;

const snapshot = createSnapshot();
const poseAt = (scroll: number): ScenePose => computeScenePose(createScenePose(), resolveTimeline(snapshot, timeline, scroll));
const stateAt = (scroll: number) => resolveTimeline(createSnapshot(), timeline, scroll).state;
const segmentOf = (state: ScrollState) => timeline.segments.find((segment) => segment.state === state && segment.end > segment.start)!;

/** States in which a section's portal window is in play: its values mean nothing elsewhere. */
const WINDOW_STATES = new Set<ScrollState>(["ROTATING", "ALIGNED", "APPROACHING", "PORTAL_TRANSITION", "EXITING"]);
const windowAt = (scroll: number) => {
  const resolved = resolveTimeline(createSnapshot(), timeline, scroll);
  return WINDOW_STATES.has(resolved.state) || (resolved.state === "INSIDE_SECTION" && getSectionFace(resolved.to) !== null);
};

const flatten = (pose: ScenePose) => [
  ...pose.orientation.toArray(),
  pose.stage,
  pose.dolly,
  pose.presence,
  pose.dim,
  pose.idle,
  pose.shown,
  pose.iris,
  pose.glow,
  pose.veil,
  pose.open,
  pose.spread,
  pose.flare,
  pose.tint,
  pose.tintSection,
];

test("the pose is continuous over the entire scroll range, including every state boundary", () => {
  const keys = ["turn", "dolly", "stage", "presence", "dim", "iris", "glow", "veil", "tint", "open", "spread", "flare"] as const;
  let previous = poseAt(0);
  let previousWindow = windowAt(0);
  const worst = Object.fromEntries(keys.map((key) => [key, { step: 0, scroll: 0 }])) as Record<
    (typeof keys)[number],
    { step: number; scroll: number }
  >;
  for (let scroll = 1; scroll <= loopEnd; scroll += 1) {
    const current = poseAt(scroll);
    const currentWindow = windowAt(scroll);
    const drawn = current.shown && previous.shown;
    const windowed = currentWindow && previousWindow;
    const step = {
      turn: previous.orientation.angleTo(current.orientation),
      dolly: Math.abs(current.dolly - previous.dolly),
      stage: Math.abs(current.stage - previous.stage),
      presence: Math.abs(current.presence - previous.presence),
      // Stepping back matters while the cube is drawn; without it the scene is simply stepped back.
      dim: drawn ? Math.abs(current.dim - previous.dim) : 0,
      // The window only matters while a face is in play, and its size while the scene is drawn around it.
      iris: windowed && drawn ? Math.abs(current.iris - previous.iris) : 0,
      glow: windowed ? Math.abs(current.glow - previous.glow) : 0,
      veil: windowed ? Math.abs(current.veil - previous.veil) : 0,
      tint: Math.abs(current.tint - previous.tint),
      open: Math.abs(current.open - previous.open),
      spread: Math.abs(current.spread - previous.spread),
      flare: Math.abs(current.flare - previous.flare),
    };
    for (const key of keys) {
      if (step[key] > worst[key].step) worst[key] = { step: step[key], scroll };
    }
    previous = current;
    previousWindow = currentWindow;
  }
  const check = (key: (typeof keys)[number], limit: number, what: string) =>
    assert.ok(worst[key].step < limit, `${what} jumps ${worst[key].step} near ${worst[key].scroll} (${stateAt(worst[key].scroll)})`);

  // One pixel of scroll never moves anything by more than a sliver. The fastest
  // legitimate motion is a 180° turn at the peak of its easing, about 0.0105 rad
  // per pixel at this viewport height; a real discontinuity would be far larger.
  check("turn", 0.012, "orientation");
  check("dolly", 0.01, "the camera");
  check("stage", 0.01, "placement");
  check("presence", 0.01, "visibility");
  check("dim", 0.01, "the step back");
  // The portal's window and the lights move a little faster, but never snap.
  check("iris", 0.03, "the window");
  check("glow", 0.03, "the glow");
  check("veil", 0.03, "the veil");
  check("tint", 0.01, "the light");
  check("open", 0.01, "the opening");
  check("spread", 0.01, "the separation");
  check("flare", 0.01, "the flare");
});

test("scrolling back retraces exactly the poses of scrolling forward", () => {
  const forward: unknown[][] = [];
  for (let scroll = 0; scroll <= loopEnd; scroll += 53) forward.push(flatten(poseAt(scroll)));
  const backward: unknown[][] = [];
  for (let scroll = Math.floor(loopEnd / 53) * 53; scroll >= 0; scroll -= 53) backward.push(flatten(poseAt(scroll)));
  assert.deepEqual(backward.reverse(), forward);
});

test("the hero is at rest: resting orientation, on its anchor, fully idle, whole", () => {
  const pose = poseAt(0);
  assert.ok(pose.orientation.angleTo(HERO_ORIENTATION) < ANGLE_EPSILON);
  assert.deepEqual([pose.stage, pose.dolly, pose.presence, pose.idle, pose.shown], [0, 0, 1, 1, true]);
  assert.deepEqual([pose.open, pose.spread, pose.flare, pose.dim], [0, 0, 0, 0]);
});

test("the loop ends in exactly the pose the page starts with", () => {
  assert.deepEqual(flatten(poseAt(loopEnd)), flatten(poseAt(0)));
  // And it gets there a little early, so the seam falls on a pose that is already still.
  assert.deepEqual(flatten(poseAt(loopEnd - 0.02 * 2 * H)), flatten(poseAt(0)));
});

test("once aligned, exactly the destination face looks at the camera — for every face that is a portal", () => {
  let faces = 0;
  for (const { id, top } of sections) {
    const face = getSectionFace(id);
    if (!face) continue;
    faces += 1;
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
  assert.equal(faces, 3);
});

test("the camera only moves toward an aligned face of the whole cube", () => {
  for (let scroll = 0; scroll <= loopEnd; scroll += 3) {
    const pose = poseAt(scroll);
    if (pose.dolly === 0) continue;
    const state = stateAt(scroll);
    assert.ok(WINDOW_STATES.has(state) || state === "INSIDE_SECTION", `the camera moves during ${state} at ${scroll}`);
    assert.equal(visibleFaces(pose.orientation).length, 1, `${state} at ${scroll}`);
    assert.deepEqual([pose.open, pose.spread], [0, 0], `${state} at ${scroll}`);
  }
});

test("the cube is not drawn while a section is being read and is fully present while it turns", () => {
  const idleStates = new Set<ScrollState>(["HERO", "ROTATING", "UNLOCKING", "LOOP"]);
  for (let scroll = 0; scroll <= loopEnd; scroll += 3) {
    const state = stateAt(scroll);
    const pose = poseAt(scroll);
    if (state === "INSIDE_SECTION") {
      // Reading: no cube, no backdrop, the window fully open, the environment stepped back.
      assert.deepEqual([pose.shown, pose.veil, pose.glow, pose.iris, pose.dim], [false, 0, 0, 1, 1], `at ${scroll}`);
    }
    if (state === "ROTATING" || state === "ALIGNED" || state === "APPROACHING") {
      assert.deepEqual([pose.shown, pose.presence, pose.dim], [true, 1, 0], `${state} at ${scroll}`);
      // The next section may already be under the viewport: its window stays shut.
      assert.equal(pose.iris, 0, `${state} at ${scroll}`);
    }
    if (!idleStates.has(state)) assert.equal(pose.idle, 0, `${state} at ${scroll}`);
  }
});

test("the cube is only dropped or restored while nothing of it can be seen", () => {
  let previous = poseAt(0);
  let behindWindow = 0;
  let outOfView = 0;
  for (let scroll = 1; scroll <= loopEnd; scroll += 1) {
    const current = poseAt(scroll);
    if (current.shown !== previous.shown) {
      const drawn = current.shown ? current : previous;
      if (drawn.open === 1) {
        // The cube is open and every piece has left the view; the environment
        // has already stepped back, so its brightness does not change either.
        outOfView += 1;
        assert.ok(drawn.dim > 0.999, `the environment changes at ${scroll} (${stateAt(scroll)})`);
      } else {
        // The camera has arrived at the panel, the window is fully open and its backdrop opaque.
        behindWindow += 1;
        assert.ok(Math.abs(drawn.dolly - 2) < 1e-9, `camera not at the panel at ${scroll} (${stateAt(scroll)})`);
        assert.equal(drawn.iris, 1, `window not open at ${scroll}`);
        assert.equal(drawn.veil, 1, `backdrop not opaque at ${scroll}`);
      }
    }
    previous = current;
  }
  // In and out of each of the three sections behind a face; once into the open cube and once out of it.
  assert.deepEqual([behindWindow, outOfView], [6, 2]);
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

test("each project is read in its own light", () => {
  for (const id of ["projects", "distance", "dodaman", "lcdr"] as const) {
    const pose = poseAt(boundsOf(id).top + 10);
    assert.deepEqual([pose.tintSection, pose.tint], [id, 1]);
  }
});

test("the camera travels in, through the panel, and back out symmetrically", () => {
  const skills = boundsOf("skills");
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

test("the cube is turned on its way to the stage, and opens only once it is there", () => {
  const unlocking = segmentOf("UNLOCKING");
  const opening = segmentOf("OPENING");
  let previous = 0;
  for (let scroll = unlocking.start; scroll < opening.end; scroll += 5) {
    const pose = poseAt(scroll);
    assert.ok(pose.open >= previous, `the opening runs backward at ${scroll}`);
    previous = pose.open;
    // While its layers turn the cube is whole: nothing has left yet.
    if (scroll < unlocking.end) assert.ok(pose.open <= SCRAMBLED, `pieces leave during the turns at ${scroll}`);
    assert.deepEqual([pose.shown, pose.presence, pose.spread], [true, 1, 0]);
  }
  const scrambled = poseAt(unlocking.end);
  assert.deepEqual([scrambled.open, scrambled.stage, scrambled.idle], [SCRAMBLED, 1, 0]);
  // The pieces are gone, and the environment has stepped back, before reading begins.
  const before = poseAt(opening.end - 1);
  assert.equal(before.open, 1);
  assert.ok(before.dim > 0.99);
});

test("the light blooms as the pieces leave and is out again before the content is read", () => {
  const opening = segmentOf("OPENING");
  let peak = 0;
  for (let scroll = opening.start; scroll <= opening.end; scroll += 2) peak = Math.max(peak, poseAt(scroll).flare);
  assert.equal(peak, 1);
  assert.equal(poseAt(opening.end).flare, 0);
  // It is only ever lit while the cube opens, closes, or gathers for the loop.
  const lit = new Set<ScrollState>(["UNLOCKING", "OPENING", "CLOSING", "LOOP"]);
  for (let scroll = 0; scroll <= loopEnd; scroll += 5) {
    const { flare } = poseAt(scroll);
    assert.ok(flare >= 0 && flare <= 1);
    if (!lit.has(stateAt(scroll))) assert.equal(flare, 0, `lit during ${stateAt(scroll)} at ${scroll}`);
  }
});

test("leaving the projects, the pieces return and the cube is whole and solved before it turns", () => {
  const closing = segmentOf("CLOSING");
  let previous = 1;
  for (let scroll = closing.start; scroll <= closing.end; scroll += 5) {
    const pose = poseAt(scroll);
    assert.ok(pose.open <= previous, `the cube opens again at ${scroll}`);
    previous = pose.open;
    assert.equal(pose.shown, true);
  }
  const closed = poseAt(closing.end);
  assert.deepEqual([closed.open, closed.flare, closed.dim, closed.stage], [0, 0, 0, 1]);
  assert.ok(closed.orientation.angleTo(HERO_ORIENTATION) < ANGLE_EPSILON);
});

test("the finale returns the cube to its three-quarter view and leaves it apart around the content", () => {
  const resume = boundsOf("resume");
  for (const scroll of [resume.top, resume.top + resume.hold! / 2, resume.top + resume.hold!]) {
    const pose = poseAt(scroll);
    assert.ok(pose.orientation.angleTo(HERO_ORIENTATION) < ANGLE_EPSILON);
    assert.deepEqual([pose.stage, pose.dolly, pose.spread, pose.open], [1, 0, 1, 0]);
    assert.deepEqual([pose.shown, pose.presence, pose.dim], [true, 1, 0]);
  }
});

test("the cube stays whole everywhere except where it opens, and comes apart in the finale only after a pause", () => {
  const finale = segmentOf("FINALE");
  const length = finale.end - finale.start;
  const apart = new Set<ScrollState>(["FINALE", "FINALE_HOLD", "LOOP"]);
  const open = new Set<ScrollState>(["UNLOCKING", "OPENING", "INSIDE_SECTION", "CLOSING"]);
  let previous = 0;
  for (let scroll = 0; scroll <= loopEnd; scroll += 5) {
    const state = stateAt(scroll);
    const pose = poseAt(scroll);
    if (!apart.has(state)) assert.equal(pose.spread, 0, `the cube is apart during ${state} at ${scroll}`);
    if (!open.has(state)) assert.equal(pose.open, 0, `the cube is open during ${state} at ${scroll}`);
    if (state !== "FINALE") continue;

    const progress = (scroll - finale.start) / length;
    // Turning back and holding solved: still one piece.
    if (progress <= FINALE.separate[0]) assert.equal(pose.spread, 0, `apart before the pause ends (${progress.toFixed(2)})`);
    // The turn is complete before the hold begins.
    if (progress >= FINALE.turnEnd) assert.ok(pose.orientation.angleTo(HERO_ORIENTATION) < ANGLE_EPSILON);
    assert.ok(pose.spread >= previous, "the separation runs backward while scrolling down");
    previous = pose.spread;
  }
  assert.ok(FINALE.separate[0] > FINALE.turnEnd, "there is a pause between the turn and the separation");
});

test("on the way back the pieces gather before the cube leaves the stage for its slot", () => {
  const loop = segmentOf("LOOP");
  let previous = 1;
  for (let scroll = loop.start; scroll <= loop.end; scroll += 5) {
    const pose = poseAt(scroll);
    assert.ok(pose.spread <= previous, `the cube comes apart again at ${scroll}`);
    previous = pose.spread;
    // It travels, and idles, only once it is whole.
    if (pose.stage < 1 || pose.idle > 0) assert.equal(pose.spread, 0, `it leaves the stage in pieces at ${scroll}`);
    assert.deepEqual([pose.shown, pose.presence, pose.open], [true, 1, 0]);
  }
});
