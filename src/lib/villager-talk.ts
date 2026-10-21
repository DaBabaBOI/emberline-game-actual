// Talking to villagers (first person): who a villager is (the same each time
// for the same figure), how the village is doing in a few lines, and a line of
// theirs back. Their words come from Gemini through the same Edge Function as
// Elder Ama (kind: "villager", with its own allowance); offline, when it's
// busy, or after a long chat, they fall back to lines of the game's own.
import { BUILDINGS_BY_ID, ERAS, formatYear } from "@/game/content";
import { consumption, countBuildings, currentGoal, housingCapacity, production, warnings } from "@/game/engine";
import type { GameState, Tile } from "@/game/types";
import { isOffensive } from "./names";
import { PUBLISHABLE_KEY, SUPABASE_URL } from "./online";

const FUNCTION = "clever-endpoint";
// The most lines a villager speaks from Gemini in one talk (then their own).
export const MAX_ASKS = 8;

const NATURES = [
  "cheerful and chatty",
  "gruff but loyal",
  "shy and gentle",
  "proud of their work",
  "curious about everything",
  "a born worrier",
  "a joker who teases everyone",
  "a dreamer who loves the stars",
  "hard-working and always a bit tired",
  "brave and restless",
  "kind and motherly",
  "young and eager to prove themselves",
];

export interface Villager {
  index: number;
  name: string;
  nature: string;
  // What they're doing now, in words; and where they work, if anywhere.
  doing: string;
  job: string | null;
}

const hash = (n: number) => {
  const x = Math.sin(n * 12.9898 + 4.1) * 43758.5453;
  return x - Math.floor(x);
};

export function villagerOf(index: number, name: string, walker: { workAt?: Tile | null; goWork?: Tile | null; sitAt?: Tile | null } | undefined): Villager {
  const place = walker?.workAt ?? walker?.goWork ?? null;
  const job = place?.building ? (BUILDINGS_BY_ID[place.building]?.name ?? null) : null;
  const doing = walker?.workAt && job
    ? `working at the ${job}`
    : walker?.goWork && job
      ? `on the way to work at the ${job}`
      : walker?.sitAt
        ? "resting by the campfire, with no work of their own just now"
        : "wandering the village, with no work of their own just now";
  return { index, name, nature: NATURES[Math.floor(hash(index) * NATURES.length)], doing, job };
}

function describe(v: Villager) {
  return `Your name is ${v.name}. You are ${v.nature}. Right now you are ${v.doing}.`;
}

const level = (n: number) => (n >= 75 ? "high" : n >= 50 ? "fair" : n >= 30 ? "low" : "very low");

// How the village is, as a villager would know it.
export function villageNow(state: GameState): string {
  const lines: string[] = [];
  const era = ERAS[state.era]?.name ?? "Stone Age";
  lines.push(`Era: ${era}. Year ${formatYear(state.year)}.`);
  const people = Math.floor(state.population);
  const homes = housingCapacity(state);
  lines.push(`People: ${people}, homes for ${homes}${people > homes ? " (some sleep outside)" : ""}.`);
  const net = production(state).food - consumption(state);
  const food = state.famineTicks > 0 ? "a famine: people are going hungry" : state.resources.food < 20 ? "running low" : net < 0 ? "plenty stored, but we eat more than we gather" : "plenty, and more coming in";
  lines.push(`Food: ${food}.`);
  const m = state.meters as Record<string, number>;
  lines.push(`Happiness ${level(m.happiness ?? 50)}, health ${level(m.health ?? 50)}.`);
  if ((state.sick ?? 0) > 0) lines.push(`${Math.round(state.sick ?? 0)} people are sick.`);
  const raid = state.raid;
  if (raid && raid.fightStart !== undefined) lines.push("Raiders are fighting our warriors right now!");
  else if (raid) lines.push(`Raiders have been seen landing on the shore: ${raid.strength} of them.`);
  if (state.strike) lines.push("Our warriors have gone in canoes to burn the raiders' camp.");
  const built = Object.entries(countBuildings(state))
    .filter(([, n]) => n)
    .map(([id, n]) => `${BUILDINGS_BY_ID[id]?.name ?? id} x${n}`)
    .slice(0, 10);
  if (built.length) lines.push(`The village has: ${built.join(", ")}.`);
  const w = warnings(state)
    .slice(0, 2)
    .map((x) => x.text.replace("{secs}", "a few"));
  if (w.length) lines.push(`Worries: ${w.join(" | ")}`);
  if (state.log.length) lines.push(`Lately: ${state.log.slice(0, 3).join(" | ")}`);
  const goal = currentGoal(state);
  if (goal) lines.push(`What the Chief is working towards: ${goal}`);
  return lines.join("\n").slice(0, 1500);
}

export type Line = { who: "chief" | "them"; text: string };

// A line of theirs back to what the Chief said ("" = they just walked up).
export async function talk(v: Villager, say: string, history: Line[], state: GameState, asked: number): Promise<{ line: string; offline: boolean }> {
  const said = history.filter((l) => l.who === "them").map((l) => l.text);
  if (say && isOffensive(say)) return { line: pick(v, ["That's no way to talk by the fire, Chief.", "Hm. Let's speak kindly, Chief. There's work to do."], said), offline: true };
  if (asked >= MAX_ASKS) return { line: ownLine(v, state, say, said), offline: true };
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/${FUNCTION}`, {
      method: "POST",
      // A villager answers quickly or not at all.
      signal: AbortSignal.timeout(10000),
      headers: { apikey: PUBLISHABLE_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "villager", villager: describe(v), town: villageNow(state), say: say.slice(0, 160), history: history.slice(-6) }),
    });
    if (!res.ok) throw new Error(String(res.status));
    const data = (await res.json()) as { answer?: string };
    if (!data.answer) throw new Error("empty");
    return { line: data.answer, offline: false };
  } catch {
    return { line: ownLine(v, state, say, said), offline: true };
  }
}

// One of the options, not one they've just said (when there's another).
function pick(v: Villager, options: string[], said: string[] = []) {
  const fresh = options.filter((o) => !said.includes(o));
  const from = fresh.length ? fresh : options;
  return from[Math.floor(hash(v.index * 7 + said.length * 13 + Date.now() / 1000) * from.length) % from.length];
}

// The game's own lines: an answer to what the Chief asked (work, news, how
// they are), or what's on their mind, by how the village is doing.
export function ownLine(v: Villager, state: GameState, say = "", said: string[] = []): string {
  const where = v.job ? `I'm at the ${v.job} for now, but I'll go where you send me.` : "Where should I work, Chief?";
  const happy = (state.meters as Record<string, number>).happiness ?? 50;
  const homeless = Math.floor(state.population) > housingCapacity(state);
  // What's on their mind, worst first.
  const worries = [
    ...(state.raid ? ["Raiders, Chief! Tell me where I'm needed and I'll run.", "I heard the drums on the shore. Are we ready for them?"] : []),
    ...(state.famineTicks > 0 ? [`My belly is louder than the raiders' drums, Chief.`, "The pots are empty. Is there a field that needs hands?"] : []),
    ...((state.sick ?? 0) > 0 ? ["Half my neighbours are coughing, Chief. I hope the healers know what they're doing.", "I'm well, thank the fire. Others aren't so lucky."] : []),
    ...(homeless ? ["Some of us sleep under the stars, Chief, and the nights are cold.", "A roof over every head would be nice, Chief."] : []),
  ];
  const content = happy >= 70 ? ["Good days, Chief! The fire's warm and the bellies are full.", "The children were laughing all morning. You did that, Chief."] : ["Can't complain, Chief. Well, I could, but who'd listen?", "Busy, Chief, like everyone. The days go by fast."];
  if (/work|job|where/i.test(say)) return pick(v, [`Anywhere I'm useful, Chief. ${where}`, `Point me to it and I'll go. ${where}`, `I've strong arms and a stubborn back. ${where}`], said);
  if (/news|new|happen|heard|gossip/i.test(say)) {
    // Village news, not Elder Ama's advice (or the dev tools).
    const news = state.log
      .filter((l) => !/^(Elder Ama|Dev:|Milestone)/.test(l))
      .slice(0, 3)
      .map((l) => `Have you heard, Chief? ${l}`);
    return pick(v, news.length ? news : ["Nothing much, Chief. The fire burns, the sea rolls in, the same as yesterday."], said);
  }
  if (/how are|how're|feel|happy|ok\b|okay|well\?/i.test(say)) return pick(v, [...worries.slice(0, 2), ...content], said);
  if (!say) return pick(v, [...worries.slice(0, 2), `Morning, Chief. ${where}`, `Chief! I was hoping you'd come by. ${where}`], said);
  return pick(v, [...worries.slice(0, 2), ...content, "Hm, I'll think on that, Chief.", "If you say so, Chief!"], said);
}

// What they say when the Chief sends them to work somewhere.
export function jobLine(v: Villager, place: string): string {
  return pick(v, [
    `The ${place} it is, Chief! I'll be there before the fire burns low.`,
    `${place}? I know that work. Leave it to me.`,
    `Off to the ${place}, then. Wish me luck!`,
    `Right away, Chief. The ${place} won't know what hit it.`,
  ]);
}
