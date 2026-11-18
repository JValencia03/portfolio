import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Matrix4, type InstancedMesh, type MeshPhysicalMaterial } from "three";
import type { FaceColor } from "@/data/navigation";
import { createCubeLayout, type CubeLayout } from "@/lib/rubik/layout";
import { FACE_COLORS } from "@/lib/rubik/model";
import { createOpening, openingTransforms, type CubieOpening } from "@/lib/rubik/opening";
import { createSeparation, separationReach, separationTransforms } from "@/lib/rubik/separation";
import type { Quality } from "@/lib/three/quality";
import { createCubeResources, readFaceColors } from "./cubeResources";
import { sceneFrame } from "./sceneFrame";

const LAYOUT = createCubeLayout();
const SEPARATIONS = createSeparation(LAYOUT.cubies);
const CUBIES = LAYOUT.cubies.length;
const PANELS_PER_FACE = 9;
/** How strongly the panels light themselves at rest, and how much more at the height of a flare. */
const PANEL_GLOW = 0.6;
const FLARE_GLOW = 1.5;

const scratch = new Matrix4();

export interface CubeMeshes {
  bodies: InstancedMesh;
  cores: InstancedMesh;
  panels: Record<FaceColor, InstancedMesh>;
}

/**
 * Writes one transform per cubie into every instanced mesh. A cubie's shell,
 * core and panels all take the same transform, so each piece always moves as
 * one — this is the single entry point for animating pieces individually
 * (the finale uses it; at rest it is called once with `layout.rest`).
 */
export function applyCubieTransforms(meshes: CubeMeshes, layout: CubeLayout, transforms: readonly Matrix4[]) {
  for (let index = 0; index < transforms.length; index++) {
    meshes.bodies.setMatrixAt(index, transforms[index]);
    meshes.cores.setMatrixAt(index, transforms[index]);
  }
  meshes.bodies.instanceMatrix.needsUpdate = true;
  meshes.cores.instanceMatrix.needsUpdate = true;

  for (const face of FACE_COLORS) {
    const mesh = meshes.panels[face];
    layout.panels[face].forEach((panel, slot) => {
      mesh.setMatrixAt(slot, scratch.multiplyMatrices(transforms[panel.cubie], panel.local));
    });
    mesh.instanceMatrix.needsUpdate = true;
  }
}

/**
 * The procedural 3×3×3 cube.
 *
 * 27 cubies, each a glass shell around a graphite core with a colored panel
 * on every side that lies on the outside of the cube — 108 parts in all,
 * drawn with eight instanced meshes: one for the shells, one for the cores
 * and one per color for the panels. Which cubie each instance belongs to
 * lives in the layout, so pieces keep a stable identity.
 *
 * It has no transform of its own; whoever renders it decides where it is
 * and how it is turned, always as one rigid object. The exceptions come from
 * the scroll pose: `open` turns its layers and then sends the cubies out of
 * the view, and in the finale `spread` moves them apart along fixed paths.
 * Either way a cubie's shell, core and panels travel together.
 */
export function RubiksCube({ quality }: { quality: Quality }) {
  const [resources] = useState(() => createCubeResources(readFaceColors(), quality));
  const bodies = useRef<InstancedMesh>(null);
  const cores = useRef<InstancedMesh>(null);
  const panels = useRef<Partial<Record<FaceColor, InstancedMesh>>>({});
  const meshes = useRef<CubeMeshes | null>(null);
  /** One transform per cubie, reused every time the spread changes. */
  const transforms = useRef(LAYOUT.rest.map((matrix) => matrix.clone()));
  const applied = useRef({ open: 0, spread: 0, aspect: 0, flare: 0 });
  /** The opening depends on the shape of the view, so it is rebuilt when that changes. */
  const opening = useRef<{ aspect: number; cubies: CubieOpening[] } | null>(null);

  useEffect(() => () => resources.dispose(), [resources]);

  useLayoutEffect(() => {
    if (!bodies.current || !cores.current) return;
    if (FACE_COLORS.some((face) => !panels.current[face])) return;
    meshes.current = {
      bodies: bodies.current,
      cores: cores.current,
      panels: panels.current as Record<FaceColor, InstancedMesh>,
    };
    applyCubieTransforms(meshes.current, LAYOUT, LAYOUT.rest);
  }, []);

  // The opening and the finale. Everything is rewritten only on frames where something actually changed.
  useFrame((state) => {
    if (!meshes.current) return;
    const { pose, choreographed } = sceneFrame;
    const open = choreographed ? pose.open : 0;
    const spread = choreographed ? pose.spread : 0;
    const flare = choreographed ? pose.flare : 0;
    const aspect = state.size.width / state.size.height;
    const last = applied.current;

    // The flare lights the cube from within: every panel shines brighter.
    if (flare !== last.flare) {
      last.flare = flare;
      for (const face of FACE_COLORS) {
        (meshes.current.panels[face].material as MeshPhysicalMaterial).emissiveIntensity = PANEL_GLOW + FLARE_GLOW * flare;
      }
    }

    const whole = open === 0 && spread === 0;
    if (open === last.open && spread === last.spread && (whole || aspect === last.aspect)) return;
    last.open = open;
    last.spread = spread;
    last.aspect = aspect;

    if (open > 0) {
      if (opening.current?.aspect !== aspect) opening.current = { aspect, cubies: createOpening(LAYOUT.cubies, aspect) };
      applyCubieTransforms(meshes.current, LAYOUT, openingTransforms(transforms.current, opening.current.cubies, open));
    } else {
      const reach = separationReach(aspect);
      applyCubieTransforms(meshes.current, LAYOUT, separationTransforms(transforms.current, SEPARATIONS, spread, reach));
    }
  });

  return (
    // The cube is small and always wholly in or out of view with its parent,
    // so per-mesh frustum culling would only cost time.
    <group name="rubiks-cube">
      <instancedMesh
        ref={bodies}
        name="bodies"
        args={[resources.bodyGeometry, resources.bodyMaterial, CUBIES]}
        frustumCulled={false}
      />
      <instancedMesh
        ref={cores}
        name="cores"
        args={[resources.coreGeometry, resources.coreMaterial, CUBIES]}
        frustumCulled={false}
      />
      {FACE_COLORS.map((face) => (
        <instancedMesh
          key={face}
          ref={(mesh) => {
            panels.current[face] = mesh ?? undefined;
          }}
          name={`panels:${face}`}
          args={[resources.panelGeometry, resources.panelMaterials[face], PANELS_PER_FACE]}
          frustumCulled={false}
        />
      ))}
    </group>
  );
}
