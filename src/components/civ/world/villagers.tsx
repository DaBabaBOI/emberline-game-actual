"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "./html";
import { Object3D, type Group, type InstancedMesh } from "three";
import { TICK_SECONDS } from "@/game/content";
import { hexDistance } from "@/game/hex";
import { isLand } from "@/game/map";
import type { Battle, Raid, Tile } from "@/game/types";
import { Figures, HAIRS, SKINS, WORK_TOOLS, type Agent } from "./figures";
import { makeGround, type Ground } from "./ground";
import { MAX_FIGURES, figureCounts } from "./crowd";
import { tileTop } from "./hex-terrain";
import { BUILDING_SCALE } from "./building-models";
import { KINGDOM_LOOK } from "./trade";

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
  // The place on a log they are sitting on or walking to ("tile:place").
  seat?: string;
  // What they look like and how fast they walk when healthy.
  baseTunic?: string;
  baseSpeed?: number;
  // The era their clothes were chosen for.
  era?: number;
  // Being carried by the player (the pick-up tool moves them).
  held?: boolean;
  // Helping at a building: where, and until when (performance.now ms). They
  // work a spot, then move to another on the same tile.
  workAt?: Tile | null;
  // On the way to a workplace, to start work there on arrival (by their own choice).
  goWork?: Tile | null;
  workUntil?: number;
  // What they face while working there (a tree, or the building).
  faceAt?: { x: number; z: number } | null;
  // Gone (dropped in a fire, the sea or the fog) until this time (performance.now ms).
  goneUntil?: number;
  // Running from a fight (BattleScene) to a safe spot.
  fleeing?: boolean;
  // Out hunting: the hunter (wildlife.tsx) walks in their place and hands them
  // back where the hunt ends, so nobody appears or vanishes.
  hunting?: boolean;
}

// Shared with the pick-up tool: the villagers on the map, and who is being carried.
// There is only ever one game on screen, so one shared store is enough.
export const grabStore: { walkers: Walker[]; held: Walker | null } = { walkers: [], held: null };

// Dev mode: send someone to work at each kind of workplace, to see how they work.
export const workDemo = { want: false };

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
const FIRE_SEAT = 0.5 * BUILDING_SCALE;
// Model angles of the log seats (must match CampfireModel in building-models.tsx).
const FIRE_SEATS = [0, 1.3, 2.6, 3.9, 5.2];
// Two people fit on each log, side by side (angle either side of its middle).
const FIRE_PLACES = FIRE_SEATS.flatMap((s) => [s - 0.2, s + 0.2]);

// A place on a log is taken while someone is still headed for it or sitting on it.
function placeTaken(key: string, self: Walker) {
  return grabStore.walkers.some((o) => o !== self && o.seat === key && o.sitAt && !o.held);
}

// People within `radius` of a fight run from it, `speed` times as fast.
const FLEE = { radius: 4.5, speed: 2.2 };

// How often a grown-up who walks to a workplace gets to work there, and for how long (s).
const SELF_WORK = { go: 0.35, chance: 0.85, min: 10, extra: 10 };

function retarget(w: Walker, ground: Ground, pickTarget: () => Tile, canWork = false) {
  const target = pickTarget();
  // A workplace: often they go there to work (see stepWalker).
  w.goWork =
    canWork && !w.child && w.tunic !== SICK_TUNIC && target.building && WORK_TOOLS[target.building] && Math.random() < SELF_WORK.chance ? target : null;
  if (target.building === "campfire") {
    // Sit on one of the log seats, picking one on the near side so the walk
    // there doesn't cross the fire. The model is turned (tile.id % 6) × 60°,
    // which turns a seat at model angle s to world angle s − turn.
    const turn = (target.id % 6) * (Math.PI / 3);
    const toWalker = Math.atan2(w.z - target.z, w.x - target.x);
    const off = (s: number) => Math.abs(Math.atan2(Math.sin(s - turn - toWalker), Math.cos(s - turn - toWalker)));
    // Only free places: nobody sits in someone else's lap.
    const free = FIRE_PLACES.map((s, i) => ({ s, key: `${target.id}:${i}` })).filter((p) => !placeTaken(p.key, w));
    if (free.length) {
      const near = free.filter((p) => off(p.s) < 1.4);
      const place = near.length ? near[Math.floor(Math.random() * near.length)] : free.reduce((a, b) => (off(a.s) < off(b.s) ? a : b));
      const a = place.s - turn;
      w.tx = target.x + Math.cos(a) * FIRE_SEAT;
      w.tz = target.z + Math.sin(a) * FIRE_SEAT;
      w.sitAt = target;
      w.seat = place.key;
      return;
    }
    // Every log is full: stand a little behind the logs, warming their hands.
    const a = toWalker + (Math.random() - 0.5) * 1.6;
    w.tx = target.x + Math.cos(a) * (FIRE_SEAT + 0.4);
    w.tz = target.z + Math.sin(a) * (FIRE_SEAT + 0.4);
    w.sitAt = null;
    w.seat = undefined;
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
  w.seat = undefined;
}

// Walks toward the target, standing on whatever tile is underfoot. If the next
// step would go into a mountain, the sea or a building, pick somewhere else.
function stepWalker(w: Walker, dt: number, ground: Ground, pickTarget: () => Tile, canWork = false) {
  // Paused: everyone stands still.
  if (dt <= 0) {
    w.moving = false;
    return;
  }
  const dx = w.tx - w.x;
  const dz = w.tz - w.z;
  const dist = Math.hypot(dx, dz);
  if (dist < 0.05) {
    w.moving = false;
    // Arrived at a workplace they chose: get to work there for a while.
    if (w.goWork) {
      const tile = w.goWork;
      w.goWork = null;
      w.working = true;
      w.workAt = tile;
      w.workTool = WORK_TOOLS[tile.building ?? ""];
      w.workUntil = performance.now() + (SELF_WORK.min + Math.random() * SELF_WORK.extra) * 1000;
      w.faceAt = { x: tile.x, z: tile.z };
      w.wait = 2 + Math.random() * 2;
    }
    // At work: face the tree being cut, or the field being hoed.
    if (w.workAt && w.faceAt) w.heading = Math.atan2(w.faceAt.x - w.x, w.faceAt.z - w.z);
    if (w.sitAt && !w.sitting) {
      w.sitting = true;
      w.heading = Math.atan2(w.sitAt.x - w.x, w.sitAt.z - w.z);
      w.wait = 6 + Math.random() * 8;
    }
    w.wait -= dt;
    if (w.wait <= 0 && w.workAt && performance.now() < (w.workUntil ?? 0)) {
      // Done with this patch (or tree): on to the next one.
      const spot = ground.workSpot(w.workAt, w.workTool);
      w.tx = spot.x;
      w.tz = spot.z;
      w.faceAt = spot.face;
      w.wait = 2.5 + Math.random() * 2;
      return;
    }
    if (w.wait <= 0) {
      w.sitting = false;
      w.working = false;
      w.workAt = null;
      w.faceAt = null;
      retarget(w, ground, pickTarget, canWork);
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
      // They no longer have a seat to go to: without this they sat down right
      // where they stopped, on the bare ground beside the fire instead of a log.
      w.moving = false;
      w.tx = w.x;
      w.tz = w.z;
      w.sitAt = null;
      // Couldn't get there: no work today, just look around.
      w.goWork = null;
      w.wait = 0.8 + Math.random() * 1.5;
    }
  }
  const floor = ground.heightAt(w.x, w.z);
  w.y += (floor - w.y) * Math.min(1, dt * 12);
}

export { MAX_FIGURES, figureCounts } from "./crowd";

const pick = (list: Tile[]) => list[Math.floor(Math.random() * list.length)];

export function Villagers({
  tiles,
  population,
  soldiers,
  homeTile,
  litFires,
  sick = 0,
  era = 0,
  cameos = [],
  tired = 0,
  gameSpeed = 1,
  danger = null,
}: {
  // A fight (raiders meeting our warriors): people nearby run from it.
  danger?: { x: number; z: number } | null;
  // The game's speed (0 paused, 1, 2, 4): people walk that much faster. Only
  // the speed setting changes it, never the era.
  gameSpeed?: number;
  // Team members who joined the tribe (an easter egg): crowned, with a name tag.
  cameos?: string[];
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
  // How tired the town is (0–1): that share of people sweat.
  tired?: number;
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
      // Places with work to do (see WORK_TOOLS): where grown-ups go to work.
      work: built.filter((t) => !!WORK_TOOLS[t.building!]),
      fires: built.filter((t) => t.building === "campfire" && litKey.split(",").includes(String(t.id))),
    };
  }, [tiles, homeTile, litKey]);

  const ground = useMemo(() => makeGround(tiles), [tiles]);
  const count = figureCounts(population, soldiers).villagers;
  // The cameos are the first grown-ups (every fourth figure is a child).
  const cameoAt = cameos.map((_, k) => k + Math.floor(k / 3)).filter((i) => i < count);
  const tags = useRef<(Group | null)[]>([]);
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
    // Fewer people: the last ones go, but never someone out hunting (they would
    // vanish mid-walk). Swap them in front first.
    for (let i = count; i < list.length; i++) {
      if (!list[i].hunting) continue;
      const stay = list.findIndex((w, j) => j < count && !w.hunting);
      if (stay >= 0) [list[stay], list[i]] = [list[i], list[stay]];
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
      w.speed = (ill ? w.baseSpeed * 0.35 : w.baseSpeed) * (w.fleeing ? FLEE.speed : 1);
    });
    const dt = Math.min(delta, 0.1) * gameSpeed;
    const now = performance.now();
    if (workDemo.want) {
      workDemo.want = false;
      const kinds = new Set<string>();
      for (const tile of tiles) {
        const tool = tile.building ? WORK_TOOLS[tile.building] : undefined;
        if (!tool || kinds.has(tile.building!)) continue;
        const w = list.find((v) => !v.child && !v.held && !v.hunting && !v.goneUntil && !v.working);
        if (!w) break;
        kinds.add(tile.building!);
        const spot = ground.workSpot(tile, tool);
        Object.assign(w, { x: spot.x, z: spot.z, tx: spot.x, tz: spot.z, working: true, workAt: tile, workTool: tool, faceAt: spot.face, workUntil: now + 60000, wait: 3, sitting: false, sitAt: null });
      }
    }
    for (const w of list) {
      // Someone who was lost comes back as a new face at a building.
      if (w.goneUntil && now >= w.goneUntil) {
        const spot = ground.spotOn(pick(spots.all));
        Object.assign(w, { x: spot.x, z: spot.z, tx: spot.x, tz: spot.z, goneUntil: undefined });
      }
      if (w.held || w.goneUntil || w.hunting) continue;
      // A fight nearby: drop everything and run to the far side of the village.
      const near = (t: { x: number; z: number }) => !!danger && Math.hypot(t.x - danger.x, t.z - danger.z) < FLEE.radius;
      if (danger && !w.fleeing && near(w)) {
        const away = Math.atan2(w.z - danger.z, w.x - danger.x);
        const want = { x: danger.x + Math.cos(away) * FLEE.radius * 1.5, z: danger.z + Math.sin(away) * FLEE.radius * 1.5 };
        const safe = [...spots.wander, ...spots.all]
          .filter((t) => !near(t))
          .sort((a, b) => Math.hypot(a.x - want.x, a.z - want.z) - Math.hypot(b.x - want.x, b.z - want.z))[0];
        if (safe) {
          const spot = ground.spotOn(safe);
          Object.assign(w, { tx: spot.x, tz: spot.z, wait: 0, fleeing: true, working: false, workAt: null, goWork: null, sitting: false, sitAt: null, seat: undefined });
        }
      } else if (!danger && w.fleeing) w.fleeing = false;
      stepWalker(w, dt, ground, () => {
        const choose = () => {
          if (spots.fires.length && Math.random() < 0.45) return pick(spots.fires);
          if (w.child && spots.school.length && Math.random() < 0.6) return pick(spots.school);
          if (!w.child && spots.work.length && Math.random() < SELF_WORK.go) return pick(spots.work);
          if (spots.fields.length && Math.random() < 0.3) return pick(spots.fields);
          return Math.random() < 0.4 ? pick(spots.wander) : pick(spots.all);
        };
        // While the fight goes on, nobody wanders back towards it.
        for (let k = 0; k < 6; k++) {
          const t = choose();
          if (!near(t)) return t;
        }
        return pick(spots.wander.filter((t) => !near(t))) ?? homeTile;
      }, true);
    }
    shown.current = list.filter((w) => !w.goneUntil && !w.hunting);
    grabStore.walkers = shown.current;
    // The cameos' crowns and name tags (hidden while they're away).
    list.forEach((w, i) => {
      w.crown = cameoAt.includes(i);
    });
    cameoAt.forEach((i, k) => {
      const tag = tags.current[k];
      const w = list[i];
      if (!tag || !w) return;
      tag.visible = !w.goneUntil && !w.hunting;
      tag.position.set(w.x, w.y + 0.95 * w.scale, w.z);
    });
  });

  return (
    <>
      <Figures agents={shown} max={MAX_FIGURES} colorKey={`${sickFigures}|${era}`} group="people" />
      <Sweat agents={shown} share={tired >= SWEAT_FROM / 100 ? Math.min(1, tired * 1.6) : 0} />
      {cameoAt.map((_, k) => (
        <group key={cameos[k]} ref={(el) => void (tags.current[k] = el)}>
          <Html zIndexRange={[12, 0]} center style={{ pointerEvents: "none" }}>
            <span className="font-pixel whitespace-nowrap rounded-sm bg-[#2b2119]/80 px-1 text-[10px] text-amber-200" data-testid="cameo-tag">
              {cameos[k]}
            </span>
          </Html>
        </group>
      ))}
    </>
  );
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
  gameSpeed = 1,
}: {
  // The game's speed: warriors walk that much faster (stand still when paused).
  gameSpeed?: number;
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
  // Warriors patrol the ground around their camps and the watch towers, and stand
  // watch at the fires, instead of all milling about on one tile.
  const patrol = useMemo(() => {
    const posts = [...camps, ...tiles.filter((t) => t.building === "watchfire")];
    const ring = tiles.filter(
      (t) =>
        t.revealed &&
        !t.building &&
        t.terrain !== "mountain" &&
        isLand(t.terrain) &&
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
    const dt = Math.min(delta, 0.1) * gameSpeed;
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
      <Figures agents={spearFigs} max={MAX_FIGURES} weapon="spear" colorKey={era} group="warriors" />
      <Figures agents={clubFigs} max={MAX_FIGURES} weapon="club" colorKey={era} group="warriors" />
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
    const list = agents.current;
    const count = Math.min(30, raid.legion ?? raid.strength);
    list.length = count;
    // Unit vectors along the way in, and across it.
    const len = Math.hypot(to.x - from.x, to.z - from.z) || 1;
    const ux = (to.x - from.x) / len;
    const uz = (to.z - from.z) / len;
    // A legion keeps its ranks; raiders come ashore in two or three groups that
    // fan out to the sides on curved paths and close in again, leaders first,
    // stragglers behind, each with its own weave.
    const groups = raid.roman ? 1 : count > 8 ? 3 : 2;
    const t = performance.now() / 1000;
    for (let i = 0; i < count; i++) {
      const g = i % groups;
      const side = groups === 1 ? 0 : g - (groups - 1) / 2;
      const lag = raid.roman ? 0 : hash(i + 11) * 0.12;
      const q = Math.max(0, Math.min(1, p * (1 + lag) - lag));
      const flank = side * 1.6 * Math.sin(q * Math.PI);
      const weave = raid.roman ? 0 : Math.sin(t * 1.3 + i * 2.1) * 0.12 * (q < 0.98 ? 1 : 0.3);
      // At the end they spread into a wide arc instead of one huddle.
      const arc = q * q * (hash(i + 5) - 0.5) * 1.8;
      const rank = raid.roman ? (Math.floor(i / 5) - 2) * 0.22 : (hash(i + 2) - 0.5) * 0.6;
      const file = raid.roman ? ((i % 5) - 2) * 0.24 : (hash(i + 1) - 0.5) * 0.6;
      const along = len * q - rank;
      const across = flank + file + weave + arc;
      const x = from.x + ux * along - uz * across;
      const z = from.z + uz * along + ux * across;
      const prev = list[i];
      const heading = prev && Math.hypot(x - prev.x, z - prev.z) > 1e-4 ? Math.atan2(x - prev.x, z - prev.z) : Math.atan2(ux, uz);
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
        moving: q < 0.98 && speed > 0,
        scale: 1.4,
        // A kingdom's soldiers wear its colours.
        tunic: raid.roman ? "#b3261e" : raid.kingdom ? KINGDOM_LOOK[raid.kingdom].tunic : "#9b1c1c",
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

// A fight with raiders, played out where the warriors met them. Not two lines
// shoving: each fighter picks an opponent and circles them, darting in to strike
// and backing off. The fallen are knocked back as they drop, survivors gang up
// on whoever is still standing, and at the end the losers scatter (raiders to
// their boats, or warriors home) while the winners chase them a little way.
type Fighter = Agent & { dies: boolean; dieAt: number; side: number; foe: number; orbit: number; spin: number; dart: number; speedK: number; vx: number; vz: number };

export function BattleScene({ tiles, battle, homeTile }: { tiles: Tile[]; battle: Battle | null; homeTile: Tile }) {
  const warriors = useRef<Agent[]>([]);
  const raiders = useRef<Agent[]>([]);
  const started = useRef<{ key: string; at: number }>({ key: "", at: 0 });
  const ground = useMemo(() => makeGround(tiles), [tiles]);
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
    const FIGHT = 7;

    if (started.current.key !== key) {
      started.current = { key, at: now };
      const nW = Math.min(battle.warriors, 8);
      const nR = Math.min(battle.raiders, 10);
      const lostW = battle.warriors ? Math.round((nW * battle.warriorsLost) / battle.warriors) : 0;
      const lostR = Math.round((nR * battle.raidersLost) / Math.max(1, battle.raiders));
      const make = (n: number, lost: number, side: number, look: Partial<Agent>) => {
        // Who falls, and when: spread over the fight, in no particular order.
        const order = Array.from({ length: n }, (_, i) => i).sort((p, q) => hash(p * 31 + side * 7 + battle.tick) - hash(q * 31 + side * 7 + battle.tick));
        return Array.from({ length: n }, (_, i) => {
          const across = (i - (n - 1) / 2) * 0.32 + (hash(i * 3 + side) - 0.5) * 0.2;
          // Each side starts a little way off and runs in.
          const back = 0.9 + hash(i * 5 + side * 2) * 0.5;
          const rank = order.indexOf(i);
          return {
            x: at.x + dx * back * side + px * across,
            y: tileTop(at),
            z: at.z + dz * back * side + pz * across,
            heading: Math.atan2(-dx * side, -dz * side),
            moving: true,
            scale: 1.4,
            skin: SKINS[(i + (side > 0 ? 0 : 2)) % SKINS.length],
            hair: "#1a1a1a",
            phase: i * 1.3,
            fallen: 0,
            dies: rank < lost,
            dieAt: 1.4 + (rank / Math.max(1, lost)) * (FIGHT - 2.2) + hash(i + side * 13) * 0.6,
            side,
            foe: i,
            orbit: hash(i * 7 + side) * Math.PI * 2,
            spin: (hash(i + 17 * side) > 0.5 ? 1 : -1) * (1.6 + hash(i * 11) * 1.4),
            dart: hash(i * 13 + side) * 3,
            speedK: 0.8 + hash(i * 19 + side) * 0.5,
            vx: 0,
            vz: 0,
            ...look,
          } as Fighter;
        });
      };
      warriors.current = make(nW, lostW, 1, { tunic: "#5b6f8a" });
      raiders.current = make(nR, lostR, -1, { tunic: battle.roman ? "#b3261e" : battle.rival ? "#6a2c8a" : "#9b1c1c" });
    }

    const age = now - started.current.at;
    if (age > FIGHT + 5) {
      warriors.current = [];
      raiders.current = [];
      return;
    }
    const dt = Math.min(delta, 0.1);
    const ws = warriors.current as Fighter[];
    const rs = raiders.current as Fighter[];
    const alive = (f: Fighter) => !(f.dies && age >= f.dieAt);
    const over = age >= FIGHT;

    const step = (list: Fighter[], enemies: Fighter[]) => {
      for (const a of list) {
        if (a.dies && age >= a.dieAt) {
          // Knocked back as they fall.
          if (a.fallen === 0) {
            const foe = enemies[a.foe % Math.max(1, enemies.length)];
            const kx = foe ? a.x - foe.x : -dx * a.side;
            const kz = foe ? a.z - foe.z : -dz * a.side;
            const k = Math.hypot(kx, kz) || 1;
            a.vx = (kx / k) * 0.9;
            a.vz = (kz / k) * 0.9;
          }
          a.moving = false;
          a.fallen = Math.min(1, (age - a.dieAt) / 0.35);
          a.x += a.vx * dt;
          a.z += a.vz * dt;
          a.vx *= 0.85;
          a.vz *= 0.85;
          a.y = ground.heightAt(a.x, a.z);
          continue;
        }
        let tx: number;
        let tz: number;
        let pace = 0.9 * a.speedK;
        const standing = enemies.filter(alive);
        if (over || !standing.length) {
          // The fight is over. Winners chase a short way; losers scatter.
          const raidersWon = battle.won === false;
          const lost = a.side > 0 ? raidersWon : !raidersWon;
          if (lost) {
            // Raiders run for the boats; beaten warriors fall back home.
            const away = a.side > 0 ? 1 : -1;
            tx = a.x + (dx * away + px * (hash(a.phase * 10) - 0.5) * 1.2) * 2;
            tz = a.z + (dz * away + pz * (hash(a.phase * 10) - 0.5) * 1.2) * 2;
            pace = 1.3 * a.speedK;
          } else {
            // Winning raiders push on to the village; winning warriors give chase, then stop.
            const chase = a.side > 0 ? -1 : 1;
            const stop = a.side > 0 && age > FIGHT + 2;
            tx = stop ? a.x : a.x + dx * chase * 2 + px * (hash(a.phase * 7) - 0.5);
            tz = stop ? a.z : a.z + dz * chase * 2 + pz * (hash(a.phase * 7) - 0.5);
            pace = 0.8 * a.speedK;
          }
        } else {
          // Pick a living opponent (when ours falls, the next one standing).
          let foe = enemies[a.foe % enemies.length];
          if (!foe || !alive(foe)) {
            foe = standing[Math.floor(hash(a.phase * 3 + Math.floor(age)) * standing.length)];
            a.foe = enemies.indexOf(foe);
          }
          // Circle them, darting in to strike and backing off again.
          a.orbit += a.spin * dt;
          const dart = Math.max(0, Math.sin(age * 4 + a.dart)) ** 6;
          const r = age < 1 ? 0.3 : 0.32 - dart * 0.22;
          tx = foe.x + Math.cos(a.orbit) * r;
          tz = foe.z + Math.sin(a.orbit) * r;
          pace = (age < 1 ? 1.4 : 1 + dart * 2) * a.speedK;
          a.heading = Math.atan2(foe.x - a.x, foe.z - a.z);
        }
        const ex = tx - a.x;
        const ez = tz - a.z;
        const dist = Math.hypot(ex, ez);
        const move = Math.min(dist, pace * dt);
        if (dist > 1e-3) {
          a.x += (ex / dist) * move;
          a.z += (ez / dist) * move;
          if (over || !standing.length) a.heading = Math.atan2(ex, ez);
        }
        a.moving = dist > 0.02;
        a.y = ground.heightAt(a.x, a.z);
      }
    };
    step(ws, rs);
    step(rs, ws);
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

// Sweat on tired people (from SWEAT_FROM tiredness): drops flick off the brow,
// either side in turn, and fall. The share of people sweating grows with how
// tired the town is, and whoever is working sweats first.
const DROPS = 3;
const SWEAT_FROM = 12;
const drop = new Object3D();
function Sweat({ agents, share }: { agents: React.RefObject<Walker[]>; share: number }) {
  const mesh = useRef<InstancedMesh>(null);
  useFrame(({ clock }) => {
    const m = mesh.current;
    if (!m) return;
    const t = clock.elapsedTime;
    const list = agents.current ?? [];
    let n = 0;
    for (let i = 0; i < Math.min(list.length, MAX_FIGURES) && share > 0; i++) {
      const w = list[i];
      // The same people sweat from frame to frame; children and sitters rest.
      if (w.child || w.sitting || w.held || (!w.working && hash(i + 31) > share)) continue;
      for (let k = 0; k < DROPS; k++) {
        const life = ((t * 1.1 + w.phase * 0.37 + k / DROPS) % 1 + 1) % 1;
        const side = k % 2 === 0 ? 1 : -1;
        // Out from the side of the head, then down.
        const out = 0.06 + life * 0.08;
        const ax = Math.cos(w.heading) * side;
        const az = -Math.sin(w.heading) * side;
        drop.position.set(w.x + ax * out * w.scale, w.y + (0.5 - life * life * 0.3) * w.scale, w.z + az * out * w.scale);
        const size = w.scale * (1 - life * 0.5);
        drop.scale.set(size, size * 1.5, size);
        drop.rotation.set(0, 0, 0);
        drop.updateMatrix();
        m.setMatrixAt(n++, drop.matrix);
      }
    }
    m.count = n;
    m.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, MAX_FIGURES * DROPS]} frustumCulled={false}>
      <sphereGeometry args={[0.045, 6, 5]} />
      <meshStandardMaterial color="#8fd3ff" emissive="#3aa0e0" emissiveIntensity={0.5} roughness={0.2} transparent opacity={0.9} />
    </instancedMesh>
  );
}
