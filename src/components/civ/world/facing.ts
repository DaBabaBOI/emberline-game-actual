import { CONNECTIONS } from "@/game/content";
import { hexDistance } from "@/game/hex";
import type { Tile } from "@/game/types";

// Which way each building on the map faces. On its own a building gets a
// turn of its own (a sixth of a circle per tile id), but neighbours line up:
// - runs (aqueducts, canals, walls, sea walls) point along the line, so the
//   water channel or the wall carries straight on into the next one;
// - rows (homes, fields, wind and solar farms) sit side by side, all facing
//   the same way like a street;
// - partners that help each other (CONNECTIONS) turn to face each other;
// - anything else in a cluster faces the middle of the town.

const RUNS = ["aqueduct", "canal", "walls", "seawall"];
const ROWS = [["hut", "house", "townhouse", "apartments"], ["farm", "vfarm"], ["windfarm", "solarfarm"]];

export const familyOf = (b: string) => (RUNS.includes(b) ? b : ROWS.find((r) => r.includes(b))?.[0]);
export const partners = (a: string, b: string) =>
  CONNECTIONS.some((c) => (c.building === a && c.to.includes(b)) || (c.building === b && c.to.includes(a)));

// A model's +x along the line from a to b. Turned into half a circle, so a
// row faces the same way whichever end it is read from.
const along = (a: Tile, b: Tile) => {
  const t = Math.atan2(-(b.z - a.z), b.x - a.x);
  return ((t % Math.PI) + Math.PI) % Math.PI;
};
// A model's front (+z) towards b.
const towards = (a: Tile, b: Tile) => Math.atan2(b.x - a.x, b.z - a.z);

const own = (tile: Tile) => (tile.id % 6) * (Math.PI / 3);

// The turn for `building` standing on `tile` (also for a building about to be
// placed there, so the preview shows how it will sit).
export function turnFor(tiles: Tile[], tile: Tile, building: string | null | undefined): number {
  // A campfire is round, and villagers find its log seats by its own turn.
  if (!building || building === "campfire") return own(tile);
  const near = tiles.filter((t) => t.building && t.id !== tile.id && hexDistance(t, tile) === 1).sort((a, b) => a.id - b.id);
  const family = familyOf(building);
  const kin = family ? near.filter((t) => familyOf(t.building!) === family) : [];
  if (kin.length) {
    // In the middle of a straight run, use the line through both ends.
    const ends = kin.find((a) => kin.some((b) => b !== a && hexDistance(a, b) === 2 && Math.abs(a.x + b.x - 2 * tile.x) + Math.abs(a.z + b.z - 2 * tile.z) < 0.01));
    return along(tile, ends ?? kin[0]);
  }
  const partner = near.find((t) => partners(building, t.building!));
  if (partner) return towards(tile, partner);
  return tidy(tiles, tile) ?? own(tile);
}

// In a cluster of buildings, the rest face the middle of the town, turned to
// the nearest sixth of a circle, so a busy town looks laid out rather than
// scattered. A building on its own keeps its own turn.
function tidy(tiles: Tile[], tile: Tile): number | null {
  const town = tiles.filter((t) => t.building && t.id !== tile.id && t.island === tile.island);
  if (!town.some((t) => hexDistance(t, tile) <= 2)) return null;
  const cx = town.reduce((sum, t) => sum + t.x, 0) / town.length;
  const cz = town.reduce((sum, t) => sum + t.z, 0) / town.length;
  if (Math.hypot(cx - tile.x, cz - tile.z) < 0.5) return null;
  const step = Math.PI / 3;
  return Math.round(Math.atan2(cx - tile.x, cz - tile.z) / step) * step;
}

// Every building's turn, worked out once per map.
const cache = new WeakMap<Tile[], Map<number, number>>();
export function buildingTurn(tile: Tile, tiles?: Tile[]): number {
  if (!tiles) return own(tile);
  let turns = cache.get(tiles);
  if (!turns) {
    turns = new Map();
    cache.set(tiles, turns);
  }
  let turn = turns.get(tile.id);
  if (turn === undefined) {
    turn = turnFor(tiles, tile, tile.building);
    turns.set(tile.id, turn);
  }
  return turn;
}
