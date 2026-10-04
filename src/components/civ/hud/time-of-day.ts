// The time of day the sky is showing (world/sky.tsx writes it every frame), and
// a way for the dev panel to jump to another. Kept apart from the 3D code so the
// dev panel doesn't load it.
export const dayClock = {
  // Added on top of the game clock (dev jumps).
  offset: 0,
  // Drawn this frame: 0 midnight, 0.25 sunrise, 0.5 noon, 0.75 sunset.
  t: 0.27,
};

// Dev: jump to a time of day (0–1) from wherever the clock is now.
export function setTimeOfDay(t: number) {
  dayClock.offset = (((dayClock.offset + t - dayClock.t) % 1) + 1) % 1;
}
