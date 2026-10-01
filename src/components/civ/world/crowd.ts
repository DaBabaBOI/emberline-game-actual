// How the people on the map stand for the population (no 3D code here, so the
// HUD can use it too).

// People on the map stand for groups, not individuals: never more than
// MAX_FIGURES at once, counting the one hunter who can be out in the woods.
export const MAX_FIGURES = 20;

export function figureCounts(population: number, soldiers: number) {
  const budget = MAX_FIGURES - 1;
  let villagers = Math.max(2, Math.ceil(population / 3));
  // Warriors never take more than 40% of the figures, so the village never looks
  // like it's only guards.
  let warriors = soldiers > 0 ? Math.min(Math.ceil(soldiers / 2), Math.floor(budget * 0.4)) : 0;
  const total = villagers + warriors;
  if (total > budget) {
    warriors = soldiers > 0 ? Math.max(1, Math.round((budget * warriors) / total)) : 0;
    villagers = budget - warriors;
  }
  return { villagers, warriors };
}

// Which crowd to light up in yellow (hovering the population or warriors
// counter in the top bar), so the player can see who the numbers are.
export const highlight: { group: "people" | "warriors" | null } = { group: null };
