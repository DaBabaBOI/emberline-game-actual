// Easter eggs. Each one found is counted with the other secrets ("Secrets
// found" in Advancements) as `egg-<id>`.
//
// - Team cameos: name your people after someone on the team (or "SHISTECH"
//   for all four) and they join the tribe, wearing a gold crown.
// - Elder Ama: poke her picture ten times.
// - Fireworks: the Konami code (up up down down left right left right B A).
// - A golden deer, very rarely, in the forest.
// - A message in a bottle, sometimes, on the beach.
// - A tiny island far out at sea: click it once you have a canoe.

export const TEAM = [
  { name: "Prithu", joke: "Prithu has joined the tribe and is already asking for more features." },
  { name: "Aarav", joke: "Aarav has joined the tribe and is rebuilding the village gate in plain HTML." },
  { name: "Vagisha", joke: "Vagisha has joined the tribe and is checking every fact the elders tell." },
  { name: "Aaradhya", joke: "Aaradhya has joined the tribe and is painting the cave walls." },
] as const;

// Who from the team joins a people with this name.
export function cameosFor(nation: string | undefined) {
  const name = (nation ?? "").toLowerCase();
  if (/shistech/.test(name)) return [...TEAM];
  return TEAM.filter((m) => new RegExp(`\\b${m.name.toLowerCase()}\\b`).test(name));
}

export type EggId = "ama" | "fireworks" | "golden-deer" | "bottle" | "islet";

export const EGGS: Record<EggId, { text: string; knowledge?: number; mood?: number }> = {
  ama: { text: "Elder Ama sighs and tells you a secret: the old forest remembers who planted it. (+5 Knowledge)", knowledge: 5 },
  fireworks: { text: "Fireworks light up the sky over the village! Everyone stops to cheer." },
  "golden-deer": { text: "A golden deer! The hunters bring back a feast (+40 food)." },
  bottle: { text: "A message in a bottle washed ashore: \"Whoever finds this: plant a tree for every one you cut.\" (+8 Knowledge)", knowledge: 8 },
  islet: { text: "Our canoe reached the tiny island far out at sea. Under a lone palm: a chest of old shells and a map of the stars. (+25 Knowledge)", knowledge: 25, mood: 5 },
};

export const GOLDEN_DEER_FOOD = 40;
// How often an animal in the forest is the golden deer.
export const GOLDEN_DEER_CHANCE = 0.02;
