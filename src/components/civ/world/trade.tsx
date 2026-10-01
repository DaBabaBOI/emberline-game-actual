"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { TICK_SECONDS } from "@/game/content";
import { ISLANDS, isLand } from "@/game/map";
import type { Tile } from "@/game/types";

// Where trade ships sail: from the home island's coast to the Silk Steppe's,
// between the two points of open water that face each other.
function tradeRoute(tiles: Tile[], home: Tile) {
  const steppe = ISLANDS[1];
  const coast = (island: number) =>
    tiles.filter((t) => !isLand(t.terrain) && t.terrain !== "river" && tiles.some((n) => n.island === island && Math.hypot(n.x - t.x, n.z - t.z) < 1.8));
  const from = coast(home.island).sort((a, b) => Math.hypot(a.x - steppe.x, a.z - steppe.z) - Math.hypot(b.x - steppe.x, b.z - steppe.z))[0];
  const to = coast(1).sort((a, b) => Math.hypot(a.x - home.x, a.z - home.z) - Math.hypot(b.x - home.x, b.z - home.z))[0];
  return from && to ? { from, to } : null;
}

// The sea doesn't move, so the route is worked out once per home island.
const routes = new Map<number, ReturnType<typeof tradeRoute>>();
function routeFor(tiles: Tile[], home: Tile) {
  if (!routes.has(home.id)) routes.set(home.id, tradeRoute(tiles, home));
  return routes.get(home.id) ?? null;
}

// One small trading ship: a hull, a mast and a striped sail.
function Ship({ route, start, back, tick, speed }: { route: { from: Tile; to: Tile }; start: number; back: number; tick: number; speed: number }) {
  const ref = useRef<Group>(null);
  const progress = useRef(-1);
  useFrame(({ clock }, delta) => {
    const g = ref.current;
    if (!g) return;
    const span = Math.max(1, back - start);
    const goal = Math.min(1, Math.max(0, (tick - start) / span));
    // A steady pace that matches the game speed, never more than a tick off.
    const oneTick = 1 / span;
    if (progress.current < 0) progress.current = goal;
    progress.current = Math.min(goal + oneTick, Math.max(goal - oneTick, progress.current + (speed / TICK_SECONDS / span) * Math.min(delta, 0.1)));
    const p = progress.current;
    // Out to the steppe for the first half, home again for the second.
    const leg = p < 0.5 ? p * 2 : 2 - p * 2;
    const { from, to } = route;
    g.position.set(from.x + (to.x - from.x) * leg, 0.2 + Math.sin(clock.elapsedTime * 2) * 0.03, from.z + (to.z - from.z) * leg);
    g.rotation.y = Math.atan2(to.x - from.x, to.z - from.z) + (p < 0.5 ? 0 : Math.PI);
    g.rotation.z = Math.sin(clock.elapsedTime * 1.5) * 0.05;
  });
  return (
    <group ref={ref} scale={1.4}>
      <mesh castShadow position={[0, 0.06, 0]}>
        <boxGeometry args={[0.26, 0.12, 0.7]} />
        <meshStandardMaterial color="#7a5230" flatShading />
      </mesh>
      <mesh position={[0, 0.13, 0.36]} rotation={[0.5, 0, 0]}>
        <boxGeometry args={[0.2, 0.08, 0.14]} />
        <meshStandardMaterial color="#6b4a2b" flatShading />
      </mesh>
      <mesh position={[0, 0.45, 0]}>
        <cylinderGeometry args={[0.018, 0.022, 0.7, 6]} />
        <meshStandardMaterial color="#5e3b1c" />
      </mesh>
      <mesh castShadow position={[0, 0.5, 0.02]}>
        <boxGeometry args={[0.5, 0.4, 0.02]} />
        <meshStandardMaterial color="#f1e6cf" />
      </mesh>
      <mesh position={[0, 0.5, 0.032]}>
        <boxGeometry args={[0.5, 0.08, 0.005]} />
        <meshStandardMaterial color="#b3261e" />
      </mesh>
      {/* Goods stacked on deck. */}
      <mesh position={[0.05, 0.15, -0.2]}>
        <boxGeometry args={[0.12, 0.08, 0.12]} />
        <meshStandardMaterial color="#c9a24a" />
      </mesh>
    </group>
  );
}

// Caravans out trading with the Silk Steppe, drawn as ships on the sea.
export function TradeShips({
  tiles,
  home,
  caravans,
  tick,
  speed,
}: {
  tiles: Tile[];
  home: Tile;
  caravans: { start: number; back: number }[];
  tick: number;
  speed: number;
}) {
  if (!caravans.length) return null;
  const route = routeFor(tiles, home);
  if (!route) return null;
  return (
    <group>
      {caravans.map((c, i) => (
        <Ship key={`${c.start}-${i}`} route={route} start={c.start} back={c.back} tick={tick} speed={speed} />
      ))}
    </group>
  );
}
