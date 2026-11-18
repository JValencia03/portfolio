"use client";

import { useSyncExternalStore } from "react";
import { TransitionTrack } from "@/components/scroll/TransitionTrack";
import { Hero } from "./Hero";

const subscribe = () => () => {};

/**
 * The seam of the loop: what makes the scroll endless.
 *
 * After the finale comes one more track and then a copy of the hero. Over
 * that track the pieces of the cube gather again and the cube returns to its
 * slot, so that when the copy reaches the top of the viewport the page looks
 * exactly as it does at the very top. At that point the navigation
 * coordinator moves the scroll position back to the start — the same picture,
 * so nothing is seen to change — and the visitor simply keeps scrolling.
 *
 * The copy is inert and hidden from assistive technology, and it is rendered
 * only in the browser, so the document a crawler or a screen reader gets has
 * one hero. Without the scene (no WebGL, reduced motion, no JavaScript) both
 * elements take no space and the page ends with the finale.
 */
export function LoopSeam() {
  const inBrowser = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  if (!inBrowser) return null;

  return (
    <>
      <TransitionTrack to="hero" kind="loop" />
      <div aria-hidden="true" inert data-loop-end className="loop-replica">
        <Hero replica />
      </div>
    </>
  );
}
