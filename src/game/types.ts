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
  icon: string;
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
  };
}

export interface EventCard {
  id: string;
  title: string;
  body: string;
  icon: string;
  choices: EventChoice[];
}

export interface GameState {
  version: number;
  phase: "playing" | "gameover";
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
  meters: Meters;
  modifiers: { sustainability: number; happiness: number };
  researched: string[];
  secretsFound: string[];
  flags: { rocket: boolean; scouted: boolean };
  tutorialStep: number;
  event: EventCard | null;
  nextEventTick: number;
  log: string[];
}
