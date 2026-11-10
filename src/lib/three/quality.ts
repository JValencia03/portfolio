/**
 * Rendering quality, chosen from what the device can do — not from how wide
 * its window is.
 *
 * Two things are fixed when the scene starts (changing them later would
 * recompile shaders mid-experience): whether the glass is truly transmissive
 * and how many background cubes there are. The pixel ratio keeps adapting at
 * runtime between the tier's bounds, following the measured frame rate.
 */
export type QualityTier = "high" | "low";

export interface Quality {
  tier: QualityTier;
  /** Bounds of the device pixel ratio the canvas may render at. */
  minDpr: number;
  maxDpr: number;
  /** Number of cubes in the background field. */
  floatingCubes: number;
  /**
   * Real refraction through the glass shells. It needs the scene drawn twice
   * per frame; without it the shells keep their reflections but not their
   * refraction.
   */
  transmission: boolean;
}

export const QUALITY: Record<QualityTier, Quality> = {
  high: { tier: "high", minDpr: 1, maxDpr: 2, floatingCubes: 72, transmission: true },
  low: { tier: "low", minDpr: 0.75, maxDpr: 1.5, floatingCubes: 36, transmission: false },
};

interface CapabilityHints {
  hardwareConcurrency?: number;
  /** Approximate RAM in GB. Chromium only. */
  deviceMemory?: number;
}

/**
 * Picks the tier. Phones and tablets, and machines with few cores or little
 * memory, get the lighter one. `?quality=low` or `?quality=high` in the URL
 * forces a tier, which is useful for checking both on one machine.
 */
export function detectQuality(): Quality {
  const forced = new URLSearchParams(window.location.search).get("quality");
  if (forced === "high" || forced === "low") return QUALITY[forced];

  const { hardwareConcurrency = 8, deviceMemory = 8 } = navigator as Navigator & CapabilityHints;
  const touchFirst = window.matchMedia("(pointer: coarse)").matches && !window.matchMedia("(any-hover: hover)").matches;
  const constrained = hardwareConcurrency <= 4 || deviceMemory <= 4;

  return QUALITY[touchFirst || constrained ? "low" : "high"];
}
