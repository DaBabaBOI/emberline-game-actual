"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { hexDistance } from "@/game/hex";
import { isLand } from "@/game/map";
import type { Raid, Tile } from "@/game/types";
import { Figures, HAIRS, SKINS, type Agent } from "./figures";
import { makeGround, type Ground } from "./ground";

const TUNICS = ["#b5651d", "#8e5a3a", "#a0522d", "#6b8e23", "#c2956b", "#9c6b3f"];

interface Walker extends Agent {
  tx: number;
  tz: number;
  ty: number;
  speed: number;
  wait: number;
  child: boolean;
}

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
    ...look,
  };
}

function retarget(w: Walker, ground: Ground, pickTarget: () => Tile) {
  const target = pickTarget();
  const spot = ground.spotOn(target);
  w.tx = spot.x;
  w.tz = spot.z;
}

// Walks toward the target, standing on whatever tile is underfoot. If the next
// step would go into a mountain, the sea or a building, pick somewhere else.
function stepWalker(w: Walker, dt: number, ground: Ground, pickTarget: () => Tile) {
  const dx = w.tx - w.x;
  const dz = w.tz - w.z;
  const dist = Math.hypot(dx, dz);
  if (dist < 0.05) {
    w.moving = false;
    w.wait -= dt;
    if (w.wait <= 0) {
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
      w.moving = false;
      retarget(w, ground, pickTarget);
    }
  }
  const floor = ground.heightAt(w.x, w.z);
  w.y += (floor - w.y) * Math.min(1, dt * 12);
}

const pick = (list: Tile[]) => list[Math.floor(Math.random() * list.length)];

export function Villagers({
  tiles,
  population,
  homeTile,
}: {
  tiles: Tile[];
  population: number;
  homeTile: Tile;
}) {
  const walkers = useRef<Walker[]>([]);
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
    };
  }, [tiles, homeTile]);

  const ground = useMemo(() => makeGround(tiles), [tiles]);
  const count = Math.min(60, Math.max(3, Math.ceil(population / 2)));

  useFrame((_, delta) => {
    const list = walkers.current;
    while (list.length < count) {
      const i = list.length;
      const child = i % 4 === 3;
      list.push(
        makeWalker(i, pick(spots.all), ground, {
          child,
          scale: child ? 0.95 : 1.35,
          tunic: child ? "#4a90d9" : TUNICS[i % TUNICS.length],
        }),
      );
    }
    list.length = count;
    const dt = Math.min(delta, 0.1);
    for (const w of list) {
      stepWalker(w, dt, ground, () => {
        if (w.child && spots.school.length && Math.random() < 0.6) return pick(spots.school);
        if (spots.fields.length && Math.random() < 0.3) return pick(spots.fields);
        return Math.random() < 0.4 ? pick(spots.wander) : pick(spots.all);
      });
    }
  });

  return <Figures agents={walkers} max={60} />;
}

export function Warriors({ tiles, soldiers, homeTile }: { tiles: Tile[]; soldiers: number; homeTile: Tile }) {
  const walkers = useRef<Walker[]>([]);
  const ground = useMemo(() => makeGround(tiles), [tiles]);
  const camps = useMemo(() => {
    const list = tiles.filter((t) => t.building === "warcamp");
    return list.length ? list : [homeTile];
  }, [tiles, homeTile]);

  useFrame((_, delta) => {
    const list = walkers.current;
    const count = Math.min(40, soldiers);
    while (list.length < count) {
      const i = list.length;
      list.push(
        makeWalker(i + 100, pick(camps), ground, { tunic: "#5b6f8a", hair: "#1a1a1a", scale: 1.4, speed: 0.5 }),
      );
    }
    list.length = count;
    const dt = Math.min(delta, 0.1);
    for (const w of list) stepWalker(w, dt, ground, () => pick(camps));
  });

  return <Figures agents={walkers} max={40} weapon="spear" />;
}

export function Raiders({ tiles, raid, tick }: { tiles: Tile[]; raid: Raid | null; tick: number }) {
  const agents = useRef<Agent[]>([]);
  const ground = useMemo(() => makeGround(tiles), [tiles]);
  const progress = useRef(0);

  useFrame((_, delta) => {
    if (!raid) {
      agents.current = [];
      return;
    }
    const from = tiles[raid.fromTile];
    const to = tiles[raid.targetTile];
    const goal = Math.min(1, (tick - raid.startTick) / (raid.arriveTick - raid.startTick));
    progress.current += (goal - progress.current) * Math.min(1, delta * 1.5);
    if (goal === 0) progress.current = 0;
    const p = progress.current;
    const heading = Math.atan2(to.x - from.x, to.z - from.z);
    const list = agents.current;
    list.length = raid.strength;
    for (let i = 0; i < raid.strength; i++) {
      const offX = (hash(i + 1) - 0.5) * 1.2;
      const offZ = (hash(i + 2) - 0.5) * 1.2;
      const x = from.x + (to.x - from.x) * p + offX;
      const z = from.z + (to.z - from.z) * p + offZ;
      const under = ground.tileAt(x, z);
      list[i] = {
        x,
        z,
        y: ground.heightAt(x, z) + (under?.terrain === "mountain" ? 0.55 : 0),
        heading,
        moving: p < 0.98,
        scale: 1.4,
        tunic: "#9b1c1c",
        skin: SKINS[i % SKINS.length],
        hair: "#1a1a1a",
        phase: i * 1.7,
      };
    }
  });

  return <Figures agents={agents} max={30} weapon="club" />;
}
