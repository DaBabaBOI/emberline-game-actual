import { LAND } from "@/game/content";
import { hexDistance, hexKey, worldToAxial } from "@/game/hex";
import { isLand } from "@/game/map";
import type { Tile } from "@/game/types";
import { treeSpots } from "./hex-terrain";
import { CHOPPING_BLOCK, BUILDING_SCALE, onBuilding } from "./building-models";

// Answers "what is under this point" so walkers stay on the surface and
// route around mountains, water and buildings.
export interface Ground {
  tileAt(x: number, z: number): Tile | undefined;
  heightAt(x: number, z: number): number;
  walkable(x: number, z: number): boolean;
  // A spot to walk to on this tile: beside the building if there is one.
  spotOn(tile: Tile): { x: number; z: number };
  // Where someone helping at this building works, and what they face while
  // working: a tree in the woods round a woodcutter (axe), otherwise a spot
  // beside the building, facing it.
  workSpot(tile: Tile, tool?: string): { x: number; z: number; face: { x: number; z: number } };
}

const BUILDING_CLEARANCE = 0.62;
// A tile this scorched is still on fire (as atmosphere.tsx's Wildfire draws it).
const BURNING = 0.8;

export function makeGround(tiles: Tile[]): Ground {
  const byKey = new Map(tiles.map((t) => [hexKey(t.q, t.r), t]));
  const tileAt = (x: number, z: number) => {
    const { q, r } = worldToAxial(x, z);
    return byKey.get(hexKey(q, r));
  };
  return {
    tileAt,
    heightAt(x, z) {
      return tileAt(x, z)?.height ?? 0.2;
    },
    walkable(x, z) {
      const t = tileAt(x, z);
      if (!t || !t.revealed || !isLand(t.terrain) || t.terrain === "mountain") return false;
      // Nobody walks into a burning wildfire.
      if (t.scorch > BURNING) return false;
      if (t.building && Math.hypot(x - t.x, z - t.z) < BUILDING_CLEARANCE) return false;
      return true;
    },
    spotOn,
    workSpot(tile, tool) {
      if (tool === "axe") {
        // The trees the woodcutter is felling: in its reach, biggest first
        // (as growForests() in the engine takes them), then the nearest.
        const trees = tiles
          .filter((t) => t.terrain === "forest" && !t.building && t.growth > 0.05 && hexDistance(t, tile) <= LAND.woodcutterReach)
          .sort((a, b) => b.growth - a.growth || hexDistance(a, tile) - hexDistance(b, tile))
          .slice(0, 2)
          .flatMap(treeSpots);
        if (trees.length) {
          const tree = trees[Math.floor(Math.random() * Math.min(4, trees.length))];
          // Stand just clear of the trunk, on the side towards the woodcutter.
          const a = Math.atan2(tile.z - tree.z, tile.x - tree.x) + (Math.random() - 0.5) * 1.2;
          return { x: tree.x + Math.cos(a) * 0.26, z: tree.z + Math.sin(a) * 0.26, face: { x: tree.x, z: tree.z } };
        }
        // No trees left to fell: split logs at the chopping block, standing
        // on its outer side (the yard itself is kept clear for walking).
        const block = onBuilding(tile, CHOPPING_BLOCK.x, CHOPPING_BLOCK.z);
        const out = Math.atan2(block.z - tile.z, block.x - tile.x) + (Math.random() - 0.5) * 0.8;
        const d = CHOPPING_BLOCK.r * BUILDING_SCALE + 0.12;
        return { x: block.x + Math.cos(out) * d, z: block.z + Math.sin(out) * d, face: block };
      }
      return { ...spotOn(tile), face: { x: tile.x, z: tile.z } };
    },
  };
}

function spotOn(tile: Tile) {
  const a = Math.random() * Math.PI * 2;
  const d = tile.building ? 0.72 : Math.random() * 0.45;
  return { x: tile.x + Math.cos(a) * d, z: tile.z + Math.sin(a) * d };
}
