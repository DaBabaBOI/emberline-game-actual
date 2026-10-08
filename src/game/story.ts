// Story mode: "The Ember Keepers". A fixed story told across the six eras, in
// thirteen chapters, ending with the Ember Ark. Each chapter opens with a short
// scene between the characters, sets two or three objectives, and closes with a
// line and a reward. The engine checks the objectives (storyObjectiveDone).
//
// The tribe fled the dry lands with one ember, carried in Elder Ama's clay pot:
// as long as the ember lives, the people live. In every age there is an Ama
// (every elder takes her name), a Kito (the bold one) and a Lina (the maker),
// and the ember is passed down, all the way to the stars.

import type { MeterKey, ResourceKey, Resources } from "./types";

export type Speaker = "ama" | "kito" | "lina" | "narrator";

export const CAST: Record<Speaker, { name: string; icon: string; badge?: string; color: string }> = {
  ama: { name: "Elder Ama", icon: "elder", color: "#a855f7" },
  kito: { name: "Kito", icon: "person", badge: "spear", color: "#dc2626" },
  lina: { name: "Lina", icon: "person", badge: "hammer", color: "#16a34a" },
  narrator: { name: "", icon: "flame", color: "#f59e0b" },
};

export type Objective =
  | { label: string; kind: "have"; building: string | string[]; amount: number }
  | { label: string; kind: "researched"; id: string }
  | { label: string; kind: "population"; amount: number }
  | { label: string; kind: "stored"; resource: ResourceKey; amount: number }
  | { label: string; kind: "meter"; key: MeterKey; min: number }
  | { label: string; kind: "soldiers"; amount: number }
  | { label: string; kind: "flag"; flag: "legionDone" | "droughtDone" | "plagueDone" | "climateDone" | "tippingDone" | "typeOne" | "finished" }
  | { label: string; kind: "landmark" }
  | { label: string; kind: "water" }
  | { label: string; kind: "friendly" }
  | { label: string; kind: "space"; id: string };

export interface Chapter {
  id: string;
  title: string;
  // The era this chapter belongs to (its scene shows that era).
  era: number;
  intro: [Speaker, string][];
  objectives: Objective[];
  outro?: [Speaker, string][];
  reward?: Partial<Resources>;
}

const CLEAN_POWER = ["windfarm", "solarfarm", "hydrodam"];

export const CHAPTERS: Chapter[] = [
  {
    id: "last-ember",
    title: "The Last Ember",
    era: 0,
    intro: [
      ["narrator", "Many days' walk behind them, the old lands had turned to dust. The rivers dried, the forests burned, and the people left."],
      ["ama", "Only one ember survived the journey. I carried it in this clay pot the whole way, and fed it a twig at a time."],
      ["ama", "Light our fire with it, Chief. As long as the ember lives, our people live."],
      ["kito", "And then we hunt! The forest here is full of deer."],
      ["lina", "First we need roofs, Kito. Look at those clouds. It will rain tonight."],
    ],
    objectives: [
      { label: "Light a campfire with the ember", kind: "have", building: "campfire", amount: 1 },
      { label: "Build 2 Wooden Houses", kind: "have", building: "hut", amount: 2 },
      { label: "Store 40 food", kind: "stored", resource: "food", amount: 40 },
    ],
    outro: [["ama", "The ember is safe in the fire now. Good. Whatever happens, never let it go out."]],
    reward: { knowledge: 10 },
  },
  {
    id: "kitos-hunt",
    title: "Kito's Hunt",
    era: 0,
    intro: [
      ["kito", "Chief! The herds by the river are huge. Give us spears and we'll feed everyone for a year."],
      ["ama", "That is what the old people said too, before the dry lands. Take only what the forest can give back, Kito."],
      ["lina", "If we look after the land, it looks after us. It isn't hard."],
      ["kito", "It is when you're hungry."],
    ],
    objectives: [
      { label: "Learn Hunting Spears", kind: "researched", id: "spears" },
      { label: "Grow to 12 people", kind: "population", amount: 12 },
      { label: "Keep land health at 70 or more", kind: "meter", key: "sustainability", min: 70 },
    ],
    outro: [
      ["kito", "Fine, fine. We left the young ones alone. There are still a lot of deer by the river, you know."],
      ["ama", "And there will be next year too. That is the point, Kito."],
    ],
    reward: { food: 40 },
  },
  {
    id: "seeds",
    title: "Seeds",
    era: 0,
    intro: [
      ["lina", "Look what I found by the river: a grass with seeds you can eat. If we plant them, they come back every year."],
      ["ama", "Then we would never need to walk away again. We could stay."],
      ["kito", "Stay? In one place? Forever?"],
      ["ama", "A people who plant are a people who stay, Kito. Let us see if the land agrees."],
    ],
    objectives: [
      { label: "Learn Agriculture", kind: "researched", id: "agriculture" },
      { label: "Plant 2 fields of Farmland", kind: "have", building: "farm", amount: 2 },
      { label: "Grow to 15 people", kind: "population", amount: 15 },
    ],
    outro: [["ama", "Fields, homes and a fire that never goes out. A new age begins for us."]],
    reward: { knowledge: 20 },
  },
  {
    id: "mud-and-brick",
    title: "Mud and Brick",
    era: 1,
    intro: [
      ["narrator", "Generations passed. The first Ama was long gone, but every elder since has taken her name, and kept her ember."],
      ["lina", "Wood rots and burns. But river mud, dried hard in the sun, lasts a lifetime."],
      ["kito", "Houses that don't burn down! Ama would like that."],
      ["ama", "I would. Build to last, children. That is all I have ever asked."],
    ],
    objectives: [
      { label: "Build 3 Mud-brick Houses", kind: "have", building: "house", amount: 3 },
      { label: "Learn Pottery & Storage", kind: "researched", id: "pottery" },
      { label: "Build a Granary", kind: "have", building: "granary", amount: 1 },
    ],
    outro: [["lina", "Jars for the grain, brick for the walls. Let the winter come."]],
    reward: { stone: 30 },
  },
  {
    id: "legion",
    title: "The Legion's Shadow",
    era: 1,
    intro: [
      ["kito", "Ships, Chief! Red shields, hundreds of them. The traders say they mean to take every island in the sea."],
      ["lina", "We have never fought an army."],
      ["ama", "Then we learn, and we stand together. Or not at all."],
    ],
    objectives: [
      { label: "Train 6 warriors", kind: "soldiers", amount: 6 },
      { label: "Build a War Camp", kind: "have", building: "warcamp", amount: 1 },
      { label: "Beat the Roman legion", kind: "flag", flag: "legionDone" },
    ],
    outro: [
      ["kito", "They ran! The red shields ran!"],
      ["ama", "And we are still free. Remember the ones who fell for it."],
    ],
    reward: { knowledge: 25 },
  },
  {
    id: "water",
    title: "Water for All",
    era: 2,
    intro: [
      ["lina", "The town is too big for the river alone. I can dig down to the water under the ground, or bring it from the hills in stone channels."],
      ["ama", "Water for everyone, Lina. Not only for those who live by the river."],
    ],
    objectives: [
      { label: "Build a Well", kind: "have", building: "well", amount: 1 },
      { label: "Build an Aqueduct", kind: "have", building: "aqueduct", amount: 1 },
      { label: "Water for everyone in a dry year", kind: "water" },
    ],
    outro: [["lina", "Clean water in every street. Nobody walks to the river with a jar any more."]],
    reward: { currency: 40 },
  },
  {
    id: "drought",
    title: "The Great Drought",
    era: 2,
    intro: [
      ["ama", "The oldest songs speak of a summer with no rain at all. I can feel it coming, like the first Ama felt the dry lands."],
      ["kito", "Then we fill every granary we have, and we wait it out."],
      ["lina", "And when it's over, we build something that will make the whole sea remember us."],
    ],
    objectives: [
      { label: "Live through the great drought", kind: "flag", flag: "droughtDone" },
      { label: "Finish a great landmark", kind: "landmark" },
    ],
    outro: [["ama", "The rains came back, and so did we. Look at what we built while we waited."]],
    reward: { knowledge: 30 },
  },
  {
    id: "kings",
    title: "Kings Across the Sea",
    era: 3,
    intro: [
      ["kito", "There are kingdoms out there now, Chief. The Silk Steppe, the Eastern Reach. Some send gifts. Some send soldiers."],
      ["lina", "And merchants. Trade beats war, every time."],
      ["ama", "Make friends while you can. It is cheaper than making enemies."],
    ],
    objectives: [
      { label: "Learn Diplomacy", kind: "researched", id: "diplomacy" },
      { label: "Make a kingdom friendly", kind: "friendly" },
    ],
    outro: [["kito", "They gave me a horse! A real horse!"], ["ama", "Do not ride it into the river, Kito."]],
    reward: { currency: 60 },
  },
  {
    id: "plague",
    title: "The Black Death",
    era: 3,
    intro: [
      ["ama", "Sailors bring news of a sickness in the ports. It moves faster than any ship."],
      ["lina", "Then we keep the sick apart, we keep the streets clean, and we close the harbour if we have to."],
      ["kito", "Close the harbour? The merchants will be furious."],
      ["ama", "Better furious than dead."],
    ],
    objectives: [
      { label: "Learn Quarantine", kind: "researched", id: "quarantine" },
      { label: "Live through the plague", kind: "flag", flag: "plagueDone" },
    ],
    outro: [["ama", "So many lost. But the ember still burns, and so do we."]],
    reward: { food: 80 },
  },
  {
    id: "smoke",
    title: "Smoke and Steam",
    era: 4,
    intro: [
      ["lina", "Coal, Chief! One engine works like a hundred horses. We could build anything!"],
      ["kito", "The sky over the factories is black, Lina. The children are coughing."],
      ["ama", "Every fire we light must be watched. That was the very first rule."],
    ],
    objectives: [
      { label: "Build a Factory", kind: "have", building: "factory", amount: 1 },
      { label: "Learn Clean Air Laws", kind: "researched", id: "cleanair" },
      { label: "Build 2 clean power plants (wind, sun or water)", kind: "have", building: CLEAN_POWER, amount: 2 },
    ],
    outro: [["lina", "Power from the wind and the sun. The same work, and the sky stays blue."]],
    reward: { currency: 80 },
  },
  {
    id: "warming",
    title: "The Warming",
    era: 4,
    intro: [
      ["ama", "The scientists say the whole world is warming, and it is our smoke doing it. Everyone's smoke."],
      ["kito", "So what do we do? We can't fight the sky."],
      ["lina", "We stop feeding it. And we help everyone else stop too."],
    ],
    objectives: [
      { label: "Live through the climate crisis", kind: "flag", flag: "climateDone" },
      { label: "Learn Computers", kind: "researched", id: "computers" },
    ],
    outro: [["ama", "We came through it. Not unhurt, but together."]],
    reward: { knowledge: 60 },
  },
  {
    id: "type-one",
    title: "Type One",
    era: 5,
    intro: [
      ["lina", "If every roof had panels and every coast had turbines, the whole planet could run clean. All of it."],
      ["kito", "And then?"],
      ["lina", "Then we can go further than anyone has ever gone."],
    ],
    objectives: [
      { label: "Get past the tipping point", kind: "flag", flag: "tippingDone" },
      { label: "Reach Type I on the Kardashev scale", kind: "flag", flag: "typeOne" },
    ],
    outro: [["ama", "Clean power for the whole world, and the forests still standing. The first Ama would not believe her eyes."]],
    reward: { knowledge: 80 },
  },
  {
    id: "ark",
    title: "The Ember Ark",
    era: 5,
    intro: [
      ["ama", "Fifty thousand years ago, the first Ama carried one ember out of the dry lands, in a clay pot."],
      ["ama", "Every Ama since has kept it. Now it can go further than she ever dreamed."],
      ["kito", "Is there room on that ship for one more explorer?"],
      ["lina", "Room for everyone who wants to go. And seeds from every field we ever planted."],
      ["ama", "Only a people who learned to live in balance can keep a small world alive between the stars. Show them we did."],
    ],
    objectives: [
      { label: "Build the Moon Base", kind: "space", id: "moonbase" },
      { label: "Keep land health at 80 or more", kind: "meter", key: "sustainability", min: 80 },
      { label: "Launch the Ember Ark", kind: "flag", flag: "finished" },
    ],
  },
];
