import { hexKey, worldToAxial } from "@/game/hex";
import { isLand } from "@/game/map";
import type { Tile } from "@/game/types";

// Answers "what is under this point" so walkers stay on the surface and
// route around mountains, water and buildings.
export interface Ground {
  tileAt(x: number, z: number): Tile | undefined;
  heightAt(x: number, z: number): number;
  walkable(x: number, z: number): boolean;
  // A spot to walk to on this tile: beside the building if there is one.
  spotOn(tile: Tile): { x: number; z: number };
}

const BUILDING_CLEARANCE = 0.62;

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
      if (t.building && Math.hypot(x - t.x, z - t.z) < BUILDING_CLEARANCE) return false;
      return true;
    },
    spotOn(tile) {
      const a = Math.random() * Math.PI * 2;
      const d = tile.building ? 0.72 : Math.random() * 0.45;
      return { x: tile.x + Math.cos(a) * d, z: tile.z + Math.sin(a) * d };
    },
  };
}
