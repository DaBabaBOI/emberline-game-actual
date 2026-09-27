import type { ActionOption, GameState, MeterKey, Meters } from "@/types";

export const METER_KEYS: MeterKey[] = [
  "education",
  "energy",
  "sustainability",
  "currency",
];

export const METER_LABELS: Record<MeterKey, string> = {
  education: "Education",
  energy: "Energy",
  sustainability: "Sustainability",
  currency: "Currency",
};

export const METER_COLORS: Record<MeterKey, { bar: string; text: string }> = {
  education: { bar: "bg-sky-500", text: "text-sky-600" },
  energy: { bar: "bg-amber-500", text: "text-amber-600" },
  sustainability: { bar: "bg-emerald-500", text: "text-emerald-600" },
  currency: { bar: "bg-fuchsia-500", text: "text-fuchsia-600" },
};

export const METER_ICONS: Record<MeterKey, string> = {
  education: "🎓",
  energy: "⚡",
  sustainability: "🌿",
  currency: "💰",
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
  currency: 3,
};

export const ACTIONS: ActionOption[] = [
  {
    id: "build-school",
    label: "Build a public school",
    description: "Boosts education, costs a bit of energy and money.",
    icon: "🏫",
    color: "bg-sky-500",
    effects: { education: 12, energy: -4, currency: -8 },
  },
  {
    id: "solar-panels",
    label: "Install solar panels",
    description: "Clean energy generation, good for sustainability too.",
    icon: "☀️",
    color: "bg-amber-400",
    effects: { energy: 14, sustainability: 5, currency: -10 },
  },
  {
    id: "recycling-program",
    label: "Launch a recycling program",
    description: "Great for sustainability and turns a small profit.",
    icon: "♻️",
    color: "bg-emerald-500",
    effects: { sustainability: 12, education: -2, currency: 6 },
  },
  {
    id: "bike-lanes",
    label: "Build bike lanes",
    description: "Cuts commuter energy use, nudges sustainability up.",
    icon: "🚲",
    color: "bg-teal-500",
    effects: { sustainability: 8, energy: 2, currency: -5 },
  },
  {
    id: "literacy-classes",
    label: "Fund adult literacy classes",
    description: "Strong education gain, small sustainability trade-off.",
    icon: "📚",
    color: "bg-indigo-500",
    effects: { education: 10, sustainability: -2, currency: -6 },
  },
  {
    id: "grid-upgrade",
    label: "Upgrade the power grid",
    description: "Big efficiency win, but expensive and takes funding from schools.",
    icon: "🔌",
    color: "bg-yellow-500",
    effects: { energy: 10, sustainability: 4, education: -3, currency: -12 },
  },
  {
    id: "community-garden",
    label: "Start a community garden",
    description: "A little bit of everything, sells produce for extra cash.",
    icon: "🌱",
    color: "bg-lime-500",
    effects: { sustainability: 6, education: 4, energy: -2, currency: 2 },
  },
  {
    id: "coal-plant",
    label: "Build a coal plant",
    description: "Cheap and profitable, but it wrecks sustainability.",
    icon: "🏭",
    color: "bg-stone-500",
    effects: { energy: 18, sustainability: -14, education: -1, currency: 15 },
  },
];

const ACTIONS_BY_ID: Record<string, ActionOption> = Object.fromEntries(
  ACTIONS.map((action) => [action.id, action]),
);

export function actionById(id: string): ActionOption | undefined {
  return ACTIONS_BY_ID[id];
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, value));
}

// Shared by solo and multiplayer: decay + the chosen action's effects,
// clamped to 0-100.
export function nextMeters(meters: Meters, action: ActionOption): Meters {
  const result: Meters = { ...meters };
  for (const key of METER_KEYS) {
    result[key] = clamp(
      result[key] - TURN_DECAY[key] + (action.effects[key] ?? 0),
    );
  }
  return result;
}

export function statusAfterTurn(
  meters: Meters,
  turnJustPlayed: number,
): "playing" | "won" | "lost" {
  if (hasLost(meters)) return "lost";
  if (hasWon(meters)) return "won";
  if (turnJustPlayed >= MAX_TURNS) return "lost";
  return "playing";
}

export function createInitialState(): GameState {
  return {
    turn: 1,
    meters: {
      education: STARTING_METER_VALUE,
      energy: STARTING_METER_VALUE,
      sustainability: STARTING_METER_VALUE,
      currency: STARTING_METER_VALUE,
    },
    log: [],
    builds: [],
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

  const meters = nextMeters(state.meters, action);
  const status = statusAfterTurn(meters, state.turn);

  return {
    turn: state.turn + 1,
    meters,
    log: [...state.log, `Turn ${state.turn}: ${action.label}`],
    builds: [...state.builds, action.id],
    status,
  };
}
