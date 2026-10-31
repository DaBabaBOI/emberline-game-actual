import { useSyncExternalStore } from "react";

// Whether the tutorial hand has lost what it points at (a button that isn't on
// screen, say in first person, or a tile out of view). The clock only waits for
// the player while the hand can actually show them where to click.
let lost = false;
const listeners = new Set<() => void>();

export function setGuideLost(next: boolean) {
  if (next === lost) return;
  lost = next;
  for (const l of listeners) l();
}

export function useGuideLost() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => void listeners.delete(l);
    },
    () => lost,
    () => false,
  );
}
