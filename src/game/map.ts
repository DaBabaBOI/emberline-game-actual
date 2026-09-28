import { axialToWorld, hexDistance, hexKey, NEIGHBOR_OFFSETS } from "./hex";
import { fbm, mulberry32 } from "./noise";
import type { Deposit, Terrain, Tile } from "./types";

export const MAP_COLS = 50;
export const MAP_ROWS = 32;

// Shape seed is fixed so the geography is hand-tuned and the same every game;
// only deposits change with the game seed.
const SHAPE_SEED = 1337;

export const ISLANDS = [
  { name: "Westmarch", x: -24, z: 3, radius: 16, sx: 1.25, sz: 0.95 },
  { name: "Silk Steppe", x: 5, z: -9, radius: 12, sx: 1.3, sz: 0.8 },
  { name: "Eastern Reach", x: 30, z: 4, radius: 15, sx: 1, sz: 1.15 },
  { name: "Southern Isles", x: 5, z: 15, radius: 8, sx: 1.4, sz: 0.7 },
];

export const HOME_ISLAND = 0;

const HEIGHTS: Record<Terrain, number> = {
  deep: 0.12,
  shallow: 0.2,
  beach: 0.34,
  grass: 0.5,
  forest: 0.55,
  hills: 0.85,
  mountain: 1.35,
};

export function terrainHeight(terrain: Terrain) {
  return HEIGHTS[terrain];
}

export function isLand(terrain: Terrain) {
  return terrain !== "deep" && terrain !== "shallow";
}

function landValue(x: number, z: number): { value: number; island: number } {
  let best = -Infinity;
  let island = -1;
  ISLANDS.forEach((isl, i) => {
    const dx = (x - isl.x) / (isl.radius * isl.sx);
    const dz = (z - isl.z) / (isl.radius * isl.sz);
    const v = 1 - Math.sqrt(dx * dx + dz * dz);
    if (v > best) {
      best = v;
      island = i;
    }
  });
  const wobble = (fbm(x * 0.12, z * 0.12, SHAPE_SEED) - 0.5) * 0.55;
  return { value: best + wobble, island };
}

export function generateMap(seed: number): { tiles: Tile[]; startTile: number } {
  const rand = mulberry32(seed);
  const tiles: Tile[] = [];

  for (let row = -MAP_ROWS / 2; row < MAP_ROWS / 2; row++) {
    for (let col = -MAP_COLS / 2; col < MAP_COLS / 2; col++) {
      const q = col - Math.floor(row / 2);
      const r = row;
      const [x, z] = axialToWorld(q, r);
      const { value, island } = landValue(x, z);
      const detail = fbm(x * 0.25, z * 0.25, SHAPE_SEED + 7);
      const forestNoise = fbm(x * 0.18, z * 0.18, SHAPE_SEED + 23);

      let terrain: Terrain;
      if (value < 0.1) terrain = "deep";
      else if (value < 0.25) terrain = "shallow";
      else if (value < 0.33) terrain = "beach";
      else if (value > 0.6 && detail > 0.66) terrain = "mountain";
      else if (value > 0.5 && detail > 0.56) terrain = "hills";
      else if (forestNoise > 0.54) terrain = "forest";
      else terrain = "grass";

      tiles.push({
        id: tiles.length,
        q,
        r,
        x,
        z,
        terrain,
        height: HEIGHTS[terrain],
        island: isLand(terrain) ? island : -1,
        deposit: null,
        revealed: false,
        building: null,
      });
    }
  }

  const byKey = new Map(tiles.map((t) => [hexKey(t.q, t.r), t]));
  const neighbors = (t: Tile) =>
    NEIGHBOR_OFFSETS.map(([dq, dr]) => byKey.get(hexKey(t.q + dq, t.r + dr))).filter(
      (n): n is Tile => Boolean(n),
    );

  for (const tile of tiles) {
    const roll = rand();
    let deposit: Deposit | null = null;
    if (tile.terrain === "hills" && roll < 0.45) deposit = "stone";
    else if (tile.terrain === "mountain" && roll < 0.3) deposit = "stone";
    else if ((tile.terrain === "grass" || tile.terrain === "forest") && roll < 0.1)
      deposit = "berries";
    else if (tile.terrain === "beach" && roll < 0.2) deposit = "clay";
    else if (
      tile.terrain === "shallow" &&
      roll < 0.18 &&
      neighbors(tile).some((n) => isLand(n.terrain))
    )
      deposit = "fish";
    tile.deposit = deposit;
  }

  const home = ISLANDS[HOME_ISLAND];
  const startTile = tiles
    .filter((t) => t.terrain === "grass" && t.island === HOME_ISLAND)
    .reduce((best, t) =>
      Math.hypot(t.x - home.x, t.z - home.z) < Math.hypot(best.x - home.x, best.z - home.z)
        ? t
        : best,
    );

  revealAround(tiles, startTile, 5);
  return { tiles, startTile: startTile.id };
}

export function revealAround(tiles: Tile[], center: Tile, radius: number) {
  for (const t of tiles) {
    if (!t.revealed && hexDistance(t, center) <= radius) t.revealed = true;
  }
}

export function neighborsOf(tiles: Tile[], tile: Tile): Tile[] {
  return tiles.filter((t) => hexDistance(t, tile) === 1);
}
