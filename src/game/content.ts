import type { IconId } from "./sprites";
import type {
  AfterStep,
  Goal,
  Branch,
  BuildingDef,
  CultureId,
  DifficultyId,
  DisasterKind,
  EventCard,
  KingdomId,
  LandmarkId,
  MeterKey,
  RaidKind,
  Resources,
  TreeNode,
} from "./types";

export const ERAS = [
  // Stone Age: yearsPerTick is not used; its calendar follows ERA_DEADLINE (stoneAgeYear()).
  { name: "Stone Age", startYear: -50000, yearsPerTick: 100, currency: "Shells" },
  { name: "Ancient", startYear: -3000, yearsPerTick: 3, currency: "Bronze coins" },
  // Classical: a year a tick, so the great drought (DROUGHT.warnYear) comes about 15 minutes in.
  { name: "Classical", startYear: -500, yearsPerTick: 1, currency: "Silver coins" },
  // Medieval: 0.6 years a tick, so the Black Death (PLAGUE.arriveYear) arrives about 14.5 minutes in.
  { name: "Medieval & Renaissance", startYear: 1000, yearsPerTick: 0.6, currency: "Florins" },
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
  // For a first game: see GENTLE for the slower start.
  first: {
    name: "First time",
    blurb: "Slower and gentler while you learn, then normal pace.",
    consumption: 0.75,
    famineLimit: 150,
    unrestLimit: 90,
    raiders: 0.5,
  },
  easy: { name: "Easy", blurb: "Forgiving. Famine takes a long time to hit.", consumption: 0.8, famineLimit: 120, unrestLimit: 60, raiders: 0.7 },
  normal: { name: "Normal", blurb: "The intended experience.", consumption: 1, famineLimit: 80, unrestLimit: 40, raiders: 1 },
  hard: { name: "Hard", blurb: "Hungry people, short patience, bold raiders. Buildings wear out and need repairs.", consumption: 1.25, famineLimit: 55, unrestLimit: 25, raiders: 1.4 },
};

export const WARRIORS_PER_CAMP = 6;
export const TRAIN_COST = { food: 8, wood: 4 };
// After Hunting Spears: give a warrior a spear. Spearmen fight 1.5x as hard.
export const SPEAR_COST = { wood: 4 };
export const SPEARMAN_STRENGTH = 1.5;

// The landmark that takes a town into the Medieval era: chosen after the great
// drought, built in three stages (each paid for, then `stageTicks` of work).
// The first stage's cost is also the building's cost. Its lasting bonus only
// counts once all three stages are done.
export const LANDMARKS: Record<LandmarkId, { name: string; icon: IconId; bonus: string; stages: Partial<Resources>[] }> = {
  library: {
    name: "Great Library",
    icon: "book",
    bonus: "+Knowledge every day, +20 literacy, and every advancement costs 10% less.",
    stages: [
      { stone: 30, wood: 20, currency: 60 },
      { stone: 40, currency: 90 },
      { stone: 40, wood: 20, currency: 120 },
    ],
  },
  cathedral: {
    name: "Cathedral",
    icon: "church",
    bonus: "+12 happiness, pilgrims bring coins, and the sick are cared for (they get better faster).",
    stages: [
      { stone: 50, wood: 30 },
      { stone: 70, wood: 20, currency: 40 },
      { stone: 80, currency: 80 },
    ],
  },
  harbour: {
    name: "Grand Harbour",
    icon: "anchor",
    bonus: "Coins from sea trade, fishing +25%, and ships cost half and sail faster. More ships also means more sickness from overseas.",
    stages: [
      { wood: 50, stone: 20 },
      { wood: 40, stone: 40, currency: 50 },
      { stone: 50, currency: 90 },
    ],
  },
};
export const LANDMARK = { stageTicks: 60, libraryKnowledge: 0.3, libraryLiteracy: 20, libraryDiscount: 0.9, cathedralMood: 12, cathedralCoins: 0.3, cathedralRecover: 0.03, harbourCoins: 0.6, harbourFish: 1.25 };

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
  },
  {
    id: "gatherer",
    overseas: true,
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
  },
  {
    id: "farm",
    overseas: true,
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
  },
  {
    id: "warcamp",
    name: "War Camp",
    icon: "shield",
    description: "Trains warriors to fight off raiders. Each camp holds 6 warriors; build more camps for a bigger army.",
    gain: "Warriors to hold off raiders",
    landCost: "Warriors eat food and don't gather any",
    landImpact: 0,
    era: 0,
    cost: { wood: 15, food: 10 },
    terrain: ["grass", "steppe", "hills", "beach"],
  },
  {
    id: "watchfire",
    name: "Watch Fire",
    icon: "beacon",
    description: "A fire kept burning on the shore. Raiders are seen sooner, and the lookouts add a little defense.",
    gain: "Raiders seen 12 s sooner, +1 defense (up to 2 watch fires)",
    landCost: "Burns wood day and night, and adds smoke",
    landImpact: 1,
    era: 0,
    cost: { wood: 12 },
    // On the beach, where the lookouts can see boats coming.
    terrain: ["beach"],
    needsWaterNeighbor: true,
    requires: "firekeeping",
    produces: { wood: -0.03 },
  },
  {
    id: "woodcutter",
    overseas: true,
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
  },
  {
    id: "fishing",
    overseas: true,
    name: "Fishing Spot",
    icon: "fish",
    description: "Food from the sea or the river. On a beach, or on the river bank; bonus near fish.",
    gain: "Food from the sea or the river",
    landCost: "A small chance of sickness from the catch",
    landImpact: 0,
    era: 0,
    cost: { wood: 10 },
    terrain: ["beach"],
    riverTerrain: ["grass", "steppe", "marsh", "forest"],
    needsWaterNeighbor: true,
    requires: "fishing",
    produces: { food: 0.7 },
  },
  {
    id: "dock",
    name: "Canoe Dock",
    icon: "boat",
    description: "A jetty where canoes are hollowed out of tree trunks. Each dock keeps one canoe.",
    gain: "A canoe: find the Southern Isles and build there, or fish the open sea",
    landCost: "Every canoe is cut from one big old tree",
    landImpact: 1,
    era: 0,
    cost: { wood: 20 },
    // On the sea shore, like a Fishing Spot (not by the river).
    terrain: ["beach"],
    needsWaterNeighbor: true,
    requires: "fishing",
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
  },
  {
    id: "pen",
    overseas: true,
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
  },
  // ---- Classical era -------------------------------------------------------
  {
    id: "well",
    name: "Well",
    icon: "well",
    description: "A deep shaft down to the water under the ground. Clean water close to home, even when the rain fails.",
    gain: "Clean water for 12 people, even in a drought",
    landCost: "Draws down the water under the ground: past 4 wells the land around them dries out",
    landImpact: 1,
    era: 2,
    cost: { stone: 8, wood: 6 },
    terrain: ["grass", "steppe"],
    requires: "hydraulics",
  },
  {
    id: "aqueduct",
    name: "Aqueduct",
    icon: "aqueduct",
    description: "Stone arches that carry river water into town and out to the fields. Must touch the river.",
    gain: "Water for 40 people; fields within 3 tiles grow 20% more, and keep most of their harvest in a drought",
    landCost: "Takes water from the river: fish and marshes downstream suffer",
    landImpact: 2,
    era: 2,
    cost: { stone: 30, wood: 10, currency: 30 },
    terrain: ["grass", "steppe", "hills"],
    needsRiver: true,
    requires: "concrete",
  },
  {
    id: "watermill",
    name: "Watermill",
    icon: "mill",
    description: "The river turns a wheel that grinds the grain. Must touch the river.",
    gain: "Fields within 2 tiles give 25% more food",
    landCost: "Its dam blocks the river: fish can't swim upstream",
    landImpact: 1,
    era: 2,
    cost: { wood: 20, stone: 10 },
    terrain: ["grass", "steppe", "forest"],
    needsRiver: true,
    requires: "watermill",
  },
  {
    id: "townhouse",
    name: "Town House",
    icon: "insula",
    description: "Tall stone houses on straight streets. Built by upgrading a Mud-brick House (click it), or new.",
    gain: "Room for 24 people on one tile, kept warm by shared walls and hearths (no campfire needed)",
    landCost: "Packed towns spread sickness fast unless there are latrines",
    landImpact: 0,
    era: 2,
    cost: { stone: 20, wood: 12, currency: 10 },
    terrain: ["grass", "steppe"],
    requires: "planning",
    housing: 24,
  },
  {
    id: "latrine",
    name: "Public Latrines",
    icon: "drop",
    description: "Stone seats over running water, and drains that carry the waste away from the streets.",
    gain: "Clean streets for 25 people: sickness spreads much less in town",
    landCost: "The waste still ends up in the river or the sea",
    landImpact: 1,
    era: 2,
    cost: { stone: 10, wood: 6 },
    terrain: ["grass", "steppe", "beach"],
    requires: "sanitation",
  },
  {
    id: "baths",
    name: "Bathhouse",
    icon: "baths",
    description: "Warm pools where the whole town comes to wash, talk and rest.",
    gain: "+8 happiness, and the sick get better faster",
    landCost: "Heats its water with wood fires all day",
    landImpact: 2,
    era: 2,
    cost: { stone: 25, wood: 10, currency: 20 },
    terrain: ["grass", "steppe"],
    requires: "sanitation",
    produces: { wood: -0.2 },
  },
  {
    id: "market",
    name: "Market",
    icon: "market",
    description: "Stalls and carts in the town square. Traders pay in silver, and caravans leave from here.",
    gain: "Coins from trade; caravans to the Silk Steppe (after Silk Road Contact)",
    landCost: "Traders from far away can bring sickness with them",
    landImpact: 0,
    era: 2,
    cost: { wood: 15, stone: 10 },
    terrain: ["grass", "steppe", "beach"],
    requires: "wheel",
    produces: { currency: 0.4 },
  },
  {
    id: "academy",
    name: "Academy",
    icon: "column",
    description: "A shady courtyard where teachers and students argue about everything.",
    gain: "Knowledge and literacy",
    landCost: "Nothing from the land",
    landImpact: 0,
    era: 2,
    cost: { stone: 25, currency: 30 },
    terrain: ["grass", "steppe", "hills"],
    requires: "philosophy",
    produces: { knowledge: 0.15 },
  },
  // ---- Landmarks (one chosen after the drought; the others in the Medieval era)
  {
    id: "library",
    name: "Great Library",
    icon: "book",
    description: "Halls of scrolls and books copied by hand, open to scholars from every land. Built in three stages.",
    gain: "When finished: Knowledge every day, +20 literacy, advancements cost 10% less",
    landCost: "Nothing from the land, but a great deal of stone and silver",
    landImpact: 0,
    era: 2,
    cost: LANDMARKS.library.stages[0],
    terrain: ["grass", "steppe", "hills"],
    landmark: true,
    unique: true,
    produces: { knowledge: LANDMARK.libraryKnowledge },
  },
  {
    id: "cathedral",
    name: "Cathedral",
    icon: "church",
    description: "A great church of stone and coloured glass that takes a whole town to build. Built in three stages.",
    gain: "When finished: +12 happiness, coins from pilgrims, the sick get better faster",
    landCost: "A hillside of stone is cut away for it",
    landImpact: 1,
    era: 2,
    cost: LANDMARKS.cathedral.stages[0],
    terrain: ["grass", "steppe", "hills"],
    landmark: true,
    unique: true,
    produces: { currency: LANDMARK.cathedralCoins },
  },
  {
    id: "harbour",
    name: "Grand Harbour",
    icon: "anchor",
    description: "Stone piers, warehouses and a lighthouse, where ships from every coast tie up. Built in three stages.",
    gain: "When finished: coins from sea trade, fishing +25%, ships cost half and sail faster",
    landCost: "Ships from far away bring sickness with them",
    landImpact: 1,
    era: 2,
    cost: LANDMARKS.harbour.stages[0],
    terrain: ["beach", "grass", "steppe"],
    needsWaterNeighbor: true,
    landmark: true,
    unique: true,
    produces: { currency: LANDMARK.harbourCoins },
  },
  // ---- Medieval era -------------------------------------------------------
  {
    id: "castle",
    name: "Castle",
    icon: "castle",
    description: "A stone keep and high walls on strong ground, where the knights live.",
    gain: "+15 defense and room for 10 more warriors",
    landCost: "Takes a hillside of stone, and the Eastern Reach sees it as a threat",
    landImpact: 1,
    era: 3,
    cost: { stone: 60, wood: 20, currency: 40 },
    terrain: ["hills", "grass", "steppe"],
    requires: "castles",
  },
  {
    id: "windmill",
    name: "Windmill",
    icon: "windmill",
    description: "Sails that catch the wind and turn the millstones. No river needed.",
    gain: "Fields within 2 tiles give 20% more, and +10 energy",
    landCost: "Nothing from the land: the wind is free",
    landImpact: 0,
    era: 3,
    cost: { wood: 25, stone: 10 },
    terrain: ["grass", "steppe", "hills"],
    requires: "windmills",
  },
  {
    id: "guildhall",
    name: "Guild Hall",
    icon: "scales",
    description: "Where the masters of each craft meet, train apprentices and set the prices.",
    gain: "Coins, and every Guild Hall makes the smithies' tools 10% better",
    landCost: "Nothing from the land, but the guilds keep newcomers out (−3 happiness each)",
    landImpact: 0,
    era: 3,
    cost: { wood: 20, stone: 25, currency: 40 },
    terrain: ["grass", "steppe"],
    requires: "guilds",
    produces: { currency: 0.5 },
  },
  {
    id: "university",
    name: "University",
    icon: "scroll",
    description: "Masters and students from many lands, reading, copying and arguing.",
    gain: "Knowledge and +20 literacy",
    landCost: "Nothing from the land",
    landImpact: 0,
    era: 3,
    cost: { stone: 40, currency: 60 },
    terrain: ["grass", "steppe", "hills"],
    requires: "universities",
    produces: { knowledge: 0.25 },
  },
  {
    id: "shipyard",
    name: "Shipyard",
    icon: "boat",
    description: "Slipways where ocean-going ships are built from the tallest oaks.",
    gain: "Send ships to find islands overseas, meet the kingdoms and trade",
    landCost: "Every ship is built from old trees",
    landImpact: 1,
    era: 3,
    cost: { wood: 40, stone: 10 },
    terrain: ["beach", "grass", "steppe"],
    needsWaterNeighbor: true,
    requires: "navigation",
  },
  {
    id: "tradingpost",
    name: "Trading Post",
    icon: "coin",
    description: "A wooden store and a jetty on a far island. Only on an island your ships have found.",
    gain: "Coins from trade overseas",
    landCost: "Ships carry sickness home as well as goods",
    landImpact: 0,
    era: 3,
    cost: { wood: 20, currency: 20 },
    terrain: ["beach", "grass", "steppe"],
    requires: "navigation",
    overseas: true,
    produces: { currency: 0.5 },
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
  ["electricity", "Electricity", "knowledge", 4, 0, ["universities"], "Power lines and light bulbs."],
  ["steel", "Steel Frames", "construction", 4, 0, ["castles"], "Skyscrapers and bridges."],
  ["steam", "Steam & Coal", "energy", 4, 0, ["windmills"], "Factories boom. So does pollution."],
  ["railways", "Railways", "transport", 4, 0, ["navigation"], "Trains link the whole island."],
  ["tanks", "Mechanized Armies", "military", 4, 0, ["knights"], "Tanks, planes and radar."],
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
    unlocks: ["watchfire"],
  },
  {
    id: "fishing",
    name: "Rafts & Fishing",
    description: "Food from the sea. Unlocks the Fishing Spot.",
    branch: "transport",
    era: 0,
    cost: 8,
    requires: ["fire"],
    unlocks: ["fishing", "dock"],
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
    cost: 30,
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
    id: "coinage",
    name: "Coinage",
    description: "Stamped silver coins replace barter. With the Roman legion beaten and 40 people, your people can enter the Classical era.",
    branch: "culture",
    era: 1,
    cost: 60,
    requires: ["writing"],
  },
  // ---- Classical era -------------------------------------------------------
  {
    id: "hydraulics",
    name: "Water Engineering",
    description: "Dig down to the water under the ground. Unlocks the Well.",
    branch: "energy",
    era: 2,
    cost: 20,
    requires: ["irrigation"],
    unlocks: ["well"],
  },
  {
    id: "watermill",
    name: "Watermills",
    description: "The river turns the millstones. Unlocks the Watermill.",
    branch: "energy",
    era: 2,
    cost: 30,
    requires: ["hydraulics"],
    unlocks: ["watermill"],
  },
  {
    id: "concrete",
    name: "Roman Concrete",
    description: "Lime and ash that sets hard, even under water. Unlocks the Aqueduct.",
    branch: "construction",
    era: 2,
    cost: 30,
    requires: ["hydraulics", "bronze"],
    unlocks: ["aqueduct"],
  },
  {
    id: "planning",
    name: "Town Planning",
    description: "Straight streets and tall houses. Unlocks the Town House.",
    branch: "construction",
    era: 2,
    cost: 25,
    requires: ["coinage"],
    unlocks: ["townhouse"],
  },
  {
    id: "sanitation",
    name: "Sanitation",
    description: "Drains, latrines and baths keep a crowded town healthy. Unlocks Public Latrines and the Bathhouse.",
    branch: "culture",
    era: 2,
    cost: 30,
    requires: ["planning"],
    unlocks: ["latrine", "baths"],
  },
  {
    id: "wheel",
    name: "The Wheel",
    description: "Carts carry goods to market. Unlocks the Market.",
    branch: "transport",
    era: 2,
    cost: 25,
    requires: ["coinage"],
    unlocks: ["market"],
  },
  {
    id: "barter-roads",
    name: "Silk Road Contact",
    description: "Traders from the Silk Steppe arrive. Send caravans from your Market.",
    branch: "culture",
    era: 2,
    cost: 25,
    requires: ["wheel"],
  },
  {
    id: "roads",
    name: "Paved Roads",
    description: "Stone roads between the buildings: 25% more coins from trade, and caravans and scouts cost less.",
    branch: "transport",
    era: 2,
    cost: 35,
    requires: ["wheel", "concrete"],
  },
  {
    id: "philosophy",
    name: "Philosophy",
    description: "Teachers and students ask why. Unlocks the Academy.",
    branch: "knowledge",
    era: 2,
    cost: 30,
    requires: ["writing"],
    unlocks: ["academy"],
  },
  {
    id: "legions",
    name: "Iron Weapons",
    description: "Iron swords and armour: each warrior fights three times as hard. Smithies burn more charcoal.",
    branch: "military",
    era: 2,
    cost: 35,
    requires: ["bronze-arms"],
  },
  {
    id: "silk-secret",
    name: "Jade Road",
    description: "Secret: send 5 caravans. +10 knowledge and +10 happiness.",
    branch: "culture",
    era: 2,
    cost: 0,
    requires: ["barter-roads"],
    secret: true,
  },
  // ---- Medieval era --------------------------------------------------------
  {
    id: "heavy-plough",
    name: "Heavy Plough",
    description: "An iron plough pulled by oxen turns heavy, wet soil. Fields give 25% more, and Farmland can be placed on forest (clearing it).",
    branch: "energy",
    era: 3,
    cost: 50,
    requires: ["watermill"],
  },
  {
    id: "three-field",
    name: "Three-Field Rotation",
    description: "Grain, then beans, then a year of rest. Fields give 10% more and wear out the land half as much.",
    branch: "energy",
    era: 3,
    cost: 60,
    requires: ["heavy-plough"],
  },
  {
    id: "windmills",
    name: "Windmills",
    description: "The wind turns the millstones, no river needed. Unlocks the Windmill.",
    branch: "energy",
    era: 3,
    cost: 60,
    requires: ["three-field"],
    unlocks: ["windmill"],
  },
  {
    id: "castles",
    name: "Castles",
    description: "Stone keeps and high walls. Unlocks the Castle.",
    branch: "military",
    era: 3,
    cost: 60,
    requires: ["legions"],
    unlocks: ["castle"],
  },
  {
    id: "knights",
    name: "Knights",
    description: "Armoured riders on war horses: each warrior fights four times as hard, but the horses eat (warriors need 50% more food).",
    branch: "military",
    era: 3,
    cost: 70,
    requires: ["castles"],
  },
  {
    id: "guilds",
    name: "Guilds",
    description: "Craftsmen band together to train apprentices and keep standards. Unlocks the Guild Hall.",
    branch: "culture",
    era: 3,
    cost: 50,
    requires: ["wheel"],
    unlocks: ["guildhall"],
  },
  {
    id: "diplomacy",
    name: "Diplomacy",
    description: "Envoys, gifts and written treaties. A friendly kingdom can sign a treaty: it trades with you and never attacks.",
    branch: "culture",
    era: 3,
    cost: 40,
    requires: ["barter-roads"],
  },
  {
    id: "universities",
    name: "Universities",
    description: "Scholars gather from every land. Unlocks the University.",
    branch: "knowledge",
    era: 3,
    cost: 60,
    requires: ["philosophy"],
    unlocks: ["university"],
  },
  {
    id: "printing",
    name: "Printing Press",
    description: "Books printed instead of copied by hand. +30% Knowledge and +15 literacy.",
    branch: "knowledge",
    era: 3,
    cost: 90,
    requires: ["universities"],
  },
  {
    id: "quarantine",
    name: "Quarantine",
    description: "Keep ships and travellers waiting before they come ashore, and the sick apart from the well. Much less sickness from overseas.",
    branch: "knowledge",
    era: 3,
    cost: 60,
    requires: ["sanitation"],
  },
  {
    id: "navigation",
    name: "Ocean Ships",
    description: "Deep hulls, the compass and sea charts. Unlocks the Shipyard: ships find islands overseas.",
    branch: "transport",
    era: 3,
    cost: 50,
    requires: ["wheel"],
    unlocks: ["shipyard", "tradingpost"],
  },
  {
    id: "far-shores",
    name: "Far Shores",
    description: "Secret: send 4 ships. +12 knowledge and +10 happiness.",
    branch: "transport",
    era: 3,
    cost: 0,
    requires: ["navigation"],
    secret: true,
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
  // Fewer Knowledge to save up (30, not 80), more things to do instead: settle
  // down in houses and have elders teaching.
  agriculture: [
    { label: "Have Farmland", kind: "have", building: "farm", amount: 3 },
    { label: "Have Wooden Houses", kind: "have", building: "hut", amount: 2 },
    { label: "Have an Elder's Hut", kind: "have", building: "elder", amount: 1 },
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
  coinage: [{ label: "Save up coins", kind: "stored", resource: "currency", amount: 150 }],
  hydraulics: [{ label: "Grow your town", kind: "population", amount: 45 }],
  watermill: [{ label: "Have Wells", kind: "have", building: "well", amount: 2 }],
  concrete: [{ label: "Quarry stone", kind: "tally", key: "stone", amount: 80 }],
  planning: [{ label: "Have Mud-brick Houses", kind: "have", building: "house", amount: 3 }],
  sanitation: [{ label: "Have Town Houses", kind: "have", building: "townhouse", amount: 2 }],
  wheel: [{ label: "Save up coins", kind: "stored", resource: "currency", amount: 200 }],
  "barter-roads": [{ label: "Have a Market", kind: "have", building: "market", amount: 1 }],
  roads: [{ label: "Send caravans", kind: "tally", key: "caravans", amount: 2 }],
  philosophy: [{ label: "Keep Knowledge unspent", kind: "stored", resource: "knowledge", amount: 40 }],
  legions: [{ label: "Beat raids", kind: "tally", key: "raidsWon", amount: 5 }],
  "heavy-plough": [{ label: "Have Farmland", kind: "have", building: "farm", amount: 8 }],
  "three-field": [{ label: "Store food at once", kind: "stored", resource: "food", amount: 300 }],
  windmills: [{ label: "Have Farmland", kind: "have", building: "farm", amount: 10 }],
  castles: [{ label: "Have Stone Walls", kind: "have", building: "walls", amount: 1 }],
  knights: [{ label: "Have a Castle", kind: "have", building: "castle", amount: 1 }],
  guilds: [{ label: "Have Bronze Smithies", kind: "have", building: "smithy", amount: 2 }],
  diplomacy: [{ label: "Send gifts to a kingdom", kind: "tally", key: "gifts", amount: 1 }],
  universities: [{ label: "Have an Academy", kind: "have", building: "academy", amount: 1 }],
  printing: [{ label: "Have a University", kind: "have", building: "university", amount: 1 }],
  quarantine: [{ label: "Have Healer's Huts", kind: "have", building: "healer", amount: 2 }],
  navigation: [{ label: "Have Fishing Spots", kind: "have", building: "fishing", amount: 2 }],
};

// Elder Ama's guided step right after each advancement. With `build`, the hand
// points you to place one; without, it's an explanation to read.
export const AFTER_STEPS: Record<string, AfterStep> = {
  storytelling: { build: "elder", text: "Now our elders can teach. Build an Elder's Hut: the children will learn from it, and we will gain Knowledge every day." },
  toolmaking: { build: "quarry", text: "Sharp stone tools! Place a Stone Quarry on the hills. Remember: it cuts the hill away for good, and its dust spoils crops nearby." },
  firekeeping: { text: "We know how to bank a fire now: every campfire burns 1.5 times as long (50% longer) before it needs more wood. Less wood cut, less smoke. We can also keep a Watch Fire burning on the shore, to see raiders coming sooner." },
  fishing: { build: "fishing", text: "Rafts! Place a Fishing Spot on the shore, next to the water. Fish near the coast give even more. A Canoe Dock lets us paddle out to the islands to the south, but every canoe costs one big tree." },
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
  coinage: { text: "Silver coins! Traders take them anywhere. Once the Roman legion is beaten and we are 40 people, we can enter the Classical era. Watch the goal at the top of the screen." },
  hydraulics: { build: "well", text: "We can dig down to the water under our feet. Dig a Well: clean water for 12 people, even when the rain fails. But too many wells drain the ground dry." },
  watermill: { build: "watermill", text: "Place a Watermill on the river bank: the river turns the millstones, and the fields near it give more. Its dam blocks the fish." },
  concrete: { build: "aqueduct", text: "Stone and lime that sets even under water! Build an Aqueduct touching the river: it carries water to 40 people and out to the fields. The river pays for it." },
  planning: { build: "townhouse", text: "Straight streets and tall houses. Build a Town House: room for 24 people on one tile. A packed town spreads sickness, so plan for latrines too." },
  sanitation: { build: "latrine", text: "Build Public Latrines: drains carry the waste away, and sickness spreads far less in town. The waste still ends up downstream." },
  wheel: { build: "market", text: "Wheels and carts! Build a Market: traders bring coins into town, and now and then sickness from far away." },
  "barter-roads": { text: "Traders from the Silk Steppe want to deal with us. Press Caravan below to send one from the Market: it comes back with coins and new ideas. Sickness travels the same roads." },
  roads: { text: "Stone roads link the town. Trade brings 25% more coins, and caravans and scouts cost less." },
  philosophy: { build: "academy", text: "Build an Academy: teachers and students ask questions nobody asked before, and Knowledge grows." },
  legions: { text: "Iron swords and armour: every warrior now fights three times as hard. Iron needs even more charcoal, so every smithy burns more wood." },
  "heavy-plough": { build: "farm", text: "The heavy plough turns even wet, heavy soil. Fields give 25% more, and Farmland can now go on forest, clearing it. More bread, fewer trees: choose where carefully." },
  "three-field": { text: "Grain, then beans, then a year of rest: every field gets its turn to recover. Fields give 10% more and wear out the land half as much." },
  windmills: { build: "windmill", text: "Build a Windmill near the fields: the wind grinds the grain, and fields within 2 tiles give 20% more. No river, no wood to burn." },
  castles: { build: "castle", text: "Build a Castle on strong ground: +15 defense and room for 10 more warriors. The Eastern Reach will not like it." },
  knights: { text: "Knights on war horses: every warrior now fights four times as hard. But horses eat, so every warrior needs half as much food again." },
  guilds: { build: "guildhall", text: "Build a Guild Hall: the crafts organise, make better tools and bring in coins. But the guilds keep newcomers out, and people grumble." },
  diplomacy: { text: "We can sign treaties now. Open Kingdoms below: when a kingdom is friendly, a treaty means trade every day and no war." },
  universities: { build: "university", text: "Build a University: scholars come from every land, and literacy and Knowledge grow." },
  printing: { text: "Books can be printed instead of copied by hand, hundreds at a time. +30% Knowledge and +15 literacy." },
  quarantine: { text: "Ships wait offshore before they land, and the sick are kept apart. Sickness from overseas will do far less harm." },
  navigation: { build: "shipyard", text: "Build a Shipyard on the coast, then press Ship below: our ships will find islands overseas, meet the kingdoms and bring back trade." },
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
      { label: "Cut it down (+40 wood, you lose the grove)", effect: { clearForest: 4, resources: { wood: 40 }, happiness: -4 } },
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
  {
    id: "dirty-river",
    title: "The river smells",
    icon: "drop",
    body: "The town's drains empty into the river, and the families downstream have started to fall sick.",
    era: 2,
    choices: [
      { label: "Dig a drain out to the sea (−20 stone)", effect: { resources: { stone: -20 }, happiness: 4 } },
      { label: "Leave it (sickness may spread)", effect: { sickness: 0.6, sustainability: -6 } },
    ],
    realWorld: "Untreated waste in rivers still makes people sick in many places today. Treating wastewater is part of SDG 6.3.",
  },
  {
    id: "timber-merchant",
    title: "A timber merchant",
    icon: "coin",
    body: "A merchant from the Eastern Reach wants our tallest trees for his ships. He pays in silver, and he pays well.",
    era: 2,
    choices: [
      { label: "Sell the old trees (+120 coins, 5 forest tiles cut)", effect: { clearForest: 5, resources: { currency: 120 } } },
      { label: "Keep the forest (no coins)", effect: { happiness: 2 } },
    ],
    realWorld: "Shipbuilding cleared many forests around the ancient Mediterranean, and timber is still traded around the world today.",
  },
  {
    id: "new-quarter",
    title: "A new quarter",
    icon: "insula",
    body: "The town is full, and builders want to put up a new quarter. Rich families will pay well for fine houses; everyone else needs a roof too.",
    era: 2,
    choices: [
      { label: "Fine houses for the rich (+80 coins, −10 happiness)", effect: { resources: { currency: 80 }, happiness: -10 } },
      { label: "Simple homes for everyone (−30 stone, +10 happiness)", effect: { resources: { stone: -30 }, happiness: 10 } },
    ],
    realWorld: "Towns that grow without homes for everyone end up with crowded slums. SDG 11.1 asks for safe, affordable housing for all.",
  },
  {
    id: "reach-tribute",
    title: "Envoys from the Eastern Reach",
    icon: "crown",
    body: "Riders from the Eastern Reach demand a yearly payment \"for the peace\". Pay, and their king is pleased. Refuse, and he may send his army.",
    era: 3,
    choices: [
      { label: "Pay them (−50 coins, the Reach is pleased)", effect: { resources: { currency: -50 }, mood: { reach: 20 } } },
      { label: "Refuse (the Reach is angry, +5 happiness)", effect: { mood: { reach: -25 }, happiness: 5 } },
    ],
    realWorld: "Paying for peace, or refusing, is a choice rulers have faced for thousands of years. SDG 16 is about peaceful societies and strong institutions.",
  },
  {
    id: "steppe-grain",
    title: "A hungry neighbour",
    icon: "wheat",
    body: "The harvest failed on the Silk Steppe. Their envoy asks if we can spare grain for their people.",
    era: 3,
    choices: [
      { label: "Send grain (−60 food, the Steppe is grateful)", effect: { resources: { food: -60 }, mood: { steppe: 25 } } },
      { label: "Keep it for ourselves (the Steppe remembers)", effect: { mood: { steppe: -15 } } },
    ],
    realWorld: "Neighbours helping each other through bad harvests builds trust that lasts. Today, food aid still crosses borders when harvests fail.",
  },
  {
    id: "wool-trade",
    title: "The wool merchants",
    icon: "sheep",
    body: "Cloth merchants will pay well for wool. More sheep would mean more coins, but the flocks would graze the hills bare.",
    era: 3,
    choices: [
      { label: "More sheep (+100 coins, −6 land health)", effect: { resources: { currency: 100 }, sustainability: -6 } },
      { label: "Keep the flocks as they are (no coins)", effect: { happiness: 2 } },
    ],
    realWorld: "Wool made some medieval towns rich, and overgrazing wore down hillsides. Grazing is still a big cause of land degradation today.",
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
  // How far below strainLevel it must fall before the land is fully worn out.
  strainDepth: 20,
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

// First-time mode: the clock runs `slowFactor` times slower for the first
// `slowTicks` ticks (about 5 minutes of real time), and events and raids come
// `gapFactor` times further apart until tick `calmUntil` (about 15 minutes).
export const GENTLE = { slowTicks: 100, slowFactor: 2, gapFactor: 1.5, calmUntil: 600 };

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
  // Each market (traders from far away).
  market: 0.0005,
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
  text: "A War Camp and one warrior now guard us. Keep food stored, fires lit, and the forest standing. The rest is up to you.",
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
  {
    id: "water",
    title: "Water for everyone",
    text: "Clean water from a well means fewer people drink from dirty streams and fall sick. It is one of the simplest ways to keep a town healthy.",
    sdg: "SDG 6.1: safe drinking water for all",
  },
  {
    id: "sanitation",
    title: "Where the waste goes",
    text: "Our town is packed, and the waste runs in the streets. In crowded towns, sickness spreads through dirty water. Drains and latrines stop it.",
    sdg: "SDG 6.2: sanitation for all",
  },
  {
    id: "river",
    title: "The river is not endless",
    text: "Every aqueduct and mill takes something from the river. Fish can't swim past the dams, and the marshes downstream dry out. A river shared too many ways runs thin.",
    sdg: "SDG 6.6: protect rivers, wetlands and the life in them",
  },
  {
    id: "towns",
    title: "Planning the town",
    text: "Tall houses fit more people on less land, which leaves more land for fields and forest. But a town also needs water, drains and room to breathe.",
    sdg: "SDG 11.3: plan towns and cities that can last",
  },
  {
    id: "trade",
    title: "Trade brings more than coins",
    text: "Caravans bring silver, spices and new ideas from far away. Sickness travels the same roads, so a trading town has to keep itself clean.",
    sdg: "SDG 3.3: stop the spread of infectious diseases",
  },
  {
    id: "disasters",
    title: "Ready for the next storm",
    text: "Storms, floods and earthquakes will always come. What we build, and where, decides how much they take from us. Forests break the wind and soak up the rain.",
    sdg: "SDG 11.5: fewer people harmed by disasters",
  },
  {
    id: "slopes",
    title: "Roots hold the hills",
    text: "The trees on the hillside held the soil in place with their roots. We cut them, and the hill came down. Keep the forest on the slopes.",
    sdg: "SDG 15.3: restore degraded land and soil",
  },
  {
    id: "clearing",
    title: "Fields where the forest stood",
    text: "The heavy plough lets us farm land that was forest. Every field feeds families, but every tree cut is shade, rain and animals lost. Clear only what we need.",
    sdg: "SDG 15.2: stop deforestation and restore forests",
  },
  {
    id: "peace",
    title: "Neighbours, not enemies",
    text: "A treaty with a neighbour is worth more than a castle. Gifts, fair trade and help in hard times turn rivals into friends, and friends don't send armies.",
    sdg: "SDG 16.1: reduce violence everywhere",
  },
  {
    id: "oceans",
    title: "The sea connects us",
    text: "Our ships carry grain, cloth and news across the sea. They carry sickness too, and they are built from our oldest trees. The sea gives much, but it is not endless.",
    sdg: "SDG 14: life below water",
  },
  {
    id: "plague",
    title: "The great sickness",
    text: "The sickness came on ships, with rats and fleas and sick sailors. Towns that kept ships waiting, kept the sick apart and kept their streets clean lost fewer people. We can't stop every sickness, but we can be ready.",
    sdg: "SDG 3.d: early warning and preparing for health risks",
  },
  {
    id: "drought",
    title: "Ready for dry years",
    text: "Droughts come to every land sooner or later. Towns that store grain, save water and keep their forests standing get through them. Those that don't, suffer.",
    sdg: "SDG 13.1: help communities cope with climate hazards",
  },
];

// Elder Ama's welcome when the tribe enters a new era (shown like a lesson).
export const ERA_INTROS: Record<number, { id: string; title: string; text: string; sdg: string }> = {
  2: {
    id: "era-2",
    title: "Welcome to the Classical era",
    text: "We beat Rome, and our coins travel far. Our village is becoming a town, and towns need clean water, drains and roads. Traders will come from across the sea. But the old stories warn of a great drought that comes once in a lifetime. Dig wells, store grain and keep the forests standing.",
    sdg: "SDG 11.3: plan towns and cities that can last",
  },
  3: {
    id: "era-3",
    title: "Welcome to the Middle Ages",
    text: "Our great landmark stands, and our town is known across the sea. Two kingdoms watch us: the Silk Steppe and the Eastern Reach. Keep them friendly with gifts and treaties, or build castles to hold them off. New ploughs can feed more of us, but only by clearing the forest. And sailors tell of a terrible sickness spreading from port to port. When it comes, it will come by ship.",
    sdg: "SDG 16: peace, and SDG 3: health for everyone",
  },
};

// Discovery scenes: when an advancement (or a secret) is found, a short pixel
// scene shows the moment people worked it out. `bg` sets the sky, `actors` walk
// in, `item` is what they discover, and the three lines play one by one.
// Keep them short, in the tribe's own voice, and modest about history.
export type SceneSky = "dawn" | "day" | "dusk" | "night" | "sea" | "cave";
// Something in the scene besides the people: `x` is how far across (0-100) and
// `y` how high up (0 = the bottom; the ground is about 18). It shows from line
// `from` (0 = from the start) until line `until` (when it's gone). `size` in px.
export interface SceneProp {
  icon: IconId;
  x: number;
  y?: number;
  from?: number;
  until?: number;
  size?: number;
  // Face the other way (a sprite drawn facing right, turned to face left).
  flip?: boolean;
}
export interface DiscoveryScene {
  bg: SceneSky;
  actors: IconId[];
  // What they discover. It pops up, with light around it, on line `itemFrom`
  // (default 1, the second line), at `itemX` across (default 74).
  item: IconId;
  itemFrom?: number;
  itemX?: number;
  props?: SceneProp[];
  // A river across the ground, or a dried-up streambed ("dry").
  river?: boolean | "dry";
  lines: [string, string, string];
}
// Every scene must show what its lines say, at the line that says it: a fire
// when they talk by the fire, people sitting when they sit, the thing itself
// (not a stand-in) when it is discovered.
export const DISCOVERIES: Record<string, DiscoveryScene> = {
  storytelling: {
    bg: "night",
    actors: ["elder-sit", "person-sit"],
    props: [
      { icon: "campfire", x: 40 },
      { icon: "person-sit", x: 52, from: 1, size: 44, flip: true },
      { icon: "person-sit", x: 60, from: 1, size: 44, flip: true },
    ],
    item: "bulb",
    itemFrom: 2,
    lines: ["Night after night, the old ones talked by the fire.", "The children began to repeat the stories, word for word.", "What one person knew, now everyone could remember."],
  },
  toolmaking: {
    bg: "day",
    actors: ["person"],
    props: [{ icon: "rock", x: 36 }, { icon: "hide", x: 52, from: 1, size: 44 }, { icon: "log", x: 60, from: 1, size: 44 }],
    item: "flint",
    itemFrom: 0,
    lines: ["A stone struck another and a sharp flake broke off.", "It cut hide better than teeth, and wood better than hands.", "Soon every hunter carried a blade of stone."],
  },
  firekeeping: {
    bg: "night",
    actors: ["elder-sit"],
    props: [{ icon: "log", x: 36, until: 1 }],
    item: "campfire",
    itemX: 40,
    lines: ["The fire kept dying before dawn.", "Buried under ash, the embers stayed warm until morning.", "Now a fire can be kept alive with half the wood."],
  },
  fishing: {
    bg: "sea",
    actors: ["person", "person"],
    props: [{ icon: "log", x: 62, y: 26, until: 1 }, { icon: "bird", x: 63, y: 36, until: 1, size: 44 }, { icon: "fish", x: 50, y: 24, from: 2 }],
    item: "boat",
    itemX: 66,
    lines: ["Logs drifted past the shore, carrying birds on their backs.", "Tied together with vines, they carried people too.", "Out on the water, the fish could not hide."],
  },
  "early-farming": {
    bg: "dawn",
    actors: ["person", "elder"],
    props: [{ icon: "sprout", x: 40 }, { icon: "wheat", x: 50, from: 2 }, { icon: "wheat", x: 60, from: 2 }],
    item: "wheat",
    itemFrom: 2,
    lines: ["Grain dropped by the camp last year had sprouted.", "What if we put the seeds in the ground ourselves?", "A handful of seeds became a field."],
  },
  spears: {
    bg: "day",
    actors: ["person", "person"],
    props: [{ icon: "mammoth", x: 58, from: 2 }],
    item: "spear",
    itemFrom: 0,
    itemX: 42,
    lines: ["A sharp stone, tied to a long stick.", "Now the hunter can strike from further away.", "The herds are easier to hunt, and the camp is easier to guard."],
  },
  herbalism: {
    bg: "day",
    actors: ["elder"],
    props: [{ icon: "ill", x: 40, until: 1 }, { icon: "smile", x: 40, from: 1 }],
    item: "herb",
    itemFrom: 0,
    itemX: 60,
    lines: ["The sick woman chewed a bitter leaf and slept.", "In the morning her fever was gone.", "We began to remember which plants heal."],
  },
  herding: {
    bg: "day",
    actors: ["person"],
    props: [{ icon: "sheep", x: 50, from: 1, size: 44 }, { icon: "sheep", x: 60, from: 1, size: 44 }],
    item: "sheep",
    itemFrom: 0,
    itemX: 34,
    lines: ["A lost lamb followed the children home.", "It grew, and more wild goats came to its call.", "Now the herd walks with us, and we don't have to chase it."],
  },
  "hide-clothing": {
    bg: "dusk",
    actors: ["person-sit", "person-sit"],
    props: [{ icon: "hide", x: 40, until: 1 }, { icon: "hide", x: 50, until: 1 }],
    item: "tunic",
    lines: ["A sharp bone, a thread of sinew, two hides.", "Sewn together, they keep the wind out.", "Warm without a fire: less wood, less smoke."],
  },
  "cave-paintings": {
    bg: "cave",
    actors: ["elder", "person"],
    props: [{ icon: "torch", x: 34, y: 18 }],
    item: "mammoth",
    itemX: 62,
    lines: ["By torchlight, a hand pressed red earth to the rock.", "A mammoth appeared on the cave wall.", "Our stories will be here long after we are gone."],
  },
  agriculture: {
    bg: "dawn",
    actors: ["person", "person", "elder"],
    props: [{ icon: "wheat", x: 46 }, { icon: "wheat", x: 54 }, { icon: "wheat", x: 62 }],
    item: "hut",
    itemFrom: 2,
    lines: ["The fields fed us all winter.", "No more walking after the herds: we will stay.", "Here we build a village that will last."],
  },
  writing: {
    bg: "day",
    actors: ["elder", "person"],
    props: [{ icon: "sheep", x: 50, from: 1, size: 44 }, { icon: "wheat", x: 58, from: 1, size: 44 }],
    item: "tablet",
    itemFrom: 0,
    lines: ["A reed pressed into wet clay leaves a mark.", "One mark for a sheep, another for a sack of grain.", "Now words last longer than the one who spoke them."],
  },
  pottery: {
    bg: "day",
    actors: ["person"],
    props: [{ icon: "campfire", x: 38 }, { icon: "wheat", x: 56, from: 1, size: 44 }],
    item: "amphora",
    lines: ["Clay left near the fire turned hard as stone.", "Shaped into jars, it kept the grain dry and the mice out.", "Food no longer rots before we can eat it."],
  },
  bronze: {
    bg: "night",
    actors: ["person", "person"],
    props: [{ icon: "campfire", x: 42 }, { icon: "ore", x: 54, until: 1 }],
    item: "hammer",
    lines: ["Green stones melted in the hottest fire.", "Mixed with a little tin, the metal came out hard and bright.", "Bronze tools: stronger, and they can be mended."],
  },
  irrigation: {
    bg: "day",
    actors: ["person", "person"],
    river: true,
    props: [{ icon: "wheat", x: 46 }, { icon: "wheat", x: 56, from: 1 }],
    item: "drop",
    lines: ["The river flooded the low field, and the crop grew tall.", "We dug a ditch to bring the water to the others.", "Every field near a canal grows more. But the water leaves salt behind."],
  },
  forestry: {
    bg: "day",
    actors: ["elder", "person"],
    props: [{ icon: "stump", x: 40 }, { icon: "stump", x: 50 }, { icon: "stump", x: 60 }, { icon: "sapling", x: 46, from: 2 }, { icon: "sapling", x: 56, from: 2 }],
    item: "sapling",
    lines: ["Where the woodcutters worked, only stumps were left.", "An old woman planted acorns in the bare ground.", "Cut one tree, plant another: the forest can last."],
  },
  "bronze-arms": {
    bg: "dusk",
    actors: ["person", "person"],
    props: [{ icon: "hammer", x: 42 }, { icon: "spear", x: 54, from: 1 }],
    item: "shield",
    lines: ["The smiths hammered bronze into spear points and shield rims.", "A bronze spear does not break against a wooden shield.", "Our warriors fight twice as hard."],
  },
  coinage: {
    bg: "day",
    actors: ["person", "elder"],
    props: [{ icon: "sheep", x: 44, until: 1 }, { icon: "amphora", x: 54, until: 1 }],
    item: "coin",
    lines: ["Traders argued: how many sheep is a jar of oil worth?", "Small silver pieces, all the same weight, settled it.", "Now anything can be traded for coins."],
  },
  hydraulics: {
    bg: "day",
    actors: ["person", "person"],
    river: "dry",
    props: [{ icon: "pickaxe", x: 44, from: 1 }, { icon: "drop", x: 54, from: 1 }],
    item: "well",
    itemFrom: 2,
    lines: ["The stream dried up, but the ground was still damp.", "We dug deeper and deeper, and water rose from below.", "A well: water close to home, even when the rain fails."],
  },
  watermill: {
    bg: "day",
    actors: ["person"],
    river: true,
    props: [{ icon: "log", x: 48, y: 8, until: 1 }, { icon: "wheat", x: 40, from: 2, size: 44 }],
    item: "mill",
    lines: ["The river pushed a floating log round and round.", "Fixed to a wheel, the river turned a millstone.", "Grain ground by water, not by hand."],
  },
  concrete: {
    bg: "day",
    actors: ["person", "person"],
    props: [{ icon: "rock", x: 44 }, { icon: "drop", x: 52 }, { icon: "bricks", x: 48, from: 1 }],
    item: "aqueduct",
    itemFrom: 2,
    lines: ["Lime, ash and water, mixed and left to dry.", "It set as hard as rock, even under water.", "Now we can build arches to carry a whole river."],
  },
  planning: {
    bg: "day",
    actors: ["elder", "person"],
    props: [{ icon: "hut", x: 40, until: 2 }, { icon: "hut", x: 52, y: 24, until: 2 }, { icon: "hut", x: 62, until: 2 }, { icon: "insula", x: 46, from: 2 }],
    item: "insula",
    itemFrom: 2,
    lines: ["The town had grown into a tangle of huts and paths.", "The builders drew straight streets in the dust.", "Tall houses, side by side: more people on less land."],
  },
  sanitation: {
    bg: "day",
    actors: ["person", "elder"],
    props: [{ icon: "ill", x: 42, until: 2 }, { icon: "smile", x: 42, from: 2 }],
    river: true,
    item: "drop",
    lines: ["Where the waste ran in the street, the fevers came.", "Channels of running water carried it away.", "A clean town is a healthy town."],
  },
  wheel: {
    bg: "day",
    actors: ["person", "sheep"],
    props: [{ icon: "log", x: 42, until: 1 }, { icon: "rock", x: 50, until: 1 }, { icon: "market", x: 52, from: 2 }],
    item: "cart",
    lines: ["A round log rolled a heavy stone down the hill.", "Cut into discs and fixed to a cart, it carried more than ten people could.", "Carts bring goods to market."],
  },
  "barter-roads": {
    bg: "sea",
    actors: ["person", "person"],
    props: [{ icon: "wheat", x: 42, from: 1, size: 44 }, { icon: "log", x: 50, from: 1, size: 44 }],
    item: "boat",
    itemFrom: 0,
    itemX: 66,
    lines: ["A strange ship came from the steppe across the water.", "They brought silk and spices, and wanted our grain and wood.", "Our caravans can sail to them now."],
  },
  roads: {
    bg: "day",
    actors: ["person", "person"],
    props: [{ icon: "mud", x: 46, y: 6, until: 1, size: 96 }, { icon: "cart", x: 46, y: 9, until: 1 }, { icon: "cart", x: 50, from: 2 }],
    item: "road",
    lines: ["Carts sank in the mud every spring.", "Flat stones laid side by side made a road that never floods.", "Goods and news travel faster than ever."],
  },
  philosophy: {
    bg: "dusk",
    actors: ["elder", "person-sit", "person-sit"],
    props: [{ icon: "column", x: 48 }, { icon: "column", x: 60 }],
    item: "bulb",
    itemFrom: 2,
    lines: ["In the shade of the columns, a teacher asked: why?", "The students argued until the sun went down.", "Asking questions is how new knowledge begins."],
  },
  legions: {
    bg: "night",
    actors: ["person", "person"],
    props: [{ icon: "campfire", x: 42 }, { icon: "rock", x: 52, until: 1 }, { icon: "hammer", x: 52, from: 1 }],
    item: "sword",
    itemFrom: 2,
    lines: ["A new ore, heated hotter than bronze ever needed.", "Hammered while glowing, it became iron.", "Iron swords are harder still. But they eat charcoal."],
  },
  "silk-secret": {
    bg: "sea",
    actors: ["person"],
    props: [{ icon: "boat", x: 60, y: 22 }],
    item: "jade",
    itemFrom: 0,
    itemX: 40,
    lines: ["Our fifth caravan came back with a strange green stone.", "Jade, they called it, from lands far to the east.", "The world is bigger than any of us thought."],
  },
  // ---- Medieval era ----
  "heavy-plough": {
    bg: "dawn",
    actors: ["person"],
    props: [
      { icon: "mud", x: 52, y: 6, size: 96 },
      { icon: "log", x: 50, until: 1, size: 40 },
      { icon: "horse", x: 64, from: 1 },
      { icon: "sprout", x: 32, from: 2, size: 32 },
      { icon: "sprout", x: 38, from: 2, size: 32 },
    ],
    item: "plough",
    itemX: 48,
    lines: ["The old wooden plough only scratched the heavy, wet soil.", "An iron blade, a wheel, and a strong horse to pull it.", "Now it turns the earth over, deep and dark, and the seed takes."],
  },
  "three-field": {
    bg: "day",
    actors: ["elder", "person"],
    props: [
      { icon: "wheat", x: 46, until: 1, size: 28 },
      { icon: "wheat", x: 52, until: 1, size: 24 },
      { icon: "wheat", x: 42, from: 1 },
      { icon: "sprout", x: 54, from: 1 },
      { icon: "mud", x: 64, y: 14, from: 1, size: 40 },
    ],
    item: "wheat",
    itemFrom: 2,
    itemX: 78,
    lines: ["The same field, sown every year, gave less and less.", "Grain here, beans there, and one field left to rest.", "Each year the fields take turns, and the soil comes back."],
  },
  windmills: {
    bg: "day",
    actors: ["person"],
    props: [
      { icon: "wheat", x: 42 },
      { icon: "wheat", x: 50 },
      { icon: "basket", x: 60, from: 2, size: 40 },
    ],
    item: "windmill",
    lines: ["Across the open fields, the wind blew day and night.", "Sails on a tower, turning a millstone.", "Grain ground into flour by the wind, far from any river."],
  },
  castles: {
    bg: "dusk",
    actors: ["person", "person"],
    props: [
      { icon: "log", x: 42, until: 1, size: 44 },
      { icon: "log", x: 52, until: 1, size: 44 },
      { icon: "flame", x: 42, y: 24, until: 1, size: 36 },
      { icon: "flame", x: 52, y: 24, until: 1, size: 40 },
      { icon: "shield", x: 50, from: 2, size: 40 },
      { icon: "spear", x: 58, from: 2, size: 40 },
    ],
    item: "castle",
    lines: ["Wooden fences burned, and earth banks were climbed.", "Stone walls, thick and high, with a keep inside.", "Behind them, a few can hold off many."],
  },
  knights: {
    bg: "day",
    actors: ["person"],
    props: [
      // The rider, sitting up on the horse (the discovery, at 62).
      { icon: "person", x: 61, y: 32, size: 40 },
      { icon: "shield", x: 54, y: 26, size: 28 },
      { icon: "wheat", x: 38, from: 2 },
      { icon: "basket", x: 46, from: 2, size: 40 },
    ],
    item: "horse",
    itemFrom: 0,
    itemX: 62,
    lines: ["Riders in iron, on horses bred to be strong.", "They charge faster than anyone can run.", "But a war horse eats as much as a family."],
  },
  guilds: {
    bg: "day",
    actors: ["person", "elder"],
    props: [
      { icon: "tunic", x: 38, size: 40 },
      { icon: "wheat", x: 46, size: 40 },
      { icon: "scroll", x: 56, from: 1, size: 40 },
      { icon: "hammer", x: 64, from: 2, size: 40 },
    ],
    item: "scales",
    itemFrom: 1,
    itemX: 78,
    lines: ["The weavers argued over prices, and the bakers over flour.", "They met in a hall and wrote down the rules of their craft.", "Masters teach apprentices, and the work gets better."],
  },
  diplomacy: {
    bg: "sea",
    actors: ["elder", "person"],
    props: [
      { icon: "boat", x: 70, y: 24, until: 1 },
      { icon: "amphora", x: 38, size: 40 },
      { icon: "coin", x: 45, size: 32 },
      { icon: "scroll", x: 53, from: 1, size: 40 },
      { icon: "boat", x: 84, y: 24, from: 1, flip: true },
    ],
    item: "dove",
    itemFrom: 2,
    itemX: 66,
    lines: ["Envoys came from across the sea, carrying gifts.", "We sent our own back, with a letter sealed in wax.", "Words on a page can stop a war before it starts."],
  },
  universities: {
    bg: "dusk",
    actors: ["elder", "person-sit", "person-sit"],
    props: [
      { icon: "column", x: 46 },
      { icon: "book", x: 54, from: 1, size: 36 },
      { icon: "torch", x: 62, from: 1, size: 44 },
    ],
    item: "scroll",
    itemFrom: 2,
    lines: ["Students came from far away to hear the masters.", "They lived together, read together and argued late into the night.", "A town full of scholars learns faster than any one of them."],
  },
  printing: {
    bg: "day",
    actors: ["elder-sit"],
    props: [
      { icon: "book", x: 40, until: 1, size: 36 },
      { icon: "feather", x: 46, until: 1, size: 32 },
      { icon: "book", x: 40, from: 2, size: 32 },
      { icon: "book", x: 48, from: 2, size: 32 },
      { icon: "book", x: 56, from: 2, size: 32 },
    ],
    item: "press",
    itemX: 70,
    lines: ["Copying a book by hand took a scribe a whole year.", "Metal letters, ink and a press: a page in a moment.", "Soon there were books in every town."],
  },
  quarantine: {
    bg: "sea",
    actors: ["elder", "person"],
    props: [
      { icon: "boat", x: 62, y: 24, until: 1 },
      { icon: "ill", x: 46, until: 2, size: 36 },
      { icon: "boat", x: 84, y: 26, from: 1, size: 40 },
      { icon: "smile", x: 46, from: 2, size: 36 },
    ],
    item: "anchor",
    itemX: 70,
    lines: ["The sickness always seemed to arrive with the ships.", "So ships had to wait offshore before anyone landed.", "The waiting kept the sickness out. Other ports copied the idea."],
  },
  navigation: {
    bg: "sea",
    actors: ["person", "person"],
    props: [
      { icon: "compass", x: 46, size: 40 },
      { icon: "spyglass", x: 54, from: 2, size: 40 },
    ],
    item: "boat",
    itemX: 74,
    lines: ["A needle that always points north, floating in a bowl of water.", "Deep hulls and tall sails that can cross the open sea.", "Now our ships can sail beyond the edge of the map."],
  },
  "far-shores": {
    bg: "sea",
    actors: ["person"],
    props: [
      { icon: "boat", x: 80, y: 24 },
      { icon: "basket", x: 38, size: 40 },
      { icon: "scroll", x: 46, from: 1, size: 40 },
    ],
    item: "spyglass",
    itemFrom: 2,
    itemX: 62,
    lines: ["Our fourth ship came back with strange fruit and stories.", "Islands, coasts and peoples nobody here had seen.", "The map keeps growing, and so do we."],
  },
};

// Ticks between two lessons, so they never pile up.
export const LESSON_GAP = 40;
// Big moments (an event card, a raid, an elder lesson, an outbreak out of
// nowhere) never start within this many ticks of each other: one at a time.
export const QUIET_GAP = 40;

// Falling behind the world: reach the next era within this many ticks of the
// tutorial ending (40 ticks = a minute at 1x), or the tribe is left behind and
// the game is lost. Faster on harder difficulties. A warning shows for the last
// `LEFT_BEHIND_WARN` ticks. Only the Stone Age for now: the Ancient era already
// ends with the Roman legion.
export const ERA_DEADLINE: Record<string, number> = { first: 75 * 40, easy: 60 * 40, normal: 45 * 40, hard: 30 * 40 };
export const LEFT_BEHIND_WARN = 200;

// Picking people up and dropping them somewhere (just for fun, with consequences).
// A person dropped on a working building helps there: +`helpBoost` output for
// `helpTicks`. One who wanders into the fog comes back after `fogTicks`, with
// news of new land only `fogLuck` of the time (5%: scouting is the real way to explore), revealing `fogReveal` tiles around.
export const DROP = { helpBoost: 0.5, helpTicks: 20, fogTicks: 20, fogLuck: 0.05, fogReveal: 2 };
// Someone dropped into a fire or the open sea dies, and the tribe grieves: each
// death costs `happiness`, taken off after the 0-100 cap so it always shows. It
// adds up with every death (to `max`) and fades over `ticks` (3 minutes). Two
// close together can tip a tribe into unrest: killing people never pays.
export const GRIEF = { happiness: 35, ticks: 120, max: 100 };
// People with no roof over their heads (more people than homes have room
// for): each costs `mood` happiness (up to `maxMood`), and each adds `outbreak`
// to the chance of sickness breaking out every tick, on top of the crowding
// that already spreads it faster.
export const HOMELESS = { mood: 2, maxMood: 15, outbreak: 0.004 };
export const PEOPLE_NAMES = ["Aru", "Mira", "Tok", "Ena", "Bram", "Kaya", "Oro", "Lin", "Senu", "Tavi", "Ilo", "Deka", "Runa", "Pim"];

// Chief level: XP only ever goes up, so progress is always easy to see. Each
// level gives a title and a little Knowledge.
export const XP = {
  drought: 60,
  build: 5,
  firstBuild: 10,
  person: 2,
  research: 20,
  raidWon: 15,
  plant: 3,
  era: 50,
  // Every `minuteTicks` (a minute at 1x): everyone fed, and the land healthy.
  fedMinute: 2,
  healthyMinute: 2,
  minuteTicks: 40,
  levelKnowledge: 2,
};
export const CHIEF_TITLES = [
  "Wanderer",
  "Fire-keeper",
  "Forager",
  "Hunter",
  "Elder",
  "Chief",
  "Wise Chief",
  "High Chief",
  "Great Chief",
  "Founder",
  "Legend",
];
// Total XP needed to reach a level (level 1 needs none).
export function xpToReach(level: number) {
  return 25 * (level - 1) * level;
}
export function chiefTitle(level: number) {
  return CHIEF_TITLES[Math.min(level, CHIEF_TITLES.length) - 1];
}

// Raiders come in three kinds (the banner says which). `size` scales the usual
// raid strength. If they win (or you hide), `steal` is the share of food and wood
// they take; a fire raid also burns one building, even if you hide.
export const RAID_KINDS: Record<
  RaidKind,
  { name: string; size: number; wants: string; steal: { food: number; wood: number }; hide: { food: number; wood: number }; burns: boolean }
> = {
  band: { name: "A small band", size: 0.7, wants: "They are after wood.", steal: { food: 0, wood: 0.4 }, hide: { food: 0, wood: 0.25 }, burns: false },
  party: { name: "A war party", size: 1.35, wants: "They want food and wood.", steal: { food: 0.35, wood: 0.35 }, hide: { food: 0.2, wood: 0.2 }, burns: false },
  fire: { name: "A fire raid", size: 1.1, wants: "They carry torches: they will burn a building.", steal: { food: 0.15, wood: 0 }, hide: { food: 0, wood: 0 }, burns: true },
};

// When raiders land the player picks a response before they arrive: fight (the
// battle plays out over `fightTicks`, and training more warriors can still tip
// it), hide in the houses (nobody dies, they take a share) or pay tribute (food,
// `tributePerRaider` each; they leave but come back `tributeSooner` ticks sooner).
export const RAID_RESPONSE = { fightTicks: 7, tributePerRaider: 4, tributeSooner: 60, hideMood: 4 };

// A watch fire on the shore sees raiders earlier and adds a little defense.
export const WATCH_FIRE = { warnTicks: 8, defense: 1, maxDefense: 2, smoke: 1 };

// Famine is hard but you can come back from it: while the stores are empty about
// one person dies every 10 s (at 1x) and everyone is unhappy, and the tribe is lost
// only if it lasts the difficulty's famineLimit (Normal: 80 ticks, 2 minutes).
// Three emergency measures buy time, each at a price.
export const FAMINE = {
  deathsPerTick: 0.15,
  happiness: 15,
  // Strip the nearby forest for roots, nuts and game.
  forage: { food: 15, forestLoss: 0.3, tiles: 3, cooldown: 40 },
  // Slaughter a Livestock Pen's animals (the pen is gone).
  pen: { food: 30 },
  // Eat the grain saved for sowing: fields grow half as much for a while.
  seed: { food: 25, farmLoss: 0.5, ticks: 80 },
  // In the great drought the famine clock runs this fast (people ration).
  droughtClock: 0.5,
  // Each tick, this share of the people the town can't feed leave to look for food.
  leaveShare: 0.02,
};
// Land collapse: if Sustainability stays below `level` for `ticks` (80 ticks = 2 min
// at 1x), the land can no longer feed the tribe and the game is lost. A countdown
// warning shows the whole time; climbing back above the level winds it down.
export const COLLAPSE = { level: 20, ticks: 80 };

// Leaving the Stone Age: research Agriculture and grow to this many people.
export const NEXT_ERA_POPULATION = 15;
// Population control: families can set off to start a village of their own
// (`size` at a time, never leaving fewer than `keep`).
export const SETTLERS = { size: 4, keep: 5 };

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
  // Growing the tribe teaches a little, once: +1 when it first reaches 10 people.
  population: [10],
  populationReward: 1,
  firstRaidWon: 6,
  firstPlanted: 4,
};

// The first `trips` scouting trips teach the tribe: +2 Knowledge if a trip maps
// at least `bigTrip` new land tiles, +1 otherwise. Later trips teach nothing new.
// Teaching buildings: the first of each kind teaches fully; every extra one
// adds only `extra` of its Knowledge (there are only so many elders to teach).
export const TEACHING = { extra: 0.5, buildings: ["elder", "school", "academy"] };
// The secret found by building 2 Elder's Huts.
export const CAVE_PAINTINGS_KNOWLEDGE = 8;
export const SCOUT_KNOWLEDGE = { bigTrip: 20, trips: 5 };
// A scouting trip takes this long (18 s at normal speed) before the new land
// is mapped. During the tutorial it is instant (the clock stands still there).
export const SCOUT_TRIP = { ticks: 12 };
// Canoes (Rafts & Fishing, from a Canoe Dock): a trip takes `ticks` (45 s).
// The first finds the Southern Isles (island 3), where outposts can then be
// built; after that a trip fishes the open sea (+`fish` food). Every trip
// needs a new canoe, cut from one big tree (`tree` growth off the biggest
// forest near home); with no big tree left there are no canoes. Canoes can't
// reach the kingdoms or the Misty Isle: that takes Ocean Ships. Each building
// on an outpost island costs `fragile` Sustainability: small islands recover
// slowly.
export const CANOE = { cost: { wood: 15, food: 10 }, ticks: 30, fish: 25, tree: 0.35, bigTree: 0.5, island: 3, fragile: 2 };
// Rebellions, from the Medieval era (`era`). If happiness is under `mood`,
// unrest brews for `warnTicks` (90 s); if it climbs back over `mood` by then it
// dies down. If not, a `share` of the people (at least `min`) take up arms.
// Crush them with warriors (each rebel fights at `strength`; people die on both
// sides and happiness drops `crushMood`), or meet their demands (`demand` per
// rebel; they go home and happiness rises `demandMood`). Left alone for
// `sackTicks` (2 minutes) they sack the stores (`sack` of food and coins) and
// leave for good. None again for `cooldown` ticks after one ends.
export const REBELLION = {
  era: 3,
  mood: 30,
  warnTicks: 60,
  share: 0.15,
  min: 3,
  strength: 1,
  crushMood: 12,
  demand: { currency: 15, food: 8 },
  demandMood: 20,
  sackTicks: 80,
  sack: 0.3,
  cooldown: 300,
};

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
export const ROMAN_LEGION = { warningYear: -1600, warningTicks: 90, strengthEach: 2, base: 8, perPeople: 5 };

// Leaving the Ancient era: beat the Roman legion, research Coinage and grow to
// this many people.
export const CLASSICAL_POPULATION = 40;
// After the legion is beaten the Ancient-era clock starts: reach the Classical
// era within this many ticks or be left behind (40 ticks = a minute at 1x).
export const ANCIENT_DEADLINE: Record<string, number> = { first: 30 * 40, easy: 25 * 40, normal: 20 * 40, hard: 15 * 40 };

// Water in the Classical era. In a normal year rain and the river are plenty; in
// the drought only springs (`base`), wells and aqueducts keep water flowing, each
// for this many people. Past `wellsFree` wells the ground dries out (−`wellSustain`
// Sustainability each). Aqueducts water fields within `aqueductReach` (+`aqueductFarm`);
// watermills grind for fields within `millReach` (+`millFarm`).
export const WATER = { base: 10, well: 12, aqueduct: 40, wellsFree: 4, wellSustain: 2, aqueductReach: 3, aqueductFarm: 0.2, millReach: 2, millFarm: 0.25 };

// Towns: each Public Latrine keeps the streets clean for `latrine` people and each
// Bathhouse for `baths`. With Town Houses standing, the share of people without
// clean streets makes sickness start and spread up to `dirty` times more. Baths
// add happiness and help the sick recover.
// Town Houses share walls and hearths: each keeps `warmth` people warm without a campfire.
export const TOWN = { latrine: 25, baths: 10, dirty: 1, bathsMood: 8, bathsRecover: 0.02, warmth: 24 };

// The great drought ends the Classical era. The elders see it coming at `warnYear`;
// it starts `warnTicks` later (3 min at 1x) and lasts `ticks` (3 min). Rain falls to
// `rain`, plus up to `forestRain` more with all the forest standing. Fields an
// aqueduct waters keep at least `aqueductFarm` of their harvest; gatherers and pens
// get `wild`. People without water are miserable (up to −`thirstMood` happiness).
export const DROUGHT = { warnYear: 100, warnTicks: 120, ticks: 120, rain: 0.1, forestRain: 0.3, aqueductFarm: 0.7, wild: 0.5, thirstMood: 20 };

// A caravan to the Silk Steppe leaves from a Market (one per Market at a time) and
// comes back `ticks` later with coins and Knowledge. Sometimes it brings sickness.
export const CARAVAN = { cost: { food: 20, wood: 10 }, ticks: 40, coins: 60, knowledge: 4, sickness: 0.2 };
// Paved roads: trade brings this much more.
export const ROADS_COINS = 1.25;
// Iron weapons: each warrior fights this many times as hard (bronze: 2), and
// every smithy burns this much more charcoal.
export const IRON_STRENGTH = 3;
export const IRON_CHARCOAL = 1.5;
// The Jade Road secret: this many caravans.
export const JADE_ROAD = { caravans: 5, knowledge: 10, happiness: 10 };

// Hard mode: buildings wear out. Each tick a building wears by `perTick` (fully
// worn in about 22 minutes), `busy` times faster for hard-worked ones and
// `sturdy` times as fast for brick and stone. Past `slows` it makes less, down to
// nothing when broken (worn 1); a broken home holds half its people. Repairing
// costs `repairShare` of what it cost to build.
export const WEAR = {
  perTick: 1 / 900,
  busy: 1.5,
  sturdy: 0.6,
  slows: 0.5,
  repairShare: 0.15,
  warnAt: 0.7,
  busyBuildings: ["smithy", "quarry", "woodcutter", "watermill", "baths", "windmill", "shipyard"],
  sturdyBuildings: ["house", "townhouse", "walls", "granary", "school", "academy", "aqueduct", "well", "latrine", "elder", "healer", "castle", "university", "guildhall", "library", "cathedral"],
};
// Natural disasters. The first comes `firstAfter` ticks after the tutorial
// (about 10 minutes), then one every `gap` + up to `spread` ticks. Each is warned
// of `warn` ticks ahead and lasts `ticks`. `weight` is how often each comes up
// (a landslide only where slopes have been stripped, a flood only by water).
export const DISASTERS: {
  firstAfter: number;
  gap: number;
  spread: number;
  kinds: Record<DisasterKind, { name: string; icon: IconId; warn: number; ticks: number; weight: number; warning: string }>;
} = {
  firstAfter: 400,
  gap: 400,
  spread: 280,
  kinds: {
    storm: { name: "A storm", icon: "storm", warn: 15, ticks: 25, weight: 3, warning: "Dark clouds are rolling in from the sea. A storm is coming!" },
    flood: { name: "A flood", icon: "flood", warn: 20, ticks: 40, weight: 2, warning: "The water is rising after days of rain. A flood is coming!" },
    earthquake: { name: "An earthquake", icon: "quake", warn: 5, ticks: 6, weight: 1.5, warning: "The animals are restless and the birds have gone quiet..." },
    landslide: { name: "A landslide", icon: "landslide", warn: 10, ticks: 8, weight: 0, warning: "Stones are tumbling down the bare hillside!" },
  },
};
// How hard each one hits. Storm: every campfire goes out, and each wooden
// building has `storm.wreck` chance to be wrecked (at most `storm.max`), unless
// `storm.shelter` forest tiles next to it break the wind. Flood: up to
// `flood.tiles` low tiles by the river or sea go under (fewer with more forest
// standing); their buildings stop working, then fields there grow +`flood.silt`
// for `flood.siltTicks`. Earthquake: buildings within `quake.radius` fall with
// `quake.stone` (brick and stone) or `quake.wood` chance, at most `quake.max`.
// Landslide: a hill with `slide.bare` or more bare neighbours buries what is
// below it.
export const DISASTER_HITS = {
  storm: { wreck: 0.3, max: 2, shelter: 2 },
  flood: { tiles: 8, radius: 6, silt: 0.4, siltTicks: 160, sickness: 2 },
  quake: { radius: 4, stone: 0.25, wood: 0.08, max: 3, deaths: 1 },
  slide: { bare: 3, radius: 7 },
};
// Buildings of brick and stone (they crack in an earthquake) and of wood
// (a storm can wreck them).
export const STONE_BUILDINGS = ["house", "school", "smithy", "granary", "walls", "quarry", "elder", "healer", "well", "aqueduct", "townhouse", "latrine", "baths", "academy", "castle", "guildhall", "university"];
export const WOOD_BUILDINGS = ["hut", "gatherer", "woodcutter", "fishing", "pen", "warcamp", "watchfire", "forester", "market", "watermill", "windmill", "shipyard", "tradingpost"];

// ---- Medieval era ---------------------------------------------------------
// The two kingdoms: how they feel about us at first. Mood runs from -100 to 100:
// `friendly` or more is friendly, `hostile` or less is hostile (their armies
// raid us); in between they are wary. Mood drifts back toward 0 by `drift` a
// tick (a treaty holds it at `treatyFloor` or more). A gift costs `gift.coins`
// (more each time) and waits `gift.wait` ticks; a treaty costs `treaty.coins`.
export const KINGDOMS: Record<KingdomId, { name: string; start: number; blurb: string }> = {
  steppe: { name: "the Silk Steppe", start: 25, blurb: "Traders and horse herders. They like silver and fair deals." },
  reach: { name: "the Eastern Reach", start: -10, blurb: "A proud kingdom with a big army. They watch our walls." },
};
export const DIPLOMACY = {
  friendly: 30,
  hostile: -30,
  drift: 0.03,
  treatyFloor: 20,
  gift: { coins: 40, more: 20, mood: 15, wait: 30 },
  treaty: { coins: 60, trade: 0.25 },
  caravanMood: 6,
  castleMood: -12,
  raidWonMood: 5,
  closeHarbourMood: -15,
};
// Ships from a Shipyard (or the Grand Harbour): each costs `cost` and is back
// `ticks` later. The first finds an island to settle, then the kingdoms'
// coasts, then more islands; after that each voyage brings trade.
export const SHIP = { cost: { wood: 30, food: 20 }, ticks: 50, coins: 70, mood: 5, meetMood: 10, secret: 4, secretKnowledge: 12, secretHappiness: 10 };
// Overseas outposts: build as much as fits on the islands your ships have
// found, but each building there costs coins every tick (sailors, supplies),
// and each one more than the last: the nth costs upkeep * (1 + growth * (n-1)).
// They only work while a Shipyard or the Grand Harbour links them home, and
// stop when the upkeep can't be paid.
export const OUTPOST = { upkeep: 0.05, growth: 0.15 };
// Raiding a kingdom (Medieval era): `share` of our warriors sail over. They
// win if their strength, with luck (x0.75 to x1.25), beats the kingdom's
// `defense`. A win brings back `loot` and costs `losses.won` of those sent; a
// loss costs `losses.lost` of them and brings nothing. Either way the kingdom
// turns hostile (mood moves by `mood`, ending at least at hostile), and its
// army comes for revenge within `revengeTicks`, `revengeSize` times bigger
// than a normal army. Our warriors then need `wait` ticks before another raid.
export const KINGDOM_RAID = {
  minWarriors: 5,
  share: 0.6,
  defense: { steppe: 16, reach: 28 } as Record<KingdomId, number>,
  loot: { steppe: { currency: 150, food: 40 }, reach: { currency: 90, food: 90 } } as Record<KingdomId, Partial<Resources>>,
  losses: { won: 0.2, lost: 0.6 },
  mood: -70,
  revengeTicks: 50,
  revengeSize: 1.5,
  wait: 150,
};

// Castles and knights.
export const CASTLE = { defense: 15, warriors: 10 };
export const KNIGHTS = { strength: 4, food: 1.5 };
export const FARMING = { plough: 1.25, rotation: 1.1, rotationStrain: 0.5, windmill: 0.2, windmillReach: 2, windmillEnergy: 10 };
export const LEARNING = { universityLiteracy: 20, printingKnowledge: 1.3, printingLiteracy: 15, guildTools: 0.1, guildMood: 3 };
// The Black Death: warned of when the year comes, it arrives by ship
// `warnTicks` later and lasts `ticks`. `deaths` is the share of the town it
// takes over the whole time, by difficulty: [with nothing ready, fully ready
// (`maxProtection`)]. Readiness in between scales it; an open harbour full of
// ships (negative readiness) makes it worse still.
export const PLAGUE = {
  // It reached Europe's ports in 1347. The warning comes `warnTicks` before
  // (90 ticks x 0.6 years = 54 years earlier on the in-game calendar).
  arriveYear: 1347,
  warnYear: 1347 - 90 * 0.6,
  warnTicks: 90,
  ticks: 180,
  deaths: { first: [0.2, 0.05], easy: [0.2, 0.05], normal: [0.3, 0.08], hard: [0.45, 0.1] } as Record<DifficultyId, [number, number]>,
  sickShare: 0.25,
  maxProtection: 0.85,
  protection: { quarantine: 0.25, closedEarly: 0.3, closedLate: 0.12, sanitation: 0.15, healer: 0.05, healersMax: 3, cathedral: 0.05 },
  // Every ship link to the world (a harbour, shipyard, trading post or open
  // treaty) makes it worse while the harbour stays open.
  openRisk: 0.04,
};

// Buying something that leaves less wood than this shows a "save up" warning.
export const LOW_WOOD_AFTER_BUY = 10;

// After the tutorial, how long (ticks) before the first event, the first raid,
// and the first disease that isn't the player's own choice. The early game is calm.
export const GRACE_AFTER_TUTORIAL = { event: 80, raid: 220, disease: 200 };

// Time between event cards and between raids once they have started (ticks):
// `base` plus up to `spread` more.
export const EVENT_GAP = { base: 100, spread: 60 };
export const RAID_GAP = { base: 170, spread: 80 };

// Small moments: little things that happen every 30-60 s after the tutorial so
// the island feels alive between the big events (a herd passes, a baby is born,
// wind blows out a fire). Most depend on the state of the land. They are only a
// line in the log, never a big moment, so QUIET_GAP ignores them.
export const SMALL_MOMENTS = { firstAfter: 20, base: 20, spread: 20 };

export const AFTER_TUTORIAL_RESERVE: Partial<Resources> = { food: 40, wood: 10 };
// Of that reserve, this much food is in the stores from the very start (so the
// food count isn't an alarming 0 during the tutorial); the rest comes at the end.
export const TUTORIAL_START_FOOD = 20;

// `buys` lists what the step pays for: building ids, "scout", "train" or an
// advancement id. The starting resources are worked out from it. `text` is one
// short line (the hand shows where to click); `more` is the why, behind "Tell
// me more". Everything else is learned by playing: the goal line, the coach
// after each advancement, and Elder Ama when something new happens.
export const TUTORIAL: { text: string; more: string; done: string; unlocks: string[]; buys: string[] }[] = [
  {
    text: "Our people are cold. Place a Campfire on open grass.",
    more: "A fire keeps people warm and cooks their food. Every building shows what it gives us and what it costs the land.",
    done: "campfire",
    unlocks: ["campfire"],
    buys: ["campfire"],
  },
  {
    text: "Fires need wood. Place a Woodcutter in the forest.",
    more: "The stumps in a building's corner show how hard it is on the land: more stumps, more harm. A tree takes years to grow back and a moment to cut.",
    done: "woodcutter",
    unlocks: ["woodcutter"],
    buys: ["woodcutter"],
  },
  {
    text: "Now a roof. Build a Wooden House, away from the fire.",
    more: "More homes let more families join us. Sparks can set wood alight, so leave a patch of ground between a house and a fire.",
    done: "hut",
    unlocks: ["hut"],
    buys: ["hut"],
  },
  {
    text: "Hungry bellies. Place a Gatherer's Camp for wild food.",
    more: "Berry bushes give more. The wild only has so much to give, so too many camps hunt the animals faster than they can have young.",
    done: "gatherer",
    unlocks: ["gatherer"],
    buys: ["gatherer"],
  },
  {
    text: "Open Advancements and learn Early Farming.",
    more: "Every first thing we do teaches us something: that is Knowledge, the bulb at the top. Spend it in Advancements to learn new things.",
    done: "early-farming",
    unlocks: ["advancements"],
    buys: ["early-farming"],
  },
];
