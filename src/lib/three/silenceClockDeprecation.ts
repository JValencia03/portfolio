import { setConsoleFunction } from "three";

/**
 * React Three Fiber (9.8.x, the latest release) still creates a `THREE.Clock`,
 * which three.js r183+ reports as deprecated on every canvas mount. The
 * warning is not actionable from this app, so drop that one message and pass
 * every other three.js log through unchanged. Remove once R3F moves to
 * `THREE.Timer`.
 */
const CLOCK_DEPRECATION = "THREE.Clock: This module has been deprecated";

setConsoleFunction((type: "log" | "warn" | "error", message: string, ...params: unknown[]) => {
  if (type === "warn" && message.startsWith(CLOCK_DEPRECATION)) return;
  console[type](message, ...params);
});
