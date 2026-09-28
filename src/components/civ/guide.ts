import { BUILDINGS_BY_ID, TRAIN_COST, TREE_BY_ID, TUTORIAL } from "@/game/content";
import { buildingCost, countBuildings, placementError, scoutCost } from "@/game/engine";
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

// Closest free tile the building fits on, preferring its bonus deposit.
export function suggestTile(state: GameState, buildingId: string) {
  const def = BUILDINGS_BY_ID[buildingId];
  const home = state.tiles[state.startTile];
  let best: { id: number; score: number } | null = null;
  for (const t of state.tiles) {
    const d = hexDistance(t, home);
    if (d > 5 || !t.revealed || placementError(state, t, def)) continue;
    const score = d - (def.depositBonus && t.deposit === def.depositBonus.deposit ? 2.5 : 0) + (d === 0 ? 1 : 0);
    if (!best || score < best.score) best = { id: t.id, score };
  }
  return best?.id ?? null;
}

function buildStep(state: GameState, id: string, selected: string | null): Guide {
  const wait = missing(state, buildingCost(state, BUILDINGS_BY_ID[id]));
  if (wait) return { target: null, waiting: wait };
  if (selected !== id) return { target: { kind: "ui", ids: [`build-${id}`] }, waiting: null };
  const tileId = suggestTile(state, id);
  return tileId === null ? NONE : { target: { kind: "tile", tileId }, waiting: null };
}

export function guideFor(state: GameState, selected: string | null, panel: string | null): Guide {
  const step = TUTORIAL[state.tutorialStep];
  if (!step || state.phase !== "playing" || state.event || state.dev) return NONE;

  switch (step.done) {
    case "scout": {
      const wait = missing(state, scoutCost(state));
      return wait ? { target: null, waiting: wait } : { target: { kind: "ui", ids: ["tool-scout"] }, waiting: null };
    }
    case "train": {
      if (!countBuildings(state).warcamp) return buildStep(state, "warcamp", selected);
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
      return BUILDINGS_BY_ID[step.done] ? buildStep(state, step.done, selected) : NONE;
  }
}

// Written every frame by the 3D scene: where the target tile sits on screen.
export const tileAnchor = { x: 0, y: 0, r: 0, visible: false };
