"use client";

import { useEffect, useSyncExternalStore } from "react";

// Easter eggs the HUD and the 3D world share (kept apart from the 3D code so
// the HUD doesn't load it). The rules and texts are in src/game/easter.ts.

// ---- Fireworks: the Konami code, or the dev panel ------------------------------
let fireworksAt = 0;
const listeners = new Set<() => void>();

export function launchFireworks() {
  fireworksAt = performance.now();
  listeners.forEach((l) => l());
}

// When the last show started (0 for never): the 3D world plays it.
export function useFireworks() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => fireworksAt,
    () => 0,
  );
}

// ---- The golden deer: the dev panel can ask the forest for one -------------------
export const goldenDeer = { wanted: false };

// ---- The Konami code --------------------------------------------------------------
const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];

export function useKonami(onCode: () => void) {
  useEffect(() => {
    let at = 0;
    const onKey = (e: KeyboardEvent) => {
      // Not while typing (a name, feedback).
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (key === KONAMI[at]) {
        at++;
        if (at === KONAMI.length) {
          at = 0;
          onCode();
        }
      } else {
        at = key === KONAMI[0] ? 1 : 0;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCode]);
}
