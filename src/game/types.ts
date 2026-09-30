import type { IconId } from "./sprites";

export type Terrain =
  | "deep"
  | "shallow"
  | "beach"
  | "grass"
  // Dry grassland: fine to build on, too dry to farm.
  | "steppe"
  // Wet lowland with reeds: only gatherers can work it.
  | "marsh"
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
  // 0–1: how much of the hill a quarry has cut away. Never grows back.
  dug?: number;
}

export interface Raid {
  strength: number;
  fromTile: number;
  targetTile: number;
  // Where the warriors march out to meet them.
  meetTile?: number;
  // The Roman legion: `legion` legionaries, each worth two warriors.
  roman?: boolean;
  legion?: number;
  startTick: number;
  arriveTick: number;
}

export interface Battle {
  tick: number;
  tile: number;
  fromTile: number;
  warriors: number;
  raiders: number;
  warriorsLost: number;
  raidersLost: number;
  // True when the village held.
  won: boolean;
  roman?: boolean;
}

// Running totals for the end-of-era debrief.
export interface Stats {
  peakPopulation: number;
  built: number;
  raidsWon: number;
  raidsLost: number;
  // Seconds (ticks) the land spent below the best-ending Sustainability.
  lowLandTicks: number;
  deaths: { famine: number; disease: number; fire: number; battle: number };
}

// What the debrief shows: frozen when the era ends (or the game does).
export interface Debrief {
  kind: "era" | "loss" | "final";
  era: number;
  tick: number;
  year: number;
  meters: Meters;
  forestLeft: number;
  stats: Stats;
  researched: number;
  planted: number;
  lessons: string[];
  // "lost": the people starved, left or were conquered. Never a good ending,
  // however healthy the land is.
  tier: "thriving" | "costly" | "stripped" | "lost";
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
  // The trade-off, shown on the card and when placing: what you get, what the land pays.
  gain: string;
  landCost: string;
  // 0–3: how hard it is on the land (shown as red leaves).
  landImpact: 0 | 1 | 2 | 3;
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

// Running counts used by advancement goals (e.g. seconds a fire has burned).
export type TallyKey =
  | "fireLit"
  | "wood"
  | "stone"
  | "rotted"
  | "relights"
  | "hunts"
  | "trained"
  | "scouts"
  | "planted"
  | "raidsWon";

// One thing to do before an advancement can be researched.
export interface Goal {
  label: string;
  // tally: do something N more times once reachable; have: own N of a building;
  // population: have N people; stored: hold N of a resource at once;
  // berryCamp: a gatherer's camp on berry bushes.
  kind: "tally" | "have" | "population" | "stored" | "berryCamp";
  amount: number;
  key?: TallyKey;
  building?: string;
  resource?: "food" | "currency";
}

// What Elder Ama walks you through right after an advancement: place a building
// (with the pointing hand), or just an explanation.
export interface AfterStep {
  text: string;
  build?: string;
  // Give a warrior a spear (Hunting Spears).
  upgrade?: boolean;
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
    // Cut down this many of the biggest forest tiles near the village.
    clearForest?: number;
    // Protect this many of the oldest forest tiles near the village for good.
    protectForest?: number;
    // Chance (0–1) that sickness breaks out because of this choice.
    sickness?: number;
    // Something that may or may not happen: rolled when the choice is made.
    gamble?: {
      chance: number;
      resources?: Partial<Resources>;
      happiness?: number;
      burn?: number;
      message: string;
      safeMessage: string;
    };
  };
}

export interface EventCard {
  id: string;
  title: string;
  body: string;
  icon: IconId;
  choices: EventChoice[];
  // A short, modest real-world connection shown under the card.
  realWorld: string;
  // The earliest era this card can appear in (default: the Stone Age).
  era?: number;
}

export interface GameState {
  version: number;
  phase: "playing" | "gameover";
  // Why the game ended: everyone starved, or everyone got so sad they left.
  lostTo: "famine" | "unrest" | "conquest" | "collapse" | null;
  seed: number;
  culture: CultureId;
  difficulty: DifficultyId;
  // The Roman legion on its way (seen by scouts), and whether it has been fought.
  legion?: { size: number; arriveTick: number } | null;
  legionDone?: boolean;
  // Running totals for the debrief, and the debrief on screen (if any).
  stats?: Stats;
  debrief?: Debrief | null;
  // The name the player gave their people.
  nation?: string;
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
  // Famine emergency measures (missing in older saves).
  forageReadyAt?: number;
  seedEatenUntil?: number;
  // Ticks spent with Sustainability below COLLAPSE.level (missing in older saves).
  collapseTicks?: number;
  // How worn out the land is: counts up while Sustainability is below LAND.strainLevel.
  strainTicks: number;
  // How many people are sick right now, and how many the current outbreak has killed.
  sick?: number;
  // Until this tick, no disease strikes unless the player invites it (early calm).
  calmUntil?: number;
  // Recently recovered people who can't catch it again for a while.
  immune?: number;
  outbreakDeaths?: number;
  // Seconds of fuel left in each campfire, by tile id. 0 or missing = out.
  fires?: Record<number, number>;
  // Elder lessons already shown, the one on screen, and when it appeared.
  lessonsSeen?: string[];
  lesson?: string | null;
  lessonTick?: number;
  // Running counts for advancement goals, and each goal's count when it became reachable.
  tally?: Partial<Record<TallyKey, number>>;
  goalStart?: Record<string, Partial<Record<TallyKey, number>>>;
  // The guided step after an advancement: which one, and the building count when it began.
  coach?: { node: string; from: number } | null;
  // How many warriors carry spears (fight 1.5x). Missing in older saves.
  spearmen?: number;
  // Dev mode: advancement goals count as met.
  devGoals?: boolean;
  // When the last big moment (event, raid, lesson, outbreak) began, for QUIET_GAP.
  lastBigTick?: number;
  // Knowledge milestones already reached (each pays out once).
  milestones?: string[];
  // Advancements Elder Ama has already said we can afford (so she says it once).
  knowledgeNotified?: string[];
  // Saplings planted so far.
  planted?: number;
  // The last event card shown, so it isn't repeated right away.
  lastEvent?: string;
  // Forest tiles the tribe has chosen to protect: woodcutters never cut them.
  protectedTiles?: number[];
  // How each woodcutter works, by tile id: clear-cut (default) or selective.
  logging?: Record<number, "clear" | "selective">;
  // Sustainability sampled every 5 ticks, oldest first (for the trend arrow).
  sustainTrail?: number[];
  // The last fight with raiders, so the 3D scene can play it out.
  battle?: Battle | null;
  // People caught in the last wildfire: where they fell and when (for the 3D scene).
  fireVictims?: { tile: number; tick: number }[];
  // Total forest growth near the village when the game began (100% Sustainability).
  forestBaseline: number;
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
