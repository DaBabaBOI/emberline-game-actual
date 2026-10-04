// Elder Ama's hints: one short line that introduces a feature the tutorial
// doesn't, at the moment it first matters (a woodcutter cut off by the sacred
// grove: sell it; the first time scouting is affordable: what it costs). Each
// is shown once a game, one at a time, spaced out (hud/hints.tsx schedules
// them). `target` is a CSS selector for the button to point at (it glows);
// `done` hides the hint early once the player has done it.
//
// List them in order of importance: the first one that applies is shown.
import { GROWTH_PRESSURE, IMPROVE, LAND, PLANT_COST, TUTORIAL, WEAR } from "./content";
import {
  affordableResearch,
  canAfford,
  countBuildings,
  forestCover,
  housingCapacity,
  improveNext,
  isLit,
  loggingMode,
  scoutCost,
  tallyOf,
  treesNear,
  warriorCap,
} from "./engine";
import { hexDistance } from "./hex";
import type { GameState, Resources } from "./types";

export interface Hint {
  id: string;
  when: (s: GameState) => boolean;
  text: (s: GameState) => string;
  target?: string | ((s: GameState) => string);
  done?: (s: GameState) => boolean;
}

// Seconds of play, counted from the end of the tutorial (ticks are 1.5 s).
const playedTicks = (s: GameState) => s.tick - (s.eraStartTick ?? 0);
const costText = (cost: Partial<Resources>) =>
  Object.entries(cost)
    .filter(([, v]) => v)
    .map(([k, v]) => `${v} ${k}`)
    .join(" and ");
const woodcutters = (s: GameState) => s.tiles.filter((t) => t.building === "woodcutter");
const guide = (id: string) => `[data-guide="${id}"]`;
const testid = (id: string) => `[data-testid="${id}"]`;
const LOW = 30;

export const HINTS: Hint[] = [
  {
    id: "grove-woodcutter",
    when: (s) => {
      const grove = s.protectedTiles ?? [];
      return grove.length > 0 && woodcutters(s).some((w) => grove.some((id) => hexDistance(s.tiles[id], w) <= LAND.woodcutterReach));
    },
    text: () => "The sacred grove is protected, so the Woodcutter beside it has fewer trees. Press Sell, then click the Woodcutter, to move it.",
    target: guide("tool-sell"),
  },
  {
    id: "idle-woodcutter",
    when: (s) => woodcutters(s).some((w) => treesNear(s, w).length === 0),
    text: () => "A Woodcutter has no trees left to cut. Sell it (Sell, then click it) and build one by the forest, or plant saplings around it.",
    target: guide("tool-sell"),
  },
  {
    id: "fire-out",
    when: (s) => s.tiles.some((t) => t.building === "campfire" && !isLit(s, t)),
    text: () => "A campfire went out: click it to relight it. Clicking a lit fire lets you send its keeper away to save wood.",
    done: (s) => !s.tiles.some((t) => t.building === "campfire" && !isLit(s, t)),
  },
  {
    id: "scout",
    when: (s) => playedTicks(s) > 10 && !s.scouting && canAfford(s, scoutCost(s)),
    text: (s) => `Press Scout, then click a spot in the fog: people walk out to explore and come back with a map of it. Further in takes longer, and each trip costs more (next: ${costText(scoutCost(s))}).`,
    target: guide("tool-scout"),
  },
  {
    id: "trade",
    when: (s) => playedTicks(s) > 30 && s.resources.currency >= 20,
    text: () => "Our shells buy things! Press Trade to swap them for food, wood or stone. Buying wood spares our own forest.",
    target: guide("tool-trade"),
  },
  {
    id: "raid-train",
    when: (s) => !!countBuildings(s).warcamp && s.soldiers < warriorCap(s) && s.nextRaidTick - s.tick < 60 && s.nextRaidTick > s.tick,
    text: (s) => `Raiders will come again soon. Press Train to make more warriors (${s.soldiers} of ${warriorCap(s)} so far).`,
    target: guide("tool-train"),
  },
  {
    id: "meter-low",
    when: (s) => playedTicks(s) > 20 && Object.values(s.meters).some((v) => v < LOW),
    text: () => "One of the meters on the side is low. Click it to see why, then press What should I fix?",
    // The lowest meter.
    target: (s) => {
      const [key] = Object.entries(s.meters).sort((a, b) => a[1] - b[1])[0];
      return key === "sustainability" ? testid("sustain-meter") : testid(`meter-${key}`);
    },
  },
  {
    id: "land-suffering",
    when: (s) => s.meters.sustainability < 70,
    text: () => "The land is suffering. Click the Sustainability meter, then What should I fix?, to see exactly what to change.",
    target: testid("sustain-meter"),
  },
  {
    id: "plant",
    when: (s) => s.researched.includes("early-farming") && forestCover(s) < 0.92,
    text: () => `Cut forest can grow back: press Plant, then click a thinned forest patch (${costText(PLANT_COST)} each).`,
    target: guide("tool-plant"),
  },
  {
    id: "improve",
    // A building that could be improved right now.
    when: (s) => s.tiles.some((t) => {
      const next = improveNext(s, t);
      return !!next && !next.needs && canAfford(s, next.cost);
    }),
    text: () => `Buildings can be improved with stone, and later bronze, iron and steel: click a Farm or Woodcutter and press Improve. Each level makes ${Math.round(IMPROVE.boost * 100)}% more from the same land.`,
    done: (s) => s.tiles.some((t) => (t.level ?? 1) >= 2),
  },
  {
    id: "logging",
    when: (s) => forestCover(s) < 0.85 && woodcutters(s).some((w) => loggingMode(s, w) === "clear"),
    text: () => "Click a Woodcutter to switch it to selective logging: half the wood, but the forest keeps up.",
  },
  {
    id: "research-ready",
    when: (s) => playedTicks(s) > 30 && affordableResearch(s).length > 0,
    text: () => "You have enough Knowledge for a new Advancement. Open Advancements to choose one.",
    target: guide("tool-advancements"),
    done: (s) => affordableResearch(s).length === 0,
  },
  {
    id: "population",
    when: (s) => s.population >= 20 || (s.population >= 10 && s.population >= housingCapacity(s)),
    text: () => "Too many mouths to feed? Click the population counter to hold the tribe at a size, or send settlers off to start a village.",
    target: testid("crowd-people"),
  },
  {
    id: "warm-clothes",
    when: (s) => s.researched.includes("herding") && !s.researched.includes("hide-clothing") && s.tiles.filter((t) => isLit(s, t)).length >= 3,
    text: () => `Every fire costs wood and smoke. Learn Warm Clothes: then each Livestock Pen keeps ${GROWTH_PRESSURE.peoplePerPen} people warm, and no campfire is needed.`,
    target: guide("tool-advancements"),
  },
  {
    id: "beliefs",
    when: (s) => s.era >= 1 && !countBuildings(s).shrine && s.resources.wood >= 15 && s.resources.stone >= 10,
    text: () => "Our people have their own beliefs. Build a Shrine: it cheers everyone up, and once a year there's a festival (it costs some food).",
    target: guide("build-shrine"),
  },
  {
    id: "repair",
    when: (s) => s.tiles.some((t) => (t.worn ?? 0) >= WEAR.warnAt),
    text: () => "A hammer over a building means it is wearing out. Click it and press Repair before it breaks.",
  },
  {
    id: "canoe",
    when: (s) => !!countBuildings(s).dock && tallyOf(s, "canoes") === 0,
    text: () => "Your Canoe Dock is ready: press Canoe, then click where on the sea to paddle. Near the southern isles it finds them; anywhere else it fishes and maps the sea.",
    target: guide("tool-canoe"),
  },
  {
    id: "tipping",
    when: (s) => !!s.tipping,
    text: () => "The air must get cleaner, fast. Learn Carbon Capture and build Air Capture Plants (on clean power), plant forest, and close coal plants.",
    target: guide("tool-advancements"),
  },
  {
    id: "space",
    when: (s) => !!countBuildings(s).launchsite && !(s.space ?? []).length,
    text: () => "The Launch Site is ready: press Space to see our planet from orbit and launch satellites, a telescope, a power satellite and a Moon base.",
    target: guide("tool-space"),
    done: (s) => (s.space ?? []).length > 0,
  },
  {
    id: "kingdoms",
    when: (s) => s.era >= 3,
    text: () => "Other kingdoms share these seas. Open Kingdoms to trade with them, make treaties, or prepare for war.",
    target: guide("tool-kingdoms"),
  },
  {
    id: "speed",
    when: (s) => playedTicks(s) > 120,
    text: () => "Want time to pass faster? Use the arrows at the top to speed up, or pause to think.",
    target: guide("speed"),
  },
  {
    id: "pick-up",
    when: (s) => playedTicks(s) > 200,
    text: () => "You can pick a villager up and drop them at a building: they pitch in there for a while.",
  },
  {
    id: "night",
    // The time of day follows the game clock (world/sky.tsx: 120 ticks a day).
    when: (s) => (s.tick / 120 + 0.27) % 1 > 0.8,
    text: () => "Night falls. Too dark? In the Menu, turn off Day and night to keep it always day.",
    target: testid("game-menu"),
  },
  {
    id: "menu",
    when: (s) => playedTicks(s) > 400,
    text: () => "The Menu has cloud saves (carry on on another device), sound, graphics and accessibility settings.",
    target: testid("game-menu"),
  },
];

export const HINTS_BY_ID: Record<string, Hint> = Object.fromEntries(HINTS.map((h) => [h.id, h]));

// How long a hint stays up (ticks), and the gap before the next one.
export const HINT = { showTicks: 30, gapTicks: 40, firstAfter: 15 };

// The hint to show now, if any: the first one that applies and hasn't been
// shown. Never during the tutorial, an event, a lesson, a guided step or a raid.
export function nextHint(state: GameState): string | null {
  if (state.phase !== "playing" || state.tutorialStep < TUTORIAL.length) return null;
  if (state.hint || state.event || state.lesson || state.coach || state.raid || state.debrief || state.cutscene) return null;
  if (state.tick - (state.hintTick ?? -Infinity) < HINT.gapTicks || playedTicks(state) < HINT.firstAfter) return null;
  const seen = state.hintsSeen ?? [];
  return HINTS.find((h) => !seen.includes(h.id) && h.when(state))?.id ?? null;
}
