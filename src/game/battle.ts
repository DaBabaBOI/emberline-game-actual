// Commanded battles: when raiders land, the player can place the army on a
// field (warriors, spearmen, archers, riders, hired mercenaries, the chief,
// palisades, towers), then fight it out: send groups where they should go,
// tell them to hold or charge, or take one fighter and fight as them. The
// fight is simulated here, step by step, the same way every time for the same
// setup and the same orders: the battle screen plays it out to watch, and the
// engine plays it again to take the result (so what you saw is what happens).
//
// The ground is where the raiders landed: a forest, a river with a ford or
// two, hills, rocks, a marsh, or open grass. Where they stand matters:
// - hills: archers on one shoot further, anyone on one hits harder, and
//   climbing up into a fight is hard going;
// - woods: slow going, and cover (arrows at anyone in the trees mostly miss);
// - a river: wading is slow and you fight badly in the water; the fords are
//   quicker, so everyone heads for them;
// - rocks: nobody walks through them, and they stop arrows;
// - mud: slow going;
// - a blow from the side hurts more, from behind more still;
// - fighters shoulder to shoulder hold better against blows from the front;
// - spearmen stop a charge (riders, brutes) dead;
// - riders hit and run: a charge strikes twice as hard, then they wheel away
//   and come again;
// - palisades catch arrows aimed at whoever is just behind them.
// The raiders come with a plan of their own (a rush, a flanking move, a
// volley first, or a wedge).
//
// The field: x across (-HALF_W to HALF_W), z towards the camera. Our side
// deploys in z US_ZONE (in front of the camera), the raiders in THEM_ZONE.

import { mulberry32 } from "./noise";

export type FighterKind =
  | "warrior"
  | "spearman"
  | "archer"
  | "rider"
  | "merc"
  | "chief"
  | "raider"
  | "brute"
  | "torch"
  | "bowman"
  | "horseman"
  | "palisade"
  | "tower";
export type Side = "us" | "them";
export interface Placed {
  kind: FighterKind;
  x: number;
  z: number;
}

// hp, damage a blow, reach (beyond both bodies), walking speed (units/s),
// seconds between blows, body radius; `still`: doesn't move (palisade,
// tower); `range`: shoots arrows that far (towers, archers, bowmen), each
// doing `shot` damage; `charge`: hits twice as hard after a run-up (riders).
// Roughly, a warrior and a raider are an even match; a spearman is worth 1.5,
// an archer 1.3 (from behind a line), a rider 2, a mercenary 1.5, a brute 2,
// the chief 2.5, a torch-bearer 0.75 (fast, but they burn out quick).
export const FIGHTERS: Record<
  FighterKind,
  { hp: number; dmg: number; reach: number; speed: number; cooldown: number; radius: number; still?: boolean; range?: number; shot?: number; charge?: boolean }
> = {
  warrior: { hp: 10, dmg: 3, reach: 0.12, speed: 1.0, cooldown: 0.8, radius: 0.13 },
  spearman: { hp: 10, dmg: 4.2, reach: 0.38, speed: 0.9, cooldown: 0.8, radius: 0.13 },
  archer: { hp: 8, dmg: 1.2, reach: 0.12, speed: 0.95, cooldown: 1.0, radius: 0.12, range: 3.0, shot: 3.6 },
  rider: { hp: 15, dmg: 3.6, reach: 0.16, speed: 1.9, cooldown: 0.8, radius: 0.18, charge: true },
  merc: { hp: 13, dmg: 3.5, reach: 0.13, speed: 1.0, cooldown: 0.75, radius: 0.14 },
  chief: { hp: 22, dmg: 3.6, reach: 0.14, speed: 1.15, cooldown: 0.7, radius: 0.15 },
  raider: { hp: 10, dmg: 3, reach: 0.12, speed: 1.05, cooldown: 0.8, radius: 0.13 },
  brute: { hp: 18, dmg: 4.2, reach: 0.14, speed: 0.8, cooldown: 1.0, radius: 0.16 },
  torch: { hp: 7, dmg: 3, reach: 0.12, speed: 1.35, cooldown: 0.75, radius: 0.12 },
  bowman: { hp: 7, dmg: 1.2, reach: 0.12, speed: 0.95, cooldown: 1.2, radius: 0.12, range: 2.6, shot: 2.4 },
  horseman: { hp: 15, dmg: 3.6, reach: 0.16, speed: 1.8, cooldown: 0.85, radius: 0.18, charge: true },
  palisade: { hp: 32, dmg: 0, reach: 0, speed: 0, cooldown: 1, radius: 0.2, still: true },
  tower: { hp: 40, dmg: 0, reach: 0, speed: 0, cooldown: 1.2, radius: 0.28, still: true, range: 3.4, shot: 2.4 },
};

// Fighters who keep their distance and shoot.
export const shoots = (kind: FighterKind) => kind === "archer" || kind === "bowman";
// Hills: archers on one shoot this much further, anyone on one hits this
// much harder, and a blow struck up at someone on one this much softer.
export const HILL = { range: 1.3, dmg: 1.2, uphill: 0.85, height: 0.32 };
// How fast you go through each kind of ground; arrows at someone in the
// woods miss this much more often; in deep water you hit this much softer.
export const GROUND = { woods: 0.65, mud: 0.5, river: 0.35, ford: 0.8, climb: 0.7, cover: 0.4, wading: 0.75 };
// A blow from the side, or from behind; standing shoulder to shoulder (at
// least `mates` friends within `near`) against blows from the front.
export const FLANK = { side: 1.3, back: 1.6, wall: 0.8, near: 0.55, mates: 2 };
// Spearmen against a charge; a rider's charge after a run of `run` units;
// after a blow, a rider wheels away for `away` seconds to charge again.
export const BRACE = 1.6;
export const CHARGE = { run: 1.0, dmg: 2, away: 0.6 };
// Our riders hold back (at most this many seconds) while the lines close.
export const RIDERS_WAIT = 3;
// The figure you fight as hits a little harder.
export const HERO = 1.2;
// Fighters sent somewhere fight anyone who comes this close on the way, and
// once there, anyone this close to where they stand.
export const ORDERED = { engage: 0.6, guard: 1.0, spread: 1.3 };

export const HALF_W = 4.2;
export const US_ZONE: [number, number] = [0.7, 3.4];
export const THEM_ZONE: [number, number] = [-3.4, -0.7];
// The most figures a side puts on the field; a bigger army fights as fewer,
// tougher figures.
export const MAX_FIGHTERS = 40;
export const DT = 0.05;
// After this long the raiders give up and run.
export const TIME_LIMIT = 75;

// How the raiders fight: all at once; out round the sides; arrows first, the
// rest waiting; or the brutes leading a wedge.
export type Tactic = "rush" | "flank" | "volley" | "wedge";
export const TACTICS: Record<Tactic, { name: string; hint: string }> = {
  rush: { name: "All-out rush", hint: "They will charge straight at you. A solid line holds them." },
  flank: { name: "Flanking", hint: "Their fast ones will swing round your sides. Guard the edges." },
  volley: { name: "Volley first", hint: "Their bowmen will shoot first while the rest wait. Rush them, or stand behind palisades or in the trees." },
  wedge: { name: "Wedge", hint: "Their brutes lead a wedge at your middle. Spearmen stop it." },
};

// ---- The ground ------------------------------------------------------------------

export type Biome = "grass" | "forest" | "hills" | "river" | "marsh" | "open" | "rocky";
export const BIOMES: Record<Biome, string> = {
  grass: "Open grassland with a rise and a copse.",
  forest: "Woods: slow going, and cover from arrows.",
  hills: "Hills and boulders: take the high ground.",
  river: "A river: wading is slow, so hold the ford.",
  marsh: "A marsh: the mud bogs everyone down.",
  open: "Open ground: nowhere to hide.",
  rocky: "Rocky ground: boulders block the way and the arrows.",
};
export interface Circle {
  x: number;
  z: number;
  r: number;
}
export interface Field {
  biome: Biome;
  hills: Circle[];
  woods: Circle[];
  rocks: Circle[];
  mud: Circle[];
  // Across the middle, `half` deep each side of z; fords to wade across.
  river: { z: number; half: number; fords: { x: number; half: number }[] } | null;
}

// The ground for a battle (the same for the same seed and kind of land).
export function fieldOf(seed: number, biome: Biome = "grass"): Field {
  const rand = mulberry32(seed * 11 + 5);
  const R = (a: number, b: number) => a + rand() * (b - a);
  const n = (a: number, b: number) => Math.floor(R(a, b + 1));
  const plan: Record<Biome, { hills: [number, number]; woods: [number, number]; rocks: [number, number]; mud: [number, number]; river: number }> = {
    grass: { hills: [1, 1], woods: [1, 1], rocks: [0, 1], mud: [0, 0], river: 0.2 },
    forest: { hills: [0, 1], woods: [3, 4], rocks: [0, 1], mud: [0, 0], river: 0.1 },
    hills: { hills: [2, 3], woods: [0, 1], rocks: [2, 3], mud: [0, 0], river: 0 },
    river: { hills: [0, 1], woods: [1, 1], rocks: [0, 1], mud: [1, 2], river: 1 },
    marsh: { hills: [0, 0], woods: [1, 1], rocks: [0, 0], mud: [3, 4], river: 0.5 },
    open: { hills: [1, 1], woods: [0, 0], rocks: [1, 2], mud: [0, 0], river: 0 },
    rocky: { hills: [1, 2], woods: [0, 0], rocks: [3, 4], mud: [0, 0], river: 0 },
  };
  const p = plan[biome];
  const river =
    rand() < p.river
      ? (() => {
          const fords = rand() < 0.5 ? [{ x: R(-3, 3), half: R(0.5, 0.7) }] : [{ x: R(-3.2, -0.8), half: R(0.45, 0.6) }, { x: R(0.8, 3.2), half: R(0.45, 0.6) }];
          return { z: R(-0.15, 0.15), half: 0.32, fords };
        })()
      : null;
  const spot = (z0: number, z1: number, r0: number, r1: number): Circle => ({ x: R(-HALF_W + 0.6, HALF_W - 0.6), z: R(z0, z1), r: R(r0, r1) });
  const hills = Array.from({ length: n(...p.hills) }, () => {
    const h = spot(-1.6, 2.0, 0.8, 1.1);
    // Not in the river.
    if (river && Math.abs(h.z - river.z) < h.r + river.half) h.z = river.z + Math.sign(h.z - river.z || 1) * (h.r + river.half + 0.1);
    return h;
  });
  const woods = Array.from({ length: n(...p.woods) }, () => spot(-2.8, 2.9, biome === "forest" ? 0.75 : 0.6, biome === "forest" ? 1.15 : 0.95));
  // Rocks in the middle ground, never on a ford.
  const rocks = Array.from({ length: n(...p.rocks) }, () => spot(-0.9, 0.9, 0.2, 0.36)).filter(
    (r) => !river?.fords.some((f) => Math.abs(r.x - f.x) < f.half + r.r + 0.2),
  );
  const mud = Array.from({ length: n(...p.mud) }, () => spot(-1.8, 1.8, 0.5, 0.9));
  return { biome, hills, woods, rocks, mud, river };
}

const inCircle = (c: Circle, x: number, z: number) => Math.hypot(x - c.x, z - c.z) < c.r;
export const onHill = (field: Field, p: { x: number; z: number }) => field.hills.some((h) => inCircle(h, p.x, p.z));
export const inWoods = (field: Field, p: { x: number; z: number }) => field.woods.some((w) => inCircle(w, p.x, p.z));
// Where the river is, here: "deep", "ford" or null.
export function waterAt(field: Field, x: number, z: number): "deep" | "ford" | null {
  const r = field.river;
  if (!r || Math.abs(z - r.z) >= r.half) return null;
  return r.fords.some((f) => Math.abs(x - f.x) < f.half) ? "ford" : "deep";
}
// The ground's height: the tallest hill under this point.
export function heightAt(field: Field, x: number, z: number) {
  let h = 0;
  for (const c of field.hills) {
    const d = Math.hypot(x - c.x, z - c.z) / c.r;
    if (d < 1) h = Math.max(h, HILL.height * Math.sqrt(1 - d * d));
  }
  return h;
}
// How quickly you go here (1: open ground).
export function paceAt(field: Field, x: number, z: number) {
  const water = waterAt(field, x, z);
  let k = water === "deep" ? GROUND.river : water === "ford" ? GROUND.ford : 1;
  if (inWoods(field, { x, z })) k *= GROUND.woods;
  if (field.mud.some((m) => inCircle(m, x, z))) k *= GROUND.mud;
  return k;
}
// Somewhere a figure can be put: on the field, not in a rock or deep water.
export function canStand(field: Field, x: number, z: number) {
  return Math.abs(x) <= HALF_W && Math.abs(z) <= 4.4 && !field.rocks.some((r) => Math.hypot(x - r.x, z - r.z) < r.r + 0.08) && waterAt(field, x, z) !== "deep";
}

// The way from here to there: across a river, by the nearest ford if it
// isn't too far round.
function routeTo(field: Field, f: { x: number; z: number }, gx: number, gz: number) {
  const r = field.river;
  if (!r || Math.abs(f.z - r.z) < r.half || Math.sign(f.z - r.z) === Math.sign(gz - r.z)) return { x: gx, z: gz };
  // Where the straight line meets the river.
  const k = (r.z - f.z) / (gz - f.z || 1e-6);
  const cross = f.x + (gx - f.x) * k;
  if (r.fords.some((d) => Math.abs(cross - d.x) < d.half * 0.8)) return { x: gx, z: gz };
  const ford = [...r.fords].sort((a, b) => Math.abs(a.x - cross) - Math.abs(b.x - cross))[0];
  if (Math.abs(ford.x - cross) > 3.5) return { x: gx, z: gz };
  return { x: ford.x, z: r.z + Math.sign(f.z - r.z) * (r.half - 0.05) };
}

// ---- The fight ---------------------------------------------------------------------

export interface BattleSetup {
  seed: number;
  ours: Placed[];
  theirs: Placed[];
  // How much tougher (hp and blows) each of our / their figures is: arms
  // (bronze, iron...) and a big army packed into fewer figures.
  usBoost: number;
  themBoost: number;
  tactic?: Tactic;
  biome?: Biome;
}

export interface Fighter {
  id: number;
  side: Side;
  kind: FighterKind;
  x: number;
  z: number;
  hp: number;
  maxHp: number;
  cd: number;
  target: number;
  retarget: number;
  // Knocked back by a blow (units/s, fading).
  kx: number;
  kz: number;
  alive: boolean;
  // When they last struck, were last hurt, and fell (and which way they
  // face; on falling, which way the blow sent them, and how hard).
  struckAt: number;
  hurtAt: number;
  diedAt: number;
  heading: number;
  flung: number;
  moving: boolean;
  // How far they've run since their last blow (for a charge), and (riders)
  // seconds left wheeling away after a charge, to come round again.
  run: number;
  away: number;
  // Sent somewhere (ours, by order): where, and whether they're there.
  goal: { x: number; z: number } | null;
  holding: boolean;
}

export interface Arrow {
  from: { x: number; z: number };
  side: Side;
  target: number;
  shot: number;
  lands: number;
  dmg: number;
  // Off the mark: lands this far beside the target and hits nobody.
  miss: number;
  // Stopped by a rock on the way, here.
  stop?: { x: number; z: number };
}

// The player's orders, each from step `at` on (the engine replays them):
// fight as one of ours, going which way (id -1: let go); send some of ours
// somewhere (they keep their places in the group); have them hold where they
// are; or let them charge (fight as they see fit).
export type Order =
  | { at: number; kind: "steer"; id: number; dx: number; dz: number }
  | { at: number; kind: "move"; ids: number[]; x: number; z: number }
  | { at: number; kind: "hold"; ids: number[] }
  | { at: number; kind: "charge"; ids: number[] };

export interface BattleSim {
  setup: BattleSetup;
  t: number;
  steps: number;
  fighters: Fighter[];
  arrows: Arrow[];
  rand: () => number;
  over: boolean;
  won: boolean;
  field: Field;
  // Who the player is fighting as, and which way they're going.
  control: { id: number; dx: number; dz: number } | null;
}

export function startBattle(setup: BattleSetup): BattleSim {
  const fighters: Fighter[] = [];
  const add = (p: Placed, side: Side) => {
    const spec = FIGHTERS[p.kind];
    const boost = spec.still ? 1 : side === "us" ? setup.usBoost : setup.themBoost;
    const hp = spec.hp * Math.sqrt(boost);
    fighters.push({
      id: fighters.length,
      side,
      kind: p.kind,
      x: p.x,
      z: p.z,
      hp,
      maxHp: hp,
      cd: 0.2 + (fighters.length % 5) * 0.08,
      target: -1,
      retarget: 0,
      kx: 0,
      kz: 0,
      alive: true,
      struckAt: -9,
      hurtAt: -9,
      diedAt: -1,
      heading: side === "us" ? Math.PI : 0,
      flung: 0,
      moving: false,
      run: 0,
      away: 0,
      goal: null,
      holding: false,
    });
  };
  setup.ours.forEach((p) => add(p, "us"));
  setup.theirs.forEach((p) => add(p, "them"));
  return {
    setup,
    t: 0,
    steps: 0,
    fighters,
    arrows: [],
    rand: mulberry32(setup.seed),
    over: false,
    won: false,
    field: fieldOf(setup.seed, setup.biome),
    control: null,
  };
}

const mobileAlive = (sim: BattleSim, side: Side) => sim.fighters.some((f) => f.alive && f.side === side && !FIGHTERS[f.kind].still);
const isOurs = (sim: BattleSim, id: number) => {
  const f = sim.fighters[id];
  return !!f && f.alive && f.side === "us" && !FIGHTERS[f.kind].still;
};

// Carry out one of the player's orders.
export function applyOrder(sim: BattleSim, o: Order) {
  if (o.kind === "steer") {
    if (o.id < 0) sim.control = null;
    else if (isOurs(sim, o.id)) sim.control = { id: o.id, dx: Math.sign(o.dx), dz: Math.sign(o.dz) };
    return;
  }
  const group = o.ids.slice(0, MAX_FIGHTERS * 2).filter((id) => isOurs(sim, id)).map((id) => sim.fighters[id]);
  if (!group.length) return;
  if (o.kind === "charge") {
    for (const f of group) Object.assign(f, { goal: null, holding: false });
    return;
  }
  if (o.kind === "hold") {
    for (const f of group) Object.assign(f, { goal: { x: f.x, z: f.z }, holding: true });
    return;
  }
  // Moving: each keeps their place in the group (drawn in if it's spread
  // wide), around where they were sent.
  const cx = group.reduce((s, f) => s + f.x, 0) / group.length;
  const cz = group.reduce((s, f) => s + f.z, 0) / group.length;
  const spread = Math.max(...group.map((f) => Math.hypot(f.x - cx, f.z - cz)), 0.01);
  const k = Math.min(1, ORDERED.spread / spread);
  for (const f of group) {
    let gx = Math.max(-HALF_W, Math.min(HALF_W, o.x + (f.x - cx) * k));
    let gz = Math.max(-4.2, Math.min(4.2, o.z + (f.z - cz) * k));
    if (!canStand(sim.field, gx, gz)) {
      gx = Math.max(-HALF_W, Math.min(HALF_W, o.x));
      gz = Math.max(-4.2, Math.min(4.2, o.z));
    }
    Object.assign(f, { goal: { x: gx, z: gz }, holding: false });
  }
}

// Who a fighter goes for: the nearest enemy still standing. Raiders also go
// for palisades and towers in their way; our people leave those alone. Riders
// go for archers first, if any are near.
function pickTarget(sim: BattleSim, f: Fighter) {
  let best = -1;
  let bestD = Infinity;
  const riding = FIGHTERS[f.kind].charge;
  for (const o of sim.fighters) {
    if (!o.alive || o.side === f.side) continue;
    if (f.side === "us" && FIGHTERS[o.kind].still) continue;
    let d = Math.hypot(o.x - f.x, o.z - f.z);
    if (riding && shoots(o.kind)) d *= 0.7;
    if (d < bestD) {
      bestD = d;
      best = o.id;
    }
  }
  return best;
}

// How hard a melee blow lands, from where it comes: the side or the back of
// the target; shoulder to shoulder; up or down a hill; in deep water; spears
// against a charge.
function blowFactor(sim: BattleSim, from: Fighter, target: Fighter) {
  let k = 1;
  if (!FIGHTERS[target.kind].still) {
    const dx = from.x - target.x;
    const dz = from.z - target.z;
    const d = Math.hypot(dx, dz) || 1;
    const facing = (Math.sin(target.heading) * dx + Math.cos(target.heading) * dz) / d;
    if (facing < -0.5) k *= FLANK.back;
    else if (facing < 0.5) k *= FLANK.side;
    else {
      let mates = 0;
      for (const o of sim.fighters)
        if (o !== target && o.alive && o.side === target.side && !FIGHTERS[o.kind].still && Math.hypot(o.x - target.x, o.z - target.z) < FLANK.near) mates++;
      if (mates >= FLANK.mates) k *= FLANK.wall;
    }
  }
  const up = onHill(sim.field, from);
  const down = onHill(sim.field, target);
  if (up && !down) k *= HILL.dmg;
  if (down && !up) k *= HILL.uphill;
  if (waterAt(sim.field, from.x, from.z) === "deep") k *= GROUND.wading;
  if (from.kind === "spearman" && (FIGHTERS[target.kind].charge || target.kind === "brute")) k *= BRACE;
  return k;
}

function hit(sim: BattleSim, from: { x: number; z: number }, target: Fighter, dmg: number) {
  const dealt = dmg * (0.85 + sim.rand() * 0.3);
  target.hp -= dealt;
  target.hurtAt = sim.t;
  const dx = target.x - from.x;
  const dz = target.z - from.z;
  const d = Math.hypot(dx, dz) || 1;
  if (!FIGHTERS[target.kind].still) {
    target.kx += (dx / d) * 0.9;
    target.kz += (dz / d) * 0.9;
  }
  if (target.hp <= 0 && target.alive) {
    target.alive = false;
    target.diedAt = sim.t;
    // They fall away from the blow: the harder it was, the further they fly.
    target.heading = Math.atan2(dx, dz);
    target.flung = Math.min(1.4, 0.25 + dealt / 5);
  }
}

// The nearest enemy within `range` (the raiders' bowmen shoot at anything;
// our archers leave walls alone), or null.
function nearestWithin(sim: BattleSim, f: Fighter, range: number) {
  let best: Fighter | null = null;
  let bestD = range;
  for (const o of sim.fighters) {
    if (!o.alive || o.side === f.side) continue;
    if (f.side === "us" && FIGHTERS[o.kind].still) continue;
    const d = Math.hypot(o.x - f.x, o.z - f.z);
    if (d < bestD) {
      bestD = d;
      best = o;
    }
  }
  return best;
}

// How far `p` is from the line from `a` to `b`.
function segmentDistance(a: { x: number; z: number }, b: { x: number; z: number }, p: { x: number; z: number }) {
  const vx = b.x - a.x;
  const vz = b.z - a.z;
  const len = vx * vx + vz * vz || 1;
  const k = Math.max(0, Math.min(1, ((p.x - a.x) * vx + (p.z - a.z) * vz) / len));
  return Math.hypot(a.x + vx * k - p.x, a.z + vz * k - p.z);
}

// Loose an arrow: the further, the likelier to miss; into the trees, likelier
// still; a rock in the way stops it.
function shoot(sim: BattleSim, f: Fighter, target: Fighter, dmg: number, range: number) {
  const d = Math.hypot(target.x - f.x, target.z - f.z);
  const chance = 0.08 + 0.3 * (d / range) + (inWoods(sim.field, target) ? GROUND.cover : 0);
  const miss = sim.rand() < chance ? 0.25 + sim.rand() * 0.35 : 0;
  const rock = sim.field.rocks.find((r) => Math.hypot(r.x - f.x, r.z - f.z) > r.r + 0.1 && segmentDistance(f, target, r) < r.r * 0.9);
  sim.arrows.push({ from: { x: f.x, z: f.z }, side: f.side, target: target.id, shot: sim.t, lands: sim.t + 0.25 + d / 6, dmg, miss, stop: rock ? { x: rock.x, z: rock.z } : undefined });
  f.struckAt = sim.t;
  f.heading = Math.atan2(target.x - f.x, target.z - f.z);
}

// One step of the fight (DT seconds).
export function stepBattle(sim: BattleSim) {
  if (sim.over) return;
  sim.t += DT;
  sim.steps++;
  const { fighters, field } = sim;
  const tactic = sim.setup.tactic ?? "rush";
  for (const f of fighters) {
    if (!f.alive) continue;
    const spec = FIGHTERS[f.kind];
    const boost = f.side === "us" ? sim.setup.usBoost : sim.setup.themBoost;
    f.cd -= DT;
    f.moving = false;
    if (spec.still) {
      // A tower: an arrow at the nearest raider in range.
      if (!spec.range || f.cd > 0) continue;
      const mark = nearestWithin(sim, f, spec.range);
      if (mark) {
        shoot(sim, f, mark, spec.shot!, spec.range);
        f.cd = spec.cooldown;
      }
      continue;
    }
    // A step along the ground (slower in the trees, the mud, the water, and
    // up a hill).
    const move = (dx: number, dz: number, speed: number) => {
      const d = Math.hypot(dx, dz);
      if (d < 1e-6 || speed <= 0) return;
      const climbing = !onHill(field, f) && onHill(field, { x: f.x + (dx / d) * 0.05, z: f.z + (dz / d) * 0.05 });
      const step = speed * DT * paceAt(field, f.x, f.z) * (climbing ? GROUND.climb : 1);
      f.x += (dx / d) * step;
      f.z += (dz / d) * step;
      f.run += step;
      f.moving = true;
    };
    // Towards a point, by the ford if there's a river in the way.
    const walkTo = (gx: number, gz: number, speed: number, stopAt = 0) => {
      const w = routeTo(field, f, gx, gz);
      const left = Math.hypot(w.x - f.x, w.z - f.z) - stopAt;
      if (left <= 0) return;
      move(w.x - f.x, w.z - f.z, Math.min(speed, left / DT));
      f.heading = Math.atan2(w.x - f.x, w.z - f.z);
    };
    // A blow at someone in reach (a charge if they've had a run-up).
    const strike = (o: Fighter, extra = 1) => {
      f.heading = Math.atan2(o.x - f.x, o.z - f.z);
      if (f.cd > 0) return;
      const charge = spec.charge && f.run > CHARGE.run ? CHARGE.dmg : 1;
      hit(sim, f, o, spec.dmg * Math.sqrt(boost) * extra * charge * blowFactor(sim, f, o));
      f.struckAt = sim.t;
      f.cd = spec.cooldown;
      f.run = 0;
      if (spec.charge) f.away = CHARGE.away;
    };
    const reachOf = (o: Fighter) => spec.reach + spec.radius + FIGHTERS[o.kind].radius;
    const range = spec.range ? spec.range * (onHill(field, f) ? HILL.range : 1) : 0;
    const volley = () => {
      const mark = nearestWithin(sim, f, range);
      if (!mark) return false;
      f.heading = Math.atan2(mark.x - f.x, mark.z - f.z);
      if (f.cd <= 0) {
        shoot(sim, f, mark, spec.shot! * Math.sqrt(boost) * (sim.control?.id === f.id ? HERO : 1), range);
        f.cd = spec.cooldown;
      }
      return true;
    };
    // Riders hit and run: after a charge they wheel away, then come again.
    if (f.away > 0 && sim.control?.id !== f.id) {
      f.away -= DT;
      const o = fighters[f.target] ?? nearestWithin(sim, f, 99);
      if (o) {
        const ax = f.x - o.x;
        const az = f.z - o.z;
        const inside = Math.abs(f.x + ax * 0.2) < HALF_W && Math.abs(f.z + az * 0.2) < 4.2;
        move(inside ? ax : -f.x, inside ? az : -f.z, spec.speed);
        f.heading = Math.atan2(inside ? ax : -f.x, inside ? az : -f.z);
        continue;
      }
    }
    // Fighting as this one: walk where the player says, strike (or shoot)
    // whoever is in reach.
    if (sim.control?.id === f.id) {
      const { dx, dz } = sim.control;
      if (dx || dz) {
        move(dx, dz, spec.speed * 1.15);
        f.heading = Math.atan2(dx, dz);
      }
      if (shoots(f.kind)) {
        volley();
        continue;
      }
      const near = nearestWithin(sim, f, 1);
      if (near && Math.hypot(near.x - f.x, near.z - f.z) <= reachOf(near)) strike(near, HERO);
      continue;
    }
    // Sent somewhere: go there (fighting off anyone who comes at them on the
    // way), then hold the spot (fighting anyone who comes close, shooting
    // anyone in range).
    if (f.goal) {
      const near = nearestWithin(sim, f, f.holding ? ORDERED.guard : ORDERED.engage);
      const gd = Math.hypot(f.goal.x - f.x, f.goal.z - f.z);
      if (shoots(f.kind)) {
        if (near && Math.hypot(near.x - f.x, near.z - f.z) <= reachOf(near)) strike(near);
        else if (!f.holding) {
          if (gd > 0.06) walkTo(f.goal.x, f.goal.z, spec.speed);
          else f.holding = true;
        } else if (!volley() && gd > 0.3) walkTo(f.goal.x, f.goal.z, spec.speed);
        continue;
      }
      if (near) {
        if (Math.hypot(near.x - f.x, near.z - f.z) <= reachOf(near)) strike(near);
        else walkTo(near.x, near.z, spec.speed, reachOf(near) * 0.9);
        continue;
      }
      if (gd > 0.06) walkTo(f.goal.x, f.goal.z, spec.speed);
      else {
        f.holding = true;
        // Facing the nearest raider, ready.
        const foe = nearestWithin(sim, f, 99);
        if (foe) f.heading = Math.atan2(foe.x - f.x, foe.z - f.z);
      }
      continue;
    }
    // Archers and bowmen: step back from anyone closing in (or hit them, if
    // there's no room); shoot whoever is in range; otherwise walk up until
    // someone is.
    if (shoots(f.kind)) {
      const close = nearestWithin(sim, f, 0.75);
      if (close && !FIGHTERS[close.kind].still) {
        const awayX = f.x - close.x;
        const awayZ = f.z - close.z;
        const room = canStand(field, f.x + awayX * 0.5, f.z + awayZ * 0.5);
        const touching = Math.hypot(awayX, awayZ) <= reachOf(close);
        if (room && !touching) {
          move(awayX, awayZ, spec.speed * 0.9);
          f.heading = Math.atan2(close.x - f.x, close.z - f.z);
          continue;
        }
        if (touching) {
          strike(close);
          continue;
        }
      }
      if (volley()) continue;
      const far = nearestWithin(sim, f, 99);
      if (far) walkTo(far.x, far.z, spec.speed);
      continue;
    }
    // The raiders' plan: in a volley, the rest wait while the bowmen shoot
    // (unless someone comes at them).
    if (f.side === "them" && tactic === "volley" && sim.t < 6 && !nearestWithin(sim, f, 1.3)) continue;
    // Our riders hold back until the raiders come close, then ride in as the
    // lines meet.
    if (f.side === "us" && spec.charge && sim.t < RIDERS_WAIT && !nearestWithin(sim, f, 2.6)) continue;
    f.retarget -= DT;
    if (f.target < 0 || !fighters[f.target].alive || f.retarget <= 0) {
      f.target = pickTarget(sim, f);
      f.retarget = 0.3;
    }
    if (f.target < 0) continue;
    const o = fighters[f.target];
    const d = Math.hypot(o.x - f.x, o.z - f.z);
    if (d <= reachOf(o)) {
      strike(o);
      continue;
    }
    // Flankers (in a flanking plan: the fast ones and the outer files) go
    // round the side first, until they're level with our line.
    const flanker = f.side === "them" && tactic === "flank" && (f.kind === "torch" || f.kind === "horseman" || Math.abs(f.x) > 1.6);
    const gx = flanker && f.z < o.z - 0.6 && sim.t < 20 ? Math.sign(f.x || 1) * (HALF_W - 0.2) : o.x;
    walkTo(gx, o.z, spec.speed, gx === o.x ? reachOf(o) * 0.9 : 0);
  }
  // Arrows land (or a palisade just in front of the mark, or a rock on the
  // way, catches them).
  sim.arrows = sim.arrows.filter((a) => {
    if (sim.t < a.lands) return true;
    const target = fighters[a.target];
    if (!target.alive || a.miss || a.stop) return false;
    const toTarget = Math.hypot(target.x - a.from.x, target.z - a.from.z);
    const wall = fighters.find(
      (w) =>
        w.alive &&
        w.kind === "palisade" &&
        w !== target &&
        w.side === target.side &&
        Math.hypot(w.x - target.x, w.z - target.z) < 0.6 &&
        Math.hypot(w.x - a.from.x, w.z - a.from.z) < toTarget &&
        segmentDistance(a.from, target, w) < FIGHTERS.palisade.radius + 0.08,
    );
    if (wall) hit(sim, a.from, wall, a.dmg * 0.3);
    else hit(sim, a.from, target, a.dmg);
    return false;
  });
  // Knocked back, and nobody stands inside anybody else, or a rock.
  for (const f of fighters) {
    if (!f.alive || FIGHTERS[f.kind].still) continue;
    f.x += f.kx * DT;
    f.z += f.kz * DT;
    f.kx *= 0.8;
    f.kz *= 0.8;
  }
  for (let i = 0; i < fighters.length; i++) {
    const a = fighters[i];
    if (!a.alive) continue;
    for (let j = i + 1; j < fighters.length; j++) {
      const b = fighters[j];
      if (!b.alive) continue;
      const min = FIGHTERS[a.kind].radius + FIGHTERS[b.kind].radius;
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const d = Math.hypot(dx, dz);
      if (d >= min || d < 1e-6) continue;
      const push = min - d;
      const aStill = !!FIGHTERS[a.kind].still;
      const bStill = !!FIGHTERS[b.kind].still;
      if (aStill && bStill) continue;
      const share = aStill ? 0 : bStill ? 1 : 0.5;
      a.x -= (dx / d) * push * share;
      a.z -= (dz / d) * push * share;
      b.x += (dx / d) * push * (1 - share);
      b.z += (dz / d) * push * (1 - share);
    }
  }
  for (const f of fighters) {
    if (!f.alive || FIGHTERS[f.kind].still) continue;
    for (const r of field.rocks) {
      const dx = f.x - r.x;
      const dz = f.z - r.z;
      const d = Math.hypot(dx, dz);
      const min = r.r + FIGHTERS[f.kind].radius;
      if (d < min) {
        // Slide round it.
        const k = d > 1e-6 ? min / d : 1;
        f.x = r.x + (d > 1e-6 ? dx : min) * k;
        f.z = r.z + (d > 1e-6 ? dz : 0) * k;
      }
    }
    f.x = Math.max(-HALF_W - 0.6, Math.min(HALF_W + 0.6, f.x));
    f.z = Math.max(-4.6, Math.min(4.6, f.z));
  }
  if (sim.control && !fighters[sim.control.id].alive) sim.control = null;
  const us = mobileAlive(sim, "us");
  const them = mobileAlive(sim, "them");
  if (!us || !them) {
    sim.over = true;
    sim.won = us && !them;
  } else if (sim.t >= TIME_LIMIT) {
    // Time's up: the raiders give up and run if we're still the stronger.
    const left = (side: Side) => fighters.filter((f) => f.alive && f.side === side && !FIGHTERS[f.kind].still).reduce((s, f) => s + f.hp, 0);
    sim.over = true;
    sim.won = left("us") >= left("them");
  }
}

export interface BattleResult {
  won: boolean;
  // Our figures that fell, by kind (the chief only gets hurt).
  fell: Partial<Record<FighterKind, number>>;
  theirsFell: number;
  seconds: number;
}

export function battleResult(sim: BattleSim): BattleResult {
  const fell: Partial<Record<FighterKind, number>> = {};
  for (const f of sim.fighters) if (!f.alive && f.side === "us") fell[f.kind] = (fell[f.kind] ?? 0) + 1;
  return { won: sim.won, fell, theirsFell: sim.fighters.filter((f) => !f.alive && f.side === "them" && !FIGHTERS[f.kind].still).length, seconds: sim.t };
}

// Carry out the orders given at this step (the battle screen and the engine
// both go through here, so they play the same fight).
export function applyOrders(sim: BattleSim, orders: Order[], from: number) {
  let k = from;
  while (k < orders.length && orders[k].at <= sim.steps) applyOrder(sim, orders[k++]);
  return k;
}

// The whole fight at once (the engine's way), with the player's orders
// replayed at the very same steps.
export function runBattle(setup: BattleSetup, orders: Order[] = []): BattleResult {
  const sim = startBattle(setup);
  const plan = orders.map((o, i) => ({ o, i })).sort((a, b) => a.o.at - b.o.at || a.i - b.i).map((x) => x.o);
  let k = 0;
  while (!sim.over) {
    k = applyOrders(sim, plan, k);
    stepBattle(sim);
  }
  return battleResult(sim);
}

// ---- Setting up ------------------------------------------------------------------

export type Roster = Partial<Record<FighterKind, number>>;

// Nudged out of rocks and deep water (to the nearest spot that's fine).
function fitSpot(field: Field, p: Placed): Placed {
  if (canStand(field, p.x, p.z)) return p;
  for (let r = 0.15; r < 1.6; r += 0.15)
    for (let a = 0; a < 8; a++) {
      const x = p.x + Math.cos((a / 8) * Math.PI * 2) * r;
      const z = p.z + Math.sin((a / 8) * Math.PI * 2) * r;
      if (canStand(field, x, z)) return { ...p, x, z };
    }
  return p;
}

// How the raiders line up: a loose crowd across their side, brutes at the
// front, torch-bearers out on the flanks, bowmen at the back. `strength`
// raider-equivalents of the given kind of raid (a band is all raiders, with a
// bowman or two; a war party brings brutes and bowmen; a fire raid
// torch-bearers; an army more brutes and bowmen, and horsemen from the
// Classical era). Their plan suits who came.
export function enemyLineup(
  strength: number,
  kind: "band" | "party" | "fire" | "army",
  seed: number,
  era = 0,
  biome: Biome = "grass",
): { theirs: Placed[]; themBoost: number; tactic: Tactic } {
  const rand = mulberry32(seed * 7 + 3);
  const brutes = kind === "party" ? Math.floor(strength * 0.15) : kind === "army" ? Math.floor(strength * 0.2) : 0;
  const torches = kind === "fire" ? Math.round((strength * 0.5) / 0.75) : 0;
  const bowmen = kind === "fire" ? 0 : Math.floor(strength * (kind === "band" ? 0.1 : 0.18));
  const horsemen = kind === "army" && era >= 2 ? Math.floor(strength * 0.1) : 0;
  const raiders = Math.max(1, Math.round(strength - brutes * 2 - torches * 0.75 - bowmen * 1.3 - horsemen * 2));
  const kinds: FighterKind[] = [
    ...Array(brutes).fill("brute"),
    ...Array(raiders).fill("raider"),
    ...Array(torches).fill("torch"),
    ...Array(horsemen).fill("horseman"),
    ...Array(bowmen).fill("bowman"),
  ];
  const plans: Tactic[] = ["rush"];
  if (torches || horsemen || kinds.length >= 8) plans.push("flank");
  if (bowmen >= 2) plans.push("volley");
  if (brutes >= 2) plans.push("wedge");
  const tactic = plans[Math.floor(rand() * plans.length)];
  // A big raid fights as fewer, tougher figures.
  const scale = Math.max(1, kinds.length / MAX_FIGHTERS);
  const n = Math.min(kinds.length, MAX_FIGHTERS);
  const picked = Array.from({ length: n }, (_, i) => kinds[Math.floor(i * scale)]);
  const front = picked.filter((k) => !shoots(k));
  const back = picked.filter((k) => shoots(k));
  const perRow = Math.max(4, Math.ceil(Math.sqrt(front.length * 2.2)));
  const theirs: Placed[] = front.map((k, i) => {
    const row = Math.floor(i / perRow);
    const col = i % perRow;
    let across = (col - (Math.min(perRow, front.length - row * perRow) - 1) / 2) * 0.48;
    let depth = -1.1 - row * 0.45 - (k === "brute" ? -0.15 : 0);
    // A wedge: narrow at the front, brutes at its point.
    if (tactic === "wedge") {
      across *= 0.55 + row * 0.18;
      depth -= Math.abs(across) * 0.35;
    }
    const flank = k === "torch" || k === "horseman" ? Math.sign(across || 1) * 1.2 : 0;
    return {
      kind: k,
      x: Math.max(-HALF_W, Math.min(HALF_W, across + flank + (rand() - 0.5) * 0.18)),
      z: Math.max(THEM_ZONE[0], Math.min(THEM_ZONE[1], depth + (rand() - 0.5) * 0.15)),
    };
  });
  // The bowmen, in a loose line behind.
  back.forEach((k, i) => {
    theirs.push({ kind: k, x: Math.max(-HALF_W, Math.min(HALF_W, (i - (back.length - 1) / 2) * 0.55 + (rand() - 0.5) * 0.2)), z: Math.max(THEM_ZONE[0], -2.7 - (i % 2) * 0.35) });
  });
  const field = fieldOf(seed, biome);
  return { theirs: theirs.map((p) => fitSpot(field, p)), themBoost: scale, tactic };
}

// Our army set out the usual way: palisades across the front, spearmen right
// behind them, warriors and mercenaries in one wide line, archers behind them
// (up on a hill if there's one on our side), riders behind the wings, the
// chief in the middle, towers at the back corners. (The "Auto" button, and a
// start to tweak.)
export function autoLineup(roster: Roster, seed?: number, biome: Biome = "grass"): Placed[] {
  const out: Placed[] = [];
  const row = (kind: FighterKind, n: number, z: number, gap: number, cx = 0) => {
    for (let i = 0; i < n; i++) {
      const perRow = Math.max(1, Math.floor((HALF_W * 2) / gap));
      const r = Math.floor(i / perRow);
      const inRow = Math.min(perRow, n - r * perRow);
      out.push({ kind, x: cx + (i % perRow - (inRow - 1) / 2) * gap, z: z + r * 0.4 });
    }
  };
  // The fighters on foot stand together in one wide line (a narrow one gets
  // surrounded), spears at the front.
  const line = (kinds: FighterKind[], z: number, gap: number) => {
    const all = kinds.flatMap((k) => Array<FighterKind>(roster[k] ?? 0).fill(k));
    const perRow = Math.max(1, Math.floor((HALF_W * 2) / gap));
    all.forEach((kind, i) => {
      const r = Math.floor(i / perRow);
      const inRow = Math.min(perRow, all.length - r * perRow);
      // Fill from the middle out, so mixed kinds stand shoulder to shoulder.
      const col = i % perRow;
      const slot = col % 2 ? Math.ceil(col / 2) : -Math.ceil(col / 2);
      out.push({ kind, x: (slot + (inRow % 2 ? 0 : 0.5)) * gap, z: z + r * 0.4 });
    });
  };
  row("palisade", roster.palisade ?? 0, 0.95, 0.5);
  row("spearman", roster.spearman ?? 0, 1.4, 0.42);
  line(["warrior", "merc"], roster.spearman ? 1.85 : 1.45, 0.4);
  const field = seed !== undefined ? fieldOf(seed, biome) : null;
  const hill = field?.hills.find((h) => h.z + h.r * 0.5 > US_ZONE[0]);
  row("archer", roster.archer ?? 0, hill ? Math.max(US_ZONE[0] + 0.05, hill.z) : 2.6, 0.36, hill ? hill.x * 0.8 : 0);
  const riders = roster.rider ?? 0;
  for (let i = 0; i < riders; i++) out.push({ kind: "rider", x: (i % 2 ? 1 : -1) * (2.4 - Math.floor(i / 2) * 0.4), z: 2.3 + (Math.floor(i / 2) % 2) * 0.4 });
  row("chief", roster.chief ?? 0, 2.95, 0.5);
  const towers = roster.tower ?? 0;
  for (let i = 0; i < towers; i++) out.push({ kind: "tower", x: (i % 2 ? 1 : -1) * (HALF_W - 0.6 - Math.floor(i / 2) * 0.7), z: 2.6 });
  return out
    .map((p) => ({ ...p, x: Math.max(-HALF_W, Math.min(HALF_W, p.x)), z: Math.max(US_ZONE[0], Math.min(US_ZONE[1], p.z)) }))
    .map((p) => (field ? fitSpot(field, p) : p));
}

// Whether a placement is allowed: on our side, inside the field, not in a
// rock or the river.
export function inOurZone(x: number, z: number, field?: Field) {
  return Math.abs(x) <= HALF_W && z >= US_ZONE[0] && z <= US_ZONE[1] && (!field || canStand(field, x, z));
}
