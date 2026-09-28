import type {
  Branch,
  BuildingDef,
  CultureId,
  DifficultyId,
  EventCard,
  MeterKey,
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

export const METERS: { key: MeterKey; label: string; icon: string; side: "left" | "right" }[] = [
  { key: "food", label: "Food & Water", icon: "🍖", side: "left" },
  { key: "shelter", label: "Shelter & Health", icon: "🛖", side: "left" },
  { key: "happiness", label: "Happiness", icon: "😊", side: "left" },
  { key: "literacy", label: "Literacy", icon: "📜", side: "right" },
  { key: "energy", label: "Energy", icon: "🔥", side: "right" },
  { key: "sustainability", label: "Sustainability", icon: "🌿", side: "right" },
];

export const CULTURES: Record<
  CultureId,
  { name: string; icon: string; blurb: string }
> = {
  balanced: { name: "Balanced", icon: "⚖️", blurb: "No bonuses. The pure game." },
  traders: { name: "Traders", icon: "🐫", blurb: "+50% currency. Caravans move faster (later eras)." },
  builders: { name: "Builders", icon: "🧱", blurb: "Buildings cost 20% less." },
  scholars: { name: "Scholars", icon: "📚", blurb: "+50% knowledge." },
  warriors: { name: "Warriors", icon: "🛡️", blurb: "Stronger, cheaper armies (later eras)." },
  farmers: { name: "Farmers", icon: "🌾", blurb: "+25% food, faster population growth." },
  mariners: { name: "Mariners", icon: "⛵", blurb: "+50% fishing, scouts see further." },
};

export const DIFFICULTIES: Record<
  DifficultyId,
  { name: string; blurb: string; consumption: number; famineLimit: number }
> = {
  easy: { name: "Easy", blurb: "Forgiving. Famine takes a long time to hit.", consumption: 0.8, famineLimit: 45 },
  normal: { name: "Normal", blurb: "The intended experience.", consumption: 1, famineLimit: 30 },
  hard: { name: "Hard", blurb: "Hungry people, short patience.", consumption: 1.25, famineLimit: 18 },
};

export const BUILDINGS: BuildingDef[] = [
  {
    id: "campfire",
    name: "Campfire",
    icon: "🔥",
    description: "Warmth, light and cooked food. Burns a little wood.",
    era: 0,
    cost: { wood: 5 },
    terrain: ["grass", "forest", "beach", "hills"],
    reveal: 3,
  },
  {
    id: "hut",
    name: "Hut",
    icon: "🛖",
    description: "Shelter for 6 people.",
    era: 0,
    cost: { wood: 10 },
    terrain: ["grass", "beach", "hills"],
    housing: 6,
    reveal: 2,
  },
  {
    id: "gatherer",
    name: "Gatherer's Camp",
    icon: "🧺",
    description: "Collects food. Bonus on berry bushes.",
    era: 0,
    cost: { wood: 8 },
    terrain: ["grass", "forest"],
    produces: { food: 1.2 },
    depositBonus: { deposit: "berries", amount: { food: 1.2 } },
    reveal: 2,
  },
  {
    id: "woodcutter",
    name: "Woodcutter",
    icon: "🪓",
    description: "Chops wood from forests. Hurts sustainability a little.",
    era: 0,
    cost: { wood: 4 },
    terrain: ["forest"],
    produces: { wood: 1 },
    reveal: 2,
  },
  {
    id: "fishing",
    name: "Fishing Spot",
    icon: "🎣",
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
    icon: "🪨",
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
    icon: "🪶",
    description: "Stories and cave paintings pass knowledge on to children.",
    era: 0,
    cost: { wood: 10, stone: 10 },
    terrain: ["grass"],
    requires: "storytelling",
    produces: { knowledge: 0.3 },
    reveal: 2,
  },
  {
    id: "healer",
    name: "Healer's Hut",
    icon: "🌿",
    description: "Herbs and care keep people healthy.",
    era: 0,
    cost: { wood: 10, stone: 5 },
    terrain: ["grass", "forest"],
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
    id: "spears",
    name: "Hunting Spears",
    description: "Better hunting and defense. +15% food.",
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
    requires: ["storytelling", "toolmaking"],
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
    icon: "🚶",
    body: "A small band of wanderers asks to join your tribe. They're hungry, but strong.",
    choices: [
      { label: "Welcome them (+4 people, −8 food)", effect: { population: 4, resources: { food: -8 } } },
      { label: "Send them on their way", effect: { happiness: -5 } },
    ],
  },
  {
    id: "wildfire",
    title: "Wildfire!",
    icon: "🔥",
    body: "Dry grass has caught fire near the forest.",
    choices: [
      { label: "Fight it (−10 wood)", effect: { resources: { wood: -10 } } },
      { label: "Let it burn out", effect: { sustainability: -15 } },
    ],
  },
  {
    id: "eastern-trader",
    title: "A trader from the east",
    icon: "🐫",
    body: "A stranger with a pack animal offers shiny shells for your wood.",
    choices: [
      { label: "Trade 10 wood for 15 shells", effect: { resources: { wood: -10, currency: 15 } } },
      { label: "No thanks", effect: {} },
    ],
  },
  {
    id: "good-hunt",
    title: "A great hunt",
    icon: "🦣",
    body: "Your hunters brought down a mammoth. Feast or preserve?",
    choices: [
      { label: "Feast! (+10 happiness)", effect: { happiness: 10 } },
      { label: "Preserve it (+20 food)", effect: { resources: { food: 20 } } },
    ],
  },
];

export const TUTORIAL = [
  { text: "Our people are cold. Pick the Campfire from the bar below and place it on a green tile.", done: "campfire" },
  { text: "Good! Now build a Hut so more people have shelter.", done: "hut" },
  { text: "We need food. Place a Gatherer's Camp. Berry bushes give a bonus.", done: "gatherer" },
  { text: "Fires need wood. Put a Woodcutter on a forest tile.", done: "woodcutter" },
  { text: "The world is hidden. Press Scout to explore new land.", done: "scout" },
  { text: "Open Advancements (🌳) and research Toolmaking.", done: "toolmaking" },
];
