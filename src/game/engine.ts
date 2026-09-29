import {
  AFTER_TUTORIAL_RESERVE,
  ROMAN_LEGION,
  FORESTER_GROWTH,
  FORESTER_REACH,
  GRANARY_KEEPS,
  SMITHY_CHARCOAL,
  QUARRY_DUST,
  GATHERING,
  WALL_DEFENSE,
  MIN_SUSTAINABILITY_FOR_BEST_ENDING,
  NEXT_ERA_POPULATION,
  GROWTH_PRESSURE,
  DISEASE,
  CAMPFIRE_BURN_TICKS,
  RELIGHT_WOOD,
  LESSONS,
  LESSON_GAP,
  PLANT_COST,
  SELECTIVE_FLOOR,
  TICK_SECONDS,
  FIRE_RISK,
  LAND,
  GRACE_AFTER_TUTORIAL,
  BUILDINGS,
  BUILDINGS_BY_ID,
  DIFFICULTIES,
  ERAS,
  EVENTS,
  TRAIN_COST,
  TREE,
  TREE_BY_ID,
  TUTORIAL,
  TUTORIAL_FAREWELL,
  WARRIORS_PER_CAMP,
} from "./content";
import { diseaseName, isCalm, maybeOutbreak, sickShare, stepDisease } from "./disease";
import { hexDistance } from "./hex";
import { generateMap, isLand, revealAround, terrainHeight } from "./map";
import { mulberry32 } from "./noise";
import type { IconId } from "./sprites";
import type {
  Debrief,
  Stats,
  BuildingDef,
  CultureId,
  DifficultyId,
  GameState,
  Meters,
  Resources,
  Tile,
} from "./types";

export const SAVE_VERSION = 6;
const BASE_HOUSING = 8;
// Food eaten per second by each person and each warrior.
export const FOOD_PER_PERSON = 0.2; // 1 food every 5 seconds
export const FOOD_PER_WARRIOR = 0.15;
// Food from each animal the hunters bring back.
export const HUNT_FOOD = 4;

export type Action =
  | { type: "tick" }
  | { type: "setSpeed"; speed: GameState["speed"] }
  | { type: "place"; tileId: number; buildingId: string }
  | { type: "scout" }
  | { type: "research"; nodeId: string }
  | { type: "resolveEvent"; choice: number }
  | { type: "skipTutorial" }
  | { type: "train" }
  | { type: "hunt"; animal: string }
  | { type: "demolish"; tileId: number }
  | { type: "devGrant" }
  | { type: "devPeople" }
  | { type: "devFiresOut" }
  | { type: "devOutbreak" }
  | { type: "devRaid" }
  | { type: "devRomans" }
  | { type: "dismissDebrief" }
  | { type: "advanceEra" }
  | { type: "enterEra" }
  | { type: "devFinishEra" }
  | { type: "dismissLesson" }
  | { type: "devLesson" }
  | { type: "setLogging"; tileId: number; mode: "clear" | "selective" }
  | { type: "plant"; tileId: number }
  | { type: "upgrade"; tileId: number }
  | { type: "relight"; tileId: number }
  | { type: "devEra"; era: number }
  | { type: "devReveal" }
  | { type: "devEvent"; id: string };

export interface NewGameOptions {
  dev?: boolean;
  startEra?: number;
  nation?: string;
}

export const DEFAULT_NATION = "The Emberfolk";

// Tidy a player-typed name: trimmed, single-spaced, at most 24 characters.
export function cleanNation(name: string | undefined) {
  const clean = (name ?? "").replace(/\s+/g, " ").trim().slice(0, 24);
  return clean || DEFAULT_NATION;
}

export function newGame(
  culture: CultureId,
  difficulty: DifficultyId,
  options: NewGameOptions = {},
): GameState {
  const seed = Math.floor(Math.random() * 1e9);
  const { tiles, startTile } = generateMap(seed);
  const state: GameState = {
    version: SAVE_VERSION,
    phase: "playing",
    lostTo: null,
    seed,
    culture,
    difficulty,
    nation: cleanNation(options.nation),
    tiles,
    startTile,
    era: 0,
    year: ERAS[0].startYear,
    tick: 0,
    speed: 1,
    resources: { food: 60, wood: 35, stone: 0, knowledge: 0, currency: 0 },
    population: 8,
    famineTicks: 0,
    unrestTicks: 0,
    strainTicks: 0,
    forestBaseline: 0,
    soldiers: 0,
    raid: null,
    nextRaidTick: 110,
    meters: { food: 60, shelter: 70, happiness: 60, literacy: 0, energy: 0, sustainability: 100 },
    modifiers: { sustainability: 0, happiness: 0 },
    researched: ["fire"],
    secretsFound: [],
    flags: { rocket: false, scouted: false },
    scoutsSent: 0,
    dev: Boolean(options.dev),
    tutorialStep: 0,
    event: null,
    nextEventTick: 90,
    log: [`${cleanNation(options.nation)} gather on the shores of Westmarch.`],
  };
  state.forestBaseline = forestGrowthNearHome(state);
  const budget = tutorialBudget(state);
  for (const [k, v] of Object.entries(AFTER_TUTORIAL_RESERVE)) budget[k as keyof Resources] += v ?? 0;
  state.resources = budget;
  const started = options.dev ? applyDevStart(state, options.startEra ?? 0) : state;
  return { ...started, meters: computeMeters(started) };
}

// Dev mode: skip ahead for testing. Lots of resources, the map revealed, and
// every playable advancement of the earlier eras already researched.
function applyDevStart(state: GameState, era: number): GameState {
  const researched = TREE.filter((n) => !n.comingSoon && !n.secret && n.era < Math.max(1, era)).map(
    (n) => n.id,
  );
  giveStartingWoodcutter(state.tiles, state.tiles[state.startTile]);
  // A lit campfire too, so testers aren't racing unrest from the first second.
  const firePit = giveStartingCampfire(state.tiles, state.tiles[state.startTile]);
  return {
    ...devJumpToEra(state, era),
    fires: firePit !== null ? { [firePit]: 9999 } : {},
    tutorialStep: TUTORIAL.length,
    researched: Array.from(new Set([...state.researched, ...researched])),
    resources: { food: 999, wood: 999, stone: 999, knowledge: 999, currency: 999 },
    population: 8,
    log: [`Dev mode: started in the ${ERAS[era].name}.`, ...state.log],
  };
}

function devJumpToEra(state: GameState, era: number): GameState {
  return { ...state, era, year: ERAS[era].startYear };
}

// A wildfire burns the forest nearest the village: trees are lost, the ground
// is charred (it heals over time) and buildings caught in it are destroyed.
// The last woodcutter always survives so the player can't be locked out.
function burnForest(
  state: GameState,
  radius: number,
): { tiles: Tile[]; message: string; deaths: number; victims: number[] } {
  // Fires start in the trees next to a campfire when there is one, else near the village.
  const campfires = litFires(state);
  const from = campfires.length
    ? campfires[Math.floor(mulberry32(state.seed + state.tick * 19)() * campfires.length)]
    : state.tiles[state.startTile];
  const forests = state.tiles
    .filter((t) => t.revealed && t.terrain === "forest" && t.growth > 0.2 && !t.building)
    .sort((a, b) => hexDistance(a, from) - hexDistance(b, from));
  const center = forests[Math.floor(mulberry32(state.seed + state.tick * 17)() * Math.min(3, forests.length))];
  if (!center) return { tiles: state.tiles, message: "The fire burned out on its own.", deaths: 0, victims: [] };

  let woodcuttersLeft = countBuildings(state).woodcutter ?? 0;
  const lost: string[] = [];
  let burntForest = 0;
  const tiles = state.tiles.map((t) => {
    if (hexDistance(t, center) > radius || !isLand(t.terrain) || t.terrain === "mountain") return t;
    let building = t.building;
    if (building && !(building === "woodcutter" && woodcuttersLeft <= 1)) {
      if (building === "woodcutter") woodcuttersLeft--;
      lost.push(BUILDINGS_BY_ID[building].name);
      building = null;
    }
    if (t.terrain === "forest") burntForest++;
    return {
      ...t,
      building,
      scorch: 1,
      growth: t.terrain === "forest" ? 0.02 : t.growth,
    };
  });
  // People working near the burning land get caught: roughly one for every
  // burnt tile that sits close to a building.
  const built = state.tiles.filter((t) => t.building);
  const nearPeople = tiles
    .filter((t) => t.scorch === 1 && hexDistance(t, center) <= radius && built.some((b) => hexDistance(b, t) <= 2))
    .sort((a, b) => hexDistance(a, center) - hexDistance(b, center));
  const deaths =
    radius === 0 || nearPeople.length === 0
      ? 0
      : Math.max(
          0,
          Math.min(
            Math.floor(state.population) - 1,
            Math.ceil(state.population * FIRE_DEATH_SHARE),
            Math.max(1, Math.round(nearPeople.length * 0.4)),
          ),
        );
  const message =
    radius === 0
      ? "The fire was stopped at the forest's edge."
      : `The fire burned ${burntForest} forest tile${burntForest === 1 ? "" : "s"}` +
        (lost.length ? ` and destroyed: ${lost.join(", ")}` : "") +
        (deaths ? `. ${deaths} ${deaths === 1 ? "person" : "people"} died in the flames.` : ".");
  const victims = Array.from({ length: Math.min(deaths, 6) }, (_, i) => nearPeople[i % nearPeople.length].id);
  return { tiles, message, deaths, victims };
}

// Some events should be rarer than others (weights are relative).
// ---- The land -------------------------------------------------------------

function forestGrowthNearHome(state: GameState) {
  const home = state.tiles[state.startTile];
  let total = 0;
  for (const t of state.tiles) {
    if (t.terrain === "forest" && !t.building && hexDistance(t, home) <= LAND.radius) total += t.growth;
  }
  return total;
}

// 0–1: how much of the forest around the village is still standing.
export function forestCover(state: GameState) {
  if (state.forestBaseline <= 0) return 1;
  return Math.min(1, forestGrowthNearHome(state) / state.forestBaseline);
}

// 0–1: how worn out the land is after staying unsustainable for a while.
export function landStrain(state: GameState) {
  return Math.min(1, state.strainTicks / LAND.strainTicks);
}

const treesNear = (state: GameState, tile: Tile) =>
  state.tiles.filter(
    (t) =>
      t.terrain === "forest" &&
      !t.building &&
      t.growth > 0.05 &&
      hexDistance(t, tile) <= LAND.woodcutterReach &&
      !state.protectedTiles?.includes(t.id),
  );

// The biggest forest tiles near the village (for grove events).
function oldestForest(state: GameState, n: number) {
  const home = state.tiles[state.startTile];
  return state.tiles
    .filter(
      (t) =>
        t.terrain === "forest" &&
        !t.building &&
        t.revealed &&
        hexDistance(t, home) <= LAND.radius &&
        !state.protectedTiles?.includes(t.id),
    )
    .sort((a, b) => b.growth - a.growth || hexDistance(a, home) - hexDistance(b, home))
    .slice(0, n);
}

// 0–1: a woodcutter with no trees left nearby makes no wood.
export function loggingMode(state: GameState, tile: Tile) {
  return state.logging?.[tile.id] ?? "clear";
}

// 0–1: how much of its full output a woodcutter makes. Clear-cutting takes every
// tree; selective logging only thins mature trees, for half the wood.
export function woodcutterYield(state: GameState, tile: Tile) {
  if (loggingMode(state, tile) === "selective") {
    const mature = treesNear(state, tile).reduce((sum, t) => sum + Math.max(0, t.growth - SELECTIVE_FLOOR), 0);
    return Math.min(1, mature) * 0.5;
  }
  const standing = treesNear(state, tile).reduce((sum, t) => sum + t.growth, 0);
  return Math.min(1, standing / 2);
}

export const PLANT_TOOL = "__plant";

// What a building can be upgraded into in the current era (e.g. Hut → House).
export function upgradeFor(state: GameState, buildingId: string): BuildingDef | null {
  const next = buildingId === "hut" ? BUILDINGS_BY_ID.house : null;
  return next && isUnlocked(state, next) ? next : null;
}

// Where saplings can go: open grass or steppe, or forest that has been thinned.
export function plantError(state: GameState, tile: Tile): string | null {
  if (tutorialLocked(state, "plant")) return "Unlocks after the tutorial";
  if (!tile.revealed) return "Unexplored land";
  if (tile.building) return "Something is built here";
  if (tile.terrain === "forest" && tile.growth >= 0.6) return "The forest here is already healthy";
  if (tile.terrain !== "grass" && tile.terrain !== "steppe" && tile.terrain !== "forest") return "Trees won't grow here";
  if (!canAfford(state, PLANT_COST)) return "Not enough food";
  return null;
}

// How likely a wildfire is: every campfire close to trees adds risk.
export function fireRisk(state: GameState) {
  let risk = 0;
  for (const fire of litFires(state)) {
    for (const t of state.tiles) {
      if (t.terrain !== "forest" || t.growth < 0.3) continue;
      const d = hexDistance(t, fire);
      if (d === 1) risk += 1;
      else if (d === 2) risk += 0.5;
    }
  }
  return risk;
}

function pickEvent(roll: number, state: GameState) {
  const wildfire = Math.min(FIRE_RISK.max, FIRE_RISK.base + FIRE_RISK.perForestTile * fireRisk(state));
  // Never the same card twice in a row.
  const weights = EVENTS.map((e) =>
    e.id === state.lastEvent || (e.era ?? 0) > state.era ? 0 : e.id === "wildfire" ? wildfire : 1,
  );
  let r = roll * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < EVENTS.length; i++) {
    r -= weights[i];
    if (r <= 0) return EVENTS[i];
  }
  return EVENTS[EVENTS.length - 1];
}

// Scouting is meant to be hard-won: each trip costs a lot more than the last.
// Every Transport advancement makes it 20% cheaper.
export function scoutCost(state: GameState): Partial<Resources> {
  const n = state.scoutsSent;
  const transport = state.researched.filter((id) => TREE_BY_ID[id]?.branch === "transport").length;
  const discount = Math.pow(0.8, transport);
  return {
    food: Math.round((25 + n * 20) * discount),
    wood: Math.round((10 + n * 10) * discount),
  };
}

export function countBuildings(state: GameState) {
  const counts: Record<string, number> = {};
  for (const t of state.tiles) if (t.building) counts[t.building] = (counts[t.building] ?? 0) + 1;
  return counts;
}

export function buildingCost(state: GameState, def: BuildingDef): Partial<Resources> {
  if (state.culture !== "builders") return def.cost;
  return Object.fromEntries(
    Object.entries(def.cost).map(([k, v]) => [k, Math.ceil((v ?? 0) * 0.8)]),
  );
}

export function canAfford(state: GameState, cost: Partial<Resources>) {
  return Object.entries(cost).every(
    ([k, v]) => state.resources[k as keyof Resources] >= (v ?? 0),
  );
}

export function isUnlocked(state: GameState, def: BuildingDef) {
  if (tutorialLocked(state, def.id)) return false;
  return def.era <= state.era && (!def.requires || state.researched.includes(def.requires));
}

export function placementError(state: GameState, tile: Tile, def: BuildingDef): string | null {
  if (state.tutorialStep < TUTORIAL.length && (countBuildings(state)[def.id] ?? 0) >= 1) {
    return "Only one of each during the tutorial";
  }
  if (!tile.revealed) return "Unexplored land";
  if (tile.building) return "Already built here";
  if (!def.terrain.includes(tile.terrain)) return `Needs ${def.terrain.join(" / ")}`;
  if (def.needsWaterNeighbor) {
    const touchesWater = state.tiles.some(
      (t) => !isLand(t.terrain) && hexDistance(t, tile) === 1,
    );
    if (!touchesWater) return "Must touch water";
  }
  if (!canAfford(state, buildingCost(state, def))) return "Not enough resources";
  return null;
}

export function housingCapacity(state: GameState) {
  const counts = countBuildings(state);
  return BUILDINGS.reduce((sum, b) => sum + (b.housing ?? 0) * (counts[b.id] ?? 0), BASE_HOUSING);
}

// The wild only has so much to give. The first gatherer camp gets a full
// camp's food; every extra camp adds only `extraCamp` (25%) of one. Every camp
// makes the same share of that, so this returns each camp's fraction.
export function gathererShare(state: GameState, camps = countBuildings(state).gatherer ?? 0): number {
  if (camps <= 1) return 1;
  return (1 + GATHERING.extraCamp * (camps - 1)) / camps;
}

// What placing another gatherer would do, for the placement card.
export function gatherNote(state: GameState): string | null {
  const camps = countBuildings(state).gatherer ?? 0;
  if (camps === 0) return null;
  const notes = [
    `The wild is already being gathered: this camp adds only ${Math.round(GATHERING.extraCamp * 100)}% of a full camp's food.`,
  ];
  if (camps >= GATHERING.freeCamps)
    notes.push(`One camp too many for the wild: −${GATHERING.sustainPerExtra} Sustainability.`);
  return notes.join(" ");
}

// A food building with a quarry close by: its crops or berries are under dust.
export function dusty(state: GameState, tile: Tile, building = tile.building): boolean {
  if (!building || !QUARRY_DUST.hits.includes(building)) return false;
  return state.tiles.some(
    (t) => t.building === "quarry" && t.id !== tile.id && hexDistance(t, tile) <= QUARRY_DUST.range,
  );
}

// What placing `building` on `tile` would do with dust, for the placement card.
export function dustNote(state: GameState, tile: Tile, building: string): string | null {
  const loss = Math.round(QUARRY_DUST.foodLoss * 100);
  if (building === "quarry") {
    const hit = state.tiles.filter(
      (t) => t.building && QUARRY_DUST.hits.includes(t.building) && hexDistance(t, tile) <= QUARRY_DUST.range,
    ).length;
    return hit ? `Dust would cut the food of ${hit} building${hit === 1 ? "" : "s"} nearby by ${loss}%.` : null;
  }
  return dusty(state, tile, building) ? `A quarry nearby: this would make ${loss}% less food.` : null;
}

export function production(state: GameState): Resources {
  const out: Resources = { food: 0, wood: 0, stone: 0, knowledge: 0.05, currency: 0 };
  for (const tile of state.tiles) {
    if (!tile.building) continue;
    const def = BUILDINGS_BY_ID[tile.building];
    const factor =
      tile.building === "woodcutter"
        ? woodcutterYield(state, tile)
        : tile.building === "farm" && state.tiles.some((t) => t.building === "canal" && hexDistance(t, tile) === 1)
          ? 1.5
          : 1;
    const dust = dusty(state, tile) ? 1 - QUARRY_DUST.foodLoss : 1;
    // Gatherer camps share what the wild can give.
    const share = tile.building === "gatherer" ? gathererShare(state) : 1;
    for (const [k, v] of Object.entries(def.produces ?? {}))
      out[k as keyof Resources] += (v ?? 0) * factor * share * (k === "food" ? dust : 1);
    if (def.depositBonus && tile.deposit === def.depositBonus.deposit) {
      for (const [k, v] of Object.entries(def.depositBonus.amount))
        out[k as keyof Resources] += (v ?? 0) * share;
    }
    if (tile.building === "fishing") {
      const fishNearby = state.tiles.some(
        (t) => t.deposit === "fish" && hexDistance(t, tile) === 1,
      );
      if (fishNearby) out.food += 0.8;
    }
  }
  // Bronze tools: each smithy (up to three) makes every worker 20% better.
  const smithies = countBuildings(state).smithy ?? 0;
  const tools = 1 + 0.2 * Math.min(3, smithies);
  out.food *= tools;
  out.wood *= tools;
  // ...but every smithy burns wood for charcoal, all the time.
  out.wood -= smithies * SMITHY_CHARCOAL;
  // Worn-out land gives smaller harvests.
  out.food *= 1 - 0.4 * landStrain(state);
  // The sick can't work (but they still eat).
  const workforce = 1 - 0.8 * sickShare(state);
  out.food *= workforce;
  out.wood *= workforce;
  const counts = countBuildings(state);
  out.currency += state.population * 0.02;
  out.knowledge += state.meters.literacy * 0.005;

  if (state.researched.includes("spears")) out.food *= 1.15;
  if (state.culture === "farmers") out.food *= 1.25;
  if (state.culture === "mariners") out.food += (counts.fishing ?? 0) * 0.45;
  if (state.culture === "scholars") out.knowledge *= 1.5;
  if (state.culture === "traders") out.currency *= 1.5;
  return out;
}

export function consumption(state: GameState) {
  return (
    (state.population * FOOD_PER_PERSON + state.soldiers * FOOD_PER_WARRIOR) *
    DIFFICULTIES[state.difficulty].consumption
  );
}

// Every game starts with one woodcutter already working, so the player can
// never end up with no wood and no way to get more.
// A wildfire never kills more than this share of the tribe at once.
const FIRE_DEATH_SHARE = 0.25;

// Exactly what the tutorial makes the player buy, so they never have to wait.
export function tutorialBudget(state: GameState): Resources {
  const total: Resources = { food: 0, wood: 0, stone: 0, knowledge: 0, currency: 0 };
  const add = (cost: Partial<Resources>) => {
    for (const [k, v] of Object.entries(cost)) total[k as keyof Resources] += v ?? 0;
  };
  for (const id of TUTORIAL.flatMap((step) => step.buys)) {
    if (id === "scout") add(scoutCost(state));
    else if (id === "train") add(TRAIN_COST);
    else if (BUILDINGS_BY_ID[id]) add(buildingCost(state, BUILDINGS_BY_ID[id]));
    else if (TREE_BY_ID[id]) add({ knowledge: TREE_BY_ID[id].cost });
  }
  return total;
}

// A campfire on the nearest open grass; returns its tile id (or null).
function giveStartingCampfire(tiles: Tile[], home: Tile) {
  const pit = tiles
    .filter((t) => t.revealed && t.terrain === "grass" && !t.building)
    .sort((a, b) => hexDistance(a, home) - hexDistance(b, home))[0];
  if (!pit) return null;
  pit.building = "campfire";
  return pit.id;
}

// Games that skip the tutorial get their woodcutter for free, so wood can never run dry for good.
function giveStartingWoodcutter(tiles: Tile[], home: Tile) {
  const forest = tiles
    .filter((t) => t.terrain === "forest" && t.island === home.island)
    .sort((a, b) => hexDistance(a, home) - hexDistance(b, home))[0];
  if (!forest) return;
  forest.building = "woodcutter";
  revealAround(tiles, forest, 2);
}

export function demolishRefund(def: BuildingDef): Partial<Resources> {
  return Object.fromEntries(
    Object.entries(def.cost).map(([k, v]) => [k, Math.floor((v ?? 0) / 2)]),
  );
}

export function demolishError(state: GameState, tile: Tile): string | null {
  if (!tile.building) return "Nothing to sell";
  if (tile.building === "woodcutter" && (countBuildings(state).woodcutter ?? 0) <= 1) {
    return "You need at least one woodcutter";
  }
  return null;
}

export const DEMOLISH_TOOL = "__demolish";

// During the tutorial only what it has introduced so far can be used.
export function tutorialLocked(state: GameState, id: string) {
  if (state.tutorialStep >= TUTORIAL.length) return false;
  return !TUTORIAL.slice(0, state.tutorialStep + 1).some((step) => step.unlocks.includes(id));
}

export const NO_FIRE_PENALTY = 15;
// Below this happiness the tribe starts to fall apart (see unrestLimit).
export const UNREST_LEVEL = 15;

// Game ticks → real seconds at 1× speed, for text shown to the player.
export function secs(ticks: number) {
  return Math.ceil(ticks * TICK_SECONDS);
}

// A per-tick amount → per real second at 1× speed.
export function perSecond(perTick: number) {
  return perTick / TICK_SECONDS;
}

export interface Warning {
  id: "fire" | "food" | "wood" | "famine" | "unrest" | "land" | "sick";
  icon: IconId;
  text: string;
  // Ticks left on the countdown in the text; "{secs}" in the text is where it goes.
  countdown?: number;
  severe: boolean;
}

export function warnings(state: GameState): Warning[] {
  // During the tutorial Elder Ama explains what to do; warnings would only nag.
  if (state.tutorialStep < TUTORIAL.length) return [];
  const out: Warning[] = [];
  const prod = production(state);
  const netFood = prod.food - consumption(state);
  const famineLimit = DIFFICULTIES[state.difficulty].famineLimit;

  if (state.famineTicks > 0) {
    out.push({
      id: "famine",
      icon: "skull",
      text: "Your people are starving! Famine in {secs}s unless you find food.",
      countdown: Math.max(0, famineLimit - state.famineTicks),
      severe: true,
    });
  } else if (netFood < 0 && state.resources.food / -netFood < 45) {
    out.push({
      id: "food",
      icon: "meat",
      text: "Food is running low: about {secs}s left. Build gatherers or farms.",
      countdown: state.resources.food / -netFood,
      severe: state.resources.food / -netFood < 20,
    });
  }

  if (state.unrestTicks > 0) {
    const unrestLimit = DIFFICULTIES[state.difficulty].unrestLimit;
    out.push({
      id: "unrest",
      icon: "sad",
      text: "Your people are miserable! They will leave in {secs}s unless you cheer them up.",
      countdown: Math.max(0, unrestLimit - state.unrestTicks),
      severe: true,
    });
  }

  if ((state.sick ?? 0) >= 0.5) {
    const n = Math.round(state.sick ?? 0);
    out.push({
      id: "sick",
      icon: "ill",
      text:
        diseaseName(state) === "curse"
          ? `A curse from the gods: ${n} of your people lie with fever and coughing and can't work. The elders have no cure. Research Herbalism.`
          : `${n} people are sick with fever and can't work. Healer's Huts help them recover and stop the spread.`,
      severe: sickShare(state) > 0.2,
    });
  }

  const trend = sustainabilityTrend(state);
  if (trend <= -4 && state.strainTicks === 0) {
    out.push({
      id: "land",
      icon: "leaf",
      text: `The land is getting worse: Sustainability fell ${Math.round(-trend)} in the last minute. Click the leaf meter to see why.`,
      severe: false,
    });
  }

  if (state.strainTicks > 0) {
    out.push({
      id: "land",
      icon: "leaf",
      text:
        landStrain(state) >= 1
          ? "The land is exhausted: forests have stopped growing back and harvests are shrinking. Cut fewer trees."
          : "The land is wearing out. Forests grow back slower and harvests shrink. Cut fewer trees.",
      severe: landStrain(state) > 0.5,
    });
  }

  if (state.resources.wood < 8) {
    out.push({
      id: "wood",
      icon: "log",
      text:
        prod.wood < 0
          ? "Wood is running out and your fires are burning it faster than you cut it."
          : "Wood is low. Wait for your woodcutters before building more.",
      severe: state.resources.wood < 2,
    });
  }

  if (hasLitFire(state) && coldShare(state) > 0.05) {
    const cold = Math.round(coldShare(state) * state.population);
    out.push({
      id: "fire",
      icon: "flame",
      text: `Not enough campfires: ${cold} people are cold and becoming unhappy. Each fire warms ${GROWTH_PRESSURE.peoplePerFire}.`,
      severe: false,
    });
  }

  if (!hasLitFire(state) && coldShare(state) > 0.05) {
    const noCampfire = (countBuildings(state).campfire ?? 0) === 0;
    out.push({
      id: "fire",
      icon: "flame",
      text: noCampfire
        ? `No campfire! Your people are cold (−${NO_FIRE_PENALTY} happiness).`
        : `Your campfire has gone out. Click it to relight it (${RELIGHT_WOOD} wood). Your people are cold (−${NO_FIRE_PENALTY} happiness).`,
      severe: true,
    });
  }
  return out;
}

// A fire only counts if there's wood to keep it burning.
export function hasLitFire(state: GameState) {
  return litFires(state).length > 0;
}

export interface SustainPart {
  label: string;
  value: number;
  hint: string;
}

// Everything that pushes Sustainability up or down, so the player can see
// exactly what their choices are costing the land. computeMeters sums these.
export function sustainabilityBreakdown(state: GameState): SustainPart[] {
  const counts = countBuildings(state);
  const lit = litFires(state).length;
  const cover = forestCover(state);
  const parts: SustainPart[] = [
    {
      label: `Forest standing: ${Math.round(cover * 100)}%`,
      value: -(1 - cover) * 85,
      hint: "Woodcutters fell trees faster than they grow back. Selective logging and replanting help.",
    },
    {
      label: `Smoke from ${lit} fire${lit === 1 ? "" : "s"}`,
      value: -lit * 2,
      hint: "Every fire burns wood and fills the air with smoke.",
    },
    {
      label: `${counts.quarry ?? 0} quarr${counts.quarry === 1 ? "y" : "ies"} scarring the hills`,
      value: -(counts.quarry ?? 0) * 3,
      hint: "Quarries cut away the hillside for good, and their dust smothers nearby crops.",
    },
    {
      label: `${counts.gatherer ?? 0} gatherer camp${counts.gatherer === 1 ? "" : "s"} hunting the wild`,
      value: -Math.max(0, (counts.gatherer ?? 0) - GATHERING.freeCamps) * GATHERING.sustainPerExtra,
      hint: `The wild can feed ${GATHERING.freeCamps} camps. Past that, animals are hunted faster than they can have young, and there are fewer each year.`,
    },
    {
      label: `${counts.farm ?? 0} field${counts.farm === 1 ? "" : "s"} cleared`,
      value: -(counts.farm ?? 0) * 1,
      hint: "Farmland replaces wild land.",
    },
    {
      label: `${counts.pen ?? 0} livestock pen${counts.pen === 1 ? "" : "s"} grazing`,
      value: -(counts.pen ?? 0) * 2,
      hint: "Grazing animals wear down the grass around them.",
    },
    {
      label: `${counts.smithy ?? 0} smith${counts.smithy === 1 ? "y" : "ies"} burning charcoal`,
      value: -(counts.smithy ?? 0) * 4,
      hint: "Smelting bronze burns wood all the time and fills the air with smoke.",
    },
    {
      label: `${counts.canal ?? 0} canal${counts.canal === 1 ? "" : "s"} salting the soil`,
      value: -(counts.canal ?? 0) * 3,
      hint: "Irrigation water leaves salt behind as it dries.",
    },
    {
      label: `${counts.house ?? 0} brick house${counts.house === 1 ? "" : "s"}`,
      value: -(counts.house ?? 0) * 1,
      hint: "Bricks are fired in kilns that burn wood.",
    },
    {
      label: "Recent events",
      value: state.modifiers.sustainability,
      hint: "Fires and choices you made in events. This fades over time.",
    },
  ];
  return parts.filter((p, i) => i === 0 || Math.abs(p.value) >= 0.5);
}

// How much Sustainability changed over roughly the last minute of play.
export function sustainabilityTrend(state: GameState) {
  const trail = state.sustainTrail ?? [];
  if (trail.length < 2) return 0;
  return state.meters.sustainability - trail[0];
}

// Share of the tribe with no fire to warm them (each fire warms peoplePerFire).
export function coldShare(state: GameState) {
  const pens = state.researched.includes("hide-clothing") ? countBuildings(state).pen ?? 0 : 0;
  const warmed = litFires(state).length * GROWTH_PRESSURE.peoplePerFire + pens * GROWTH_PRESSURE.peoplePerPen;
  return state.population > 0 ? Math.max(0, 1 - warmed / state.population) : 0;
}

// Food lost to rot each second: stores above foodKeeps slowly go bad.
export function foodKeeps(state: GameState) {
  return GROWTH_PRESSURE.foodKeeps + (countBuildings(state).granary ?? 0) * GRANARY_KEEPS;
}

export function foodSpoiling(state: GameState) {
  return Math.max(0, state.resources.food - foodKeeps(state)) * GROWTH_PRESSURE.foodRots;
}

export function isLit(state: GameState, tile: Tile) {
  return tile.building === "campfire" && (state.fires?.[tile.id] ?? 0) > 0;
}

export function litFires(state: GameState) {
  return state.tiles.filter((t) => isLit(state, t));
}

export function burnTicks(state: GameState) {
  return Math.round(CAMPFIRE_BURN_TICKS * (state.researched.includes("firekeeping") ? 1.5 : 1));
}

export function warriorCap(state: GameState) {
  return (countBuildings(state).warcamp ?? 0) * WARRIORS_PER_CAMP;
}

export function defenseStrength(state: GameState) {
  const perWarrior =
    (state.researched.includes("spears") ? 1.5 : 1) * (state.researched.includes("bronze-arms") ? 2 : 1);
  const counts = countBuildings(state);
  return state.soldiers * perWarrior + ((counts.warcamp ?? 0) > 0 ? 1 : 0) + (counts.walls ?? 0) * WALL_DEFENSE;
}

const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));

export function computeMeters(state: GameState): Meters {
  const counts = countBuildings(state);
  const prod = production(state);
  const cons = consumption(state);
  const stockDays = state.resources.food / Math.max(cons, 0.1);

  // Mostly "do we make enough for everyone?", so it drops as the tribe grows.
  // 45 means "just enough"; you need about twice what you eat to reach 100.
  let food = (prod.food / Math.max(cons, 0.1)) * 45 + Math.min(10, stockDays / 4);
  if (state.resources.food <= 0) food = Math.min(food, 5);

  const shelter =
    Math.min(1.1, housingCapacity(state) / Math.max(1, state.population)) * 70 +
    (counts.healer ?? 0) * 12;

  const fireBoost = state.researched.includes("firekeeping") ? 1.5 : 1;
  const lit = litFires(state).length;
  const energy =
    lit * 20 * fireBoost;

  // How healthy the land is (see sustainabilityBreakdown for the parts).
  const sustainability = 100 + sustainabilityBreakdown(state).reduce((sum, p) => sum + p.value, 0);

  const literacy = (counts.elder ?? 0) * 12 + (counts.school ?? 0) * 15 + (state.researched.length - 1) * 2;

  const happiness =
    clamp(food) * 0.35 +
    clamp(shelter) * 0.35 +
    Math.min(3, lit) * 6 +
    (counts.elder ? 5 : 0) -
    // No cold penalty while the tutorial is still teaching you to light a fire.
    (state.tutorialStep < TUTORIAL.length ? 0 : NO_FIRE_PENALTY * coldShare(state)) -
    (100 - clamp(sustainability)) * 0.15 -
    sickShare(state) * 30 +
    state.modifiers.happiness;

  return {
    food: clamp(food),
    shelter: clamp(shelter),
    happiness: clamp(happiness),
    literacy: clamp(literacy),
    energy: clamp(energy),
    sustainability: clamp(sustainability),
  };
}

function checkSecrets(state: GameState): GameState {
  const counts = countBuildings(state);
  if (!state.secretsFound.includes("cave-paintings") && (counts.elder ?? 0) >= 2) {
    return {
      ...state,
      secretsFound: [...state.secretsFound, "cave-paintings"],
      researched: [...state.researched, "cave-paintings"],
      resources: { ...state.resources, knowledge: state.resources.knowledge + 25 },
      modifiers: { ...state.modifiers, happiness: state.modifiers.happiness + 10 },
      log: ["Secret discovered: Cave Paintings!", ...state.log].slice(0, 30),
    };
  }
  return state;
}

// When has the moment for each elder lesson come?
function lessonReady(id: string, state: GameState) {
  const huts = countBuildings(state).hut ?? 0;
  switch (id) {
    case "forest":
      return forestCover(state) < 0.9;
    case "overhunting":
      return (countBuildings(state).gatherer ?? 0) > GATHERING.freeCamps;
    case "wildlife":
      return forestCover(state) < 0.7;
    case "smoke":
      return litFires(state).length >= 3;
    case "rot":
      return foodSpoiling(state) > 0.2;
    case "crowding":
      return (state.sick ?? 0) >= 1;
    case "growth":
      return huts >= 3;
    case "exhausted":
      return state.strainTicks > 0;
    case "restore":
      return (state.planted ?? 0) > 0;
    case "charcoal":
      return (countBuildings(state).smithy ?? 0) > 0;
    case "salt":
      return (countBuildings(state).canal ?? 0) > 0;
    case "stewardship":
      return (countBuildings(state).forester ?? 0) > 0;
    case "writing":
      return (countBuildings(state).school ?? 0) > 0;
    case "clothes":
      return state.researched.includes("hide-clothing");
    case "grazing":
      return (countBuildings(state).pen ?? 0) >= 3;
    default:
      return false;
  }
}

// Show the next elder lesson whose moment has come: one at a time, spaced out,
// never during the tutorial or an event.
export function lessonDue(state: GameState): GameState {
  if (state.tutorialStep < TUTORIAL.length || state.lesson || state.event || state.phase !== "playing") return state;
  if (state.tick - (state.lessonTick ?? -LESSON_GAP) < LESSON_GAP) return state;
  const seen = state.lessonsSeen ?? [];
  const next = LESSONS.find((l) => !seen.includes(l.id) && lessonReady(l.id, state));
  if (!next) return state;
  return { ...state, lesson: next.id, lessonsSeen: [...seen, next.id], lessonTick: state.tick };
}

// ---- Debrief ---------------------------------------------------------------

export function emptyStats(): Stats {
  return {
    peakPopulation: 0,
    built: 0,
    raidsWon: 0,
    raidsLost: 0,
    lowLandTicks: 0,
    deaths: { famine: 0, disease: 0, fire: 0, battle: 0 },
  };
}

// Copy the running totals, let `change` edit the copy, and store it.
function bumpStats(state: GameState, change: (st: Stats) => void): GameState {
  const base = state.stats ?? emptyStats();
  const st: Stats = { ...base, deaths: { ...base.deaths } };
  change(st);
  return { ...state, stats: st };
}

// Ready to leave this era: Agriculture researched and enough people (Stone Age).
export function readyForNextEra(state: GameState) {
  return (
    state.era === 0 &&
    state.phase === "playing" &&
    !state.debrief &&
    state.researched.includes("agriculture") &&
    state.population >= NEXT_ERA_POPULATION
  );
}

// How the land came through: the best ending needs it to still be healthy.
export function endingTier(sustainability: number): Debrief["tier"] {
  if (sustainability >= MIN_SUSTAINABILITY_FOR_BEST_ENDING) return "thriving";
  if (sustainability >= 35) return "costly";
  return "stripped";
}

export function makeDebrief(state: GameState, kind: Debrief["kind"]): Debrief {
  // Recompute so the verdict matches the land as it is right now.
  const meters = computeMeters(state);
  return {
    kind,
    era: state.era,
    tick: state.tick,
    year: state.year,
    meters,
    forestLeft: forestCover(state),
    stats: {
      ...(state.stats ?? emptyStats()),
      peakPopulation: Math.max(state.stats?.peakPopulation ?? 0, state.population),
    },
    researched: state.researched.filter((id) => !TREE_BY_ID[id]?.secret).length - 1,
    planted: state.planted ?? 0,
    lessons: state.lessonsSeen ?? [],
    tier: kind === "loss" ? "lost" : endingTier(meters.sustainability),
  };
}

function advanceTutorial(state: GameState): GameState {
  const step = TUTORIAL[state.tutorialStep];
  if (!step) return state;
  const counts = countBuildings(state);
  const done =
    step.done === "scout"
      ? state.flags.scouted
      : step.done === "train"
        ? state.soldiers > 0
        : state.researched.includes(step.done) || (counts[step.done] ?? 0) > 0;
  if (!done) return state;
  const next = { ...state, tutorialStep: state.tutorialStep + 1 };
  if (next.tutorialStep < TUTORIAL.length) return next;
  // Elder Ama says goodbye; the next real lesson waits its usual gap after this.
  return startGrace({ ...next, lesson: TUTORIAL_FAREWELL.id, lessonTick: state.tick });
}

// The world's troubles start a little after the tutorial ends, not during it.
function startGrace(state: GameState): GameState {
  return {
    ...state,
    nextEventTick: Math.max(state.nextEventTick, state.tick + GRACE_AFTER_TUTORIAL.event),
    nextRaidTick: Math.max(state.nextRaidTick, state.tick + GRACE_AFTER_TUTORIAL.raid),
    calmUntil: state.tick + GRACE_AFTER_TUTORIAL.disease,
  };
}

function tick(state: GameState): GameState {
  if (state.phase !== "playing" || state.event) return state;
  const prod = production(state);
  const cons = consumption(state);
  const era = ERAS[state.era];

  const resources: Resources = {
    food: Math.max(0, state.resources.food + prod.food - cons - foodSpoiling(state)),
    wood: Math.max(0, state.resources.wood + prod.wood),
    stone: state.resources.stone + prod.stone,
    knowledge: state.resources.knowledge + prod.knowledge,
    currency: state.resources.currency + prod.currency,
  };

  let population = state.population;
  let famineTicks = state.famineTicks;
  const capacity = housingCapacity(state);
  // Slow, steady growth: the tribe doesn't outgrow its food overnight.
  const growth = state.culture === "farmers" ? 0.015 : 0.01;

  let starved = 0;
  if (resources.food <= 0) {
    const before = population;
    population = Math.max(1, population - Math.max(0.3, population * 0.02));
    starved = before - population;
    famineTicks += 1;
  } else {
    famineTicks = Math.max(0, famineTicks - 1);
    if (state.meters.food > 45 && state.meters.shelter > 40 && population < capacity * 1.15) {
      population += Math.max(0.08, population * growth);
    }
  }

  // Unrest only builds up once the tutorial is over, so new players get a fair start.
  const inTutorial = state.tutorialStep < TUTORIAL.length;
  const unrestTicks =
    state.meters.happiness < UNREST_LEVEL && !inTutorial && !isCalm(state)
      ? state.unrestTicks + 1
      : Math.max(0, state.unrestTicks - 2);

  const strainTicks =
    state.meters.sustainability < LAND.strainLevel
      ? state.strainTicks + 1
      : Math.max(0, state.strainTicks - 2);

  const modifiers = {
    sustainability: state.modifiers.sustainability * 0.995,
    happiness: state.modifiers.happiness * 0.993,
  };

  // Campfires burn down; one going out is worth telling the player about.
  let fires = state.fires;
  let burnedOut = false;
  if (fires && Object.values(fires).some((v) => v > 0)) {
    fires = Object.fromEntries(
      Object.entries(fires).map(([id, v]) => {
        if (v === 1 && state.tiles[Number(id)]?.building === "campfire") burnedOut = true;
        return [id, Math.max(0, v - 1)];
      }),
    );
  }

  let next: GameState = {
    ...state,
    fires,
    log: burnedOut
      ? [`A campfire burned out. Click it to relight it (${RELIGHT_WOOD} wood).`, ...state.log].slice(0, 30)
      : state.log,
    tick: state.tick + 1,
    // Time can't run past the start of the next era until the player gets there.
    year: ERAS[state.era + 1]
      ? Math.min(state.year + era.yearsPerTick, ERAS[state.era + 1].startYear - 100)
      : state.year + era.yearsPerTick,
    resources,
    population,
    famineTicks,
    unrestTicks,
    strainTicks,
    modifiers,
  };

  if (next.tick % 3 === 0) next = growForests(next);
  // No raids or events while a new player is still learning.
  if (!inTutorial) next = updateLegion(updateRaids(next));
  // The final battle ends the story (won or lost): nothing else happens today.
  if (next.phase !== "playing" || next.debrief) return { ...next, meters: computeMeters(next) };

  if (famineTicks >= DIFFICULTIES[state.difficulty].famineLimit) {
    const lost: GameState = { ...next, phase: "gameover", lostTo: "famine", log: ["Famine has wiped out the tribe.", ...next.log] };
    return { ...lost, debrief: makeDebrief(lost, "loss") };
  }
  if (unrestTicks >= DIFFICULTIES[state.difficulty].unrestLimit) {
    const lost: GameState = { ...next, phase: "gameover", lostTo: "unrest", log: ["Your people lost hope and left.", ...next.log] };
    return { ...lost, debrief: makeDebrief(lost, "loss") };
  }

  if (!inTutorial && next.tick >= next.nextEventTick) {
    const rand = mulberry32(next.seed + next.tick);
    const event = pickEvent(rand(), next);
    next = { ...next, event, lastEvent: event.id, nextEventTick: next.tick + 180 + Math.floor(rand() * 120) };
  }

  const beforeDisease = next.population;
  next = stepDisease(next, housingCapacity(next), mulberry32(next.seed + next.tick * 31));
  next = bumpStats(next, (st) => {
    st.peakPopulation = Math.max(st.peakPopulation, next.population);
    st.deaths.famine += starved;
    st.deaths.disease += Math.max(0, beforeDisease - next.population);
    if (state.meters.sustainability < MIN_SUSTAINABILITY_FOR_BEST_ENDING) st.lowLandTicks += 1;
  });
  // Remember Sustainability every 5 ticks for the trend (about the last minute).
  if (next.tick % 5 === 0) {
    next = { ...next, sustainTrail: [...(next.sustainTrail ?? []), next.meters.sustainability].slice(-8) };
  }
  next = checkSecrets(next);
  next = lessonDue(next);
  next = advanceTutorial(next);
  return { ...next, meters: computeMeters(next) };
}

// Young and cut-over trees grow back, burnt ground heals, and woodcutters fell
// the trees around them.
function growForests(state: GameState): GameState {
  const woodcutters = state.tiles.filter((t) => t.building === "woodcutter");
  const changes = new Map<number, Partial<Tile>>();
  // Exhausted land stops growing back.
  const strain = landStrain(state);

  for (const t of state.tiles) {
    if (t.scorch > 0) {
      changes.set(t.id, { scorch: Math.max(0, t.scorch - 0.01) });
    }
    if (t.terrain === "forest" && t.growth < 1 && t.scorch < 0.4) {
      if (strain < 1) changes.set(t.id, { ...changes.get(t.id), growth: Math.min(1, t.growth + 0.06 * (1 - strain)) });
    }
    // Forests only grow back where they already stood; they don't take over new land.
  }

  // Foresters tend the thinnest forest near them (this runs every 3 ticks).
  for (const f of state.tiles.filter((t) => t.building === "forester")) {
    const tended = state.tiles
      .filter(
        (t) =>
          t.terrain === "forest" &&
          !t.building &&
          hexDistance(t, f) <= FORESTER_REACH &&
          (changes.get(t.id)?.growth ?? t.growth) < 0.9,
      )
      .sort((a, b) => (changes.get(a.id)?.growth ?? a.growth) - (changes.get(b.id)?.growth ?? b.growth))[0];
    if (tended) {
      const g = changes.get(tended.id)?.growth ?? tended.growth;
      changes.set(tended.id, { ...changes.get(tended.id), growth: Math.min(1, g + FORESTER_GROWTH) });
    }
  }

  // Woodcutters fell the trees they turn into wood (this runs every 3 ticks),
  // biggest trees first. Too many woodcutters on one patch strip it bare.
  for (const w of woodcutters) {
    let need = (0.3 * 3 * woodcutterYield(state, w)) / LAND.woodPerGrowth;
    const trees = treesNear(state, w)
      .map((t) => ({ t, growth: changes.get(t.id)?.growth ?? t.growth }))
      .sort((a, b) => b.growth - a.growth);
    for (const { t, growth } of trees) {
      if (need <= 0) break;
      const take = Math.min(need, growth - (loggingMode(state, w) === "selective" ? SELECTIVE_FLOOR : 0.02));
      if (take <= 0) continue;
      need -= take;
      changes.set(t.id, { ...changes.get(t.id), growth: growth - take });
    }
  }

  if (changes.size === 0) return state;
  return {
    ...state,
    tiles: state.tiles.map((t) => (changes.has(t.id) ? { ...t, ...changes.get(t.id) } : t)),
  };
}

// Where raiders come ashore, and where the warriors meet them.
function pickLanding(state: GameState, rand: () => number) {
  const home = state.tiles[state.startTile];
  const shores = state.tiles.filter((t) => {
    if (t.terrain !== "shallow") return false;
    const d = hexDistance(t, home);
    return d >= 7 && d <= 11;
  });
  if (shores.length === 0) return null;
  const from = shores[Math.floor(rand() * shores.length)];
  const mx = from.x + (home.x - from.x) * 0.7;
  const mz = from.z + (home.z - from.z) * 0.7;
  const meet = state.tiles
    .filter((t) => isLand(t.terrain) && t.terrain !== "mountain" && t.revealed && !t.building)
    .reduce((best, t) => (Math.hypot(t.x - mx, t.z - mz) < Math.hypot(best.x - mx, best.z - mz) ? t : best));
  return { from, meet, home };
}

export function legionSize(state: GameState) {
  return Math.max(
    4,
    Math.round((ROMAN_LEGION.base + state.population / ROMAN_LEGION.perPeople) * DIFFICULTIES[state.difficulty].raiders),
  );
}

// The legion: scouts see it coming, then it lands like a raid, only much bigger.
function updateLegion(state: GameState): GameState {
  if (state.era !== 1 || state.legionDone || state.phase !== "playing") return state;
  if (!state.legion && state.year >= ROMAN_LEGION.warningYear) {
    const size = legionSize(state);
    return {
      ...state,
      legion: { size, arriveTick: state.tick + ROMAN_LEGION.warningTicks },
      // No ordinary raids while the legion is coming.
      nextRaidTick: Number.MAX_SAFE_INTEGER,
      log: [`Scouts report a Roman legion of ${size} marching toward us!`, ...state.log].slice(0, 30),
    };
  }
  if (state.legion && !state.raid && state.tick >= state.legion.arriveTick) {
    const landing = pickLanding(state, mulberry32(state.seed + state.tick * 53));
    if (!landing) return state;
    const { size } = state.legion;
    return {
      ...state,
      raid: {
        strength: size * ROMAN_LEGION.strengthEach,
        legion: size,
        roman: true,
        fromTile: landing.from.id,
        targetTile: landing.home.id,
        meetTile: landing.meet.id,
        startTick: state.tick,
        arriveTick: state.tick + 12,
      },
      log: ["The Roman legion has landed!", ...state.log].slice(0, 30),
    };
  }
  return state;
}

// The final battle: hold and the story ends well; fall and the village is taken.
function resolveLegion(state: GameState) {
  const raid = state.raid!;
  const defense = defenseStrength(state);
  const size = raid.legion ?? Math.round(raid.strength / 2);
  const won = defense >= raid.strength;
  const lostWarriors = won ? Math.min(state.soldiers, Math.ceil(state.soldiers / 3)) : state.soldiers;
  const battle = {
    tick: state.tick,
    tile: raid.meetTile ?? raid.targetTile,
    fromTile: raid.fromTile,
    warriors: state.soldiers,
    raiders: size,
    warriorsLost: lostWarriors,
    raidersLost: won ? Math.max(1, Math.ceil(size * 0.6)) : Math.floor(defense / 4),
    won,
    roman: true,
  };
  const counted = bumpStats(state, (st) => {
    if (won) st.raidsWon += 1;
    else st.raidsLost += 1;
    st.deaths.battle += lostWarriors;
  });
  const after: GameState = {
    ...counted,
    raid: null,
    legion: null,
    legionDone: true,
    battle,
    soldiers: state.soldiers - lostWarriors,
  };
  if (won) {
    const done: GameState = {
      ...after,
      log: [`The Roman legion is beaten! ${state.nation ?? "Your people"} stand free.`, ...state.log].slice(0, 30),
    };
    return { ...done, debrief: makeDebrief(done, "final") };
  }
  const lost: GameState = {
    ...after,
    phase: "gameover",
    lostTo: "conquest",
    log: ["The legion broke through. The village has fallen.", ...state.log].slice(0, 30),
  };
  return { ...lost, debrief: makeDebrief(lost, "loss") };
}

function updateRaids(state: GameState): GameState {
  const { raid } = state;
  if (raid?.roman) return state.tick >= raid.arriveTick ? resolveLegion(state) : state;
  if (raid && state.tick >= raid.arriveTick) {
    const defense = defenseStrength(state);
    const battleAt = raid.meetTile ?? raid.targetTile;
    if (defense >= raid.strength) {
      const losses = Math.min(state.soldiers, Math.floor(raid.strength / 3));
      const won = bumpStats(state, (st) => {
        st.raidsWon += 1;
        st.deaths.battle += losses;
      });
      return {
        ...won,
        raid: null,
        battle: {
          tick: state.tick,
          tile: battleAt,
          fromTile: raid.fromTile,
          warriors: state.soldiers,
          raiders: raid.strength,
          warriorsLost: losses,
          raidersLost: Math.min(raid.strength, Math.max(1, Math.ceil(raid.strength * 0.6))),
          won: true,
        },
        soldiers: state.soldiers - losses,
        modifiers: { ...state.modifiers, happiness: state.modifiers.happiness + 6 },
        log: [
          `Raiders driven off!${losses ? ` ${losses} warrior${losses > 1 ? "s" : ""} fell.` : ""}`,
          ...state.log,
        ].slice(0, 30),
      };
    }
    const lost = bumpStats(state, (st) => {
      st.raidsLost += 1;
      st.deaths.battle += Math.min(state.soldiers, raid.strength);
    });
    return {
      ...lost,
      raid: null,
      battle: {
        tick: state.tick,
        tile: battleAt,
        fromTile: raid.fromTile,
        warriors: state.soldiers,
        raiders: raid.strength,
        warriorsLost: Math.min(state.soldiers, raid.strength),
        raidersLost: Math.min(raid.strength - 1, Math.floor(defense / 2)),
        won: false,
      },
      soldiers: Math.max(0, state.soldiers - raid.strength),
      resources: {
        ...state.resources,
        food: state.resources.food * 0.65,
        wood: state.resources.wood * 0.65,
      },
      modifiers: { ...state.modifiers, happiness: state.modifiers.happiness - 12 },
      log: ["Raiders plundered the village! Food and wood stolen.", ...state.log].slice(0, 30),
    };
  }

  if (!raid && state.tick >= state.nextRaidTick) {
    const rand = mulberry32(state.seed + state.tick * 31);
    const home = state.tiles[state.startTile];
    const shores = state.tiles.filter((t) => {
      if (t.terrain !== "shallow") return false;
      const d = hexDistance(t, home);
      return d >= 7 && d <= 11;
    });
    if (shores.length === 0) return { ...state, nextRaidTick: state.tick + 60 };
    const from = shores[Math.floor(rand() * shores.length)];
    // The warriors meet them most of the way to the village, on open ground.
    const mx = from.x + (home.x - from.x) * 0.7;
    const mz = from.z + (home.z - from.z) * 0.7;
    const meet = state.tiles
      .filter((t) => isLand(t.terrain) && t.terrain !== "mountain" && t.revealed && !t.building)
      .reduce((best, t) =>
        Math.hypot(t.x - mx, t.z - mz) < Math.hypot(best.x - mx, best.z - mz) ? t : best,
      );
    const strength = Math.max(
      2,
      Math.round(
        (2 + state.tick / 150 + state.population / GROWTH_PRESSURE.raidersPerPeople) *
          DIFFICULTIES[state.difficulty].raiders,
      ),
    );
    return {
      ...state,
      raid: {
        strength,
        fromTile: from.id,
        targetTile: home.id,
        meetTile: meet.id,
        startTick: state.tick,
        arriveTick: state.tick + 12,
      },
      nextRaidTick: state.tick + 180 + Math.floor(rand() * 100),
      log: [`${strength} raiders spotted landing on the shore!`, ...state.log].slice(0, 30),
    };
  }
  return state;
}

function spend(resources: Resources, cost: Partial<Resources>): Resources {
  const out = { ...resources };
  for (const [k, v] of Object.entries(cost)) out[k as keyof Resources] -= v ?? 0;
  return out;
}

function withMeters(state: GameState): GameState {
  const next = advanceTutorial(checkSecrets(state));
  return { ...next, meters: computeMeters(next) };
}

export function reducer(state: GameState, action: Action): GameState {
  const next = step(state, action);
  // The clock is held during the tutorial, so check progress after every action too.
  return action.type !== "tick" && next !== state ? advanceTutorial(next) : next;
}

function step(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "tick":
      return tick(state);

    case "setSpeed":
      return { ...state, speed: action.speed };

    case "place": {
      const def = BUILDINGS_BY_ID[action.buildingId];
      const tile = state.tiles[action.tileId];
      if (!def || !tile || !isUnlocked(state, def) || placementError(state, tile, def)) return state;
      const tiles = state.tiles.map((t) =>
        t.id === tile.id ? { ...t, building: def.id } : t,
      );
      const radius = def.reveal + (state.culture === "mariners" ? 1 : 0);
      const revealed = tiles.map((t) =>
        !t.revealed && hexDistance(t, tile) <= radius ? { ...t, revealed: true } : t,
      );
      return withMeters({
        ...state,
        tiles: revealed,
        fires: def.id === "campfire" ? { ...state.fires, [tile.id]: burnTicks(state) } : state.fires,
        resources: spend(state.resources, buildingCost(state, def)),
        log: [`Built a ${def.name}.`, ...state.log].slice(0, 30),
        stats: { ...(state.stats ?? emptyStats()), built: (state.stats?.built ?? 0) + 1 },
      });
    }

    case "scout": {
      const cost = scoutCost(state);
      if (tutorialLocked(state, "scout") || !canAfford(state, cost)) return state;
      const frontier = state.tiles.filter(
        (t) =>
          !t.revealed &&
          state.tiles.some((n) => n.revealed && isLand(n.terrain) && hexDistance(n, t) === 1),
      );
      if (frontier.length === 0) return state;
      const rand = mulberry32(state.seed + state.tick * 7 + state.log.length);
      const target = frontier[Math.floor(rand() * frontier.length)];
      const tiles = state.tiles.map((t) => ({ ...t }));
      revealAround(tiles, tiles[target.id], state.culture === "mariners" ? 5 : 4);
      return withMeters({
        ...state,
        tiles,
        flags: { ...state.flags, scouted: true },
        scoutsSent: state.scoutsSent + 1,
        resources: spend(state.resources, cost),
        log: ["Scouts returned with news of new land.", ...state.log].slice(0, 30),
      });
    }

    case "research": {
      const node = TREE_BY_ID[action.nodeId];
      if (
        tutorialLocked(state, "advancements") ||
        !node ||
        node.comingSoon ||
        node.secret ||
        state.researched.includes(node.id) ||
        !node.requires.every((r) => state.researched.includes(r)) ||
        state.resources.knowledge < node.cost
      )
        return state;
      return withMeters({
        ...state,
        researched: [...state.researched, node.id],
        flags: { ...state.flags, rocket: state.flags.rocket || node.id === "rocketry" },
        resources: { ...state.resources, knowledge: state.resources.knowledge - node.cost },
        log: [`Discovered ${node.name}!`, ...state.log].slice(0, 30),
      });
    }

    case "resolveEvent": {
      const choice = state.event?.choices[action.choice];
      if (!choice) return state;
      const { effect } = choice;
      const resources = { ...state.resources };
      for (const [k, v] of Object.entries(effect.resources ?? {}))
        resources[k as keyof Resources] = Math.max(0, resources[k as keyof Resources] + (v ?? 0));
      // A gamble is rolled now: it either happens or it doesn't.
      const gamble = effect.gamble;
      const unlucky = gamble ? mulberry32(state.seed + state.tick * 43)() < gamble.chance : false;
      if (gamble && unlucky) {
        for (const [k, v] of Object.entries(gamble.resources ?? {}))
          resources[k as keyof Resources] = Math.max(0, resources[k as keyof Resources] + (v ?? 0));
      }
      const burnRadius = effect.burn ?? (gamble && unlucky ? gamble.burn : undefined);
      const burned = burnRadius !== undefined ? burnForest(state, burnRadius) : null;
      const cleared = effect.clearForest ? oldestForest(state, effect.clearForest).map((t) => t.id) : [];
      const guarded = effect.protectForest ? oldestForest(state, effect.protectForest).map((t) => t.id) : [];
      const baseTiles = burned?.tiles ?? state.tiles;
      const counted = burned?.deaths
        ? bumpStats(state, (st) => {
            st.deaths.fire += burned.deaths;
          })
        : state;
      const resolved = withMeters({
        ...counted,
        tiles: cleared.length
          ? baseTiles.map((t) => (cleared.includes(t.id) ? { ...t, growth: 0.02 } : t))
          : baseTiles,
        protectedTiles: guarded.length ? [...(state.protectedTiles ?? []), ...guarded] : state.protectedTiles,
        nextRaidTick: state.nextRaidTick - (effect.raidSooner ?? 0),
        event: null,
        resources,
        population: Math.max(1, state.population + (effect.population ?? 0) - (burned?.deaths ?? 0)),
        fireVictims: burned?.victims.length
          ? burned.victims.map((tile) => ({ tile, tick: state.tick }))
          : state.fireVictims,
        modifiers: {
          sustainability: state.modifiers.sustainability + (effect.sustainability ?? 0),
          happiness:
            state.modifiers.happiness + (effect.happiness ?? 0) + (gamble && unlucky ? gamble.happiness ?? 0 : 0),
        },
        log: [
          ...(gamble ? [unlucky ? gamble.message : gamble.safeMessage] : []),
          ...(burned ? [burned.message] : []),
          ...(guarded.length ? ["The old grove is protected. No woodcutter may touch it."] : []),
          `${state.event?.title}: ${choice.label}`,
          ...state.log,
        ].slice(0, 30),
      });
      // Newcomers sometimes carry sickness with them; some choices risk it too.
      const roll = mulberry32(state.seed + state.tick * 41)();
      if (state.event?.id === "wanderers" && (effect.population ?? 0) > 0) {
        return maybeOutbreak(resolved, DISEASE.wanderers, roll, "The wanderers brought it with them.");
      }
      if (effect.sickness) return maybeOutbreak(resolved, effect.sickness, roll, "It came from the smoke and the filth.");
      return resolved;
    }

    case "skipTutorial": {
      // Skipping players still get the basics the tutorial would have built:
      // a woodcutter, a lit campfire and a gatherer, so they don't freeze or starve.
      const skipped = startGrace({ ...state, tutorialStep: TUTORIAL.length });
      const counts = countBuildings(state);
      const tiles = state.tiles.map((t) => ({ ...t }));
      if (!counts.woodcutter) giveStartingWoodcutter(tiles, tiles[state.startTile]);
      const pit = counts.campfire ? null : giveStartingCampfire(tiles, tiles[state.startTile]);
      if (!counts.gatherer) {
        const home = tiles[state.startTile];
        const spot = tiles
          .filter((t) => t.revealed && (t.terrain === "grass" || t.terrain === "forest") && !t.building)
          .sort((a, b) => hexDistance(a, home) - (a.deposit === "berries" ? 2 : 0) - (hexDistance(b, home) - (b.deposit === "berries" ? 2 : 0)))[0];
        if (spot) spot.building = "gatherer";
      }
      const fires = pit !== null ? { ...state.fires, [pit]: burnTicks(state) } : state.fires;
      return withMeters({ ...skipped, tiles, fires });
    }

    case "train": {
      if (tutorialLocked(state, "train") || state.soldiers >= warriorCap(state) || !canAfford(state, TRAIN_COST))
        return state;
      return withMeters({
        ...state,
        soldiers: state.soldiers + 1,
        resources: spend(state.resources, TRAIN_COST),
      });
    }

    case "demolish": {
      const tile = state.tiles[action.tileId];
      if (!tile || demolishError(state, tile)) return state;
      const def = BUILDINGS_BY_ID[tile.building!];
      const refund = demolishRefund(def);
      const resources = { ...state.resources };
      for (const [k, v] of Object.entries(refund)) resources[k as keyof Resources] += v ?? 0;
      return withMeters({
        ...state,
        tiles: state.tiles.map((t) => (t.id === tile.id ? { ...t, building: null } : t)),
        resources,
        log: [`Sold a ${def.name}.`, ...state.log].slice(0, 30),
      });
    }

    case "relight": {
      const tile = state.tiles[action.tileId];
      if (!tile || tile.building !== "campfire" || isLit(state, tile) || state.resources.wood < RELIGHT_WOOD) {
        return state;
      }
      return withMeters({
        ...state,
        fires: { ...state.fires, [tile.id]: burnTicks(state) },
        resources: { ...state.resources, wood: state.resources.wood - RELIGHT_WOOD },
        log: ["Relit the campfire.", ...state.log].slice(0, 30),
      });
    }

    case "setLogging": {
      const tile = state.tiles[action.tileId];
      if (!tile || tile.building !== "woodcutter") return state;
      return withMeters({
        ...state,
        logging: { ...state.logging, [tile.id]: action.mode },
        log: [
          action.mode === "selective"
            ? "Selective logging: half the wood, but the forest will last."
            : "Clear-cutting: full wood, but the forest will be stripped.",
          ...state.log,
        ].slice(0, 30),
      });
    }

    case "upgrade": {
      const tile = state.tiles[action.tileId];
      const target = tile?.building ? upgradeFor(state, tile.building) : null;
      if (!tile || !target || !canAfford(state, buildingCost(state, target))) return state;
      return withMeters({
        ...state,
        tiles: state.tiles.map((t) => (t.id === tile.id ? { ...t, building: target.id } : t)),
        resources: spend(state.resources, buildingCost(state, target)),
        log: [`Upgraded to a ${target.name}.`, ...state.log].slice(0, 30),
        stats: { ...(state.stats ?? emptyStats()), built: (state.stats?.built ?? 0) + 1 },
      });
    }

    case "plant": {
      const tile = state.tiles[action.tileId];
      if (!tile || plantError(state, tile)) return state;
      const young = tile.terrain !== "forest";
      return withMeters({
        ...state,
        tiles: state.tiles.map((t) =>
          t.id !== tile.id
            ? t
            : young
              ? { ...t, terrain: "forest", height: terrainHeight("forest"), growth: 0.1 }
              : { ...t, growth: Math.min(1, t.growth + 0.3) },
        ),
        resources: spend(state.resources, PLANT_COST),
        planted: (state.planted ?? 0) + 1,
        log: [young ? "Planted saplings: a new forest will grow here." : "Planted saplings in the thinned forest.", ...state.log].slice(0, 30),
      });
    }

    case "dismissLesson":
      return { ...state, lesson: null };

    case "devLesson": {
      if (!state.dev) return state;
      const seen = state.lessonsSeen ?? [];
      const nextLesson = LESSONS.find((l) => !seen.includes(l.id)) ?? LESSONS[0];
      return { ...state, lesson: nextLesson.id, lessonsSeen: [...seen, nextLesson.id], lessonTick: state.tick };
    }

    case "advanceEra":
      if (!readyForNextEra(state)) return state;
      return { ...state, debrief: makeDebrief(state, "era") };

    case "enterEra": {
      if (state.debrief?.kind !== "era" || !ERAS[state.era + 1]) return state;
      const era = state.era + 1;
      return withMeters({
        ...state,
        era,
        year: ERAS[era].startYear,
        debrief: null,
        log: [`${state.nation ?? "Your people"} enter the ${ERAS[era].name} era.`, ...state.log].slice(0, 30),
      });
    }

    case "devFinishEra": {
      if (!state.dev) return state;
      const ready: GameState = {
        ...state,
        researched: Array.from(new Set([...state.researched, "agriculture"])),
        population: Math.max(state.population, NEXT_ERA_POPULATION),
      };
      return { ...ready, debrief: makeDebrief(ready, "era") };
    }

    case "devRomans":
      if (!state.dev || state.era !== 1 || state.legionDone) return state;
      return {
        ...state,
        legion: { size: legionSize(state), arriveTick: state.tick + 3 },
        nextRaidTick: Number.MAX_SAFE_INTEGER,
        log: ["Dev: the Roman legion is almost here.", ...state.log].slice(0, 30),
      };

    case "dismissDebrief":
      return state.debrief?.kind === "final" ? { ...state, debrief: null } : state;

    case "devRaid":
      if (!state.dev || state.raid) return state;
      return { ...state, nextRaidTick: state.tick };

    case "devOutbreak":
      if (!state.dev) return state;
      return withMeters(maybeOutbreak({ ...state, sick: (state.sick ?? 0) + 4 }, 1, 0, "Dev: outbreak."));

    case "devFiresOut":
      if (!state.dev) return state;
      return withMeters({ ...state, fires: {}, log: ["Dev: all campfires put out.", ...state.log].slice(0, 30) });

    case "devPeople":
      if (!state.dev) return state;
      return withMeters({ ...state, population: state.population + 10, log: ["Dev: +10 people.", ...state.log].slice(0, 30) });

    case "devGrant":
      if (!state.dev) return state;
      return {
        ...state,
        resources: Object.fromEntries(
          Object.entries(state.resources).map(([k, v]) => [k, v + 500]),
        ) as Resources,
      };

    case "devEra":
      if (!state.dev || !ERAS[action.era]) return state;
      return withMeters({
        ...devJumpToEra(state, action.era),
        log: [`Dev mode: jumped to the ${ERAS[action.era].name}.`, ...state.log].slice(0, 30),
      });

    case "devEvent": {
      const event = EVENTS.find((e) => e.id === action.id);
      return state.dev && event ? { ...state, event } : state;
    }

    case "devReveal":
      if (!state.dev) return state;
      return { ...state, tiles: state.tiles.map((t) => (t.revealed ? t : { ...t, revealed: true })) };

    case "hunt":
      return maybeOutbreak({
        ...state,
        resources: { ...state.resources, food: state.resources.food + HUNT_FOOD },
        log: [`Hunters brought down a ${action.animal} (+${HUNT_FOOD} food).`, ...state.log].slice(0, 30),
      }, isCalm(state) ? 0 : DISEASE.hunt, mulberry32(state.seed + state.tick * 37 + Math.round(state.resources.food))(), "It came with the meat from the hunt.");
  }
}

const SAVE_KEY = "emberline-save";

export function saveGame(state: GameState) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch {
    // storage full or blocked; autosave is best-effort
  }
}

export function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GameState;
    if (parsed.version !== SAVE_VERSION) return null;
    // Mountains used to be tall pillars; older saves keep the new, lower base.
    for (const t of parsed.tiles) if (t.terrain === "mountain") t.height = terrainHeight("mountain");
    return parsed;
  } catch {
    return null;
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // ignore
  }
}
