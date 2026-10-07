"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { Html } from "./html";
import { CANOE, DIPLOMACY, KINGDOMS, TICK_SECONDS } from "@/game/content";
import { moodOf, nextVoyage } from "@/game/engine";
import { ISLANDS, isLand } from "@/game/map";
import type { GameState, KingdomId, Tile } from "@/game/types";

type Point = { x: number; z: number };
type Route = { from: Point; to: Point };

// Open water next to an island.
const coastOf = (tiles: Tile[], island: number) =>
  tiles.filter((t) => !isLand(t.terrain) && t.terrain !== "river" && tiles.some((n) => n.island === island && Math.hypot(n.x - t.x, n.z - t.z) < 1.8));

// A sea route from the home island's coast to another island's, between the
// two points of open water that face each other.
function seaRoute(tiles: Tile[], home: Tile, island: number): Route | null {
  const there = ISLANDS[island];
  if (!there) return null;
  const from = coastOf(tiles, home.island).sort((a, b) => Math.hypot(a.x - there.x, a.z - there.z) - Math.hypot(b.x - there.x, b.z - there.z))[0];
  const to = coastOf(tiles, island).sort((a, b) => Math.hypot(a.x - home.x, a.z - home.z) - Math.hypot(b.x - home.x, b.z - home.z))[0];
  return from && to ? { from, to } : null;
}

// The sea doesn't move, so each route is worked out once.
const routes = new Map<string, Route | null>();
function routeFor(tiles: Tile[], home: Tile, island = 1) {
  const key = `${home.id}-${island}`;
  if (!routes.has(key)) routes.set(key, seaRoute(tiles, home, island));
  return routes.get(key) ?? null;
}

// From an island's coast to a point on the water (where an army lands).
function landingRoute(tiles: Tile[], island: number, at: Tile): Route | null {
  const from = coastOf(tiles, island).sort((a, b) => Math.hypot(a.x - at.x, a.z - at.z) - Math.hypot(b.x - at.x, b.z - at.z))[0];
  return from ? { from, to: at } : null;
}

// One small ship: a hull, a mast and a striped sail. A round trip goes out for
// the first half and comes home for the second; a one-way trip (an army) sails
// in over `arrive` of the time and then lies at anchor. `side` spreads a
// fleet out sideways.
function Ship({
  route,
  start,
  back,
  tick,
  speed,
  sail = "#f1e6cf",
  stripe = "#b3261e",
  oneWay,
  side = 0,
  canoe,
}: {
  route: Route;
  start: number;
  back: number;
  tick: number;
  speed: number;
  sail?: string;
  stripe?: string;
  oneWay?: { arrive: number };
  side?: number;
  // A dugout canoe with two paddlers instead of a sailing ship.
  canoe?: boolean;
}) {
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
    // Out for the first half, home again for the second (or in, and stay).
    const leg = oneWay ? Math.min(1, p / oneWay.arrive) : p < 0.5 ? p * 2 : 2 - p * 2;
    const { from, to } = route;
    const heading = Math.atan2(to.x - from.x, to.z - from.z);
    // Fleets sail side by side, across the way they head.
    const sx = Math.cos(heading) * side;
    const sz = -Math.sin(heading) * side;
    g.position.set(from.x + (to.x - from.x) * leg + sx, 0.2 + Math.sin(clock.elapsedTime * 2 + side) * 0.03, from.z + (to.z - from.z) * leg + sz);
    g.rotation.y = heading + (oneWay || p < 0.5 ? 0 : Math.PI);
    g.rotation.z = Math.sin(clock.elapsedTime * 1.5) * 0.05;
  });
  if (canoe)
    return (
      <group ref={ref} scale={1.4}>
        <mesh castShadow position={[0, 0.04, 0]} scale={[0.7, 0.45, 4]}>
          <sphereGeometry args={[0.1, 10, 6]} />
          <meshStandardMaterial color="#6b4a2b" flatShading />
        </mesh>
        {[-0.14, 0.14].map((z, i) => (
          <group key={z} position={[0, 0.1, z]}>
            <mesh position={[0, 0.06, 0]}>
              <boxGeometry args={[0.07, 0.12, 0.05]} />
              <meshStandardMaterial color={i ? "#9b5a2b" : "#7a4a22"} />
            </mesh>
            <mesh position={[0, 0.15, 0]}>
              <boxGeometry args={[0.05, 0.05, 0.05]} />
              <meshStandardMaterial color="#c68642" />
            </mesh>
            <mesh position={[0.07, 0.05, 0]} rotation={[0, 0, 0.6]}>
              <boxGeometry args={[0.015, 0.22, 0.015]} />
              <meshStandardMaterial color="#5e3b1c" />
            </mesh>
          </group>
        ))}
      </group>
    );
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
        <meshStandardMaterial color={sail} />
      </mesh>
      <mesh position={[0, 0.5, 0.032]}>
        <boxGeometry args={[0.5, 0.08, 0.005]} />
        <meshStandardMaterial color={stripe} />
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

// Each kingdom's island, and its colours (sails, and its soldiers' tunics).
export const KINGDOM_LOOK: Record<KingdomId, { island: number; sail: string; stripe: string; tunic: string }> = {
  steppe: { island: 1, sail: "#2a9d8f", stripe: "#e9c46a", tunic: "#2a7d73" },
  reach: { island: 2, sail: "#5b2a86", stripe: "#c9a227", tunic: "#4b2470" },
};

// How long our raiding fleet is away (there and back).
const RAID_VOYAGE = 40;

// Medieval era at sea: our ships exploring and trading, envoys carrying gifts,
// our raiding fleet, a kingdom's army sailing in, and a label over each
// kingdom's island saying how it feels about us.
export function SeaTraffic({ state, home }: { state: GameState; home: Tile }) {
  if (state.era < 3 && !state.ships?.length && !state.canoes?.length) return null;
  const { tick, speed, tiles } = state;
  const voyage = nextVoyage(state);
  const raided = state.revenge && state.raidedTick !== undefined && tick - state.raidedTick < RAID_VOYAGE ? state.revenge.kingdom : null;
  const army = state.raid?.kingdom ?? null;
  const armyRoute = army && state.raid ? landingRoute(tiles, KINGDOM_LOOK[army].island, tiles[state.raid.fromTile]) : null;
  return (
    <group>
      {/* Our canoes: to the Southern Isles, or out to fish. */}
      {(state.canoes ?? []).map((c, i) => {
        // Sent to a spot picked on the map: from the water by its dock to there.
        const dock = c.dock !== undefined ? tiles[c.dock] : undefined;
        const launch = dock ? tiles.filter((t) => !isLand(t.terrain) && t.terrain !== "river" && Math.hypot(t.x - dock.x, t.z - dock.z) < 1.9)[0] : undefined;
        const route = c.tile !== undefined && tiles[c.tile] ? { from: launch ?? dock ?? home, to: tiles[c.tile] } : routeFor(tiles, home, CANOE.island);
        return route ? <Ship key={`canoe-${c.start}-${i}`} route={route} start={c.start} back={c.back} tick={tick} speed={speed} canoe side={i * 0.6} /> : null;
      })}
      {/* Our ships: out to find land or a coast, or to trade with a kingdom. */}
      {(state.ships ?? []).map((ship, i) => {
        const island = voyage?.island ?? (i % 2 ? 2 : 1);
        const route = routeFor(tiles, home, island);
        return route ? (
          <Ship key={`ship-${ship.start}-${i}`} route={route} start={ship.start} back={ship.back} tick={tick} speed={speed} sail="#f1e6cf" stripe="#1e4f9c" />
        ) : null;
      })}
      {/* Envoys with gifts: a gold sail, there and back while the envoy is away. */}
      {(Object.keys(state.kingdoms ?? {}) as KingdomId[]).map((id) => {
        const k = state.kingdoms![id];
        if (k.giftTick === undefined || tick - k.giftTick >= DIPLOMACY.gift.wait) return null;
        const route = routeFor(tiles, home, KINGDOM_LOOK[id].island);
        return route ? (
          <Ship key={`envoy-${id}-${k.giftTick}`} route={route} start={k.giftTick} back={k.giftTick + DIPLOMACY.gift.wait} tick={tick} speed={speed} sail="#e9c46a" stripe="#7a2e1f" />
        ) : null;
      })}
      {/* Our raiding fleet: three red sails. */}
      {raided &&
        (() => {
          const route = routeFor(tiles, home, KINGDOM_LOOK[raided].island);
          return route
            ? [-0.9, 0, 0.9].map((side) => (
                <Ship key={`raid-${side}`} route={route} start={state.raidedTick!} back={state.raidedTick! + RAID_VOYAGE} tick={tick} speed={speed} sail="#9b1c1c" stripe="#140e0a" side={side} />
              ))
            : null;
        })()}
      {/* A kingdom's army: its ships sail in and lie off the shore while they fight. */}
      {army && armyRoute && state.raid && (
        <>
          {[-1, 0, 1].map((side) => (
            <Ship
              key={`army-${side}`}
              route={armyRoute}
              start={state.raid!.startTick}
              back={state.raid!.arriveTick}
              tick={tick}
              speed={speed}
              sail={KINGDOM_LOOK[army].sail}
              stripe={KINGDOM_LOOK[army].stripe}
              oneWay={{ arrive: 0.35 }}
              side={side}
            />
          ))}
        </>
      )}
      {/* Who lives over there, and how they feel about us. */}
      {(Object.keys(state.kingdoms ?? {}) as KingdomId[]).map((id) => {
        const isle = ISLANDS[KINGDOM_LOOK[id].island];
        const mood = moodOf(state.kingdoms![id].mood);
        return (
          <Html key={`label-${id}`} zIndexRange={[12, 0]} center position={[isle.x, 2.4, isle.z]} style={{ pointerEvents: "none" }}>
            <div className="pixel-panel font-pixel flex items-center gap-1 whitespace-nowrap px-1.5 py-0.5 text-[11px]" data-testid={`kingdom-label-${id}`}>
              <span className="capitalize">{KINGDOMS[id].name.replace(/^the /, "")}</span>
              <span className={state.kingdoms![id].conquered ? "text-sky-800" : mood === "friendly" ? "text-emerald-700" : mood === "hostile" ? "text-red-700" : "text-amber-700"}>
                · {state.kingdoms![id].conquered ? "ours" : mood}
              </span>
              {state.kingdoms![id].treaty && <span className="text-emerald-700">· treaty</span>}
            </div>
          </Html>
        );
      })}
    </group>
  );
}

// The harbour closed against the plague: ships wait at anchor offshore, not
// allowed to land.
export function WaitingShips({ state, home }: { state: GameState; home: Tile }) {
  if (!state.plague?.closed) return null;
  const route = routeFor(state.tiles, home, 1);
  if (!route) return null;
  // Most of the way out from our coast, held there.
  const at = { x: route.from.x + (route.to.x - route.from.x) * 0.25, z: route.from.z + (route.to.z - route.from.z) * 0.25 };
  const held = { from: route.from, to: at };
  return (
    <group>
      {[-1.2, 0, 1.2].map((side) => (
        <Ship key={side} route={held} start={-100} back={0} tick={state.tick} speed={0} sail="#d8d0bd" stripe="#e6c229" oneWay={{ arrive: 0.01 }} side={side} />
      ))}
    </group>
  );
}
