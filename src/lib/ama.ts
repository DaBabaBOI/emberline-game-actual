// Ask Elder Ama: sends the player's question and a short summary of their town
// to the Edge Function (supabase/functions/ask-ama, deployed as FUNCTION), which asks Gemini.
// Offline, or when it isn't set up, Ama falls back to the game's own advice.
import { BUILDINGS, CONNECTIONS, ERAS, STREET, TREE } from "@/game/content";
import {
  affordableResearch,
  countBuildings,
  consumption,
  currentGoal,
  goalProgress,
  housingCapacity,
  incomeNow,
  isUnlocked,
  lastProblems,
  powerDemand,
  powerSupply,
  production,
  researchCost,
  warnings,
} from "@/game/engine";
import type { GameState } from "@/game/types";
import { ECONOMY, LEVELS, hasEconomy, incomeLines } from "@/game/economy";
import { LAWS } from "@/game/council";
import { isOffensive } from "./names";
import { PUBLISHABLE_KEY, SUPABASE_URL } from "./online";

// The Supabase Edge Function holding the Gemini key (supabase/functions/ask-ama).
const FUNCTION = "clever-endpoint";

const name = (id: string) => BUILDINGS.find((b) => b.id === id)?.name ?? id;
const round = (n: number) => Math.round(n * 10) / 10;

// The economy in a line or two (for Ama and the villagers): the income
// level and why, how work is organised, wages, fairness.
export function economyFacts(state: GameState): string {
  if (!hasEconomy(state) || !state.income) return "";
  const inc = incomeNow(state);
  const [mid, high] = incomeLines(state);
  const eco = state.economy;
  const parts = inc.parts.map((p) => `${p.label} ${p.value}`).join(", ");
  return `Economy: a ${LEVELS[state.income.level].name.toLowerCase()} nation, ${inc.perPerson} a person a day (middle income from ${mid}, high from ${high}); it comes from ${parts}. ${
    eco
      ? `Work is organised as ${ECONOMY.systems[eco.system].name} (${ECONOMY.systems[eco.system].real}); wages are ${ECONOMY.wages[eco.wage].name.toLowerCase()}${eco.unpaid ? " but there is no money to pay them" : ""}; inequality ${Math.round(eco.inequality)}/100.`
      : "The Chief has not yet chosen how work is organised (Economy button: free market, shared work or mixed)."
  } Challenges now: ${LEVELS[state.income.level].challenges.join(" ")} Goal: ${LEVELS[state.income.level].goal}`;
}

// What Ama knows about the town: numbers, problems, what can be built and
// researched, and the rules about neighbours.
export function townSummary(state: GameState): string {
  const prod = production(state);
  const lines: string[] = [];
  lines.push(`Mode: ${state.mode === "last" ? "Build to Last (reach a clean, healthy town before the deadline)" : "Eras"}. The town is NOW in the ${ERAS[state.era]?.name ?? state.era} era (era ${state.era + 1} of ${ERAS.length}${state.era > 0 ? `; it has already left the ${ERAS.slice(0, state.era).map((e) => e.name).join(", ")}` : ""}${ERAS[state.era + 1] ? `; next comes the ${ERAS[state.era + 1].name} era` : ""}). Year: ${Math.round(state.year)}.`);
  const goal = currentGoal(state);
  if (goal) lines.push(`Current goal: ${goal}`);
  if (state.mode === "last") lines.push(`Big problems: ${lastProblems(state).map((p) => `${p.title} (${p.done ? "solved" : "not yet"})`).join("; ")}`);
  lines.push(`People: ${Math.floor(state.population)}, homes for ${housingCapacity(state)}.`);
  lines.push(`Food: ${Math.round(state.resources.food)} stored, ${round(prod.food - consumption(state))}/s after eating. Wood ${Math.round(state.resources.wood)}, stone ${Math.round(state.resources.stone)}, knowledge ${Math.round(state.resources.knowledge)}, coins ${Math.round(state.resources.currency)}.`);
  lines.push(`Meters (0-100): ${Object.entries(state.meters).map(([k, v]) => `${k} ${Math.round(v as number)}`).join(", ")}.`);
  if (powerSupply(state) || powerDemand(state)) lines.push(`Power: ${round(powerSupply(state))} made, ${round(powerDemand(state))} needed.`);
  const econ = economyFacts(state);
  if (econ) lines.push(econ);
  const council = state.council;
  if (council)
    lines.push(
      `Council of Islands (like the United Nations): ${council.joined ? `we are a member, standing ${Math.round(council.standing)} (-100..100)` : "it has formed; we have not joined (Council button)"}. In force: ${
        council.laws.length ? council.laws.map((l) => `${LAWS[l.id].name} (${LAWS[l.id].keep}${l.broken ? "; we broke it" : ""})`).join("; ") : "nothing"
      }.`,
    );
  const problems = warnings(state).map((w) => w.text.replace("{secs}s", "a few seconds").replace("{secs}", "a few"));
  if (problems.length) lines.push(`Warnings on screen: ${problems.join(" | ")}`);
  const built = Object.entries(countBuildings(state)).filter(([, n]) => n);
  lines.push(`Buildings: ${built.length ? built.map(([id, n]) => `${name(id)} x${n}`).join(", ") : "none yet"}.`);
  const can = BUILDINGS.filter((b) => b.era <= state.era && isUnlocked(state, b)).slice(-14);
  lines.push(`Can build: ${can.map((b) => `${b.name} (${b.description.slice(0, 70)})`).join("; ")}`);
  // Advancements: what is learned, and for each one open now its exact cost and
  // goals, so Ama never has to guess what something needs.
  const learned = TREE.filter((n) => state.researched.includes(n.id) && !n.secret).map((n) => n.name);
  lines.push(`Advancements already learned: ${learned.length ? learned.join(", ") : "none"}.`);
  const ready = new Set(affordableResearch(state).map((n) => n.id));
  const open = TREE.filter(
    (n) => n.era <= state.era && !n.secret && !n.comingSoon && !state.researched.includes(n.id) && n.requires.every((r) => state.researched.includes(r)),
  ).slice(0, 12);
  if (open.length)
    lines.push(
      `Advancements open to learn (these are their ONLY requirements): ${open
        .map((n) => {
          const goals = goalProgress(state, n.id).map((g) => `${g.label} ${g.have}/${g.need}`);
          return `${n.name}: ${researchCost(state, n)} Knowledge${goals.length ? `, goals: ${goals.join("; ")}` : ""}${ready.has(n.id) ? " (can learn now)" : ""}`;
        })
        .join(" | ")}`,
    );
  const locked = TREE.filter(
    (n) => n.era <= state.era && !n.secret && !n.comingSoon && !state.researched.includes(n.id) && !n.requires.every((r) => state.researched.includes(r)),
  ).slice(0, 12);
  if (locked.length)
    lines.push(
      `Locked advancements and the ones each needs first: ${locked
        .map((n) => `${n.name} needs ${n.requires.map((r) => TREE.find((t) => t.id === r)?.name ?? r).join(" and ")}`)
        .join("; ")}.`,
    );
  lines.push(
    `Neighbour rules: ${CONNECTIONS.slice(0, 12).map((c) => `${name(c.building)} next to ${c.to.map(name).join("/")} +${Math.round(c.bonus * 100)}%`).join("; ")}; a home touching 2 other homes is a street and holds ${Math.round(STREET.share * 100)}% more people; aqueducts must touch the river or a watered aqueduct; smoke from coal plants and factories harms nearby homes.`,
  );
  return lines.join("\n").slice(0, 4000);
}

// Ama's own advice when Gemini can't be reached.
function fallback(state: GameState) {
  const w = warnings(state)[0];
  const goal = currentGoal(state);
  return w ? w.text.replace("{secs}s", "a few seconds").replace("{secs}", "a few") : goal ?? "Keep everyone fed and housed, and grow without harming the land.";
}

export async function askAma(question: string, state: GameState): Promise<{ answer: string; offline: boolean }> {
  if (isOffensive(question)) return { answer: "Let us keep our words kind around the fire. What would you like to know about the town?", offline: true };
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/${FUNCTION}`, {
      method: "POST",
      // Never keep the player (and the paused game) waiting long.
      signal: AbortSignal.timeout(26000),
      headers: { apikey: PUBLISHABLE_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ question: question.slice(0, 200), town: townSummary(state) }),
    });
    if (res.status === 429) return { answer: "So many questions! Let me rest a moment. For now: " + fallback(state), offline: true };
    if (!res.ok) throw new Error(String(res.status));
    const data = (await res.json()) as { answer?: string };
    if (!data.answer) throw new Error("empty");
    return { answer: data.answer, offline: false };
  } catch {
    return { answer: "I can't hear you well right now. What I can see: " + fallback(state), offline: true };
  }
}
