import { useSyncExternalStore } from "react";

// The building card the pointer is over in the bottom bar: every building of
// that kind lights up on the map, so you can see where they all are.
let current: string | null = null;
const listeners = new Set<() => void>();

export function setHoveredBuilding(id: string | null) {
  if (current === id) return;
  current = id;
  for (const l of listeners) l();
}

export function useHoveredBuilding() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => void listeners.delete(l);
    },
    () => current,
    () => null,
  );
}
