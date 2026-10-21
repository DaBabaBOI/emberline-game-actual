// The endless world: a new sea of islands every game, made bit by bit as the
// player explores (in chunks of CHUNK hexes), so it never runs out. Each cell
// of the sea (CELL world units) may hold one island: our home in the middle
// cell, and around it tribes (who become kingdoms the moment we find them),
// wild islands to settle and islands with the ruins of an older people.
//
// Everything here follows from the world seed alone, so a chunk made late in
// the game is the same as if it had been made at the start.
//
// The classic map (map.ts) is still used by the story, multiplayer and Build
// to Last, where everyone needs the same geography.
import { axialToWorld, hexDistance } from "./hex";
import { isLand, revealAround, riverPath, terrainHeight } from "./map";
import { fbm, mulberry32 } from "./noise";
import type { Deposit, Temper, Terrain, Tile } from "./types";

export const CHUNK = { cols: 10, rows: 8 };
// The chunks made at the start: about the size of the classic map.
const START = { cx: [-3, 2], cy: [-2, 1] };
const CELL = { x: 38, z: 30 };
// How far an island's middle may wander from the middle of its cell.
const WANDER = { x: 7, z: 6 };
// Open water kept between our home island and its nearest neighbours.
const HOME_GAP = 7;

export type IsleKind = "home" | "tribe" | "wild" | "ruins";

export interface People {
  // "the Velmari": what they are called; their island has its own name.
  name: string;
  temper: Temper;
  tunic: string;
  sail: string;
  stripe: string;
}

export interface Isle {
  id: number;
  name: string;
  x: number;
  z: number;
  radius: number;
  sx: number;
  sz: number;
  kind: IsleKind;
  // How much drier than usual (steppe), or wetter when below 0.
  dry: number;
  // Rings of cells out from home: further islands are bigger, richer and stronger.
  ring: number;
  people?: People;
}

const HOME: Omit<Isle, "name"> = { id: 0, x: 0, z: 0, radius: 16, sx: 1.25, sz: 0.95, kind: "home", dry: 0, ring: 0 };

// ---- Names ----

const START_SYL = ["Ka", "Vel", "Tor", "Ash", "Mo", "Bri", "Es", "Ul", "Dar", "Ny", "Sa", "Or", "Fen", "Ira", "Lo", "Thal", "Gor", "Wen", "Ys", "Cor", "Ber", "Hal", "Ta", "Rin"];
const MID_SYL = ["ra", "ma", "le", "do", "ri", "va", "ne", "lo", "ka", "su", "thi", "go", ""];
const END_SYL = ["n", "r", "sh", "th", "k", "l", "s", "m", "nd", "rt", "x", "d"];
const ISLE_FORMS = ["{} Isle", "{}", "{} Isle", "Isle of {}", "{}holm", "{} Rock"];
const PEOPLE_FORMS = ["the {}i", "the {}ans", "the {}folk", "the {} clans", "the {}ese"];

function nameRoot(r: () => number) {
  const pick = <T,>(list: T[]) => list[Math.floor(r() * list.length)];
  return pick(START_SYL) + pick(MID_SYL) + pick(END_SYL);
}

// The tribes' colours (sails, stripes and tunics).
const LOOKS = [
  { sail: "#2a9d8f", stripe: "#e9c46a", tunic: "#2a7d73" },
  { sail: "#5b2a86", stripe: "#c9a227", tunic: "#4b2470" },
  { sail: "#b5452b", stripe: "#f1e6cf", tunic: "#8c3220" },
  { sail: "#2f5d8a", stripe: "#f2c14e", tunic: "#24496d" },
  { sail: "#6b8f3a", stripe: "#3b2a1a", tunic: "#4f6d2a" },
  { sail: "#c06c84", stripe: "#355c7d", tunic: "#8f4a60" },
  { sail: "#d08c2c", stripe: "#3d2b1f", tunic: "#a3681c" },
  { sail: "#3d3d3d", stripe: "#c62828", tunic: "#2b2b2b" },
];
const TEMPERS: Temper[] = ["traders", "peaceful", "proud", "warlike"];

// ---- Islands ----

// A random number source for one cell of one world (each number mixed in
// turn, so mirrored cells don't come out the same).
function cellRandom(seed: number, i: number, j: number, salt: number) {
  let h = seed | 0;
  for (const n of [i, j, salt]) {
    h = Math.imul(h ^ n, 0x9e3779b1);
    h ^= h >>> 15;
    h = Math.imul(h, 0x85ebca77);
    h ^= h >>> 13;
  }
  return mulberry32(h >>> 0);
}

// Island ids: 0 is home; the others say which cell they are in.
export function isleId(i: number, j: number) {
  return i === 0 && j === 0 ? 0 : 1 + (i + 512) * 1024 + (j + 512);
}
function cellOf(id: number): [number, number] {
  if (id === 0) return [0, 0];
  const n = id - 1;
  return [Math.floor(n / 1024) - 512, (n % 1024) - 512];
}

// The island this cell would have, before the ring around home is evened out.
function rawIsle(seed: number, i: number, j: number): Isle | null {
  const r = cellRandom(seed, i, j, 1);
  // Always draw the same numbers in the same order, whatever is kept.
  const exists = r();
  const x = i * CELL.x + (r() * 2 - 1) * WANDER.x;
  const z = j * CELL.z + (r() * 2 - 1) * WANDER.z;
  const ring = Math.max(Math.abs(i), Math.abs(j));
  const radius = 6 + r() * 6 + Math.min(3, ring * 0.5);
  const sx = 0.8 + r() * 0.6;
  const sz = 0.8 + r() * 0.6;
  const roll = r();
  const kind: IsleKind = roll < 0.36 ? "tribe" : roll < 0.8 ? "wild" : "ruins";
  const wet = r();
  const dry = wet < 0.3 ? 0.22 : wet > 0.8 ? -0.12 : 0;
  const root = nameRoot(r);
  const name = ISLE_FORMS[Math.floor(r() * ISLE_FORMS.length)].replace("{}", root);
  const peopleRoot = nameRoot(r);
  const temper = TEMPERS[Math.floor(r() * TEMPERS.length)];
  const look = LOOKS[Math.floor(r() * LOOKS.length)];
  const peopleName = PEOPLE_FORMS[Math.floor(r() * PEOPLE_FORMS.length)].replace("{}", peopleRoot);
  if (exists > 0.7) return null;
  return {
    id: isleId(i, j),
    name,
    x,
    z,
    radius,
    sx,
    sz,
    kind,
    dry,
    ring,
    people: kind === "tribe" ? { name: peopleName, temper, ...look } : undefined,
  };
}

// How far an ellipse reaches from its middle in direction (dx, dz).
function reach(a: number, b: number, dx: number, dz: number) {
  const d = Math.hypot(dx, dz) || 1;
  const c = dx / d;
  const s = dz / d;
  return (a * b) / Math.sqrt((b * c) ** 2 + (a * s) ** 2);
}

// The eight cells around home, evened out: at least one tribe to meet and one
// wild island to settle, none of them a warlike tribe on our doorstep, and
// each with open water between it and us.
const rings = new Map<number, Map<string, Isle | null>>();
function homeRing(seed: number): Map<string, Isle | null> {
  const known = rings.get(seed);
  if (known) return known;
  const cells: [number, number][] = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [-1, -1],
    [1, -1],
    [-1, 1],
  ];
  // Start somewhere different each world.
  const turn = Math.floor(cellRandom(seed, 0, 0, 9)() * cells.length);
  const order = [...cells.slice(turn), ...cells.slice(0, turn)];
  const isles = new Map<string, Isle | null>(order.map(([i, j]) => [`${i},${j}`, rawIsle(seed, i, j)]));
  const force = (i: number, j: number) => {
    const r = cellRandom(seed, i, j, 2);
    const isle = rawIsle(seed + 7919, i, j) ?? rawIsle(seed + 104729, i, j);
    const made: Isle = isle ?? { ...HOME, id: isleId(i, j), name: `${nameRoot(r)} Isle`, x: i * CELL.x, z: j * CELL.z, radius: 9, sx: 1, sz: 1, kind: "wild", ring: 1 };
    isles.set(`${i},${j}`, { ...made, id: isleId(i, j), ring: 1 });
  };
  // At least three islands nearby.
  for (const [i, j] of order) if ([...isles.values()].filter(Boolean).length < 3 && !isles.get(`${i},${j}`)) force(i, j);
  const here = () => order.map(([i, j]) => isles.get(`${i},${j}`)).filter((x): x is Isle => !!x);
  const peopleOf = (isle: Isle): People => {
    const r = cellRandom(seed, isle.x | 0, isle.z | 0, 3);
    return { name: PEOPLE_FORMS[Math.floor(r() * PEOPLE_FORMS.length)].replace("{}", nameRoot(r)), temper: "traders", ...LOOKS[Math.floor(r() * LOOKS.length)] };
  };
  if (!here().some((x) => x.kind === "tribe")) {
    const first = here()[0];
    isles.set(`${cellOf(first.id).join(",")}`, { ...first, kind: "tribe", people: peopleOf(first) });
  }
  if (!here().some((x) => x.kind === "wild")) {
    const other = here().find((x) => x.kind !== "tribe");
    if (other) isles.set(cellOf(other.id).join(","), { ...other, kind: "wild", people: undefined });
    else {
      // Every island nearby is a tribe's: one more, wild, in an empty cell (or
      // the last tribe's island turns wild).
      const empty = order.find(([i, j]) => !isles.get(`${i},${j}`));
      if (empty) {
        force(empty[0], empty[1]);
        const made = isles.get(empty.join(","))!;
        isles.set(empty.join(","), { ...made, kind: "wild", people: undefined });
      } else {
        const last = here()[here().length - 1];
        isles.set(cellOf(last.id).join(","), { ...last, kind: "wild", people: undefined });
      }
    }
  }
  // No warlike tribe right next door.
  for (const isle of here()) {
    if (isle.people?.temper === "warlike") isles.set(cellOf(isle.id).join(","), { ...isle, people: { ...isle.people, temper: "proud" } });
  }
  // Open water between home and each neighbour: push it out along the line
  // between the two middles until the coasts are HOME_GAP apart.
  for (const isle of here()) {
    const dx = isle.x - HOME.x;
    const dz = isle.z - HOME.z;
    const d = Math.hypot(dx, dz);
    // Land reaches about 0.72 of an island's radius.
    const need = 0.72 * (reach(HOME.radius * HOME.sx, HOME.radius * HOME.sz, dx, dz) + reach(isle.radius * isle.sx, isle.radius * isle.sz, dx, dz)) + HOME_GAP;
    if (d < need) {
      const k = need / d;
      isles.set(cellOf(isle.id).join(","), { ...isle, x: HOME.x + dx * k, z: HOME.z + dz * k });
    }
  }
  rings.set(seed, isles);
  return isles;
}

const isles = new Map<string, Isle | null>();
// The island in cell (i, j), if there is one.
export function isleAt(seed: number, i: number, j: number): Isle | null {
  const key = `${seed}:${i},${j}`;
  if (isles.has(key)) return isles.get(key)!;
  let isle: Isle | null;
  if (i === 0 && j === 0) isle = { ...HOME, name: homeName(seed) };
  else if (Math.abs(i) <= 1 && Math.abs(j) <= 1) isle = homeRing(seed).get(`${i},${j}`) ?? null;
  else isle = rawIsle(seed, i, j);
  isles.set(key, isle);
  return isle;
}

export function homeName(seed: number) {
  return `${nameRoot(cellRandom(seed, 0, 0, 5))} Isle`;
}

// An island by its id (null for open sea, or an id from the classic map).
export function isleById(seed: number, id: number): Isle | null {
  if (id < 0) return null;
  const [i, j] = cellOf(id);
  return isleAt(seed, i, j);
}

// The islands whose middles lie within `range` of a point, nearest first.
export function islesNear(seed: number, x: number, z: number, range: number): Isle[] {
  const out: Isle[] = [];
  const ri = Math.ceil(range / CELL.x) + 1;
  const rj = Math.ceil(range / CELL.z) + 1;
  const ci = Math.round(x / CELL.x);
  const cj = Math.round(z / CELL.z);
  for (let i = ci - ri; i <= ci + ri; i++)
    for (let j = cj - rj; j <= cj + rj; j++) {
      const isle = isleAt(seed, i, j);
      if (isle && Math.hypot(isle.x - x, isle.z - z) <= range) out.push(isle);
    }
  return out.sort((a, b) => Math.hypot(a.x - x, a.z - z) - Math.hypot(b.x - x, b.z - z));
}

// How much an island rises at a point (above ~0.25 is land), and whose it is.
export function landAt(seed: number, x: number, z: number): { value: number; island: number } {
  const ci = Math.round(x / CELL.x);
  const cj = Math.round(z / CELL.z);
  let best = -Infinity;
  let island = -1;
  for (let i = ci - 1; i <= ci + 1; i++)
    for (let j = cj - 1; j <= cj + 1; j++) {
      const isle = isleAt(seed, i, j);
      if (!isle) continue;
      const dx = (x - isle.x) / (isle.radius * isle.sx);
      const dz = (z - isle.z) / (isle.radius * isle.sz);
      const v = 1 - Math.sqrt(dx * dx + dz * dz);
      if (v > best) {
        best = v;
        island = isle.id;
      }
    }
  const wobble = (fbm(x * 0.12, z * 0.12, seed) - 0.5) * 0.55;
  return { value: best + wobble, island };
}

// ---- Tiles ----

const fold = (seed: number) => (seed % 2147483647) >>> 0;

function terrainAt(seed: number, x: number, z: number): { terrain: Terrain; island: number } {
  const { value, island } = landAt(seed, x, z);
  const isle = island >= 0 ? isleById(seed, island) : null;
  const detail = fbm(x * 0.25, z * 0.25, seed + 7);
  const forestNoise = fbm(x * 0.18, z * 0.18, seed + 23);
  // Home is kind to a new tribe: a little wetter and more wooded than most.
  const homeBias = island === 0 ? 1 : 0;
  const moisture = fbm(x * 0.14, z * 0.14, seed + 41) - (isle?.dry ?? 0) + homeBias * 0.07;
  let terrain: Terrain;
  if (value < 0.1) terrain = "deep";
  else if (value < 0.25) terrain = "shallow";
  else if (value < 0.33) terrain = "beach";
  else if (value > 0.38 && value < 0.56 && detail > 0.64) terrain = "mountain";
  else if (value > 0.5 && detail > 0.56) terrain = "hills";
  else if (value < 0.42 && moisture > 0.6) terrain = "marsh";
  else if (forestNoise > 0.6 - homeBias * 0.05 && moisture > 0.4) terrain = "forest";
  else if (moisture < 0.4) terrain = "steppe";
  else terrain = "grass";
  return { terrain, island };
}

// One tile's own roll (deposits), the same whenever it is made.
function tileRoll(seed: number, q: number, r: number) {
  return cellRandom(seed, q, r, 11)();
}

function makeTile(seed: number, id: number, q: number, r: number): Tile {
  const [x, z] = axialToWorld(q, r);
  const { terrain, island } = terrainAt(seed, x, z);
  const roll = tileRoll(seed, q, r);
  let deposit: Deposit | null = null;
  if (terrain === "hills" && roll < 0.45) deposit = "stone";
  else if (terrain === "mountain" && roll < 0.3) deposit = "stone";
  else if ((terrain === "grass" || terrain === "forest" || terrain === "marsh") && roll < 0.1) deposit = "berries";
  else if (terrain === "beach" && roll < 0.2) deposit = "clay";
  else if (terrain === "shallow" && roll < 0.18) {
    // Fish gather by the shore.
    const shore = [
      [1, 0],
      [1, -1],
      [0, -1],
      [-1, 0],
      [-1, 1],
      [0, 1],
    ].some(([dq, dr]) => {
      const [nx, nz] = axialToWorld(q + dq, r + dr);
      return isLand(terrainAt(seed, nx, nz).terrain);
    });
    if (shore) deposit = "fish";
  }
  return {
    id,
    q,
    r,
    x,
    z,
    terrain,
    height: terrainHeight(terrain),
    island: isLand(terrain) ? island : -1,
    deposit,
    revealed: false,
    building: null,
    growth: terrain === "forest" ? 1 : 0,
    scorch: 0,
  };
}

const chunkKey = (cx: number, cy: number) => `${cx},${cy}`;

// The tiles of one chunk, numbered on from `firstId`.
function makeChunk(seed: number, cx: number, cy: number, firstId: number): Tile[] {
  const tiles: Tile[] = [];
  for (let row = cy * CHUNK.rows; row < (cy + 1) * CHUNK.rows; row++)
    for (let col = cx * CHUNK.cols; col < (cx + 1) * CHUNK.cols; col++) {
      const q = col - Math.floor(row / 2);
      tiles.push(makeTile(seed, firstId + tiles.length, q, row));
    }
  return tiles;
}

// Which chunk a tile belongs to.
export function chunkOf(t: { q: number; r: number }): [number, number] {
  const col = t.q + Math.floor(t.r / 2);
  return [Math.floor(col / CHUNK.cols), Math.floor(t.r / CHUNK.rows)];
}

export interface World {
  seed: number;
  chunks: string[];
}

// Is this a home worth starting on: enough land, forest, hills for stone and a
// river running past the village?
function goodHome(tiles: Tile[], start: Tile, river: number[]) {
  const home = tiles.filter((t) => t.island === 0);
  const near = (t: Tile, d: number) => hexDistance(t, start) <= d;
  return (
    home.length >= 150 &&
    home.filter((t) => t.terrain === "forest" && near(t, 8)).length >= 22 &&
    home.filter((t) => t.terrain === "forest" && near(t, 5)).length >= 7 &&
    home.filter((t) => t.terrain === "beach" && near(t, 9)).length >= 2 &&
    home.filter((t) => (t.terrain === "hills" || t.terrain === "mountain") && near(t, 9)).length >= 3 &&
    home.filter((t) => t.deposit === "stone" && near(t, 9)).length >= 1 &&
    home.filter((t) => t.terrain === "grass" && near(t, 5)).length >= 30 &&
    river.length >= 3
  );
}

// A new world for a new game: the chunks around home, with our village in the
// middle of the home island and its river running past.
export function generateWorld(gameSeed: number): { tiles: Tile[]; startTile: number; world: World } {
  for (let attempt = 0; ; attempt++) {
    const seed = fold(gameSeed + attempt * 7919);
    const tiles: Tile[] = [];
    const chunks: string[] = [];
    for (let cy = START.cy[0]; cy <= START.cy[1]; cy++)
      for (let cx = START.cx[0]; cx <= START.cx[1]; cx++) {
        tiles.push(...makeChunk(seed, cx, cy, tiles.length));
        chunks.push(chunkKey(cx, cy));
      }
    const grass = tiles.filter((t) => t.terrain === "grass" && t.island === 0);
    if (!grass.length) continue;
    const start = grass.reduce((best, t) => (Math.hypot(t.x, t.z) < Math.hypot(best.x, best.z) ? t : best));
    const height = (t: Tile) => landAt(seed, t.x, t.z).value;
    const river = riverPath(tiles, start.id, height);
    // A poor home: try the next world (a few tries at most, then take it).
    if (!goodHome(tiles, start, river) && attempt < 30) continue;
    for (const id of river) Object.assign(tiles[id], { terrain: "river", height: terrainHeight("river"), island: -1, deposit: null, growth: 0 });
    revealAround(tiles, start, 5);
    return { tiles, startTile: start.id, world: { seed, chunks } };
  }
}

// The world grows as it is explored: every chunk next to one with explored
// tiles in it is made, so there is always unknown sea beyond what we know.
// Returns the new tiles (numbered on from the old ones) and the chunks they
// fill, or null when nothing new is needed.
export function growWorld(tiles: Tile[], world: World): { tiles: Tile[]; chunks: string[] } | null {
  const have = new Set(world.chunks);
  const want: [number, number][] = [];
  const seen = new Set<string>();
  for (const t of tiles) {
    if (!t.revealed) continue;
    const [cx, cy] = chunkOf(t);
    const key = chunkKey(cx, cy);
    if (seen.has(key)) continue;
    seen.add(key);
    for (let dx = -1; dx <= 1; dx++)
      for (let dy = -1; dy <= 1; dy++) {
        const k = chunkKey(cx + dx, cy + dy);
        if (!have.has(k)) {
          have.add(k);
          want.push([cx + dx, cy + dy]);
        }
      }
  }
  if (!want.length) return null;
  const made: Tile[] = [];
  for (const [cx, cy] of want) made.push(...makeChunk(world.seed, cx, cy, tiles.length + made.length));
  return { tiles: made, chunks: want.map(([cx, cy]) => chunkKey(cx, cy)) };
}

// The id a tribe's kingdom goes by.
export const kingdomIdOf = (island: number) => `isle${island}`;
export const islandOfKingdom = (id: string) => (id.startsWith("isle") ? Number(id.slice(4)) : null);
