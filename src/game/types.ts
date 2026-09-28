import type { IconId } from "./sprites";

export type Terrain =
  | "deep"
  | "shallow"
  | "beach"
  | "grass"
  | "forest"
  | "hills"
  | "mountain";

export type Deposit = "berries" | "stone" | "fish" | "clay";

export interface Tile {
  id: number;
  q: number;
  r: number;
  x: number;
  z: number;
  terrain: Terrain;
  height: number;
  island: number;
  deposit: Deposit | null;
  revealed: boolean;
  building: string | null;
  // 0–1: how grown the trees on a forest tile are. New forest starts small.
  growth: number;
  // 0–1: how charred the ground is after a fire. Fades back to normal.
  scorch: number;
}

export interface Raid {
  strength: number;
  fromTile: number;
  targetTile: number;
  startTick: number;
  arriveTick: number;
}

export type MeterKey =
  | "food"
  | "shelter"
  | "happiness"
  | "literacy"
  | "energy"
  | "sustainability";

export type Meters = Record<MeterKey, number>;

export type ResourceKey = "food" | "wood" | "stone" | "knowledge" | "currency";

export type Resources = Record<ResourceKey, number>;

export type Branch =
  | "knowledge"
  | "construction"
  | "energy"
  | "transport"
  | "military"
  | "culture";

export type CultureId =
  | "balanced"
  | "traders"
  | "builders"
  | "scholars"
  | "warriors"
  | "farmers"
  | "mariners";

export type DifficultyId = "easy" | "normal" | "hard";

export interface BuildingDef {
  id: string;
  name: string;
  icon: IconId;
  description: string;
  era: number;
  cost: Partial<Resources>;
  terrain: Terrain[];
  needsWaterNeighbor?: boolean;
  requires?: string;
  housing?: number;
  produces?: Partial<Resources>;
  depositBonus?: { deposit: Deposit; amount: Partial<Resources> };
  reveal: number;
}

export interface TreeNode {
  id: string;
  name: string;
  description: string;
  branch: Branch | "root";
  era: number;
  cost: number;
  requires: string[];
  unlocks?: string[];
  secret?: boolean;
  comingSoon?: boolean;
}

export interface EventChoice {
  label: string;
  effect: {
    resources?: Partial<Resources>;
    population?: number;
    sustainability?: number;
    happiness?: number;
    // Burn the forest near the village: radius in hexes (0 = one tile).
    burn?: number;
    // Ticks to bring the next raid forward by.
    raidSooner?: number;
  };
}

export interface EventCard {
  id: string;
  title: string;
  body: string;
  icon: IconId;
  choices: EventChoice[];
}

export interface GameState {
  version: number;
  phase: "playing" | "gameover";
  // Why the game ended: everyone starved, or everyone got so sad they left.
  lostTo: "famine" | "unrest" | null;
  seed: number;
  culture: CultureId;
  difficulty: DifficultyId;
  tiles: Tile[];
  startTile: number;
  era: number;
  year: number;
  tick: number;
  speed: 0 | 1 | 2 | 4;
  resources: Resources;
  population: number;
  famineTicks: number;
  // Seconds in a row that happiness has been below UNREST_LEVEL.
  unrestTicks: number;
  soldiers: number;
  raid: Raid | null;
  nextRaidTick: number;
  meters: Meters;
  modifiers: { sustainability: number; happiness: number };
  researched: string[];
  secretsFound: string[];
  flags: { rocket: boolean; scouted: boolean };
  scoutsSent: number;
  dev: boolean;
  tutorialStep: number;
  event: EventCard | null;
  nextEventTick: number;
  log: string[];
}
