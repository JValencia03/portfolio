import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Color, MeshStandardMaterial, Object3D, Vector3, type InstancedMesh } from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { getSectionFace, type FaceColor } from "@/data/navigation";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { FACE_COLORS } from "@/lib/rubik/model";
import { createFloatingField, easeDisplacement, repulsionTarget, wrap } from "@/lib/three/floatingField";
import { pointer } from "@/lib/three/pointer";
import type { Quality } from "@/lib/three/quality";
import { readFaceColors } from "./cubeResources";
import { CAMERA_FOV, CAMERA_REST_Z, sceneFrame } from "./sceneFrame";

/** Depth of the field: everything sits behind the Rubik's Cube, which is at z = 0. */
const NEAR_Z = -6;
const FAR_Z = -30;
/** The field extends this far past the visible area, so cubes wrap around out of sight. */
const AREA_MARGIN = 1.2;

/** World units the nearest cubes travel per screen of scroll. Farther ones travel less. */
const SCROLL_PARALLAX = 2.2;
/** World units the nearest cubes shift against the pointer. */
const POINTER_PARALLAX = 0.5;
const POINTER_DAMPING = 3;
/** How much less the farthest cubes move than the nearest, for both kinds of parallax. */
const DEPTH_FALLOFF = 0.65;

/**
 * On a narrow viewport the same cubes would crowd a smaller area, so only a
 * share of them is drawn: all of them from this aspect ratio up, never fewer
 * than the minimum share.
 */
const FULL_DENSITY_ASPECT = 1.5;
const MIN_DENSITY = 0.4;

/** Reach of the pointer's push, as a share of the visible height at each cube's depth. */
const REPEL_RADIUS = 0.2;
/** Farthest a cube is pushed, as a share of that reach. Kept subtle. */
const REPEL_PUSH = 0.45;

const TAN_HALF_FOV = Math.tan((CAMERA_FOV * Math.PI) / 360);

/**
 * The environment: a field of dark cubes floating at different depths behind
 * everything else.
 *
 * Depth is conveyed several ways at once — perspective and size, fog that
 * swallows the far ones, nearer cubes drifting and scrolling past faster,
 * and a slight shift against the pointer. Cubes close to the pointer ease
 * out of its way and drift back.
 *
 * All of them are drawn with two instanced meshes: the plain ones, and a few
 * that glow in the color of the face in charge. The whole field starts black
 * and gray and only takes on color as a face becomes active.
 *
 * Positions are recomputed from time, scroll and pointer every frame and
 * written straight into the instance matrices: no React renders, no
 * per-cube objects.
 */
export function FloatingCubes({ quality }: { quality: Quality }) {
  const reducedMotion = useReducedMotion();
  const plainMesh = useRef<InstancedMesh>(null);
  const accentMesh = useRef<InstancedMesh>(null);

  // Plain cubes first, accent cubes after: each group fills one instanced mesh.
  const { cubes, plainCount } = useMemo(() => {
    const field = createFloatingField(quality.floatingCubes);
    const plain = field.filter((cube) => !cube.accent);
    return { cubes: [...plain, ...field.filter((cube) => cube.accent)], plainCount: plain.length };
  }, [quality.floatingCubes]);
  const accentCount = cubes.length - plainCount;

  const [resources] = useState(() => {
    const tokens = readFaceColors();
    return {
      geometry: new RoundedBoxGeometry(1, 1, 1, 2, 0.07),
      // White base color: each instance supplies its own dark gray.
      // Almost no reflections: the studio lights around the Rubik's Cube are tinted,
      // and this field must read as plain black and graphite until a face colors it.
      plain: new MeshStandardMaterial({ color: "#ffffff", roughness: 0.55, metalness: 0.15, envMapIntensity: 0.05 }),
      accent: new MeshStandardMaterial({
        color: "#141414",
        roughness: 0.5,
        metalness: 0.15,
        envMapIntensity: 0.05,
        emissive: "#000000",
      }),
      faceColors: Object.fromEntries(FACE_COLORS.map((face) => [face, new Color(tokens[face])])) as Record<FaceColor, Color>,
    };
  });

  /** Per-cube displacement from the pointer's push: x and y for each cube. */
  const displacement = useRef(new Float32Array(cubes.length * 2));
  const easedPointer = useRef({ x: 0, y: 0 });
  const scratch = useRef({ object: new Object3D(), axis: new Vector3(), push: { x: 0, y: 0 } });

  useEffect(
    () => () => {
      resources.geometry.dispose();
      resources.plain.dispose();
      resources.accent.dispose();
    },
    [resources],
  );

  // Each plain cube gets its own shade of graphite.
  useLayoutEffect(() => {
    const mesh = plainMesh.current;
    if (!mesh) return;
    const gray = new Color();
    for (let index = 0; index < plainCount; index++) {
      const value = 0.04 + cubes[index].shade * 0.1;
      mesh.setColorAt(index, gray.setRGB(value, value, value));
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [cubes, plainCount]);

  useFrame((state, rawDelta) => {
    const plain = plainMesh.current;
    const accent = accentMesh.current;
    if (!plain) return;

    const { object, axis, push } = scratch.current;
    const offsets = displacement.current;
    const aspect = state.size.width / state.size.height;

    // Keep the field's density on screen roughly constant across aspect ratios.
    // The cubes are generated evenly spread, so any leading share of them is too.
    const density = Math.min(1, Math.max(MIN_DENSITY, aspect / FULL_DENSITY_ASPECT));
    plain.count = Math.ceil(plainCount * density);
    if (accent) accent.count = Math.ceil(accentCount * density);
    const delta = Math.min(rawDelta, 0.1);

    // With reduced motion the field holds still: no drift, no parallax, no push.
    const time = reducedMotion ? 0 : state.clock.elapsedTime;
    const scrollScreens = reducedMotion || !sceneFrame.choreographed ? 0 : sceneFrame.scroll / state.size.height;
    const repel = pointer.active && !reducedMotion;

    const pointerEase = 1 - Math.exp(-POINTER_DAMPING * delta);
    const targetX = reducedMotion ? 0 : pointer.x;
    const targetY = reducedMotion ? 0 : pointer.y;
    easedPointer.current.x += (targetX - easedPointer.current.x) * pointerEase;
    easedPointer.current.y += (targetY - easedPointer.current.y) * pointerEase;

    for (let index = 0; index < cubes.length; index++) {
      const cube = cubes[index];
      const z = NEAR_Z + (FAR_Z - NEAR_Z) * cube.depth;
      const parallax = 1 - DEPTH_FALLOFF * cube.depth;

      // Half-extents of the visible area at this depth, plus a margin to wrap in.
      const halfHeight = (CAMERA_REST_Z - z) * TAN_HALF_FOV * AREA_MARGIN + cube.size;
      const halfWidth = (CAMERA_REST_Z - z) * TAN_HALF_FOV * aspect * AREA_MARGIN + cube.size;

      // Slow descent, lifted by scroll; the seam of the wrap is always off screen.
      const x =
        cube.u * halfWidth + Math.sin(time * 0.2 + cube.phase) * 0.25 - easedPointer.current.x * POINTER_PARALLAX * parallax;
      const y =
        wrap(cube.v * halfHeight - cube.fall * time + scrollScreens * SCROLL_PARALLAX * parallax, halfHeight) -
        easedPointer.current.y * POINTER_PARALLAX * 0.6 * parallax;

      // Pointer repulsion, in the plane of this cube's depth.
      let pushX = 0;
      let pushY = 0;
      if (repel) {
        // Where the pointer's ray crosses that plane, and how far its push reaches there.
        const reach = (sceneFrame.cameraZ - z) * TAN_HALF_FOV;
        const radius = REPEL_RADIUS * 2 * reach;
        repulsionTarget(push, x, y, pointer.x * reach * aspect, pointer.y * reach, radius, radius * REPEL_PUSH);
        pushX = push.x;
        pushY = push.y;
      }
      offsets[index * 2] = easeDisplacement(offsets[index * 2], pushX, delta);
      offsets[index * 2 + 1] = easeDisplacement(offsets[index * 2 + 1], pushY, delta);

      object.position.set(x + offsets[index * 2], y + offsets[index * 2 + 1], z);
      object.quaternion.setFromAxisAngle(axis.set(cube.axis[0], cube.axis[1], cube.axis[2]), cube.phase + cube.spin * time);
      object.scale.setScalar(cube.size);
      object.updateMatrix();

      if (index < plainCount) plain.setMatrixAt(index, object.matrix);
      else accent?.setMatrixAt(index - plainCount, object.matrix);
    }
    plain.instanceMatrix.needsUpdate = true;
    if (accent) accent.instanceMatrix.needsUpdate = true;

    // Accent cubes glow in the color of the face in charge, as strongly as the scroll-driven light.
    if (accent) {
      const glow = accent.material as MeshStandardMaterial;
      const face = sceneFrame.choreographed ? getSectionFace(sceneFrame.pose.tintSection) : null;
      if (face) glow.emissive.copy(resources.faceColors[face]);
      glow.emissiveIntensity = face ? sceneFrame.pose.tint * 0.32 : 0;
    }
  });

  return (
    // Instances are spread over the whole view, so the meshes are never culled as a unit.
    <group name="floating-cubes">
      <instancedMesh ref={plainMesh} name="floating:plain" args={[resources.geometry, resources.plain, plainCount]} frustumCulled={false} />
      {accentCount > 0 && (
        <instancedMesh
          ref={accentMesh}
          name="floating:accent"
          args={[resources.geometry, resources.accent, accentCount]}
          frustumCulled={false}
        />
      )}
    </group>
  );
}
