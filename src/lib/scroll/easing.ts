export const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

export const lerp = (from: number, to: number, t: number) => from + (to - from) * t;

/** 0 below `edge0`, 1 above `edge1`, smooth in between. */
export function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = clamp01((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export const easeInCubic = (t: number) => t * t * t;

export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
