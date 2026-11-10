import {
  AdditiveBlending,
  BoxGeometry,
  Color,
  ExtrudeGeometry,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Shape,
  type BufferGeometry,
} from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import type { FaceColor } from "@/data/navigation";
import { CUBE } from "@/lib/rubik/dimensions";
import { FACE_COLORS } from "@/lib/rubik/model";
import type { Quality } from "@/lib/three/quality";

/** A rounded square tile with beveled edges, lying on the XY plane and rising toward +Z. */
function createPanelGeometry(): BufferGeometry {
  // The bevel grows the outline, so the shape is drawn smaller by that amount.
  const half = CUBE.panelSize / 2 - CUBE.panelBevel;
  const radius = CUBE.panelRadius - CUBE.panelBevel;
  const inner = half - radius;

  const shape = new Shape();
  shape.absarc(inner, inner, radius, 0, Math.PI / 2);
  shape.absarc(-inner, inner, radius, Math.PI / 2, Math.PI);
  shape.absarc(-inner, -inner, radius, Math.PI, Math.PI * 1.5);
  shape.absarc(inner, -inner, radius, Math.PI * 1.5, Math.PI * 2);

  const geometry = new ExtrudeGeometry(shape, {
    depth: CUBE.panelDepth,
    bevelEnabled: true,
    bevelThickness: CUBE.panelBevel,
    bevelSize: CUBE.panelBevel,
    bevelSegments: 2,
    curveSegments: 5,
  });
  // The back bevel extends below z = 0; lift the tile so its base sits on the plane.
  geometry.translate(0, 0, CUBE.panelBevel);
  return geometry;
}

export interface CubeResources {
  bodyGeometry: BufferGeometry;
  coreGeometry: BufferGeometry;
  panelGeometry: BufferGeometry;
  bodyMaterial: MeshPhysicalMaterial;
  coreMaterial: MeshStandardMaterial;
  panelMaterials: Record<FaceColor, MeshPhysicalMaterial>;
  dispose: () => void;
}

/**
 * Everything the cube is drawn with: three geometries and eight materials,
 * shared by instanced meshes.
 */
export function createCubeResources(colors: Record<FaceColor, string>, quality: Quality): CubeResources {
  const bodyGeometry = new RoundedBoxGeometry(CUBE.cubieSize, CUBE.cubieSize, CUBE.cubieSize, 3, CUBE.cubieRadius);
  // The core is almost entirely hidden behind the panels: a plain box is enough.
  const coreGeometry = new BoxGeometry(CUBE.coreSize, CUBE.coreSize, CUBE.coreSize);
  const panelGeometry = createPanelGeometry();

  // Clear glass shell. Core and panels are encased in it, so the colors are
  // seen through a refracting surface and the bevels pick up the studio lights
  // as bright edges. The tint stays near neutral: a colored one would shift
  // the face colors seen through it.
  const bodyMaterial = quality.transmission
    ? new MeshPhysicalMaterial({
        color: "#e4e9f5",
        roughness: 0.03,
        metalness: 0,
        transmission: 1,
        thickness: 0.25,
        ior: 1.4,
        attenuationColor: "#dfe4f2",
        attenuationDistance: 1.2,
        clearcoat: 1,
        clearcoatRoughness: 0.05,
        // Reflections are what draw the glass: let the light panels read clearly on the bevels.
        envMapIntensity: 1.7,
      })
    : // Lighter devices: the shell contributes only its reflections, added on top
      // of what is behind it. Same highlights on the bevels, no second render pass.
      new MeshPhysicalMaterial({
        color: "#000000",
        roughness: 0.03,
        metalness: 0,
        clearcoat: 1,
        clearcoatRoughness: 0.05,
        envMapIntensity: 1.7,
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false,
      });

  // Graphite core. It blocks the view straight through the cube, so only the
  // panels of the faces turned toward the viewer are seen; the far side shows
  // as thin lines of color in the seams between cubies.
  const coreMaterial = new MeshStandardMaterial({ color: "#07080c", roughness: 0.55, metalness: 0.4 });

  const panelMaterials = Object.fromEntries(
    FACE_COLORS.map((face) => {
      const color = new Color(colors[face]);
      return [
        face,
        // Backlit colored inlay. Panels are opaque so they show through the glass
        // around them; self-illumination keeps each color true under any light.
        new MeshPhysicalMaterial({
          color,
          emissive: color,
          emissiveIntensity: 0.6,
          roughness: 0.18,
          metalness: 0,
          clearcoat: 1,
          clearcoatRoughness: 0.06,
        }),
      ];
    }),
  ) as Record<FaceColor, MeshPhysicalMaterial>;

  return {
    bodyGeometry,
    coreGeometry,
    panelGeometry,
    bodyMaterial,
    coreMaterial,
    panelMaterials,
    dispose() {
      bodyGeometry.dispose();
      coreGeometry.dispose();
      panelGeometry.dispose();
      bodyMaterial.dispose();
      coreMaterial.dispose();
      Object.values(panelMaterials).forEach((material) => material.dispose());
    },
  };
}

/** Reads the six face colors from the design tokens in globals.css — the single source of truth. */
export function readFaceColors(): Record<FaceColor, string> {
  const styles = getComputedStyle(document.documentElement);
  return Object.fromEntries(
    FACE_COLORS.map((face) => {
      const value = styles.getPropertyValue(`--color-face-${face}`).trim();
      if (!value) throw new Error(`Missing design token --color-face-${face}`);
      return [face, value];
    }),
  ) as Record<FaceColor, string>;
}
