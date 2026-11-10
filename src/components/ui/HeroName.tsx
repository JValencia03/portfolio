"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/** Reach of the pointer around each letter, in multiples of the font size. */
const RADIUS_EM = 1.9;
/** Largest turn of a letter toward the pointer, in degrees. */
const MAX_TILT = 17;
/** How far the nearest letter rises toward the viewer, in em. */
const LIFT_EM = 0.14;
/** Spring that carries every letter: slightly underdamped, so it settles with a small rebound. */
const STIFFNESS = 190;
const DAMPING = 17;
/** Below this, a letter is considered at rest. */
const REST = 0.0015;

interface Letter {
  element: HTMLElement;
  /** Center of the letter relative to the heading's box, in px. */
  x: number;
  y: number;
  /** Sprung values and their velocities: turn up (−1…1), turn right (−1…1), lift (0…1). */
  value: [number, number, number];
  velocity: [number, number, number];
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

function writeLetter({ element, value }: Letter) {
  const [up, right, lift] = value;
  const { style } = element;
  style.setProperty("--rx", `${(up * MAX_TILT).toFixed(2)}deg`);
  style.setProperty("--ry", `${(right * MAX_TILT).toFixed(2)}deg`);
  style.setProperty("--z", `${(lift * LIFT_EM).toFixed(4)}em`);
  // The depth of the letter shows on the side it turns away from.
  style.setProperty("--ex", (-right * 1.6).toFixed(3));
  style.setProperty("--ey", (1 + up * 1.6).toFixed(3));
  // Reflections of the cube's three visible faces: blue from the left,
  // red from the right, yellow from above.
  style.setProperty("--glow-blue", clamp01(lift * (0.35 - right * 1.5)).toFixed(3));
  style.setProperty("--glow-red", clamp01(lift * (0.35 + right * 1.5)).toFixed(3));
  style.setProperty("--glow-yellow", clamp01(lift * (0.35 + up * 1.5)).toFixed(3));
  style.setProperty("--lift", clamp01(lift).toFixed(3));
}

function clearLetter({ element }: Letter) {
  for (const name of ["--rx", "--ry", "--z", "--ex", "--ey", "--glow-blue", "--glow-red", "--glow-yellow", "--lift"]) {
    element.style.removeProperty(name);
  }
}

/**
 * The name as a typographic object: every letter turns toward the pointer,
 * rises slightly and catches the cube's colors, then springs back.
 *
 * The heading stays real text. Letters are wrapped only for presentation,
 * so the name is announced once through `aria-label`, and selecting or
 * copying it yields the plain name. With reduced motion, or with no pointer
 * nearby, the letters simply rest with their static depth.
 *
 * Mouse: letters react to proximity. Touch: they react while a finger is
 * down on or near the name and release when it lifts or starts a scroll.
 */
export function HeroName({ id, name }: { id: string; name: string }) {
  const heading = useRef<HTMLHeadingElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const element = heading.current;
    if (!element || reducedMotion) return;

    let letters: Letter[] = [];
    let radius = 1;
    let pointer: { x: number; y: number } | null = null;
    let frame = 0;
    let last = 0;

    const measure = () => {
      radius = parseFloat(getComputedStyle(element).fontSize) * RADIUS_EM;
      const previous = letters;
      // offset* ignore transforms, so a measurement mid-motion is still the resting layout.
      letters = Array.from(element.querySelectorAll<HTMLElement>("[data-letter]"), (node, index) => ({
        element: node,
        x: node.offsetLeft + node.offsetWidth / 2,
        y: node.offsetTop + node.offsetHeight / 2,
        value: previous[index]?.value ?? [0, 0, 0],
        velocity: previous[index]?.velocity ?? [0, 0, 0],
      }));
    };

    const step = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      const box = element.getBoundingClientRect();
      let moving = false;

      for (const letter of letters) {
        let up = 0;
        let right = 0;
        let lift = 0;
        if (pointer) {
          const dx = (pointer.x - box.left - letter.x) / radius;
          const dy = (pointer.y - box.top - letter.y) / radius;
          const falloff = clamp01(1 - Math.hypot(dx, dy));
          lift = falloff * falloff * (3 - 2 * falloff);
          right = Math.max(-1, Math.min(1, dx * 1.4)) * lift;
          up = Math.max(-1, Math.min(1, -dy * 1.4)) * lift;
        }
        const target = [up, right, lift];
        for (let channel = 0; channel < 3; channel++) {
          const offset = letter.value[channel] - target[channel];
          letter.velocity[channel] += (-STIFFNESS * offset - DAMPING * letter.velocity[channel]) * dt;
          letter.value[channel] += letter.velocity[channel] * dt;
          if (Math.abs(offset) > REST || Math.abs(letter.velocity[channel]) > REST) moving = true;
        }
        writeLetter(letter);
      }

      if (moving) {
        frame = requestAnimationFrame(step);
        return;
      }
      frame = 0;
      // Fully at rest with nothing nearby: hand the letters back to the stylesheet.
      if (letters.every((letter) => letter.value[2] < REST * 2)) {
        letters.forEach(clearLetter);
        delete element.dataset.live;
      }
    };

    const wake = () => {
      if (frame) return;
      element.dataset.live = "";
      last = performance.now();
      frame = requestAnimationFrame(step);
    };

    const onMove = (event: PointerEvent) => {
      // A finger only counts while it is down; pointerdown covers the first contact.
      pointer = { x: event.clientX, y: event.clientY };
      wake();
    };
    const release = () => {
      if (!pointer) return;
      pointer = null;
      wake();
    };
    const onUp = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") release();
    };
    const onScroll = () => {
      // The name moves under a resting pointer.
      if (pointer) wake();
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    document.fonts?.ready.then(measure);

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onMove, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    window.addEventListener("pointercancel", release, { passive: true });
    window.addEventListener("blur", release);
    window.addEventListener("scroll", onScroll, { passive: true });
    document.documentElement.addEventListener("pointerleave", release);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", release);
      window.removeEventListener("blur", release);
      window.removeEventListener("scroll", onScroll);
      document.documentElement.removeEventListener("pointerleave", release);
      letters.forEach(clearLetter);
      delete element.dataset.live;
    };
  }, [reducedMotion, name]);

  const words = name.split(" ");

  return (
    <h1 ref={heading} id={id} aria-label={name} className="display-title hero-name">
      {words.map((word, index) => (
        <span key={index} aria-hidden="true">
          {/* A word never breaks between its letters. */}
          <span className="hero-word">
            {Array.from(word, (character, position) => (
              <span key={position} data-letter className="hero-letter">
                {character}
              </span>
            ))}
          </span>
          {index < words.length - 1 && " "}
        </span>
      ))}
    </h1>
  );
}
