// The economy, from the Ancient era (when there is money to pay people with):
//
// - How work is organised: a free market (capitalism: people own businesses
//   and keep what they earn, so there's more money about, but some get rich
//   and some stay poor, and markets boom and bust); shared work (communism:
//   everyone works for the community and shares what is made, fairly, but
//   with less reason to work harder and little money changing hands); or a
//   mixed economy (markets, with the community looking after people: what
//   most countries do today).
// - What people are paid: low, fair or high wages, every day, in coin.
//   Better pay makes people happier and work better, but costs more; when
//   the money runs out, nobody gets paid.
// - How unequal incomes are (0-100): a free market pulls it up, sharing
//   pulls it down, and wages nudge it. The less fair, the unhappier people
//   are, and the less the typical family earns.
// - Income per person: what the town makes in a day for each person, from
//   many things (work, money, know-how, skills, health, energy, peace,
//   fairness, the land, and the island's luck). It decides whether the town
//   is a low-, middle- or high-income nation, each with its own challenges
//   and a goal to reach the next.
//
// These are pure helpers: the engine passes in what it has worked out.
import type { EconomySystem, GameState, IncomeLevel, Resources, Wage } from "./types";

export const ECONOMY = {
  // The era it starts in.
  era: 1,
  // What each system does: to money, goods (wood and stone), food and
  // know-how; the inequality it pulls towards; happiness (fairness, or
  // welfare); a mixed economy's welfare costs this much a person a day.
  systems: {
    free: {
      name: "Free market",
      real: "Capitalism",
      icon: "market",
      coins: 1.4,
      goods: 1.08,
      food: 1,
      knowledge: 1,
      pull: 75,
      mood: 0,
      upkeep: 0,
      blurb: "People own their workshops and keep what they earn. Much more money and a bit more made, but some get rich while others stay poor, and the markets boom and bust.",
    },
    shared: {
      name: "Shared work",
      real: "Communism",
      icon: "wheat",
      coins: 0.7,
      goods: 0.95,
      food: 1.1,
      knowledge: 1.1,
      pull: 8,
      mood: 4,
      upkeep: 0,
      blurb: "Everyone works for the community and everything is shared out fairly. Fair and steady, but less money changes hands and there's less reason to work harder.",
    },
    mixed: {
      name: "Mixed economy",
      real: "A mix, like most countries today",
      icon: "scales",
      coins: 1.2,
      goods: 1.03,
      food: 1.03,
      knowledge: 1.05,
      pull: 35,
      mood: 2,
      upkeep: 0.004,
      blurb: "Markets, but the community looks after people too (healers, schools, help for the poor), paid for with a little of everyone's money.",
    },
  } satisfies Record<EconomySystem, { name: string; real: string; icon: string; coins: number; goods: number; food: number; knowledge: number; pull: number; mood: number; upkeep: number; blurb: string }>,
  // Wages: coin a person a day (more in later eras, see wageBill), what they
  // do to happiness and work, and to inequality.
  wages: {
    low: { name: "Low", perHead: 0.006, mood: -6, work: 0.95, pull: 10 },
    fair: { name: "Fair", perHead: 0.012, mood: 3, work: 1.05, pull: 0 },
    high: { name: "High", perHead: 0.02, mood: 8, work: 1.1, pull: -10 },
  } satisfies Record<Wage, { name: string; perHead: number; mood: number; work: number; pull: number }>,
  // Nobody paid (no money left): unhappy, and they work badly.
  unpaid: { mood: -12, work: 0.85 },
  // How fast inequality moves towards where the system pulls it (a tick),
  // and the happiness lost for each point over `fair`.
  inequality: { pace: 0.03, fair: 30, mood: 0.12 },
  // Free markets: a boom or a bust now and then.
  cycle: { every: 320, length: 70, boom: 1.5, bust: 0.55, bustMood: 6 },
  // Changing the system upsets people for a while.
  change: { ticks: 60, mood: 8 },
};

export const INCOME = {
  // Income per person a day where middle and then high income start, by era.
  // (A town with every building of its era earns about 4, 5.5, 4.7, 11 and
  // 21 in the Ancient, Classical, Medieval, Industrial and Future eras.)
  lines: [
    [2.6, 5],
    [2.6, 5],
    [3.2, 6.5],
    [3.4, 6.8],
    [5.5, 10],
    [8, 16],
  ] as [number, number][],
  // Ticks between checks, and checks in a row past a line before the level
  // changes (so a good day doesn't make a rich nation).
  check: 30,
  hold: 2,
  // The island's luck (its soil, ores, fish, where the trade winds blow):
  // rolled when money comes in, and shifting now and then.
  luck: { low: 0.8, high: 1.25, min: 0.7, max: 1.35, every: 520, shift: 0.09 },
  // A reward the first time each level is reached.
  rewards: { middle: { knowledge: 40 }, high: { knowledge: 80 } } as Partial<Record<IncomeLevel, Partial<Resources>>>,
  // Low income: unhappy families leave (one every `leaveEvery` ticks below
  // `leaveBelow` happiness), a little gloom. Middle: the "middle-income
  // trap" (less made while few can read). High: people expect fair pay, eat
  // more, and the town's footprint weighs on the land.
  low: { mood: -3, leaveBelow: 35, leaveEvery: 45 },
  middle: { trap: 0.95, literacy: 50 },
  high: { expect: -6, eat: 1.08, footprint: 4 },
};

export const LEVELS: Record<IncomeLevel, { name: string; short: string; colour: string; challenges: string[]; goal: string }> = {
  low: {
    name: "Low-income",
    short: "LIC",
    colour: "#b45309",
    challenges: [
      "Little money to go round: a little gloom over the town.",
      "When people are unhappy, families leave to look for work elsewhere.",
      "The Council of Islands can send aid.",
    ],
    goal: "Reach middle income: more people who can read, healthy homes, trade, fair wages and peace all raise what each person earns.",
  },
  middle: {
    name: "Middle-income",
    short: "MIC",
    colour: "#2563eb",
    challenges: [
      "The middle-income trap: while fewer than half can read (Literacy under 50), work makes 5% less.",
      "Growing towns grow their footprint: watch the land.",
    ],
    goal: "Reach high income: get Literacy over 50, keep trading, and keep incomes fair.",
  },
  high: {
    name: "High-income",
    short: "HIC",
    colour: "#059669",
    challenges: [
      "People expect fair pay: low wages make them very unhappy.",
      "Rich towns use more: everyone eats a little more, and the land feels the town's footprint.",
    ],
    goal: "Stay high-income while keeping the land healthy (Sustainability 60 or more), and help poorer peoples through the Council.",
  },
};

// Whether the town has an economy to run yet.
export const hasEconomy = (state: GameState) => state.era >= ECONOMY.era && state.mode !== "last" && !state.mp && !state.story;

// The day's wages: what everyone is owed (more each era: there is more to buy).
export function wageBill(state: GameState) {
  const eco = state.economy;
  if (!eco || !hasEconomy(state)) return 0;
  const share = eco.system === "shared" ? 0.6 : 1;
  const welfare = ECONOMY.systems[eco.system].upkeep;
  return state.population * (ECONOMY.wages[eco.wage].perHead * share + welfare) * (1 + 0.3 * Math.max(0, state.era - 1));
}

// Can the town pay this day's wages?
export const unpaid = (state: GameState) => !!state.economy && hasEconomy(state) && state.resources.currency < wageBill(state);

// What the economy does to the day's work: multipliers, and the wage bill
// (taken from the day's money if it can be paid).
export function economyEffects(state: GameState) {
  const none = { coins: 1, goods: 1, food: 1, knowledge: 1, bill: 0 };
  const eco = state.economy;
  if (!eco || !hasEconomy(state)) return none;
  const sys = ECONOMY.systems[eco.system];
  const owed = unpaid(state);
  const work = owed ? ECONOMY.unpaid.work : ECONOMY.wages[eco.wage].work;
  const cycle = eco.cycle && state.tick < eco.cycle.until ? (eco.cycle.kind === "boom" ? ECONOMY.cycle.boom : ECONOMY.cycle.bust) : 1;
  // The middle-income trap.
  const trap = state.income?.level === "middle" && state.meters.literacy < INCOME.middle.literacy ? INCOME.middle.trap : 1;
  return {
    coins: sys.coins * cycle,
    goods: sys.goods * work * trap,
    food: sys.food * work * trap,
    knowledge: sys.knowledge,
    bill: owed ? 0 : wageBill(state),
  };
}

// Happiness from the economy, and where it comes from (for the panel).
export function economyMoodParts(state: GameState): { label: string; value: number }[] {
  const eco = state.economy;
  if (!eco || !hasEconomy(state)) return [];
  const parts: { label: string; value: number }[] = [];
  const sys = ECONOMY.systems[eco.system];
  if (sys.mood) parts.push({ label: eco.system === "shared" ? "Fair shares" : "Help for those in need", value: sys.mood });
  if (unpaid(state)) parts.push({ label: "Nobody paid", value: ECONOMY.unpaid.mood });
  else parts.push({ label: `${ECONOMY.wages[eco.wage].name} wages`, value: ECONOMY.wages[eco.wage].mood });
  const unfair = Math.max(0, eco.inequality - ECONOMY.inequality.fair) * ECONOMY.inequality.mood;
  if (unfair >= 0.5) parts.push({ label: "Unfair incomes", value: -Math.round(unfair) });
  if (state.tick < eco.changed + ECONOMY.change.ticks) parts.push({ label: "Getting used to the change", value: -ECONOMY.change.mood });
  if (eco.cycle?.kind === "bust" && state.tick < eco.cycle.until) parts.push({ label: "Hard times (a bust)", value: -ECONOMY.cycle.bustMood });
  const level = state.income?.level;
  if (level === "low") parts.push({ label: "Poverty", value: INCOME.low.mood });
  if (level === "high" && eco.wage === "low") parts.push({ label: "Rich town, poor pay", value: INCOME.high.expect });
  return parts;
}
export const economyMood = (state: GameState) => economyMoodParts(state).reduce((s, p) => s + p.value, 0);

// Income per person a day, and everything that goes into it. `gross` is the
// day's production before wages (the engine's production, plus the bill).
export function incomeOf(state: GameState, gross: Resources): { perPerson: number; parts: { label: string; value: string; good: boolean }[] } {
  const people = Math.max(1, state.population);
  const m = state.meters;
  // A day is 10 ticks.
  const day = 10 / people;
  const work = (Math.max(0, gross.food) + Math.max(0, gross.wood) + 1.5 * Math.max(0, gross.stone)) * day * 0.3;
  const money = Math.max(0, gross.currency) * 3 * day;
  const know = Math.max(0, gross.knowledge) * 2 * day;
  const base = work + money + know;
  const raidNow = !!state.raid || !!state.strike;
  const factors: [string, number][] = [
    ["Skills (Literacy)", 0.85 + m.literacy / 400],
    ["Health and homes", 0.85 + m.shelter / 600],
    ...(state.era >= 4 ? ([["Energy", 0.75 + m.energy / 400]] as [string, number][]) : []),
    ["Peace", raidNow ? 0.85 : 1],
    ["Fairness (what a typical family gets)", 1 - Math.max(0, (state.economy?.inequality ?? 20) - ECONOMY.inequality.fair) / 250],
    ["Healthy land", 0.85 + m.sustainability / 700],
    ["The island's luck", state.income?.luck ?? 1],
  ];
  const perPerson = factors.reduce((v, [, k]) => v * k, base);
  const round = (v: number) => Math.round(v * 10) / 10;
  const parts = [
    { label: "Work (food, wood, stone)", value: `+${round(work)}`, good: true },
    { label: "Money (markets, trade, taxes)", value: `+${round(money)}`, good: true },
    { label: "Know-how", value: `+${round(know)}`, good: true },
    ...factors
      .filter(([, k]) => Math.abs(k - 1) >= 0.01)
      .map(([label, k]) => ({ label, value: `${k >= 1 ? "+" : "−"}${Math.round(Math.abs(k - 1) * 100)}%`, good: k >= 1 })),
  ];
  return { perPerson: round(perPerson), parts };
}

// Where the lines are now (they rise each era: what counts as rich changes).
export const incomeLines = (state: GameState) => INCOME.lines[Math.min(INCOME.lines.length - 1, state.era)];
export function levelFor(state: GameState, perPerson: number): IncomeLevel {
  const [mid, high] = incomeLines(state);
  return perPerson >= high ? "high" : perPerson >= mid ? "middle" : "low";
}

// The island's starting luck: partly the roll of the dice, partly how rich
// the land round home is (ores, fish, clay and such).
export function startingLuck(seed: number, deposits: number) {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  const roll = x - Math.floor(x);
  const luck = INCOME.luck.low + roll * (INCOME.luck.high - INCOME.luck.low) + Math.min(0.1, deposits * 0.015);
  return Math.round(Math.min(INCOME.luck.max, luck) * 100) / 100;
}

// Turns of fortune, good and bad (what changes the island's luck now and then).
export const FORTUNES = {
  good: [
    "Traders say our island's salt is the best on the sea: it sells for more.",
    "A rich seam of clay was found: our potters can't keep up with the orders.",
    "The fish have come back to our bay in great shoals.",
    "A trade wind shift brings merchant ships our way.",
  ],
  bad: [
    "A blight withered the fruit trees: a poorer year.",
    "Pirates prey on the trade routes near us: fewer merchants come.",
    "The best clay pit flooded and is lost.",
    "Merchants found a cheaper island to buy from.",
  ],
};
