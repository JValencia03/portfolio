"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * Section heading with a restrained sense of depth: its edge and its
 * face-colored highlight follow the mouse as if the pointer were the light.
 * Only two custom properties change; the look, and the easing between
 * positions, live in `.section-title` (globals.css).
 *
 * Plain text in a plain `<h2>`. On touch screens and with reduced motion the
 * light stays where the stylesheet puts it.
 */
export function DepthTitle({ id, className, children }: { id: string; className?: string; children: ReactNode }) {
  const heading = useRef<HTMLHeadingElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const element = heading.current;
    const section = element?.closest("section");
    if (!element || !section || reducedMotion) return;

    let frame = 0;
    let x = 0;
    let y = 0;

    const apply = () => {
      frame = 0;
      const box = element.getBoundingClientRect();
      const lx = (x - (box.left + box.width / 2)) / (window.innerWidth / 2);
      const ly = (y - (box.top + box.height / 2)) / (window.innerHeight / 2);
      element.style.setProperty("--lx", Math.max(-1, Math.min(1, lx)).toFixed(3));
      element.style.setProperty("--ly", Math.max(-1, Math.min(1, ly)).toFixed(3));
    };
    const onMove = (event: Event) => {
      const pointer = event as PointerEvent;
      if (pointer.pointerType !== "mouse") return;
      x = pointer.clientX;
      y = pointer.clientY;
      frame ||= requestAnimationFrame(apply);
    };
    const onLeave = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      element.style.removeProperty("--lx");
      element.style.removeProperty("--ly");
    };

    section.addEventListener("pointermove", onMove, { passive: true });
    section.addEventListener("pointerleave", onLeave);
    return () => {
      section.removeEventListener("pointermove", onMove);
      section.removeEventListener("pointerleave", onLeave);
      onLeave();
    };
  }, [reducedMotion]);

  return (
    <h2 ref={heading} id={id} className={className ? `section-title ${className}` : "section-title"}>
      {children}
    </h2>
  );
}
