import type { SectionId } from "@/data/navigation";

/**
 * The portal window: the one place where WebGL drives the DOM.
 *
 * A section's content layer is shown through a rounded window whose position
 * and size the scene computes each frame from the projected center panel of
 * the aligned face. The values are written as CSS custom properties on that
 * section's content layer; the clip-path, backdrop and glow that use them
 * live in globals.css (`.scene-section > .section`).
 *
 *   masked  the content is clipped to the window
 *   veiled  the window covers the viewport: no clipping, only the backdrop
 *   open    nothing applied: the section is a normal block of content
 */
export type PortalMode = "masked" | "veiled" | "open";

export interface PortalWindow {
  /** Half-size of the window, in CSS pixels. */
  radius: number;
  /** Corner rounding, in CSS pixels. */
  corner: number;
  /** Face-colored light filling the window, 0 to 1. */
  glow: number;
  /** Opacity of the backdrop behind the content, 0 to 1. */
  veil: number;
}

const layers = new Map<SectionId, HTMLElement>();

function layerOf(id: SectionId): HTMLElement | null {
  let layer = layers.get(id);
  if (!layer) {
    const found = document.querySelector<HTMLElement>(`#${id}.scene-section > .section`);
    if (!found) return null;
    layer = found;
    layers.set(id, layer);
  }
  return layer;
}

/** The layer currently styled, and the last values written to it. */
let current: HTMLElement | null = null;
const written = { mode: "", radius: "", corner: "", center: "", glow: "", veil: "" };

function write(layer: HTMLElement, key: keyof typeof written, property: string, value: string) {
  if (written[key] === value) return;
  written[key] = value;
  layer.style.setProperty(property, value);
}

function release(layer: HTMLElement) {
  delete layer.dataset.portal;
  for (const property of ["--portal-r", "--portal-corner", "--portal-cy", "--portal-glow", "--portal-veil"]) {
    layer.style.removeProperty(property);
  }
  for (const key of Object.keys(written) as Array<keyof typeof written>) written[key] = "";
}

/**
 * Applies the window to one section's content and releases any other.
 * Writes only what changed, so a still frame costs nothing.
 */
export function setPortalWindow(id: SectionId | null, mode: PortalMode, values?: PortalWindow) {
  const layer = id && mode !== "open" ? layerOf(id) : null;

  if (current && current !== layer) release(current);
  current = layer;
  if (!layer || !values) return;

  if (written.mode !== mode) {
    written.mode = mode;
    layer.dataset.portal = mode;
  }
  write(layer, "veil", "--portal-veil", values.veil.toFixed(3));
  write(layer, "glow", "--portal-glow", values.glow.toFixed(3));

  if (mode === "masked") {
    // The window is centered in the viewport; the layer may be scrolling, so
    // express that center in the layer's own coordinates.
    const center = window.innerHeight / 2 - layer.getBoundingClientRect().top;
    write(layer, "center", "--portal-cy", `${center.toFixed(1)}px`);
    write(layer, "radius", "--portal-r", `${values.radius.toFixed(1)}px`);
    write(layer, "corner", "--portal-corner", `${values.corner.toFixed(1)}px`);
  }
}

/** Releases everything, e.g. when the scene is torn down. */
export function clearPortalWindow() {
  if (current) release(current);
  current = null;
}
