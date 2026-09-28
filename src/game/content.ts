import type { IconId } from "./sprites";
import type {
  Branch,
  BuildingDef,
  CultureId,
  DifficultyId,
  EventCard,
  MeterKey,
  Resources,
  TreeNode,
} from "./types";

export const ERAS = [
  { name: "Stone Age", startYear: -50000, yearsPerTick: 100, currency: "Shells" },
  { name: "Ancient", startYear: -3000, yearsPerTick: 20, currency: "Bronze coins" },
  { name: "Classical", startYear: -500, yearsPerTick: 10, currency: "Silver coins" },
  { name: "Medieval & Renaissance", startYear: 1000, yearsPerTick: 4, currency: "Florins" },
  { name: "Industrial & Modern", startYear: 1750, yearsPerTick: 1, currency: "Banknotes" },
  { name: "Future & Space", startYear: 2050, yearsPerTick: 0.5, currency: "Credits" },
];

export function formatYear(year: number) {
  const y = Math.round(year);
  return y < 0 ? `${Math.abs(y).toLocaleString()} BCE` : `${y} AD`;
}

export const METERS: { key: MeterKey; label: string; icon: IconId; side: "left" | "right" }[] = [
  { key: "food", label: "Food & Water", icon: "meat", side: "left" },
  { key: "shelter", label: "Shelter & Health", icon: "hut", side: "left" },
  { key: "happiness", label: "Happiness", icon: "smile", side: "left" },
  { key: "literacy", label: "Literacy", icon: "book", side: "right" },
  { key: "energy", label: "Energy", icon: "flame", side: "right" },
  { key: "sustainability", label: "Sustainability", icon: "leaf", side: "right" },
];

export const CULTURES: Record<
  CultureId,
  { name: string; icon: IconId; blurb: string }
> = {
  balanced: { name: "Balanced", icon: "scales", blurb: "No bonuses. The pure game." },
  traders: { name: "Traders", icon: "coin", blurb: "+50% currency. Caravans move faster (later eras)." },
  builders: { name: "Builders", icon: "bricks", blurb: "Buildings cost 20% less." },
  scholars: { name: "Scholars", icon: "book", blurb: "+50% knowledge." },
  warriors: { name: "Warriors", icon: "shield", blurb: "Stronger, cheaper armies (later eras)." },
  farmers: { name: "Farmers", icon: "wheat", blurb: "+25% food, faster population growth." },
  mariners: { name: "Mariners", icon: "boat", blurb: "+50% fishing, scouts see further." },
};

export const DIFFICULTIES: Record<
  DifficultyId,
  { name: string; blurb: string; consumption: number; famineLimit: number; unrestLimit: number; raiders: number }
> = {
  easy: { name: "Easy", blurb: "Forgiving. Famine takes a long time to hit.", consumption: 0.8, famineLimit: 45, unrestLimit: 60, raiders: 0.7 },
  normal: { name: "Normal", blurb: "The intended experience.", consumption: 1, famineLimit: 30, unrestLimit: 40, raiders: 1 },
  hard: { name: "Hard", blurb: "Hungry people, short patience, bold raiders.", consumption: 1.25, famineLimit: 18, unrestLimit: 25, raiders: 1.4 },
};

export const WARRIORS_PER_CAMP = 4;
export const TRAIN_COST = { food: 8, wood: 4 };

export const BUILDINGS: BuildingDef[] = [
  {
    id: "campfire",
    name: "Campfire",
    icon: "campfire",
    description: "Warmth, light and cooked food. People gather to sit around it. Without a lit fire, happiness drops. Burns a little wood.",
    era: 0,
    cost: { wood: 5 },
    terrain: ["grass", "steppe", "forest", "beach", "hills"],
    reveal: 3,
  },
  {
    id: "hut",
    name: "Hut",
    icon: "hut",
    description: "Shelter for 6 people.",
    era: 0,
    cost: { wood: 10 },
    terrain: ["grass", "steppe", "beach", "hills"],
    housing: 6,
    reveal: 2,
  },
  {
    id: "gatherer",
    name: "Gatherer's Camp",
    icon: "basket",
    description: "Collects food. Bonus on berry bushes.",
    era: 0,
    cost: { wood: 8 },
    terrain: ["grass", "steppe", "forest", "marsh"],
    produces: { food: 1.2 },
    depositBonus: { deposit: "berries", amount: { food: 1.2 } },
    reveal: 2,
  },
  {
    id: "farm",
    name: "Farmland",
    icon: "wheat",
    description: "Tilled fields of wild grain. Lots of food, but clears the land.",
    era: 0,
    cost: { wood: 12 },
    terrain: ["grass"],
    requires: "early-farming",
    produces: { food: 2.2 },
    reveal: 1,
  },
  {
    id: "warcamp",
    name: "War Camp",
    icon: "shield",
    description: "Trains warriors to fight off raiders. Each camp holds 4 warriors.",
    era: 0,
    cost: { wood: 15, food: 10 },
    terrain: ["grass", "steppe", "hills", "beach"],
    reveal: 3,
  },
  {
    id: "woodcutter",
    name: "Woodcutter",
    icon: "axe",
    description: "Chops wood from forests. Hurts sustainability a little.",
    era: 0,
    cost: { wood: 4 },
    terrain: ["forest"],
    produces: { wood: 0.3 },
    reveal: 2,
  },
  {
    id: "fishing",
    name: "Fishing Spot",
    icon: "fish",
    description: "Food from the sea. Must touch water; bonus near fish.",
    era: 0,
    cost: { wood: 10 },
    terrain: ["beach"],
    needsWaterNeighbor: true,
    requires: "fishing",
    produces: { food: 1.8 },
    reveal: 3,
  },
  {
    id: "quarry",
    name: "Stone Quarry",
    icon: "pickaxe",
    description: "Cuts stone from hills. Bonus on stone deposits.",
    era: 0,
    cost: { wood: 15 },
    terrain: ["hills", "mountain"],
    requires: "toolmaking",
    produces: { stone: 0.6 },
    depositBonus: { deposit: "stone", amount: { stone: 0.8 } },
    reveal: 2,
  },
  {
    id: "elder",
    name: "Elder's Hut",
    icon: "feather",
    description: "Stories and cave paintings pass knowledge on to children.",
    era: 0,
    cost: { wood: 10, stone: 10 },
    terrain: ["grass", "steppe"],
    requires: "storytelling",
    produces: { knowledge: 0.3 },
    reveal: 2,
  },
  {
    id: "healer",
    name: "Healer's Hut",
    icon: "herb",
    description: "Herbs and care keep people healthy.",
    era: 0,
    cost: { wood: 10, stone: 5 },
    terrain: ["grass", "steppe", "forest"],
    requires: "herbalism",
    reveal: 2,
  },
];

export const BUILDINGS_BY_ID = Object.fromEntries(BUILDINGS.map((b) => [b.id, b]));

export const BRANCHES: { id: Branch; name: string; color: string }[] = [
  { id: "knowledge", name: "Knowledge", color: "#60a5fa" },
  { id: "construction", name: "Construction", color: "#f59e0b" },
  { id: "energy", name: "Energy", color: "#f97316" },
  { id: "transport", name: "Transport", color: "#2dd4bf" },
  { id: "military", name: "Military", color: "#f87171" },
  { id: "culture", name: "Culture & Trade", color: "#c084fc" },
];

type NodeSeed = [id: string, name: string, branch: Branch, era: number, cost: number, requires: string[], description: string];

const LATER_NODES: NodeSeed[] = [
  ["writing", "Writing", "knowledge", 1, 0, ["agriculture"], "Clay tablets and the first scribes."],
  ["bronze", "Bronze Working", "construction", 1, 0, ["agriculture"], "Copper + tin = tools, weapons and trade goods."],
  ["irrigation", "Irrigation", "energy", 1, 0, ["agriculture"], "Canals feed bigger fields."],
  ["wheel", "The Wheel", "transport", 1, 0, ["agriculture"], "Carts and the first trade caravans."],
  ["bronze-arms", "Bronze Weapons", "military", 1, 0, ["bronze"], "Spearmen with bronze tips and shields."],
  ["barter-roads", "Silk Road Contact", "culture", 1, 0, ["wheel"], "Traders from the east arrive."],
  ["philosophy", "Philosophy", "knowledge", 2, 0, ["writing"], "Academies and great thinkers."],
  ["concrete", "Roman Concrete", "construction", 2, 0, ["bronze"], "Limestone + ash → aqueducts and domes."],
  ["watermill", "Watermills", "energy", 2, 0, ["irrigation"], "Rivers grind grain."],
  ["roads", "Paved Roads", "transport", 2, 0, ["wheel"], "Faster trade across the steppe."],
  ["legions", "Iron Legions", "military", 2, 0, ["bronze-arms"], "Disciplined iron-armed infantry."],
  ["coinage", "Coinage", "culture", 2, 0, ["barter-roads"], "Silver coins replace barter."],
  ["universities", "Universities", "knowledge", 3, 0, ["philosophy"], "Scholars gather from every land."],
  ["cathedrals", "Great Cathedrals", "construction", 3, 0, ["concrete"], "Flying buttresses and stained glass."],
  ["windmills", "Windmills", "energy", 3, 0, ["watermill"], "Wind grinds grain and pumps water."],
  ["caravels", "Ocean Ships", "transport", 3, 0, ["roads"], "Reach the far islands."],
  ["gunpowder", "Gunpowder", "military", 3, 0, ["legions"], "Cannons change warfare."],
  ["printing", "Printing Press", "culture", 3, 0, ["coinage"], "Books for everyone. Literacy soars."],
  ["electricity", "Electricity", "knowledge", 4, 0, ["universities"], "Power lines and light bulbs."],
  ["steel", "Steel Frames", "construction", 4, 0, ["cathedrals"], "Skyscrapers and bridges."],
  ["steam", "Steam & Coal", "energy", 4, 0, ["windmills"], "Factories boom. So does pollution."],
  ["railways", "Railways", "transport", 4, 0, ["caravels"], "Trains link the whole island."],
  ["tanks", "Mechanized Armies", "military", 4, 0, ["gunpowder"], "Tanks, planes and radar."],
  ["computers", "Computers", "culture", 4, 0, ["printing"], "The information age begins."],
  ["ai", "Artificial Intelligence", "knowledge", 5, 0, ["electricity", "computers"], "Data centers and automated labs."],
  ["arcology", "Arcologies", "construction", 5, 0, ["steel"], "Cities in a single tower."],
  ["fusion", "Fusion Power", "energy", 5, 0, ["steam"], "Near-limitless clean energy."],
  ["rocketry", "Orbital Rocketry", "transport", 5, 0, ["railways"], "Reach orbit. Unlocks the space view."],
  ["drones", "Drone Defense", "military", 5, 0, ["tanks"], "Autonomous defense grids."],
  ["interstellar", "Interstellar Drive", "culture", 5, 0, ["rocketry", "fusion"], "Leave the solar system."],
];

export const TREE: TreeNode[] = [
  {
    id: "fire",
    name: "Discover Fire",
    description: "Where everything begins.",
    branch: "root",
    era: 0,
    cost: 0,
    requires: [],
  },
  {
    id: "storytelling",
    name: "Storytelling",
    description: "Elders pass knowledge on. Unlocks the Elder's Hut.",
    branch: "knowledge",
    era: 0,
    cost: 6,
    requires: ["fire"],
    unlocks: ["elder"],
  },
  {
    id: "toolmaking",
    name: "Toolmaking",
    description: "Sharpened stone. Unlocks the Stone Quarry.",
    branch: "construction",
    era: 0,
    cost: 5,
    requires: ["fire"],
    unlocks: ["quarry"],
  },
  {
    id: "firekeeping",
    name: "Firekeeping",
    description: "Keep fires burning longer. +50% energy from campfires.",
    branch: "energy",
    era: 0,
    cost: 6,
    requires: ["fire"],
  },
  {
    id: "fishing",
    name: "Rafts & Fishing",
    description: "Food from the sea. Unlocks the Fishing Spot.",
    branch: "transport",
    era: 0,
    cost: 8,
    requires: ["fire"],
    unlocks: ["fishing"],
  },
  {
    id: "early-farming",
    name: "Early Farming",
    description: "Plant the seeds of wild grain. Unlocks Farmland.",
    branch: "knowledge",
    era: 0,
    cost: 8,
    requires: ["fire"],
    unlocks: ["farm"],
  },
  {
    id: "spears",
    name: "Hunting Spears",
    description: "+15% food, and warriors fight 50% harder.",
    branch: "military",
    era: 0,
    cost: 6,
    requires: ["toolmaking"],
  },
  {
    id: "herbalism",
    name: "Herbalism",
    description: "Healing plants. Unlocks the Healer's Hut.",
    branch: "culture",
    era: 0,
    cost: 10,
    requires: ["fire"],
    unlocks: ["healer"],
  },
  {
    id: "cave-paintings",
    name: "Cave Paintings",
    description: "Secret: build 2 Elder's Huts. +25 knowledge and +10 happiness.",
    branch: "culture",
    era: 0,
    cost: 0,
    requires: ["storytelling"],
    secret: true,
  },
  {
    id: "agriculture",
    name: "Agriculture",
    description: "Enter the Ancient era: farms, villages, bronze.",
    branch: "knowledge",
    era: 0,
    cost: 40,
    requires: ["early-farming", "toolmaking"],
    comingSoon: true,
  },
  {
    id: "silk-secret",
    name: "Jade Road",
    description: "Secret discovered through trade.",
    branch: "culture",
    era: 1,
    cost: 0,
    requires: ["barter-roads"],
    secret: true,
    comingSoon: true,
  },
  ...LATER_NODES.map(
    ([id, name, branch, era, cost, requires, description]): TreeNode => ({
      id,
      name,
      branch,
      era,
      cost,
      requires,
      description,
      comingSoon: true,
    }),
  ),
];

export const TREE_BY_ID = Object.fromEntries(TREE.map((n) => [n.id, n]));

export const EVENTS: EventCard[] = [
  {
    id: "wanderers",
    title: "Wanderers at the fire",
    icon: "person",
    body: "A band of eight hungry wanderers asks to join your tribe. They're strong workers, but they'll eat a lot. Turned away, they may not forget it.",
    choices: [
      { label: "Welcome them (+8 people, −25 food)", effect: { population: 8, resources: { food: -25 } } },
      {
        label: "Send them away (−12 happiness, raiders come sooner)",
        effect: { happiness: -12, raidSooner: 40 },
      },
    ],
  },
  {
    id: "wildfire",
    title: "Wildfire!",
    icon: "flame",
    body: "Fire has caught in the dry forest near the village and the wind is picking up. Anything in its path will burn.",
    choices: [
      {
        label: "Fight it (−25 wood, −5 happiness, it's contained)",
        effect: { resources: { wood: -25 }, happiness: -5, burn: 0 },
      },
      {
        label: "Let it burn (the forest and buildings nearby are lost)",
        effect: { burn: 2, sustainability: -25, happiness: -12 },
      },
    ],
  },
  {
    id: "eastern-trader",
    title: "A trader from the east",
    icon: "coin",
    body: "A stranger with a pack animal has crossed the steppe. She wants wood, and brings shells and stories of distant lands.",
    choices: [
      {
        label: "Trade 25 wood for 60 shells and 8 knowledge",
        effect: { resources: { wood: -25, currency: 60, knowledge: 8 } },
      },
      { label: "Turn her away", effect: {} },
    ],
  },
  {
    id: "good-hunt",
    title: "A great hunt",
    icon: "mammoth",
    body: "Your hunters brought down a mammoth! There's enough meat for weeks, or for one unforgettable night.",
    choices: [
      { label: "Feast! (+25 happiness)", effect: { happiness: 25 } },
      { label: "Preserve it (+60 food)", effect: { resources: { food: 60 } } },
    ],
  },
];

// Each step unlocks the buildings/tools it introduces. Until the tutorial ends
// (or is skipped), anything not yet introduced stays locked.
// What's left over once the tutorial is done. On top of this, a new game starts
// with exactly what the tutorial buys (see tutorialBudget), so nobody waits.
// How the land reacts. Sustainability measures how much forest is left around
// the village (plus fire smoke and quarry pits); woodcutters really fell trees.
export const LAND = {
  // Forest within this many hexes of the start counts toward Sustainability.
  radius: 7,
  // How far a woodcutter walks for trees, and how much wood a fully grown tile holds.
  woodcutterReach: 2,
  woodPerGrowth: 3,
  // Below this Sustainability the land starts to wear out; fully exhausted after `strainTicks`.
  strainLevel: 40,
  strainTicks: 60,
};

// Wildfire odds: a little from lightning, more for every campfire near trees.
export const FIRE_RISK = { base: 0.1, perForestTile: 0.06, max: 1.5 };

// Buying something that leaves less wood than this shows a "save up" warning.
export const LOW_WOOD_AFTER_BUY = 10;

// After the tutorial, how long before the first event and the first raid.
export const GRACE_AFTER_TUTORIAL = { event: 90, raid: 150 };

export const AFTER_TUTORIAL_RESERVE: Partial<Resources> = { food: 40, wood: 10 };

// `buys` lists what the step pays for: building ids, "scout", "train" or an
// advancement id. The starting resources are worked out from it.
export const TUTORIAL: { text: string; done: string; unlocks: string[]; buys: string[] }[] = [
  { text: "Our people are cold, and without a fire they grow unhappy. Pick the Campfire from the bar below and place it on a green tile.", done: "campfire", unlocks: ["campfire"], buys: ["campfire"] },
  { text: "Fires burn wood, and wood is scarce. Build a Woodcutter in the forest to keep them going.", done: "woodcutter", unlocks: ["woodcutter"], buys: ["woodcutter"] },
  { text: "Good! Now build a Hut so more people have shelter.", done: "hut", unlocks: ["hut"], buys: ["hut"] },
  { text: "We need food. Place a Gatherer's Camp. Berry bushes give a bonus.", done: "gatherer", unlocks: ["gatherer"], buys: ["gatherer"] },
  { text: "The world is hidden. Press Scout to explore new land.", done: "scout", unlocks: ["scout"], buys: ["scout"] },
  { text: "Raiders roam these lands. Build a War Camp, then train a warrior to defend us.", done: "train", unlocks: ["warcamp", "train"], buys: ["warcamp", "train"] },
  { text: "Our elders have learned a lot. Open Advancements and research Early Farming.", done: "early-farming", unlocks: ["advancements"], buys: ["early-farming"] },
  { text: "Now we can plant grain. Place Farmland on a green tile for a steady supply of food.", done: "farm", unlocks: ["farm"], buys: ["farm"] },
];
