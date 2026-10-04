import { useSyncExternalStore } from "react";

// Phones (and small windows): narrower than a tablet, or a phone on its side.
// The game's HUD packs itself tighter there (meters in a strip under the top
// bar, one message at a time).
const QUERY = "(max-width: 767px), (max-height: 500px)";

function subscribe(onChange: () => void) {
  const list = window.matchMedia(QUERY);
  list.addEventListener("change", onChange);
  return () => list.removeEventListener("change", onChange);
}

export function useCompact() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
