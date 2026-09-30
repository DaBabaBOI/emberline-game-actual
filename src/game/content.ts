import type { IconId } from "./sprites";
import type {
  AfterStep,
  Goal,
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
  { name: "Ancient", startYear: -3000, yearsPerTick: 3, currency: "Bronze coins" },
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
// After Hunting Spears: give a warrior a spear. Spearmen fight 1.5x as hard.
export const SPEAR_COST = { wood: 4 };
export const SPEARMAN_STRENGTH = 1.5;

export const BUILDINGS: BuildingDef[] = [
  {
    id: "campfire",
    name: "Campfire",
    icon: "campfire",
    description: "Warmth, light and cooked food. People gather to sit around it. Without a lit fire, happiness drops. Burns a little wood.",
    gain: "Warmth for 10 people, light, cooked food",
    landCost: "Burns wood, adds smoke, and can start a wildfire in nearby trees",
    landImpact: 2,
    era: 0,
    cost: { wood: 5 },
    terrain: ["grass", "steppe", "forest", "beach", "hills"],
    reveal: 3,
  },
  {
    id: "hut",
    name: "Wooden House",
    icon: "hut",
    description: "A small house of logs and bark. Shelter for 6 people.",
    gain: "Room for 6 more people",
    landCost: "More people eat more food and need more fires. Wood burns: sparks from a campfire next door can set it alight",
    landImpact: 1,
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
    gain: "Food from wild plants and game, more on berry bushes",
    landCost: "The wild only has so much: each extra camp adds just 25% more food, and past 2 camps animals are hunted faster than they breed",
    landImpact: 1,
    era: 0,
    cost: { wood: 8 },
    terrain: ["grass", "steppe", "forest", "marsh"],
    produces: { food: 0.6 },
    depositBonus: { deposit: "berries", amount: { food: 0.4 } },
    reveal: 2,
  },
  {
    id: "farm",
    name: "Farmland",
    icon: "wheat",
    description: "Tilled fields of wild grain. Lots of food, but clears the land.",
    gain: "Lots of steady food",
    landCost: "Clears the nearest patch of forest for good, and fewer trees means less rain for every field",
    landImpact: 2,
    era: 0,
    cost: { wood: 12 },
    terrain: ["grass"],
    requires: "early-farming",
    produces: { food: 1.0 },
    reveal: 1,
  },
  {
    id: "warcamp",
    name: "War Camp",
    icon: "shield",
    description: "Trains warriors to fight off raiders. Each camp holds 4 warriors.",
    gain: "Warriors to hold off raiders",
    landCost: "Warriors eat food and don't gather any",
    landImpact: 0,
    era: 0,
    cost: { wood: 15, food: 10 },
    terrain: ["grass", "steppe", "hills", "beach"],
    reveal: 3,
  },
  {
    id: "woodcutter",
    name: "Woodcutter",
    icon: "axe",
    description: "Chops wood from the forest around it. Wood only comes from trees that are still standing.",
    gain: "Wood for fires and building",
    landCost: "Fells the trees around it; the forest takes a long time to grow back",
    landImpact: 3,
    era: 0,
    cost: { wood: 4 },
    terrain: ["forest"],
    produces: { wood: 0.25 },
    reveal: 2,
  },
  {
    id: "fishing",
    name: "Fishing Spot",
    icon: "fish",
    description: "Food from the sea. Must touch water; bonus near fish.",
    gain: "Food from the sea",
    landCost: "A small chance of sickness from the catch",
    landImpact: 0,
    era: 0,
    cost: { wood: 10 },
    terrain: ["beach"],
    needsWaterNeighbor: true,
    requires: "fishing",
    produces: { food: 0.7 },
    reveal: 3,
  },
  {
    id: "quarry",
    name: "Stone Quarry",
    icon: "pickaxe",
    description: "Cuts stone from hills. Bonus on stone deposits.",
    gain: "Stone for better buildings",
    landCost: "Cuts the hill down for good, and its dust covers crops and berries within 2 tiles (40% less food)",
    landImpact: 2,
    era: 0,
    cost: { wood: 15 },
    terrain: ["hills", "mountain"],
    requires: "toolmaking",
    produces: { stone: 0.3 },
    depositBonus: { deposit: "stone", amount: { stone: 0.3 } },
    reveal: 2,
  },
  {
    id: "elder",
    name: "Elder's Hut",
    icon: "feather",
    description: "Stories and cave paintings pass knowledge on to children.",
    gain: "Knowledge and literacy for the children",
    landCost: "Nothing from the land",
    landImpact: 0,
    era: 0,
    cost: { wood: 10, stone: 10 },
    terrain: ["grass", "steppe"],
    requires: "storytelling",
    produces: { knowledge: 0.08 },
    reveal: 2,
  },
  {
    id: "healer",
    name: "Healer's Hut",
    icon: "herb",
    description: "Herbs and care keep people healthy.",
    gain: "Fights sickness and keeps people healthy",
    landCost: "Nothing from the land",
    landImpact: 0,
    era: 0,
    cost: { wood: 10, stone: 5 },
    terrain: ["grass", "steppe", "forest"],
    requires: "herbalism",
    reveal: 2,
  },
  {
    id: "pen",
    name: "Livestock Pen",
    icon: "sheep",
    description: "Goats and sheep behind a fence. A little milk and meat, and later their hides and wool make warm clothes.",
    gain: "A little food; with Warm Clothes researched, clothing for 6 people so fewer fires are needed",
    landCost: "Grazing animals wear down the grass around them",
    landImpact: 1,
    era: 0,
    cost: { wood: 12, food: 10 },
    terrain: ["grass", "steppe"],
    requires: "herding",
    produces: { food: 0.35 },
    reveal: 1,
  },
  // ---- Ancient era ---------------------------------------------------------
  {
    id: "house",
    name: "Mud-brick House",
    icon: "bricks",
    description: "Sturdy homes of sun-dried and fired brick that don't burn. Built by upgrading a Wooden House (click it), or new.",
    gain: "Room for 12 people",
    landCost: "Bricks are fired in kilns that burn wood",
    landImpact: 1,
    era: 1,
    cost: { wood: 14, stone: 8 },
    terrain: ["grass", "steppe"],
    requires: "agriculture",
    housing: 12,
    reveal: 1,
  },
  {
    id: "school",
    name: "Scribe School",
    icon: "book",
    description: "Children learn to write on clay tablets. Knowledge no longer dies with the elders.",
    gain: "Knowledge and literacy for the whole village",
    landCost: "Nothing from the land",
    landImpact: 0,
    era: 1,
    cost: { wood: 20, stone: 15 },
    terrain: ["grass", "steppe"],
    requires: "writing",
    produces: { knowledge: 0.12 },
    reveal: 1,
  },
  {
    id: "smithy",
    name: "Bronze Smithy",
    icon: "hammer",
    description: "Smelts copper and tin into bronze tools. Better tools mean more food and wood from every worker.",
    gain: "+20% food and wood from bronze tools (up to 3 smithies)",
    landCost: "Burns wood for charcoal all the time, and its smoke is heavy",
    landImpact: 3,
    era: 1,
    cost: { wood: 20, stone: 20 },
    terrain: ["grass", "steppe", "hills"],
    requires: "bronze",
    reveal: 1,
  },
  {
    id: "canal",
    name: "Irrigation Canal",
    icon: "boat",
    description: "Channels river water to the fields next to it.",
    gain: "Every farm next to it grows 50% more food",
    landCost: "Watered soil slowly turns salty, and the land wears out",
    landImpact: 2,
    era: 1,
    cost: { wood: 10, stone: 10 },
    terrain: ["grass", "steppe"],
    needsWaterNeighbor: true,
    requires: "irrigation",
    reveal: 1,
  },
  {
    id: "granary",
    name: "Granary",
    icon: "amphora",
    description: "Sealed clay jars and dry storage. Food keeps for much longer.",
    gain: "150 more food keeps without rotting",
    landCost: "Nothing from the land",
    landImpact: 0,
    era: 1,
    cost: { wood: 15, stone: 10 },
    terrain: ["grass", "steppe"],
    requires: "pottery",
    reveal: 1,
  },
  {
    id: "forester",
    name: "Forester's Lodge",
    icon: "sapling",
    description: "Foresters tend young trees and replant what the woodcutters take.",
    gain: "Replants cut forest around it, a little at a time",
    landCost: "Its land can't be farmed or built on",
    landImpact: 0,
    era: 1,
    cost: { wood: 15, food: 10 },
    terrain: ["grass", "steppe", "forest"],
    requires: "forestry",
    reveal: 2,
  },
  {
    id: "walls",
    name: "Stone Walls",
    icon: "castle",
    description: "A ring of stone walls. Each adds 4 to your defense.",
    gain: "+4 defense against raiders",
    landCost: "Stone quarried out of the hills",
    landImpact: 1,
    era: 1,
    cost: { wood: 10, stone: 30 },
    terrain: ["grass", "steppe", "hills"],
    requires: "bronze-arms",
    reveal: 1,
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
  ["wheel", "The Wheel", "transport", 1, 0, ["agriculture"], "Carts and the first trade caravans."],
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
    requires: ["toolmaking"],
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
    description: "+15% food. Warriors can carry spears: train new spearmen, or give your warriors spears, to fight 50% harder.",
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
    requires: ["toolmaking"],
    unlocks: ["healer"],
  },
  {
    id: "herding",
    name: "Herding",
    description: "Tame wild goats and sheep. Unlocks the Livestock Pen.",
    branch: "knowledge",
    era: 0,
    cost: 10,
    requires: ["early-farming"],
    unlocks: ["pen"],
  },
  {
    id: "hide-clothing",
    name: "Warm Clothes",
    description: "Sew hides and wool into warm clothes. Each Livestock Pen keeps 6 people warm without a fire.",
    branch: "energy",
    era: 0,
    cost: 12,
    requires: ["herding"],
  },
  {
    id: "cave-paintings",
    name: "Cave Paintings",
    description: "Secret: build 2 Elder's Huts. +8 knowledge and +10 happiness.",
    branch: "culture",
    era: 0,
    cost: 0,
    requires: ["storytelling"],
    secret: true,
  },
  {
    id: "agriculture",
    name: "Agriculture",
    description: "Settle down to farm for good. With 15 people, your tribe can enter the Ancient era.",
    branch: "knowledge",
    era: 0,
    cost: 80,
    requires: ["early-farming", "toolmaking"],
  },
  // ---- Ancient era ---------------------------------------------------------
  {
    id: "writing",
    name: "Writing",
    description: "Clay tablets and the first scribes. Unlocks the Scribe School.",
    branch: "knowledge",
    era: 1,
    cost: 30,
    requires: ["agriculture"],
    unlocks: ["school"],
  },
  {
    id: "pottery",
    name: "Pottery & Storage",
    description: "Fired jars keep grain dry and safe. Unlocks the Granary.",
    branch: "construction",
    era: 1,
    cost: 20,
    requires: ["agriculture"],
    unlocks: ["granary"],
  },
  {
    id: "bronze",
    name: "Bronze Working",
    description: "Copper and tin make bronze tools. Unlocks the Bronze Smithy.",
    branch: "construction",
    era: 1,
    cost: 35,
    requires: ["pottery"],
    unlocks: ["smithy"],
  },
  {
    id: "irrigation",
    name: "Irrigation",
    description: "Canals carry water to the fields. Unlocks the Irrigation Canal.",
    branch: "energy",
    era: 1,
    cost: 30,
    requires: ["agriculture"],
    unlocks: ["canal"],
  },
  {
    id: "forestry",
    name: "Forest Stewardship",
    description: "Tend the forest instead of just cutting it. Unlocks the Forester's Lodge.",
    branch: "culture",
    era: 1,
    cost: 25,
    requires: ["agriculture"],
    unlocks: ["forester"],
  },
  {
    id: "bronze-arms",
    name: "Bronze Weapons",
    description: "Bronze spears and shields: each warrior fights twice as hard. Unlocks Stone Walls.",
    branch: "military",
    era: 1,
    cost: 35,
    requires: ["bronze"],
    unlocks: ["walls"],
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

// What each advancement asks of you before it can be researched. Progress counts
// from the moment all its prerequisites are done. Knowledge is still the price.
export const ADVANCEMENT_GOALS: Record<string, Goal[]> = {
  storytelling: [{ label: "Fire burning (s)", kind: "tally", key: "fireLit", amount: 120 }],
  toolmaking: [{ label: "Gather wood", kind: "tally", key: "wood", amount: 30 }],
  firekeeping: [{ label: "Relight a campfire", kind: "tally", key: "relights", amount: 2 }],
  fishing: [{ label: "Send a scouting trip", kind: "tally", key: "scouts", amount: 1 }],
  "early-farming": [{ label: "Have a Gatherer's Camp", kind: "have", building: "gatherer", amount: 1 }],
  spears: [{ label: "Train warriors", kind: "tally", key: "trained", amount: 2 }],
  herbalism: [{ label: "Gather from berry bushes", kind: "berryCamp", amount: 1 }],
  herding: [{ label: "Hunt animals", kind: "tally", key: "hunts", amount: 3 }],
  "hide-clothing": [{ label: "Have Livestock Pens", kind: "have", building: "pen", amount: 2 }],
  agriculture: [
    { label: "Have Farmland", kind: "have", building: "farm", amount: 3 },
    { label: "Grow your tribe", kind: "population", amount: 12 },
    { label: "Store food at once", kind: "stored", resource: "food", amount: 50 },
  ],
  writing: [{ label: "Save up coins", kind: "stored", resource: "currency", amount: 60 }],
  pottery: [{ label: "Lose food to rot", kind: "tally", key: "rotted", amount: 20 }],
  bronze: [{ label: "Quarry stone", kind: "tally", key: "stone", amount: 60 }],
  irrigation: [{ label: "Have Farmland", kind: "have", building: "farm", amount: 5 }],
  forestry: [{ label: "Plant saplings", kind: "tally", key: "planted", amount: 3 }],
  "bronze-arms": [
    { label: "Have a Bronze Smithy", kind: "have", building: "smithy", amount: 1 },
    { label: "Beat a raid", kind: "tally", key: "raidsWon", amount: 1 },
  ],
};

// Elder Ama's guided step right after each advancement. With `build`, the hand
// points you to place one; without, it's an explanation to read.
export const AFTER_STEPS: Record<string, AfterStep> = {
  storytelling: { build: "elder", text: "Now our elders can teach. Build an Elder's Hut: the children will learn from it, and we will gain Knowledge every day." },
  toolmaking: { build: "quarry", text: "Sharp stone tools! Place a Stone Quarry on the hills. Remember: it cuts the hill away for good, and its dust spoils crops nearby." },
  firekeeping: { text: "We know how to bank a fire now: every campfire burns 1.5 times as long (50% longer) before it needs more wood. Less wood cut, less smoke." },
  fishing: { build: "fishing", text: "Rafts! Place a Fishing Spot on the shore, next to the water. Fish near the coast give even more." },
  "early-farming": { build: "farm", text: "We can plant grain. Place Farmland on open grass: it feeds many, but it takes the land from the wild." },
  spears: { upgrade: true, text: "Stone-tipped spears! Our hunters bring back more food. Give a warrior a spear with the Spear button: in a fight, a spearman counts as 1.5 warriors (a warrior without one counts as 1). Every warrior you train from now on gets a spear." },
  herbalism: { build: "healer", text: "We know which plants heal. Build a Healer's Hut: the sick get better faster, and sickness spreads less." },
  herding: { build: "pen", text: "We can keep goats and sheep. Place a Livestock Pen: steady food, but grazing wears down the grass." },
  "hide-clothing": { text: "Warm clothes from hides and wool: each Livestock Pen now keeps 6 people warm without a fire. Fewer fires, less wood, less smoke." },
  agriculture: { text: "We are farmers now. Grow the tribe to 15 people and we can enter the Ancient era. Watch the goal at the top of the screen." },
  writing: { build: "school", text: "Marks on clay that everyone can read! Build a Scribe School: more literacy, and Knowledge every day." },
  pottery: { build: "granary", text: "Jars that keep grain dry. Build a Granary so less of our food rots away." },
  bronze: { build: "smithy", text: "Bronze! Build a Bronze Smithy: better tools for everyone, but it burns wood for charcoal all the time." },
  irrigation: { build: "canal", text: "Place an Irrigation Canal next to your fields: they grow 50% more food, but watered soil slowly turns salty." },
  forestry: { build: "forester", text: "Build a Forester's Lodge near the woods: it tends young trees so the forest grows back faster." },
  "bronze-arms": { build: "walls", text: "Bronze spears and shields: every warrior fights twice as hard. Build Stone Walls to guard the village too." },
};

// Event cards are trade-offs: every choice gains something and costs something.
// `realWorld` links the card to today. Keep those lines modest, with no statistics.
export const EVENTS: EventCard[] = [
  {
    id: "wanderers",
    title: "Wanderers at the fire",
    icon: "person",
    body: "A band of eight hungry wanderers asks to join your tribe. They're strong workers, but they'll eat a lot, and strangers can carry sickness. Turned away, they may not forget it.",
    choices: [
      { label: "Welcome them (+8 people, −25 food, they may bring sickness)", effect: { population: 8, resources: { food: -25 } } },
      {
        label: "Send them away (−12 happiness, raiders come sooner)",
        effect: { happiness: -12, raidSooner: 40 },
      },
    ],
    realWorld: "People have always moved to find food and safety. Newcomers bring new skills and ideas, but large movements of people can also spread disease.",
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
        label: "Let it burn (the forest, buildings and people nearby are lost)",
        effect: { burn: 2, sustainability: -25, happiness: -12 },
      },
    ],
    realWorld: "Wildfires happen naturally, but many are started by people, often by accident. Fires close to homes are the most dangerous.",
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
    realWorld: "Long before the Silk Road, traders carried goods, ideas and inventions across Eurasia.",
  },
  {
    id: "good-hunt",
    title: "A great hunt",
    icon: "mammoth",
    body: "Your hunters brought down a mammoth! There's enough meat for weeks, or for one unforgettable night.",
    choices: [
      { label: "Feast! (+25 happiness)", effect: { happiness: 25 } },
      { label: "Dry and smoke the meat (+60 food)", effect: { resources: { food: 60 } } },
    ],
    realWorld: "Drying and smoking let people store meat for lean times, thousands of years before fridges.",
  },
  {
    id: "sacred-grove",
    title: "The old grove",
    icon: "leaf",
    body: "The elders ask you to protect the ancient grove near the village. Its trees are the oldest and tallest we have, and the woodcutters have their eyes on them.",
    choices: [
      {
        label: "Protect the grove forever (+8 happiness, woodcutters must leave it)",
        effect: { protectForest: 4, happiness: 8 },
      },
      { label: "Cut it down (+40 wood, the grove is gone)", effect: { clearForest: 4, resources: { wood: 40 }, happiness: -4 } },
    ],
    realWorld: "Many cultures have protected sacred groves, and some of them still stand today as islands of old forest.",
  },
  {
    id: "thinning-herds",
    title: "The herds are thinning",
    icon: "meat",
    body: "The hunters are bringing back fewer deer each season. Some want one last big hunt before winter; others say to let the herds recover.",
    choices: [
      { label: "One big hunt (+50 food now, the land suffers)", effect: { resources: { food: 50 }, sustainability: -15 } },
      { label: "Let the herds recover (−15 food: we eat from our stores for now)", effect: { resources: { food: -15 }, sustainability: 8 } },
    ],
    realWorld: "Overhunting has wiped out animals before. Many scientists think people helped drive mammoths and other big Ice Age animals to extinction.",
  },
  {
    id: "floodplain",
    title: "Rich soil by the river",
    icon: "wheat",
    body: "The flat land by the river is dark and rich, perfect for gathering and planting. But the old ones say the river rises in spring.",
    choices: [
      {
        label: "Settle the riverbank (+45 food now, a flood may come)",
        effect: {
          resources: { food: 45 },
          gamble: {
            chance: 0.5,
            resources: { food: -70, wood: -20 },
            happiness: -10,
            message: "The spring flood came. Stores were washed away.",
            safeMessage: "The river stayed in its banks this year.",
          },
        },
      },
      { label: "Stay on higher ground (+10 food, safe)", effect: { resources: { food: 10 } } },
    ],
    realWorld: "Building on flood plains puts homes and fields in harm's way. Today, planners map flood zones before towns grow (SDG 11.5).",
  },
  {
    id: "indoor-fire",
    title: "Fire inside the hut",
    icon: "hut",
    body: "The nights are bitter. Families want to keep fires burning inside their huts, but the smoke has nowhere to go.",
    choices: [
      { label: "Fires indoors (+12 happiness, smoke may make people sick)", effect: { happiness: 12, sickness: 0.6 } },
      { label: "Keep fires outside (−4 happiness, clean air)", effect: { happiness: -4 } },
    ],
    realWorld: "Smoke from cooking and heating fires indoors is still a serious health risk in many homes today, which is why SDG 7 includes clean cooking.",
  },
  {
    id: "burn-scrub",
    title: "Burn the scrub?",
    icon: "flame",
    body: "Thick brush chokes the land near the forest. Setting fire to it would clear it fast and bring fresh growth, if the fire behaves.",
    choices: [
      {
        label: "Burn it (+30 food from new growth, the fire may spread)",
        effect: {
          resources: { food: 30 },
          gamble: {
            chance: 0.4,
            burn: 1,
            happiness: -6,
            message: "The wind turned and the fire spread into the forest.",
            safeMessage: "The burn went well and fresh shoots are coming up.",
          },
        },
      },
      { label: "Clear it by hand (−15 food of work, slow but safe)", effect: { resources: { food: -15 } } },
    ],
    realWorld: "People have used fire to shape the land for thousands of years. Careful burns can help, but fires that get away destroy forests and homes.",
  },
  {
    id: "midden",
    title: "The rubbish heap",
    icon: "skull",
    body: "Bones, scraps and ashes pile up at the edge of the village. It smells, and flies swarm over it.",
    choices: [
      { label: "Bury it far away (−10 food of work, no flies)", effect: { resources: { food: -10 } } },
      { label: "Leave it (sickness may spread)", effect: { sickness: 0.5 } },
    ],
    realWorld: "Archaeologists learn a lot from ancient rubbish heaps called middens. Today, handling waste safely is part of SDG 11.6.",
  },
  {
    id: "charcoal-burners",
    title: "The charcoal burners",
    icon: "hammer",
    body: "The smiths need more charcoal. They want to cut the whole forest on the far hill and burn it slowly in covered pits.",
    era: 1,
    choices: [
      { label: "Let them (+60 wood of charcoal, the hill forest is gone)", effect: { clearForest: 5, resources: { wood: 60 } } },
      { label: "Only dead wood and fallen branches (+15 wood)", effect: { resources: { wood: 15 }, sustainability: 3 } },
    ],
    realWorld: "Making bronze and iron took huge amounts of charcoal, and in some places early metalworking helped clear the forests around it.",
  },
  {
    id: "salty-fields",
    title: "White crust on the fields",
    icon: "wheat",
    body: "A white crust is forming on the oldest watered fields and the grain is coming up thin. The farmers say the canals are to blame.",
    era: 1,
    choices: [
      { label: "Rest the fields for a season (−40 food, the soil recovers)", effect: { resources: { food: -40 }, sustainability: 8 } },
      { label: "Keep watering (+20 food now, the land wears out)", effect: { resources: { food: 20 }, sustainability: -15 } },
    ],
    realWorld: "In ancient Mesopotamia, centuries of irrigation left salt in the soil, and historians think it helped push farmers to hardier crops like barley.",
  },
];

// Each step unlocks the buildings/tools it introduces. Until the tutorial ends
// (or is skipped), anything not yet introduced stays locked.
// What's left over once the tutorial is done. On top of this, a new game starts
// with exactly what each tutorial step buys, handed over step by step (see
// tutorialBudget and advanceTutorial), so nobody waits and nothing piles up.
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
// Sparks: each tick, a lit campfire may spark onto a neighbouring tile. Grass is
// scorched; a wooden house burns down. Chance per neighbouring grass tile and
// per neighbouring wooden house; Firekeeping halves it.
export const SPARKS = { perGrass: 0.0001, perHouse: 0.0015, firekeeping: 0.5 };

// With no lit fire nothing can be cooked: raw food fills people less, so they
// eat this much more.
export const RAW_FOOD = 1.3;

// Real seconds per game tick at 1× speed. Everything in the engine counts in
// ticks; the UI converts to seconds with this. Raising it slows the whole game.
export const TICK_SECONDS = 1.5;

// A campfire burns this many ticks on one load of wood, then goes out until
// the player clicks it to relight it (costs RELIGHT_WOOD). Firekeeping: ×1.5.
export const CAMPFIRE_BURN_TICKS = 60;
export const RELIGHT_WOOD = 1;

// Disease. Before Herbalism the tribe calls it a curse from the gods; after it,
// Healer's Huts slow it down. All chances are per second unless noted.
export const DISEASE = {
  // An outbreak starting on its own: per person, more when people are crowded.
  perPerson: 0.00012,
  crowding: 2,
  // Each hunt (per animal brought back) and each fishing spot.
  hunt: 0.02,
  fishing: 0.0006,
  // Welcomed wanderers bring it with them this often (per event).
  wanderers: 0.4,
  // Each sick person infects this many healthy people per second (× healthy share).
  spread: 0.09,
  // Share of the sick who get better, or die, each second.
  recover: 0.045,
  death: 0.015,
  // People who got better can't catch it again for a while (share lost per second).
  immunityFades: 0.004,
  // Each Healer's Hut: extra recovery, and cuts to spread and deaths (up to 75%).
  healerRecover: 0.03,
  healerCut: 0.25,
};

// Pressure that grows with the tribe, so developing is as hard as surviving.
export const GROWTH_PRESSURE = {
  // No way to preserve food yet: stored food above this rots away (share per second).
  foodKeeps: 100,
  foodRots: 0.015,
  // Each lit campfire warms this many people; the rest are cold.
  peoplePerFire: 10,
  // With Warm Clothes, each Livestock Pen clothes this many people warmly.
  peoplePerPen: 6,
  // Raiders come in bigger groups the bigger (richer) the tribe: +1 per this many people.
  raidersPerPeople: 10,
};

// Selective logging only takes trees above this growth and never cuts below it,
// for half the wood. Planting costs food (people's work).
export const SELECTIVE_FLOOR = 0.5;
export const PLANT_COST = { food: 4 };

// Elder Ama's lessons: each appears once, when its moment comes in play (see
// lessonDue in engine.ts), and links what just happened to a real UN target.
// Keep claims modest and general; no statistics.
// Elder Ama's goodbye when the tutorial is finished (shown like a lesson, not counted as one).
export const TUTORIAL_FAREWELL = {
  id: "farewell",
  title: "You are ready, chief",
  text: "You have warmth, wood, homes, food, guards and fields. From here the choices are yours. Raiders, sickness and hard years will come, so keep food stored and fires lit. And watch the forest: once it is gone, it takes a lifetime to return. I will speak up when I see something you should know.",
  sdg: "SDG 11: make cities and communities inclusive, safe, resilient and sustainable",
};

export const LESSONS: { id: string; title: string; text: string; sdg: string }[] = [
  {
    id: "forest",
    title: "The forest is shrinking",
    text: "Our woodcutters take trees faster than the forest can grow back. A tree takes years to grow and a moment to cut. Selective logging and planting saplings let us have wood without losing the forest.",
    sdg: "SDG 15.2: stop deforestation and restore forests",
  },
  {
    id: "rain",
    title: "The rains are failing",
    text: "Our fields are thirsty. Forests hold water in the ground and give it back to the air, and the rain comes back down on our land. With so much forest cut for wood and fields, the rains are weaker and our harvests smaller. Planting trees brings the rain back.",
    sdg: "SDG 15.3: restore degraded land, including land hit by drought",
  },
  {
    id: "overhunting",
    title: "Too many hunters",
    text: "Our camps take berries, roots and animals from the wild. With so many camps, we hunt the deer and boar faster than they can have young, so each year there are fewer left. Fewer animals means less food for us too. Fewer camps let the wild keep up.",
    sdg: "SDG 12.2: use natural resources sustainably and efficiently",
  },
  {
    id: "wildlife",
    title: "Where did the deer go?",
    text: "Deer and boar live in the old forest. As the trees disappear, so do the animals we hunt. Protecting their home protects our food too.",
    sdg: "SDG 15.5: protect habitats and the living things in them",
  },
  {
    id: "smoke",
    title: "Smoke over the village",
    text: "More fires keep more people warm, but they burn more wood and fill the air with smoke. Breathing smoke from open fires harms people's lungs, and it still does today for families who cook over open fires.",
    sdg: "SDG 7.1: clean, modern energy for everyone",
  },
  {
    id: "rot",
    title: "Food going to waste",
    text: "We have gathered more than we can keep, and it is rotting. Taking only what we need leaves more for later, and none of our work is wasted.",
    sdg: "SDG 12.3: cut food waste in half",
  },
  {
    id: "crowding",
    title: "Sickness in crowded huts",
    text: "When many people live packed together, sickness spreads fast. Enough shelter for everyone, and people who know how to care for the sick, keep a village healthy.",
    sdg: "SDG 11.1: safe, decent housing for all",
  },
  {
    id: "growth",
    title: "A growing village",
    text: "Every new hut means more mouths to feed, more fires to keep and more trees to cut. A village that grows faster than its food and forests cannot last. Plan the growth.",
    sdg: "SDG 11.3: plan towns and cities that can last",
  },
  {
    id: "exhausted",
    title: "The land is tired",
    text: "We have pushed the land too hard for too long. The forest has stopped coming back and the harvests are shrinking. Land needs rest to recover.",
    sdg: "SDG 15.3: restore damaged land and soil",
  },
  {
    id: "clothes",
    title: "Warm without burning",
    text: "Warm clothes keep people warm without burning a single log. Needing less fire means cutting fewer trees and breathing less smoke.",
    sdg: "SDG 7.3: use energy more efficiently",
  },
  {
    id: "grazing",
    title: "Too many mouths on the grass",
    text: "Our herds are growing, and the grass around the pens is being eaten down to the dirt. Too many animals on too little land can wear it out.",
    sdg: "SDG 15.3: restore damaged land and soil",
  },
  {
    id: "charcoal",
    title: "Bronze needs fire, fire needs trees",
    text: "Every bronze tool was paid for in charcoal, and charcoal is made from whole trees. Better tools make every worker richer, but the smithy eats the forest.",
    sdg: "SDG 12.2: use natural resources wisely",
  },
  {
    id: "salt",
    title: "Salt in the fields",
    text: "Water from the canals makes the fields rich, but as it dries it leaves a little salt behind. Year after year, the soil can turn too salty to grow anything.",
    sdg: "SDG 15.3: restore damaged land and soil",
  },
  {
    id: "stewardship",
    title: "Tending the forest",
    text: "Our foresters plant as the woodcutters cut. A forest looked after like a field can give wood for ever.",
    sdg: "SDG 15.2: manage forests so they last",
  },
  {
    id: "writing",
    title: "Words that outlive us",
    text: "Now that our children can write, what the elders know is no longer lost when they die. Every generation starts where the last one stopped.",
    sdg: "SDG 4.6: everyone learns to read and write",
  },
  {
    id: "restore",
    title: "Planting for the future",
    text: "These saplings won't give us wood for a long time, but our grandchildren will walk in a forest because of them.",
    sdg: "SDG 15.2: restore forests",
  },
];

// Ticks between two lessons, so they never pile up.
export const LESSON_GAP = 40;
// Big moments (an event card, a raid, an elder lesson, an outbreak out of
// nowhere) never start within this many ticks of each other: one at a time.
export const QUIET_GAP = 40;

// Leaving the Stone Age: research Agriculture and grow to this many people.
export const NEXT_ERA_POPULATION = 15;

// The best ending needs the land to still be healthy: growth can't just ignore
// the damage it does. Used for every debrief's ending tier.
export const MIN_SUSTAINABILITY_FOR_BEST_ENDING = 60;

// Each meter's real-world target, shown on the debrief.
export const METER_SDG: Record<MeterKey, string> = {
  food: "SDG 2.1: enough safe, nutritious food for everyone",
  shelter: "SDG 11.1: safe, decent housing for all",
  happiness: "SDG 3.4: mental health and well-being",
  literacy: "SDG 4.6: everyone learns to read and count",
  energy: "SDG 7.1: modern energy for everyone",
  sustainability: "SDG 15.2: halt deforestation and restore forests",
};

// Ancient-era numbers. Smithies burn this much wood per tick for charcoal;
// granaries keep this much more food from rotting; foresters add this much
// growth to one thinned forest tile within reach every 3 ticks; walls add defense.
export const SMITHY_CHARCOAL = 0.35;
// Knowledge comes from milestones: every "first" teaches the tribe something.
// (Elder's Huts, schools and literacy add a steady amount on top.)
export const KNOWLEDGE_MILESTONES = {
  firstBuilding: 2,
  population: [10, 15, 20, 30, 50],
  populationReward: 5,
  firstRaidWon: 6,
  firstPlanted: 4,
};

// The first `trips` scouting trips teach the tribe: +2 Knowledge if a trip maps
// at least `bigTrip` new land tiles, +1 otherwise. Later trips teach nothing new.
// Teaching buildings: the first of each kind teaches fully; every extra one
// adds only `extra` of its Knowledge (there are only so many elders to teach).
export const TEACHING = { extra: 0.5, buildings: ["elder", "school"] };
// The secret found by building 2 Elder's Huts.
export const CAVE_PAINTINGS_KNOWLEDGE = 8;
export const SCOUT_KNOWLEDGE = { bigTrip: 20, trips: 5 };

// Gatherers live off the wild, and the wild only has so much. The first camp
// makes full food; each extra camp adds only `extraCamp` of a camp's food. Every
// camp past `freeCamps` also hunts animals faster than they can breed.
export const GATHERING = { extraCamp: 0.25, freeCamps: 2, sustainPerExtra: 2 };
// Smoke, noise and people around a lit campfire scare off the animals: a
// gatherer camp within `range` hexes of one makes `foodLoss` less food.
export const FIRE_SCARE = { range: 1, foodLoss: 0.3 };
// A quarry cuts its hill down, a little every tick (fully cut after about
// 1 / perTick ticks). A cut hill sinks by up to `depth` of its height and never
// grows back. Sustainability: −perQuarry for each working quarry, and up to
// −perHill for each hillside cut away (this stays after the quarry is sold).
export const QUARRY_CUT = { perTick: 1 / 600, depth: 0.45, perQuarry: 1, perHill: 3 };
// Fields need open land: placing Farmland clears the nearest forest tile within
// `clearRange`. And forests bring rain: rainfall runs from `minRain` (no forest
// left) to 1 (all of it standing), and every field grows that share.
export const FARM_RAIN = { clearRange: 2, minRain: 0.5, warnBelow: 0.8 };
// Quarry dust settles on the land around it: food buildings within `range`
// hexes make `foodLoss` less food.
export const QUARRY_DUST = { range: 2, foodLoss: 0.4, hits: ["gatherer", "farm", "pen"] };
export const GRANARY_KEEPS = 150;
export const FORESTER_GROWTH = 0.12;
export const FORESTER_REACH = 3;
export const WALL_DEFENSE = 4;

// The Ancient era ends with a Roman legion. Scouts see it coming when the year
// reaches warningYear; it lands warningTicks later. Each legionary fights like
// two of your warriors. Size: (base + population / perPeople) × difficulty.
export const ROMAN_LEGION = { warningYear: -1600, warningTicks: 90, strengthEach: 2, base: 6, perPeople: 5 };

// Buying something that leaves less wood than this shows a "save up" warning.
export const LOW_WOOD_AFTER_BUY = 10;

// After the tutorial, how long (ticks) before the first event, the first raid,
// and the first disease that isn't the player's own choice. The early game is calm.
export const GRACE_AFTER_TUTORIAL = { event: 150, raid: 300, disease: 300 };

export const AFTER_TUTORIAL_RESERVE: Partial<Resources> = { food: 40, wood: 10 };
// Of that reserve, this much food is in the stores from the very start (so the
// food count isn't an alarming 0 during the tutorial); the rest comes at the end.
export const TUTORIAL_START_FOOD = 20;

// `buys` lists what the step pays for: building ids, "scout", "train" or an
// advancement id. The starting resources are worked out from it.
export const TUTORIAL: { text: string; done: string; unlocks: string[]; buys: string[] }[] = [
  { text: "Welcome, chief. Our people are cold and tired after the long walk. First, warmth: pick the Campfire below and place it on open grass. Look at what it gives us, and what it costs.", done: "campfire", unlocks: ["campfire"], buys: ["campfire"] },
  { text: "Feel that warmth! But a fire eats wood, and so will everything we build. Put a Woodcutter in the forest. See the little tree stumps in the corner of each building below? They show how hard it is on the land: the more stumps, the more harm. A leaf means it is gentle. The Woodcutter has three, because every tree it cuts takes many years to grow back.", done: "woodcutter", unlocks: ["woodcutter"], buys: ["woodcutter"] },
  { text: "Wood is coming in. Now our people need a roof. Build a Wooden House, and more families can join us. Not right beside the fire, though: sparks can set wood alight. Leave a patch of ground between them.", done: "hut", unlocks: ["hut"], buys: ["hut"] },
  { text: "A roof over our heads, but empty bellies. Place a Gatherer's Camp to collect wild food. Berry bushes give more.", done: "gatherer", unlocks: ["gatherer"], buys: ["gatherer"] },
  { text: "Food is coming. But we don't know what lies beyond these hills. Press Scout and send our young ones to look.", done: "scout", unlocks: ["scout"], buys: ["scout"] },
  { text: "The scouts saw smoke from other camps, and not everyone out there is friendly. Build a War Camp, then train our first warrior.", done: "train", unlocks: ["warcamp", "train"], buys: ["warcamp", "train"] },
  { text: "With a guard at the camp, we can think about tomorrow. Every first thing we do teaches us something: the first fire, the first hut, the first time our tribe grows. That learning is Knowledge, the bulb at the top, and one day an Elder's Hut will help the children learn faster. Now, I have noticed wild grain sprouting wherever seeds fall. What if we planted them ourselves? Open Advancements and spend our Knowledge on Early Farming.", done: "early-farming", unlocks: ["advancements"], buys: ["early-farming"] },
  { text: "Now we know how to plant. Place Farmland on open grass. Fields feed many, but they take the land from the wild, and the forest beside them. Fewer trees, less rain. Everything has a price, chief. Choosing which to pay is up to you.", done: "farm", unlocks: ["farm"], buys: ["farm"] },
];
