// Commanded battles: when raiders land, the player can place the army on a
// field (warriors, spearmen, the chief, palisades, towers) and watch it fight,
// unit by unit. The fight is simulated here, step by step, the same way every
// time for the same setup: the battle screen plays it out to watch, and the
// engine plays it again to take the result (so what you saw is what happens).
//
// The field: x across (-HALF_W to HALF_W), z towards the camera. Our side
// deploys in z UP_ZONE (in front of the camera), the raiders in THEM_ZONE.

import { mulberry32 } from "./noise";

export type FighterKind = "warrior" | "spearman" | "chief" | "raider" | "brute" | "torch" | "palisade" | "tower";
export type Side = "us" | "them";
export interface Placed {
  kind: FighterKind;
  x: number;
  z: number;
}

// hp, damage a blow, reach (beyond both bodies), walking speed (units/s),
// seconds between blows, body radius; `still`: doesn't move (palisade,
// tower); `range`: shoots arrows that far (tower). Roughly, a warrior and a
// raider are an even match; a spearman is worth 1.5, a brute 2, the chief 2.5,
// a torch-bearer 0.75 (fast, but they burn out quick).
export const FIGHTERS: Record<FighterKind, { hp: number; dmg: number; reach: number; speed: number; cooldown: number; radius: number; still?: boolean; range?: number }> = {
  warrior: { hp: 10, dmg: 3, reach: 0.12, speed: 1.0, cooldown: 0.8, radius: 0.13 },
  spearman: { hp: 10, dmg: 4.2, reach: 0.38, speed: 0.9, cooldown: 0.8, radius: 0.13 },
  chief: { hp: 22, dmg: 3.6, reach: 0.14, speed: 1.15, cooldown: 0.7, radius: 0.15 },
  raider: { hp: 10, dmg: 3, reach: 0.12, speed: 1.05, cooldown: 0.8, radius: 0.13 },
  brute: { hp: 18, dmg: 4.2, reach: 0.14, speed: 0.8, cooldown: 1.0, radius: 0.16 },
  torch: { hp: 7, dmg: 3, reach: 0.12, speed: 1.35, cooldown: 0.75, radius: 0.12 },
  palisade: { hp: 32, dmg: 0, reach: 0, speed: 0, cooldown: 1, radius: 0.2, still: true },
  tower: { hp: 40, dmg: 2.4, reach: 0, speed: 0, cooldown: 1.2, radius: 0.28, still: true, range: 3.4 },
};

export const HALF_W = 4.2;
export const US_ZONE: [number, number] = [0.7, 3.4];
export const THEM_ZONE: [number, number] = [-3.4, -0.7];
// The most figures a side puts on the field; a bigger army fights as fewer,
// tougher figures.
export const MAX_FIGHTERS = 40;
const DT = 0.05;
// After this long the raiders give up and run.
export const TIME_LIMIT = 75;

export interface BattleSetup {
  seed: number;
  ours: Placed[];
  theirs: Placed[];
  // How much tougher (hp and blows) each of our / their figures is: arms
  // (bronze, iron...) and a big army packed into fewer figures.
  usBoost: number;
  themBoost: number;
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
  // When they last struck, and when they fell (and which way they face).
  struckAt: number;
  diedAt: number;
  heading: number;
  moving: boolean;
}

export interface Arrow {
  from: { x: number; z: number };
  target: number;
  shot: number;
  lands: number;
  dmg: number;
}

export interface BattleSim {
  setup: BattleSetup;
  t: number;
  fighters: Fighter[];
  arrows: Arrow[];
  rand: () => number;
  over: boolean;
  won: boolean;
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
      diedAt: -1,
      heading: side === "us" ? Math.PI : 0,
      moving: false,
    });
  };
  setup.ours.forEach((p) => add(p, "us"));
  setup.theirs.forEach((p) => add(p, "them"));
  return { setup, t: 0, fighters, arrows: [], rand: mulberry32(setup.seed), over: false, won: false };
}

const mobileAlive = (sim: BattleSim, side: Side) => sim.fighters.some((f) => f.alive && f.side === side && !FIGHTERS[f.kind].still);

// Who a fighter goes for: the nearest enemy still standing. Raiders also go
// for palisades and towers in their way; our people leave those alone.
function pickTarget(sim: BattleSim, f: Fighter) {
  let best = -1;
  let bestD = Infinity;
  for (const o of sim.fighters) {
    if (!o.alive || o.side === f.side) continue;
    if (f.side === "us" && FIGHTERS[o.kind].still) continue;
    const d = Math.hypot(o.x - f.x, o.z - f.z);
    if (d < bestD) {
      bestD = d;
      best = o.id;
    }
  }
  return best;
}

function hit(sim: BattleSim, from: { x: number; z: number }, target: Fighter, dmg: number) {
  target.hp -= dmg * (0.85 + sim.rand() * 0.3);
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
    // They fall away from the blow.
    target.heading = Math.atan2(dx, dz);
  }
}

// One step of the fight (DT seconds).
export function stepBattle(sim: BattleSim) {
  if (sim.over) return;
  sim.t += DT;
  const { fighters } = sim;
  for (const f of fighters) {
    if (!f.alive) continue;
    const spec = FIGHTERS[f.kind];
    const boost = f.side === "us" ? sim.setup.usBoost : sim.setup.themBoost;
    f.cd -= DT;
    f.moving = false;
    if (spec.range) {
      // A tower: an arrow at the nearest raider in range.
      if (f.cd > 0) continue;
      let best: Fighter | null = null;
      let bestD = spec.range;
      for (const o of fighters) {
        if (!o.alive || o.side === f.side) continue;
        const d = Math.hypot(o.x - f.x, o.z - f.z);
        if (d < bestD) {
          bestD = d;
          best = o;
        }
      }
      if (best) {
        sim.arrows.push({ from: { x: f.x, z: f.z }, target: best.id, shot: sim.t, lands: sim.t + bestD / 7, dmg: spec.dmg });
        f.cd = spec.cooldown;
      }
      continue;
    }
    if (spec.still) continue;
    f.retarget -= DT;
    if (f.target < 0 || !fighters[f.target].alive || f.retarget <= 0) {
      f.target = pickTarget(sim, f);
      f.retarget = 0.3;
    }
    if (f.target < 0) continue;
    const o = fighters[f.target];
    const dx = o.x - f.x;
    const dz = o.z - f.z;
    const d = Math.hypot(dx, dz);
    f.heading = Math.atan2(dx, dz);
    const reach = spec.reach + spec.radius + FIGHTERS[o.kind].radius;
    if (d > reach) {
      const step = Math.min(d - reach * 0.9, spec.speed * DT);
      f.x += (dx / d) * step;
      f.z += (dz / d) * step;
      f.moving = true;
    } else if (f.cd <= 0) {
      hit(sim, f, o, spec.dmg * Math.sqrt(boost));
      f.struckAt = sim.t;
      f.cd = spec.cooldown;
    }
  }
  // Arrows land.
  sim.arrows = sim.arrows.filter((a) => {
    if (sim.t < a.lands) return true;
    const target = fighters[a.target];
    if (target.alive) hit(sim, a.from, target, a.dmg);
    return false;
  });
  // Knocked back, and nobody stands inside anybody else.
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
    f.x = Math.max(-HALF_W - 0.6, Math.min(HALF_W + 0.6, f.x));
    f.z = Math.max(-4.6, Math.min(4.6, f.z));
  }
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

// The whole fight at once (the engine's way).
export function runBattle(setup: BattleSetup): BattleResult {
  const sim = startBattle(setup);
  while (!sim.over) stepBattle(sim);
  return battleResult(sim);
}

// ---- Setting up ------------------------------------------------------------------

export type Roster = Partial<Record<FighterKind, number>>;

// How the raiders line up: a loose crowd across their side, brutes at the
// front, torch-bearers out on the flanks. `strength` raider-equivalents of
// the given kind of raid (a band is all raiders; a war party brings brutes; a
// fire raid torch-bearers; an army more brutes).
export function enemyLineup(strength: number, kind: "band" | "party" | "fire" | "army", seed: number): { theirs: Placed[]; themBoost: number } {
  const rand = mulberry32(seed * 7 + 3);
  const brutes = kind === "party" ? Math.floor(strength * 0.15) : kind === "army" ? Math.floor(strength * 0.25) : 0;
  const torches = kind === "fire" ? Math.round((strength * 0.5) / 0.75) : 0;
  const raiders = Math.max(1, Math.round(strength - brutes * 2 - torches * 0.75));
  const kinds: FighterKind[] = [...Array(brutes).fill("brute"), ...Array(raiders).fill("raider"), ...Array(torches).fill("torch")];
  // A big raid fights as fewer, tougher figures.
  const scale = Math.max(1, kinds.length / MAX_FIGHTERS);
  const n = Math.min(kinds.length, MAX_FIGHTERS);
  const picked = Array.from({ length: n }, (_, i) => kinds[Math.floor(i * scale)]);
  const perRow = Math.max(4, Math.ceil(Math.sqrt(n * 2.2)));
  const theirs = picked.map((k, i) => {
    const row = Math.floor(i / perRow);
    const col = i % perRow;
    const across = (col - (Math.min(perRow, n - row * perRow) - 1) / 2) * 0.48;
    const flank = k === "torch" ? Math.sign(across || 1) * 1.2 : 0;
    return {
      kind: k,
      x: Math.max(-HALF_W, Math.min(HALF_W, across + flank + (rand() - 0.5) * 0.18)),
      z: Math.max(THEM_ZONE[0], Math.min(THEM_ZONE[1], -1.1 - row * 0.45 - (k === "brute" ? -0.15 : 0) + (rand() - 0.5) * 0.15)),
    };
  });
  return { theirs, themBoost: scale };
}

// Our army set out the usual way: palisades across the front, spearmen right
// behind them, warriors in rows behind, the chief in the middle, towers at
// the back corners. (The "Auto" button, and a start to tweak.)
export function autoLineup(roster: Roster): Placed[] {
  const out: Placed[] = [];
  const row = (kind: FighterKind, n: number, z: number, gap: number) => {
    for (let i = 0; i < n; i++) {
      const perRow = Math.max(1, Math.floor((HALF_W * 2) / gap));
      const r = Math.floor(i / perRow);
      const inRow = Math.min(perRow, n - r * perRow);
      out.push({ kind, x: (i % perRow - (inRow - 1) / 2) * gap, z: z + r * 0.4 });
    }
  };
  row("palisade", roster.palisade ?? 0, 0.95, 0.5);
  row("spearman", roster.spearman ?? 0, 1.4, 0.42);
  row("warrior", roster.warrior ?? 0, 1.85, 0.4);
  row("chief", roster.chief ?? 0, 2.9, 0.5);
  const towers = roster.tower ?? 0;
  for (let i = 0; i < towers; i++) out.push({ kind: "tower", x: (i % 2 ? 1 : -1) * (HALF_W - 0.6 - Math.floor(i / 2) * 0.7), z: 2.6 });
  return out.map((p) => ({ ...p, z: Math.max(US_ZONE[0], Math.min(US_ZONE[1], p.z)) }));
}

// Whether a placement is allowed: on our side, inside the field.
export function inOurZone(x: number, z: number) {
  return Math.abs(x) <= HALF_W && z >= US_ZONE[0] && z <= US_ZONE[1];
}
