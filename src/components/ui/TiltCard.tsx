"use client";

import { useEffect, useRef, type PointerEvent, type ReactNode } from "react";
import { cx } from "@/lib/cx";

/** Largest tilt in either direction, in degrees. */
const MAX_TILT = 6;

interface TiltCardProps {
  children: ReactNode;
  className?: string;
}

/**
 * A surface that leans toward the pointer.
 *
 * It is plain HTML and CSS: the pointer position is written into custom
 * properties and the transform, highlight and easing live in globals.css
 * (`.tilt`). No WebGL and no React renders are involved — the properties are
 * set straight on the element, at most once per frame.
 *
 * Only a mouse tilts it. On touch screens, and when reduced motion is
 * requested, the card simply stays flat; keyboard focus inside it shows a
 * ring instead (also in CSS).
 */
export function TiltCard({ children, className }: TiltCardProps) {
  const element = useRef<HTMLDivElement>(null);
  const frame = useRef(0);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse") return;
    const target = element.current;
    if (!target) return;

    const rect = target.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;

    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      // Leaning toward the pointer: the edge under it comes forward.
      target.style.setProperty("--tilt-x", `${((0.5 - y) * 2 * MAX_TILT).toFixed(2)}deg`);
      target.style.setProperty("--tilt-y", `${((x - 0.5) * 2 * MAX_TILT).toFixed(2)}deg`);
      target.style.setProperty("--glare-x", `${(x * 100).toFixed(1)}%`);
      target.style.setProperty("--glare-y", `${(y * 100).toFixed(1)}%`);
      target.dataset.tilting = "";
    });
  };

  const onPointerLeave = () => {
    const target = element.current;
    if (!target) return;
    cancelAnimationFrame(frame.current);
    // Dropping the properties lets CSS ease the card back to neutral.
    target.style.removeProperty("--tilt-x");
    target.style.removeProperty("--tilt-y");
    delete target.dataset.tilting;
  };

  return (
    <div ref={element} className={cx("tilt", className)} onPointerMove={onPointerMove} onPointerLeave={onPointerLeave}>
      {children}
    </div>
  );
}
