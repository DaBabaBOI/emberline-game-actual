import { DISEASE, QUIET_GAP, TUTORIAL } from "./content";
import type { GameState } from "./types";

// Disease: pure rules, no React. The tick calls stepDisease; hunts, fishing and
// welcomed wanderers call maybeOutbreak.

export function sickShare(state: GameState) {
  return state.population > 0 ? Math.min(1, (state.sick ?? 0) / state.population) : 0;
}

// Until Herbalism, nobody knows what this is.
export function diseaseName(state: GameState) {
  return state.researched.includes("herbalism") ? "sickness" : "curse";
}

function healers(state: GameState) {
  return state.tiles.filter((t) => t.building === "healer").length;
}

function crowding(state: GameState, housing: number) {
  return 1 + DISEASE.crowding * Math.max(0, state.population / Math.max(1, housing) - 0.8);
}

// Build to Last has no Healer's Huts: point at the Hospital instead.
export function cureHint(state: GameState) {
  return state.mode === "last" ? "Hospitals (from Public Health) help them recover" : "Healer's Huts help them recover";
}

export function outbreakMessage(state: GameState, source: string) {
  return diseaseName(state) === "curse"
    ? `A curse from the gods! ${source} People burn with fever, cough and are too weak to work. The elders don't know why.`
    : `Sickness has broken out: fever, coughing and weakness. ${source} ${cureHint(state)}.`;
}

// Start (or add to) an outbreak with the given chance.
export function maybeOutbreak(state: GameState, chance: number, roll: number, source: string): GameState {
  if (state.tutorialStep < TUTORIAL.length || roll >= chance) return state;
  const susceptible = state.population - (state.sick ?? 0) - (state.immune ?? 0);
  if (susceptible < 1) return state;
  const already = (state.sick ?? 0) >= 0.5;
  const sick = Math.min(state.population, (state.sick ?? 0) + 1 + Math.floor(roll * 20) % 3);
  return {
    ...state,
    sick,
    outbreakDeaths: already ? state.outbreakDeaths ?? 0 : 0,
    log: already ? state.log : [outbreakMessage(state, source), ...state.log].slice(0, 30),
  };
}

// The first few minutes after the tutorial are calm: no disease out of nowhere.
export function isCalm(state: GameState) {
  return state.tick < (state.calmUntil ?? 0);
}

// One tick of disease: new outbreaks, spread, recovery and deaths.
// `dirt` (1 or more) makes sickness start and spread faster: crowded towns
// without latrines, and people drinking dirty water in a drought. `extraRecover`
// is the extra share of the sick who get better each tick (bathhouses).
export function stepDisease(state: GameState, housing: number, rand: () => number, dirt = 1, extraRecover = 0): GameState {
  if (state.tutorialStep < TUTORIAL.length) return state;
  let next = state;
  const fishing = state.tiles.filter((t) => t.building === "fishing").length;
  // No outbreak out of nowhere right after another big moment.
  const busy = state.tick - (state.lastBigTick ?? -Infinity) < QUIET_GAP;
  if (!isCalm(state) && !busy) {
    next = maybeOutbreak(
      next,
      DISEASE.perPerson * state.population * crowding(state, housing) * dirt,
      rand(),
      "It spread through the crowded huts.",
    );
    if (fishing) next = maybeOutbreak(next, DISEASE.fishing * fishing, rand(), "It came with the fish.");
    // Traders from far away bring sickness with them now and then.
    const markets = state.tiles.filter((t) => t.building === "market").length;
    if (markets) next = maybeOutbreak(next, DISEASE.market * markets, rand(), "Traders at the market brought it from far away.");
  }

  if (!(state.sick ?? 0) && (next.sick ?? 0) > 0) next = { ...next, lastBigTick: state.tick };
  const sick = next.sick ?? 0;
  const immune = Math.max(0, (next.immune ?? 0) * (1 - DISEASE.immunityFades));
  if (sick <= 0) return immune === (next.immune ?? 0) ? next : { ...next, immune };
  const h = healers(next);
  const cut = 1 - Math.min(0.75, DISEASE.healerCut * h);
  const susceptible = Math.max(0, next.population - sick - immune);
  const infected = Math.min(
    susceptible,
    sick * DISEASE.spread * cut * crowding(next, housing) * dirt * (susceptible / Math.max(1, next.population)),
  );
  const recovered = sick * (DISEASE.recover + DISEASE.healerRecover * h + extraRecover);
  const died = Math.min(sick, sick * DISEASE.death * cut, Math.max(0, next.population - 1));
  const nowSick = Math.max(0, Math.min(next.population - died, sick + infected - recovered - died));
  const nowImmune = Math.min(next.population - died - nowSick, immune + recovered);
  const deaths = (next.outbreakDeaths ?? 0) + died;

  if (nowSick < 0.5) {
    const dead = Math.round(deaths);
    const over =
      diseaseName(next) === "curse" ? "The curse has lifted." : "The sickness has passed.";
    return {
      ...next,
      sick: 0,
      immune: nowImmune + nowSick,
      outbreakDeaths: 0,
      population: next.population - died,
      log: [`${over}${dead ? ` It took ${dead} ${dead === 1 ? "life" : "lives"}.` : ""}`, ...next.log].slice(0, 30),
    };
  }
  return { ...next, sick: nowSick, immune: nowImmune, outbreakDeaths: deaths, population: next.population - died };
}
