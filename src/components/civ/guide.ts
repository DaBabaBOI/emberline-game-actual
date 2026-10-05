import { AFTER_STEPS, BUILDINGS_BY_ID, ERAS, LAST_TUTORIAL, SPEAR_COST, TRAIN_COST, TREE_BY_ID, TUTORIAL } from "@/game/content";
import { buildingCost, countBuildings, placementError, placementHarm, scoutCost, spearmenOf, warriorCap } from "@/game/engine";
import { hexDistance } from "@/game/hex";
import type { GameState, Resources } from "@/game/types";

// The tutorial hand. Each step is broken into clicks; the guide points at the
// next one and blocks the rest of the screen until it is done. While the player
// is saving up for something the guide lets go so they can look around.

export type GuideTarget =
  // An element marked with data-guide="…". The first one found on screen wins.
  | { kind: "ui"; ids: string[] }
  | { kind: "tile"; tileId: number };

export type Guide = { target: GuideTarget | null; waiting: string | null };

const NONE: Guide = { target: null, waiting: null };

function missing(state: GameState, cost: Partial<Resources>) {
  const short = Object.entries(cost)
    .filter(([k, v]) => state.resources[k as keyof Resources] < (v ?? 0))
    .map(([k]) => k);
  return short.length ? `Saving up ${short.join(" and ")}...` : null;
}

// The spot the hand points at: close by, on its bonus deposit if possible, and
// never where it would do harm the card warns about (quarry dust on fields, a
// fire scaring a gatherer's game...). A quarry goes as far from the village as
// it can: its dust and scar belong away from where people live and farm.
export function suggestTile(state: GameState, buildingId: string) {
  const def = BUILDINGS_BY_ID[buildingId];
  const home = state.tiles[state.startTile];
  const far = buildingId === "quarry";
  let best: { id: number; score: number } | null = null;
  for (const t of state.tiles) {
    const d = hexDistance(t, home);
    if (d > (far ? 8 : 5) || !t.revealed || placementError(state, t, def)) continue;
    const score =
      (far ? -d : d) -
      (def.depositBonus && t.deposit === def.depositBonus.deposit ? 2.5 : 0) +
      (d === 0 ? 1 : 0) +
      // Never next to harm (smoke over homes, dust on fields): that costs a lot.
      placementHarm(state, t, buildingId) * 3;
    if (!best || score < best.score) best = { id: t.id, score };
  }
  return best?.id ?? null;
}

function buildStep(state: GameState, id: string, selected: string | null, panel: string | null): Guide {
  // Researched ahead of time: the building only appears once we reach its era.
  const era = BUILDINGS_BY_ID[id].era;
  if (era > state.era) return { target: null, waiting: `We can build it once we reach the ${ERAS[era].name} era.` };
  const wait = missing(state, buildingCost(state, BUILDINGS_BY_ID[id]));
  if (wait) return { target: null, waiting: wait };
  // The bottom bar is hidden behind Advancements, so close it first.
  if (panel === "tree") return { target: { kind: "ui", ids: ["tree-close"] }, waiting: null };
  if (selected !== id) return { target: { kind: "ui", ids: [`build-${id}`] }, waiting: null };
  const tileId = suggestTile(state, id);
  // No good spot close by: let the player look around (the clock runs).
  return tileId === null
    ? { target: null, waiting: `Find a good spot for the ${BUILDINGS_BY_ID[id].name}.` }
    : { target: { kind: "tile", tileId }, waiting: null };
}

// The guided step after an advancement: place what it unlocked, or give a
// warrior a spear. Explanation-only steps have no target.
function coachGuide(state: GameState, selected: string | null, panel: string | null): Guide {
  const step = state.coach ? AFTER_STEPS[state.coach.node] : null;
  if (!step) return NONE;
  if (step.build) return buildStep(state, step.build, selected, panel);
  if (step.upgrade) {
    if (panel === "tree") return { target: { kind: "ui", ids: ["tree-close"] }, waiting: null };
    if (spearmenOf(state) < state.soldiers) {
      const wait = missing(state, SPEAR_COST);
      return wait ? { target: null, waiting: wait } : { target: { kind: "ui", ids: ["tool-upgrade"] }, waiting: null };
    }
    // No warrior without a spear: train a new one (it comes with a spear).
    if (state.soldiers >= warriorCap(state)) return { target: null, waiting: "Build another War Camp to train more." };
    const wait = missing(state, TRAIN_COST);
    return wait ? { target: null, waiting: wait } : { target: { kind: "ui", ids: ["tool-train"] }, waiting: null };
  }
  return NONE;
}

// Build to Last's guided start (LAST_TUTORIAL).
function lastGuide(state: GameState, selected: string | null, panel: string | null): Guide {
  const step = LAST_TUTORIAL[state.lastStep ?? 0];
  if (step?.build) return buildStep(state, step.build, selected, panel);
  switch (step?.id) {
    case "problems":
      return { target: { kind: "ui", ids: ["problem-people"] }, waiting: null };
    case "advancements":
      return { target: { kind: "ui", ids: ["tool-advancements"] }, waiting: null };
    case "speed":
      return panel === "tree" ? { target: { kind: "ui", ids: ["tree-close"] }, waiting: null } : { target: { kind: "ui", ids: ["speed-2"] }, waiting: null };
  }
  return NONE;
}

export function guideFor(state: GameState, selected: string | null, panel: string | null): Guide {
  const step = TUTORIAL[state.tutorialStep];
  if (state.phase !== "playing" || state.event) return NONE;
  if (state.mode === "last" && !state.dev && (state.lastStep ?? LAST_TUTORIAL.length) < LAST_TUTORIAL.length) return lastGuide(state, selected, panel);
  if (!step) return coachGuide(state, selected, panel);
  if (state.dev) return NONE;

  switch (step.done) {
    case "scout": {
      const wait = missing(state, scoutCost(state));
      return wait ? { target: null, waiting: wait } : { target: { kind: "ui", ids: ["tool-scout"] }, waiting: null };
    }
    case "train": {
      if (!countBuildings(state).warcamp) return buildStep(state, "warcamp", selected, panel);
      const wait = missing(state, TRAIN_COST);
      return wait ? { target: null, waiting: wait } : { target: { kind: "ui", ids: ["tool-train"] }, waiting: null };
    }
    case "early-farming": {
      const node = TREE_BY_ID["early-farming"];
      if (state.resources.knowledge < node.cost) {
        // The world is paused while Advancements is open, so send them back out to wait.
        if (panel === "tree") return { target: { kind: "ui", ids: ["tree-close"] }, waiting: null };
        return { target: null, waiting: "Gathering knowledge..." };
      }
      if (panel !== "tree") return { target: { kind: "ui", ids: ["tool-advancements"] }, waiting: null };
      return { target: { kind: "ui", ids: ["tree-research", "tree-node-early-farming"] }, waiting: null };
    }
    default:
      return BUILDINGS_BY_ID[step.done] ? buildStep(state, step.done, selected, panel) : NONE;
  }
}

// Written every frame by the 3D scene: where the target tile sits on screen.
export const tileAnchor = { x: 0, y: 0, r: 0, visible: false };
