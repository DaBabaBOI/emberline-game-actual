import { axialToWorld, hexDistance } from "@/game/hex";
import { terrainHeight } from "@/game/map";
import type { Terrain, Tile } from "@/game/types";

// A little hex island for a cutscene, made of the same tiles as the game: grass
// in the middle, forest, a hill or two, a beach, and the sea round it. Buildings
// go where the scene says (by axial position). Same seed, same island.

export interface DioramaSpec {
  seed: number;
  radius?: number;
  buildings?: [q: number, r: number, id: string][];
  // Share of the open land that is forest (0–1).
  forest?: number;
  // Forest still burning, or newly planted (small trees).
  burning?: boolean;
  young?: boolean;
  river?: boolean;
  mountains?: boolean;
  steppe?: boolean;
  // Keep this round patch open (grass, no trees): where the people stand and
  // the camera looks through.
  open?: { x: number; z: number; r: number };
}

function rand(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeDiorama(spec: DioramaSpec): Tile[] {
  const radius = spec.radius ?? 4;
  const r = rand(spec.seed);
  const built = new Map((spec.buildings ?? []).map(([q, rr, id]) => [`${q},${rr}`, id]));
  const tiles: Tile[] = [];
  const outer = radius + 3;
  for (let q = -outer; q <= outer; q++) {
    for (let rr = -outer; rr <= outer; rr++) {
      const d = hexDistance({ q, r: rr }, { q: 0, r: 0 });
      if (d > outer) continue;
      const [x, z] = axialToWorld(q, rr);
      let terrain: Terrain;
      const building = built.get(`${q},${rr}`) ?? null;
      if (d > radius + 1) terrain = "deep";
      else if (d === radius + 1) terrain = "shallow";
      else if (d === radius) terrain = building ? "grass" : r() < 0.75 ? "beach" : "grass";
      else if (building) terrain = "grass";
      else if (spec.open && Math.hypot(x - spec.open.x, z - spec.open.z) < spec.open.r) terrain = "grass";
      else if (spec.river && q === 1 && rr <= 0 && rr > -radius) terrain = "river";
      else if (spec.mountains && d >= radius - 1 && q < -1 && r() < 0.55) terrain = "mountain";
      else if (r() < (spec.forest ?? 0.35) && d >= 2) terrain = "forest";
      else if (spec.steppe && r() < 0.3) terrain = "steppe";
      else terrain = r() < 0.12 && d >= 2 ? "hills" : "grass";
      tiles.push({
        id: tiles.length,
        q,
        r: rr,
        x,
        z,
        terrain,
        height: terrainHeight(terrain),
        island: terrain === "deep" || terrain === "shallow" ? -1 : 0,
        deposit: null,
        revealed: true,
        building,
        growth: terrain === "forest" ? (spec.young ? 0.35 + r() * 0.2 : 0.8 + r() * 0.2) : 0,
        scorch: spec.burning && terrain === "forest" && r() < 0.6 ? 1 : 0,
      });
    }
  }
  return tiles;
}

// Where a tile of the diorama is in the world.
export function at(q: number, r: number): [number, number] {
  return axialToWorld(q, r);
}
