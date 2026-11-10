/**
 * Mouse position shared by everything in the 3D scene.
 *
 * It is listened to on `window`, not on the canvas: the canvas ignores
 * pointer events entirely, so it can never get between the visitor and the
 * HTML controls. Values are read inside the render loop and never trigger a
 * React render.
 */
export const pointer = {
  /** -1 (left edge) to 1 (right edge). Returns to 0 when the mouse leaves. */
  x: 0,
  /** -1 (bottom edge) to 1 (top edge). Returns to 0 when the mouse leaves. */
  y: 0,
  /** Whether a mouse is currently over the page. False for touch input. */
  active: false,
};

/** Starts tracking. Returns the function that stops it. */
export function trackPointer(): () => void {
  const onMove = (event: PointerEvent) => {
    // Touch drags are scrolling gestures, not pointing.
    if (event.pointerType !== "mouse") return;
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -((event.clientY / window.innerHeight) * 2 - 1);
    pointer.active = true;
  };
  // When the mouse leaves the page, everything eases back to rest.
  const onLeave = () => {
    pointer.x = 0;
    pointer.y = 0;
    pointer.active = false;
  };

  window.addEventListener("pointermove", onMove, { passive: true });
  document.documentElement.addEventListener("pointerleave", onLeave);
  window.addEventListener("blur", onLeave);
  return () => {
    window.removeEventListener("pointermove", onMove);
    document.documentElement.removeEventListener("pointerleave", onLeave);
    window.removeEventListener("blur", onLeave);
    onLeave();
  };
}
