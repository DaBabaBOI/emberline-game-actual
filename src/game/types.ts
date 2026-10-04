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
  | "mountain"
  // Fresh water running from the hills to the sea (the home island has one).
  | "river";

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
  // 0–1: how worn out the building on this tile is (Hard only; 1 = broken).
  worn?: number;
  // 0–1: cracks from an earthquake, and rubble from a landslide. Both fade.
  cracked?: number;
  rubble?: number;
}

export type RaidKind = "band" | "party" | "fire";
// The two neighbouring kingdoms of the Medieval era, and the landmark that
// takes a town into it.
export type KingdomId = "steppe" | "reach";
export type LandmarkId = "library" | "cathedral" | "harbour";
export type DisasterKind = "storm" | "flood" | "earthquake" | "landslide";
export type RaidResponse = "fight" | "hide" | "tribute";

export interface Raid {
  strength: number;
  // What kind of raiders (older saves: a war party), and how the player answered.
  kind?: RaidKind;
  response?: RaidResponse;
  // The fight began (the raiders arrived and the player chose to fight).
  fightStart?: number;
  fromTile: number;
  targetTile: number;
  // Where the warriors march out to meet them.
  meetTile?: number;
  // An army sent by a hostile kingdom (Medieval era).
  kingdom?: KingdomId;
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
  // `accident`: people dropped into the sea or lost in the fog (missing in older saves).
  deaths: { famine: number; disease: number; fire: number; battle: number; accident?: number; disaster?: number; plague?: number };
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

export type DifficultyId = "first" | "easy" | "normal" | "hard";

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
  // Must touch the river (fresh water), not just the sea.
  needsRiver?: boolean;
  // Extra ground it may go on when it touches the river (a Fishing Spot on the bank).
  riverTerrain?: Terrain[];
  requires?: string;
  // A landmark (see LANDMARKS): built in stages, one of each.
  landmark?: boolean;
  // Only one of these can stand at a time.
  unique?: boolean;
  // Can be built on an overseas outpost island (Medieval era).
  overseas?: boolean;
  housing?: number;
  produces?: Partial<Resources>;
  depositBonus?: { deposit: Deposit; amount: Partial<Resources> };
  // No longer used: placing a building never reveals land (scouts do). Optional
  // only so older building data still type-checks; don't add it to new buildings.
  reveal?: number;
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
  | "raidsWon"
  | "caravans"
  | "disasters"
  | "landslides"
  | "gifts"
  | "ships"
  | "canoes";

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
  resource?: "food" | "currency" | "knowledge";
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
    // How each kingdom feels about it (Medieval era).
    mood?: Partial<Record<KingdomId, number>>;
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
  lostTo: "famine" | "unrest" | "conquest" | "collapse" | "behind" | "plague" | null;
  seed: number;
  culture: CultureId;
  difficulty: DifficultyId;
  // The Roman legion on its way (seen by scouts), and whether it has been fought.
  legion?: { size: number; arriveTick: number } | null;
  legionDone?: boolean;
  // When the legion was beaten (tick and year): the Ancient era's clock runs from then.
  legionBeatenTick?: number;
  legionBeatenYear?: number;
  // The great drought that ends the Classical era: when the elders warned of it,
  // when it starts and when the rains come back. Done once it is over.
  drought?: { warnTick: number; startTick: number; endTick: number } | null;
  droughtDone?: boolean;
  // The landmark chosen after the drought: how many of its three stages have
  // been paid for, where it stands, and when the masons finish the current one.
  landmark?: { kind: LandmarkId; stage: number; tile?: number; readyTick: number } | null;
  // Medieval era: how each neighbouring kingdom feels about us (-100 to 100),
  // whether we have a treaty, and when we last sent a gift.
  kingdoms?: Record<KingdomId, { mood: number; treaty: boolean; giftTick?: number }>;
  // Ships out exploring or trading (from a Shipyard), and the islands found
  // overseas where we may build a few things.
  ships?: { start: number; back: number }[];
  // Canoes out: exploring for the Southern Isles, or fishing the open sea.
  canoes?: { start: number; back: number; kind: "explore" | "fish" }[];
  outposts?: number[];
  // We raided a kingdom: its revenge army lands by `tick`. And when we last
  // raided (our warriors need time before the next).
  revenge?: { kingdom: KingdomId; tick: number } | null;
  raidedTick?: number;
  // The Black Death: warned of, arriving by ship, and over. Whether the harbour
  // was closed (and when), and how many it has killed.
  plague?: { warnTick: number; startTick: number; endTick: number; closed: boolean; closedTick?: number; deaths: number } | null;
  plagueDone?: boolean;
  // The discovery scene on screen (an advancement or secret just found), if any.
  cutscene?: string | null;
  // A natural disaster: warned of at warnTick, strikes at startTick, over at
  // endTick. `tiles` are where it hits (flooded tiles, the quake's centre, the slope).
  disaster?: { kind: DisasterKind; warnTick: number; startTick: number; endTick: number; tiles: number[] } | null;
  nextDisasterTick?: number;
  // Fields a flood left rich silt on, until this tick.
  silt?: Record<number, number>;
  // Caravans out trading with the Silk Steppe: when each left and when it's back.
  caravans?: { start: number; back: number }[];
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
  // When the current era's clock started (the end of the tutorial, or entering the era).
  eraStartTick?: number;
  // People picked up and dropped: who is helping at which building (until tick),
  // and who wandered into the fog and when they come back.
  helpers?: Record<number, number>;
  inFog?: { name: string; back: number }[];
  // Happiness lost to grief: people the player dropped into a fire or the sea
  // (GRIEF in content.ts). Fades every tick. Missing in older saves.
  grief?: number;
  // Scouts out exploring: the tile they head for, and the tick they come back.
  scouting?: { tile: number; back: number };
  // Unrest that may turn into a rebellion (REBELLION in content.ts): brewing
  // until riseTick, then risen (rebels on the map) until crushed, paid or sackTick.
  rebellion?: { stage: "brewing" | "risen"; riseTick: number; rebels: number; tile: number; sackTick: number } | null;
  // No new rebellion before this tick.
  rebellionCalm?: number;
  // Population control: the tribe stops growing at this many people (null or
  // missing: it grows freely).
  popLimit?: number | null;
  // Chief XP (only goes up) and level (missing in older saves: 0 and 1).
  xp?: number;
  chiefLevel?: number;
  // When the next small moment happens (missing in older saves).
  nextMomentTick?: number;
  lastMoment?: string;
  // The last home lost (burned, wrecked, broken down) and when, so the
  // "no roof" warning can say what happened.
  homeLost?: { name: string; tick: number } | null;
  // The last small moment and where it happened, so the map can show it.
  moment?: { id: string; tick: number; tile: number } | null;
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
  // Campfires whose keeper the player sent away (tile ids). Every other
  // campfire has someone who adds wood when it burns out.
  untended?: number[];
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
  // Raids seen so far (the first is always a small band), and a dev-chosen next kind.
  raidsSeen?: number;
  devNextRaid?: RaidKind;
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
