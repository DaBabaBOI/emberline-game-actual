import {
  BUILDINGS,
  BUILDINGS_BY_ID,
  DIFFICULTIES,
  ERAS,
  EVENTS,
  TRAIN_COST,
  TREE,
  TREE_BY_ID,
  TUTORIAL,
  WARRIORS_PER_CAMP,
} from "./content";
import { hexDistance, hexKey, NEIGHBOR_OFFSETS } from "./hex";
import { generateMap, isLand, revealAround, terrainHeight } from "./map";
import { mulberry32 } from "./noise";
import type { IconId } from "./sprites";
import type {
  BuildingDef,
  CultureId,
  DifficultyId,
  GameState,
  Meters,
  Resources,
  Tile,
} from "./types";

export const SAVE_VERSION = 4;
const BASE_HOUSING = 8;

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
  | { type: "devEra"; era: number }
  | { type: "devReveal" }
  | { type: "devEvent"; id: string };

export interface NewGameOptions {
  dev?: boolean;
  startEra?: number;
}

export function newGame(
  culture: CultureId,
  difficulty: DifficultyId,
  options: NewGameOptions = {},
): GameState {
  const seed = Math.floor(Math.random() * 1e9);
  const { tiles, startTile } = generateMap(seed);
  giveStartingWoodcutter(tiles, tiles[startTile]);
  const state: GameState = {
    version: SAVE_VERSION,
    phase: "playing",
    seed,
    culture,
    difficulty,
    tiles,
    startTile,
    era: 0,
    year: ERAS[0].startYear,
    tick: 0,
    speed: 1,
    resources: { food: 60, wood: 35, stone: 0, knowledge: 0, currency: 0 },
    population: 8,
    famineTicks: 0,
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
    log: ["Your tribe gathers on the shores of Westmarch."],
  };
  const started = options.dev ? applyDevStart(state, options.startEra ?? 0) : state;
  return { ...started, meters: computeMeters(started) };
}

// Dev mode: skip ahead for testing. Lots of resources, the map revealed, and
// every playable advancement of the earlier eras already researched.
function applyDevStart(state: GameState, era: number): GameState {
  const researched = TREE.filter((n) => !n.comingSoon && !n.secret && n.era < Math.max(1, era)).map(
    (n) => n.id,
  );
  return {
    ...devJumpToEra(state, era),
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
function burnForest(state: GameState, radius: number): { tiles: Tile[]; message: string } {
  const home = state.tiles[state.startTile];
  const forests = state.tiles
    .filter((t) => t.revealed && t.terrain === "forest" && hexDistance(t, home) >= 2)
    .sort((a, b) => hexDistance(a, home) - hexDistance(b, home));
  const center = forests[Math.floor(mulberry32(state.seed + state.tick * 17)() * Math.min(4, forests.length))];
  if (!center) return { tiles: state.tiles, message: "The fire burned out on its own." };

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
  const message =
    radius === 0
      ? "The fire was stopped at the forest's edge."
      : `The fire burned ${burntForest} forest tile${burntForest === 1 ? "" : "s"}` +
        (lost.length ? ` and destroyed: ${lost.join(", ")}.` : ".");
  return { tiles, message };
}

// Some events should be rarer than others (weights are relative).
const EVENT_WEIGHTS: Record<string, number> = { wildfire: 0.35 };

function pickEvent(roll: number) {
  const weights = EVENTS.map((e) => EVENT_WEIGHTS[e.id] ?? 1);
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

export function production(state: GameState): Resources {
  const out: Resources = { food: 0, wood: 0, stone: 0, knowledge: 0.05, currency: 0 };
  for (const tile of state.tiles) {
    if (!tile.building) continue;
    const def = BUILDINGS_BY_ID[tile.building];
    for (const [k, v] of Object.entries(def.produces ?? {})) out[k as keyof Resources] += v ?? 0;
    if (def.depositBonus && tile.deposit === def.depositBonus.deposit) {
      for (const [k, v] of Object.entries(def.depositBonus.amount))
        out[k as keyof Resources] += v ?? 0;
    }
    if (tile.building === "fishing") {
      const fishNearby = state.tiles.some(
        (t) => t.deposit === "fish" && hexDistance(t, tile) === 1,
      );
      if (fishNearby) out.food += 1.2;
    }
  }
  const counts = countBuildings(state);
  out.wood -= (counts.campfire ?? 0) * 0.1;
  out.currency += state.population * 0.02;
  out.knowledge += state.meters.literacy * 0.005;

  if (state.researched.includes("spears")) out.food *= 1.15;
  if (state.culture === "farmers") out.food *= 1.25;
  if (state.culture === "mariners") out.food += (counts.fishing ?? 0) * 0.9;
  if (state.culture === "scholars") out.knowledge *= 1.5;
  if (state.culture === "traders") out.currency *= 1.5;
  return out;
}

export function consumption(state: GameState) {
  return (
    (state.population * 0.06 + state.soldiers * 0.05) *
    DIFFICULTIES[state.difficulty].consumption
  );
}

// Every game starts with one woodcutter already working, so the player can
// never end up with no wood and no way to get more.
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

export interface Warning {
  id: "fire" | "food" | "wood" | "famine";
  icon: IconId;
  text: string;
  severe: boolean;
}

export function warnings(state: GameState): Warning[] {
  const out: Warning[] = [];
  const prod = production(state);
  const netFood = prod.food - consumption(state);
  const famineLimit = DIFFICULTIES[state.difficulty].famineLimit;

  if (state.famineTicks > 0) {
    out.push({
      id: "famine",
      icon: "skull",
      text: `Your people are starving! Famine in ${Math.max(0, famineLimit - state.famineTicks)}s unless you find food.`,
      severe: true,
    });
  } else if (netFood < 0 && state.resources.food / -netFood < 45) {
    out.push({
      id: "food",
      icon: "meat",
      text: `Food is running low: about ${Math.ceil(state.resources.food / -netFood)}s left. Build gatherers or farms.`,
      severe: state.resources.food / -netFood < 20,
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

  if (!hasLitFire(state)) {
    const noCampfire = (countBuildings(state).campfire ?? 0) === 0;
    out.push({
      id: "fire",
      icon: "flame",
      text: `${noCampfire ? "No campfire!" : "The fire is out: no wood!"} Your people are cold (−${NO_FIRE_PENALTY} happiness).`,
      severe: true,
    });
  }
  return out;
}

// A fire only counts if there's wood to keep it burning.
export function hasLitFire(state: GameState) {
  return (countBuildings(state).campfire ?? 0) > 0 && state.resources.wood > 0;
}

export function warriorCap(state: GameState) {
  return (countBuildings(state).warcamp ?? 0) * WARRIORS_PER_CAMP;
}

export function defenseStrength(state: GameState) {
  const perWarrior = state.researched.includes("spears") ? 1.5 : 1;
  return state.soldiers * perWarrior + ((countBuildings(state).warcamp ?? 0) > 0 ? 1 : 0);
}

const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));

export function computeMeters(state: GameState): Meters {
  const counts = countBuildings(state);
  const prod = production(state);
  const cons = consumption(state);
  const stockDays = state.resources.food / Math.max(cons, 0.1);

  let food = (prod.food / Math.max(cons, 0.1)) * 50 + Math.min(30, stockDays);
  if (state.resources.food <= 0) food = Math.min(food, 5);

  const shelter =
    Math.min(1.1, housingCapacity(state) / Math.max(1, state.population)) * 70 +
    (counts.healer ?? 0) * 12;

  const fireBoost = state.researched.includes("firekeeping") ? 1.5 : 1;
  const energy =
    (counts.campfire ?? 0) * 20 * fireBoost * (state.resources.wood > 0 ? 1 : 0.3);

  const sustainability =
    100 -
    (counts.woodcutter ?? 0) * 6 -
    (counts.quarry ?? 0) * 4 -
    (counts.campfire ?? 0) * 1.5 -
    (counts.farm ?? 0) * 2 +
    state.modifiers.sustainability;

  const literacy = (counts.elder ?? 0) * 12 + (state.researched.length - 1) * 2;

  const happiness =
    clamp(food) * 0.35 +
    clamp(shelter) * 0.35 +
    Math.min(3, counts.campfire ?? 0) * 6 +
    (counts.elder ? 5 : 0) -
    (hasLitFire(state) ? 0 : NO_FIRE_PENALTY) -
    (100 - clamp(sustainability)) * 0.15 +
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

function advanceTutorial(state: GameState): GameState {
  const step = TUTORIAL[state.tutorialStep];
  if (!step) return state;
  const counts = countBuildings(state);
  const done =
    step.done === "scout"
      ? state.flags.scouted
      : state.researched.includes(step.done) || (counts[step.done] ?? 0) > 0;
  return done ? { ...state, tutorialStep: state.tutorialStep + 1 } : state;
}

function tick(state: GameState): GameState {
  if (state.phase !== "playing" || state.event) return state;
  const prod = production(state);
  const cons = consumption(state);
  const era = ERAS[state.era];

  const resources: Resources = {
    food: Math.max(0, state.resources.food + prod.food - cons),
    wood: Math.max(0, state.resources.wood + prod.wood),
    stone: state.resources.stone + prod.stone,
    knowledge: state.resources.knowledge + prod.knowledge,
    currency: state.resources.currency + prod.currency,
  };

  let population = state.population;
  let famineTicks = state.famineTicks;
  const capacity = housingCapacity(state);
  const growth = state.culture === "farmers" ? 0.03 : 0.02;

  if (resources.food <= 0) {
    population = Math.max(1, population - Math.max(0.3, population * 0.02));
    famineTicks += 1;
  } else {
    famineTicks = Math.max(0, famineTicks - 1);
    if (state.meters.food > 45 && state.meters.shelter > 40 && population < capacity * 1.15) {
      population += Math.max(0.15, population * growth);
    }
  }

  const modifiers = {
    sustainability: state.modifiers.sustainability * 0.995,
    happiness: state.modifiers.happiness * 0.993,
  };

  let next: GameState = {
    ...state,
    tick: state.tick + 1,
    year: state.year + era.yearsPerTick,
    resources,
    population,
    famineTicks,
    modifiers,
  };

  if (next.tick % 3 === 0) next = growForests(next);
  next = updateRaids(next);

  if (famineTicks >= DIFFICULTIES[state.difficulty].famineLimit) {
    return { ...next, phase: "gameover", log: ["Famine has wiped out the tribe.", ...next.log] };
  }

  if (next.tick >= next.nextEventTick) {
    const rand = mulberry32(next.seed + next.tick);
    const event = pickEvent(rand());
    next = { ...next, event, nextEventTick: next.tick + 110 + Math.floor(rand() * 90) };
  }

  next = checkSecrets(next);
  next = advanceTutorial(next);
  return { ...next, meters: computeMeters(next) };
}

// Forests spread onto grass next to them, young trees grow up over time, and
// woodcutters thin out the forest around them (it grows back).
function growForests(state: GameState): GameState {
  const rand = mulberry32(state.seed + state.tick * 13);
  const byKey = new Map(state.tiles.map((t) => [hexKey(t.q, t.r), t]));
  const woodcutters = state.tiles.filter((t) => t.building === "woodcutter");
  const changes = new Map<number, Partial<Tile>>();

  for (const t of state.tiles) {
    if (t.scorch > 0) {
      changes.set(t.id, { scorch: Math.max(0, t.scorch - 0.01) });
    }
    if (t.terrain === "forest" && t.growth < 1 && t.scorch < 0.4) {
      changes.set(t.id, { ...changes.get(t.id), growth: Math.min(1, t.growth + 0.06) });
    }
    if (t.terrain !== "grass" || t.building) continue;
    let forestNeighbors = 0;
    for (const [dq, dr] of NEIGHBOR_OFFSETS) {
      if (byKey.get(hexKey(t.q + dq, t.r + dr))?.terrain === "forest") forestNeighbors++;
    }
    if (forestNeighbors >= 2 && rand() < 0.008 * forestNeighbors) {
      changes.set(t.id, { terrain: "forest", height: terrainHeight("forest"), growth: 0.1 });
    }
  }

  if (state.tick % 12 === 0) {
    for (const w of woodcutters) {
      const grove = state.tiles.find(
        (t) => t.terrain === "forest" && !t.building && t.growth >= 1 && hexDistance(t, w) === 1,
      );
      if (grove) changes.set(grove.id, { growth: 0.25 });
    }
  }

  if (changes.size === 0) return state;
  return {
    ...state,
    tiles: state.tiles.map((t) => (changes.has(t.id) ? { ...t, ...changes.get(t.id) } : t)),
  };
}

function updateRaids(state: GameState): GameState {
  const { raid } = state;
  if (raid && state.tick >= raid.arriveTick) {
    const defense = defenseStrength(state);
    if (defense >= raid.strength) {
      const losses = Math.min(state.soldiers, Math.floor(raid.strength / 3));
      return {
        ...state,
        raid: null,
        soldiers: state.soldiers - losses,
        modifiers: { ...state.modifiers, happiness: state.modifiers.happiness + 6 },
        log: [
          `Raiders driven off!${losses ? ` ${losses} warrior${losses > 1 ? "s" : ""} fell.` : ""}`,
          ...state.log,
        ].slice(0, 30),
      };
    }
    return {
      ...state,
      raid: null,
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
    const strength = Math.max(
      2,
      Math.round((2 + state.tick / 110) * DIFFICULTIES[state.difficulty].raiders),
    );
    return {
      ...state,
      raid: {
        strength,
        fromTile: from.id,
        targetTile: home.id,
        startTick: state.tick,
        arriveTick: state.tick + 12,
      },
      nextRaidTick: state.tick + 100 + Math.floor(rand() * 60),
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
        resources: spend(state.resources, buildingCost(state, def)),
        log: [`Built a ${def.name}.`, ...state.log].slice(0, 30),
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
      const burned = effect.burn !== undefined ? burnForest(state, effect.burn) : null;
      return withMeters({
        ...state,
        tiles: burned?.tiles ?? state.tiles,
        nextRaidTick: state.nextRaidTick - (effect.raidSooner ?? 0),
        event: null,
        resources,
        population: state.population + (effect.population ?? 0),
        modifiers: {
          sustainability: state.modifiers.sustainability + (effect.sustainability ?? 0),
          happiness: state.modifiers.happiness + (effect.happiness ?? 0),
        },
        log: [
          ...(burned ? [burned.message] : []),
          `${state.event?.title}: ${choice.label}`,
          ...state.log,
        ].slice(0, 30),
      });
    }

    case "skipTutorial":
      return { ...state, tutorialStep: TUTORIAL.length };

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
      return {
        ...state,
        resources: { ...state.resources, food: state.resources.food + 6 },
        log: [`Hunters brought down a ${action.animal} (+6 food).`, ...state.log].slice(0, 30),
      };
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
    return parsed.version === SAVE_VERSION ? parsed : null;
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
