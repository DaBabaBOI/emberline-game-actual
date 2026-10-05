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
  INDUSTRIAL_POPULATION,
  FUTURE_POPULATION,
  CARBON,
  LAST,
  POWER,
  SMOG,
  STATION,
  CLIMATE,
  HOSPITAL,
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
  IMPROVE,
  KARDASHEV,
  TIPPING,
  NUCLEAR,
  AUTOMATION,
  REWILDING,
  OCEAN,
  MINERAL_X,
  SPACE,
  MP,
  TRADE,
  WORK,
  BELIEFS,
  SETTLERS,
  CONNECTIONS,
  HUNTERS,
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
  CANOE,
  REBELLION,
  TUTORIAL,
  TUTORIAL_FAREWELL,
  WARRIORS_PER_CAMP,
} from "./content";
import { cureHint, diseaseName, isCalm, maybeOutbreak, sickShare, stepDisease } from "./disease";
import { hexDistance } from "./hex";
import { generateMap, ISLANDS, isLand, revealAround, riverPath, terrainHeight } from "./map";
import { mulberry32 } from "./noise";
import { cameosFor, EGGS, GOLDEN_DEER_FOOD, type EggId } from "./easter";
import type { IconId } from "./sprites";
import type {
  BoostKey,
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
  MeterKey,
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
  | { type: "scout"; tileId?: number }
  | { type: "research"; nodeId: string }
  | { type: "resolveEvent"; choice: number }
  | { type: "skipTutorial" }
  | { type: "train" }
  | { type: "hunt"; animal: string }
  | { type: "easterEgg"; id: EggId }
  | { type: "setPopLimit"; limit: number | null }
  | { type: "sendSettlers" }
  | { type: "showHint"; id: string }
  | { type: "dismissHint" }
  | { type: "demolish"; tileId: number }
  | { type: "devGrant" }
  | { type: "devPeople" }
  | { type: "devFiresOut" }
  | { type: "devGrief" }
  | { type: "devNearlyBehind" }
  | { type: "dropPerson"; tileId: number | null }
  | { type: "devFogBack" }
  | { type: "devXp" }
  | { type: "devOres" }
  | { type: "devTired" }
  | { type: "launch"; project: string }
  | { type: "devTipping"; when: "soon" | "now" | "end" }
  | { type: "devTypeOne" }
  // Multiplayer: gifts and raids between players.
  | { type: "trade"; get: "food" | "wood" | "stone" }
  | { type: "mpGiftOut"; resources: Partial<Resources>; to: string }
  | { type: "mpGiftIn"; resources: Partial<Resources>; from: string }
  | { type: "mpRaidOut"; warriors: number; to: string }
  | { type: "mpRaidIn"; warriors: number; from: string; seat: number }
  | { type: "mpLoot"; resources: Partial<Resources>; from: string }
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
  | { type: "canoe"; tileId?: number }
  | { type: "crushRebels" }
  | { type: "meetDemands" }
  | { type: "devRebellion"; when: "soon" | "now" }
  | { type: "devLandmark" }
  | { type: "devPlague"; when: "soon" | "now" | "end" }
  | { type: "devClimate"; when: "soon" | "now" | "end" }
  | { type: "devCarbon"; by: number }
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
  | { type: "improve"; tileId: number }
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
  // Start with the tutorial already done (multiplayer; the tutorial also has its own Skip).
  skipTutorial?: boolean;
  // Realistic time (a joke): when the real-time calendar starts (ms since 1970).
  realTimeFrom?: number;
  startEra?: number;
  nation?: string;
  // Multiplayer: everyone in a room plays the same island (the room's seed).
  seed?: number;
  // "Build to Last": start in the Industrial era with three big problems.
  mode?: "last";
  mp?: GameState["mp"];
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
  const seed = options.seed ?? Math.floor(Math.random() * 1e9);
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
    ...(options.realTimeFrom ? { realTimeFrom: options.realTimeFrom } : {}),
    ...(options.mp ? { mp: options.mp } : {}),
    tutorialStep: 0,
    event: null,
    nextEventTick: 90,
    // Team cameos (easter eggs): their joke, newest first, after the opening line.
    log: [...cameosFor(options.nation).map((m) => m.joke).reverse(), `${cleanNation(options.nation)} gather on the shores of Westmarch.`],
  };
  state.forestBaseline = forestGrowthNearHome(state);
  // Elder Ama hands over what each tutorial step needs when it starts (see
  // advanceTutorial), so there's never a big pile; the reserve comes at the end.
  state.resources = tutorialBudget(state, [0]);
  state.resources.food += TUTORIAL_START_FOOD;
  const started = options.dev ? applyDevStart(state, options.startEra ?? 0) : options.mode === "last" ? applyLastStart(state) : state;
  if (options.mode === "last") return { ...started, meters: computeMeters(started) };
  if (options.skipTutorial && !options.dev) return reducer({ ...started, meters: computeMeters(started) }, { type: "skipTutorial" });
  return { ...started, meters: computeMeters(started) };
}

// "Build to Last": the Industrial era in LAST.startYear, with a small working
// town already standing (coal plant and smoky factory included), everything
// from the earlier eras learned, and three big problems to solve. No tutorial,
// no lessons, no raids: just the problems.
function applyLastStart(state: GameState): GameState {
  const researched = [...TREE.filter((n) => !n.comingSoon && !n.secret && n.era < 4).map((n) => n.id), ...LAST.known];
  const home = state.tiles[state.startTile];
  // Explore the island around the town.
  for (const t of state.tiles) if (hexDistance(t, home) <= 6) t.revealed = true;
  let next: GameState = {
    ...devJumpToEra(state, 4),
    mode: "last",
    // Paused until the player has read the three problems (LastIntro).
    speed: 0,
    year: LAST.startYear,
    tutorialStep: TUTORIAL.length,
    researched: Array.from(new Set([...state.researched, ...researched])),
    resources: { ...LAST.resources },
    population: LAST.population,
    carbon: CARBON.start,
    nextRaidTick: Number.MAX_SAFE_INTEGER,
    lessonsSeen: LESSONS.map((l) => l.id),
    lastHeld: 0,
    log: [`${state.nation ?? DEFAULT_NATION}, ${LAST.startYear}: smoke over the town. Solve the three big problems and build something that lasts.`],
  };
  // The town, laid out in districts so it reads at a glance: homes and services
  // in the middle with room between them, farms on a ring further out, and
  // industry together on one side, away from the homes (where the wind takes
  // the smoke).
  const district = (id: string) => (["factory", "coalplant", "quarry", "woodcutter"].includes(id) ? "industry" : id === "farm" ? "farm" : "town");
  const ring: Record<string, [number, number]> = { town: [1, 2], farm: [2, 4], industry: [3, 4] };
  const side = Math.atan2(1, 1);
  const crowd = (t: Tile, tiles: Tile[]) => tiles.filter((n) => n.building && hexDistance(n, t) === 1).length;
  for (const id of LAST.town) {
    const def = BUILDINGS_BY_ID[id];
    if (!def) continue;
    const kind = district(id);
    const [near, far] = ring[kind];
    const score = (t: Tile) => {
      const d = hexDistance(t, home);
      const outside = d < near ? near - d : d > far ? d - far : 0;
      // Industry clusters to one side of the town; everything else keeps away from it.
      const angle = Math.atan2(t.z - home.z, t.x - home.x);
      const off = Math.abs(Math.atan2(Math.sin(angle - side), Math.cos(angle - side)));
      const lean = kind === "industry" ? off : kind === "farm" ? Math.max(0, 1.2 - off) : 0;
      // Homes and services want space around them; industry may sit close together.
      const room = kind === "industry" ? 0 : crowd(t, next.tiles) * 1.5;
      return outside * 3 + lean + room + d * 0.1;
    };
    const spot = next.tiles.filter((t) => t.revealed && !placementError(next, t, def)).sort((a, b) => score(a) - score(b))[0];
    if (spot) next = { ...next, tiles: next.tiles.map((t) => (t.id === spot.id ? { ...t, building: id } : t)) };
  }
  // The town was already here: its buildings and people are not "firsts" that
  // teach us anything new, so they pay no Knowledge.
  // The same for XP: the 60 people were already here, not born this game.
  return {
    ...next,
    milestones: milestonesReached(next).map(([id]) => id),
    stats: { ...(next.stats ?? emptyStats()), peakPopulation: Math.max(next.stats?.peakPopulation ?? 0, LAST.population) },
  };
}

// Build to Last: the three big problems, how each is going, and whether it's solved.
export function lastProblems(state: GameState) {
  const flow = carbonFlow(state) * 40;
  const share = cleanPowerShare(state);
  const cover = powerCover(state);
  const pop = Math.floor(state.population);
  const forest = forestCover(state);
  const m = state.meters;
  return [
    {
      id: "air",
      title: "Clear the air",
      how: "Close coal plants and smoky factories, and keep the forest standing.",
      done: flow <= 0,
      status: flow <= 0 ? `Carbon falling (${flow.toFixed(1)} ppm/min)` : `Carbon rising ${flow.toFixed(1)} ppm/min`,
    },
    {
      id: "power",
      title: "Clean power",
      how: "Learn Hydropower or Renewables, then build dams, wind and solar farms.",
      done: share >= LAST.cleanShare && cover >= 1,
      status: `${Math.round(share * 100)}% clean of ${Math.round(LAST.cleanShare * 100)}%${cover < 1 ? `, grid short (${Math.round(cover * 100)}%)` : ""}`,
    },
    {
      id: "people",
      title: `Home and food for ${LAST.people}`,
      how: "Apartments for room, farms for food, parks to keep people happy.",
      done: pop >= LAST.people && m.food >= LAST.meter && m.shelter >= LAST.meter && forest >= LAST.forest,
      status: `${pop}/${LAST.people} people · food ${Math.round(m.food)} · homes ${Math.round(m.shelter)} · forest ${Math.round(forest * 100)}%/${Math.round(LAST.forest * 100)}%`,
    },
  ];
}

// All three solved, held for LAST.hold ticks in a row: the story ends well.
// Hunters only hunt when the tribe needs the food; otherwise they help gather
// wood (and the wild herds get a rest).
function updateHunters(state: GameState): GameState {
  const camps = countBuildings(state).gatherer ?? 0;
  const helping = state.huntersHelping ?? false;
  // How long the stored food would last, in ticks of eating.
  const stored = state.resources.food / Math.max(consumption(state), 0.1);
  // Not during the tutorial, while the stores are still filling up.
  const want = camps > 0 && state.tutorialStep >= TUTORIAL.length && (helping ? stored >= HUNTERS.huntBelow : stored >= HUNTERS.helpAbove);
  if (want === helping) return state;
  const line = want
    ? "Plenty of food in the stores: the hunters leave the herds alone and gather wood instead."
    : "Food is running lower: the hunters go back out after the herds.";
  return { ...state, huntersHelping: want, log: [line, ...state.log].slice(0, 30) };
}

function updateLast(state: GameState): GameState {
  if (state.mode !== "last" || state.phase !== "playing" || state.finished || state.debrief) return state;
  const solved = lastProblems(state).every((p) => p.done);
  const held = solved ? (state.lastHeld ?? 0) + 1 : 0;
  if (held < LAST.hold) return held === state.lastHeld ? state : { ...state, lastHeld: held };
  const done = { ...state, lastHeld: held, finished: true, log: [`${state.nation ?? "Our people"} built something that lasts: clean air, clean power, and a home for everyone.`, ...state.log].slice(0, 30) };
  return { ...done, debrief: makeDebrief(done, "final") };
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
    plagueDone: state.plagueDone || era >= 4,
    climateDone: state.climateDone || era >= 5,
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

export const treesNear = (state: GameState, tile: Tile) =>
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
// Picking where to send scouts or a canoe.
export const SCOUT_TOOL = "__scout";
export const CANOE_TOOL = "__canoe";

// How far into the fog a tile is: hexes to the nearest known land.
function fogDepth(state: GameState, tile: Tile) {
  let best = Infinity;
  for (const t of state.tiles) if (t.revealed && isLand(t.terrain)) best = Math.min(best, hexDistance(t, tile));
  return best;
}

// Why scouts can't go there (null: they can).
export function scoutTargetError(state: GameState, tile: Tile): string | null {
  if (tile.revealed) return "We know this land already: pick a spot in the fog";
  if (!isLand(tile.terrain) && tile.terrain !== "river") return "Scouts walk: pick fog over land (canoes go by sea)";
  if (fogDepth(state, tile) > SCOUT_TRIP.reach) return `Too far into the unknown: at most ${SCOUT_TRIP.reach} tiles from known land`;
  return null;
}

export function scoutTicks(state: GameState, tile: Tile) {
  return SCOUT_TRIP.ticks + SCOUT_TRIP.perHex * Math.max(0, fogDepth(state, tile) - 1);
}

function nearestDock(state: GameState, tile: Tile) {
  return state.tiles
    .filter((t) => t.building === "dock")
    .sort((a, b) => hexDistance(a, tile) - hexDistance(b, tile))[0];
}

// Why a canoe can't go there (null: it can).
export function canoeTargetError(state: GameState, tile: Tile): string | null {
  const dock = nearestDock(state, tile);
  if (!dock) return "Build a Canoe Dock first";
  const home = state.tiles[state.startTile].island;
  if (isLand(tile.terrain) && tile.island === home) return "Canoes go by sea: pick open water or another island";
  if (hexDistance(dock, tile) > CANOE.reach) return `Too far to paddle: at most ${CANOE.reach} tiles from a dock`;
  return null;
}

export function canoeTicks(state: GameState, tile: Tile) {
  const dock = nearestDock(state, tile);
  const ticks = Math.max(CANOE.ticks, Math.round(10 + CANOE.perHex * (dock ? hexDistance(dock, tile) : 8)));
  // Star Charts: they steer straight, day and night.
  return state.researched.includes("starcharts") ? Math.round(ticks * 0.7) : ticks;
}

// Improving a building with stone and ores: its level (1 as built) and how
// much more it makes for it (output, or room in a home).
export function levelOf(tile: Tile) {
  return Math.max(1, tile.level ?? 1);
}
export function improveFactor(tile: Tile) {
  return 1 + IMPROVE.boost * (levelOf(tile) - 1);
}
// How many people a home holds: an improved one has a little more room
// (rounded down).
export function homeRoom(tile: Tile) {
  return tile.building ? Math.floor((BUILDINGS_BY_ID[tile.building]?.housing ?? 0) * improveFactor(tile)) : 0;
}
// The next level this building can be improved to, what it costs, and (when the
// ore isn't known yet) the advancement it waits for. Null: can't be improved.
export function improveNext(state: GameState, tile: Tile) {
  if (!tile.building || !IMPROVE.buildings.includes(tile.building)) return null;
  const tier = IMPROVE.tiers.find((t) => t.level === levelOf(tile) + 1);
  if (!tier) return null;
  const cost: Partial<Resources> = { stone: IMPROVE.stone[tier.level] };
  if (IMPROVE.currency[tier.level]) cost.currency = IMPROVE.currency[tier.level];
  const known = state.researched.includes(tier.requires);
  return { ...tier, cost, needs: known ? null : TREE_BY_ID[tier.requires]?.name ?? tier.requires };
}

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

// The river card comes once, before anything is built on the river.
function riverChoicePossible(state: GameState) {
  const c = countBuildings(state);
  return !state.riverChoice && !c.aqueduct && !c.watermill;
}

function pickEvent(roll: number, state: GameState) {
  const wildfire = Math.min(FIRE_RISK.max, FIRE_RISK.base + FIRE_RISK.perForestTile * fireRisk(state));
  // Never the same card twice in a row.
  // The old grove only comes up once, and only while there is old forest to protect.
  const grovePossible = !(state.protectedTiles ?? []).length && oldestForest(state, 4).length >= 2;
  const weights = EVENTS.map((e) =>
    e.id === state.lastEvent ||
    (e.era ?? 0) > state.era ||
    (e.id === "sacred-grove" && !grovePossible) ||
    (e.id === "river-spirits" && !riverChoicePossible(state))
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
    if (!(state.outposts ?? []).includes(tile.island)) return "Our canoes and ships haven't reached this island";
    if (!def.overseas) return "Too far from home: only farms, fishing, woodcutters, pens, gatherers and trading posts";
  } else if (def.id === "tradingpost") return "Only on an island our ships have found";
  if (def.unique && (countBuildings(state)[def.id] ?? 0) >= 1) return "There is only one";
  const ploughed = def.id === "farm" && tile.terrain === "forest" && state.researched.includes("heavy-plough");
  const onBank = !!def.riverTerrain?.includes(tile.terrain) && touchesRiver(state, tile);
  if (!def.terrain.includes(tile.terrain) && !ploughed && !onBank)
    return def.riverTerrain ? `Needs ${def.terrain.join(" / ")}, or the river bank` : `Needs ${def.terrain.join(" / ")}`;
  if (def.needsWaterNeighbor) {
    const touchesWater = state.tiles.some(
      (t) => !isLand(t.terrain) && hexDistance(t, tile) === 1,
    );
    if (!touchesWater) return "Must touch water";
  }
  if (def.needsRiver && !touchesRiver(state, tile)) {
    // An aqueduct may instead join one that already brings river water.
    const joins = def.id === "aqueduct" && linkedAqueducts(state).some((t) => hexDistance(t, tile) === 1);
    if (!joins) return def.id === "aqueduct" ? "Must touch the river, or an aqueduct that does" : "Must touch the river";
  }
  if (state.riverChoice === "honour" && (def.id === "aqueduct" || def.id === "watermill")) return "We promised to honour the river";
  if (!canAfford(state, buildingCost(state, def))) return "Not enough resources";
  return null;
}

// How many people live in this home. Families spread out across the homes
// one at a time (so 8 people in 3 huts is 3, 3, 2); anyone left over when
// every home is full sleeps in the open camp (BASE_HOUSING).
export function residents(state: GameState, tile: Tile): { living: number; room: number } | null {
  const room = homeRoom(tile);
  if (!room) return null;
  const homes = state.tiles
    .map((t) => ({ id: t.id, cap: homeRoom(t), living: 0 }))
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
  let room = 0;
  for (const t of state.tiles) {
    const housing = homeRoom(t);
    // Hard mode: a broken-down home only holds half its people.
    room += (t.worn ?? 0) >= 1 ? Math.floor(housing / 2) : housing;
  }
  // Advancements (Reinforced Concrete, High-rises): every home holds more.
  return BASE_HOUSING + Math.floor(room * (1 + boostOf(state, "housing")));
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

// ---- Connections -----------------------------------------------------------

// Aqueducts carry river water: one touching the river, and every aqueduct
// joined to it in a chain of touching tiles. Only these bring water.
export function linkedAqueducts(state: GameState): Tile[] {
  const all = state.tiles.filter((t) => t.building === "aqueduct");
  const linked = all.filter((t) => touchesRiver(state, t));
  const seen = new Set(linked.map((t) => t.id));
  for (let i = 0; i < linked.length; i++)
    for (const t of all)
      if (!seen.has(t.id) && hexDistance(t, linked[i]) === 1) {
        seen.add(t.id);
        linked.push(t);
      }
  return linked;
}

// What a building here gets from the buildings it touches (CONNECTIONS).
export function connections(state: GameState, tile: Tile, building = tile.building) {
  const next = state.tiles.filter((t) => t.building && t.id !== tile.id && hexDistance(t, tile) === 1);
  const out: { with: string[]; bonus: number; why: string }[] = [];
  for (const c of CONNECTIONS) {
    if (c.building !== building) continue;
    const touching = next.filter((t) => c.to.includes(t.building!));
    if (!touching.length) continue;
    out.push({ with: [...new Set(touching.map((t) => t.building!))], bonus: Math.min(c.max, c.bonus * touching.length), why: c.why });
  }
  return out;
}

export function connectionBonus(state: GameState, tile: Tile) {
  return connections(state, tile).reduce((sum, c) => sum + c.bonus, 0);
}

// For the placement card: what this building would connect to here.
export function connectionNote(state: GameState, tile: Tile, building: string): string | null {
  const parts = connections(state, tile, building).map(
    (c) => `${c.with.map((id) => BUILDINGS_BY_ID[id]?.name ?? id).join(" and ")} next door: +${Math.round(c.bonus * 100)}% (${c.why})`,
  );
  // And what it would do for its neighbours.
  const helps = [...new Set(state.tiles
    .filter((t) => t.building && hexDistance(t, tile) === 1 && CONNECTIONS.some((c) => c.building === t.building && c.to.includes(building)))
    .map((t) => BUILDINGS_BY_ID[t.building!]?.name ?? t.building!))];
  if (helps.length) parts.push(`Helps the ${helps.join(" and ")} next door`);
  if (building === "aqueduct" && !touchesRiver(state, tile) && linkedAqueducts(state).some((t) => hexDistance(t, tile) === 1))
    parts.push(`Joins the aqueduct next to it and carries the river water further (+${WATER.chainPeople} people with water)`);
  return parts.length ? `Connects: ${parts.join(". ")}.` : null;
}

// Pairs of touching buildings that help each other, for drawing the links.
export function connectedPairs(state: GameState): [Tile, Tile, "water" | "path"][] {
  const out: [Tile, Tile, "water" | "path"][] = [];
  const linked = linkedAqueducts(state);
  for (let i = 0; i < linked.length; i++)
    for (let j = i + 1; j < linked.length; j++) if (hexDistance(linked[i], linked[j]) === 1) out.push([linked[i], linked[j], "water"]);
  const built = state.tiles.filter((t) => t.building);
  for (const a of built)
    for (const c of CONNECTIONS)
      if (c.building === a.building)
        for (const b of built)
          if (c.to.includes(b.building!) && hexDistance(a, b) === 1 && !out.some(([x, y]) => (x.id === b.id && y.id === a.id) || (x.id === a.id && y.id === b.id)))
            out.push([a, b, "path"]);
  return out;
}

// Is this tile within reach of a building of this kind?
function near(state: GameState, tile: Tile, building: string, reach: number) {
  return state.tiles.some((t) => t.building === building && hexDistance(t, tile) <= reach);
}

// How much a field grows: rain, canals, aqueducts and mills, and seed grain eaten in a famine.
export function farmFactor(state: GameState, tile: Tile) {
  const canal = state.tiles.some((t) => t.building === "canal" && hexDistance(t, tile) === 1) ? 1.5 : 1;
  const watered = linkedAqueducts(state).some((t) => hexDistance(t, tile) <= WATER.aqueductReach);
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
  const linked = linkedAqueducts(state);
  // Aqueducts joined in a chain bring a little more water each.
  const chained = linked.filter((a) => linked.some((b) => b.id !== a.id && hexDistance(a, b) === 1)).length;
  return WATER.base + (c.well ?? 0) * WATER.well + linked.length * WATER.aqueduct + chained * WATER.chainPeople;
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
      return linkedAqueducts(state).some((t) => hexDistance(t, tile) <= WATER.aqueductReach) ? "An aqueduct waters this field: +20%, and it keeps most of its harvest in a drought." : null;
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

// Canoes: one per Canoe Dock. A trip needs a canoe cut from a big tree.
export function bigTree(state: GameState): Tile | null {
  const home = state.tiles[state.startTile];
  return (
    state.tiles
      .filter((t) => t.terrain === "forest" && !t.building && t.island === home.island && t.growth >= CANOE.bigTree && !state.protectedTiles?.includes(t.id))
      .sort((a, b) => hexDistance(a, home) - hexDistance(b, home) || b.growth - a.growth)[0] ?? null
  );
}

export function canoeError(state: GameState): string | null {
  const docks = countBuildings(state).dock ?? 0;
  if (!docks) return "Build a Canoe Dock first";
  if (state.plague?.closed) return "The harbour is closed";
  if ((state.canoes ?? []).length >= docks) return "Every canoe is out";
  if (!bigTree(state)) return "No big trees left to make a canoe";
  if (!canAfford(state, CANOE.cost)) return "Not enough wood and food";
  return null;
}

// What the next canoe will do: find the Southern Isles, then fish the open sea.
export function canoeTrip(state: GameState): "explore" | "fish" {
  const isles = state.tiles.some((t) => t.island === CANOE.island);
  return isles && !(state.outposts ?? []).includes(CANOE.island) && !(state.canoes ?? []).some((c) => c.kind === "explore") ? "explore" : "fish";
}

function returnCanoes(state: GameState): GameState {
  const due = (state.canoes ?? []).filter((c) => state.tick >= c.back);
  if (!due.length) return state;
  let next: GameState = { ...state, canoes: (state.canoes ?? []).filter((c) => state.tick < c.back) };
  for (const c of due) {
    // A canoe sent somewhere maps the sea (and any land) around it.
    if (c.tile !== undefined && next.tiles[c.tile]) {
      const tiles = next.tiles.map((t) => ({ ...t }));
      const before = tiles.filter((t) => t.revealed).length;
      revealAround(tiles, tiles[c.tile], CANOE.sees + (next.researched.includes("starcharts") ? 1 : 0));
      const mapped = tiles.filter((t) => t.revealed).length - before;
      next = { ...next, tiles, log: mapped ? [`The canoe mapped ${mapped} new tiles around where it went.`, ...next.log].slice(0, 30) : next.log };
    }
    if (c.kind === "explore" && !(next.outposts ?? []).includes(CANOE.island)) {
      const tiles = next.tiles.map((t) => (t.island === CANOE.island ? { ...t, revealed: true } : t));
      next = {
        ...next,
        tiles,
        outposts: [...(next.outposts ?? []), CANOE.island],
        log: [`Our canoe reached the ${ISLANDS[CANOE.island]?.name ?? "isles"}! We can build farms, fishing, woodcutters, pens and gatherers there. Each costs coins to keep supplied, and small islands are fragile.`, ...next.log].slice(0, 30),
      };
    } else {
      next = {
        ...next,
        resources: { ...next.resources, food: next.resources.food + CANOE.fish },
        log: [`A canoe came back from the open sea with fish (+${CANOE.fish} food).`, ...next.log].slice(0, 30),
      };
    }
  }
  return next;
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
      log: [
        `The great sickness has passed. It took ${Math.round(p.deaths)} lives. ${state.nation ?? "Your people"} came through the Black Death. Next: learn Steam & Coal and grow to ${INDUSTRIAL_POPULATION} people to enter the Industrial era.`,
        ...state.log,
      ].slice(0, 30),
    };
    return done;
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

// ---- Industrial & Modern era: power, carbon, smog, the climate crisis ------

const HOMES = ["hut", "house", "townhouse", "apartments"];

// The power a building adds to the grid (+) or needs from it (-). Factories
// only need it once Electricity drives their machines.
// What the researched advancements add up to for one thing (see BoostKey):
// a fraction for most (0.25 = 25% more), meter points for happiness and health.
const BOOSTED = TREE.filter((n) => n.boost);
export function boostOf(state: GameState, key: BoostKey): number {
  let sum = 0;
  for (const n of BOOSTED) if (n.boost![key] && state.researched.includes(n.id)) sum += n.boost![key]!;
  return sum;
}

export function powerOf(state: GameState, building: string): number {
  const def = BUILDINGS_BY_ID[building];
  const raw = powerBase(state, building);
  // Advancements: clean plants make more; everything that uses power needs less.
  if (raw > 0 && !def?.carbon) return raw * (1 + boostOf(state, "cleanPower"));
  if (raw < 0) return raw * Math.max(0.3, 1 + boostOf(state, "demand"));
  return raw;
}

function powerBase(state: GameState, building: string): number {
  // Mineral X-7 (Future): everything that needs power needs a quarter less.
  const need = state.researched.includes("mineral-x") ? 1 - MINERAL_X.saving : 1;
  if (building === "factory") return state.researched.includes("electricity") ? -POWER.factoryNeed * need : 0;
  const power = BUILDINGS_BY_ID[building]?.power ?? 0;
  // Plutonium breeders: each nuclear plant makes half as much again.
  if (building === "nuclear" && state.researched.includes("plutonium")) return power * NUCLEAR.breeder;
  return power < 0 ? power * need : power;
}

// Power beamed down from orbit (the Solar Power Satellite).
function orbitPower(state: GameState) {
  return spaceDone(state, "solarsat") ? SPACE.solarPower : 0;
}

export function spaceDone(state: GameState, project: string) {
  return (state.space ?? []).includes(project);
}

function gridTiles(state: GameState) {
  return state.tiles.filter((t) => t.building && !isFlooded(state, t) && wearFactor(t) > 0);
}

export function powerSupply(state: GameState) {
  return gridTiles(state).reduce((sum, t) => sum + Math.max(0, powerOf(state, t.building!)) * wearFactor(t), 0) + orbitPower(state);
}

export function powerDemand(state: GameState) {
  return gridTiles(state).reduce((sum, t) => sum + Math.max(0, -powerOf(state, t.building!)), 0);
}

// 0-1: how much of what is needed the grid covers.
export function powerCover(state: GameState) {
  const need = powerDemand(state);
  return need <= 0 ? 1 : Math.min(1, powerSupply(state) / need);
}

// 0-1: the share of our power that comes without carbon.
export function cleanPowerShare(state: GameState) {
  const supply = powerSupply(state);
  return supply <= 0 ? 0 : cleanPower(state) / supply;
}

// Power made without carbon: water, wind, sun, nuclear, fusion and orbit.
export function cleanPower(state: GameState) {
  return (
    gridTiles(state)
      .filter((t) => powerOf(state, t.building!) > 0 && !BUILDINGS_BY_ID[t.building!].carbon)
      .reduce((sum, t) => sum + powerOf(state, t.building!) * wearFactor(t), 0) + orbitPower(state)
  );
}

// The Kardashev rating (scaled for the game): KARDASHEV.start, climbing to 1
// (Type I) as clean power grows to KARDASHEV.clean.
export function kardashev(state: GameState) {
  return KARDASHEV.start + (1 - KARDASHEV.start) * Math.min(1, cleanPower(state) / KARDASHEV.clean);
}

// Degrees C warmer than before industry.
export function warming(state: GameState) {
  return Math.max(0, ((state.carbon ?? CARBON.start) - CARBON.start) * CARBON.warmingPerPpm);
}

// ppm a tick: every chimney adds, standing forest takes a little back (twice
// as much with Rewilding), and air capture plants take more back.
export function carbonFlow(state: GameState) {
  const added = state.tiles.reduce((sum, t) => sum + (t.building ? (BUILDINGS_BY_ID[t.building].carbon ?? 0) : 0), 0);
  return added * Math.max(0.2, 1 + boostOf(state, "carbon")) - forestSink(state) - carbonCaptured(state);
}

export function forestSink(state: GameState) {
  return CARBON.forestSink * forestCover(state) * (state.researched.includes("rewilding") ? REWILDING.sink : 1) * (1 + boostOf(state, "sink"));
}

// Air capture plants work as well as the grid covers them, and much less on
// coal power (burning carbon to catch carbon).
export function carbonCaptured(state: GameState) {
  const plants = gridTiles(state).filter((t) => BUILDINGS_BY_ID[t.building!].captures);
  if (!plants.length) return 0;
  const clean = cleanPowerShare(state);
  const worth = powerCover(state) * (clean + 0.3 * (1 - clean));
  return plants.reduce((sum, t) => sum + (BUILDINGS_BY_ID[t.building!].captures ?? 0) * wearFactor(t), 0) * worth;
}

function updateCarbon(state: GameState): GameState {
  if (state.era < 4 && state.carbon === undefined) return state;
  const carbon = Math.max(CARBON.start, (state.carbon ?? CARBON.start) + carbonFlow(state));
  return { ...state, carbon };
}

// Smog over the town: each smoky building spreads its smog over the homes
// within range (half with Clean Air Laws); a home near a park breathes clean
// air. The average per home.
export function smogIndex(state: GameState) {
  const homes = state.tiles.filter((t) => t.building && HOMES.includes(t.building));
  if (!homes.length) return 0;
  const smoky = state.tiles.filter((t) => t.building && BUILDINGS_BY_ID[t.building].smog);
  if (!smoky.length) return 0;
  const parks = state.tiles.filter((t) => t.building === "park");
  const laws = state.researched.includes("cleanair") ? SMOG.cleanAir : 1;
  let total = 0;
  for (const h of homes) {
    if (parks.some((p) => hexDistance(p, h) <= SMOG.parkRange)) continue;
    for (const f of smoky) if (hexDistance(f, h) <= SMOG.range) total += BUILDINGS_BY_ID[f.building!].smog! * laws;
  }
  return Math.min(SMOG.max, (total / homes.length) * Math.max(0.1, 1 + boostOf(state, "smog")));
}

// The climate tipping point (Future & Space): TIPPING.afterTicks into the era,
// the scientists warn that the frozen north is thawing. The air has
// TIPPING.ticks to get back down to TIPPING.safe ppm. If it gets there, the
// climate holds; if time runs out first, it tips, for good.
function updateTipping(state: GameState): GameState {
  if (state.era !== 5 || state.tippingDone || state.phase !== "playing") return state;
  const carbon = state.carbon ?? CARBON.start;
  const t = state.tipping;
  if (!t) {
    if (state.tick - (state.eraStartTick ?? 0) < TIPPING.afterTicks || state.raid || state.event) return state;
    // Clean enough already: the permafrost holds.
    if (carbon <= TIPPING.safe) {
      return addXp(
        {
          ...state,
          tippingDone: true,
          log: [`The scientists checked the frozen north: our air is clean enough (${Math.round(carbon)} ppm). The climate holds.`, ...state.log].slice(0, 30),
        },
        XP.era,
      );
    }
    return {
      ...state,
      tipping: { warnTick: state.tick, endTick: state.tick + TIPPING.ticks, startCarbon: carbon },
      lastBigTick: state.tick,
      log: [
        `The scientists warn: the frozen north is thawing. Get the air from ${Math.round(carbon)} back down to ${TIPPING.safe} ppm, or the climate will tip and keep warming on its own. Capture carbon, plant forest, and stop burning coal!`,
        ...state.log,
      ].slice(0, 30),
    };
  }
  if (carbon <= TIPPING.safe) {
    return addXp(
      {
        ...state,
        tipping: null,
        tippingDone: true,
        modifiers: { ...state.modifiers, happiness: state.modifiers.happiness + 10 },
        log: [`We did it: the air is down to ${Math.round(carbon)} ppm, and the frozen north holds. The climate will not tip.`, ...state.log].slice(0, 30),
      },
      XP.era,
    );
  }
  if (state.tick < t.endTick) return state;
  const rand = mulberry32(state.seed + state.tick * 89);
  const stormy = disasterActive(state) ? state : startDisaster(state, "storm", rand, 0);
  return {
    ...stormy,
    tipping: null,
    tippingDone: true,
    tipped: true,
    log: [
      `Too late: the air is still at ${Math.round(carbon)} ppm. The frozen north is thawing for good, and the climate has tipped: hotter summers, failing harvests, and the land pays.`,
      ...stormy.log,
    ].slice(0, 30),
  };
}

// The tipping point's countdown is on.
export function tippingActive(state: GameState) {
  return !!state.tipping && !state.tippingDone;
}

// The end of the story: Type I on the Kardashev scale, once the tipping point
// is decided, with the land still healthy.
export function typeOneReady(state: GameState) {
  return (
    state.era === 5 &&
    !!state.tippingDone &&
    kardashev(state) >= 1 &&
    state.meters.sustainability >= KARDASHEV.minLand &&
    state.phase === "playing"
  );
}

function reachTypeOne(state: GameState): GameState {
  if (state.debrief || state.finished || !typeOneReady(state)) return state;
  const done = { ...state, finished: true, log: [`Type I! ${state.nation ?? "Our people"} power the whole planet cleanly, and the land is still healthy.`, ...state.log].slice(0, 30) };
  return { ...done, debrief: makeDebrief(done, "final") };
}

// Work and rest: the jobs in town against the people free to do them.
export function workload(state: GameState) {
  let needed = 0;
  for (const t of state.tiles) {
    if (!t.building || (t.worn ?? 0) >= 1) continue;
    const def = BUILDINGS_BY_ID[t.building];
    if (!def?.produces || !Object.values(def.produces).some((v) => (v ?? 0) > 0)) continue;
    needed += WORK.big.includes(t.building) ? WORK.bigCrew : WORK.crew;
  }
  // Robots take on the work (Future: Automation).
  if (state.researched.includes("automation")) needed = Math.ceil(needed / 2);
  needed = Math.ceil(needed);
  const workers = Math.max(0, Math.floor(state.population - state.soldiers * (1 - WORK.soldierHelp) - (state.sick ?? 0)));
  return { needed, workers, ratio: workers > 0 ? needed / workers : needed > 0 ? 9 : 0 };
}

// How much less tired people make (0 to WORK.outputLoss, halved by Rest Days).
function fatigueLoss(state: GameState) {
  return ((state.fatigue ?? 0) / 100) * WORK.outputLoss * (state.researched.includes("restdays") ? 0.5 : 1);
}

export function fatigueMood(state: GameState) {
  return Math.round(((state.fatigue ?? 0) / 100) * WORK.mood);
}

function updateFatigue(state: GameState): GameState {
  if (state.tutorialStep < TUTORIAL.length) return state;
  const { ratio } = workload(state);
  const now = state.fatigue ?? 0;
  const rest = WORK.rest * (state.researched.includes("restdays") ? 2 : 1);
  const next = ratio > 1 ? Math.min(100, now + WORK.rise * (ratio - 1)) : Math.max(0, now - rest);
  return next === now ? state : { ...state, fatigue: next };
}

// Automation without a fair share of the work: people lose their jobs and
// their sense of purpose.
export function automationMood(state: GameState) {
  return state.researched.includes("automation") && !state.researched.includes("purpose") ? AUTOMATION.mood : 0;
}

// Is the climate crisis striking now (after the warning, before it's over)?
export function inClimateCrisis(state: GameState) {
  const c = state.climate;
  return !!c && state.tick >= c.startTick && state.tick < c.endTick;
}

// How ready the town is for the crisis, part by part.
export function climateReadiness(state: GameState): { label: string; value: number }[] {
  const R = CLIMATE.ready;
  const c = countBuildings(state);
  const parts: { label: string; value: number }[] = [];
  const walls = Math.min(R.seawallsMax, c.seawall ?? 0);
  if (walls) parts.push({ label: `${walls} Sea Wall${walls === 1 ? "" : "s"} against the floods`, value: walls * R.seawall });
  const hospitals = Math.min(R.hospitalsMax, c.hospital ?? 0);
  if (hospitals) parts.push({ label: `${hospitals} Hospital${hospitals === 1 ? "" : "s"}${powerCover(state) < 1 ? " (short of power)" : ""}`, value: hospitals * R.hospital * powerCover(state) });
  const parks = Math.min(R.parksMax, c.park ?? 0);
  if (parks) parts.push({ label: `${parks} City Park${parks === 1 ? "" : "s"} for shade`, value: parks * R.park });
  const clean = cleanPowerShare(state);
  if (clean > 0) parts.push({ label: `${Math.round(clean * 100)}% clean power`, value: clean * R.cleanPower });
  parts.push({ label: `Forest standing: ${Math.round(forestCover(state) * 100)}%`, value: forestCover(state) * R.forest });
  return parts;
}

export function climateShield(state: GameState) {
  return Math.min(CLIMATE.maxReady, climateReadiness(state).reduce((sum, p) => sum + p.value, 0));
}

// The share of the town the crisis would take at this warming, before readiness.
export function climateBase(state: GameState) {
  const w = warming(state);
  const table = CLIMATE.deaths;
  if (w <= table[0][0]) return table[0][1] * (w / table[0][0]);
  for (let i = 1; i < table.length; i++) {
    const [w0, d0] = table[i - 1];
    const [w1, d1] = table[i];
    if (w <= w1) return d0 + ((d1 - d0) * (w - w0)) / (w1 - w0);
  }
  return table[table.length - 1][1];
}

export function climateToll(state: GameState) {
  return climateBase(state) * (1 - climateShield(state));
}

// The climate crisis: warned of when the year comes; then heatwaves, storms and
// coastal floods together. The town that comes through it can enter the
// Future (or, until that era exists, has finished the game).
function updateClimate(state: GameState): GameState {
  if (state.era !== 4 || state.climateDone || state.phase !== "playing") return state;
  const c = state.climate;
  if (!c) {
    if (state.year < CLIMATE.warnYear || state.raid) return state;
    const start = state.tick + CLIMATE.warnTicks;
    return {
      ...state,
      climate: { warnTick: state.tick, startTick: start, endTick: start + CLIMATE.ticks, deaths: 0 },
      nextRaidTick: Number.MAX_SAFE_INTEGER,
      lastBigTick: state.tick,
      log: [
        `The scientists warn: the world is ${warming(state).toFixed(1)} °C warmer, and the heat, storms and floods they feared are coming together. Build sea walls, hospitals and parks, and switch to clean power!`,
        ...state.log,
      ].slice(0, 30),
    };
  }
  if (state.tick < c.startTick) return state;
  const rand = mulberry32(state.seed + state.tick * 83);
  if (state.tick === c.startTick) {
    // The sea comes in first.
    const flooded = startDisaster({ ...state, disaster: null }, "flood", rand, 0);
    return { ...flooded, log: ["The climate crisis is here: a heatwave, and the sea is coming over the low land.", ...flooded.log].slice(0, 30) };
  }
  // A great storm midway through.
  if (state.tick === c.startTick + Math.round(CLIMATE.ticks / 2) && !disasterActive(state)) return startDisaster(state, "storm", rand, 0);
  if (state.tick >= c.endTick) {
    return {
      ...state,
      climate: null,
      climateDone: true,
      nextRaidTick: state.tick + RAID_GAP.base,
      log: [
        `The worst has passed. The crisis took ${Math.round(c.deaths)} lives. ${state.nation ?? "Your people"} came through. Next: learn Computers and grow to ${FUTURE_POPULATION} people to enter the Future.`,
        ...state.log,
      ].slice(0, 30),
    };
  }
  const rate = 1 - (1 - climateToll(state)) ** (1 / CLIMATE.ticks);
  const died = Math.min(state.population - 1, state.population * rate);
  const counted = bumpStats(state, (st) => {
    st.deaths.climate = (st.deaths.climate ?? 0) + died;
  });
  return { ...counted, population: state.population - died, climate: { ...c, deaths: c.deaths + died } };
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
  // A Canoe Dock links the outposts home too.
  const port = hasPort(state) || (countBuildings(state).dock ?? 0) > 0;
  const closed = !!state.plague?.closed;
  const unpaid = outpostsUnpaid(state);
  // Industrial: electric factories (as well as the grid covers them), and
  // railway stations that carry goods to markets, factories and trading posts.
  const electric = state.researched.includes("electricity") ? 1 + POWER.factoryBoost * powerCover(state) : 1;
  const rail = 1 + STATION.boost * Math.min(STATION.max, countBuildings(state).station ?? 0);
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
    // An improved building (stone, bronze, iron, steel) makes more from the same land.
    const better = improveFactor(tile);
    const boost =
      (tile.building === "factory" ? electric : 1) *
      (["market", "factory", "tradingpost"].includes(tile.building) ? rail : 1) *
      // Future: what needs power works as well as the grid covers it; robots
      // help on farms, in factories, quarries and the woods; weather
      // satellites help the fields.
      (def.era >= 5 && (def.power ?? 0) < 0 ? powerCover(state) : 1) *
      (state.researched.includes("automation") && AUTOMATION.buildings.includes(tile.building) ? 1 + AUTOMATION.boost : 1) *
      (tile.building === "farm" && spaceDone(state, "satellites") ? 1 + SPACE.fieldBoost : 1) *
      // Small advancements: seed saving for fields, baskets for gatherers.
      (tile.building === "farm" && state.researched.includes("seedsaving") ? 1.1 : 1) *
      (tile.building === "gatherer" && state.researched.includes("basketry") ? 1.2 : 1) *
      // Touching the right neighbours (CONNECTIONS).
      (1 + connectionBonus(state, tile));
    // Hunters with nothing to hunt for gather wood at their camp instead; the
    // gathering of wild plants goes on.
    const resting = tile.building === "gatherer" && state.huntersHelping;
    if (resting) out.wood += HUNTERS.wood * factor * share * boost * worn * better;
    for (const [k, v] of Object.entries(def.produces ?? {}))
      // Costs (a bathhouse burning wood) don't shrink as it wears; output does.
      out[k as keyof Resources] += (v ?? 0) * factor * share * boost * (k === "food" ? dust * (resting ? HUNTERS.foodKept : 1) : 1) * ((v ?? 0) > 0 ? worn * better : 1);
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
  // Factories make better tools again: +10% each (up to three).
  const factories = Math.min(3, countBuildings(state).factory ?? 0);
  const tools = (1 + 0.2 * Math.min(3, smithies)) * (1 + LEARNING.guildTools * guilds) * (1 + 0.1 * factories);
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
  if (state.researched.includes("computers")) out.knowledge *= 1.3;
  // Multiplayer: the match's speed.
  if (state.mp) out.knowledge *= MP.pace[state.mp.speed];
  // Tired from overwork: less of everything they make.
  const tired = 1 - fatigueLoss(state);
  if (tired < 1) for (const k of Object.keys(out) as (keyof Resources)[]) if (out[k] > 0) out[k] *= tired;
  if (spaceDone(state, "telescope")) out.knowledge *= 1 + SPACE.knowledgeBoost;
  // The climate tipped: for good, hotter summers and droughts cut harvests.
  if (state.tipped) out.food *= 1 - TIPPING.food;
  // The climate crisis: heat and storms ruin crops, the warmer the worse.
  if (inClimateCrisis(state)) out.food *= Math.max(0.3, 1 - CLIMATE.cropLoss * warming(state));
  if (state.researched.includes("roads")) out.currency *= ROADS_COINS;
  // The many smaller Industrial advancements.
  const more: [keyof Resources, BoostKey][] = [["food", "food"], ["wood", "wood"], ["stone", "stone"], ["knowledge", "knowledge"], ["currency", "coins"]];
  for (const [r, key] of more) if (out[r] > 0) out[r] *= 1 + boostOf(state, key);
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
// With Warm Clothes, families cook at small hearths in their homes instead.
export function eatingRaw(state: GameState) {
  return state.tutorialStep >= TUTORIAL.length && !state.researched.includes("hide-clothing") && !state.tiles.some((t) => isLit(state, t));
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
  id: "fire" | "food" | "wood" | "famine" | "tired" | "unrest" | "collapse" | "behind" | "land" | "sick" | "rain" | "wear" | "roof" | "hostile-steppe" | "hostile-reach";
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
  // Realistic time: the next era is tens of thousands of real years away, so
  // there is no deadline.
  if (state.realTimeFrom) return null;
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

  // Overworked: more jobs than hands.
  if ((state.fatigue ?? 0) >= WORK.warnAt) {
    const w = workload(state);
    out.push({
      id: "tired",
      icon: "sad",
      text: `Your people are worn out: ${w.needed} jobs, ${w.workers} people free to work (the sick can't; warriors help half the time). They make ${Math.round(fatigueLoss(state) * 100)}% less and are unhappier. Grow the town, train fewer warriors, remove buildings you don't need, or learn Rest Days.`,
      severe: (state.fatigue ?? 0) >= 70,
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
          : `${n} people are sick with fever and can't work. ${cureHint(state)} and stop the spread.`,
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
      text: state.researched.includes("hide-clothing")
        ? `${cold} people are cold and becoming unhappy. Each fire warms ${GROWTH_PRESSURE.peoplePerFire}; each Livestock Pen clothes ${GROWTH_PRESSURE.peoplePerPen}.`
        : `Not enough campfires: ${cold} people are cold and becoming unhappy. Each fire warms ${GROWTH_PRESSURE.peoplePerFire}.`,
      severe: false,
    });
  }

  if (!hasLitFire(state) && coldShare(state) > 0.05 && state.researched.includes("hide-clothing")) {
    const cold = Math.round(coldShare(state) * state.population);
    out.push({
      id: "fire",
      icon: "sheep",
      text: `${cold} people have no warm clothes. Each Livestock Pen clothes ${GROWTH_PRESSURE.peoplePerPen} (or light a campfire).`,
      severe: false,
    });
  } else if (!hasLitFire(state) && coldShare(state) > 0.05) {
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
  // What to do about it, with this town's numbers (shown by "What should I fix?").
  fix?: string;
}

// Everything that pushes Sustainability up or down, so the player can see
// exactly what their choices are costing the land. computeMeters sums these.
export function sustainabilityBreakdown(state: GameState): SustainPart[] {
  const counts = countBuildings(state);
  const lit = litFires(state).length;
  const cover = forestCover(state);
  const dugTotal = state.tiles.reduce((sum, t) => sum + (t.dug ?? 0), 0);
  const cutHills = state.tiles.filter((t) => (t.dug ?? 0) > 0).length;
  // For the fixes: thin forest near home, clear-cutting woodcutters, fires
  // beyond what keeps everyone warm.
  const home = state.tiles[state.startTile];
  const thin = state.tiles.filter((t) => t.terrain === "forest" && !t.building && t.growth < 0.6 && hexDistance(t, home) <= LAND.radius).length;
  const clearCutters = state.tiles.filter((t) => t.building === "woodcutter" && loggingMode(state, t) === "clear").length;
  const pensWarm = state.researched.includes("hide-clothing") ? (counts.pen ?? 0) * GROWTH_PRESSURE.peoplePerPen : 0;
  const firesNeeded = Math.max(1, Math.ceil(Math.max(0, state.population - pensWarm - (counts.townhouse ?? 0) * TOWN.warmth) / GROWTH_PRESSURE.peoplePerFire));
  const spareFires = Math.max(0, lit - firesNeeded);
  const forestFix = [
    thin
      ? state.researched.includes("early-farming")
        ? `Plant saplings on the ${thin} thinned patch${thin === 1 ? "" : "es"} of forest near the village (Plant button, ${PLANT_COST.food} food each).`
        : `Learn Early Farming, then plant saplings on the ${thin} thinned patch${thin === 1 ? "" : "es"} of forest near the village.`
      : "",
    clearCutters ? `Switch ${clearCutters} woodcutter${clearCutters === 1 ? "" : "s"} to selective logging (click a Woodcutter): half the wood, but the forest keeps up.` : "",
  ]
    .filter(Boolean)
    .join(" ");
  const parts: SustainPart[] = [
    {
      label: `Forest standing: ${Math.round(cover * 100)}%`,
      value: -(1 - cover) * 85,
      hint: "Woodcutters fell trees faster than they grow back. Selective logging and replanting help.",
      fix: forestFix || "Leave the forest to grow back: it takes a few minutes.",
    },
    {
      label: `Smoke from ${lit} fire${lit === 1 ? "" : "s"}`,
      value: -lit * 2,
      hint: "Every fire burns wood and fills the air with smoke.",
      fix: spareFires
        ? `Let ${spareFires} fire${spareFires === 1 ? "" : "s"} go out (click a fire to send its keeper away): ${firesNeeded} keep${firesNeeded === 1 ? "s" : ""} everyone warm.`
        : state.researched.includes("hide-clothing")
          ? "Every fire is needed for warmth. Livestock Pens (with Warm Clothes) keep people warm without one."
          : "Every fire is needed for warmth. Learn Warm Clothes so Livestock Pens can keep people warm instead.",
    },
    {
      label: `${cutHills} hillside${cutHills === 1 ? "" : "s"} cut away by quarries`,
      value: -((counts.quarry ?? 0) * QUARRY_CUT.perQuarry + dugTotal * QUARRY_CUT.perHill),
      hint: "Quarries cut the hill down for good: the scar stays even after the quarry is gone. Their dust also smothers nearby crops.",
      fix: counts.quarry
        ? `Demolish quarries you no longer need (${counts.quarry} working). The cut hills stay, but they stop getting worse.`
        : "The cut hills never grow back. Build fewer quarries in future.",
    },
    {
      label: `${counts.gatherer ?? 0} gatherer camp${counts.gatherer === 1 ? "" : "s"} hunting the wild`,
      value: -Math.max(0, (counts.gatherer ?? 0) - GATHERING.freeCamps) * GATHERING.sustainPerExtra,
      hint: `The wild can feed ${GATHERING.freeCamps} camps. Past that, animals are hunted faster than they can have young, and there are fewer each year.`,
      fix: `Demolish ${Math.max(0, (counts.gatherer ?? 0) - GATHERING.freeCamps)} Gatherer's Camp${(counts.gatherer ?? 0) - GATHERING.freeCamps === 1 ? "" : "s"} (keep ${GATHERING.freeCamps}) and get food from fields or fishing instead.`,
    },
    {
      label: `${counts.watchfire ?? 0} watch tower${counts.watchfire === 1 ? "" : "s"}`,
      value: -(counts.watchfire ?? 0) * WATCH_FIRE.smoke,
      hint: "Each watch tower is built from the biggest logs in the forest.",
      fix: "Keep one watch tower at most: the second adds little.",
    },
    {
      label: `${counts.farm ?? 0} field${counts.farm === 1 ? "" : "s"} cleared${state.researched.includes("three-field") ? " (resting in turn)" : ""}`,
      value: -(counts.farm ?? 0) * (state.researched.includes("three-field") ? FARMING.rotationStrain : 1),
      hint: "Farmland replaces wild land.",
      fix: state.researched.includes("three-field")
        ? "Fields are resting in turn already. Fewer, better-watered fields (wells, aqueducts) cost the land less."
        : (TREE_BY_ID["three-field"]?.era ?? 99) <= state.era
          ? "Learn Three-Field Rotation (Advancements): resting fields in turn halves their cost to the land."
          : "Each field takes wild land. Grow food with fewer fields: fishing, and keep forest near them so the rain keeps up.",
    },
    {
      label: `${counts.pen ?? 0} livestock pen${counts.pen === 1 ? "" : "s"} grazing`,
      value: -(counts.pen ?? 0) * 2,
      hint: "Grazing animals wear down the grass around them.",
      fix: "Demolish pens you don't need for food or warm clothes.",
    },
    {
      label: `${counts.smithy ?? 0} smith${counts.smithy === 1 ? "y" : "ies"} burning charcoal`,
      value: -(counts.smithy ?? 0) * 4,
      hint: "Smelting bronze burns wood all the time and fills the air with smoke.",
      fix: "Keep a single smithy: once your warriors are armed, more only burn wood.",
    },
    {
      label: `${counts.canal ?? 0} canal${counts.canal === 1 ? "" : "s"} salting the soil`,
      value: -(counts.canal ?? 0) * 3,
      hint: "Irrigation water leaves salt behind as it dries.",
      fix: "Demolish canals that no longer water many fields.",
    },
    {
      label: `${counts.house ?? 0} brick house${counts.house === 1 ? "" : "s"}`,
      value: -(counts.house ?? 0) * 1,
      hint: "Bricks are fired in kilns that burn wood.",
      fix: "Each brick house costs a little: build Town Houses (more people per building) instead of many brick houses.",
    },
    {
      label: `${counts.well ?? 0} wells drawing down the ground water`,
      value: -Math.max(0, (counts.well ?? 0) - WATER.wellsFree) * WATER.wellSustain,
      hint: `The ground can feed ${WATER.wellsFree} wells. Past that, the water under the ground sinks and the land around dries out.`,
      fix: `Demolish ${Math.max(0, (counts.well ?? 0) - WATER.wellsFree)} well${(counts.well ?? 0) - WATER.wellsFree === 1 ? "" : "s"} (keep ${WATER.wellsFree}); an aqueduct brings more water without draining the ground.`,
    },
    {
      label: `${(counts.aqueduct ?? 0) + (counts.watermill ?? 0)} aqueduct${(counts.aqueduct ?? 0) + (counts.watermill ?? 0) === 1 ? "" : "s"} and mills on the river`,
      value: -((counts.aqueduct ?? 0) * 3 + (counts.watermill ?? 0) * 2),
      hint: "Every aqueduct takes water from the river, and every mill dams it. Fish and marshes downstream suffer.",
      fix: "Demolish mills and aqueducts that serve few fields or homes.",
    },
    {
      label: `${counts.latrine ?? 0} latrine${counts.latrine === 1 ? "" : "s"} draining into the river`,
      value: -(counts.latrine ?? 0) * 1,
      hint: "The drains keep the streets clean, but the waste ends up downstream.",
      fix: "A small cost worth paying while it keeps the town healthy. Keep just enough latrines.",
    },
    {
      label: `${counts.baths ?? 0} bathhouse${counts.baths === 1 ? "" : "s"} heating water`,
      value: -(counts.baths ?? 0) * 2,
      hint: "Bathhouses burn wood all day to heat their pools.",
      fix: "Keep one bathhouse; a second adds little health.",
    },
    {
      label: `${overseasBuildings(state)} building${overseasBuildings(state) === 1 ? "" : "s"} on small islands`,
      value: -overseasBuildings(state) * CANOE.fragile,
      hint: "Small islands have little forest and few animals: what is cleared there grows back slowly.",
      fix: "Build less on the small islands: demolish outposts you can do without.",
    },
    {
      label: `${counts.temple ?? 0} temple${counts.temple === 1 ? "" : "s"} of cut stone`,
      value: -(counts.temple ?? 0) * BELIEFS.templeSustain,
      hint: "Stone for the walls and columns is cut from the hills.",
      fix: "Keep to the temples you have: each one cuts more of the hills.",
    },
    {
      label: "The river is honoured",
      value: state.riverChoice === "honour" ? BELIEFS.riverSustain : 0,
      hint: "No mills or aqueducts on it, by the people's choice: the fish and marshes downstream thrive.",
    },
    {
      label: `Carbon in the air: ${Math.round(state.carbon ?? CARBON.start)} ppm (+${warming(state).toFixed(1)} °C)`,
      value: -warming(state) * 12,
      hint: "Coal plants, factories and steam trains put carbon into the air, and it stays there, warming the whole world. Standing forest takes a little back.",
    },
    {
      label: `${(counts.coalplant ?? 0) + (counts.factory ?? 0)} coal plant${(counts.coalplant ?? 0) + (counts.factory ?? 0) === 1 ? "" : "s"} and factories`,
      value: -((counts.coalplant ?? 0) * 3 + (counts.factory ?? 0) * 2),
      hint: "Coal is dug from the hills and its ash and smoke settle on the land and the rivers.",
    },
    {
      label: `${counts.hydrodam ?? 0} dam on the river`,
      value: -(counts.hydrodam ?? 0) * 4,
      hint: "The dam floods the valley behind it and stops the fish swimming upriver.",
    },
    {
      label: `${counts.park ?? 0} city park${counts.park === 1 ? "" : "s"}`,
      value: Math.min(3, counts.park ?? 0) * 1,
      hint: "Trees and grass in town give a little back to the land.",
    },
    {
      label: `Nuclear waste from ${counts.nuclear ?? 0} plant${counts.nuclear === 1 ? "" : "s"}`,
      value: -(counts.nuclear ?? 0) * (BUILDINGS_BY_ID.nuclear?.waste ?? 0) * (state.researched.includes("plutonium") ? NUCLEAR.breeder : 1),
      hint: "Spent fuel stays dangerous for thousands of years and has to be guarded all that time.",
      fix: "Fewer nuclear plants: wind, sun, water and (later) fusion leave no waste like it.",
    },
    {
      label: `${Math.min(OCEAN.max, counts.oceancleaner ?? 0)} ocean clean-up${counts.oceancleaner === 1 ? "" : "s"}`,
      value: Math.min(OCEAN.max, counts.oceancleaner ?? 0) * OCEAN.sustain * powerCover(state),
      hint: `Plastic and lost nets swept out of the sea: +${OCEAN.sustain} each, up to ${OCEAN.max}.`,
    },
    {
      label: "The climate tipped",
      value: state.tipped ? -TIPPING.sustain : 0,
      hint: "The frozen north thawed and keeps warming the world on its own. This can't be undone.",
    },
    {
      label: "Recent events",
      value: state.modifiers.sustainability,
      hint: "Fires and choices you made in events. This fades over time.",
      fix: "Nothing to do: this fades by itself.",
    },
  ];
  // Only what is actually costing (or helping) the land right now.
  return parts.filter((p) => Math.abs(p.value) >= 0.5);
}

// Why every other meter is where it is: the parts computeMeters adds up, each
// with a hint, and for those that are holding the meter back, what to do about
// it (`fix`) and roughly how much that would add (`gain`). The meter panels
// show these; "What should I fix?" lists the three biggest gains.
export type MeterPart = SustainPart & { gain?: number };

export function meterBreakdown(state: GameState, key: MeterKey): MeterPart[] {
  if (key === "sustainability") {
    return [
      { label: "Untouched land", value: 100, hint: "Every island starts at 100." },
      ...sustainabilityBreakdown(state).map((p) => ({ ...p, gain: p.fix && p.value < 0 ? -p.value : undefined })),
    ];
  }
  const counts = countBuildings(state);
  const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
  // "Build a School: …", or "Learn Writing, then build a School: …", or
  // nothing when it doesn't exist in this era yet.
  const a = (name: string) => (/land$/.test(name) ? name : `${/^[AEIOU]/.test(name) ? "an" : "a"} ${name}`);
  const build = (id: string, why: string) => {
    const def = BUILDINGS_BY_ID[id];
    if (!def) return undefined;
    if (isUnlocked(state, def)) return `Build ${a(def.name)}: ${why}`;
    if (def.era <= state.era && def.requires && !state.researched.includes(def.requires)) {
      return `Learn ${TREE_BY_ID[def.requires]?.name ?? def.requires} (Advancements), then build ${a(def.name)}: ${why}`;
    }
    return undefined;
  };
  // The first of these that can be built now; failing that, the first that
  // can be learned.
  const buildFirst = (options: [string, string][]) => {
    const now = options.find(([id]) => BUILDINGS_BY_ID[id] && isUnlocked(state, BUILDINGS_BY_ID[id]));
    if (now) return build(...now);
    for (const o of options) {
      const fix = build(...o);
      if (fix) return fix;
    }
    return undefined;
  };
  const lit = litFires(state).length;
  const fireBoost = state.researched.includes("firekeeping") ? 1.5 : 1;
  let parts: MeterPart[] = [];

  if (key === "food") {
    const made = production(state).food;
    const eaten = Math.max(consumption(state), 0.1);
    const ratio = made / eaten;
    const stockDays = state.resources.food / eaten;
    const making = ratio * 45;
    const stored = Math.min(10, stockDays / 4);
    const foodFix = buildFirst([
      ["fishing", "steady food that doesn't clear land."],
      ["farm", "lots of food, but it clears forest."],
      ...((counts.gatherer ?? 0) < GATHERING.freeCamps ? [["gatherer", "wild food near the forest."] as [string, string]] : []),
    ]);
    parts = [
      {
        label: `Making ${made.toFixed(1)} food for every ${eaten.toFixed(1)} eaten`,
        value: making,
        hint: "45 means just enough. Making twice what you eat gives about 90.",
        fix: foodFix,
        gain: foodFix ? Math.max(0, 90 - making) : undefined,
      },
      {
        label: `${Math.floor(state.resources.food)} food in store`,
        value: stored,
        hint: "A full store adds a little (up to +10).",
      },
    ];
    if (state.resources.food <= 0) {
      parts.push({
        label: "The stores are empty",
        value: Math.min(0, 5 - (making + stored)),
        hint: "With nothing stored, this meter can't go above 5.",
        fix: "Get food in now: famine relief, or a Gatherer's Camp or Fishing Spot.",
        gain: Math.max(0, making + stored - 5),
      });
    }
    const thirst = thirstShare(state);
    if (thirst > 0) {
      const before = Math.min(making + stored, state.resources.food <= 0 ? Math.min(making + stored, 5) : making + stored);
      parts.push({
        label: `${Math.round(thirst * 100)}% without water in the drought`,
        value: -before * 0.3 * thirst,
        hint: "In the drought, only springs, wells and aqueducts keep water flowing.",
        fix: buildFirst([
          ["aqueduct", "water for the whole town."],
          ["well", "water for more people."],
        ]),
        gain: before * 0.3 * thirst,
      });
    }
  }

  if (key === "shelter") {
    const room = housingCapacity(state);
    const homes = Math.min(1.1, room / Math.max(1, state.population)) * 70;
    const homeless = homelessCount(state);
    const healers = counts.healer ?? 0;
    const water = Math.min(15, (counts.well ?? 0) * 3 + (counts.aqueduct ?? 0) * 6);
    const clean = sanitation(state);
    const homeFix = buildFirst([
      ["townhouse", "room for many people."],
      ["house", "room for more people."],
      ["hut", "room for more people."],
    ]);
    parts = [
      {
        label: `Room for ${room} of ${state.population} people`,
        value: homes,
        hint: "Up to 77 when everyone has a roof and there is a little room to spare.",
        fix: homeless > 0 ? homeFix?.replace(":", ` (${plural(homeless, "person", "people")} sleeping outside):`) : homes < 77 ? homeFix : undefined,
        gain: homeFix ? 77 - homes : undefined,
      },
      {
        label: plural(healers, "healer"),
        value: healers * 12,
        hint: "Each Healer's Hut adds 12.",
        fix: healers === 0 ? build("healer", "+12, and the sick get better faster.") : undefined,
        gain: healers === 0 ? 12 : undefined,
      },
      {
        label: "Clean water",
        value: water,
        hint: "Wells (+3 each) and aqueducts (+6) keep people healthy, up to +15.",
        fix: water < 15 ? build("well", `+3 (up to +15).`) : undefined,
        gain: water < 15 ? Math.min(3, 15 - water) : undefined,
      },
    ];
    if (clean < 1) {
      const dirty = Math.ceil(state.population * (1 - clean));
      const latrines = Math.ceil(dirty / TOWN.latrine);
      parts.push({
        label: `Dirty streets (${Math.round((1 - clean) * 100)}% of the town)`,
        value: -(1 - clean) * 12,
        hint: "A crowded town needs latrines and bathhouses.",
        fix: build("latrine", `${plural(latrines, "more latrine")} would keep every street clean.`),
        gain: (1 - clean) * 12,
      });
    }
  }

  if (key === "energy") {
    const townhouses = counts.townhouse ?? 0;
    const windmills = counts.windmill ?? 0;
    parts = [
      {
        label: `${plural(lit, "fire")} burning${fireBoost > 1 ? " (Firekeeping: ×1.5)" : ""}`,
        value: lit * 20 * fireBoost,
        hint: "Every lit fire gives energy, but burns wood and adds smoke (−2 Sustainability).",
        fix: "Light another fire, or relight one that went out (it costs wood and adds smoke).",
        gain: 20 * fireBoost,
      },
      {
        label: plural(townhouses, "town house"),
        value: townhouses * 10,
        hint: "Shared hearths: +10 each.",
        fix: build("townhouse", "+10, and room for many people."),
        gain: 10,
      },
      {
        label: plural(windmills, "windmill"),
        value: windmills * FARMING.windmillEnergy,
        hint: `Wind power: +${FARMING.windmillEnergy} each, with no smoke.`,
        fix: build("windmill", `+${FARMING.windmillEnergy} with no smoke.`),
        gain: FARMING.windmillEnergy,
      },
    ];
  }

  if (key === "literacy") {
    const each = (id: string, per: number, label: string, many?: string) => {
      const n = counts[id] ?? 0;
      const fix = build(id, `+${per}.`);
      return { label: plural(n, label, many), value: n * per, hint: `+${per} each.`, fix, gain: fix ? per : undefined };
    };
    const learned = state.researched.length - 1;
    parts = [
      each("elder", 12, "elder"),
      each("school", 15, "school"),
      each("academy", 15, "academy", "academies"),
      each("university", LEARNING.universityLiteracy, "university", "universities"),
      {
        label: "Great Library",
        value: landmarkWorking(state, "library") ? LANDMARK.libraryLiteracy : 0,
        hint: `The landmark adds ${LANDMARK.libraryLiteracy} once finished.`,
      },
      each("temple", BELIEFS.templeLiteracy, "temple"),
      {
        label: "Printing",
        value: state.researched.includes("printing") ? LEARNING.printingLiteracy : 0,
        hint: `Books for everyone: +${LEARNING.printingLiteracy}.`,
      },
      {
        label: "Shorter Work Week",
        value: state.researched.includes("purpose") ? AUTOMATION.literacy : 0,
        hint: `Time to learn: +${AUTOMATION.literacy}.`,
      },
      {
        label: `${plural(learned, "advancement")} learned`,
        value: learned * 2,
        hint: "+2 for each advancement.",
        fix: "Research another advancement: +2.",
        gain: 2,
      },
    ];
  }

  if (key === "happiness") {
    const m = computeMeters(state);
    const cold = state.tutorialStep < TUTORIAL.length ? 0 : NO_FIRE_PENALTY * coldShare(state);
    const sick = sickShare(state);
    const thirst = thirstShare(state);
    const roof = homelessMood(state);
    const baths = Math.min(2, counts.baths ?? 0);
    const guilds = Math.min(2, counts.guildhall ?? 0);
    parts = [
      {
        label: `Food & Water (${m.food}) × 0.35`,
        value: m.food * 0.35,
        hint: "A well-fed tribe is a happy one.",
        fix: m.food < 70 ? "Raise Food & Water: click that meter to see how." : undefined,
        gain: m.food < 70 ? (100 - m.food) * 0.35 : undefined,
      },
      {
        label: `Shelter & Health (${m.shelter}) × 0.35`,
        value: m.shelter * 0.35,
        hint: "Homes, healers and clean water.",
        fix: m.shelter < 70 ? "Raise Shelter & Health: click that meter to see how." : undefined,
        gain: m.shelter < 70 ? (100 - m.shelter) * 0.35 : undefined,
      },
      {
        label: `${plural(lit, "fire")} to gather round`,
        value: Math.min(3, lit) * 6,
        hint: "+6 for each fire, up to 3 fires.",
        fix: lit < 3 ? "Light another fire to gather round (+6; it adds smoke)." : undefined,
        gain: lit < 3 ? 6 : undefined,
      },
      {
        label: "An elder to tell the stories",
        value: counts.elder ? 5 : 0,
        hint: "+5 with an Elder's Hut.",
        fix: counts.elder ? undefined : build("elder", "+5."),
        gain: counts.elder ? undefined : 5,
      },
      {
        label: `Cold: ${Math.round(coldShare(state) * 100)}% with no fire${state.era >= 4 ? ", warm clothes or heated home" : state.researched.includes("hide-clothing") ? " or warm clothes" : ""}`,
        value: -cold,
        hint: `Each fire warms ${GROWTH_PRESSURE.peoplePerFire} people; pens (with Warm Clothes) and Town Houses warm people too.`,
        fix: "Light another fire, or keep people warm with pens and Warm Clothes.",
      },
      {
        label: `Land health (Sustainability ${m.sustainability})`,
        value: -(100 - m.sustainability) * 0.15,
        hint: "People notice when the forest and the animals disappear.",
        fix: "Raise Sustainability: click that meter and press What should I fix?",
      },
      {
        label: `${state.sick ?? 0} sick`,
        value: -sick * 30,
        hint: "Sickness spreads in crowded, dirty, roofless places.",
        fix: build("healer", "the sick get better faster.") ?? "Keep people housed and the streets clean so it can't spread.",
      },
      {
        label: "Famine",
        value: state.famineTicks > 0 ? -FAMINE.happiness : 0,
        hint: "Starving people are desperate.",
        fix: "Get food in now: see the famine card.",
      },
      {
        label: `${plural(homelessCount(state), "person", "people")} with no roof`,
        value: -roof,
        hint: "Sleeping outside makes people unhappy and sick.",
        fix: buildFirst([
          ["townhouse", "room for many people."],
          ["house", "room for more people."],
          ["hut", "room for more people."],
        ]) ?? "Build more homes.",
      },
      {
        label: `${Math.round(thirst * 100)}% thirsty`,
        value: -thirst * DROUGHT.thirstMood,
        hint: "In the drought, water is everything.",
        fix: build("well", "water for more people."),
      },
      { label: plural(baths, "bathhouse"), value: baths * TOWN.bathsMood, hint: `+${TOWN.bathsMood} each, up to 2.` },
      {
        label: plural(Math.min(BELIEFS.max, counts.shrine ?? 0), "shrine"),
        value: Math.min(BELIEFS.max, counts.shrine ?? 0) * BELIEFS.shrineMood,
        hint: `+${BELIEFS.shrineMood} each, up to ${BELIEFS.max}, and a festival every year.`,
        fix: (counts.shrine ?? 0) < BELIEFS.max ? build("shrine", `+${BELIEFS.shrineMood}, and a festival every year.`) : undefined,
        gain: (counts.shrine ?? 0) < BELIEFS.max && build("shrine", "") ? BELIEFS.shrineMood : undefined,
      },
      {
        label: plural(Math.min(BELIEFS.max, counts.temple ?? 0), "temple"),
        value: Math.min(BELIEFS.max, counts.temple ?? 0) * BELIEFS.templeMood,
        hint: `+${BELIEFS.templeMood} each, up to ${BELIEFS.max}.`,
        fix: (counts.temple ?? 0) < BELIEFS.max ? build("temple", `+${BELIEFS.templeMood} happiness and +${BELIEFS.templeLiteracy} literacy.`) : undefined,
        gain: (counts.temple ?? 0) < BELIEFS.max && build("temple", "") ? BELIEFS.templeMood : undefined,
      },
      {
        label: "The cathedral",
        value: landmarkWorking(state, "cathedral") ? LANDMARK.cathedralMood : 0,
        hint: `The finished landmark adds ${LANDMARK.cathedralMood}.`,
      },
      {
        label: `${plural(guilds, "guildhall")} squeezing the workers`,
        value: -guilds * LEARNING.guildMood,
        hint: `Guilds make better tools but cost ${LEARNING.guildMood} happiness each (up to 2).`,
        fix: "Demolish guildhalls you can do without.",
      },
      {
        label: "Smog over the homes",
        value: -SMOG.mood * smogIndex(state),
        hint: "Smoke from coal plants, factories and stations drifts over the homes nearby.",
        fix: "Build City Parks near the homes, learn Clean Air Laws, or move smoky buildings away from homes.",
      },
      {
        label: "Dark, cold flats",
        value: -(counts.apartments ? POWER.darkFlatsMood * (1 - powerCover(state)) : 0),
        hint: "Apartment blocks without enough power.",
        fix: "Build more power plants so the grid covers what it needs.",
      },
      {
        label: "Tired from overwork",
        value: -fatigueMood(state),
        hint: "More jobs than people to do them. Warriors and the sick don't work.",
        fix: "Grow the town, sell buildings you can do without, or learn Rest Days. Tiredness fades once there are enough hands.",
      },
      {
        label: "Jobs lost to robots",
        value: -automationMood(state),
        hint: "Automation took much of the work, and with it many people's sense of purpose.",
        fix: "Learn the Shorter Work Week (Advancements): the work is shared out, and people use their time to learn and make.",
      },
      {
        label: "Recent events",
        value: state.modifiers.happiness,
        hint: "Choices in events, discoveries and losses. This fades over time.",
      },
    ];
    const grief = Math.round(state.grief ?? 0);
    if (grief > 0) {
      parts.push({
        label: "Grieving",
        value: -grief,
        hint: "Someone was dropped into a fire or the sea. It fades slowly, and comes off even a full meter.",
        fix: "Nothing to do but wait (and never do it again).",
      });
    }
  }

  // Only what counts right now; a cost always offers its fix.
  return parts
    .filter((p) => Math.abs(p.value) >= 0.5 || (p.gain ?? 0) >= 1)
    .map((p) => (p.value <= -0.5 && p.fix && p.gain === undefined ? { ...p, gain: -p.value } : p));
}

// The three changes that would raise a meter most, each with what to do. A
// meter can't go past 100, so neither can what a fix adds.
export function meterFixes(state: GameState, key: MeterKey): (MeterPart & { gain: number })[] {
  const room = 100 - computeMeters(state)[key];
  return meterBreakdown(state, key)
    .map((p) => ({ ...p, gain: Math.min(room, p.gain ?? 0) }))
    .filter((p) => p.fix && p.gain >= 1)
    .sort((a, b) => b.gain - a.gain)
    .slice(0, 3);
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
  // Apartment blocks and arcologies are heated from the grid: their own
  // people stay warm as well as the power covers them.
  const heated = state.tiles.reduce((sum, t) => sum + (t.building === "apartments" || t.building === "arcology" ? homeRoom(t) : 0), 0);
  const warmed =
    litFires(state).length * GROWTH_PRESSURE.peoplePerFire +
    pens * GROWTH_PRESSURE.peoplePerPen +
    (counts.townhouse ?? 0) * TOWN.warmth +
    heated * powerCover(state);
  return state.population > 0 ? Math.max(0, 1 - warmed / state.population) : 0;
}

// Food lost to rot each second: stores above foodKeeps slowly go bad.
export function foodKeeps(state: GameState) {
  return GROWTH_PRESSURE.foodKeeps + (countBuildings(state).granary ?? 0) * GRANARY_KEEPS * (state.researched.includes("kilns") ? 1.5 : 1);
}

export function foodSpoiling(state: GameState) {
  // Smoking Food: smoked fish and meat keep much longer.
  return Math.max(0, state.resources.food - foodKeeps(state)) * GROWTH_PRESSURE.foodRots * (state.researched.includes("smoking") ? 0.6 : 1);
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
  if (state.researched.includes("tanks")) return 5;
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

// Lookouts in the watch towers add a little defense (up to WATCH_FIRE.maxDefense).
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
  if (watchDefense(state)) text += ` + ${watchDefense(state)} watch tower${watchDefense(state) === 1 ? "" : "s"}`;
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
    (1 - sanitation(state)) * 12 +
    boostOf(state, "health");

  const fireBoost = state.researched.includes("firekeeping") ? 1.5 : 1;
  const lit = litFires(state).length;
  // From the Industrial era, the power grid: how much of what's needed it covers.
  const energy =
    state.era >= 4 && (powerDemand(state) > 0 || powerSupply(state) > 0)
      ? powerCover(state) * 100
      : lit * 20 * fireBoost + (counts.townhouse ?? 0) * 10 + (counts.windmill ?? 0) * FARMING.windmillEnergy;

  // How healthy the land is (see sustainabilityBreakdown for the parts).
  const sustainability = 100 + sustainabilityBreakdown(state).reduce((sum, p) => sum + p.value, 0);

  const literacy =
    (counts.elder ?? 0) * 12 +
    (counts.school ?? 0) * 15 +
    (counts.academy ?? 0) * 15 +
    (counts.university ?? 0) * LEARNING.universityLiteracy +
    (landmarkWorking(state, "library") ? LANDMARK.libraryLiteracy : 0) +
    (state.researched.includes("printing") ? LEARNING.printingLiteracy : 0) +
    Math.min(BELIEFS.max, counts.temple ?? 0) * BELIEFS.templeLiteracy +
    (state.researched.includes("purpose") ? AUTOMATION.literacy : 0) +
    (state.researched.length - 1) * 2;

  const happiness =
    boostOf(state, "happiness") +
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
    Math.min(BELIEFS.max, counts.shrine ?? 0) * BELIEFS.shrineMood +
    Math.min(BELIEFS.max, counts.temple ?? 0) * BELIEFS.templeMood +
    (landmarkWorking(state, "cathedral") ? LANDMARK.cathedralMood : 0) -
    Math.min(2, counts.guildhall ?? 0) * LEARNING.guildMood -
    SMOG.mood * smogIndex(state) -
    (counts.apartments ? POWER.darkFlatsMood * (1 - powerCover(state)) : 0) -
    automationMood(state) -
    fatigueMood(state) +
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
  // Build to Last keeps it simple: advancements only cost Knowledge.
  if (state.devGoals || state.mode === "last") return true;
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
  if ((step?.build || step?.upgrade) && coachCount(state, c.node) > c.from) return farewellAfterCoach({ ...state, coach: null }, c.node);
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
  return state.tick - (state.lastBigTick ?? -Infinity) >= QUIET_GAP * (firstStoneAge(state) ? GENTLE.quietFactor : 1);
}

// First-time mode, still in the Stone Age: the calmest stretch of all.
export function firstStoneAge(state: GameState) {
  return state.difficulty === "first" && state.era === 0;
}

// Show the next elder lesson whose moment has come: one at a time, spaced out,
// never during the tutorial or an event.
export function lessonDue(state: GameState): GameState {
  if (state.tutorialStep < TUTORIAL.length || state.lesson || state.event || state.phase !== "playing") return state;
  const lessonGap = LESSON_GAP * (firstStoneAge(state) ? GENTLE.lessonFactor : 1);
  if (state.tick - (state.lessonTick ?? -lessonGap) < lessonGap) return state;
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
// Population control: is there room under the chief's limit?
export function belowLimit(state: GameState, population: number) {
  return state.popLimit == null || population <= state.popLimit;
}

// How many people the next era asks for (null when it doesn't ask).
export function nextEraPopulation(state: GameState): number | null {
  if (state.era === 0) return NEXT_ERA_POPULATION;
  if (state.era === 1) return CLASSICAL_POPULATION;
  return null;
}

// How many would leave with "Send settlers" right now (0: too few to spare).
export function settlersReady(state: GameState) {
  return Math.max(0, Math.min(SETTLERS.size, Math.floor(state.population) - SETTLERS.keep));
}

// What a group of settlers takes with them.
export function settlersCost(n: number) {
  return { food: SETTLERS.food * n, wood: SETTLERS.wood * n };
}

export function settlersAffordable(state: GameState) {
  const cost = settlersCost(settlersReady(state));
  return state.resources.food >= cost.food && state.resources.wood >= cost.wood;
}

export function readyForNextEra(state: GameState) {
  if (state.phase !== "playing" || state.debrief) return false;
  // Build to Last stays in the Industrial era: the three problems are the goal.
  if (state.mode === "last") return false;
  if (state.era === 0) return state.researched.includes("agriculture") && state.population >= NEXT_ERA_POPULATION;
  if (state.era === 1)
    return !!state.legionDone && state.researched.includes("coinage") && state.population >= CLASSICAL_POPULATION;
  if (state.era === 2) return !!state.droughtDone && landmarkDone(state);
  if (state.era === 3) return !!state.plagueDone && state.researched.includes("steam") && state.population >= INDUSTRIAL_POPULATION;
  if (state.era === 4) return !!state.climateDone && state.researched.includes("computers") && state.population >= FUTURE_POPULATION;
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
    ...(kind === "final" ? { kardashev: kardashev(state), tipped: !!state.tipped } : {}),
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
  // The tutorial ends on Early Farming: Elder Ama walks them through placing
  // Farmland (the coach), then says goodbye (see farewellAfterCoach). A War
  // Camp with one warrior is handed over, so raids can be learned by playing.
  const tiles = state.tiles.map((t) => ({ ...t }));
  const soldiers = countBuildings(state).warcamp ? state.soldiers : giveWarCamp(tiles, state);
  const coach = AFTER_STEPS[step.done] ? { node: step.done, from: coachCount(state, step.done) } : null;
  // ...and what the coached building costs, so they never wait for it.
  const build = coach ? AFTER_STEPS[coach.node].build : undefined;
  if (build) {
    for (const [k, v] of Object.entries(buildingCost(next, BUILDINGS_BY_ID[build]))) resources[k as keyof Resources] += v ?? 0;
  }
  return startGrace({
    ...next,
    tiles,
    soldiers,
    resources,
    coach,
    ...(coach ? {} : { lesson: TUTORIAL_FAREWELL.id, lessonTick: state.tick }),
  });
}

// Right after the tutorial's last coached step, Elder Ama says goodbye.
function farewellAfterCoach(state: GameState, node: string): GameState {
  if (node !== TUTORIAL[TUTORIAL.length - 1].done || (state.lessonsSeen ?? []).includes(TUTORIAL_FAREWELL.id)) return state;
  return {
    ...state,
    lesson: TUTORIAL_FAREWELL.id,
    lessonTick: state.tick,
    lessonsSeen: [...(state.lessonsSeen ?? []), TUTORIAL_FAREWELL.id],
  };
}

// A War Camp near home with one trained warrior (the tutorial ends with one, so
// the first raid isn't a free win for the raiders). Returns the warriors after.
function giveWarCamp(tiles: Tile[], state: GameState): number {
  const home = tiles[state.startTile];
  const camp = BUILDINGS_BY_ID.warcamp;
  const spot = tiles
    .filter((t) => t.revealed && camp.terrain.includes(t.terrain) && !t.building)
    .sort((a, b) => hexDistance(a, home) - hexDistance(b, home))[0];
  if (!spot) return state.soldiers;
  spot.building = "warcamp";
  return Math.max(state.soldiers, 1);
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
    // ...and only up to the limit the chief has set, if any.
    if (state.meters.food > 45 && prod.food >= cons && state.meters.shelter > 40 && population < capacity * 1.15 && belowLimit(state, population)) {
      // Never more than GROWTH_CAP a tick: a big town doesn't double in two minutes.
      population += Math.min(GROWTH_CAP, Math.max(0.08, population * growth));
      if (state.popLimit != null) population = Math.min(population, Math.max(state.popLimit, state.population));
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
  if (!inTutorial) next = updateTipping(updateClimate(updateRebellion(updatePlague(updateDisasters(updateDrought(updateLegion(updateRaids(next))))))));
  next = updateLast(next);
  next = updateHunters(next);
  next = updateCarbon(next);
  next = updateFatigue(next);
  if ((next.tradePrice ?? 1) > 1) next = { ...next, tradePrice: Math.max(1, (next.tradePrice ?? 1) - TRADE.ease) };
  next = reachTypeOne(next);
  next = returnCaravans(next);
  next = returnScouts(next);
  next = returnCanoes(next);
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
  next = festival(next);

  const beforeDisease = next.population;
  // Crowded towns without latrines, and people drinking dirty water in the
  // drought, spread sickness faster.
  const dirt = 1 + TOWN.dirty * (1 - sanitation(next)) + thirstShare(next) + SMOG.sickness * smogIndex(next);
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
  // Rare moments only come up this share of the times they could (never
  // skipped when the dev panel asks for one).
  rare?: number;
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
    when: (s) => s.meters.food >= 45 && s.population < housingCapacity(s) && belowLimit(s, s.population + 1),
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
  {
    // An easter egg: now and then (not every time it could), and only once a game.
    id: "bottle",
    when: (s) => !s.secretsFound.includes("egg-bottle") && nearHome(s, (t) => t.terrain === "beach" && !t.building).length > 0,
    rare: 0.1,
    apply: (s) => {
      const found = findEgg(s, "bottle");
      // The moment adds its own line; keep just one.
      return { ...found, log: s.log };
    },
    text: EGGS.bottle.text,
    where: (s) => nearHome(s, (t) => t.terrain === "beach" && !t.building)[0],
  },
];

// An easter egg found: counted once with the secrets, its line in the log, and
// its small reward (the first time only). Fireworks can go off again and again.
function findEgg(state: GameState, id: EggId): GameState {
  const egg = EGGS[id];
  const key = `egg-${id}`;
  const first = !state.secretsFound.includes(key);
  return {
    ...state,
    secretsFound: first ? [...state.secretsFound, key] : state.secretsFound,
    resources: first && egg.knowledge ? { ...state.resources, knowledge: state.resources.knowledge + egg.knowledge } : state.resources,
    modifiers: first && egg.mood ? { ...state.modifiers, happiness: state.modifiers.happiness + egg.mood } : state.modifiers,
    log: [egg.text, ...state.log].slice(0, 30),
  };
}

// Beliefs: once a year (BELIEFS.festival.every ticks) a village with a shrine
// holds a festival: a feast that cheers everyone up but eats into the stores.
// Too little food: the festival is put off and people are a little let down.
function festival(state: GameState): GameState {
  if (!countBuildings(state).shrine || state.tutorialStep < TUTORIAL.length) return state;
  const due = state.nextFestivalTick ?? state.tick + BELIEFS.festival.every;
  if (state.tick < due) return state.nextFestivalTick === undefined ? { ...state, nextFestivalTick: due } : state;
  if (state.event || state.raid || state.legion) return { ...state, nextFestivalTick: state.tick + 10 };
  const next = state.tick + BELIEFS.festival.every;
  const f = BELIEFS.festival;
  if (state.resources.food < f.food * 2) {
    return { ...state, nextFestivalTick: next, modifiers: { ...state.modifiers, happiness: state.modifiers.happiness - 2 }, log: ["Too little food for this year's festival. People are a little let down.", ...state.log].slice(0, 30) };
  }
  return {
    ...state,
    nextFestivalTick: next,
    resources: { ...state.resources, food: state.resources.food - f.food },
    modifiers: { ...state.modifiers, happiness: state.modifiers.happiness + f.mood },
    log: [`The yearly festival at the shrine: music, dancing and a feast (+${f.mood} happiness, −${f.food} food).`, ...state.log].slice(0, 30),
  };
}

// Dev: `force` picks which moment (if it can happen right now).
export const MOMENT_IDS = () => MOMENTS.map((m) => m.id);

export function smallMoment(state: GameState, force?: string): GameState {
  const due = state.nextMomentTick ?? state.tick + SMALL_MOMENTS.firstAfter;
  if (state.tick < due) return state.nextMomentTick === undefined ? { ...state, nextMomentTick: due } : state;
  // Never over an event card, a raid or the legion: try again a little later.
  if (state.event || state.raid || state.legion) return { ...state, nextMomentTick: state.tick + 5 };
  const rand = mulberry32(state.seed + state.tick * 61);
  const last = state.lastMoment;
  const lucky = mulberry32(state.seed + state.tick * 13)();
  const options = MOMENTS.filter((m) => (force ? m.id === force : m.id !== last && (!m.rare || lucky < m.rare)) && m.when(state));
  const next = state.tick + Math.round((SMALL_MOMENTS.base + Math.floor(rand() * SMALL_MOMENTS.spread)) * (firstStoneAge(state) ? GENTLE.momentFactor : 1));
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
      if (strain < 1)
        changes.set(t.id, {
          ...changes.get(t.id),
          growth: Math.min(1, t.growth + 0.06 * (1 - strain) * (state.researched.includes("rewilding") ? REWILDING.growth : 1)),
        });
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
  // The vanguard: Roman scouts land first to test our defences.
  if (state.legion && !state.legion.vanguard && !state.raid && state.tick >= state.legion.arriveTick - ROMAN_LEGION.vanguard) {
    const landing = pickLanding(state, mulberry32(state.seed + state.tick * 59));
    if (landing) {
      return {
        ...state,
        legion: { ...state.legion, vanguard: true },
        raid: {
          strength: ROMAN_LEGION.vanguardSize,
          kind: "band",
          fromTile: landing.from.id,
          targetTile: landing.home.id,
          meetTile: landing.meet.id,
          startTick: state.tick,
          arriveTick: state.tick + 12,
        },
        log: ["Roman scouts have landed to test our defences! The legion is not far behind.", ...state.log].slice(0, 30),
      };
    }
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
  // The climate crisis sends a bigger flood, the warmer the world.
  const crisis = state.climate ? 1 + warming(state) : 1;
  const n = Math.max(3, Math.min(DISASTER_HITS.flood.tiles * crisis, Math.round(DISASTER_HITS.flood.tiles * crisis * (1.3 - forestCover(state)))));
  // Sea walls keep the water off the low land behind them.
  const walls = state.tiles.filter((t) => t.building === "seawall");
  return byWater
    .filter((t) => !walls.some((w) => hexDistance(w, t) <= 2))
    .sort((a, b) => hexDistance(a, home) - hexDistance(b, home))
    .slice(0, n)
    .map((t) => t.id);
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
    if (state.tick < state.nextDisasterTick || state.raid || state.legion || state.drought || state.climate || state.event || !quietEnough(state) || isCalm(state) || firstStoneAge(state))
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
  const hospitals = Math.min(HOSPITAL.max, countBuildings(state).hospital ?? 0) * HOSPITAL.recover * powerCover(state);
  if (landmarkWorking(state, "cathedral")) return bathsCare(state) + LANDMARK.cathedralRecover + hospitals;
  return bathsCare(state) + hospitals;
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

// What the rebels want for going home: coins and food for each of them.
export function rebelDemands(state: GameState): Partial<Resources> {
  const n = state.rebellion?.rebels ?? 0;
  return { currency: REBELLION.demand.currency * n, food: REBELLION.demand.food * n };
}

// The chance our warriors put a rebellion down (their strength against ours).
export function crushOdds(state: GameState) {
  const ours = defenseStrength(state);
  const theirs = (state.rebellion?.rebels ?? 0) * REBELLION.strength;
  return ours <= 0 ? 0 : ours / (ours + theirs);
}

function endRebellion(state: GameState, line: string): GameState {
  return { ...state, rebellion: null, rebellionCalm: state.tick + REBELLION.cooldown, log: [line, ...state.log].slice(0, 30) };
}

// Unhappy people in the Middle Ages may rise up: unrest brews, then rebels
// take up arms, and left alone they sack the stores and leave.
function updateRebellion(state: GameState): GameState {
  const r = state.rebellion;
  if (!r) {
    if (state.era < REBELLION.era || state.meters.happiness >= REBELLION.mood || isCalm(state)) return state;
    if (state.tick < (state.rebellionCalm ?? 0) || !quietEnough(state) || state.raid || state.legion) return state;
    return {
      ...state,
      lastBigTick: state.tick,
      rebellion: { stage: "brewing", riseTick: state.tick + REBELLION.warnTicks, rebels: 0, tile: state.startTile, sackTick: 0 },
      log: [`Unrest in the streets! If happiness stays under ${REBELLION.mood}, people will rise up in ${secs(REBELLION.warnTicks)} s.`, ...state.log].slice(0, 30),
    };
  }
  if (r.stage === "brewing") {
    if (state.meters.happiness >= REBELLION.mood) return { ...endRebellion(state, "The unrest has died down: people are happier again."), rebellionCalm: state.tick + REBELLION.cooldown / 2 };
    if (state.tick < r.riseTick) return state;
    const pop = Math.floor(state.population);
    const rebels = Math.min(pop - 1, Math.max(REBELLION.min, Math.round(pop * REBELLION.share)));
    if (rebels < 1) return endRebellion(state, "The unrest has died down.");
    const home = state.tiles[state.startTile];
    // They gather at a building near the middle of the town.
    const spot =
      state.tiles
        .filter((t) => t.building && t.island === home.island && t.building !== "warcamp")
        .sort((a, b) => hexDistance(a, home) - hexDistance(b, home))[1] ?? home;
    return {
      ...state,
      population: state.population - rebels,
      rebellion: { stage: "risen", riseTick: r.riseTick, rebels, tile: spot.id, sackTick: state.tick + REBELLION.sackTicks },
      log: [`Rebellion! ${rebels} of our people have taken up arms. Crush them, or meet their demands.`, ...state.log].slice(0, 30),
    };
  }
  if (state.tick < r.sackTick) return state;
  const sacked = {
    ...state.resources,
    food: state.resources.food * (1 - REBELLION.sack),
    currency: state.resources.currency * (1 - REBELLION.sack),
  };
  return endRebellion({ ...state, resources: sacked }, `The rebels sacked the stores (${Math.round(REBELLION.sack * 100)}% of our food and coins) and left for good.`);
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

// The same tribute paid in shells or coins.
export function tributeCoins(raid: Raid) {
  return raid.strength * RAID_RESPONSE.coinsPerRaider;
}

// What one lot of shells or coins buys from the traders right now.
export function tradeOffer(state: GameState, get: "food" | "wood" | "stone") {
  return Math.max(1, Math.round(TRADE[get] / (state.tradePrice ?? 1)));
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
          rival: raid.rival,
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
        rival: raid.rival,
      },
      soldiers: Math.max(0, state.soldiers - raid.strength),
      spearmen: Math.min(spearmenOf(state), Math.max(0, state.soldiers - raid.strength)),
      ...plunder(state, raid, RAID_KINDS[raid.kind ?? "party"].steal),
      modifiers: { ...state.modifiers, happiness: state.modifiers.happiness - 12 },
      log: [plunderText(state, raid), ...state.log].slice(0, 30),
    };
  }

  if (!raid && state.tick >= state.nextRaidTick && quietEnough(state) && !firstStoneAge(state)) {
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
    const early = ((countBuildings(state).watchfire ?? 0) > 0 ? WATCH_FIRE.warnTicks : 0) + (state.researched.includes("townwatch") ? 6 : 0);
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
          ? `An army of ${KINGDOMS[from_].name} (${strength}) is landing on the shore! ${revenge ? "They have come for revenge." : "They are at war with us."}${early ? " The lookouts in the watch tower saw them early." : ""}`
          : `${RAID_KINDS[kind].name} of ${strength} raiders is landing on the shore!${early ? " The lookouts in the watch tower saw them early." : ""}`,
        ...state.log,
      ].slice(0, 30),
    };
  }
  return state;
}

// "30 food and 20 wood".
function costLine(r: Partial<Resources>) {
  return Object.entries(r)
    .filter(([, v]) => v)
    .map(([k, v]) => `${v} ${k === "currency" ? "coins" : k}`)
    .join(" and ");
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
  gain += Math.max(0, next.era - prev.era) * XP.era * (next.mp ? MP.eraXp : 1);
  if (next.droughtDone && !prev.droughtDone) gain += XP.drought;
  if (next.plagueDone && !prev.plagueDone) gain += XP.drought;
  if (landmarkDone(next) && !landmarkDone(prev)) gain += XP.drought / 2;
  if (next.tick !== prev.tick && next.tick % XP.minuteTicks === 0 && next.tutorialStep >= TUTORIAL.length) {
    if (next.meters.food >= 45) gain += XP.fedMinute;
    if (next.meters.sustainability >= MIN_SUSTAINABILITY_FOR_BEST_ENDING) gain += XP.healthyMinute;
    // Multiplayer: a damaged land costs XP every minute.
    if (next.mp && next.meters.sustainability < MP.drainBelow) gain -= MP.drain;
  }
  if (gain < 0) return { ...next, xp: Math.max(0, (next.xp ?? 0) + gain) };
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
  if (state.mode === "last") {
    const p = lastProblems(state);
    const left = p.filter((x) => !x.done);
    return left.length
      ? `Goal: solve the three big problems (${3 - left.length}/3). Next: ${left[0].title.toLowerCase()}.`
      : `All three solved! Hold them for ${Math.max(0, Math.ceil(secs(LAST.hold - (state.lastHeld ?? 0))))}s.`;
  }
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
  if (state.era === 3) {
    const needs = [
      !state.researched.includes("steam") ? "learn Steam & Coal" : null,
      pop < INDUSTRIAL_POPULATION ? `grow to ${INDUSTRIAL_POPULATION} people (${pop}/${INDUSTRIAL_POPULATION})` : null,
    ].filter(Boolean);
    return needs.length ? `Goal: ${needs.join(" and ")} to enter the Industrial era.` : null;
  }
  if (state.era === 4 && !state.climateDone) {
    const shield = Math.round(climateShield(state) * 100);
    const air = `Carbon ${Math.round(state.carbon ?? CARBON.start)} ppm, +${warming(state).toFixed(1)} °C. Readiness ${shield}%.`;
    if (!state.climate) return `Goal: grow into a city without wrecking the climate. ${air} Power: ${Math.round(powerCover(state) * 100)}% covered.`;
    if (!inClimateCrisis(state)) return `Goal: the climate crisis is coming! ${air} Build sea walls, hospitals and parks; switch to clean power.`;
    return `Goal: hold on through the crisis. ${air} Lives lost: ${Math.round(state.climate.deaths)}.`;
  }
  if (state.era === 4) {
    const needs = [
      !state.researched.includes("computers") ? "learn Computers" : null,
      pop < FUTURE_POPULATION ? `grow to ${FUTURE_POPULATION} people (${pop}/${FUTURE_POPULATION})` : null,
    ].filter(Boolean);
    return needs.length ? `Goal: ${needs.join(" and ")} to enter the Future.` : null;
  }
  if (state.era === 5) {
    const k = kardashev(state).toFixed(2);
    const clean = `${Math.round(cleanPower(state))}/${KARDASHEV.clean} clean power`;
    if (state.tipping)
      return `Goal: carbon down to ${TIPPING.safe} ppm before the climate tips (now ${Math.round(state.carbon ?? CARBON.start)}). Air capture, forest and no coal help.`;
    if (state.finished) return `Type I reached. Keep the planet thriving: land health ${state.meters.sustainability}.`;
    const land = state.meters.sustainability < KARDASHEV.minLand ? ` and land health ${KARDASHEV.minLand}+ (now ${state.meters.sustainability})` : "";
    return `Goal: Type I on the Kardashev scale (now ${k}): ${clean}${land}.${state.tippingDone ? "" : " The tipping point is coming."}`;
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
          ? { ...t, building: def.id, worn: 0, level: undefined, ...(ploughed ? { terrain: "grass" as const, height: terrainHeight("grass"), growth: 0 } : {}) }
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
      let target: Tile;
      if (action.tileId !== undefined) {
        // Where the player picked on the map.
        const picked = state.tiles[action.tileId];
        if (!picked || scoutTargetError(state, picked)) return state;
        target = picked;
      } else {
        const frontier = state.tiles.filter(
          (t) =>
            !t.revealed &&
            state.tiles.some((n) => n.revealed && isLand(n.terrain) && hexDistance(n, t) === 1),
        );
        if (frontier.length === 0) return state;
        const rand = mulberry32(state.seed + state.tick * 7 + state.log.length);
        target = frontier[Math.floor(rand() * frontier.length)];
      }
      const trip = scoutTicks(state, target);
      const sent: GameState = { ...state, resources: spend(state.resources, cost), flags: { ...state.flags, scouted: true } };
      // In the tutorial the clock is still, so the trip is over at once.
      if (state.tutorialStep < TUTORIAL.length) return withMeters(scoutsReturn(sent, target.id));
      return withMeters({
        ...sent,
        scouting: { tile: target.id, back: state.tick + trip, start: state.tick, from: state.startTile },
        log: [`Scouts set out to explore. They will be back in ${secs(trip)} s.`, ...state.log].slice(0, 30),
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
        // Build to Last keeps text short: no discovery scenes.
        cutscene: DISCOVERIES[node.id] && state.mode !== "last" ? node.id : state.cutscene ?? null,
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
        riverChoice: effect.river ?? state.riverChoice,
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
      const soldiers = counts.warcamp ? state.soldiers : giveWarCamp(tiles, state);
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

    case "improve": {
      const tile = state.tiles[action.tileId];
      const next = tile ? improveNext(state, tile) : null;
      if (!tile || !next || next.needs || !canAfford(state, next.cost)) return state;
      return withMeters({
        ...state,
        tiles: state.tiles.map((t) => (t.id === tile.id ? { ...t, level: next.level } : t)),
        resources: spend(state.resources, next.cost),
        log: [
          `The ${BUILDINGS_BY_ID[tile.building!].name} is now ${next.name}: ${BUILDINGS_BY_ID[tile.building!].housing ? `room for ${homeRoom({ ...tile, level: next.level })} people` : `it makes ${Math.round(IMPROVE.boost * 100 * (next.level - 1))}% more`}.`,
          ...state.log,
        ].slice(0, 30),
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
      if (!state.dev || state.era > 4) return state;
      if (state.era === 3 || state.era === 4) {
        // Medieval: the plague over, Steam & Coal, 90 people. Industrial: the
        // climate crisis over, Computers, 150 people.
        const ready: GameState =
          state.era === 3
            ? { ...state, plague: null, plagueDone: true, researched: Array.from(new Set([...state.researched, "steam"])), population: Math.max(state.population, INDUSTRIAL_POPULATION) }
            : { ...state, climate: null, climateDone: true, researched: Array.from(new Set([...state.researched, "computers"])), population: Math.max(state.population, FUTURE_POPULATION) };
        return { ...ready, debrief: makeDebrief(ready, "era") };
      }
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

    case "canoe": {
      if (canoeError(state)) return state;
      const picked = action.tileId !== undefined ? state.tiles[action.tileId] : undefined;
      if (action.tileId !== undefined && (!picked || canoeTargetError(state, picked))) return state;
      const tree = bigTree(state)!;
      // Sent to a spot near the Southern Isles (or with no spot, while they are
      // still unfound): it finds them. Anywhere else: fish and map the sea.
      const isles = !(state.outposts ?? []).includes(CANOE.island) && state.tiles.some((t) => t.island === CANOE.island);
      const nearIsles = picked ? isles && state.tiles.some((t) => t.island === CANOE.island && hexDistance(t, picked) <= 2) : false;
      const kind = picked ? (nearIsles ? "explore" : "fish") : canoeTrip(state);
      const trip = picked ? canoeTicks(state, picked) : CANOE.ticks;
      const tiles = state.tiles.map((t) => (t.id === tree.id ? { ...t, growth: Math.max(0.02, t.growth - CANOE.tree) } : t));
      return withMeters({
        ...addTally(state, "canoes", 1),
        tiles,
        canoes: [...(state.canoes ?? []), { start: state.tick, back: state.tick + trip, kind, tile: picked?.id, dock: picked ? nearestDock(state, picked)?.id : undefined }],
        resources: spend(state.resources, CANOE.cost),
        log: [
          `A big tree was felled for a canoe, and it set off ${kind === "explore" ? "to look for the islands to the south" : picked ? "to fish and explore where you pointed" : "to fish the open sea"}. Back in ${secs(trip)} s.`,
          ...state.log,
        ].slice(0, 30),
      });
    }

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

    case "crushRebels": {
      const r = state.rebellion;
      if (!r || r.stage !== "risen" || state.soldiers < 1) return state;
      const odds = crushOdds(state);
      const won = mulberry32(state.seed + state.tick * 41)() < odds;
      // Warriors lost: more when the rebels are strong compared with us.
      const lost = Math.min(state.soldiers, Math.ceil(state.soldiers * (won ? 0.5 : 0.8) * (1 - odds)));
      const killed = won ? r.rebels : Math.ceil(r.rebels / 3);
      const after = bumpStats(
        {
          ...state,
          soldiers: state.soldiers - lost,
          population: Math.max(1, state.population - lost),
          modifiers: { ...state.modifiers, happiness: state.modifiers.happiness - REBELLION.crushMood },
        },
        (st) => {
          st.deaths.battle += lost + killed;
        },
      );
      return withMeters(
        won
          ? endRebellion(after, `The rebellion was crushed. ${killed} rebels and ${lost} of our warriors died, and the town is shaken (−${REBELLION.crushMood} happiness).`)
          : endRebellion(
              { ...after, resources: { ...after.resources, food: after.resources.food * (1 - REBELLION.sack), currency: after.resources.currency * (1 - REBELLION.sack) } },
              `Our warriors were beaten (${lost} died). The rebels sacked the stores and left for good.`,
            ),
      );
    }

    case "meetDemands": {
      const r = state.rebellion;
      const cost = rebelDemands(state);
      if (!r || r.stage !== "risen" || !canAfford(state, cost)) return state;
      return withMeters(
        endRebellion(
          {
            ...state,
            resources: spend(state.resources, cost),
            population: state.population + r.rebels,
            modifiers: { ...state.modifiers, happiness: state.modifiers.happiness + REBELLION.demandMood },
          },
          `We met the rebels' demands. They put down their arms and went home (+${REBELLION.demandMood} happiness).`,
        ),
      );
    }

    case "devRebellion": {
      // Unrest now, or straight to the rising (any era, for testing).
      if (!state.dev || state.rebellion) return state;
      const brewing: GameState = {
        ...state,
        rebellion: { stage: "brewing", riseTick: action.when === "now" ? state.tick : state.tick + REBELLION.warnTicks, rebels: 0, tile: state.startTile, sackTick: 0 },
        log: ["Dev: unrest in the streets.", ...state.log].slice(0, 30),
      };
      // Rise even if people are happy enough right now.
      return withMeters(action.when === "now" ? { ...updateRebellion({ ...brewing, meters: { ...brewing.meters, happiness: 0 } }), meters: state.meters } : brewing);
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

    case "devClimate": {
      // soon: the warning now, 20 s to go. now: it strikes next tick. end: it passes next tick.
      if (!state.dev || state.era !== 4 || state.climateDone) return state;
      const soon = state.tick + (action.when === "now" ? 1 : 13);
      const c = state.climate ?? { warnTick: state.tick, startTick: soon, endTick: soon + CLIMATE.ticks, deaths: 0 };
      const climate =
        action.when === "end"
          ? { ...c, startTick: Math.min(c.startTick, state.tick), endTick: state.tick + 1 }
          : { ...c, warnTick: state.tick, startTick: soon, endTick: soon + CLIMATE.ticks };
      return withMeters({ ...state, climate, nextRaidTick: Number.MAX_SAFE_INTEGER, log: [`Dev: climate crisis ${action.when}.`, ...state.log].slice(0, 30) });
    }

    case "devCarbon":
      if (!state.dev) return state;
      return withMeters({ ...state, carbon: Math.max(CARBON.start, (state.carbon ?? CARBON.start) + action.by) });

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
      if (action.choice === "tributeCoins") {
        const price = tributeCoins(raid);
        if (state.resources.currency < price) return state;
        return withMeters({
          ...state,
          raid: null,
          resources: { ...state.resources, currency: state.resources.currency - price },
          nextRaidTick: state.nextRaidTick - RAID_RESPONSE.tributeSooner,
          log: [`We paid ${price} ${ERAS[state.era].currency.toLowerCase()}. The raiders sailed away, but they will be back sooner.`, ...state.log].slice(0, 30),
        });
      }
      return { ...state, raid: { ...raid, response: action.choice } };
    }

    case "trade": {
      if (state.tutorialStep < TUTORIAL.length || state.resources.currency < TRADE.lot) return state;
      const got = tradeOffer(state, action.get);
      return {
        ...state,
        resources: { ...state.resources, currency: state.resources.currency - TRADE.lot, [action.get]: state.resources[action.get] + got },
        tradePrice: (state.tradePrice ?? 1) + TRADE.rise,
        log: [`Traded ${TRADE.lot} ${ERAS[state.era].currency.toLowerCase()} for ${got} ${action.get}.`, ...state.log].slice(0, 30),
      };
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

    case "launch": {
      // A project launched from the Launch Site (see SPACE).
      const project = SPACE.projects.find((x) => x.id === action.project);
      if (!project || !countBuildings(state).launchsite || spaceDone(state, project.id) || !canAfford(state, project.cost)) return state;
      const launched = addTally(
        {
          ...state,
          space: [...(state.space ?? []), project.id],
          resources: spend(state.resources, project.cost),
          carbon: (state.carbon ?? CARBON.start) + SPACE.carbon,
          log: [`Launched: ${project.name}. ${project.text}`, ...state.log].slice(0, 30),
        },
        "launches",
        1,
      );
      return withMeters(addXp(project.id === "moonbase" ? addTally(launched, "moonbase", 1) : launched, XP.research));
    }

    case "devTipping": {
      if (!state.dev || state.era !== 5 || state.tippingDone) return state;
      const t = state.tipping;
      if (action.when === "end") return t ? { ...state, tipping: { ...t, endTick: state.tick + 1 } } : state;
      if (action.when === "now" && t) return state;
      // Soon: the warning comes next tick. Now: the warning, with the air well above safe.
      const ready = { ...state, eraStartTick: state.tick - TIPPING.afterTicks, carbon: Math.max(state.carbon ?? CARBON.start, TIPPING.safe + 40) };
      return action.when === "now" ? updateTipping(ready) : ready;
    }

    case "devTypeOne": {
      // Clean power, the tipping point past and healthy land: the ending.
      if (!state.dev || state.era !== 5) return state;
      const ready: GameState = { ...state, tipping: null, tippingDone: true, space: Array.from(new Set([...(state.space ?? []), "solarsat"])) };
      const fusion = state.tiles.filter((t) => !t.building && t.revealed && (t.terrain === "grass" || t.terrain === "steppe")).slice(0, 5);
      const built = { ...ready, tiles: ready.tiles.map((t) => (fusion.some((f) => f.id === t.id) ? { ...t, building: "fusion", worn: 0 } : t)) };
      return reachTypeOne(withMeters({ ...built, meters: { ...built.meters, sustainability: Math.max(built.meters.sustainability, KARDASHEV.minLand) } }));
    }

    case "mpGiftOut": {
      if (!state.mp || !canAfford(state, action.resources)) return state;
      return { ...state, resources: spend(state.resources, action.resources), log: [`Sent ${costLine(action.resources)} to ${action.to}.`, ...state.log].slice(0, 30) };
    }

    case "mpGiftIn":
    case "mpLoot": {
      if (!state.mp) return state;
      const resources = { ...state.resources };
      for (const [k, v] of Object.entries(action.resources)) resources[k as keyof Resources] += Math.max(0, Math.min(500, Number(v) || 0));
      const text = action.type === "mpLoot" ? `Our raiders came back from ${action.from} with ${costLine(action.resources)}.` : `${action.from} sent us ${costLine(action.resources)}.`;
      return { ...state, resources, log: [text, ...state.log].slice(0, 30) };
    }

    case "mpRaidOut": {
      // The warriors sail off for good: whatever happens, they don't come back.
      const n = Math.floor(action.warriors);
      if (!state.mp || state.mp.mode !== "race" || n < 1 || n > state.soldiers || state.raid) return state;
      return {
        ...state,
        soldiers: state.soldiers - n,
        spearmen: Math.min(state.spearmen ?? 0, state.soldiers - n),
        log: [`${n} warrior${n === 1 ? "" : "s"} sailed off to raid ${action.to}.`, ...state.log].slice(0, 30),
      };
    }

    case "mpRaidIn": {
      if (!state.mp || state.phase !== "playing") return state;
      const strength = Math.max(1, Math.round(Math.min(60, action.warriors) * MP.warriorStrength));
      // Already under attack and they haven't landed yet: they join the attack.
      if (state.raid) {
        if (state.tick >= state.raid.arriveTick) return { ...state, log: [`Raiders from ${action.from} saw the fighting and turned back.`, ...state.log].slice(0, 30) };
        return { ...state, raid: { ...state.raid, strength: state.raid.strength + strength } };
      }
      const landing = pickLanding(state, mulberry32(state.seed + state.tick * 61));
      if (!landing) return state;
      return {
        ...state,
        raid: { strength, kind: "party", rival: action.from, rivalSeat: action.seat, fromTile: landing.from.id, targetTile: landing.home.id, meetTile: landing.meet.id, startTick: state.tick, arriveTick: state.tick + 14 },
        lastBigTick: state.tick,
        log: [`${action.from} sent ${action.warriors} warriors to raid us! They land soon.`, ...state.log].slice(0, 30),
      };
    }

    case "devTired": {
      // Worn out at once (to see the sweat and the warning), or rested again.
      if (!state.dev) return state;
      return { ...state, fatigue: (state.fatigue ?? 0) >= 50 ? 0 : 85 };
    }

    case "devOres": {
      // Every ore for improving buildings is known, with stone and coins to spend.
      if (!state.dev) return state;
      const ores = IMPROVE.tiers.map((t) => t.requires).filter((id) => !state.researched.includes(id));
      return {
        ...state,
        researched: [...state.researched, ...ores],
        resources: { ...state.resources, stone: state.resources.stone + 300, currency: state.resources.currency + 200 },
      };
    }

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
      return state.coach ? farewellAfterCoach({ ...state, coach: null }, state.coach.node) : state;

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

    case "setPopLimit": {
      const limit = action.limit === null ? null : Math.max(SETTLERS.keep, Math.round(action.limit));
      return {
        ...state,
        popLimit: limit,
        log: [limit === null ? "The tribe may grow again." : `Families agree to hold the tribe at ${limit} people.`, ...state.log].slice(0, 30),
      };
    }

    case "showHint":
      if ((state.hintsSeen ?? []).includes(action.id)) return state;
      return { ...state, hint: { id: action.id, tick: state.tick }, hintTick: state.tick, hintsSeen: [...(state.hintsSeen ?? []), action.id] };

    case "dismissHint":
      return state.hint ? { ...state, hint: null } : state;

    case "sendSettlers": {
      const n = settlersReady(state);
      if (!n || !settlersAffordable(state)) return state;
      const cost = settlersCost(n);
      return withMeters({
        ...state,
        population: state.population - n,
        resources: { ...state.resources, food: state.resources.food - cost.food, wood: state.resources.wood - cost.wood },
        grief: Math.min(GRIEF.max, (state.grief ?? 0) + SETTLERS.missed),
        log: [`${n} people set off to start a village of their own, taking ${cost.food} food and ${cost.wood} wood for the road. Fewer mouths to feed, but fewer workers, and their families miss them (−${SETTLERS.missed} happiness for a while).`, ...state.log].slice(0, 30),
      });
    }

    case "easterEgg":
      return withMeters(findEgg(state, action.id));

    case "hunt":
      if (state.huntersHelping && action.animal !== "golden deer") return state;
      if (action.animal === "golden deer") {
        return findEgg(addTally({ ...state, resources: { ...state.resources, food: state.resources.food + GOLDEN_DEER_FOOD } }, "hunts", 1), "golden-deer");
      }
      return maybeOutbreak({
        ...addTally(state, "hunts", 1),
        resources: { ...state.resources, food: state.resources.food + HUNT_FOOD * (state.researched.includes("dogs") ? 1.5 : 1) },
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
