import { useEffect, useSyncExternalStore } from "react";

// While a 3D cutscene is on screen, the game's own 3D world stops drawing (it
// is hidden behind the cutscene anyway), so the two never fight for the GPU.
let holds = 0;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

export function useHoldWorld() {
  useEffect(() => {
    holds++;
    notify();
    return () => {
      holds--;
      notify();
    };
  }, []);
}

export function useWorldHeld() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => void listeners.delete(l);
    },
    () => holds > 0,
    () => false,
  );
}
