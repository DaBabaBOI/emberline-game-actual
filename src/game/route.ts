import { NEIGHBOR_OFFSETS, hexKey, worldToAxial } from "./hex";
import type { Tile } from "./types";

type Point = { x: number; z: number };

// A way to walk from one point to another over the hex tiles, crossing only
// tiles that `open` allows (the start and end tiles are always allowed):
// the tile centres to walk through, ending at `to`. Null if there is no way,
// for example when a river is in between. Breadth-first, so the fewest tiles.
export function findRoute(tiles: Tile[] | Map<string, Tile>, from: Point, to: Point, open: (t: Tile) => boolean): Point[] | null {
  const byKey = tiles instanceof Map ? tiles : new Map(tiles.map((t) => [hexKey(t.q, t.r), t]));
  const at = (p: Point) => {
    const { q, r } = worldToAxial(p.x, p.z);
    return byKey.get(hexKey(q, r));
  };
  const a = at(from);
  const b = at(to);
  if (!a || !b) return null;
  if (a === b) return [to];
  const prev = new Map<Tile, Tile | null>([[a, null]]);
  const queue = [a];
  for (let i = 0; i < queue.length; i++) {
    const t = queue[i];
    if (t === b) break;
    for (const [dq, dr] of NEIGHBOR_OFFSETS) {
      const n = byKey.get(hexKey(t.q + dq, t.r + dr));
      if (!n || prev.has(n) || (n !== b && !open(n))) continue;
      prev.set(n, t);
      queue.push(n);
    }
  }
  if (!prev.has(b)) return null;
  const path: Point[] = [to];
  for (let t = prev.get(b)!; t && t !== a; t = prev.get(t)!) path.unshift({ x: t.x, z: t.z });
  return path;
}
