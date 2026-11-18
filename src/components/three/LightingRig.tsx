import { Environment, Lightformer } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import { Color, type AmbientLight, type DirectionalLight, type Fog } from "three";
import { getSectionColor, type FaceColor } from "@/data/navigation";
import { FACE_COLORS } from "@/lib/rubik/model";
import { readFaceColors } from "./cubeResources";
import { sceneFrame } from "./sceneFrame";
import { sceneLight } from "./sceneLight";

const NEUTRAL = new Color("#ffffff");
const AMBIENT_INTENSITY = 0.35;
/** How much the fill light rises at the height of a flare. */
const FLARE_FILL = 0.9;
/** How quickly the colored light shifts from one section's color to the next; higher is quicker. */
const COLOR_DAMPING = 5;
/** Color the far end of the scene fades into: the page's own darkest tone. */
export const FOG_COLOR = "#050506";
const FOG_BASE = new Color(FOG_COLOR);

/**
 * Studio lighting for the glass cube.
 *
 * Reflections come from a small procedural environment — a few light panels
 * rendered once into a cube map — so no HDR image is downloaded. Light
 * placement is deliberately restrained: bright enough to trace the bevels,
 * never strong enough to wash out the face colors.
 *
 * On top of that, accent lights take the color of the section in charge, and
 * the fog that swallows the far background leans toward it. Their strength
 * comes from the scroll pose: it rises as the camera approaches a face and
 * falls away as the cube turns to the next one. With no colored section in
 * charge the environment is neutral: black and graphite.
 *
 * When the cube opens or comes back together the pose also carries a flare:
 * for that moment the whole scene is lit a little brighter.
 */
export function LightingRig() {
  const ambient = useRef<AmbientLight>(null);
  const accent = useRef<DirectionalLight>(null);
  const frontAccent = useRef<DirectionalLight>(null);
  const [colors] = useState(() => {
    const tokens = readFaceColors();
    return Object.fromEntries(FACE_COLORS.map((face) => [face, new Color(tokens[face])])) as Record<FaceColor, Color>;
  });

  useFrame((state, rawDelta) => {
    const { pose, choreographed } = sceneFrame;
    const target = choreographed ? getSectionColor(pose.tintSection) : null;
    const strength = target ? pose.tint : 0;
    const flare = choreographed ? pose.flare : 0;

    // The color eases toward the section's; out of the dark it simply is that color.
    const light = sceneLight.color;
    if (target) {
      if (sceneLight.strength < 0.01) light.copy(colors[target]);
      else light.lerp(colors[target], 1 - Math.exp(-COLOR_DAMPING * Math.min(rawDelta, 0.1)));
    }
    sceneLight.strength = strength;

    if (accent.current) {
      accent.current.intensity = strength * 2.2;
      accent.current.color.copy(light);
    }
    if (frontAccent.current) {
      frontAccent.current.intensity = strength * 0.45;
      frontAccent.current.color.copy(light);
    }
    if (ambient.current) {
      // The fill light leans toward the section's color without losing its brightness.
      ambient.current.color.copy(NEUTRAL).lerp(light, strength * 0.45);
      ambient.current.intensity = AMBIENT_INTENSITY + FLARE_FILL * flare;
    }
    // Atmospheric tint: distant cubes fade into darkness with a trace of the section's color.
    const fog = state.scene.fog as Fog | null;
    if (fog) fog.color.copy(FOG_BASE).lerp(light, strength * 0.035);
  });

  return (
    <>
      <ambientLight ref={ambient} intensity={AMBIENT_INTENSITY} />
      <directionalLight position={[3, 6, 8]} intensity={1.4} />
      <directionalLight position={[-6, -2, 4]} intensity={0.3} color="#d5ddf2" />
      {/* Accent in the active face color, from above and behind: it rims the glass edges. */}
      <directionalLight ref={accent} position={[0, 5, -3]} intensity={0} />
      {/* A weaker one from the front, low and to the side: it catches the near faces of the background cubes. */}
      <directionalLight ref={frontAccent} position={[-5, -3, 8]} intensity={0} />

      <Environment resolution={256} frames={1}>
        {/* Overhead soft box: the main highlight on top faces. */}
        <Lightformer form="rect" intensity={2.4} position={[0, 7, 2]} scale={[9, 5, 1]} target={[0, 0, 0]} />
        {/* Cool strip on the left, warm strip on the right: they trace the vertical bevels with a neon edge. */}
        <Lightformer form="rect" intensity={3.2} color="#8fb0ff" position={[-7, 1, 5]} scale={[2.6, 9, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={2.6} color="#ffd9bf" position={[7, 0, 5]} scale={[2.6, 9, 1]} target={[0, 0, 0]} />
        {/* Low rim from behind: lights the lower edges against the dark page. */}
        <Lightformer form="rect" intensity={1.6} color="#b9a8ff" position={[0, -6, -3]} scale={[9, 2, 1]} target={[0, 0, 0]} />
        {/* Soft box above and behind: a gloss gradient across the upward faces, like light on a screen. */}
        <Lightformer form="rect" intensity={1} position={[0, 7, -6]} scale={[10, 5, 1]} target={[0, 0, 0]} />
        {/* A small bright window above the camera's left shoulder: the wet glint on every rounded edge of the glass. */}
        <Lightformer form="rect" intensity={7} position={[-4.5, 5.5, 7]} scale={[2.4, 1.3, 1]} target={[0, 0, 0]} />
        {/* Faint fill from the camera side so nothing falls to pure black. */}
        <Lightformer form="ring" intensity={0.6} position={[0, -1, 9]} scale={4} target={[0, 0, 0]} />
      </Environment>
    </>
  );
}
