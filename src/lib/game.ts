import type { ActionOption, GameState, MeterKey, Meters } from "@/types";

export const METER_KEYS: MeterKey[] = ["education", "energy", "sustainability"];

export const METER_LABELS: Record<MeterKey, string> = {
  education: "Education",
  energy: "Energy",
  sustainability: "Sustainability",
};

export const STARTING_METER_VALUE = 50;
export const WIN_THRESHOLD = 75;
export const MAX_TURNS = 15;

// Every turn, city growth eats into these meters a bit before the player's
// chosen action is applied — this is what forces trade-offs instead of
// letting one good pick coast to the end.
const TURN_DECAY: Meters = {
  education: 2,
  energy: 4,
  sustainability: 3,
};

export const ACTIONS: ActionOption[] = [
  {
    id: "build-school",
    label: "Build a public school",
    description: "Boosts education, costs a bit of energy to run.",
    effects: { education: 12, energy: -4 },
  },
  {
    id: "solar-panels",
    label: "Install solar panels",
    description: "Clean energy generation, good for sustainability too.",
    effects: { energy: 14, sustainability: 5 },
  },
  {
    id: "recycling-program",
    label: "Launch a recycling program",
    description: "Great for sustainability, pulls staff off school duty.",
    effects: { sustainability: 12, education: -2 },
  },
  {
    id: "bike-lanes",
    label: "Build bike lanes",
    description: "Cuts commuter energy use, nudges sustainability up.",
    effects: { sustainability: 8, energy: 2 },
  },
  {
    id: "literacy-classes",
    label: "Fund adult literacy classes",
    description: "Strong education gain, small sustainability trade-off.",
    effects: { education: 10, sustainability: -2 },
  },
  {
    id: "grid-upgrade",
    label: "Upgrade the power grid",
    description: "Big efficiency win, but takes funding from schools.",
    effects: { energy: 10, sustainability: 4, education: -3 },
  },
  {
    id: "community-garden",
    label: "Start a community garden",
    description: "A little bit of everything, no big trade-offs.",
    effects: { sustainability: 6, education: 4, energy: -2 },
  },
  {
    id: "coal-plant",
    label: "Build a coal plant",
    description: "Cheap power fast, but it wrecks sustainability.",
    effects: { energy: 18, sustainability: -14, education: -1 },
  },
];

function clamp(value: number) {
  return Math.max(0, Math.min(100, value));
}

export function createInitialState(): GameState {
  return {
    turn: 1,
    meters: {
      education: STARTING_METER_VALUE,
      energy: STARTING_METER_VALUE,
      sustainability: STARTING_METER_VALUE,
    },
    log: [],
    status: "playing",
  };
}

export function hasWon(meters: Meters) {
  return METER_KEYS.every((key) => meters[key] >= WIN_THRESHOLD);
}

export function hasLost(meters: Meters) {
  return METER_KEYS.some((key) => meters[key] <= 0);
}

export function applyAction(state: GameState, action: ActionOption): GameState {
  if (state.status !== "playing") return state;

  const nextMeters: Meters = { ...state.meters };
  for (const key of METER_KEYS) {
    nextMeters[key] = clamp(
      nextMeters[key] - TURN_DECAY[key] + (action.effects[key] ?? 0),
    );
  }

  let status: GameState["status"] = "playing";
  if (hasLost(nextMeters)) {
    status = "lost";
  } else if (hasWon(nextMeters)) {
    status = "won";
  } else if (state.turn >= MAX_TURNS) {
    status = "lost";
  }

  return {
    turn: state.turn + 1,
    meters: nextMeters,
    log: [...state.log, `Turn ${state.turn}: ${action.label}`],
    status,
  };
}
