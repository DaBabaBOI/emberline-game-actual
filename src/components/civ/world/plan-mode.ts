import { useSyncExternalStore } from "react";

// Plan mode (the Plan button): while it's on, clicking with a building picked
// lays out a blueprint instead of building, whether or not you can afford it
// now. Blueprints go up by themselves, in order, as the resources come in.
let on = false;
const listeners = new Set<() => void>();

export function setPlanMode(value: boolean) {
  if (on === value) return;
  on = value;
  for (const l of listeners) l();
}

export function usePlanMode() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => void listeners.delete(l);
    },
    () => on,
    () => false,
  );
}
