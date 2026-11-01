// The Council of Islands: the peoples of the sea meeting together, a little
// like the United Nations. Once we know two peoples (from the Ancient era),
// they start a council and ask us to join. Every so often it meets and votes
// on a resolution: keeping the peace at sea, saving the forests, an aid fund
// where richer peoples help poorer ones, open trade, schools for all, decent
// pay. A resolution that passes binds every member for a while; keeping it
// raises our standing, breaking it lowers it. High standing makes every
// member warmer to us; very low standing brings sanctions (less trade).
// Low-income members get aid from the council.
import type { LawId, Temper } from "./types";

export type { LawId };

export const COUNCIL = {
  // When it forms: the era, and how many peoples we must know.
  era: 1,
  peoples: 2,
  // Ticks between sessions (the first a little sooner).
  every: 300,
  first: 90,
  // Standing (-100..100): joining, keeping a law, breaking one, voting with
  // the majority; above `respected` members warm to us each session, below
  // `shunned` they cool and trade is cut by `sanction`.
  join: 10,
  kept: 8,
  broken: -15,
  majority: 2,
  respected: 40,
  shunned: -40,
  sanction: 0.5,
  leave: -20,
  // Mood changes with members: joining; keeping or breaking a law; voting
  // the way they voted (or against).
  mood: { join: 5, kept: 4, broken: -8, agree: 4, disagree: -2, respected: 3, shunned: -5 },
  // Aid (from the Aid Fund, and each session for a low-income member), and
  // what a high-income member gives when the Aid Fund passes (times the era).
  aid: { coins: 25, food: 30, session: 12 },
  give: 20,
  // Open trade: treaty trade this much more while it's in force.
  trade: 1.5,
};

export const LAWS: Record<LawId, { name: string; ask: string; keep: string; era: number; ticks: number; icon: string; lean: Partial<Record<Temper, number>> }> = {
  peace: {
    name: "Peace at Sea",
    ask: "No member raids or conquers another member.",
    keep: "Don't raid or conquer a member while it lasts. Members won't raid us either.",
    era: 1,
    ticks: 600,
    icon: "dove",
    lean: { peaceful: 0.4, traders: 0.25, proud: -0.1, warlike: -0.5 },
  },
  forests: {
    name: "Save the Forests",
    ask: "Every member keeps its land healthy.",
    keep: "Have Sustainability 50 or more when it ends.",
    era: 1,
    ticks: 450,
    icon: "sapling",
    lean: { peaceful: 0.35, traders: 0, proud: 0.05, warlike: -0.2 },
  },
  aid: {
    name: "The Aid Fund",
    ask: "Richer members give to help poorer ones.",
    keep: "If we are high-income, we give when it passes; if we are low-income, we get aid.",
    era: 1,
    ticks: 300,
    icon: "hand",
    lean: { peaceful: 0.3, traders: -0.1, proud: -0.15, warlike: 0 },
  },
  trade: {
    name: "Open Trade",
    ask: "Members trade freely with each other.",
    keep: "Nothing to do: our treaty trade earns half as much again while it lasts.",
    era: 1,
    ticks: 450,
    icon: "market",
    lean: { peaceful: 0.1, traders: 0.5, proud: 0, warlike: -0.15 },
  },
  schools: {
    name: "Schools for All",
    ask: "Every member teaches its children to read.",
    keep: "Have Literacy 40 or more when it ends.",
    era: 1,
    ticks: 450,
    icon: "book",
    lean: { peaceful: 0.25, traders: 0.15, proud: 0.1, warlike: -0.15 },
  },
  wages: {
    name: "Decent Work",
    ask: "Members pay their workers fairly.",
    keep: "Pay fair or high wages (and actually pay them) when it ends.",
    era: 1,
    ticks: 450,
    icon: "coin",
    lean: { peaceful: 0.3, traders: -0.2, proud: 0, warlike: -0.1 },
  },
};

// How a member leans on a law: its temper, and how it feels about us when
// we push for it (the engine adds a roll of the dice).
export const leanOn = (law: LawId, temper: Temper, mood: number) => (LAWS[law].lean[temper] ?? 0) + mood / 400;
