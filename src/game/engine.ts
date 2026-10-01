import {
  AFTER_TUTORIAL_RESERVE,
  RAW_FOOD,
  DROP,
  GRIEF,
  HOMELESS,
  PEOPLE_NAMES,
  formatYear,
  XP,
  chiefTitle,
  xpToReach,
  RAID_KINDS,
  RAID_RESPONSE,
  WATCH_FIRE,
  EVENT_GAP,
  RAID_GAP,
  SMALL_MOMENTS,
  FAMINE,
  COLLAPSE,
  ERA_DEADLINE,
  LEFT_BEHIND_WARN,
  ANCIENT_DEADLINE,
  CLASSICAL_POPULATION,
  WATER,
  TOWN,
  DROUGHT,
  CARAVAN,
  ROADS_COINS,
  IRON_STRENGTH,
  IRON_CHARCOAL,
  JADE_ROAD,
  ERA_INTROS,
  WEAR,
  DISCOVERIES,
  LANDMARKS,
  LANDMARK,
  KINGDOMS,
  DIPLOMACY,
  SHIP,
  OUTPOST,
  KINGDOM_RAID,
  CASTLE,
  KNIGHTS,
  FARMING,
  LEARNING,
  PLAGUE,
  DISASTERS,
  DISASTER_HITS,
  STONE_BUILDINGS,
  WOOD_BUILDINGS,
  TUTORIAL_START_FOOD,
  ROMAN_LEGION,
  FORESTER_GROWTH,
  FORESTER_REACH,
  GRANARY_KEEPS,
  SMITHY_CHARCOAL,
  QUARRY_DUST,
  QUARRY_CUT,
  SPARKS,
  FARM_RAIN,
  FIRE_SCARE,
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
  QUIET_GAP,
  PLANT_COST,
  SELECTIVE_FLOOR,
  TICK_SECONDS,
  GENTLE,
  FIRE_RISK,
  LAND,
  GRACE_AFTER_TUTORIAL,
  BUILDINGS_BY_ID,
  DIFFICULTIES,
  ERAS,
  EVENTS,
  TRAIN_COST,
  TREE,
  TREE_BY_ID,
  SPEAR_COST,
  SPEARMAN_STRENGTH,
  ADVANCEMENT_GOALS,
  AFTER_STEPS,
  KNOWLEDGE_MILESTONES,
  CAVE_PAINTINGS_KNOWLEDGE,
  TEACHING,
  SCOUT_KNOWLEDGE,
  SCOUT_TRIP,
  TUTORIAL,
  TUTORIAL_FAREWELL,
  WARRIORS_PER_CAMP,
} from "./content";
import { diseaseName, isCalm, maybeOutbreak, sickShare, stepDisease } from "./disease";
import { hexDistance } from "./hex";
import { generateMap, ISLANDS, isLand, revealAround, riverPath, terrainHeight } from "./map";
import { mulberry32 } from "./noise";
import type { IconId } from "./sprites";
import type {
  Goal,
  TallyKey,
  TreeNode,
  Debrief,
  DisasterKind,
  Stats,
  BuildingDef,
  CultureId,
  DifficultyId,
  GameState,
  KingdomId,
  LandmarkId,
  Meters,
  Raid,
  RaidKind,
  RaidResponse,
  Resources,
  Tile,
} from "./types";

export const SAVE_VERSION = 6;
const BASE_HOUSING = 8;
// Food eaten per second by each person and each warrior.
export const FOOD_PER_PERSON = 0.15; // 1 food every 10 ticks
export const FOOD_PER_WARRIOR = 0.12;
// Food from each animal the hunters bring back.
export const HUNT_FOOD = 4;
// The most the tribe can grow in one tick (people).
export const GROWTH_CAP = 0.35;
// Raids grow by one raider every this many ticks (on top of the tribe's size).
export const RAID_GROWTH_TICKS = 300;

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
  | { type: "devGrief" }
  | { type: "devNearlyBehind" }
  | { type: "dropPerson"; tileId: number | null }
  | { type: "devFogBack" }
  | { type: "devXp" }
  | { type: "raidResponse"; choice: RaidResponse }
  | { type: "devRaidKind"; kind: RaidKind }
  | { type: "setKeeper"; tileId: number; on: boolean }
  | { type: "devMoment"; id?: string }
  | { type: "devStarve" }
  | { type: "famineRelief"; kind: FamineRelief }
  | { type: "devCollapse" }
  | { type: "caravan" }
  | { type: "repair"; tileId: number }
  | { type: "devWear" }
  | { type: "dismissCutscene" }
  | { type: "devCutscene"; id: string }
  | { type: "devDisaster"; kind: DisasterKind }
  | { type: "chooseLandmark"; kind: LandmarkId }
  | { type: "buildStage" }
  | { type: "gift"; kingdom: KingdomId }
  | { type: "treaty"; kingdom: KingdomId }
  | { type: "raidKingdom"; kingdom: KingdomId }
  | { type: "ship" }
  | { type: "harbour"; closed: boolean }
  | { type: "devLandmark" }
  | { type: "devPlague"; when: "soon" | "now" | "end" }
  | { type: "devShipBack" }
  | { type: "devMood"; kingdom: KingdomId; by: number }
  | { type: "devBeatLegion" }
  | { type: "devDrought"; when: "soon" | "now" | "end" }
  | { type: "devCaravanBack" }
  | { type: "devOutbreak" }
  | { type: "devRaid" }
  | { type: "devRomans" }
  | { type: "dismissDebrief" }
  | { type: "advanceEra" }
  | { type: "enterEra" }
  | { type: "devFinishEra" }
  | { type: "dismissLesson" }
  | { type: "devLesson"; id?: string }
  | { type: "setLogging"; tileId: number; mode: "clear" | "selective" }
  | { type: "plant"; tileId: number }
  | { type: "upgrade"; tileId: number }
  | { type: "relight"; tileId: number }
  | { type: "devEra"; era: number }
  | { type: "devReveal" }
  | { type: "devEvent"; id: string }
  | { type: "devCutHills" }
  | { type: "devGoals" }
  | { type: "devSparks" }
  | { type: "devClearForest" }
  | { type: "endCoach" }
  | { type: "upgradeWarrior" };

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
    collapseTicks: 0,
    strainTicks: 0,
    forestBaseline: 0,
    soldiers: 0,
    spearmen: 0,
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
  // Elder Ama hands over what each tutorial step needs when it starts (see
  // advanceTutorial), so there's never a big pile; the reserve comes at the end.
  state.resources = tutorialBudget(state, [0]);
  state.resources.food += TUTORIAL_START_FOOD;
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
  // Past the Ancient era, the Roman legion is already beaten; past the
  // Classical era, the drought is over.
  return withKingdoms({
    ...state,
    era,
    year: ERAS[era].startYear,
    eraStartTick: state.tick,
    legionDone: state.legionDone || era >= 2,
    droughtDone: state.droughtDone || era >= 3,
  });
}

// The Medieval era's two kingdoms, as they first feel about us.
function withKingdoms(state: GameState): GameState {
  if (state.era < 3 || state.kingdoms) return state;
  return {
    ...state,
    kingdoms: {
      steppe: { mood: KINGDOMS.steppe.start, treaty: false },
      reach: { mood: KINGDOMS.reach.start, treaty: false },
    },
  };
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
// It builds up over `strainTicks` below `strainLevel`, and bites harder the lower
// Sustainability sinks: a little just under 40, fully by `strainLevel - strainDepth`.
export function landStrain(state: GameState) {
  const time = Math.min(1, state.strainTicks / LAND.strainTicks);
  const depth = Math.min(1, Math.max(0, (LAND.strainLevel - state.meters.sustainability) / LAND.strainDepth));
  return time * depth;
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
// tree; selective logging only thins the bigger trees, for exactly half the wood
// clear-cutting would get from the same forest. The forest grows back faster
// than that, so it lasts. With no tree above SELECTIVE_FLOOR it waits for them.
export function woodcutterYield(state: GameState, tile: Tile) {
  const trees = treesNear(state, tile);
  const clear = Math.min(1, trees.reduce((sum, t) => sum + t.growth, 0) / 2);
  if (loggingMode(state, tile) === "selective") {
    return trees.some((t) => t.growth > SELECTIVE_FLOOR + 0.02) ? clear * 0.5 : 0;
  }
  return clear;
}

export const PLANT_TOOL = "__plant";

// What a building can be upgraded into in the current era (e.g. Hut → House).
export function upgradeFor(state: GameState, buildingId: string): BuildingDef | null {
  const next = buildingId === "hut" ? BUILDINGS_BY_ID.house : buildingId === "house" ? BUILDINGS_BY_ID.townhouse : null;
  return next && isUnlocked(state, next) ? next : null;
}

// Where saplings can go: open grass or steppe, or forest that has been thinned.
export function plantError(state: GameState, tile: Tile): string | null {
  if (tutorialLocked(state, "plant")) return "Unlocks after the tutorial";
  if (!state.researched.includes("early-farming")) return "Learn Early Farming first";
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
  // The old grove only comes up once, and only while there is old forest to protect.
  const grovePossible = !(state.protectedTiles ?? []).length && oldestForest(state, 4).length >= 2;
  const weights = EVENTS.map((e) =>
    e.id === state.lastEvent || (e.era ?? 0) > state.era || (e.id === "sacred-grove" && !grovePossible)
      ? 0
      : e.id === "wildfire"
        ? wildfire
        : 1,
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
// Every Transport advancement makes travel 20% cheaper (scouts and caravans).
function travelDiscount(state: GameState) {
  const transport = state.researched.filter((id) => TREE_BY_ID[id]?.branch === "transport").length;
  return Math.pow(0.8, transport);
}

export function scoutCost(state: GameState): Partial<Resources> {
  const n = state.scoutsSent;
  const discount = travelDiscount(state);
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
  const base = def.landmark && state.landmark?.kind !== def.id ? sumCosts(LANDMARKS[def.id as LandmarkId].stages) : def.cost;
  if (state.culture !== "builders") return base;
  return Object.fromEntries(
    Object.entries(base).map(([k, v]) => [k, Math.ceil((v ?? 0) * 0.8)]),
  );
}

function sumCosts(costs: Partial<Resources>[]): Partial<Resources> {
  const out: Partial<Resources> = {};
  for (const c of costs) for (const [k, v] of Object.entries(c)) out[k as keyof Resources] = (out[k as keyof Resources] ?? 0) + (v ?? 0);
  return out;
}

export function canAfford(state: GameState, cost: Partial<Resources>) {
  return Object.entries(cost).every(
    ([k, v]) => state.resources[k as keyof Resources] >= (v ?? 0),
  );
}

export function isUnlocked(state: GameState, def: BuildingDef) {
  if (tutorialLocked(state, def.id)) return false;
  if (def.landmark) return state.era >= 3 || state.landmark?.kind === def.id;
  return def.era <= state.era && (!def.requires || state.researched.includes(def.requires));
}

export function placementError(state: GameState, tile: Tile, def: BuildingDef): string | null {
  if (state.tutorialStep < TUTORIAL.length && (countBuildings(state)[def.id] ?? 0) >= 1) {
    return "Only one of each during the tutorial";
  }
  if (!tile.revealed) return "Unexplored land";
  if (tile.building) return "Already built here";
  if (state.protectedTiles?.includes(tile.id)) return "The old grove is protected";
  const home = state.tiles[state.startTile].island;
  if (tile.island >= 0 && tile.island !== home) {
    const kingdom = kingdomOfIsland(tile.island);
    if (kingdom) return `This land belongs to ${KINGDOMS[kingdom].name}`;
    if (!(state.outposts ?? []).includes(tile.island)) return "Our ships haven't claimed this island";
    if (!def.overseas) return "Too far from home: only farms, fishing, woodcutters, pens, gatherers and trading posts";
  } else if (def.id === "tradingpost") return "Only on an island our ships have found";
  if (def.unique && (countBuildings(state)[def.id] ?? 0) >= 1) return "There is only one";
  const ploughed = def.id === "farm" && tile.terrain === "forest" && state.researched.includes("heavy-plough");
  if (!def.terrain.includes(tile.terrain) && !ploughed) return `Needs ${def.terrain.join(" / ")}`;
  if (def.needsWaterNeighbor) {
    const touchesWater = state.tiles.some(
      (t) => !isLand(t.terrain) && hexDistance(t, tile) === 1,
    );
    if (!touchesWater) return "Must touch water";
  }
  if (def.needsRiver && !touchesRiver(state, tile)) return "Must touch the river";
  if (!canAfford(state, buildingCost(state, def))) return "Not enough resources";
  return null;
}

// How many people live in this home. Families spread out across the homes
// one at a time (so 8 people in 3 huts is 3, 3, 2); anyone left over when
// every home is full sleeps in the open camp (BASE_HOUSING).
export function residents(state: GameState, tile: Tile): { living: number; room: number } | null {
  const room = tile.building ? BUILDINGS_BY_ID[tile.building]?.housing ?? 0 : 0;
  if (!room) return null;
  const homes = state.tiles
    .map((t) => ({ id: t.id, cap: t.building ? BUILDINGS_BY_ID[t.building]?.housing ?? 0 : 0, living: 0 }))
    .filter((h) => h.cap > 0);
  let left = Math.min(Math.floor(state.population), homes.reduce((sum, h) => sum + h.cap, 0));
  while (left > 0) {
    for (const h of homes) {
      if (left > 0 && h.living < h.cap) {
        h.living++;
        left--;
      }
    }
  }
  return { living: homes.find((h) => h.id === tile.id)?.living ?? 0, room };
}

// How many people have no roof over their heads, and what it costs in happiness.
export function homelessCount(state: GameState) {
  return Math.max(0, Math.floor(state.population) - housingCapacity(state));
}
export function homelessMood(state: GameState) {
  if (state.tutorialStep < TUTORIAL.length) return 0;
  return Math.min(HOMELESS.maxMood, homelessCount(state) * HOMELESS.mood);
}

export function housingCapacity(state: GameState) {
  let room = BASE_HOUSING;
  for (const t of state.tiles) {
    const housing = t.building ? BUILDINGS_BY_ID[t.building]?.housing ?? 0 : 0;
    // Hard mode: a broken-down home only holds half its people.
    room += (t.worn ?? 0) >= 1 ? Math.floor(housing / 2) : housing;
  }
  return room;
}

// The wild only has so much to give. The first gatherer camp gets a full
// camp's food; every extra camp adds only `extraCamp` (25%) of one. Every camp
// makes the same share of that, so this returns each camp's fraction.
export function gathererShare(state: GameState, camps = countBuildings(state).gatherer ?? 0): number {
  if (camps <= 1) return 1;
  return (1 + GATHERING.extraCamp * (camps - 1)) / camps;
}

// Extra Elder's Huts and schools teach only half as much each (every one of
// that kind makes the same average share).
export function teachingShare(state: GameState, building: string): number {
  if (!TEACHING.buildings.includes(building)) return 1;
  const n = countBuildings(state)[building] ?? 0;
  return n <= 1 ? 1 : (1 + TEACHING.extra * (n - 1)) / n;
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

// A gatherer camp right next to a lit campfire: the smoke and noise scare off the game.
export function scaredByFire(state: GameState, tile: Tile, building = tile.building): boolean {
  if (building !== "gatherer") return false;
  return state.tiles.some((t) => t.id !== tile.id && isLit(state, t) && hexDistance(t, tile) <= FIRE_SCARE.range);
}

// What a campfire or gatherer placed here would do to the game nearby, for the placement card.
// Tiles next to a lit campfire that its sparks could catch: grass, and wooden houses.
function sparkTargets(state: GameState, fire: Tile) {
  return state.tiles.filter(
    (t) =>
      hexDistance(t, fire) === 1 &&
      !state.protectedTiles?.includes(t.id) &&
      (t.building === "hut" || (!t.building && (t.terrain === "grass" || t.terrain === "steppe"))),
  );
}

// Now and then a campfire throws sparks: dry grass next to it scorches, and a
// wooden house next to it can catch fire and burn down.
function sparks(state: GameState): GameState {
  if (state.tutorialStep < TUTORIAL.length) return state;
  const rand = mulberry32(state.seed + state.tick * 61);
  const damp = state.researched.includes("firekeeping") ? SPARKS.firekeeping : 1;
  for (const fire of litFires(state)) {
    const near = sparkTargets(state, fire);
    const houses = near.filter((t) => t.building === "hut");
    const chance = damp * (SPARKS.perHouse * houses.length + SPARKS.perGrass * (near.length - houses.length));
    if (!near.length || rand() >= chance) continue;
    // Houses catch more easily than grass; one big moment at a time.
    const pool = houses.length && quietEnough(state) && rand() < (SPARKS.perHouse * houses.length) / (chance / damp) ? houses : near.filter((t) => !t.building);
    const hit = pool[Math.floor(rand() * pool.length)];
    if (!hit) continue;
    const burnsHouse = hit.building === "hut";
    return {
      ...state,
      tiles: state.tiles.map((t) => (t.id === hit.id ? { ...t, building: burnsHouse ? null : t.building, scorch: 1 } : t)),
      lastBigTick: burnsHouse ? state.tick : state.lastBigTick,
      log: [
        burnsHouse
          ? "Sparks from the campfire set a wooden house alight. It burned down."
          : "Grass caught fire! A spark from the campfire burned the grass beside it black. Keep a gap between fires and houses.",
        ...state.log,
      ].slice(0, 30),
    };
  }
  return state;
}

// What placing a wooden house or a campfire here risks from sparks, for the placement card.
export function sparkNote(state: GameState, tile: Tile, building: string): string | null {
  if (building === "hut") {
    const fire = state.tiles.some((t) => t.building === "campfire" && hexDistance(t, tile) === 1);
    return fire ? "Right next to a campfire: sparks could set this wooden house alight." : null;
  }
  if (building === "campfire") {
    const n = state.tiles.filter((t) => t.building === "hut" && hexDistance(t, tile) === 1).length;
    return n ? `Sparks could set ${n} wooden house${n === 1 ? "" : "s"} next to it alight.` : null;
  }
  return null;
}

export function fireScareNote(state: GameState, tile: Tile, building: string): string | null {
  const loss = Math.round(FIRE_SCARE.foodLoss * 100);
  if (building === "campfire") {
    const hit = state.tiles.filter(
      (t) => t.building === "gatherer" && hexDistance(t, tile) <= FIRE_SCARE.range,
    ).length;
    return hit
      ? `Smoke and noise would scare the animals away from ${hit} gatherer camp${hit === 1 ? "" : "s"} next to it (${loss}% less food).`
      : null;
  }
  return scaredByFire(state, tile, building)
    ? `A campfire next to it scares off the animals: this camp would make ${loss}% less food.`
    : null;
}

// How much rain falls, from forest cover: forests bring rain. Fields grow this share.
// In the great drought it all but stops; standing forest still holds a little.
export function rainfall(state: GameState): number {
  if (inDrought(state)) return DROUGHT.rain + DROUGHT.forestRain * forestCover(state);
  return FARM_RAIN.minRain + (1 - FARM_RAIN.minRain) * forestCover(state);
}

// ---- Classical era: water, towns, trade, the drought -------------------------

export function touchesRiver(state: GameState, tile: Tile) {
  return state.tiles.some((t) => t.terrain === "river" && hexDistance(t, tile) === 1);
}

// The drought is on (after the warning, before the rains return).
export function inDrought(state: GameState) {
  const d = state.drought;
  return !!d && state.tick >= d.startTick && state.tick < d.endTick;
}

// Is this tile within reach of a building of this kind?
function near(state: GameState, tile: Tile, building: string, reach: number) {
  return state.tiles.some((t) => t.building === building && hexDistance(t, tile) <= reach);
}

// How much a field grows: rain, canals, aqueducts and mills, and seed grain eaten in a famine.
export function farmFactor(state: GameState, tile: Tile) {
  const canal = state.tiles.some((t) => t.building === "canal" && hexDistance(t, tile) === 1) ? 1.5 : 1;
  const watered = near(state, tile, "aqueduct", WATER.aqueductReach);
  const mill = near(state, tile, "watermill", WATER.millReach) ? 1 + WATER.millFarm : 1;
  // In the drought, a field an aqueduct waters still gets most of its water.
  const water = watered && inDrought(state) ? Math.max(rainfall(state), DROUGHT.aqueductFarm) : rainfall(state);
  // A flood leaves rich silt behind: the field grows more for a while.
  const silt = state.tick < (state.silt?.[tile.id] ?? 0) ? 1 + DISASTER_HITS.flood.silt : 1;
  const wind = near(state, tile, "windmill", FARMING.windmillReach) ? 1 + FARMING.windmill : 1;
  const plough = (state.researched.includes("heavy-plough") ? FARMING.plough : 1) * (state.researched.includes("three-field") ? FARMING.rotation : 1);
  return canal * mill * wind * plough * silt * (watered ? 1 + WATER.aqueductFarm : 1) * water * (seedEaten(state) ? 1 - FAMINE.seed.farmLoss : 1);
}

// How many people have water in the drought: springs, wells and aqueducts.
export function waterSupply(state: GameState) {
  const c = countBuildings(state);
  return WATER.base + (c.well ?? 0) * WATER.well + (c.aqueduct ?? 0) * WATER.aqueduct;
}

// Share of the town with no water (only in the drought; rain and the river are enough otherwise).
export function thirstShare(state: GameState) {
  if (!inDrought(state) || state.population <= 0) return 0;
  return Math.max(0, 1 - waterSupply(state) / state.population);
}

// Share of the town with clean streets (latrines and baths). Only matters once
// there are Town Houses: that's when a village becomes a crowded town.
export function sanitation(state: GameState) {
  const c = countBuildings(state);
  if (!c.townhouse) return 1;
  return Math.min(1, ((c.latrine ?? 0) * TOWN.latrine + (c.baths ?? 0) * TOWN.baths) / Math.max(1, state.population));
}

// What a Classical water or town building placed here would do, for the placement card.
export function townNote(state: GameState, tile: Tile, building: string): string | null {
  const counts = countBuildings(state);
  const fields = (reach: number) => state.tiles.filter((t) => t.building === "farm" && hexDistance(t, tile) <= reach).length;
  switch (building) {
    case "aqueduct": {
      const n = fields(WATER.aqueductReach);
      return n
        ? `Waters ${n} field${n === 1 ? "" : "s"} within ${WATER.aqueductReach} tiles (+${WATER.aqueductFarm * 100}%, and they keep most of their harvest in a drought).`
        : `No fields within ${WATER.aqueductReach} tiles to water. It still brings water to ${WATER.aqueduct} people.`;
    }
    case "watermill": {
      const n = fields(WATER.millReach);
      return `Grinds grain for ${n} field${n === 1 ? "" : "s"} within ${WATER.millReach} tiles.`;
    }
    case "farm":
      return near(state, tile, "aqueduct", WATER.aqueductReach) ? "An aqueduct waters this field: +20%, and it keeps most of its harvest in a drought." : null;
    case "well":
      return (counts.well ?? 0) >= WATER.wellsFree
        ? `Already ${counts.well} wells: each one past ${WATER.wellsFree} dries out the land (−${WATER.wellSustain} Sustainability).`
        : null;
    case "townhouse": {
      const clean = (counts.latrine ?? 0) * TOWN.latrine + (counts.baths ?? 0) * TOWN.baths;
      return clean < state.population ? "Not enough latrines for everyone: in a packed town sickness spreads faster." : null;
    }
    default:
      return null;
  }
}

// ---- Hard mode: wear and repairs ---------------------------------------------

export function wearsOut(state: GameState) {
  return state.difficulty === "hard";
}

// How much of its output a building still makes: full until it's `slows` worn,
// then less and less, nothing once broken.
export function wearFactor(tile: Tile) {
  const w = tile.worn ?? 0;
  if (w >= 1) return 0;
  return w <= WEAR.slows ? 1 : 1 - (w - WEAR.slows) / (1 - WEAR.slows);
}

export function repairCost(state: GameState, tile: Tile): Partial<Resources> {
  const def = BUILDINGS_BY_ID[tile.building ?? ""];
  if (!def) return {};
  const cost = buildingCost(state, def);
  return Object.fromEntries(
    Object.entries(cost).map(([k, v]) => [k, Math.max(1, Math.ceil((v ?? 0) * WEAR.repairShare * Math.max(0.3, tile.worn ?? 0)))]),
  );
}

// Every building wears a little each tick (Hard only).
function wearBuildings(state: GameState): GameState {
  if (!wearsOut(state) || state.tutorialStep < TUTORIAL.length) return state;
  let broke: string | null = null;
  const tiles = state.tiles.map((t) => {
    if (!t.building || t.building === "campfire") return t;
    const rate = WEAR.perTick * (WEAR.busyBuildings.includes(t.building) ? WEAR.busy : WEAR.sturdyBuildings.includes(t.building) ? WEAR.sturdy : 1);
    const worn = Math.min(1, (t.worn ?? 0) + rate);
    if (worn >= 1 && (t.worn ?? 0) < 1) broke = BUILDINGS_BY_ID[t.building].name;
    return { ...t, worn };
  });
  return {
    ...state,
    tiles,
    log: broke ? [`A ${broke} has broken down. Click it to repair it.`, ...state.log].slice(0, 30) : state.log,
  };
}

// Caravans can leave from each Market once Silk Road Contact is known.
// ---- Medieval era: landmark, kingdoms, ships and outposts, the Black Death ---

export function kingdomOfIsland(island: number): KingdomId | null {
  return island === 1 ? "steppe" : island === 2 ? "reach" : null;
}

// Our landmark: every stage paid for and the masons done.
export function landmarkDone(state: GameState) {
  const l = state.landmark;
  return !!l && l.stage >= 3 && state.tick >= l.readyTick;
}

// Is this building's bonus on? A landmark being built in stages only counts
// once it's finished; one bought whole in the Medieval era counts at once.
export function landmarkWorking(state: GameState, id: string) {
  if (!BUILDINGS_BY_ID[id]?.landmark) return false;
  if (!state.tiles.some((t) => t.building === id)) return false;
  return state.landmark?.kind !== id || landmarkDone(state);
}

// The next stage's cost (null when all three are paid for or it isn't placed).
export function nextStageCost(state: GameState): Partial<Resources> | null {
  const l = state.landmark;
  if (!l || l.stage < 1 || l.stage >= 3) return null;
  return buildingCost(state, { ...BUILDINGS_BY_ID[l.kind], cost: LANDMARKS[l.kind].stages[l.stage] });
}

export function stageError(state: GameState): string | null {
  const cost = nextStageCost(state);
  if (!cost) return "Nothing left to build";
  if (state.tick < (state.landmark?.readyTick ?? 0)) return "The masons are still at work";
  if (!canAfford(state, cost)) return "Not enough resources";
  return null;
}

export type Mood = "friendly" | "wary" | "hostile";
export function moodOf(mood: number): Mood {
  return mood >= DIPLOMACY.friendly ? "friendly" : mood <= DIPLOMACY.hostile ? "hostile" : "wary";
}

function changeMood(state: GameState, change: Partial<Record<KingdomId, number>>): GameState {
  if (!state.kingdoms) return state;
  const kingdoms = { ...state.kingdoms };
  for (const [id, by] of Object.entries(change) as [KingdomId, number][]) {
    const k = kingdoms[id];
    const mood = Math.max(-100, Math.min(100, k.mood + by));
    // A treaty breaks if relations turn sour.
    kingdoms[id] = { ...k, mood, treaty: k.treaty && mood >= 0 };
  }
  return { ...state, kingdoms };
}

export function giftCost(state: GameState, kingdom: KingdomId): Partial<Resources> {
  const sent = tallyOf(state, "gifts");
  return { currency: DIPLOMACY.gift.coins + Math.min(4, sent) * DIPLOMACY.gift.more + (kingdom === "reach" ? 10 : 0) };
}

export function giftError(state: GameState, kingdom: KingdomId): string | null {
  const k = state.kingdoms?.[kingdom];
  if (!k) return "Not yet";
  if (state.tick < (k.giftTick ?? -Infinity) + DIPLOMACY.gift.wait) return "Our envoy is still on the way";
  if (!canAfford(state, giftCost(state, kingdom))) return "Not enough coins";
  return null;
}

export function treatyError(state: GameState, kingdom: KingdomId): string | null {
  const k = state.kingdoms?.[kingdom];
  if (!k) return "Not yet";
  if (k.treaty) return "We already have a treaty";
  if (!state.researched.includes("diplomacy")) return "Learn Diplomacy first";
  if (moodOf(k.mood) !== "friendly") return "They must be friendly first";
  if (!canAfford(state, { currency: DIPLOMACY.treaty.coins })) return "Not enough coins";
  return null;
}

// ---- Raiding a kingdom ----

// How many warriors a raid sends, and how hard they fight together.
export function raidParty(state: GameState) {
  const sent = Math.floor(state.soldiers * KINGDOM_RAID.share);
  const perWarrior = state.soldiers
    ? (((state.soldiers - spearmenOf(state)) + spearmenOf(state) * SPEARMAN_STRENGTH) * armsFactor(state)) / state.soldiers
    : 0;
  return { sent, strength: sent * perWarrior };
}

// The chance (0-1) that a raid on this kingdom succeeds, given the luck roll.
export function raidOdds(state: GameState, kingdom: KingdomId) {
  const { strength } = raidParty(state);
  if (!strength) return 0;
  const need = (KINGDOM_RAID.defense[kingdom] * DIFFICULTIES[state.difficulty].raiders) / strength;
  return Math.max(0, Math.min(1, (1.25 - need) / 0.5));
}

export function kingdomRaidError(state: GameState, kingdom: KingdomId): string | null {
  const k = state.kingdoms?.[kingdom];
  if (!k) return "Not yet";
  if (state.plague) return "Not while the plague is coming";
  if (state.raid || state.legion) return "We are under attack ourselves";
  if (k.treaty) return "We have a treaty with them";
  if (state.tick < (state.raidedTick ?? -Infinity) + KINGDOM_RAID.wait) return "Our warriors are still recovering";
  if (raidParty(state).sent < KINGDOM_RAID.minWarriors) return `Need at least ${Math.ceil(KINGDOM_RAID.minWarriors / KINGDOM_RAID.share)} warriors`;
  return null;
}

function raidKingdom(state: GameState, kingdom: KingdomId): GameState {
  const { sent, strength } = raidParty(state);
  const luck = 0.75 + mulberry32(state.seed + state.tick * 71)() * 0.5;
  const won = strength * luck >= KINGDOM_RAID.defense[kingdom] * DIFFICULTIES[state.difficulty].raiders;
  const fell = Math.min(state.soldiers, Math.max(1, Math.round(sent * (won ? KINGDOM_RAID.losses.won : KINGDOM_RAID.losses.lost))));
  const loot = won ? KINGDOM_RAID.loot[kingdom] : {};
  const name = KINGDOMS[kingdom].name;
  const counted = bumpStats(state, (st) => {
    st.deaths.battle += fell;
  });
  const k = state.kingdoms![kingdom];
  const soldiers = state.soldiers - fell;
  const next: GameState = {
    ...counted,
    soldiers,
    spearmen: Math.min(spearmenOf(state), soldiers),
    resources: Object.fromEntries(
      Object.entries(state.resources).map(([r, v]) => [r, v + (loot[r as keyof Resources] ?? 0)]),
    ) as unknown as Resources,
    kingdoms: {
      ...state.kingdoms!,
      [kingdom]: { ...k, treaty: false, mood: Math.max(-100, Math.min(DIPLOMACY.hostile - 10, k.mood + KINGDOM_RAID.mood)) },
    },
    revenge: { kingdom, tick: state.tick + KINGDOM_RAID.revengeTicks },
    nextRaidTick: Math.min(state.nextRaidTick, state.tick + KINGDOM_RAID.revengeTicks),
    raidedTick: state.tick,
    modifiers: { ...state.modifiers, happiness: state.modifiers.happiness + (won ? 4 : -8) },
    log: [
      won
        ? `Our warriors raided ${name} and came back with ${Object.entries(loot)
            .map(([r, v]) => `${v} ${r === "currency" ? "coins" : r}`)
            .join(" and ")}. ${fell} fell. ${name[0].toUpperCase() + name.slice(1)} will want revenge.`
        : `Our raid on ${name} failed: ${fell} of ${sent} warriors fell. Now their army is coming for revenge.`,
      ...state.log,
    ].slice(0, 30),
  };
  return withMeters(next);
}

// Where ships sail from: a Shipyard, or the Grand Harbour once finished.
export function hasPort(state: GameState) {
  return (countBuildings(state).shipyard ?? 0) > 0 || landmarkWorking(state, "harbour");
}

export function shipCost(state: GameState): Partial<Resources> {
  const half = landmarkWorking(state, "harbour") ? 0.5 : 1;
  return Object.fromEntries(Object.entries(SHIP.cost).map(([k, v]) => [k, Math.round((v ?? 0) * half * travelDiscount(state))]));
}

export function shipTicks(state: GameState) {
  return Math.round(SHIP.ticks * (landmarkWorking(state, "harbour") ? 0.7 : 1));
}

export function shipError(state: GameState): string | null {
  if (!state.researched.includes("navigation")) return "Learn Ocean Ships first";
  if (!hasPort(state)) return "Build a Shipyard first";
  if (state.plague?.closed) return "The harbour is closed";
  const ports = (countBuildings(state).shipyard ?? 0) + (landmarkWorking(state, "harbour") ? 1 : 0);
  if ((state.ships ?? []).length >= ports) return "Every ship is at sea";
  if (!canAfford(state, shipCost(state))) return "Not enough food and wood";
  return null;
}

// Where the next ship will go: islands to settle first, then the kingdoms' coasts.
export function nextVoyage(state: GameState): { island: number; kind: "outpost" | "coast" } | null {
  const land = (i: number) => state.tiles.filter((t) => t.island === i);
  const known = (i: number) => land(i).some((t) => t.revealed);
  const order: [number, "outpost" | "coast"][] = [
    [3, "outpost"],
    [2, "coast"],
    [1, "coast"],
    [4, "outpost"],
  ];
  for (const [i, kind] of order) {
    if (!land(i).length) continue;
    if (kind === "outpost" ? !(state.outposts ?? []).includes(i) : !known(i)) return { island: i, kind };
  }
  return null;
}

// Ships come home: they find an island, meet a kingdom or bring back trade.
function returnShips(state: GameState): GameState {
  const due = (state.ships ?? []).filter((s) => state.tick >= s.back);
  if (!due.length) return state;
  let next: GameState = { ...state, ships: (state.ships ?? []).filter((s) => state.tick < s.back) };
  for (let n = 0; n < due.length; n++) {
    const voyage = nextVoyage(next);
    const say = (line: string) => ({ ...next, log: [line, ...next.log].slice(0, 30) });
    if (voyage) {
      const tiles = next.tiles.map((t) => (t.island === voyage.island && voyage.kind === "outpost" ? { ...t, revealed: true } : t));
      // A coast: the shore the ships saw.
      if (voyage.kind === "coast") {
        const coast = tiles.filter((t) => t.island === voyage.island && t.terrain === "beach");
        for (const c of coast) revealAround(tiles, c, 1);
      }
      next = { ...next, tiles };
      const name = ISLANDS[voyage.island]?.name ?? "an island";
      if (voyage.kind === "outpost") {
        next = { ...say(`Our ship found ${name}! We can build farms, fishing, woodcutters, pens and a Trading Post there. Each costs coins to keep supplied.`), outposts: [...(next.outposts ?? []), voyage.island] };
      } else {
        const kingdom = kingdomOfIsland(voyage.island)!;
        next = changeMood(say(`Our ship reached the coast of ${KINGDOMS[kingdom].name}. They welcomed our sailors.`), { [kingdom]: SHIP.meetMood });
      }
    } else {
      // Trade: silver, and a little goodwill with the kingdom they traded with.
      const kingdom: KingdomId = (next.tick + n) % 2 ? "steppe" : "reach";
      next = changeMood(
        {
          ...say(`A ship came back from ${KINGDOMS[kingdom].name} with silver and cloth (+${SHIP.coins} coins).`),
          resources: { ...next.resources, currency: next.resources.currency + SHIP.coins },
        },
        { [kingdom]: SHIP.mood },
      );
    }
  }
  // Ships bring sickness home as well as goods.
  const roll = mulberry32(state.seed + state.tick * 53)();
  return maybeOutbreak(next, isCalm(next) ? 0 : CARAVAN.sickness * (state.researched.includes("quarantine") ? 0.4 : 1), roll, "A ship brought it from overseas.");
}

// Moods drift back toward neutral; a treaty holds a kingdom friendly.
function updateKingdoms(state: GameState): GameState {
  if (!state.kingdoms) return state;
  const kingdoms = { ...state.kingdoms };
  for (const id of Object.keys(kingdoms) as KingdomId[]) {
    const k = kingdoms[id];
    const drift = Math.sign(k.mood) * Math.min(Math.abs(k.mood), DIPLOMACY.drift);
    kingdoms[id] = { ...k, mood: k.treaty ? Math.max(DIPLOMACY.treatyFloor, k.mood - drift) : k.mood - drift };
  }
  return { ...state, kingdoms };
}

// Kingdoms at war with us (their armies raid us in the Medieval era).
export function hostileKingdoms(state: GameState): KingdomId[] {
  return (Object.keys(state.kingdoms ?? {}) as KingdomId[]).filter((id) => moodOf(state.kingdoms![id].mood) === "hostile");
}

// Is the Black Death here (after the warning, before it ends)?
export function inPlague(state: GameState) {
  const p = state.plague;
  return !!p && state.tick >= p.startTick && state.tick < p.endTick;
}

// How ready the town is for the plague, part by part (0 to PLAGUE.maxProtection in all).
export function plagueProtection(state: GameState): { label: string; value: number }[] {
  const P = PLAGUE.protection;
  const p = state.plague;
  const c = countBuildings(state);
  const parts: { label: string; value: number }[] = [];
  if (state.researched.includes("quarantine")) parts.push({ label: "Quarantine", value: P.quarantine });
  if (p?.closed) {
    const early = (p.closedTick ?? 0) <= p.startTick;
    parts.push({ label: early ? "Harbour closed in time" : "Harbour closed late", value: early ? P.closedEarly : P.closedLate });
  } else {
    const links = (c.shipyard ?? 0) + (c.tradingpost ?? 0) + (landmarkWorking(state, "harbour") ? 2 : 0) + (c.market ?? 0);
    if (links) parts.push({ label: `Harbour open: ${links} port${links === 1 ? "" : "s"} and markets`, value: -Math.min(0.2, links * PLAGUE.openRisk) });
  }
  if (c.townhouse || c.latrine) parts.push({ label: `Clean streets (${Math.round(sanitation(state) * 100)}%)`, value: P.sanitation * sanitation(state) });
  const healers = Math.min(P.healersMax, c.healer ?? 0);
  if (healers) parts.push({ label: `${healers} Healer's Hut${healers === 1 ? "" : "s"}`, value: healers * P.healer });
  if (landmarkWorking(state, "cathedral")) parts.push({ label: "Cathedral caring for the sick", value: P.cathedral });
  return parts;
}

// How ready the town is, all parts together. Below 0 when an open harbour
// brings in more than the town has done to prepare.
export function plagueShield(state: GameState) {
  return Math.max(-0.2, Math.min(PLAGUE.maxProtection, plagueProtection(state).reduce((s, p) => s + p.value, 0)));
}

// The share of the town the plague would take over its whole course, at this
// level of readiness (PLAGUE.deaths: nothing ready -> fully ready).
export function plagueToll(state: GameState) {
  const [unready, ready] = PLAGUE.deaths[state.difficulty];
  return Math.max(0, Math.min(0.9, unready + ((ready - unready) * plagueShield(state)) / PLAGUE.maxProtection));
}

// The Black Death: the elders hear of it when the year comes; it arrives by ship
// a few minutes later; the town that comes through it has come through the
// Middle Ages (the final debrief). No raids meanwhile.
function updatePlague(state: GameState): GameState {
  if (state.era !== 3 || state.plagueDone || state.phase !== "playing") return state;
  const p = state.plague;
  if (!p) {
    if (state.year < PLAGUE.warnYear || state.raid) return state;
    const start = state.tick + PLAGUE.warnTicks;
    return {
      ...state,
      plague: { warnTick: state.tick, startTick: start, endTick: start + PLAGUE.ticks, closed: false, deaths: 0 },
      nextRaidTick: Number.MAX_SAFE_INTEGER,
      lastBigTick: state.tick,
      log: [
        "Sailors bring terrible news: a great sickness is spreading from port to port across the sea. It travels with the ships. Close the harbour? Build healers and latrines, learn Quarantine!",
        ...state.log,
      ].slice(0, 30),
    };
  }
  if (state.tick < p.startTick) return state;
  if (state.tick === p.startTick) {
    return { ...state, sick: 0, log: ["The Black Death has reached us. People fall sick with fever and dark swellings.", ...state.log].slice(0, 30) };
  }
  if (state.tick >= p.endTick) {
    const done: GameState = {
      ...state,
      plague: null,
      plagueDone: true,
      sick: 0,
      nextRaidTick: state.tick + RAID_GAP.base,
      log: [`The great sickness has passed. It took ${Math.round(p.deaths)} lives. ${state.nation ?? "Your people"} came through the Black Death.`, ...state.log].slice(0, 30),
    };
    return { ...done, debrief: makeDebrief(done, "final") };
  }
  const shield = plagueShield(state);
  // A steady rate that adds up to plagueToll() by the end.
  const rate = 1 - (1 - plagueToll(state)) ** (1 / PLAGUE.ticks);
  const died = Math.min(state.population - 1, state.population * rate);
  const counted = bumpStats(state, (st) => {
    st.deaths.plague = (st.deaths.plague ?? 0) + died;
  });
  return {
    ...counted,
    population: state.population - died,
    // Many are sick at once: they can't work.
    sick: (state.population - died) * PLAGUE.sickShare * (1 - shield),
    plague: { ...p, deaths: p.deaths + died },
  };
}

export function caravanCost(state: GameState): Partial<Resources> {
  const d = travelDiscount(state);
  return { food: Math.round((CARAVAN.cost.food ?? 0) * d), wood: Math.round((CARAVAN.cost.wood ?? 0) * d) };
}

export function caravanError(state: GameState): string | null {
  if (!state.researched.includes("barter-roads")) return "Research Silk Road Contact first";
  const markets = countBuildings(state).market ?? 0;
  if (!markets) return "Build a Market first";
  if ((state.caravans ?? []).length >= markets) return "Every Market's caravan is already out";
  if (state.plague?.closed) return "The harbour and the roads are closed";
  if (!canAfford(state, caravanCost(state))) return "Not enough food and wood";
  return null;
}

// The forest a new field would clear: the nearest unbuilt, unprotected forest tile in reach.
export function forestToClear(state: GameState, tile: Tile): Tile | null {
  const kept = state.protectedTiles ?? [];
  return (
    state.tiles
      .filter((t) => t.terrain === "forest" && !t.building && !kept.includes(t.id) && hexDistance(t, tile) <= FARM_RAIN.clearRange)
      .sort((a, b) => hexDistance(a, tile) - hexDistance(b, tile) || b.growth - a.growth)[0] ?? null
  );
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

// How much harm placing `building` here would do (what the placement card warns
// about): quarry dust on food buildings, a fire scaring a gatherer's game, a
// field clearing forest. The tutorial hand and guided steps avoid it.
export function placementHarm(state: GameState, tile: Tile, building: string): number {
  let harm = 0;
  if (building === "quarry")
    harm += 5 * state.tiles.filter((t) => t.building && QUARRY_DUST.hits.includes(t.building) && hexDistance(t, tile) <= QUARRY_DUST.range).length;
  if (dusty(state, tile, building)) harm += 5;
  if (scaredByFire(state, tile, building)) harm += 4;
  if (building === "campfire")
    harm += 4 * state.tiles.filter((t) => t.building === "gatherer" && hexDistance(t, tile) <= FIRE_SCARE.range).length;
  if (building === "farm" && forestToClear(state, tile)) harm += 2;
  if (sparkNote(state, tile, building)) harm += 3;
  return harm;
}

// Buildings on our overseas outposts.
export function overseasBuildings(state: GameState) {
  const home = state.tiles[state.startTile]?.island ?? 0;
  return state.tiles.filter((t) => t.building && t.island >= 0 && t.island !== home).length;
}

// Coins a tick to keep `n` overseas buildings supplied (each costs more than the last).
export function outpostUpkeep(state: GameState, n = overseasBuildings(state)) {
  return OUTPOST.upkeep * (n + (OUTPOST.growth * n * (n - 1)) / 2);
}

// What one more overseas building would add to the upkeep.
export function nextOutpostUpkeep(state: GameState) {
  return outpostUpkeep(state, overseasBuildings(state) + 1) - outpostUpkeep(state);
}

// Out of coins: the outposts can't be supplied and make nothing.
export function outpostsUnpaid(state: GameState) {
  const cost = outpostUpkeep(state);
  return cost > 0 && state.resources.currency < cost;
}

export function production(state: GameState): Resources {
  // No base Knowledge: it comes from milestones, teaching buildings and literacy.
  const out: Resources = { food: 0, wood: 0, stone: 0, knowledge: 0, currency: 0 };
  const home = state.tiles[state.startTile]?.island ?? 0;
  const port = hasPort(state);
  const closed = !!state.plague?.closed;
  const unpaid = outpostsUnpaid(state);
  for (const tile of state.tiles) {
    if (!tile.building) continue;
    // Under flood water nothing works until it goes down.
    if (isFlooded(state, tile)) continue;
    // Hard mode: a worn building makes less, a broken one nothing.
    const worn = wearFactor(tile);
    if (worn <= 0) continue;
    const def = BUILDINGS_BY_ID[tile.building];
    // A landmark gives nothing until it's finished.
    if (def.landmark && !landmarkWorking(state, tile.building)) continue;
    // An outpost overseas only ships its goods home while a port links it, and
    // not while the harbour is closed.
    if (tile.island >= 0 && tile.island !== home && (!port || closed || unpaid)) continue;
    // A closed harbour: no sea trade.
    if (closed && (tile.building === "harbour" || tile.building === "tradingpost")) continue;
    const factor =
      tile.building === "woodcutter"
        ? woodcutterYield(state, tile)
        : tile.building === "farm"
          ? farmFactor(state, tile)
          : // The drought dries up the wild plants and the grass for the herds.
            (tile.building === "gatherer" || tile.building === "pen") && inDrought(state)
            ? DROUGHT.wild
            : 1;
    const dust = (dusty(state, tile) ? 1 - QUARRY_DUST.foodLoss : 1) * (scaredByFire(state, tile) ? 1 - FIRE_SCARE.foodLoss : 1);
    // Gatherer camps share what the wild can give.
    const share =
      (tile.building === "gatherer" ? gathererShare(state) : teachingShare(state, tile.building)) *
      (state.tick < (state.helpers?.[tile.id] ?? 0) ? 1 + DROP.helpBoost : 1);
    for (const [k, v] of Object.entries(def.produces ?? {}))
      // Costs (a bathhouse burning wood) don't shrink as it wears; output does.
      out[k as keyof Resources] += (v ?? 0) * factor * share * (k === "food" ? dust : 1) * ((v ?? 0) > 0 ? worn : 1);
    if (def.depositBonus && tile.deposit === def.depositBonus.deposit) {
      for (const [k, v] of Object.entries(def.depositBonus.amount))
        out[k as keyof Resources] += (v ?? 0) * share;
    }
    if (tile.building === "fishing") {
      const fishNearby = state.tiles.some(
        (t) => t.deposit === "fish" && hexDistance(t, tile) === 1,
      );
      if (fishNearby) out.food += 0.4;
    }
  }
  // The Grand Harbour: fish sell well.
  if (landmarkWorking(state, "harbour") && !closed) out.food += (countBuildings(state).fishing ?? 0) * 0.4 * (LANDMARK.harbourFish - 1);
  // Bronze tools: each smithy (up to three) makes every worker 20% better.
  const smithies = countBuildings(state).smithy ?? 0;
  // Guild Halls train better smiths: each makes the tools 10% better.
  const guilds = smithies ? Math.min(3, countBuildings(state).guildhall ?? 0) : 0;
  const tools = (1 + 0.2 * Math.min(3, smithies)) * (1 + LEARNING.guildTools * guilds);
  out.food *= tools;
  out.wood *= tools;
  // ...but every smithy burns wood for charcoal, all the time (more for iron).
  out.wood -= smithies * SMITHY_CHARCOAL * (state.researched.includes("legions") ? IRON_CHARCOAL : 1);
  // Worn-out land gives smaller harvests.
  out.food *= 1 - 0.4 * landStrain(state);
  // The sick can't work (but they still eat).
  const workforce = 1 - 0.8 * sickShare(state);
  out.food *= workforce;
  out.wood *= workforce;
  const counts = countBuildings(state);
  out.currency += state.population * 0.02;
  out.knowledge += state.meters.literacy * 0.001;

  if (state.researched.includes("spears")) out.food *= 1.15;
  if (state.culture === "farmers") out.food *= 1.25;
  if (state.culture === "mariners") out.food += (counts.fishing ?? 0) * 0.45;
  if (state.culture === "scholars") out.knowledge *= 1.5;
  if (state.culture === "traders") out.currency *= 1.5;
  // Treaties: trade every day with a friendly kingdom (not while the harbour is closed).
  if (!closed) for (const k of Object.values(state.kingdoms ?? {})) if (k.treaty) out.currency += DIPLOMACY.treaty.trade;
  if (state.researched.includes("printing")) out.knowledge *= LEARNING.printingKnowledge;
  if (state.researched.includes("roads")) out.currency *= ROADS_COINS;
  // Keeping the outposts supplied (when we can pay; otherwise they stand idle).
  if (!unpaid) out.currency -= outpostUpkeep(state);
  return out;
}

export function consumption(state: GameState) {
  return (
    (state.population * FOOD_PER_PERSON + state.soldiers * FOOD_PER_WARRIOR * (state.researched.includes("knights") ? KNIGHTS.food : 1)) *
    DIFFICULTIES[state.difficulty].consumption *
    (eatingRaw(state) ? RAW_FOOD : 1)
  );
}

// No lit fire (after the tutorial): nothing can be cooked, so food goes less far.
export function eatingRaw(state: GameState) {
  return state.tutorialStep >= TUTORIAL.length && !state.tiles.some((t) => isLit(state, t));
}

// Every game starts with one woodcutter already working, so the player can
// never end up with no wood and no way to get more.
// A wildfire never kills more than this share of the tribe at once.
const FIRE_DEATH_SHARE = 0.25;

// Exactly what the tutorial makes the player buy, so they never have to wait.
export function tutorialBudget(state: GameState, steps = TUTORIAL.map((_, i) => i)): Resources {
  const total: Resources = { food: 0, wood: 0, stone: 0, knowledge: 0, currency: 0 };
  const add = (cost: Partial<Resources>) => {
    for (const [k, v] of Object.entries(cost)) total[k as keyof Resources] += v ?? 0;
  };
  for (const id of steps.flatMap((i) => TUTORIAL[i]?.buys ?? [])) {
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
  if (BUILDINGS_BY_ID[tile.building]?.landmark) return "A landmark stays for good";
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

// Real seconds per tick right now: First-time mode starts with a slower clock.
export function tickSeconds(state: GameState) {
  return state.difficulty === "first" && state.tick < GENTLE.slowTicks ? TICK_SECONDS * GENTLE.slowFactor : TICK_SECONDS;
}

// First-time mode spaces events and raids further apart for its first stretch.
function gapFactor(state: GameState) {
  return state.difficulty === "first" && state.tick < GENTLE.calmUntil ? GENTLE.gapFactor : 1;
}

export interface Warning {
  id: "fire" | "food" | "wood" | "famine" | "unrest" | "collapse" | "behind" | "land" | "sick" | "rain" | "wear" | "roof" | "hostile-steppe" | "hostile-reach";
  icon: IconId;
  text: string;
  // Ticks left on the countdown in the text; "{secs}" in the text is where it goes.
  countdown?: number;
  severe: boolean;
}

// Ticks left before the tribe falls behind the rest of the world (null when the
// clock isn't running: the tutorial, the Ancient era before the legion, the
// Classical era, or already ready to go). The Stone Age clock starts when the
// tutorial ends; the Ancient one when the Roman legion is beaten.
export function behindTicksLeft(state: GameState): number | null {
  if (state.phase !== "playing" || state.debrief || state.tutorialStep < TUTORIAL.length) return null;
  if (readyForNextEra(state)) return null;
  if (state.era === 0) {
    const deadline = ERA_DEADLINE[state.difficulty] ?? ERA_DEADLINE.normal;
    return deadline - (state.tick - (state.eraStartTick ?? 0));
  }
  if (state.era === 1 && state.legionBeatenTick !== undefined) {
    const deadline = ANCIENT_DEADLINE[state.difficulty] ?? ANCIENT_DEADLINE.normal;
    return deadline - (state.tick - state.legionBeatenTick);
  }
  return null;
}

// The Stone Age year at a given tick: from its start year to the Ancient era's
// start year over the deadline, counted from the end of the tutorial (it holds
// still during the tutorial).
export function stoneAgeYear(state: GameState, tick: number) {
  if (state.eraStartTick === undefined) return state.year;
  const deadline = ERA_DEADLINE[state.difficulty] ?? ERA_DEADLINE.normal;
  const progress = Math.min(1, Math.max(0, (tick - state.eraStartTick) / deadline));
  return ERAS[0].startYear + (ERAS[1].startYear - ERAS[0].startYear) * progress;
}

// The year at the next tick. The Stone Age follows its deadline; so does the
// Ancient era once the legion is beaten (reaching the Classical era's first year
// exactly as the world moves on). Otherwise a fixed number of years a tick,
// slowing down over the last YEAR_EASE years and settling one year before the
// next era's first year (entering an era sets the year to its start, so going
// past it would make the calendar jump back). The top bar rolls the year
// towards this between ticks.
const YEAR_EASE = 50;
export function nextYear(state: GameState): number {
  const tick = state.tick + 1;
  if (state.era === 0) return stoneAgeYear(state, tick);
  if (state.era === 1 && state.legionBeatenTick !== undefined) {
    const from = state.legionBeatenYear ?? state.year;
    const deadline = ANCIENT_DEADLINE[state.difficulty] ?? ANCIENT_DEADLINE.normal;
    const progress = Math.min(1, Math.max(0, (tick - state.legionBeatenTick) / deadline));
    return from + (ERAS[2].startYear - from) * progress;
  }
  const next = ERAS[state.era + 1];
  const perTick = ERAS[state.era].yearsPerTick;
  if (!next) return state.year + perTick;
  const last = next.startYear - 1;
  const left = last - state.year;
  if (left <= 0) return state.year;
  return Math.min(last, state.year + perTick * Math.max(0.05, Math.min(1, left / YEAR_EASE)));
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
      text: "Your people are starving: about one dies every 10 s, and those we can't feed leave. The tribe is lost in {secs}s unless you find food.",
      countdown: Math.max(0, famineLimit - state.famineTicks) / (inDrought(state) ? FAMINE.droughtClock : 1),
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

  // People with no roof over their heads: say why, if a home was just lost.
  const homeless = homelessCount(state);
  if (homeless > 0) {
    const lost = state.homeLost && state.tick - state.homeLost.tick < 120 ? state.homeLost : null;
    out.push({
      id: "roof",
      icon: "hut",
      text: `${lost ? `We lost a ${lost.name}. ` : ""}${homeless} ${homeless === 1 ? "person has" : "people have"} no roof over their heads: build homes. Sleeping out in the cold makes people unhappy (−${homelessMood(state)} happiness) and sick.`,
      severe: !!lost || state.meters.shelter < 30,
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

  // A kingdom at war with us sends its armies.
  for (const id of hostileKingdoms(state)) {
    out.push({
      id: `hostile-${id}`,
      icon: "crown",
      text: `${KINGDOMS[id].name[0].toUpperCase()}${KINGDOMS[id].name.slice(1)} is hostile: its armies will attack. Send gifts from Kingdoms, or build up our defense.`,
      severe: false,
    });
  }

  const behind = behindTicksLeft(state);
  if (behind !== null && behind <= LEFT_BEHIND_WARN) {
    out.push({
      id: "behind",
      icon: "warning",
      text:
        state.era === 0
          ? `The world is moving on: other peoples have learned to farm. Reach the Ancient era before ${formatYear(ERAS[1].startYear)} (in {secs}s) or be left behind.`
          : `The world is moving on: other peoples trade with coins and build towns. Reach the Classical era before ${formatYear(ERAS[2].startYear)} (in {secs}s) or be left behind.`,
      countdown: Math.max(0, behind),
      severe: true,
    });
  }

  if ((state.collapseTicks ?? 0) > 0) {
    out.push({
      id: "collapse",
      icon: "leaf",
      text: `The land is collapsing! Sustainability is below ${COLLAPSE.level}. Plant trees, log selectively and stop clearing forest, or your people must leave in {secs}s.`,
      countdown: Math.max(0, COLLAPSE.ticks - (state.collapseTicks ?? 0)),
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

  if (state.strainTicks > 0 && landStrain(state) > 0) {
    // Name what is costing the land the most, so the fix is clear.
    const worst = sustainabilityBreakdown(state)
      .filter((p) => p.value < 0)
      .sort((a, b) => a.value - b.value)[0];
    const cause = worst ? ` The biggest cost: ${worst.label.toLowerCase()} (${Math.round(worst.value)}).` : "";
    out.push({
      id: "land",
      icon: "leaf",
      text:
        (landStrain(state) >= 1
          ? "The land is exhausted: forests have stopped growing back and harvests are shrinking."
          : "The land is wearing out: forests grow back slower and harvests shrink.") + cause,
      severe: landStrain(state) > 0.5,
    });
  }

  if (wearsOut(state)) {
    const worn = state.tiles.filter((t) => t.building && (t.worn ?? 0) >= WEAR.warnAt);
    const broken = worn.filter((t) => (t.worn ?? 0) >= 1).length;
    if (worn.length) {
      out.push({
        id: "wear",
        icon: "hammer",
        text: `${worn.length} building${worn.length === 1 ? "" : "s"} need${worn.length === 1 ? "s" : ""} repair${broken ? ` (${broken} broken down and making nothing)` : ""}. Click one to repair it.`,
        severe: broken > 0,
      });
    }
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

  // (In the great drought its own banner says so.)
  if ((countBuildings(state).farm ?? 0) > 0 && rainfall(state) < FARM_RAIN.warnBelow && !inDrought(state)) {
    out.push({
      id: "rain",
      icon: "wheat",
      text: `The rains are failing: fields grow only ${Math.round(rainfall(state) * 100)}%. Forests bring rain, so plant saplings.`,
      severe: rainfall(state) < 0.65,
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
        ? `No campfire! Your people are cold (−${NO_FIRE_PENALTY} happiness) and eat their food raw (${Math.round((RAW_FOOD - 1) * 100)}% more food).`
        : `Your campfire has gone out. Click it to relight it (${RELIGHT_WOOD} wood). Your people are cold (−${NO_FIRE_PENALTY} happiness) and eat their food raw (${Math.round((RAW_FOOD - 1) * 100)}% more food).`,
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
  const dugTotal = state.tiles.reduce((sum, t) => sum + (t.dug ?? 0), 0);
  const cutHills = state.tiles.filter((t) => (t.dug ?? 0) > 0).length;
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
      label: `${cutHills} hillside${cutHills === 1 ? "" : "s"} cut away by quarries`,
      value: -((counts.quarry ?? 0) * QUARRY_CUT.perQuarry + dugTotal * QUARRY_CUT.perHill),
      hint: "Quarries cut the hill down for good: the scar stays even after the quarry is gone. Their dust also smothers nearby crops.",
    },
    {
      label: `${counts.gatherer ?? 0} gatherer camp${counts.gatherer === 1 ? "" : "s"} hunting the wild`,
      value: -Math.max(0, (counts.gatherer ?? 0) - GATHERING.freeCamps) * GATHERING.sustainPerExtra,
      hint: `The wild can feed ${GATHERING.freeCamps} camps. Past that, animals are hunted faster than they can have young, and there are fewer each year.`,
    },
    {
      label: `${counts.watchfire ?? 0} watch fire${counts.watchfire === 1 ? "" : "s"} burning`,
      value: -(counts.watchfire ?? 0) * WATCH_FIRE.smoke,
      hint: "Watch fires burn wood day and night and add smoke.",
    },
    {
      label: `${counts.farm ?? 0} field${counts.farm === 1 ? "" : "s"} cleared${state.researched.includes("three-field") ? " (resting in turn)" : ""}`,
      value: -(counts.farm ?? 0) * (state.researched.includes("three-field") ? FARMING.rotationStrain : 1),
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
      label: `${counts.well ?? 0} wells drawing down the ground water`,
      value: -Math.max(0, (counts.well ?? 0) - WATER.wellsFree) * WATER.wellSustain,
      hint: `The ground can feed ${WATER.wellsFree} wells. Past that, the water under the ground sinks and the land around dries out.`,
    },
    {
      label: `${(counts.aqueduct ?? 0) + (counts.watermill ?? 0)} aqueduct${(counts.aqueduct ?? 0) + (counts.watermill ?? 0) === 1 ? "" : "s"} and mills on the river`,
      value: -((counts.aqueduct ?? 0) * 3 + (counts.watermill ?? 0) * 2),
      hint: "Every aqueduct takes water from the river, and every mill dams it. Fish and marshes downstream suffer.",
    },
    {
      label: `${counts.latrine ?? 0} latrine${counts.latrine === 1 ? "" : "s"} draining into the river`,
      value: -(counts.latrine ?? 0) * 1,
      hint: "The drains keep the streets clean, but the waste ends up downstream.",
    },
    {
      label: `${counts.baths ?? 0} bathhouse${counts.baths === 1 ? "" : "s"} heating water`,
      value: -(counts.baths ?? 0) * 2,
      hint: "Bathhouses burn wood all day to heat their pools.",
    },
    {
      label: "Recent events",
      value: state.modifiers.sustainability,
      hint: "Fires and choices you made in events. This fades over time.",
    },
  ];
  // Only what is actually costing (or helping) the land right now.
  return parts.filter((p) => Math.abs(p.value) >= 0.5);
}

// How much Sustainability changed over roughly the last minute of play.
export function sustainabilityTrend(state: GameState) {
  const trail = state.sustainTrail ?? [];
  if (trail.length < 2) return 0;
  return state.meters.sustainability - trail[0];
}

// Share of the tribe with no fire to warm them (each fire warms peoplePerFire).
// Warm clothes (pens) and Town Houses (shared walls and hearths) warm people too.
export function coldShare(state: GameState) {
  const counts = countBuildings(state);
  const pens = state.researched.includes("hide-clothing") ? counts.pen ?? 0 : 0;
  const warmed =
    litFires(state).length * GROWTH_PRESSURE.peoplePerFire +
    pens * GROWTH_PRESSURE.peoplePerPen +
    (counts.townhouse ?? 0) * TOWN.warmth;
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

// Does someone tend this campfire (add wood when it burns out)? Yes unless
// the player sent the keeper away.
export function tended(state: GameState, tile: Tile) {
  return tile.building === "campfire" && !(state.untended ?? []).includes(tile.id);
}

// Keepers add wood to their fires as they burn out (1 wood each, like
// relighting), as long as there is wood and no storm is putting them out.
function keepFires(state: GameState): GameState {
  if (state.tutorialStep < TUTORIAL.length) return state;
  if (state.disaster?.kind === "storm" && disasterActive(state)) return state;
  let next = state;
  for (const t of state.tiles) {
    if (!tended(next, t) || isLit(next, t) || next.resources.wood < RELIGHT_WOOD) continue;
    next = addTally(
      {
        ...next,
        fires: { ...next.fires, [t.id]: burnTicks(next) },
        resources: { ...next.resources, wood: next.resources.wood - RELIGHT_WOOD },
      },
      "relights",
      1,
    );
  }
  return next;
}

export function litFires(state: GameState) {
  return state.tiles.filter((t) => isLit(state, t));
}

export function burnTicks(state: GameState) {
  return Math.round(CAMPFIRE_BURN_TICKS * (state.researched.includes("firekeeping") ? 1.5 : 1));
}

export function warriorCap(state: GameState) {
  const counts = countBuildings(state);
  return (counts.warcamp ?? 0) * WARRIORS_PER_CAMP + (counts.castle ?? 0) * CASTLE.warriors;
}

// Warriors carrying spears (older saves are converted when loaded).
export function spearmenOf(state: GameState): number {
  const n = state.spearmen ?? 0;
  return Math.max(0, Math.min(state.soldiers, n));
}

// How hard each warrior fights: bronze doubles it, iron triples it.
function armsFactor(state: GameState) {
  if (state.researched.includes("knights")) return KNIGHTS.strength;
  return state.researched.includes("legions") ? IRON_STRENGTH : state.researched.includes("bronze-arms") ? 2 : 1;
}

export function defenseStrength(state: GameState) {
  const bronze = armsFactor(state);
  const spears = spearmenOf(state);
  const counts = countBuildings(state);
  return (
    ((state.soldiers - spears) + spears * SPEARMAN_STRENGTH) * bronze +
    ((counts.warcamp ?? 0) > 0 ? 1 : 0) +
    (counts.walls ?? 0) * WALL_DEFENSE +
    (counts.castle ?? 0) * CASTLE.defense +
    watchDefense(state)
  );
}

// Lookouts at the watch fires add a little defense (up to WATCH_FIRE.maxDefense).
export function watchDefense(state: GameState) {
  return Math.min(WATCH_FIRE.maxDefense, (countBuildings(state).watchfire ?? 0) * WATCH_FIRE.defense);
}

// Where the defense number comes from, in words: "4 warriors × 1.5 (spears) + 1 war camp".
export function defenseBreakdown(state: GameState): string {
  const arms = armsFactor(state);
  const spears = spearmenOf(state);
  const plain = state.soldiers - spears;
  const counts = countBuildings(state);
  const parts: string[] = [];
  if (plain || !spears) parts.push(`${plain} warrior${plain === 1 ? "" : "s"}`);
  if (spears) parts.push(`${spears} spear${spears === 1 ? "man" : "men"} × ${SPEARMAN_STRENGTH}`);
  let text = parts.join(" + ");
  if (arms > 1) text = `(${text}) × ${arms} ${arms === KNIGHTS.strength ? "knights" : arms === IRON_STRENGTH ? "iron" : "bronze"}`;
  if ((counts.warcamp ?? 0) > 0) text += " + 1 war camp";
  if (counts.walls) text += ` + ${counts.walls * WALL_DEFENSE} walls`;
  if (counts.castle) text += ` + ${counts.castle * CASTLE.defense} castle${counts.castle === 1 ? "" : "s"}`;
  if (watchDefense(state)) text += ` + ${watchDefense(state)} watch fire${watchDefense(state) === 1 ? "" : "s"}`;
  return text;
}

const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));

// The seed grain was eaten in a famine: fields grow less until it is replaced.
export function seedEaten(state: GameState) {
  return state.tick < (state.seedEatenUntil ?? 0);
}

export type FamineRelief = "forage" | "pen" | "seed";

// What the tribe can do in a famine right now, and why not when it can't.
export function famineOptions(state: GameState): { id: FamineRelief; label: string; note: string; ok: boolean }[] {
  const counts = countBuildings(state);
  const forageWait = (state.forageReadyAt ?? 0) - state.tick;
  return [
    {
      id: "forage",
      label: `Forage (+${FAMINE.forage.food} food)`,
      note: forageWait > 0 ? `The forest is picked bare (${secs(forageWait)}s)` : "Strips the nearby forest",
      ok: forageWait <= 0 && foragePatch(state).length > 0,
    },
    {
      id: "pen",
      label: `Slaughter a herd (+${FAMINE.pen.food} food)`,
      note: counts.pen ? "A Livestock Pen is lost" : "Needs a Livestock Pen",
      ok: !!counts.pen,
    },
    {
      id: "seed",
      label: `Eat the seed grain (+${FAMINE.seed.food} food)`,
      note: seedEaten(state) ? "Already eaten" : counts.farm ? `Fields grow half as much for ${secs(FAMINE.seed.ticks)}s` : "Needs Farmland",
      ok: !!counts.farm && !seedEaten(state),
    },
  ];
}

// The forest tiles nearest home that foragers would strip.
function foragePatch(state: GameState): Tile[] {
  const home = state.tiles[state.startTile];
  const kept = state.protectedTiles ?? [];
  return state.tiles
    .filter((t) => t.terrain === "forest" && !t.building && !kept.includes(t.id) && t.growth > 0.2 && hexDistance(t, home) <= LAND.radius)
    .sort((a, b) => hexDistance(a, home) - hexDistance(b, home))
    .slice(0, FAMINE.forage.tiles);
}

// The Food & Water meter is not the stored food: it says whether the tribe makes
// enough to eat. Explained on hover so the two numbers aren't confused.
export function foodMeterNote(state: GameState): string {
  const made = production(state).food;
  const eaten = Math.max(consumption(state), 0.1);
  const ratio = made / eaten;
  const now =
    ratio < 0.9
      ? "You make less food than you eat, so the store is shrinking."
      : ratio <= 1.1
        ? "You make about as much food as you eat."
        : "You make more food than you eat.";
  return `${now} 45 means just enough. Stored food (top bar) adds only a little.`;
}

export function computeMeters(state: GameState): Meters {
  const counts = countBuildings(state);
  const prod = production(state);
  const cons = consumption(state);
  const stockDays = state.resources.food / Math.max(cons, 0.1);

  // Mostly "do we make enough for everyone?", so it drops as the tribe grows.
  // 45 means "just enough"; you need about twice what you eat to reach 100.
  let food = (prod.food / Math.max(cons, 0.1)) * 45 + Math.min(10, stockDays / 4);
  if (state.resources.food <= 0) food = Math.min(food, 5);
  // Food & Water: in the drought, people without water count too.
  const thirst = thirstShare(state);
  food *= 1 - 0.3 * thirst;

  const shelter =
    Math.min(1.1, housingCapacity(state) / Math.max(1, state.population)) * 70 +
    (counts.healer ?? 0) * 12 +
    // Clean water keeps people healthy; dirty, crowded streets don't.
    Math.min(15, (counts.well ?? 0) * 3 + (counts.aqueduct ?? 0) * 6) -
    (1 - sanitation(state)) * 12;

  const fireBoost = state.researched.includes("firekeeping") ? 1.5 : 1;
  const lit = litFires(state).length;
  const energy = lit * 20 * fireBoost + (counts.townhouse ?? 0) * 10 + (counts.windmill ?? 0) * FARMING.windmillEnergy;

  // How healthy the land is (see sustainabilityBreakdown for the parts).
  const sustainability = 100 + sustainabilityBreakdown(state).reduce((sum, p) => sum + p.value, 0);

  const literacy =
    (counts.elder ?? 0) * 12 +
    (counts.school ?? 0) * 15 +
    (counts.academy ?? 0) * 15 +
    (counts.university ?? 0) * LEARNING.universityLiteracy +
    (landmarkWorking(state, "library") ? LANDMARK.libraryLiteracy : 0) +
    (state.researched.includes("printing") ? LEARNING.printingLiteracy : 0) +
    (state.researched.length - 1) * 2;

  const happiness =
    clamp(food) * 0.35 +
    clamp(shelter) * 0.35 +
    Math.min(3, lit) * 6 +
    (counts.elder ? 5 : 0) -
    // No cold penalty while the tutorial is still teaching you to light a fire.
    (state.tutorialStep < TUTORIAL.length ? 0 : NO_FIRE_PENALTY * coldShare(state)) -
    (100 - clamp(sustainability)) * 0.15 -
    sickShare(state) * 30 -
    (state.famineTicks > 0 ? FAMINE.happiness : 0) -
    homelessMood(state) -
    thirst * DROUGHT.thirstMood +
    Math.min(2, counts.baths ?? 0) * TOWN.bathsMood +
    (landmarkWorking(state, "cathedral") ? LANDMARK.cathedralMood : 0) -
    Math.min(2, counts.guildhall ?? 0) * LEARNING.guildMood +
    state.modifiers.happiness;

  return {
    food: clamp(food),
    shelter: clamp(shelter),
    // Grief comes off after the cap, so a happy tribe still feels it.
    happiness: Math.max(0, clamp(happiness) - Math.round(state.grief ?? 0)),
    literacy: clamp(literacy),
    energy: clamp(energy),
    sustainability: clamp(sustainability),
  };
}

function checkSecrets(state: GameState): GameState {
  const counts = countBuildings(state);
  if (!state.secretsFound.includes("far-shores") && tallyOf(state, "ships") >= SHIP.secret) {
    return {
      ...state,
      secretsFound: [...state.secretsFound, "far-shores"],
      cutscene: "far-shores",
      researched: [...state.researched, "far-shores"],
      resources: { ...state.resources, knowledge: state.resources.knowledge + SHIP.secretKnowledge },
      modifiers: { ...state.modifiers, happiness: state.modifiers.happiness + SHIP.secretHappiness },
      log: ["Secret discovered: Far Shores! Our ships have sailed further than anyone before.", ...state.log].slice(0, 30),
    };
  }
  if (!state.secretsFound.includes("silk-secret") && tallyOf(state, "caravans") >= JADE_ROAD.caravans) {
    return {
      ...state,
      secretsFound: [...state.secretsFound, "silk-secret"],
      cutscene: "silk-secret",
      researched: [...state.researched, "silk-secret"],
      resources: { ...state.resources, knowledge: state.resources.knowledge + JADE_ROAD.knowledge },
      modifiers: { ...state.modifiers, happiness: state.modifiers.happiness + JADE_ROAD.happiness },
      log: ["Secret discovered: the Jade Road! Our caravans found the way to the far east.", ...state.log].slice(0, 30),
    };
  }
  if (!state.secretsFound.includes("cave-paintings") && (counts.elder ?? 0) >= 2) {
    return {
      ...state,
      secretsFound: [...state.secretsFound, "cave-paintings"],
      cutscene: "cave-paintings",
      researched: [...state.researched, "cave-paintings"],
      resources: { ...state.resources, knowledge: state.resources.knowledge + CAVE_PAINTINGS_KNOWLEDGE },
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
    case "rain":
      return rainfall(state) < FARM_RAIN.warnBelow && (countBuildings(state).farm ?? 0) > 0;
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
    case "water":
      return (countBuildings(state).well ?? 0) > 0;
    case "sanitation":
      return (countBuildings(state).townhouse ?? 0) > 0 && sanitation(state) < 0.5;
    case "river":
      return (countBuildings(state).aqueduct ?? 0) + (countBuildings(state).watermill ?? 0) > 0;
    case "towns":
      return (countBuildings(state).townhouse ?? 0) >= 2;
    case "trade":
      return tallyOf(state, "caravans") > 0 && !(state.caravans ?? []).length;
    case "drought":
      return !!state.drought;
    case "disasters":
      return tallyOf(state, "disasters") > 0 && !state.disaster;
    case "slopes":
      return tallyOf(state, "landslides") > 0 && !state.disaster;
    case "clearing":
      return state.researched.includes("heavy-plough") && forestCover(state) < 0.75;
    case "peace":
      return state.era >= 3 && Object.values(state.kingdoms ?? {}).some((k) => k.treaty || moodOf(k.mood) === "hostile");
    case "oceans":
      return tallyOf(state, "ships") > 0 && !(state.ships ?? []).length;
    case "plague":
      return inPlague(state);
    default:
      return false;
  }
}

// Every milestone reached for the first time: [id, what happened, Knowledge].
function milestonesReached(state: GameState): [string, string, number][] {
  const M = KNOWLEDGE_MILESTONES;
  const out: [string, string, number][] = [];
  for (const [id, n] of Object.entries(countBuildings(state)))
    if (n > 0 && BUILDINGS_BY_ID[id]) out.push([`build-${id}`, `our first ${BUILDINGS_BY_ID[id].name}`, M.firstBuilding]);
  for (const p of M.population)
    if (state.population >= p) out.push([`pop-${p}`, `our tribe has grown to ${p} people`, M.populationReward]);
  if ((state.stats?.raidsWon ?? 0) > 0) out.push(["raid", "we held off raiders", M.firstRaidWon]);
  if ((state.planted ?? 0) > 0) out.push(["plant", "we planted our first saplings", M.firstPlanted]);
  return out;
}

// Where Knowledge comes from, for the "How to get Knowledge" panel: what
// teaches every day (per tick), and the one-time firsts still to come.
export function knowledgeSources(state: GameState) {
  const counts = countBuildings(state);
  const bonus = state.culture === "scholars" ? 1.5 : 1;
  const daily: { label: string; perTick: number }[] = [];
  for (const [id, n] of Object.entries(counts)) {
    const k = BUILDINGS_BY_ID[id]?.produces?.knowledge ?? 0;
    if (k > 0 && n > 0)
      daily.push({ label: `${n} ${BUILDINGS_BY_ID[id].name}${n > 1 ? "s" : ""}`, perTick: k * n * teachingShare(state, id) * bonus });
  }
  daily.push({ label: `Literacy ${state.meters.literacy}`, perTick: state.meters.literacy * 0.001 * bonus });
  const M = KNOWLEDGE_MILESTONES;
  const done = state.milestones ?? [];
  // Milestones get the Scholars bonus; scouting, caravans and levels don't.
  const firsts: { label: string; gain: number }[] = [];
  const milestone = (label: string, gain: number) => firsts.push({ label, gain: Math.round(gain * bonus) });
  const unbuilt = Object.values(BUILDINGS_BY_ID).filter(
    (d) => isUnlocked(state, d) && !counts[d.id] && !done.includes(`build-${d.id}`),
  );
  if (unbuilt.length)
    milestone(`Build your first ${unbuilt.slice(0, 3).map((d) => d.name).join(", ")}${unbuilt.length > 3 ? "..." : ""} (each new kind)`, M.firstBuilding);
  for (const p of M.population) if (!done.includes(`pop-${p}`)) milestone(`Grow to ${p} people`, M.populationReward);
  if (!done.includes("raid")) milestone("Drive off raiders for the first time", M.firstRaidWon);
  if (!done.includes("plant") && state.researched.includes("early-farming")) milestone("Plant your first saplings", M.firstPlanted);
  const trips = Math.max(0, SCOUT_KNOWLEDGE.trips - state.scoutsSent);
  if (trips) firsts.push({ label: `Send scouts (${trips} more trip${trips === 1 ? "" : "s"} teach us; big ones +2)`, gain: 1 });
  // Caravans to the Silk Steppe bring new ideas home (Classical era).
  if (state.researched.includes("barter-roads")) firsts.push({ label: "Each caravan that comes home", gain: CARAVAN.knowledge });
  firsts.push({ label: "Each new chief level", gain: XP.levelKnowledge });
  return { daily, firsts };
}

// Pay out Knowledge for new milestones, once each.
function knowledgeMilestones(state: GameState): GameState {
  const done = state.milestones ?? [];
  const fresh = milestonesReached(state).filter(([id]) => !done.includes(id));
  if (!fresh.length) return state;
  const bonus = state.culture === "scholars" ? 1.5 : 1;
  const gain = Math.round(fresh.reduce((sum, [, , k]) => sum + k, 0) * bonus);
  // Several at once (e.g. after the tutorial): one short line, not a list.
  const what = fresh.length > 2 ? `${fresh.length} firsts for our tribe` : fresh.map(([, text]) => text).join(", ");
  return {
    ...state,
    milestones: [...done, ...fresh.map(([id]) => id)],
    resources: { ...state.resources, knowledge: state.resources.knowledge + gain },
    log: [`Milestone: ${what}. We learned from ${fresh.length > 1 ? "them" : "it"} (+${gain} Knowledge).`, ...state.log].slice(0, 30),
  };
}

// ---- Advancement goals ------------------------------------------------------

// How many times something has happened this game (some come from other counters).
export function tallyOf(state: GameState, key: TallyKey): number {
  if (key === "scouts") return state.scoutsSent;
  if (key === "planted") return state.planted ?? 0;
  if (key === "raidsWon") return state.stats?.raidsWon ?? 0;
  return state.tally?.[key] ?? 0;
}

function addTally(state: GameState, key: TallyKey, n: number): GameState {
  if (n <= 0) return state;
  return { ...state, tally: { ...state.tally, [key]: (state.tally?.[key] ?? 0) + n } };
}

// An advancement you could work toward now: everything it needs is researched.
export function reachable(state: GameState, node: TreeNode): boolean {
  return (
    !node.secret &&
    !node.comingSoon &&
    !state.researched.includes(node.id) &&
    node.requires.every((r) => state.researched.includes(r))
  );
}

// Remember each goal's starting count the moment its advancement becomes reachable.
function snapshotGoals(state: GameState): GameState {
  const start = state.goalStart ?? {};
  const fresh = TREE.filter((n) => ADVANCEMENT_GOALS[n.id] && !start[n.id] && reachable(state, n));
  if (!fresh.length) return state;
  const next = { ...start };
  for (const n of fresh) {
    const snap: Partial<Record<TallyKey, number>> = {};
    for (const g of ADVANCEMENT_GOALS[n.id]) if (g.key) snap[g.key] = tallyOf(state, g.key);
    next[n.id] = snap;
  }
  return { ...state, goalStart: next };
}

function goalHave(state: GameState, nodeId: string, g: Goal): number {
  switch (g.kind) {
    case "tally": {
      // Victories count whenever they happened: raids stop once the legion is on its way.
      if (g.key === "raidsWon") return tallyOf(state, "raidsWon");
      const start = state.goalStart?.[nodeId]?.[g.key!];
      // Not reachable yet: nothing counts.
      return start === undefined ? 0 : tallyOf(state, g.key!) - start;
    }
    case "have":
      return countBuildings(state)[g.building!] ?? 0;
    case "population":
      return Math.floor(state.population);
    case "stored":
      return Math.floor(state.resources[g.resource!]);
    case "berryCamp":
      return state.tiles.some((t) => t.building === "gatherer" && t.deposit === "berries") ? 1 : 0;
  }
}

// Each goal of an advancement with how far along it is.
export function goalProgress(state: GameState, nodeId: string) {
  return (ADVANCEMENT_GOALS[nodeId] ?? []).map((g) => {
    const have = Math.min(g.amount, Math.max(0, Math.floor(goalHave(state, nodeId, g))));
    return { label: g.label, have, need: g.amount, done: have >= g.amount };
  });
}

export function goalsMet(state: GameState, nodeId: string): boolean {
  if (state.devGoals) return true;
  return goalProgress(state, nodeId).every((g) => g.done);
}

// ---- The guided step after an advancement ---------------------------------

function coachCount(state: GameState, node: string): number {
  const step = AFTER_STEPS[node];
  if (step?.upgrade) return spearmenOf(state);
  return step?.build ? countBuildings(state)[step.build] ?? 0 : 0;
}

// A build step is done once one more of that building stands.
function advanceCoach(state: GameState): GameState {
  const c = state.coach;
  if (!c) return state;
  const step = AFTER_STEPS[c.node];
  if ((step?.build || step?.upgrade) && coachCount(state, c.node) > c.from) return { ...state, coach: null };
  return state;
}

// What an advancement costs: the Great Library makes each one 10% cheaper.
export function researchCost(state: GameState, node: TreeNode) {
  return landmarkWorking(state, "library") ? Math.ceil(node.cost * LANDMARK.libraryDiscount) : node.cost;
}

// Advancements the tribe could research right now with the Knowledge it has.
export function affordableResearch(state: GameState) {
  if (state.tutorialStep < TUTORIAL.length) return [];
  return TREE.filter(
    (n) =>
      !n.secret &&
      !n.comingSoon &&
      !state.researched.includes(n.id) &&
      n.requires.every((r) => state.researched.includes(r)) &&
      state.resources.knowledge >= researchCost(state, n) &&
      goalsMet(state, n.id),
  );
}

// When Knowledge first covers an advancement, Elder Ama says so (once each).
function knowledgeReady(state: GameState): GameState {
  const told = state.knowledgeNotified ?? [];
  const fresh = affordableResearch(state)
    .filter((n) => !told.includes(n.id))
    .sort((a, b) => a.cost - b.cost);
  if (!fresh.length) return state;
  const node = fresh[0];
  return {
    ...state,
    knowledgeNotified: [...told, ...fresh.map((n) => n.id)],
    log: [`Elder Ama: "We have learned enough for ${node.name}. Open Advancements to spend our Knowledge."`, ...state.log].slice(0, 30),
  };
}

// One big moment at a time: nothing new starts within QUIET_GAP of the last.
export function quietEnough(state: GameState): boolean {
  return state.tick - (state.lastBigTick ?? -Infinity) >= QUIET_GAP;
}

// Show the next elder lesson whose moment has come: one at a time, spaced out,
// never during the tutorial or an event.
export function lessonDue(state: GameState): GameState {
  if (state.tutorialStep < TUTORIAL.length || state.lesson || state.event || state.phase !== "playing") return state;
  if (state.tick - (state.lessonTick ?? -LESSON_GAP) < LESSON_GAP) return state;
  if (!quietEnough(state)) return state;
  const seen = state.lessonsSeen ?? [];
  const next = LESSONS.find((l) => !seen.includes(l.id) && lessonReady(l.id, state));
  if (!next) return state;
  return { ...state, lesson: next.id, lessonsSeen: [...seen, next.id], lessonTick: state.tick, lastBigTick: state.tick };
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

// Ready to leave this era. Stone Age: Agriculture and 15 people. Ancient era:
// the Roman legion beaten, Coinage and 40 people.
export function readyForNextEra(state: GameState) {
  if (state.phase !== "playing" || state.debrief) return false;
  if (state.era === 0) return state.researched.includes("agriculture") && state.population >= NEXT_ERA_POPULATION;
  if (state.era === 1)
    return !!state.legionDone && state.researched.includes("coinage") && state.population >= CLASSICAL_POPULATION;
  if (state.era === 2) return !!state.droughtDone && landmarkDone(state);
  return false;
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
  // The next step's supplies (or, at the end, the small reserve to start with).
  const gift =
    next.tutorialStep < TUTORIAL.length
      ? tutorialBudget(next, [next.tutorialStep])
      : { ...AFTER_TUTORIAL_RESERVE, food: (AFTER_TUTORIAL_RESERVE.food ?? 0) - TUTORIAL_START_FOOD };
  const resources = { ...next.resources };
  for (const [k, v] of Object.entries(gift)) resources[k as keyof Resources] += v ?? 0;
  if (next.tutorialStep < TUTORIAL.length) return { ...next, resources };
  // Elder Ama says goodbye; the next real lesson waits its usual gap after this.
  return startGrace({ ...next, resources, lesson: TUTORIAL_FAREWELL.id, lessonTick: state.tick });
}

// The world's troubles start a little after the tutorial ends, not during it.
function startGrace(state: GameState): GameState {
  return {
    ...state,
    nextEventTick: Math.max(state.nextEventTick, state.tick + GRACE_AFTER_TUTORIAL.event * gapFactor(state)),
    nextRaidTick: Math.max(state.nextRaidTick, state.tick + GRACE_AFTER_TUTORIAL.raid * gapFactor(state)),
    calmUntil: state.tick + GRACE_AFTER_TUTORIAL.disease * gapFactor(state),
    nextMomentTick: state.tick + SMALL_MOMENTS.firstAfter,
    nextDisasterTick: state.tick + Math.round(DISASTERS.firstAfter * gapFactor(state)),
    eraStartTick: state.tick,
  };
}

function tick(state: GameState): GameState {
  if (state.phase !== "playing" || state.event) return state;
  return noteLostHomes(state, tickOnce(state));
}

// A home burned, wrecked or broken down this tick: remember which, so the
// warning about people with no roof can say what happened.
function noteLostHomes(before: GameState, after: GameState): GameState {
  if (housingCapacity(after) >= housingCapacity(before)) return after;
  const gone = before.tiles.find((t, i) => {
    const room = t.building ? BUILDINGS_BY_ID[t.building]?.housing ?? 0 : 0;
    const now = after.tiles[i];
    return room > 0 && (now.building !== t.building || (now.worn ?? 0) >= 1) ;
  });
  return gone ? { ...after, homeLost: { name: BUILDINGS_BY_ID[gone.building!].name, tick: after.tick } } : after;
}

function tickOnce(state: GameState): GameState {
  const prod = production(state);
  const cons = consumption(state);

  const rot = Math.min(foodSpoiling(state), Math.max(0, state.resources.food + prod.food - cons));
  state = addTally(state, "rotted", rot);
  state = addTally(state, "wood", Math.max(0, prod.wood));
  state = addTally(state, "stone", Math.max(0, prod.stone));
  if (hasLitFire(state)) state = addTally(state, "fireLit", TICK_SECONDS);
  const resources: Resources = {
    food: Math.max(0, state.resources.food + prod.food - cons - foodSpoiling(state)),
    wood: Math.max(0, state.resources.wood + prod.wood),
    stone: state.resources.stone + prod.stone,
    knowledge: state.resources.knowledge + prod.knowledge,
    currency: Math.max(0, state.resources.currency + prod.currency),
  };

  let population = state.population;
  let famineTicks = state.famineTicks;
  const capacity = housingCapacity(state);
  // Slow, steady growth: the tribe doesn't outgrow its food overnight.
  const growth = state.culture === "farmers" ? 0.015 : 0.01;

  let starved = 0;
  if (resources.food <= 0) {
    const before = population;
    population = Math.max(1, population - FAMINE.deathsPerTick);
    starved = before - population;
    // Those the town can't feed at all leave to look for food elsewhere, so a big
    // town shrinks to fit its food instead of starving to the last person.
    const unfed = Math.max(0, (cons - prod.food) / (FOOD_PER_PERSON * DIFFICULTIES[state.difficulty].consumption));
    population = Math.max(1, population - unfed * FAMINE.leaveShare);
    // In the great drought people ration what little there is: the famine clock
    // runs at half speed (they still die of hunger).
    famineTicks += inDrought(state) ? FAMINE.droughtClock : 1;
  } else {
    // Once there is food again, the danger passes twice as fast as it came.
    famineTicks = Math.max(0, famineTicks - 2);
    // The tribe only grows when it makes at least as much food as it eats: stored
    // food alone would let it grow into a famine.
    if (state.meters.food > 45 && prod.food >= cons && state.meters.shelter > 40 && population < capacity * 1.15) {
      // Never more than GROWTH_CAP a tick: a big town doesn't double in two minutes.
      population += Math.min(GROWTH_CAP, Math.max(0.08, population * growth));
    }
  }

  // Unrest only builds up once the tutorial is over, so new players get a fair start.
  const inTutorial = state.tutorialStep < TUTORIAL.length;
  const unrestTicks =
    state.meters.happiness < UNREST_LEVEL && !inTutorial && !isCalm(state)
      ? state.unrestTicks + 1
      : Math.max(0, state.unrestTicks - 2);

  // The land can give out too, but never while a new player is still learning.
  const collapseTicks =
    state.meters.sustainability < COLLAPSE.level && !inTutorial && !isCalm(state)
      ? (state.collapseTicks ?? 0) + 1
      : Math.max(0, (state.collapseTicks ?? 0) - 2);

  const strainTicks =
    state.meters.sustainability < LAND.strainLevel
      ? state.strainTicks + 1
      : Math.max(0, state.strainTicks - 2);

  const modifiers = {
    sustainability: state.modifiers.sustainability * 0.995,
    happiness: state.modifiers.happiness * 0.993,
  };
  const grief = Math.max(0, (state.grief ?? 0) - GRIEF.happiness / GRIEF.ticks);

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
    // The Stone Age calendar runs at the pace of the "left behind" deadline, so it
    // never stalls and reaches 3,000 BCE just as the world moves on. Later eras:
    // time can't run past the start of the next era until the player gets there.
    year: nextYear(state),
    resources,
    population,
    famineTicks,
    unrestTicks,
    collapseTicks,
    strainTicks,
    modifiers,
    grief,
  };

  next = keepFires(next);
  // "A campfire burned out" only if one is still out after the keepers' turn.
  const justOut = state.tiles.filter((t) => t.building === "campfire" && state.fires?.[t.id] === 1);
  if (burnedOut && justOut.every((t) => isLit(next, t))) next = { ...next, log: next.log.slice(1) };
  if (next.tick % 3 === 0) next = growForests(next);
  next = wearBuildings(next);
  next = cutHills(next);
  next = sparks(next);
  // No raids or events while a new player is still learning.
  if (!inTutorial) next = updatePlague(updateDisasters(updateDrought(updateLegion(updateRaids(next)))));
  next = returnCaravans(next);
  next = returnScouts(next);
  next = returnShips(updateKingdoms(next));
  next = finishStage(next);
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
  const behind = behindTicksLeft(next);
  if (behind !== null && behind <= 0) {
    const lost: GameState = { ...next, phase: "gameover", lostTo: "behind", log: ["The world moved on without us.", ...next.log] };
    return { ...lost, debrief: makeDebrief(lost, "loss") };
  }
  if (collapseTicks >= COLLAPSE.ticks) {
    const lost: GameState = { ...next, phase: "gameover", lostTo: "collapse", log: ["The land gave out, and your people had to leave.", ...next.log] };
    return { ...lost, debrief: makeDebrief(lost, "loss") };
  }

  if (!inTutorial && next.tick >= next.nextEventTick && quietEnough(next)) {
    const rand = mulberry32(next.seed + next.tick);
    const event = pickEvent(rand(), next);
    next = { ...next, event, lastEvent: event.id, lastBigTick: next.tick, nextEventTick: next.tick + Math.round((EVENT_GAP.base + Math.floor(rand() * EVENT_GAP.spread)) * gapFactor(next)) };
  }

  if (!inTutorial) next = smallMoment(next);

  const beforeDisease = next.population;
  // Crowded towns without latrines, and people drinking dirty water in the
  // drought, spread sickness faster.
  const dirt = 1 + TOWN.dirty * (1 - sanitation(next)) + thirstShare(next);
  // People sleeping out in the cold fall sick. The player's doing, so it
  // doesn't wait for a quiet moment (only for the calm start).
  const homeless = homelessCount(next);
  if (homeless > 0 && !inPlague(next) && !isCalm(next) && !(next.sick ?? 0)) {
    const sickened = maybeOutbreak(next, homeless * HOMELESS.outbreak, mulberry32(next.seed + next.tick * 37)(), "People sleeping out in the cold fell sick.");
    if (sickened !== next) next = { ...sickened, lastBigTick: next.tick };
  }
  if (!inPlague(next)) next = stepDisease(next, housingCapacity(next), mulberry32(next.seed + next.tick * 31), dirt, bathsRecover(next));
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
  next = returnFromFog(next);
  next = checkSecrets(next);
  next = lessonDue(next);
  next = knowledgeMilestones(next);
  next = snapshotGoals(next);
  next = knowledgeReady(next);
  next = advanceTutorial(next);
  return { ...next, meters: computeMeters(next) };
}

// Small moments: a little something every 30-60 s, chosen from what fits the
// island right now. They only add a log line (a toast) and a small effect.
interface Moment {
  id: string;
  when: (s: GameState) => boolean;
  apply: (s: GameState) => GameState;
  text: string;
  // Where on the map it happens (shown there for a few seconds).
  where: (s: GameState) => Tile | undefined;
}

// Places for a moment to happen, nearest the village first.
const nearHome = (s: GameState, ok: (t: Tile) => boolean) => {
  const home = s.tiles[s.startTile];
  return s.tiles.filter((t) => t.revealed && ok(t)).sort((a, b) => hexDistance(a, home) - hexDistance(b, home));
};
// One of the nearest few, so it isn't always the same spot.
const pick = (s: GameState, list: Tile[]) => list[Math.floor(s.tick / 3) % Math.min(4, list.length)];
const isTrees = (t: Tile) => t.terrain === "forest" && !t.building && t.growth > 0.5;
// The middle of the forest: the tile with the most trees round it (nearest the
// village among those), so birds circling it stay over the forest.
const deepForest = (s: GameState) => {
  const trees = s.tiles.filter((t) => t.revealed && isTrees(t));
  const home = s.tiles[s.startTile];
  const around = (t: Tile) => trees.filter((u) => hexDistance(u, t) === 1).length;
  return trees
    .map((t) => ({ t, n: around(t), d: hexDistance(t, home) }))
    .sort((a, b) => b.n - a.n || a.d - b.d)[0]?.t;
};
const bareLand = (s: GameState) => pick(s, nearHome(s, (t) => (t.terrain === "grass" || t.terrain === "steppe") && !t.building && hexDistance(t, s.tiles[s.startTile]) >= 2));
const aBuilding = (s: GameState, ids: string[]) => pick(s, nearHome(s, (t) => !!t.building && ids.includes(t.building)));

const addFood = (s: GameState, n: number) => ({ ...s, resources: { ...s.resources, food: Math.max(0, s.resources.food + n) } });
const addMood = (s: GameState, n: number) => ({ ...s, modifiers: { ...s.modifiers, happiness: s.modifiers.happiness + n } });

const untendedFires = (s: GameState) => litFires(s).filter((t) => !tended(s, t));

const MOMENTS: Moment[] = [
  {
    id: "berries",
    when: () => true,
    apply: (s) => addFood(s, 5),
    text: "The children found a patch of berries (+5 food).",
    where: (s) => pick(s, nearHome(s, (t) => !t.building && (t.deposit === "berries" || t.terrain === "grass" || t.terrain === "forest"))),
  },
  {
    id: "baby",
    when: (s) => s.meters.food >= 45 && s.population < housingCapacity(s),
    apply: (s) => ({ ...s, population: s.population + 1 }),
    text: "A baby was born by the fire (+1 person).",
    where: (s) => aBuilding(s, ["hut", "house", "townhouse"]) ?? s.tiles[s.startTile],
  },
  {
    id: "gust",
    // Only a fire nobody tends: a keeper would just relight it.
    when: (s) => litFires(s).length >= 2 && untendedFires(s).length > 0,
    apply: (s) => {
      const fire = untendedFires(s)[Math.floor(s.tick / 7) % untendedFires(s).length];
      return { ...s, fires: { ...s.fires, [fire.id]: 0 } };
    },
    text: "A gust of wind blew out a campfire. Click it to relight it.",
    // The fire that went out (the same one apply() picks).
    where: (s) => untendedFires(s)[Math.floor(s.tick / 7) % untendedFires(s).length],
  },
  {
    // Only when the land is well watered (rainfall comes from the forests).
    id: "grow",
    when: (s) => (countBuildings(s).farm ?? 0) > 0 && rainfall(s) >= 0.8,
    apply: (s) => addFood(s, 2 * (countBuildings(s).farm ?? 0)),
    text: "Good growing weather: the crops shot up (+2 food for each field). The forests nearby help keep the land moist.",
    where: (s) => aBuilding(s, ["farm"]),
  },
  { id: "story", when: (s) => litFires(s).length > 0, apply: (s) => addMood(s, 5), text: "A storyteller kept everyone up late by the fire. Spirits are high.", where: (s) => litFires(s)[0] },
  { id: "smoke", when: (s) => litFires(s).length >= 3, apply: (s) => addMood(s, -4), text: "Smoke hung over the village all day. People are coughing.", where: (s) => s.tiles[s.startTile] },
  {
    id: "birds",
    when: (s) => forestCover(s) >= 0.8,
    apply: (s) => ({ ...s, modifiers: { ...s.modifiers, sustainability: s.modifiers.sustainability + 2 } }),
    text: "Birds are nesting in the old forest again (+2 Sustainability for a while).",
    where: deepForest,
  },
  {
    id: "mice",
    when: (s) => s.resources.food > 60 && !countBuildings(s).granary,
    apply: (s) => addFood(s, -Math.round(s.resources.food * 0.1)),
    text: "Mice got into the food stores and spoiled some of it. A granary would keep it safe.",
    where: (s) => aBuilding(s, ["hut", "house", "gatherer", "farm"]) ?? s.tiles[s.startTile],
  },
  { id: "dust", when: (s) => forestCover(s) < 0.5, apply: (s) => addMood(s, -3), text: "Wind blew dust off the bare land where the forest used to be.", where: bareLand },
];

// Dev: `force` picks which moment (if it can happen right now).
export const MOMENT_IDS = () => MOMENTS.map((m) => m.id);

export function smallMoment(state: GameState, force?: string): GameState {
  const due = state.nextMomentTick ?? state.tick + SMALL_MOMENTS.firstAfter;
  if (state.tick < due) return state.nextMomentTick === undefined ? { ...state, nextMomentTick: due } : state;
  // Never over an event card, a raid or the legion: try again a little later.
  if (state.event || state.raid || state.legion) return { ...state, nextMomentTick: state.tick + 5 };
  const rand = mulberry32(state.seed + state.tick * 61);
  const last = state.lastMoment;
  const options = MOMENTS.filter((m) => (force ? m.id === force : m.id !== last) && m.when(state));
  const next = state.tick + SMALL_MOMENTS.base + Math.floor(rand() * SMALL_MOMENTS.spread);
  if (!options.length) return { ...state, nextMomentTick: next };
  const moment = options[Math.floor(rand() * options.length)];
  // Where it happens is worked out before it happens (a gust picks a lit fire).
  const spot = moment.where(state) ?? state.tiles[state.startTile];
  const after = moment.apply(state);
  return {
    ...after,
    nextMomentTick: next,
    lastMoment: moment.id,
    moment: { id: moment.id, tick: state.tick, tile: spot.id },
    log: [moment.text, ...after.log].slice(0, 30),
  };
}

// The height of a tile once a quarry has cut part of it away.
export function cutHeight(tile: Tile): number {
  return terrainHeight(tile.terrain) * (1 - QUARRY_CUT.depth * (tile.dug ?? 0));
}

// Every working quarry cuts a little more of its hill away, for good.
function cutHills(state: GameState): GameState {
  if (!state.tiles.some((t) => t.building === "quarry" && (t.dug ?? 0) < 1)) return state;
  const tiles = state.tiles.map((t) => {
    if (t.building !== "quarry" || (t.dug ?? 0) >= 1) return t;
    const cut = { ...t, dug: Math.min(1, (t.dug ?? 0) + QUARRY_CUT.perTick) };
    return { ...cut, height: cutHeight(cut) };
  });
  return { ...state, tiles };
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
    // Earthquake cracks and landslide rubble fade slowly (about 15 minutes).
    if ((t.cracked ?? 0) > 0) changes.set(t.id, { ...changes.get(t.id), cracked: Math.max(0, (t.cracked ?? 0) - 0.005) });
    if ((t.rubble ?? 0) > 0) changes.set(t.id, { ...changes.get(t.id), rubble: Math.max(0, (t.rubble ?? 0) - 0.005) });
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
    let need = ((BUILDINGS_BY_ID.woodcutter.produces?.wood ?? 0) * 3 * woodcutterYield(state, w)) / LAND.woodPerGrowth;
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

// ---- Natural disasters -------------------------------------------------------

const hexNeighbors = (state: GameState, tile: Tile) => state.tiles.filter((t) => hexDistance(t, tile) === 1);

// Under flood water right now.
export function isFlooded(state: GameState, tile: Tile) {
  const d = state.disaster;
  return !!d && d.kind === "flood" && state.tick >= d.startTick && state.tick < d.endTick && d.tiles.includes(tile.id);
}

// The disaster is striking right now (after its warning, before it's over).
export function disasterActive(state: GameState) {
  const d = state.disaster;
  return !!d && state.tick >= d.startTick && state.tick < d.endTick;
}

// Low land by the river or the sea near the village that a flood would cover.
// Standing forest soaks up the rain: the more forest, the fewer tiles go under.
function floodTiles(state: GameState): number[] {
  const home = state.tiles[state.startTile];
  const low = ["grass", "steppe", "beach", "marsh", "forest"];
  const byWater = state.tiles.filter(
    (t) =>
      t.revealed &&
      low.includes(t.terrain) &&
      hexDistance(t, home) <= DISASTER_HITS.flood.radius &&
      state.tiles.some((n) => (n.terrain === "river" || n.terrain === "shallow") && hexDistance(n, t) === 1),
  );
  const n = Math.max(3, Math.min(DISASTER_HITS.flood.tiles, Math.round(DISASTER_HITS.flood.tiles * (1.3 - forestCover(state)))));
  return byWater.sort((a, b) => hexDistance(a, home) - hexDistance(b, home)).slice(0, n).map((t) => t.id);
}

// Hills whose trees have been cut (or that quarries have cut into), with
// buildings below them: a landslide waiting to happen.
export function riskySlopes(state: GameState): Tile[] {
  const home = state.tiles[state.startTile];
  const bare = (t: Tile) => (t.terrain === "forest" && t.growth < 0.3) || (t.dug ?? 0) > 0.3;
  return state.tiles.filter((t) => {
    if ((t.terrain !== "hills" && t.terrain !== "mountain") || !t.revealed || hexDistance(t, home) > DISASTER_HITS.slide.radius) return false;
    const around = hexNeighbors(state, t);
    const stripped = around.filter(bare).length + ((t.dug ?? 0) > 0.3 ? 2 : 0);
    return stripped >= DISASTER_HITS.slide.bare && around.some((n) => n.building && n.terrain !== "hills" && n.terrain !== "mountain");
  });
}

// Warn of a disaster now; it strikes after its warning.
function startDisaster(state: GameState, kind: DisasterKind, rand: () => number, warn = DISASTERS.kinds[kind].warn): GameState {
  const home = state.tiles[state.startTile];
  let tiles: number[] = [];
  if (kind === "flood") tiles = floodTiles(state);
  if (kind === "landslide") {
    const slopes = riskySlopes(state);
    if (!slopes.length) return state;
    tiles = [slopes[Math.floor(rand() * slopes.length)].id];
  }
  if (kind === "earthquake") {
    const near = state.tiles.filter((t) => isLand(t.terrain) && hexDistance(t, home) <= 3);
    tiles = [near[Math.floor(rand() * near.length)].id];
  }
  const k = DISASTERS.kinds[kind];
  return {
    ...state,
    disaster: { kind, warnTick: state.tick, startTick: state.tick + warn, endTick: state.tick + warn + k.ticks, tiles },
    lastBigTick: state.tick,
    log: [k.warning, ...state.log].slice(0, 30),
  };
}

// Take buildings down: returns the new tiles and what was lost.
function wreck(state: GameState, ids: number[], mark: Partial<Tile>) {
  const lost = ids.map((id) => BUILDINGS_BY_ID[state.tiles[id].building!].name);
  const tiles = state.tiles.map((t) => (ids.includes(t.id) ? { ...t, building: null, ...mark } : t));
  return { tiles, lost };
}

// The disaster strikes.
function strike(state: GameState, rand: () => number): GameState {
  const d = state.disaster!;
  const H = DISASTER_HITS;
  const say = (line: string, s: GameState) => ({ ...s, log: [line, ...s.log].slice(0, 30) });
  const hurt = (s: GameState, n: number) =>
    n <= 0
      ? s
      : bumpStats({ ...s, population: Math.max(1, s.population - n) }, (st) => {
          st.deaths.disaster = (st.deaths.disaster ?? 0) + n;
        });
  let next = addTally(state, "disasters", 1);
  const listOf = (lost: string[]) => (lost.length ? lost.join(", ") : "");

  if (d.kind === "storm") {
    // Every fire goes out; wooden buildings with no forest to break the wind may be wrecked.
    const exposed = state.tiles.filter(
      (t) =>
        t.building &&
        WOOD_BUILDINGS.includes(t.building) &&
        !(t.building === "woodcutter" && (countBuildings(state).woodcutter ?? 0) <= 1) &&
        hexNeighbors(state, t).filter((n) => n.terrain === "forest" && n.growth > 0.5).length < H.storm.shelter,
    );
    const hit = exposed.filter(() => rand() < H.storm.wreck).slice(0, H.storm.max).map((t) => t.id);
    const { tiles, lost } = wreck(next, hit, { scorch: 0 });
    next = { ...next, tiles, fires: Object.fromEntries(Object.keys(state.fires ?? {}).map((id) => [id, 0])) };
    return say(
      `The storm blew out every campfire${lost.length ? ` and wrecked: ${listOf(lost)}` : ", but the buildings held"}. Forest around a building shelters it from the wind.`,
      next,
    );
  }
  if (d.kind === "flood") {
    const homes = d.tiles.filter((id) => BUILDINGS_BY_ID[state.tiles[id].building ?? ""]?.housing).length;
    next = homes ? { ...next, sick: (next.sick ?? 0) + H.flood.sickness } : next;
    return say(
      `The flood covered ${d.tiles.length} tiles by the water. Buildings there have stopped working until it goes down${homes ? ", and the damp homes are making people sick" : ""}.`,
      next,
    );
  }
  if (d.kind === "earthquake") {
    const centre = state.tiles[d.tiles[0]];
    const shaken = state.tiles.filter(
      (t) =>
        t.building &&
        hexDistance(t, centre) <= H.quake.radius &&
        !(t.building === "woodcutter" && (countBuildings(state).woodcutter ?? 0) <= 1),
    );
    const hit = shaken.filter((t) => rand() < (STONE_BUILDINGS.includes(t.building!) ? H.quake.stone : H.quake.wood)).slice(0, H.quake.max).map((t) => t.id);
    const homesLost = hit.filter((id) => BUILDINGS_BY_ID[state.tiles[id].building!].housing).length;
    const { tiles, lost } = wreck(next, hit, { cracked: 1 });
    const cracks = new Set(state.tiles.filter((t) => isLand(t.terrain) && hexDistance(t, centre) <= 2 && rand() < 0.5).map((t) => t.id));
    next = { ...next, tiles: tiles.map((t) => (cracks.has(t.id) || t.id === centre.id ? { ...t, cracked: 1 } : t)) };
    const deaths = Math.min(homesLost * H.quake.deaths, Math.floor(state.population) - 1);
    next = hurt(next, deaths);
    return say(
      `The ground shook! ${lost.length ? `Collapsed: ${listOf(lost)}.` : "Everything is still standing."}${deaths ? ` ${deaths} ${deaths === 1 ? "person was" : "people were"} killed.` : ""} Brick and stone crack more easily than wood.`,
      next,
    );
  }
  // Landslide: the stripped hill comes down on what's below it.
  const slope = state.tiles[d.tiles[0]];
  const below = hexNeighbors(state, slope)
    .filter((t) => t.building && t.terrain !== "hills" && t.terrain !== "mountain" && !(t.building === "woodcutter" && (countBuildings(state).woodcutter ?? 0) <= 1))
    .slice(0, 2)
    .map((t) => t.id);
  const { tiles, lost } = wreck(next, below, { rubble: 1 });
  next = addTally({ ...next, tiles: tiles.map((t) => (t.id === slope.id ? { ...t, rubble: 1 } : t)) }, "landslides", 1);
  next = hurt(next, Math.min(below.length, Math.floor(state.population) - 1));
  return say(
    `The bare hillside gave way! ${lost.length ? `Buried: ${listOf(lost)}.` : ""} With no roots to hold it, the soil slid down.`,
    next,
  );
}

// Storms, floods, earthquakes and landslides: one now and then after the
// tutorial, never over a raid, the legion or the drought.
function updateDisasters(state: GameState): GameState {
  if (state.phase !== "playing") return state;
  const d = state.disaster;
  const rand = mulberry32(state.seed + state.tick * 71);
  if (!d) {
    if (state.nextDisasterTick === undefined) return { ...state, nextDisasterTick: state.tick + DISASTERS.firstAfter };
    if (state.tick < state.nextDisasterTick || state.raid || state.legion || state.drought || state.event || !quietEnough(state) || isCalm(state))
      return state;
    const weights: [DisasterKind, number][] = [
      ["storm", DISASTERS.kinds.storm.weight],
      ["flood", floodTiles(state).length ? DISASTERS.kinds.flood.weight : 0],
      ["earthquake", DISASTERS.kinds.earthquake.weight],
      ["landslide", Math.min(3, riskySlopes(state).length * 1.5)],
    ];
    let r = rand() * weights.reduce((s, [, w]) => s + w, 0);
    const kind = weights.find(([, w]) => (r -= w) <= 0)?.[0] ?? "storm";
    return startDisaster(state, kind, rand);
  }
  if (state.tick === d.startTick) return strike(state, rand);
  if (state.tick >= d.endTick) {
    // After a flood, the fields it covered grow more for a while.
    const silt =
      d.kind === "flood"
        ? { ...state.silt, ...Object.fromEntries(d.tiles.map((id) => [id, state.tick + DISASTER_HITS.flood.siltTicks])) }
        : state.silt;
    return {
      ...state,
      disaster: null,
      silt,
      nextDisasterTick: state.tick + Math.round((DISASTERS.gap + rand() * DISASTERS.spread) * gapFactor(state)),
      log: d.kind === "flood" ? ["The water has gone down, leaving rich silt on the fields.", ...state.log].slice(0, 30) : state.log,
    };
  }
  return state;
}

// Bathhouses help the sick get better (extra share recovering each tick).
function bathsRecover(state: GameState) {
  if (landmarkWorking(state, "cathedral")) return bathsCare(state) + LANDMARK.cathedralRecover;
  return bathsCare(state);
}

function bathsCare(state: GameState) {
  return Math.min(2, countBuildings(state).baths ?? 0) * TOWN.bathsRecover;
}

// The great drought: the elders warn of it when the year comes, it starts a few
// minutes later, and the town that holds on until the rains return has come
// through the Classical era (the final debrief). No raids meanwhile: one big
// thing at a time.
function updateDrought(state: GameState): GameState {
  if (state.era !== 2 || state.droughtDone || state.phase !== "playing") return state;
  const d = state.drought;
  if (!d) {
    if (state.year < DROUGHT.warnYear || state.raid) return state;
    const start = state.tick + DROUGHT.warnTicks;
    return {
      ...state,
      drought: { warnTick: state.tick, startTick: start, endTick: start + DROUGHT.ticks },
      nextRaidTick: Number.MAX_SAFE_INTEGER,
      lastBigTick: state.tick,
      log: [
        "The elders read the signs: the springs are low and the winter was dry. A great drought is coming. Dig wells, fill the granaries, keep the forests standing!",
        ...state.log,
      ].slice(0, 30),
    };
  }
  if (state.tick === d.startTick) {
    return { ...state, log: ["The rains have failed. The great drought has begun.", ...state.log].slice(0, 30) };
  }
  if (state.tick >= d.endTick) {
    const done: GameState = {
      ...state,
      drought: null,
      droughtDone: true,
      nextRaidTick: state.tick + RAID_GAP.base,
      log: [
        `The rains have come back! ${state.nation ?? "Your people"} came through the great drought. Now choose a great landmark to build: it will carry the town into the Middle Ages.`,
        ...state.log,
      ].slice(0, 30),
    };
    return done;
  }
  return state;
}

// The masons finish a landmark stage.
function finishStage(state: GameState): GameState {
  const l = state.landmark;
  if (!l || l.stage < 1 || state.tick !== l.readyTick) return state;
  const name = LANDMARKS[l.kind].name;
  const line =
    l.stage >= 3
      ? `The ${name} is finished! ${LANDMARKS[l.kind].bonus} ${state.era === 2 ? "Our people are ready for the Middle Ages." : ""}`
      : `Stage ${l.stage} of the ${name} is done. Click it to start stage ${l.stage + 1}.`;
  return { ...state, lastBigTick: l.stage >= 3 ? state.tick : state.lastBigTick, log: [line.trim(), ...state.log].slice(0, 30) };
}

// Caravans come home from the Silk Steppe with coins and new ideas, and now and
// then with sickness.
function returnCaravans(state: GameState): GameState {
  const due = (state.caravans ?? []).filter((c) => state.tick >= c.back);
  if (!due.length) return state;
  let next: GameState = {
    ...state,
    caravans: (state.caravans ?? []).filter((c) => state.tick < c.back),
    kingdoms: changeMood(state, { steppe: DIPLOMACY.caravanMood * due.length }).kingdoms,
    resources: {
      ...state.resources,
      currency: state.resources.currency + due.length * CARAVAN.coins,
      knowledge: state.resources.knowledge + due.length * CARAVAN.knowledge,
    },
    log: [
      `A caravan came back from the Silk Steppe with silver and new ideas (+${CARAVAN.coins} coins, +${CARAVAN.knowledge} Knowledge).`,
      ...state.log,
    ].slice(0, 30),
  };
  const roll = mulberry32(state.seed + state.tick * 47)();
  next = maybeOutbreak(next, isCalm(next) ? 0 : CARAVAN.sickness, roll, "The caravan brought it back from the steppe.");
  return next;
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
    // The Ancient era goes on: next comes Coinage, a bigger town and the Classical
    // era, with the "left behind" clock running from now. Raids start again.
    return {
      ...after,
      legionBeatenTick: state.tick,
      legionBeatenYear: state.year,
      nextRaidTick: state.tick + Math.round(RAID_GAP.base * gapFactor(state)),
      log: [
        `The Roman legion is beaten! ${state.nation ?? "Your people"} stand free. Next: learn Coinage and grow to ${CLASSICAL_POPULATION} people to enter the Classical era.`,
        ...state.log,
      ].slice(0, 30),
    };
  }
  const lost: GameState = {
    ...after,
    phase: "gameover",
    lostTo: "conquest",
    log: ["The legion broke through. The village has fallen.", ...state.log].slice(0, 30),
  };
  return { ...lost, debrief: makeDebrief(lost, "loss") };
}

// Where a picked-up person lands decides what happens to them. The 3D scene uses
// this too, so what you see matches the rules.
export type DropOutcome = "land" | "help" | "relight" | "fire" | "shallow" | "deep" | "fog" | "mountain";

export function dropOutcome(state: GameState, tile: Tile | null | undefined): DropOutcome {
  if (!tile || tile.terrain === "deep") return "deep";
  // A river is a cold dunk too.
  if (tile.terrain === "shallow" || tile.terrain === "river") return "shallow";
  if (!tile.revealed) return "fog";
  if (tile.building === "campfire") return isLit(state, tile) ? "fire" : "relight";
  if (tile.terrain === "mountain") return "mountain";
  if (tile.building && BUILDINGS_BY_ID[tile.building]?.produces) return "help";
  return "land";
}

function personName(state: GameState, salt: number) {
  return PEOPLE_NAMES[Math.floor(mulberry32(state.seed + state.tick * 13 + salt)() * PEOPLE_NAMES.length)];
}

// A death by the player's hand: the whole tribe grieves (see GRIEF).
const SHAKEN = `The tribe is shaken (−${GRIEF.happiness} happiness, fading over ${Math.round(secs(GRIEF.ticks) / 60)} minutes).`;
function grieve(state: GameState): GameState {
  return { ...state, grief: Math.min(GRIEF.max, (state.grief ?? 0) + GRIEF.happiness) };
}

// Scouts back from a trip: the land around where they went is mapped.
function scoutsReturn(state: GameState, tileId: number): GameState {
  const tiles = state.tiles.map((t) => ({ ...t }));
  revealAround(tiles, tiles[tileId], state.culture === "mariners" ? 5 : 4);
  // A trip that maps a lot of new land teaches more than a short one.
  const newLand = tiles.filter((t, i) => t.revealed && !state.tiles[i].revealed && isLand(t.terrain)).length;
  // Only the first few trips teach much: after that the land nearby is known.
  const learned = state.scoutsSent >= SCOUT_KNOWLEDGE.trips ? 0 : newLand >= SCOUT_KNOWLEDGE.bigTrip ? 2 : 1;
  return {
    ...state,
    tiles,
    scouting: undefined,
    scoutsSent: state.scoutsSent + 1,
    resources: { ...state.resources, knowledge: state.resources.knowledge + learned },
    log: [`The scouts are back: they mapped ${newLand} tiles of new land${learned ? ` (+${learned} Knowledge)` : ""}.`, ...state.log].slice(0, 30),
  };
}
const returnScouts = (state: GameState) => (state.scouting && state.tick >= state.scouting.back ? scoutsReturn(state, state.scouting.tile) : state);

function dropPerson(state: GameState, tileId: number | null): GameState {
  if (state.phase !== "playing" || state.tutorialStep < TUTORIAL.length) return state;
  const tile = tileId === null ? null : state.tiles[tileId];
  const outcome = dropOutcome(state, tile);
  const name = personName(state, (tileId ?? 0) + state.log.length);
  const say = (line: string) => [line, ...state.log].slice(0, 30);
  const lose = (s: GameState, cause: "fire" | "accident") =>
    bumpStats({ ...s, population: Math.max(1, s.population - 1) }, (st) => {
      st.deaths[cause] = (st.deaths[cause] ?? 0) + 1;
    });
  switch (outcome) {
    case "fire":
      return withMeters(grieve(lose({ ...state, log: say(`${name} was dropped into the fire and didn't come out. ${SHAKEN}`) }, "fire")));
    case "deep":
      return withMeters(grieve(lose({ ...state, log: say(`${name} was dropped into the sea and swept away. ${SHAKEN}`) }, "accident")));
    case "fog":
      return withMeters({
        ...state,
        population: Math.max(1, state.population - 1),
        inFog: [...(state.inFog ?? []), { name, back: state.tick + DROP.fogTicks }],
        log: say(`${name} wandered off into the unknown...`),
      });
    case "shallow":
      return withMeters({
        ...state,
        sick: (state.sick ?? 0) + 1,
        log: say(tile?.terrain === "river" ? `${name} fell in the river and caught a cold.` : `${name} got soaked in the sea and caught a cold.`),
      });
    case "mountain":
      return withMeters({ ...state, sick: (state.sick ?? 0) + 1, log: say(`${name} tumbled down the mountain. Bruised, but alive.`) });
    case "relight":
      return withMeters({ ...state, fires: { ...state.fires, [tile!.id]: burnTicks(state) }, log: say(`${name} blew on the cold embers and the fire caught!`) });
    case "help":
      return withMeters({
        ...state,
        helpers: { ...state.helpers, [tile!.id]: state.tick + DROP.helpTicks },
        log: say(`${name} pitches in at the ${BUILDINGS_BY_ID[tile!.building!].name} (+${DROP.helpBoost * 100}% for ${secs(DROP.helpTicks)} s).`),
      });
    default:
      return state;
  }
}

// People who wandered into the fog come back (or don't).
function returnFromFog(state: GameState): GameState {
  const due = (state.inFog ?? []).filter((p) => state.tick >= p.back);
  if (!due.length) return state;
  let next: GameState = { ...state, inFog: (state.inFog ?? []).filter((p) => state.tick < p.back) };
  for (const p of due) {
    const rand = mulberry32(state.seed + p.back * 17);
    if (rand() < DROP.fogLuck) {
      const tiles = next.tiles.map((t) => ({ ...t }));
      const home = tiles[next.startTile];
      const unknown = tiles
        .filter((t) => !t.revealed && isLand(t.terrain))
        .sort((a, b) => hexDistance(a, home) - hexDistance(b, home))[0];
      if (unknown) revealAround(tiles, unknown, DROP.fogReveal);
      next = {
        ...next,
        tiles,
        population: next.population + 1,
        log: [`${p.name} came back from the fog with news of new land!`, ...next.log].slice(0, 30),
      };
    } else {
      next = bumpStats({ ...next, log: [`${p.name} never came back from the fog.`, ...next.log].slice(0, 30) }, (st) => {
        st.deaths.accident = (st.deaths.accident ?? 0) + 1;
      });
    }
  }
  return next;
}

// Buildings a fire raid could set alight (not fires, pens of stone or the camp).
function burnable(state: GameState): Tile[] {
  return state.tiles.filter((t) => t.building && !["campfire", "warcamp", "quarry", "walls", "watchfire"].includes(t.building));
}

// What raiders take: a share of food and wood, and for a fire raid one building
// (the one nearest where they landed).
function plunder(state: GameState, raid: Raid, share: { food: number; wood: number }): Partial<GameState> {
  const resources = {
    ...state.resources,
    food: state.resources.food * (1 - share.food),
    wood: state.resources.wood * (1 - share.wood),
  };
  if (!RAID_KINDS[raid.kind ?? "party"].burns) return { resources };
  const from = state.tiles[raid.fromTile];
  const target = burnable(state).sort((a, b) => hexDistance(a, from) - hexDistance(b, from))[0];
  if (!target) return { resources };
  return { resources, tiles: state.tiles.map((t) => (t.id === target.id ? { ...t, building: null, scorch: 1 } : t)) };
}

function plunderText(state: GameState, raid: Raid): string {
  const kind = raid.kind ?? "party";
  const from = state.tiles[raid.fromTile];
  const burnt = RAID_KINDS[kind].burns ? burnable(state).sort((a, b) => hexDistance(a, from) - hexDistance(b, from))[0] : null;
  const what = burnt ? ` They set fire to a ${BUILDINGS_BY_ID[burnt.building!].name}.` : "";
  if (kind === "band") return `The raiders made off with our wood.${what}`;
  if (kind === "fire") return `Raiders ran through the village with torches!${what}`;
  return `Raiders plundered the village! Food and wood stolen.${what}`;
}

// Everyone hid in the houses: nobody dies, but the raiders take what they find.
function raidHide(state: GameState, raid: Raid): GameState {
  return {
    ...state,
    ...plunder(state, raid, RAID_KINDS[raid.kind ?? "party"].hide),
    raid: null,
    modifiers: { ...state.modifiers, happiness: state.modifiers.happiness - RAID_RESPONSE.hideMood },
    log: [hideText(state, raid), ...state.log].slice(0, 30),
  };
}

function hideText(state: GameState, raid: Raid): string {
  const kind = raid.kind ?? "party";
  if (RAID_KINDS[kind].burns) {
    const from = state.tiles[raid.fromTile];
    const burnt = burnable(state).sort((a, b) => hexDistance(a, from) - hexDistance(b, from))[0];
    return burnt
      ? `We hid in the houses. Nobody was hurt, but the raiders burned a ${BUILDINGS_BY_ID[burnt.building!].name}.`
      : "We hid in the houses. The raiders found nothing to burn and left.";
  }
  return kind === "band"
    ? "We hid in the houses. Nobody was hurt, but they took some of our wood."
    : "We hid in the houses. Nobody was hurt, but they took some food and wood.";
}

// The price of buying the raiders off.
export function tributeCost(raid: Raid) {
  return raid.strength * RAID_RESPONSE.tributePerRaider;
}

function updateRaids(state: GameState): GameState {
  const { raid } = state;
  if (raid?.roman) return state.tick >= raid.arriveTick ? resolveLegion(state) : state;
  if (raid && state.tick >= raid.arriveTick) {
    // They are here. Hiding or tribute was settled when chosen; otherwise we fight,
    // and the fight takes a few seconds (training a warrior can still tip it).
    if (raid.response === "hide") return raidHide(state, raid);
    if (raid.fightStart === undefined) {
      return { ...state, raid: { ...raid, response: "fight", fightStart: state.tick } };
    }
    if (state.tick < raid.fightStart + RAID_RESPONSE.fightTicks) return state;
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
        kingdoms: raid.kingdom ? changeMood(state, { [raid.kingdom]: DIPLOMACY.raidWonMood }).kingdoms : state.kingdoms,
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
      spearmen: Math.min(spearmenOf(state), Math.max(0, state.soldiers - raid.strength)),
      ...plunder(state, raid, RAID_KINDS[raid.kind ?? "party"].steal),
      modifiers: { ...state.modifiers, happiness: state.modifiers.happiness - 12 },
      log: [plunderText(state, raid), ...state.log].slice(0, 30),
    };
  }

  if (!raid && state.tick >= state.nextRaidTick && quietEnough(state)) {
    const rand = mulberry32(state.seed + state.tick * 31);
    // In the Middle Ages, only a hostile kingdom sends an army; at peace, nobody
    // comes. A kingdom we raided comes for revenge, hostile or not by now.
    const revenge = state.revenge && state.tick >= state.revenge.tick ? state.revenge.kingdom : undefined;
    const enemies = revenge ? [revenge] : state.era >= 3 ? hostileKingdoms(state) : [];
    if (state.era >= 3 && !enemies.length) return { ...state, nextRaidTick: state.tick + 60 };
    const from_ = enemies.length ? enemies[Math.floor(rand() * enemies.length)] : undefined;
    const home = state.tiles[state.startTile];
    const shores = state.tiles.filter((t) => {
      if (t.terrain !== "shallow") return false;
      const d = hexDistance(t, home);
      return d >= 7 && d <= 11;
    });
    if (shores.length === 0) return { ...state, nextRaidTick: state.tick + 60 };
    // A kingdom's army lands on the shore that faces its island.
    const isle = from_ ? ISLANDS[from_ === "steppe" ? 1 : 2] : null;
    const landing = isle
      ? [...shores].sort((a, b) => Math.hypot(a.x - isle.x, a.z - isle.z) - Math.hypot(b.x - isle.x, b.z - isle.z)).slice(0, 4)
      : shores;
    const from = landing[Math.floor(rand() * landing.length)];
    // The warriors meet them most of the way to the village, on open ground.
    const mx = from.x + (home.x - from.x) * 0.7;
    const mz = from.z + (home.z - from.z) * 0.7;
    const meet = state.tiles
      .filter((t) => isLand(t.terrain) && t.terrain !== "mountain" && t.revealed && !t.building)
      .reduce((best, t) =>
        Math.hypot(t.x - mx, t.z - mz) < Math.hypot(best.x - mx, best.z - mz) ? t : best,
      );
    // The first raid is always a small band; later ones vary. Fire raids need
    // something to burn.
    const roll = rand();
    const kind: RaidKind = state.devNextRaid
      ? state.devNextRaid
      : !state.raidsSeen
        ? "band"
        : roll < 0.3
          ? "band"
          : roll < 0.7 || burnable(state).length === 0
            ? "party"
            : "fire";
    const strength = Math.max(
      2,
      Math.round(
        (2 + state.tick / RAID_GROWTH_TICKS + state.population / GROWTH_PRESSURE.raidersPerPeople) *
          DIFFICULTIES[state.difficulty].raiders *
          RAID_KINDS[kind].size *
          (revenge ? KINGDOM_RAID.revengeSize : 1),
      ),
    );
    const early = (countBuildings(state).watchfire ?? 0) > 0 ? WATCH_FIRE.warnTicks : 0;
    return {
      ...state,
      raid: {
        strength,
        kind,
        fromTile: from.id,
        targetTile: home.id,
        meetTile: meet.id,
        startTick: state.tick,
        arriveTick: state.tick + 12 + early,
        kingdom: from_,
      },
      raidsSeen: (state.raidsSeen ?? 0) + 1,
      devNextRaid: undefined,
      revenge: revenge ? null : state.revenge,
      nextRaidTick: state.tick + Math.round((RAID_GAP.base + Math.floor(rand() * RAID_GAP.spread)) * gapFactor(state)),
      lastBigTick: state.tick,
      log: [
        from_
          ? `An army of ${KINGDOMS[from_].name} (${strength}) is landing on the shore! ${revenge ? "They have come for revenge." : "They are at war with us."}${early ? " The watch fire saw them early." : ""}`
          : `${RAID_KINDS[kind].name} of ${strength} raiders is landing on the shore!${early ? " The watch fire saw them early." : ""}`,
        ...state.log,
      ].slice(0, 30),
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

// Every action, then check whether the guided after-step has been done.
export function reducer(state: GameState, action: Action): GameState {
  const next = reduce(state, action);
  return awardXp(state, next.coach ? advanceCoach(next) : next);
}

// Chief XP for what just happened: compare the state before and after an action.
function awardXp(prev: GameState, next: GameState): GameState {
  if (next === prev || next.phase !== "playing") return next;
  let gain = 0;
  const a = prev.stats ?? { built: 0, peakPopulation: 0, raidsWon: 0 };
  const b = next.stats ?? a;
  const built = b.built - a.built;
  if (built > 0) {
    gain += built * XP.build;
    const before = countBuildings(prev);
    const after = countBuildings(next);
    gain += Object.keys(after).filter((id) => !before[id]).length * XP.firstBuild;
  }
  gain += Math.max(0, Math.floor(b.peakPopulation) - Math.floor(a.peakPopulation)) * XP.person;
  gain += Math.max(0, next.researched.length - prev.researched.length) * XP.research;
  gain += Math.max(0, b.raidsWon - a.raidsWon) * XP.raidWon;
  gain += Math.max(0, (next.planted ?? 0) - (prev.planted ?? 0)) * XP.plant;
  gain += Math.max(0, next.era - prev.era) * XP.era;
  if (next.droughtDone && !prev.droughtDone) gain += XP.drought;
  if (next.plagueDone && !prev.plagueDone) gain += XP.drought;
  if (landmarkDone(next) && !landmarkDone(prev)) gain += XP.drought / 2;
  if (next.tick !== prev.tick && next.tick % XP.minuteTicks === 0 && next.tutorialStep >= TUTORIAL.length) {
    if (next.meters.food >= 45) gain += XP.fedMinute;
    if (next.meters.sustainability >= MIN_SUSTAINABILITY_FOR_BEST_ENDING) gain += XP.healthyMinute;
  }
  return gain > 0 ? addXp(next, gain) : next;
}

// Add XP and level up as many times as it covers.
function addXp(state: GameState, gain: number): GameState {
  const xp = (state.xp ?? 0) + gain;
  let level = state.chiefLevel ?? 1;
  let knowledge = state.resources.knowledge;
  const log = [...state.log];
  while (xp >= xpToReach(level + 1)) {
    level += 1;
    knowledge += XP.levelKnowledge;
    log.unshift(`Chief level ${level}: ${chiefTitle(level)}! (+${XP.levelKnowledge} Knowledge)`);
  }
  return { ...state, xp, chiefLevel: level, resources: { ...state.resources, knowledge }, log: log.slice(0, 30) };
}

// The one thing to aim for right now, in a line (null while the tutorial or a
// guided step is already telling the player what to do).
export function currentGoal(state: GameState): string | null {
  if (state.tutorialStep < TUTORIAL.length || state.coach || state.phase !== "playing" || state.debrief) return null;
  const pop = Math.floor(state.population);
  if (state.era === 0) {
    if (!state.researched.includes("agriculture")) {
      const cost = TREE_BY_ID.agriculture.cost;
      const open = goalProgress(state, "agriculture").find((g) => g.have < g.need);
      const k = Math.floor(state.resources.knowledge);
      const parts = [open ? `${open.label} (${Math.floor(open.have)}/${open.need})` : null, k < cost ? `${k}/${cost} Knowledge` : null]
        .filter(Boolean)
        .join(", ");
      // Short of Knowledge: point to what teaches every day (players get stuck here).
      const huts = countBuildings(state).elder ?? 0;
      const tip =
        k >= cost
          ? ""
          : !state.researched.includes("storytelling")
            ? " Tip: learn Storytelling, then build an Elder's Hut: it teaches every day."
            : huts < 2
              ? ` Tip: ${huts ? "another" : "an"} Elder's Hut teaches every day.`
              : "";
      return parts
        ? `Goal: learn Agriculture to reach the Ancient era. Still needed: ${parts}.${tip}`
        : "Goal: Agriculture is ready. Open Advancements and research it.";
    }
    if (pop < NEXT_ERA_POPULATION) return `Goal: grow to ${NEXT_ERA_POPULATION} people to enter the Ancient era (${pop}/${NEXT_ERA_POPULATION}).`;
    return null;
  }
  if (state.era === 1 && !state.legionDone) {
    if (state.legion || state.raid?.roman) return "Goal: hold off the Roman legion!";
    return `Goal: get ready for Rome. Their legion lands around ${formatYear(ROMAN_LEGION.warningYear)}. Our defense: ${defenseStrength(state)}.`;
  }
  if (state.era === 1) {
    if (!state.researched.includes("coinage")) {
      const cost = TREE_BY_ID.coinage.cost;
      const open = goalProgress(state, "coinage").find((g) => g.have < g.need);
      const k = Math.floor(state.resources.knowledge);
      const parts = [open ? `${open.label} (${Math.floor(open.have)}/${open.need})` : null, k < cost ? `${k}/${cost} Knowledge` : null]
        .filter(Boolean)
        .join(", ");
      return parts
        ? `Goal: learn Coinage to reach the Classical era. Still needed: ${parts}.`
        : "Goal: Coinage is ready. Open Advancements and research it.";
    }
    if (pop < CLASSICAL_POPULATION) return `Goal: grow to ${CLASSICAL_POPULATION} people to enter the Classical era (${pop}/${CLASSICAL_POPULATION}).`;
    return null;
  }
  if (state.era === 2 && !state.droughtDone) {
    const water = `Water for ${Math.min(pop, waterSupply(state))} of ${pop} people`;
    const granaries = countBuildings(state).granary ?? 0;
    if (!state.drought)
      return `Goal: build a town that can last a drought. ${water} in a dry year, ${granaries} granar${granaries === 1 ? "y" : "ies"}.`;
    if (!inDrought(state)) return `Goal: the drought is coming! ${water}. Dig wells and fill the granaries.`;
    return `Goal: hold on until the rains come back. ${water}.`;
  }
  if (state.era === 2) {
    const l = state.landmark;
    if (!l) return "Goal: choose a great landmark to build. It will carry the town into the Middle Ages.";
    const name = LANDMARKS[l.kind].name;
    if (l.stage === 0) return `Goal: place the ${name} (pick it in the build bar).`;
    if (state.tick < l.readyTick) return `Goal: the masons are building stage ${l.stage} of 3 of the ${name} (${secs(l.readyTick - state.tick)} s).`;
    if (l.stage < 3) return `Goal: click the ${name} and pay for stage ${l.stage + 1} of 3.`;
    return null;
  }
  if (state.era === 3 && !state.plagueDone) {
    const shield = Math.round(plagueShield(state) * 100);
    if (!state.plague) {
      const hostile = hostileKingdoms(state);
      return `Goal: build a strong, healthy town before the great sickness comes (around ${formatYear(PLAGUE.arriveYear)}). Readiness ${shield}%.${hostile.length ? ` ${KINGDOMS[hostile[0]].name[0].toUpperCase()}${KINGDOMS[hostile[0]].name.slice(1)} is hostile!` : ""}`;
    }
    if (!inPlague(state)) return `Goal: the Black Death is coming by ship! Readiness ${shield}%. Close the harbour? Learn Quarantine, build healers and latrines.`;
    return `Goal: hold on until the sickness passes. Readiness ${shield}%. Lives lost: ${Math.round(state.plague.deaths)}.`;
  }
  return `Goal: keep the town thriving. Land health: ${state.meters.sustainability}.`;
}

function reduce(state: GameState, action: Action): GameState {
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
      if (!def || !tile || !isUnlocked(state, def)) return state;
      const why = placementError(state, tile, def);
      // A click that can't build says why.
      if (why) return { ...state, log: [`Can't build a ${def.name} there: ${why}.`, ...state.log].slice(0, 30) };
      // A new field clears the nearest patch of forest for good.
      const cleared = def.id === "farm" ? forestToClear(state, tile) : null;
      const ploughed = def.id === "farm" && tile.terrain === "forest";
      const tiles = state.tiles.map((t) =>
        t.id === tile.id
          ? { ...t, building: def.id, worn: 0, ...(ploughed ? { terrain: "grass" as const, height: terrainHeight("grass"), growth: 0 } : {}) }
          : t.id === cleared?.id
            ? { ...t, terrain: "grass" as const, height: terrainHeight("grass"), growth: 0 }
            : t,
      );
      // Building never uncovers the clouds: only scouts reveal new land.
      // Our landmark: placing it pays for stage 1, then the masons get to work.
      const landmark =
        def.landmark && state.landmark?.kind === def.id && state.landmark.stage === 0
          ? { ...state.landmark, stage: 1, tile: tile.id, readyTick: state.tick + LANDMARK.stageTicks }
          : state.landmark;
      // A castle worries the Eastern Reach.
      const worried = def.id === "castle" ? changeMood(state, { reach: DIPLOMACY.castleMood }) : state;
      return withMeters({
        ...worried,
        landmark,
        tiles,
        fires: def.id === "campfire" ? { ...state.fires, [tile.id]: burnTicks(state) } : state.fires,
        resources: spend(state.resources, buildingCost(state, def)),
        log: [
          ploughed
            ? `Ploughed the forest into Farmland.`
            : cleared
              ? `Built ${def.name}, clearing the forest beside it.`
              : landmark !== state.landmark
                ? `Work on the ${def.name} has begun (stage 1 of 3).`
                : `Built a ${def.name}.`,
          ...state.log,
        ].slice(0, 30),
        stats: { ...(state.stats ?? emptyStats()), built: (state.stats?.built ?? 0) + 1 },
      });
    }

    case "scout": {
      const cost = scoutCost(state);
      if (tutorialLocked(state, "scout") || !canAfford(state, cost) || state.scouting) return state;
      const frontier = state.tiles.filter(
        (t) =>
          !t.revealed &&
          state.tiles.some((n) => n.revealed && isLand(n.terrain) && hexDistance(n, t) === 1),
      );
      if (frontier.length === 0) return state;
      const rand = mulberry32(state.seed + state.tick * 7 + state.log.length);
      const target = frontier[Math.floor(rand() * frontier.length)];
      const sent: GameState = { ...state, resources: spend(state.resources, cost), flags: { ...state.flags, scouted: true } };
      // In the tutorial the clock is still, so the trip is over at once.
      if (state.tutorialStep < TUTORIAL.length) return withMeters(scoutsReturn(sent, target.id));
      return withMeters({
        ...sent,
        scouting: { tile: target.id, back: state.tick + SCOUT_TRIP.ticks },
        log: [`Scouts set out to explore. They will be back in ${secs(SCOUT_TRIP.ticks)} s.`, ...state.log].slice(0, 30),
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
        state.resources.knowledge < researchCost(state, node) ||
        !goalsMet(state, node.id)
      )
        return state;
      // Elder Ama walks you through what it unlocks (the opening tutorial covers its own).
      const inTut = state.tutorialStep < TUTORIAL.length;
      const coach = AFTER_STEPS[node.id] && !inTut ? { node: node.id, from: coachCount(state, node.id) } : state.coach ?? null;
      return withMeters({
        ...snapshotGoals({ ...state, researched: [...state.researched, node.id] }),
        coach,
        // A short scene of the moment it was discovered (see DISCOVERIES).
        cutscene: DISCOVERIES[node.id] ? node.id : state.cutscene ?? null,
        researched: [...state.researched, node.id],
        flags: { ...state.flags, rocket: state.flags.rocket || node.id === "rocketry" },
        resources: { ...state.resources, knowledge: state.resources.knowledge - researchCost(state, node) },
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
        kingdoms: effect.mood ? changeMood(state, effect.mood).kingdoms : state.kingdoms,
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
      // Skipping players still get everything the tutorial would have given:
      // a woodcutter, a lit campfire, a Wooden House, a gatherer, a war camp
      // with a warrior, Early Farming and a field. The tutorial's buildings are
      // handed over, so its budget isn't: only the after-tutorial reserve is left.
      const skipped = startGrace({
        ...state,
        tutorialStep: TUTORIAL.length,
        researched: state.researched.includes("early-farming") ? state.researched : [...state.researched, "early-farming"],
        resources: {
          ...state.resources,
          food: AFTER_TUTORIAL_RESERVE.food ?? 0,
          wood: AFTER_TUTORIAL_RESERVE.wood ?? 0,
        },
      });
      const counts = countBuildings(state);
      const tiles = state.tiles.map((t) => ({ ...t }));
      if (!counts.woodcutter) giveStartingWoodcutter(tiles, tiles[state.startTile]);
      const pit = counts.campfire ? null : giveStartingCampfire(tiles, tiles[state.startTile]);
      if (!counts.gatherer) {
        const home = tiles[state.startTile];
        // Not right next to a campfire: the smoke would scare the game away.
        const nearFire = (t: Tile) =>
          tiles.some((f) => f.building === "campfire" && hexDistance(f, t) <= FIRE_SCARE.range);
        const spot = tiles
          .filter((t) => t.revealed && (t.terrain === "grass" || t.terrain === "forest") && !t.building && !nearFire(t))
          .sort((a, b) => hexDistance(a, home) - (a.deposit === "berries" ? 2 : 0) - (hexDistance(b, home) - (b.deposit === "berries" ? 2 : 0)))[0];
        if (spot) spot.building = "gatherer";
      }
      // ...and the War Camp with one trained warrior, so the first raid isn't a free win for the raiders.
      let soldiers = state.soldiers;
      if (!counts.warcamp) {
        const home = tiles[state.startTile];
        const camp = BUILDINGS_BY_ID.warcamp;
        const spot = tiles
          .filter((t) => t.revealed && camp.terrain.includes(t.terrain) && !t.building)
          .sort((a, b) => hexDistance(a, home) - hexDistance(b, home))[0];
        if (spot) {
          spot.building = "warcamp";
          soldiers = Math.max(soldiers, 1);
        }
      }
      // A Wooden House (not beside the fire: sparks) and a field on open grass.
      const home = tiles[state.startTile];
      const free = (t: Tile, terrain: string[]) => t.revealed && terrain.includes(t.terrain) && !t.building;
      const byHome = (a: Tile, b: Tile) => hexDistance(a, home) - hexDistance(b, home);
      const clearOfFire = (t: Tile) => !tiles.some((f) => f.building === "campfire" && hexDistance(f, t) <= 1);
      if (!counts.hut) {
        const spot = tiles.filter((t) => free(t, BUILDINGS_BY_ID.hut.terrain) && clearOfFire(t)).sort(byHome)[0];
        if (spot) spot.building = "hut";
      }
      if (!counts.farm) {
        const spot = tiles.filter((t) => free(t, ["grass"]) && clearOfFire(t)).sort(byHome)[0];
        if (spot) spot.building = "farm";
      }
      const fires = pit !== null ? { ...state.fires, [pit]: burnTicks(state) } : state.fires;
      return withMeters({ ...skipped, tiles, fires, soldiers });
    }

    case "train": {
      if (tutorialLocked(state, "train") || state.soldiers >= warriorCap(state) || !canAfford(state, TRAIN_COST))
        return state;
      return withMeters({
        ...addTally(state, "trained", 1),
        soldiers: state.soldiers + 1,
        // After Hunting Spears, new warriors carry spears.
        spearmen: spearmenOf(state) + (state.researched.includes("spears") ? 1 : 0),
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

    case "setKeeper": {
      const tile = state.tiles[action.tileId];
      if (!tile || tile.building !== "campfire") return state;
      const rest = (state.untended ?? []).filter((id) => id !== tile.id);
      return withMeters({
        ...state,
        untended: action.on ? rest : [...rest, tile.id],
        log: [action.on ? "Someone will keep this fire lit." : "Nobody tends this fire now: relight it yourself.", ...state.log].slice(0, 30),
      });
    }

    case "relight": {
      const tile = state.tiles[action.tileId];
      if (!tile || tile.building !== "campfire" || isLit(state, tile) || state.resources.wood < RELIGHT_WOOD) {
        return state;
      }
      return withMeters({
        ...addTally(state, "relights", 1),
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
        tiles: state.tiles.map((t) => (t.id === tile.id ? { ...t, building: target.id, worn: 0 } : t)),
        resources: spend(state.resources, buildingCost(state, target)),
        log: [`Upgraded to a ${target.name}.`, ...state.log].slice(0, 30),
        stats: { ...(state.stats ?? emptyStats()), built: (state.stats?.built ?? 0) + 1 },
      });
    }

    case "plant": {
      const tile = state.tiles[action.tileId];
      if (!tile) return state;
      const why = plantError(state, tile);
      // A click that can't plant says why (it used to do nothing).
      if (why) return { ...state, log: [`Can't plant there: ${why}.`, ...state.log].slice(0, 30) };
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

    case "dismissCutscene":
      return { ...state, cutscene: null };

    case "devCutscene":
      return state.dev && DISCOVERIES[action.id] ? { ...state, cutscene: action.id } : state;

    case "dismissLesson":
      return { ...state, lesson: null };

    case "devLesson": {
      if (!state.dev) return state;
      const seen = state.lessonsSeen ?? [];
      const nextLesson =
        LESSONS.find((l) => l.id === action.id) ?? LESSONS.find((l) => !seen.includes(l.id)) ?? LESSONS[0];
      return {
        ...state,
        lesson: nextLesson.id,
        lessonsSeen: seen.includes(nextLesson.id) ? seen : [...seen, nextLesson.id],
        lessonTick: state.tick,
      };
    }

    case "advanceEra":
      if (!readyForNextEra(state)) return state;
      return { ...state, debrief: makeDebrief(state, "era") };

    case "enterEra": {
      if (state.debrief?.kind !== "era" || !ERAS[state.era + 1]) return state;
      const era = state.era + 1;
      const intro = ERA_INTROS[era];
      return withMeters({
        ...withKingdoms({ ...state, era }),
        era,
        year: ERAS[era].startYear,
        eraStartTick: state.tick,
        debrief: null,
        // Elder Ama welcomes the tribe to the new era (like a lesson).
        ...(intro ? { lesson: intro.id, lessonTick: state.tick } : {}),
        log: [`${state.nation ?? "Your people"} enter the ${ERAS[era].name} era.`, ...state.log].slice(0, 30),
      });
    }

    case "devFinishEra": {
      // Stone Age: Agriculture and 15 people. Ancient: the legion beaten, Coinage
      // and 40 people. Classical: the drought over and the landmark finished.
      if (!state.dev || state.era > 2) return state;
      if (state.era === 2) {
        const built = step({ ...state, droughtDone: true, drought: null }, { type: "devLandmark" });
        return { ...built, debrief: makeDebrief(built, "era") };
      }
      const ready: GameState =
        state.era === 0
          ? {
              ...state,
              researched: Array.from(new Set([...state.researched, "agriculture"])),
              population: Math.max(state.population, NEXT_ERA_POPULATION),
            }
          : {
              ...state,
              legion: null,
              legionDone: true,
              raid: state.raid?.roman ? null : state.raid,
              researched: Array.from(new Set([...state.researched, "coinage"])),
              population: Math.max(state.population, CLASSICAL_POPULATION),
            };
      return { ...ready, debrief: makeDebrief(ready, "era") };
    }

    case "caravan": {
      if (caravanError(state)) return state;
      return withMeters({
        ...addTally(state, "caravans", 1),
        caravans: [...(state.caravans ?? []), { start: state.tick, back: state.tick + CARAVAN.ticks }],
        resources: spend(state.resources, caravanCost(state)),
        log: [`A caravan set off for the Silk Steppe. It will be back in ${secs(CARAVAN.ticks)} s.`, ...state.log].slice(0, 30),
      });
    }

    case "chooseLandmark": {
      if (state.era !== 2 || !state.droughtDone || state.landmark) return state;
      return {
        ...state,
        landmark: { kind: action.kind, stage: 0, readyTick: 0 },
        log: [`We will build the ${LANDMARKS[action.kind].name}. Pick it in the build bar and place it.`, ...state.log].slice(0, 30),
      };
    }

    case "buildStage": {
      const l = state.landmark;
      const cost = nextStageCost(state);
      if (!l || !cost || stageError(state)) return state;
      return withMeters({
        ...state,
        landmark: { ...l, stage: l.stage + 1, readyTick: state.tick + LANDMARK.stageTicks },
        resources: spend(state.resources, cost),
        log: [`Work on stage ${l.stage + 1} of the ${LANDMARKS[l.kind].name} has begun.`, ...state.log].slice(0, 30),
      });
    }

    case "gift": {
      if (giftError(state, action.kingdom)) return state;
      const cost = giftCost(state, action.kingdom);
      const sent = changeMood(addTally(state, "gifts", 1), { [action.kingdom]: DIPLOMACY.gift.mood });
      return withMeters({
        ...sent,
        kingdoms: { ...sent.kingdoms!, [action.kingdom]: { ...sent.kingdoms![action.kingdom], giftTick: state.tick } },
        resources: spend(state.resources, cost),
        log: [`We sent gifts to ${KINGDOMS[action.kingdom].name}. They were pleased.`, ...state.log].slice(0, 30),
      });
    }

    case "treaty": {
      if (treatyError(state, action.kingdom)) return state;
      const k = state.kingdoms![action.kingdom];
      return withMeters({
        ...state,
        kingdoms: { ...state.kingdoms!, [action.kingdom]: { ...k, treaty: true } },
        resources: spend(state.resources, { currency: DIPLOMACY.treaty.coins }),
        log: [`A treaty with ${KINGDOMS[action.kingdom].name}! Trade every day, and no war while it holds.`, ...state.log].slice(0, 30),
      });
    }

    case "raidKingdom":
      return kingdomRaidError(state, action.kingdom) ? state : raidKingdom(state, action.kingdom);

    case "ship": {
      if (shipError(state)) return state;
      const voyage = nextVoyage(state);
      const where = voyage ? (voyage.kind === "outpost" ? "to look for new land" : "to find the kingdoms' coasts") : "to trade";
      return withMeters({
        ...addTally(state, "ships", 1),
        ships: [...(state.ships ?? []), { start: state.tick, back: state.tick + shipTicks(state) }],
        resources: spend(state.resources, shipCost(state)),
        log: [`A ship set sail ${where}. It will be back in ${secs(shipTicks(state))} s.`, ...state.log].slice(0, 30),
      });
    }

    case "harbour": {
      // Close the harbour against the plague (or open it again).
      const p = state.plague;
      if (!p || p.closed === action.closed) return state;
      const first = action.closed && p.closedTick === undefined;
      const next = first ? changeMood(state, { steppe: DIPLOMACY.closeHarbourMood, reach: DIPLOMACY.closeHarbourMood }) : state;
      return withMeters({
        ...next,
        plague: { ...p, closed: action.closed, closedTick: action.closed ? p.closedTick ?? state.tick : p.closedTick },
        log: [
          action.closed
            ? "The harbour is closed: no ship may land. Trade has stopped, and our neighbours are not pleased."
            : "The harbour is open again. Ships and trade are back, and so is the risk.",
          ...state.log,
        ].slice(0, 30),
      });
    }

    case "devLandmark": {
      // Pick the Great Library if nothing is chosen, place it and finish it.
      if (!state.dev) return state;
      const kind = state.landmark?.kind ?? "library";
      let tile = state.landmark?.tile !== undefined ? state.tiles[state.landmark.tile] : null;
      const home = state.tiles[state.startTile];
      if (!tile) {
        const probe: GameState = { ...state, landmark: { kind, stage: 0, readyTick: 0 }, resources: { food: 1e6, wood: 1e6, stone: 1e6, knowledge: 1e6, currency: 1e6 } };
        tile =
          state.tiles
            .filter((t) => !placementError(probe, t, BUILDINGS_BY_ID[kind]))
            .sort((a, b) => hexDistance(a, home) - hexDistance(b, home))[0] ?? null;
      }
      if (!tile) return state;
      const tileId = tile.id;
      return withMeters({
        ...state,
        droughtDone: state.droughtDone || state.era >= 2,
        drought: null,
        landmark: { kind, stage: 3, tile: tileId, readyTick: state.tick },
        tiles: state.tiles.map((t) => (t.id === tileId ? { ...t, building: kind, worn: 0 } : t)),
        log: [`Dev: the ${LANDMARKS[kind].name} is finished.`, ...state.log].slice(0, 30),
      });
    }

    case "devPlague": {
      // soon: sailors warn now, 20 s to go. now: it arrives now. end: it passes next tick.
      if (!state.dev || state.era !== 3 || state.plagueDone) return state;
      const soon = state.tick + (action.when === "now" ? 0 : 13);
      const p = state.plague ?? { warnTick: state.tick, startTick: soon, endTick: soon + PLAGUE.ticks, closed: false, deaths: 0 };
      const plague =
        action.when === "end"
          ? { ...p, startTick: Math.min(p.startTick, state.tick), endTick: state.tick + 1 }
          : { ...p, warnTick: state.tick, startTick: soon, endTick: soon + PLAGUE.ticks };
      return withMeters({ ...state, plague, nextRaidTick: Number.MAX_SAFE_INTEGER, log: [`Dev: plague ${action.when}.`, ...state.log].slice(0, 30) });
    }

    case "devShipBack":
      if (!state.dev) return state;
      return withMeters(returnShips({ ...state, ships: (state.ships ?? []).map((s) => ({ ...s, back: state.tick })) }));

    case "devMood":
      if (!state.dev || !state.kingdoms) return state;
      return withMeters(changeMood(state, { [action.kingdom]: action.by }));

    case "repair": {
      const tile = state.tiles[action.tileId];
      if (!tile?.building || !(tile.worn ?? 0)) return state;
      const cost = repairCost(state, tile);
      if (!canAfford(state, cost)) return state;
      return withMeters({
        ...state,
        tiles: state.tiles.map((t) => (t.id === tile.id ? { ...t, worn: 0 } : t)),
        resources: spend(state.resources, cost),
        log: [`Repaired the ${BUILDINGS_BY_ID[tile.building].name}.`, ...state.log].slice(0, 30),
      });
    }

    case "devWear":
      // Wear every building most of the way down, to test repairs.
      if (!state.dev) return state;
      return withMeters({
        ...state,
        tiles: state.tiles.map((t) => (t.building && t.building !== "campfire" ? { ...t, worn: Math.min(1, (t.worn ?? 0) + 0.8) } : t)),
        log: ["Dev: every building is badly worn.", ...state.log].slice(0, 30),
      });

    case "devDisaster": {
      // Warn now; it strikes 3 ticks later. A landslide needs a stripped slope.
      if (!state.dev || state.disaster) return state;
      const started = startDisaster(state, action.kind, mulberry32(state.seed + state.tick * 71), 3);
      return started === state ? { ...state, log: ["Dev: no stripped slope with buildings below for a landslide.", ...state.log].slice(0, 30) } : started;
    }

    case "devCaravanBack":
      if (!state.dev) return state;
      return withMeters(returnCaravans({ ...state, caravans: (state.caravans ?? []).map((c) => ({ ...c, back: state.tick })) }));

    case "devBeatLegion":
      // Skip the Roman legion: as if it had just been beaten.
      if (!state.dev || state.era !== 1 || state.legionDone) return state;
      return withMeters({
        ...state,
        legion: null,
        raid: state.raid?.roman ? null : state.raid,
        legionDone: true,
        legionBeatenTick: state.tick,
        legionBeatenYear: state.year,
        nextRaidTick: state.tick + RAID_GAP.base,
        log: ["Dev: the Roman legion is beaten.", ...state.log].slice(0, 30),
      });

    case "devDrought": {
      // soon: the elders warn now, 20 s to go. now: it starts now. end: the rains come next tick.
      if (!state.dev || state.era !== 2 || state.droughtDone) return state;
      const soon = state.tick + (action.when === "now" ? 0 : 13);
      const d = state.drought ?? { warnTick: state.tick, startTick: soon, endTick: soon + DROUGHT.ticks };
      const drought =
        action.when === "end"
          ? { ...d, startTick: Math.min(d.startTick, state.tick), endTick: state.tick + 1 }
          : { warnTick: state.tick, startTick: soon, endTick: soon + DROUGHT.ticks };
      return withMeters({
        ...state,
        drought,
        nextRaidTick: Number.MAX_SAFE_INTEGER,
        log: [`Dev: drought ${action.when}.`, ...state.log].slice(0, 30),
      });
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

    case "raidResponse": {
      const raid = state.raid;
      if (!raid || raid.roman || raid.fightStart !== undefined || raid.response) return state;
      if (action.choice === "tribute") {
        const price = tributeCost(raid);
        if (state.resources.food < price) return state;
        return withMeters({
          ...state,
          raid: null,
          resources: { ...state.resources, food: state.resources.food - price },
          nextRaidTick: state.nextRaidTick - RAID_RESPONSE.tributeSooner,
          log: [`We paid ${price} food. The raiders sailed away, but they will be back sooner.`, ...state.log].slice(0, 30),
        });
      }
      return { ...state, raid: { ...raid, response: action.choice } };
    }

    case "devRaidKind":
      if (!state.dev || state.raid) return state;
      return { ...state, nextRaidTick: state.tick, devNextRaid: action.kind };

    case "devRaid":
      if (!state.dev || state.raid) return state;
      return { ...state, nextRaidTick: state.tick };

    case "devOutbreak":
      if (!state.dev) return state;
      return withMeters(maybeOutbreak({ ...state, sick: (state.sick ?? 0) + 4 }, 1, 0, "Dev: outbreak."));

    case "devFiresOut":
      if (!state.dev) return state;
      return withMeters({ ...state, fires: {}, log: ["Dev: all campfires put out.", ...state.log].slice(0, 30) });

    case "devNearlyBehind":
      // Start the Stone Age clock so only 30 s are left.
      if (!state.dev || state.era !== 0) return state;
      return withMeters({
        ...state,
        eraStartTick: state.tick - (ERA_DEADLINE[state.difficulty] ?? ERA_DEADLINE.normal) + 20,
        log: ["Dev: the world is about to move on.", ...state.log].slice(0, 30),
      });

    case "dropPerson":
      return dropPerson(state, action.tileId);

    case "devFogBack":
      if (!state.dev) return state;
      return withMeters(returnFromFog({ ...state, inFog: (state.inFog ?? []).map((p) => ({ ...p, back: state.tick })) }));

    case "devXp":
      if (!state.dev) return state;
      return addXp(state, 100);

    case "devMoment":
      if (!state.dev) return state;
      return withMeters(smallMoment({ ...state, event: null, nextMomentTick: state.tick }, action.id));

    case "famineRelief": {
      if (state.famineTicks <= 0 || state.phase !== "playing") return state;
      const option = famineOptions(state).find((o) => o.id === action.kind);
      if (!option?.ok) return state;
      const log = (line: string) => [line, ...state.log].slice(0, 30);
      if (action.kind === "forage") {
        const patch = new Set(foragePatch(state).map((t) => t.id));
        return withMeters({
          ...state,
          tiles: state.tiles.map((t) => (patch.has(t.id) ? { ...t, growth: Math.max(0.02, t.growth - FAMINE.forage.forestLoss) } : t)),
          resources: { ...state.resources, food: state.resources.food + FAMINE.forage.food },
          forageReadyAt: state.tick + FAMINE.forage.cooldown,
          log: log("Foragers stripped the nearby forest for roots, nuts and game."),
        });
      }
      if (action.kind === "pen") {
        const home = state.tiles[state.startTile];
        const pen = state.tiles.filter((t) => t.building === "pen").sort((a, b) => hexDistance(b, home) - hexDistance(a, home))[0];
        return withMeters({
          ...state,
          tiles: state.tiles.map((t) => (t.id === pen.id ? { ...t, building: null } : t)),
          resources: { ...state.resources, food: state.resources.food + FAMINE.pen.food },
          log: log("The herd was slaughtered to feed the tribe. The pen stands empty."),
        });
      }
      return withMeters({
        ...state,
        resources: { ...state.resources, food: state.resources.food + FAMINE.seed.food },
        seedEatenUntil: state.tick + FAMINE.seed.ticks,
        log: log("The seed grain was eaten. The fields will grow less for a while."),
      });
    }

    case "devStarve":
      if (!state.dev) return state;
      // Empty the stores and start the famine clock, so the emergency options show
      // even in a village that feeds itself (it then winds down as food returns).
      return withMeters({
        ...state,
        resources: { ...state.resources, food: 0 },
        famineTicks: Math.max(state.famineTicks, 20),
        log: ["Dev: the stores are empty.", ...state.log].slice(0, 30),
      });

    case "devCollapse":
      // Wreck the land for a while and start the countdown 30 s from the end.
      if (!state.dev) return state;
      return withMeters({
        ...state,
        modifiers: { ...state.modifiers, sustainability: state.modifiers.sustainability - 100 },
        collapseTicks: Math.max(state.collapseTicks ?? 0, COLLAPSE.ticks - 20),
        log: ["Dev: the land is collapsing.", ...state.log].slice(0, 30),
      });

    case "devGrief":
      if (!state.dev) return state;
      return withMeters(grieve({ ...state, population: Math.max(1, state.population - 1), log: [`Dev: someone dropped into the fire. ${SHAKEN}`, ...state.log].slice(0, 30) }));

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

    case "devSparks": {
      // Every lit fire throws sparks now: a house next to it if there is one, else the grass.
      if (!state.dev) return state;
      let tiles = state.tiles;
      let houses = 0;
      for (const fire of litFires(state)) {
        const near = sparkTargets({ ...state, tiles }, fire);
        const hit = near.find((t) => t.building === "hut") ?? near[0];
        if (!hit) continue;
        if (hit.building === "hut") houses++;
        tiles = tiles.map((t) => (t.id === hit.id ? { ...t, building: t.building === "hut" ? null : t.building, scorch: 1 } : t));
      }
      return withMeters({ ...state, tiles, log: [`Dev: sparks (${houses} house${houses === 1 ? "" : "s"} burned).`, ...state.log].slice(0, 30) });
    }

    case "devClearForest": {
      // Cut half the forest near the village, to test Sustainability and rain.
      if (!state.dev) return state;
      const home = state.tiles[state.startTile];
      const woods = state.tiles.filter((t) => t.terrain === "forest" && !t.building && hexDistance(t, home) <= LAND.radius);
      const cut = new Set(woods.filter((_, i) => i % 2 === 0).map((t) => t.id));
      return withMeters({
        ...state,
        tiles: state.tiles.map((t) => (cut.has(t.id) ? { ...t, growth: 0.02 } : t)),
        log: [`Dev: cut ${cut.size} forest tiles.`, ...state.log].slice(0, 30),
      });
    }

    case "devGoals":
      // Dev: treat every advancement goal as met (toggle).
      return state.dev ? { ...state, devGoals: !state.devGoals } : state;

    case "upgradeWarrior": {
      if (!state.researched.includes("spears") || spearmenOf(state) >= state.soldiers || !canAfford(state, SPEAR_COST))
        return state;
      return withMeters({
        ...state,
        spearmen: spearmenOf(state) + 1,
        resources: spend(state.resources, SPEAR_COST),
        log: ["A warrior took up a spear.", ...state.log].slice(0, 30),
      });
    }

    case "endCoach":
      return { ...state, coach: null };

    case "devCutHills":
      // Finish every quarry's cut at once, to see the scar.
      if (!state.dev) return state;
      return withMeters({
        ...state,
        tiles: state.tiles.map((t) => (t.building === "quarry" ? { ...t, dug: 1, height: cutHeight({ ...t, dug: 1 }) } : t)),
      });

    case "devReveal":
      if (!state.dev) return state;
      return { ...state, tiles: state.tiles.map((t) => (t.revealed ? t : { ...t, revealed: true })) };

    case "hunt":
      return maybeOutbreak({
        ...addTally(state, "hunts", 1),
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
    for (const t of parsed.tiles) if (t.terrain === "mountain") t.height = cutHeight(t);
    // Saves from before spearmen: Hunting Spears used to arm every warrior.
    if (parsed.spearmen === undefined) parsed.spearmen = parsed.researched.includes("spears") ? parsed.soldiers : 0;
    // Saves from before the river: it runs where nothing has been built yet.
    if (!parsed.tiles.some((t) => t.terrain === "river")) {
      for (const id of riverPath(parsed.tiles, parsed.startTile)) {
        const t = parsed.tiles[id];
        if (t.building) continue;
        Object.assign(t, { terrain: "river", height: terrainHeight("river"), island: -1, deposit: null, growth: 0 });
      }
    }
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
