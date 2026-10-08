// Easter eggs. Each one found is counted with the other secrets ("Secrets
// found" in Advancements) as `egg-<id>`.
//
// - Team cameos: name your people after someone on the team (or "Emberline
//   team" for all four) and they join the tribe, wearing a gold crown.
// - Elder Ama: poke her picture ten times.
// - Fireworks: the Konami code (up up down down left right left right B A).
// - A golden deer, very rarely, in the forest.
// - A message in a bottle, sometimes, on the beach.
// - A tiny island far out at sea: click it once you have a canoe.
// - Name eggs: name your people after a friend of the game for a blessing (see
//   NAME_EGGS). The same name twice in a row and the second game is cursed.

export const TEAM = [
  { name: "Prithu", joke: "Prithu has joined the tribe and is already asking for more features." },
  { name: "Aarav", joke: "Aarav has joined the tribe and is rebuilding the village gate in plain HTML." },
  { name: "Vagisha", joke: "Vagisha has joined the tribe and is checking every fact the elders tell." },
  { name: "Aaradhya", joke: "Aaradhya has joined the tribe and is painting the cave walls." },
] as const;

// Who from the team joins a people with this name.
export function cameosFor(nation: string | undefined) {
  const name = (nation ?? "").toLowerCase();
  if (/emberline team|\bteam emberline\b/.test(name)) return [...TEAM];
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

// ---- Name eggs ------------------------------------------------------------------
// A people named after a friend of the game (or close to the name) is blessed
// for the whole game. Start a new game with the same egg straight after and
// that one is cursed instead (the title screen remembers the last egg used);
// the one after is blessed again. Not in multiplayer.
export type NameEggId = "prithu" | "suveer" | "advik";

export const NAME_EGGS: Record<
  NameEggId,
  { name: string; also: RegExp; blessing: string; curse: string; card: { title: string; lines: string[] }; curseCard: { title: string; lines: string[] } }
> = {
  prithu: {
    name: "prithu",
    also: /pr[iy]+th/,
    card: {
      title: "The Founder's Blessing",
      lines: [
        "The one who lit the very first ember of Emberline walks among your people.",
        "Every meter stays at 100, for the whole game.",
        "(He is already asking the elders for more features.)",
      ],
    },
    curseCard: {
      title: "The Founder Is Busy",
      lines: [
        "You called on Prithu twice in a row. He is busy fixing bugs.",
        "Every meter is 20 lower, for the whole game.",
        "Pick another name next time, and his blessing comes back.",
      ],
    },
    blessing: "Prithu's blessing: every meter stays at 100, for the whole game.",
    curse: "Prithu again? The spirits are tired of the same name: every meter is 20 lower, for the whole game.",
  },
  suveer: {
    name: "suveer",
    also: /suv[ie]+r/,
    card: {
      title: "The Pathfinder's Blessing",
      lines: [
        "Suveer knows every path on these islands, and never once needed a map.",
        "Scouts go for free. Nobody here needs schooling: literacy is full, and no advancement asks for a school.",
      ],
    },
    curseCard: {
      title: "Suveer Got Lost",
      lines: ["Twice in a row? Suveer took a wrong turn somewhere.", "Scouts cost double, and reading comes slowly (literacy is halved).", "Pick another name next time, and his blessing comes back."],
    },
    blessing: "Suveer's blessing: nobody here needs to learn to read (literacy is full, and no advancement asks for a school), and scouts go for free.",
    curse: "Suveer again? Scouts cost double, and reading comes slowly (literacy is halved).",
  },
  advik: {
    name: "advik",
    also: /adv[ie]+k/,
    card: {
      title: "The Joyful Blessing",
      lines: ["Advik's laugh carries right across the island, and nobody can stay grumpy for long.", "+50 happiness, for the whole game."],
    },
    curseCard: {
      title: "Advik Is Grumpy Today",
      lines: ["The same name twice? Advik is not amused.", "-30 happiness, for the whole game.", "Pick another name next time, and his blessing comes back."],
    },
    blessing: "Advik's blessing: everyone is cheerful (+50 happiness, for the whole game).",
    curse: "Advik again? A gloom settles over the tribe (-30 happiness, for the whole game).",
  },
};

// Same word, or one letter added, missing or changed.
function oneOff(a: string, b: string) {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  if (i === a.length && i === b.length) return true;
  return a.slice(i + 1) === b.slice(i + 1) || a.slice(i + 1) === b.slice(i) || a.slice(i) === b.slice(i + 1);
}

// Which name egg a people's name calls up, if any.
export function nameEggOf(nation: string | undefined): NameEggId | null {
  const words = (nation ?? "").toLowerCase().split(/[^a-z]+/).filter(Boolean);
  const joined = words.join("");
  for (const id of Object.keys(NAME_EGGS) as NameEggId[]) {
    const egg = NAME_EGGS[id];
    if (words.some((w) => oneOff(w, egg.name)) || egg.also.test(joined)) return id;
  }
  return null;
}

// What the name eggs do to the meters (computeMeters).
export function nameEggMeters<T extends Record<"food" | "shelter" | "happiness" | "literacy" | "energy" | "sustainability", number>>(
  egg: { id: NameEggId; cursed: boolean } | undefined,
  meters: T,
): T {
  if (!egg) return meters;
  const m = { ...meters };
  const keys = Object.keys(m) as (keyof T & string)[];
  if (egg.id === "prithu") for (const k of keys) (m[k] as number) = egg.cursed ? Math.max(0, (m[k] as number) - 20) : 100;
  if (egg.id === "suveer") m.literacy = egg.cursed ? Math.round(m.literacy / 2) : 100;
  if (egg.id === "advik") m.happiness = egg.cursed ? Math.max(0, m.happiness - 30) : Math.min(100, m.happiness + 50);
  return m;
}

// The buildings that teach people to read (Suveer's blessing: never needed for an advancement).
export const LITERACY_BUILDINGS = ["elder", "school", "academy", "university", "library"];
