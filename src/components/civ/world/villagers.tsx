"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { TICK_SECONDS } from "@/game/content";
import { hexDistance } from "@/game/hex";
import { isLand } from "@/game/map";
import type { Battle, Raid, Tile } from "@/game/types";
import { Figures, HAIRS, SKINS, type Agent } from "./figures";
import { makeGround, type Ground } from "./ground";
import { tileTop } from "./hex-terrain";

// Stone Age: hides and furs. Ancient era: dyed linen and wool.
const TUNICS = ["#b5651d", "#8e5a3a", "#a0522d", "#6b8e23", "#c2956b", "#9c6b3f"];
const ANCIENT_TUNICS = ["#e6dcc3", "#b5432f", "#3f5d8a", "#d9a441", "#7a8a3a", "#c0703a"];
const tunicsFor = (era: number) => (era >= 1 ? ANCIENT_TUNICS : TUNICS);
const childTunicFor = (era: number) => (era >= 1 ? "#e6dcc3" : "#4a90d9");

export interface Walker extends Agent {
  tx: number;
  tz: number;
  ty: number;
  speed: number;
  wait: number;
  child: boolean;
  sitAt: Tile | null;
  // What they look like and how fast they walk when healthy.
  baseTunic?: string;
  baseSpeed?: number;
  // The era their clothes were chosen for.
  era?: number;
  // Being carried by the player (the pick-up tool moves them).
  held?: boolean;
  // Gone (dropped in a fire, the sea or the fog) until this time (performance.now ms).
  goneUntil?: number;
}

// Shared with the pick-up tool: the villagers on the map, and who is being carried.
// There is only ever one game on screen, so one shared store is enough.
export const grabStore: { walkers: Walker[]; held: Walker | null } = { walkers: [], held: null };

const SICK_TUNIC = "#9db38a";

function hash(n: number) {
  const x = Math.sin(n * 91.7) * 43758.5453;
  return x - Math.floor(x);
}

function makeWalker(i: number, at: Tile, ground: Ground, look: Partial<Walker> = {}): Walker {
  const spot = ground.spotOn(at);
  return {
    x: spot.x,
    y: at.height,
    z: spot.z,
    tx: spot.x,
    tz: spot.z,
    ty: at.height,
    heading: 0,
    moving: false,
    scale: 1.35,
    tunic: TUNICS[i % TUNICS.length],
    skin: SKINS[Math.floor(hash(i + 3) * SKINS.length)],
    hair: HAIRS[Math.floor(hash(i + 7) * HAIRS.length)],
    phase: hash(i) * 10,
    speed: 0.35 + hash(i + 5) * 0.25,
    wait: hash(i + 9) * 2,
    child: false,
    sitAt: null,
    ...look,
  };
}

// Radius of the log seats around a campfire (model radius × building scale).
const FIRE_SEAT = 0.5 * 1.55;
// Model angles of the log seats (must match CampfireModel in building-models.tsx).
const FIRE_SEATS = [0, 1.3, 2.6, 3.9, 5.2];

function retarget(w: Walker, ground: Ground, pickTarget: () => Tile) {
  const target = pickTarget();
  if (target.building === "campfire") {
    // Sit on one of the log seats, picking one on the near side so the walk
    // there doesn't cross the fire. The model is turned (tile.id % 6) × 60°,
    // which turns a seat at model angle s to world angle s − turn.
    const turn = (target.id % 6) * (Math.PI / 3);
    const toWalker = Math.atan2(w.z - target.z, w.x - target.x);
    const off = (s: number) => Math.abs(Math.atan2(Math.sin(s - turn - toWalker), Math.cos(s - turn - toWalker)));
    const near = FIRE_SEATS.filter((s) => off(s) < 1.4);
    const seat = near.length
      ? near[Math.floor(Math.random() * near.length)]
      : FIRE_SEATS.reduce((a, b) => (off(a) < off(b) ? a : b));
    const a = seat - turn;
    w.tx = target.x + Math.cos(a) * FIRE_SEAT;
    w.tz = target.z + Math.sin(a) * FIRE_SEAT;
    w.sitAt = target;
    return;
  }
  if (target.building) {
    // Go to the side of the building that faces them, so the path doesn't run
    // into the building and make them turn back and forth.
    const a = Math.atan2(w.z - target.z, w.x - target.x) + (Math.random() - 0.5) * 1.6;
    w.tx = target.x + Math.cos(a) * 0.72;
    w.tz = target.z + Math.sin(a) * 0.72;
  } else {
    const spot = ground.spotOn(target);
    w.tx = spot.x;
    w.tz = spot.z;
  }
  w.sitAt = null;
}

// Walks toward the target, standing on whatever tile is underfoot. If the next
// step would go into a mountain, the sea or a building, pick somewhere else.
function stepWalker(w: Walker, dt: number, ground: Ground, pickTarget: () => Tile) {
  const dx = w.tx - w.x;
  const dz = w.tz - w.z;
  const dist = Math.hypot(dx, dz);
  if (dist < 0.05) {
    w.moving = false;
    if (w.sitAt && !w.sitting) {
      w.sitting = true;
      w.heading = Math.atan2(w.sitAt.x - w.x, w.sitAt.z - w.z);
      w.wait = 6 + Math.random() * 8;
    }
    w.wait -= dt;
    if (w.wait <= 0) {
      w.sitting = false;
      w.working = false;
      retarget(w, ground, pickTarget);
      w.wait = 1 + Math.random() * 3;
    }
  } else {
    const step = Math.min(dist, w.speed * dt);
    const nx = w.x + (dx / dist) * step;
    const nz = w.z + (dz / dist) * step;
    const stuck = !ground.walkable(w.x, w.z);
    if (stuck || ground.walkable(nx, nz)) {
      w.moving = true;
      w.heading = Math.atan2(dx, dz);
      w.x = nx;
      w.z = nz;
    } else {
      // Blocked: stop and look around for a moment before heading somewhere else.
      w.moving = false;
      w.tx = w.x;
      w.tz = w.z;
      w.wait = 0.8 + Math.random() * 1.5;
    }
  }
  const floor = ground.heightAt(w.x, w.z);
  w.y += (floor - w.y) * Math.min(1, dt * 12);
}

// People on the map stand for groups, not individuals: never more than
// MAX_FIGURES at once, counting the one hunter who can be out in the woods.
export const MAX_FIGURES = 20;

export function figureCounts(population: number, soldiers: number) {
  const budget = MAX_FIGURES - 1;
  let villagers = Math.max(2, Math.ceil(population / 3));
  // Warriors never take more than 40% of the figures, so the village never looks
  // like it's only guards.
  let warriors = soldiers > 0 ? Math.min(Math.ceil(soldiers / 2), Math.floor(budget * 0.4)) : 0;
  const total = villagers + warriors;
  if (total > budget) {
    warriors = soldiers > 0 ? Math.max(1, Math.round((budget * warriors) / total)) : 0;
    villagers = budget - warriors;
  }
  return { villagers, warriors };
}

const pick = (list: Tile[]) => list[Math.floor(Math.random() * list.length)];

export function Villagers({
  tiles,
  population,
  soldiers,
  homeTile,
  litFires,
  sick = 0,
  era = 0,
}: {
  // Clothes change with the era.
  era?: number;
  tiles: Tile[];
  population: number;
  soldiers: number;
  homeTile: Tile;
  // Share of the tribe that is sick (0–1): that many figures look ill and shuffle.
  sick?: number;
  // Tile ids of campfires that are burning; people only gather at those.
  litFires: number[];
}) {
  const walkers = useRef<Walker[]>([]);
  // The ones on the map right now (not away in the fog or lost).
  const shown = useRef<Walker[]>([]);
  const litKey = litFires.join(",");
  const spots = useMemo(() => {
    const built = tiles.filter((t) => t.building && t.building !== "warcamp");
    const wander = tiles.filter(
      (t) => t.revealed && isLand(t.terrain) && t.terrain !== "mountain" && hexDistance(t, homeTile) <= 4,
    );
    return {
      all: built.length ? built : [homeTile],
      wander: wander.length ? wander : [homeTile],
      school: built.filter((t) => t.building === "elder"),
      fields: built.filter((t) => t.building === "farm"),
      fires: built.filter((t) => t.building === "campfire" && litKey.split(",").includes(String(t.id))),
    };
  }, [tiles, homeTile, litKey]);

  const ground = useMemo(() => makeGround(tiles), [tiles]);
  const count = figureCounts(population, soldiers).villagers;
  const sickFigures = Math.min(count, Math.round(count * sick + (sick > 0 ? 0.49 : 0)));

  useFrame((_, delta) => {
    const list = walkers.current;
    while (list.length < count) {
      const i = list.length;
      const child = i % 4 === 3;
      list.push(
        makeWalker(i, pick(spots.all), ground, {
          child,
          scale: child ? 0.95 : 1.35,
          tunic: child ? childTunicFor(era) : tunicsFor(era)[i % TUNICS.length],
        }),
      );
    }
    list.length = count;
    list.forEach((w, i) => {
      // New era, new clothes.
      if (w.era !== era) {
        w.era = era;
        w.baseTunic = w.child ? childTunicFor(era) : tunicsFor(era)[i % TUNICS.length];
      }
      w.baseTunic ??= w.tunic;
      w.baseSpeed ??= w.speed;
      const ill = i < sickFigures;
      w.tunic = ill ? SICK_TUNIC : w.baseTunic;
      w.speed = ill ? w.baseSpeed * 0.35 : w.baseSpeed;
    });
    const dt = Math.min(delta, 0.1);
    const now = performance.now();
    for (const w of list) {
      // Someone who was lost comes back as a new face at a building.
      if (w.goneUntil && now >= w.goneUntil) {
        const spot = ground.spotOn(pick(spots.all));
        Object.assign(w, { x: spot.x, z: spot.z, tx: spot.x, tz: spot.z, goneUntil: undefined });
      }
      if (w.held || w.goneUntil) continue;
      stepWalker(w, dt, ground, () => {
        if (spots.fires.length && Math.random() < 0.45) return pick(spots.fires);
        if (w.child && spots.school.length && Math.random() < 0.6) return pick(spots.school);
        if (spots.fields.length && Math.random() < 0.3) return pick(spots.fields);
        return Math.random() < 0.4 ? pick(spots.wander) : pick(spots.all);
      });
    }
    shown.current = list.filter((w) => !w.goneUntil);
    grabStore.walkers = shown.current;
  });

  return <Figures agents={shown} max={MAX_FIGURES} colorKey={`${sickFigures}|${era}`} />;
}

export function Warriors({
  tiles,
  population,
  soldiers,
  spearmen = 0,
  homeTile,
  rally,
  hidden,
  era = 0,
}: {
  // Ancient-era warriors wear leather instead of hides.
  era?: number;
  tiles: Tile[];
  population: number;
  soldiers: number;
  // How many of them carry spears (the rest carry clubs).
  spearmen?: number;
  homeTile: Tile;
  // While raiders approach, warriors march to this tile to meet them.
  rally?: Tile | null;
  // Hidden while a battle is being played out (BattleScene draws them).
  hidden?: boolean;
}) {
  const walkers = useRef<Walker[]>([]);
  const spearFigs = useRef<Walker[]>([]);
  const clubFigs = useRef<Walker[]>([]);
  const ground = useMemo(() => makeGround(tiles), [tiles]);
  const camps = useMemo(() => {
    const list = tiles.filter((t) => t.building === "warcamp");
    return list.length ? list : [homeTile];
  }, [tiles, homeTile]);
  // Warriors patrol the ground around their camps and the watch fires, and stand
  // watch at the fires, instead of all milling about on one tile.
  const patrol = useMemo(() => {
    const posts = [...camps, ...tiles.filter((t) => t.building === "watchfire")];
    const ring = tiles.filter(
      (t) =>
        t.revealed &&
        !t.building &&
        t.terrain !== "mountain" &&
        t.terrain !== "shallow" &&
        t.terrain !== "deep" &&
        posts.some((p) => hexDistance(p, t) <= 2),
    );
    return [...posts, ...ring];
  }, [tiles, camps]);

  useFrame((_, delta) => {
    const list = walkers.current;
    const count = figureCounts(population, soldiers).warriors;
    while (list.length < count) {
      // A new recruit steps out of a war camp and heads off on patrol.
      const i = list.length;
      const recruit = makeWalker(i + 100, pick(camps), ground, { tunic: "#5b6f8a", hair: "#1a1a1a", scale: 1.4, speed: 0.6 });
      const post = ground.spotOn(pick(patrol));
      recruit.tx = post.x;
      recruit.tz = post.z;
      recruit.wait = 0;
      list.push(recruit);
    }
    list.length = count;
    // Split the figures between spears and clubs in proportion.
    const gear = era >= 1 ? "#7a5230" : "#5b6f8a";
    for (const w of list) w.tunic = gear;
    const withSpears = soldiers ? Math.round((count * Math.min(spearmen, soldiers)) / soldiers) : 0;
    spearFigs.current = list.slice(0, withSpears);
    clubFigs.current = list.slice(withSpears);
    const dt = Math.min(delta, 0.1);
    for (const w of list) {
      if (rally) {
        w.speed = 0.9;
        w.wait = 0;
      }
      stepWalker(w, dt, ground, () => rally ?? pick(patrol));
    }
  });

  if (hidden) return null;
  return (
    <>
      <Figures agents={spearFigs} max={MAX_FIGURES} weapon="spear" colorKey={era} />
      <Figures agents={clubFigs} max={MAX_FIGURES} weapon="club" colorKey={era} />
    </>
  );
}

export function Raiders({
  tiles,
  raid,
  tick,
  speed = 1,
}: {
  tiles: Tile[];
  raid: Raid | null;
  tick: number;
  // Game speed (0 = paused): raiders march at a steady pace that matches it.
  speed?: number;
}) {
  const agents = useRef<Agent[]>([]);
  const ground = useMemo(() => makeGround(tiles), [tiles]);
  const progress = useRef(0);
  const heights = useRef<number[]>([]);

  useFrame((_, delta) => {
    if (!raid) {
      agents.current = [];
      heights.current = [];
      progress.current = 0;
      return;
    }
    const from = tiles[raid.fromTile];
    const to = tiles[raid.meetTile ?? raid.targetTile];
    const span = Math.max(1, raid.arriveTick - raid.startTick);
    const goal = Math.min(1, (tick - raid.startTick) / span);
    // March at a steady pace (one tick of the way every TICK_SECONDS / speed), but
    // never more than one tick behind or ahead of the game. The old easing chased a
    // target that jumped every tick, so at 4x the raiders lurched and stuttered.
    const dt = Math.min(delta, 0.1);
    const pace = speed / TICK_SECONDS / span;
    const oneTick = 1 / span;
    progress.current = Math.min(1, Math.max(goal - oneTick, Math.min(goal + oneTick, progress.current + pace * dt)));
    if (goal <= 0) progress.current = 0;
    const p = progress.current;
    const heading = Math.atan2(to.x - from.x, to.z - from.z);
    const list = agents.current;
    const count = Math.min(30, raid.legion ?? raid.strength);
    list.length = count;
    for (let i = 0; i < count; i++) {
      const offX = (hash(i + 1) - 0.5) * 1.2;
      const offZ = (hash(i + 2) - 0.5) * 1.2;
      const x = from.x + (to.x - from.x) * p + offX;
      const z = from.z + (to.z - from.z) * p + offZ;
      const under = ground.tileAt(x, z);
      // Ease the height too, so they don't pop up and down at tile edges.
      const floor = ground.heightAt(x, z) + (under?.terrain === "mountain" ? 0.55 : 0);
      const y = heights.current[i] === undefined ? floor : heights.current[i] + (floor - heights.current[i]) * Math.min(1, dt * 10);
      heights.current[i] = y;
      list[i] = {
        x,
        z,
        y,
        heading,
        moving: p < 0.98 && speed > 0,
        scale: 1.4,
        tunic: raid.roman ? "#b3261e" : "#9b1c1c",
        skin: SKINS[i % SKINS.length],
        hair: "#1a1a1a",
        phase: i * 1.7,
      };
    }
  });

  return raid?.roman ? (
    <Figures agents={agents} max={30} weapon="sword" gear="roman" />
  ) : (
    <Figures agents={agents} max={30} weapon="club" />
  );
}

// People caught by a wildfire: they stagger, fall over in the flames, and lie
// there until that patch stops burning.
export function FireVictims({ tiles, victims }: { tiles: Tile[]; victims: { tile: number; tick: number }[] }) {
  const agents = useRef<Agent[]>([]);
  const started = useRef<{ key: string; at: number }>({ key: "", at: 0 });
  const burning = victims.filter((v) => (tiles[v.tile]?.scorch ?? 0) > 0.8);
  const key = burning.map((v, i) => `${v.tile}@${v.tick}#${i}`).join(",");

  useFrame(({ clock }, delta) => {
    const now = clock.elapsedTime;
    if (started.current.key !== key) {
      started.current = { key, at: now };
      agents.current = burning.map((v, i) => {
        const t = tiles[v.tile];
        const a = hash(v.tile * 7 + i) * Math.PI * 2;
        return {
          x: t.x + Math.cos(a) * 0.35,
          y: tileTop(t),
          z: t.z + Math.sin(a) * 0.35,
          heading: hash(v.tile + i * 3) * Math.PI * 2,
          moving: true,
          scale: 1.35,
          tunic: TUNICS[i % TUNICS.length],
          skin: SKINS[Math.floor(hash(i + 3) * SKINS.length)],
          hair: HAIRS[Math.floor(hash(i + 7) * HAIRS.length)],
          phase: i,
          fallen: 0,
        };
      });
    }
    const age = now - started.current.at;
    agents.current.forEach((a, i) => {
      const t = age - i * 0.3;
      if (t < 1.1) {
        // Stagger a few steps.
        a.moving = true;
        a.x += Math.sin(a.heading) * 0.25 * Math.min(delta, 0.1);
        a.z += Math.cos(a.heading) * 0.25 * Math.min(delta, 0.1);
      } else {
        a.moving = false;
        a.fallen = Math.min(1, (t - 1.1) / 0.45);
      }
    });
  });

  if (!burning.length) return null;
  return <Figures agents={agents} max={6} />;
}

// A fight with raiders, played out where the warriors met them: two lines
// clash, the fallen topple over one by one, then the winners move on (raiders
// flee to their boats, or march on the village if they won).
export function BattleScene({ tiles, battle, homeTile }: { tiles: Tile[]; battle: Battle | null; homeTile: Tile }) {
  const warriors = useRef<Agent[]>([]);
  const raiders = useRef<Agent[]>([]);
  const started = useRef<{ key: string; at: number }>({ key: "", at: 0 });
  const key = battle ? `${battle.tick}@${battle.tile}` : "";

  useFrame(({ clock }, delta) => {
    const now = clock.elapsedTime;
    if (!battle) {
      warriors.current = [];
      raiders.current = [];
      return;
    }
    const at = tiles[battle.tile];
    const from = tiles[battle.fromTile];
    // Unit vector from the shore towards the village, and one across it.
    const len = Math.hypot(homeTile.x - from.x, homeTile.z - from.z) || 1;
    const dx = (homeTile.x - from.x) / len;
    const dz = (homeTile.z - from.z) / len;
    const px = -dz;
    const pz = dx;
    const y = tileTop(at);

    if (started.current.key !== key) {
      started.current = { key, at: now };
      const nW = Math.min(battle.warriors, 8);
      const nR = Math.min(battle.raiders, 10);
      const lostW = battle.warriors ? Math.round((nW * battle.warriorsLost) / battle.warriors) : 0;
      const lostR = Math.round((nR * battle.raidersLost) / Math.max(1, battle.raiders));
      const line = (n: number, lost: number, side: number, look: Partial<Agent>) =>
        Array.from({ length: n }, (_, i) => {
          const across = (i - (n - 1) / 2) * 0.28;
          return {
            x: at.x + dx * 0.3 * side + px * across,
            y,
            z: at.z + dz * 0.3 * side + pz * across,
            heading: Math.atan2(-dx * side, -dz * side),
            moving: true,
            scale: 1.4,
            skin: SKINS[(i + (side > 0 ? 0 : 2)) % SKINS.length],
            hair: "#1a1a1a",
            phase: i * 1.3,
            fallen: 0,
            // Every other fighter along the line falls, until the losses are covered.
            dies: i % 2 === 0 ? i / 2 < lost : Math.floor(i / 2) < lost - Math.ceil(n / 2),
            order: i,
            ...look,
          } as Agent & { dies: boolean; order: number };
        });
      warriors.current = line(nW, lostW, 1, { tunic: "#5b6f8a" });
      raiders.current = line(nR, lostR, -1, { tunic: battle.roman ? "#b3261e" : "#9b1c1c" });
    }

    const age = now - started.current.at;
    if (age > 11) {
      warriors.current = [];
      raiders.current = [];
      return;
    }
    const dt = Math.min(delta, 0.1);
    const step = (list: Agent[], side: number) => {
      let falling = 0;
      for (const raw of list) {
        const a = raw as Agent & { dies: boolean; order: number };
        if (a.dies) {
          const fallAt = 0.9 + falling * 0.35;
          falling++;
          if (age > fallAt) {
            a.moving = false;
            a.fallen = Math.min(1, (age - fallAt) / 0.4);
            continue;
          }
        }
        if (age < 3) {
          // Lunge back and forth at the enemy line.
          const lunge = Math.sin(age * 9 + a.phase) * 0.012;
          a.x += dx * lunge * -side;
          a.z += dz * lunge * -side;
          a.moving = true;
        } else {
          // Warriors head home; raiders flee to the boats, or push on if they won.
          const dir = side > 0 ? 1 : battle.won ? -1 : 1;
          const speed = side < 0 && battle.won ? 0.7 : 0.4;
          a.x += dx * dir * speed * dt;
          a.z += dz * dir * speed * dt;
          a.heading = Math.atan2(dx * dir, dz * dir);
          a.moving = true;
        }
      }
    };
    step(warriors.current, 1);
    step(raiders.current, -1);
  });

  if (!battle) return null;
  return (
    <>
      <Figures agents={warriors} max={8} weapon="spear" />
      {battle.roman ? (
        <Figures agents={raiders} max={10} weapon="sword" gear="roman" />
      ) : (
        <Figures agents={raiders} max={10} weapon="club" />
      )}
    </>
  );
}
