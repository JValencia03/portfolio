/** Geometry of the cube, in cube units: one cubie cell is 1 unit wide. */
export const CUBE = {
  /** Distance between the centers of neighboring cubies. */
  spacing: 1,
  /** Side of a cubie's glass shell. Smaller than the spacing, which leaves a visible gap. */
  cubieSize: 0.95,
  /** Generous rounding: each cubie reads as a pebble of glass rather than a block. */
  cubieRadius: 0.16,
  /** Side of the opaque core inside each glass shell. */
  coreSize: 0.8,
  /** Side of a colored panel. */
  panelSize: 0.74,
  panelRadius: 0.2,
  panelDepth: 0.022,
  panelBevel: 0.016,
} as const;

/** Distance from a cubie's center to the base of its panels: on the core, just under the glass surface. */
export const PANEL_OFFSET = CUBE.coreSize / 2;

/** Edge of the whole cube, in cube units. */
export const CUBE_EDGE = 3;
