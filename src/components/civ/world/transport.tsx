"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { BUILDINGS_BY_ID } from "@/game/content";
import { transportNow, warshipsOf } from "@/game/engine";
import { hexDistance } from "@/game/hex";
import type { GameState, Tile } from "@/game/types";
import { playShot } from "@/components/civ/hud/letterbox";
import { tileTop } from "./hex-terrain";

// Getting around, as you see it: carts, wagons, buses and maglev pods going to
// and fro between homes and the workplaces furthest from them (only once
// people have something better than their feet), and our warships patrolling
// round the island (meeting raiders at sea, guns flashing, when they come).

type Kind = "pack" | "cart" | "wagon" | "bus" | "maglev";
// The best way of getting around we have, as a vehicle.
function vehicleOf(state: GameState): Kind | null {
  const have = new Set(transportNow(state).have.map((s) => s.needs));
  if (have.has("maglev")) return "maglev";
  if (have.has("transit")) return "bus";
  if (have.has("horseback")) return "wagon";
  if (have.has("wheel")) return "cart";
  if (have.has("pack-animals")) return "pack";
  return null;
}

const HOMES = new Set(Object.values(BUILDINGS_BY_ID).filter((b) => (b.housing ?? 0) > 0).map((b) => b.id));
const MAX_ROUTES = 8;

export function Traffic({ state, speed }: { state: GameState; speed: number }) {
  const kind = vehicleOf(state);
  // From the nearest home to each workplace, furthest first (same island only:
  // nobody drives across the sea).
  const routes = useMemo(() => {
    if (!kind) return [];
    const homes = state.tiles.filter((t) => t.building && HOMES.has(t.building));
    const work = state.tiles.filter((t) => {
      const def = t.building ? BUILDINGS_BY_ID[t.building] : null;
      return def && !HOMES.has(def.id) && !def.landmark && Object.values(def.produces ?? {}).some((v) => (v ?? 0) > 0);
    });
    const out: { a: Tile; b: Tile; d: number }[] = [];
    for (const w of work) {
      const near = homes.filter((h) => h.island === w.island).sort((x, y) => hexDistance(x, w) - hexDistance(y, w))[0];
      if (near && hexDistance(near, w) >= 2) out.push({ a: near, b: w, d: hexDistance(near, w) });
    }
    return out.sort((x, y) => y.d - x.d).slice(0, MAX_ROUTES);
  }, [kind, state.tiles]);
  const refs = useRef<(Group | null)[]>([]);
  const clock = useRef(0);
  useFrame((_, delta) => {
    clock.current += Math.min(delta, 0.1) * speed;
    routes.forEach((r, i) => {
      const g = refs.current[i];
      if (!g) return;
      // Stop at the edge of each building, not inside it.
      const dx = r.b.x - r.a.x;
      const dz = r.b.z - r.a.z;
      const len = Math.hypot(dx, dz) || 1;
      const ux = dx / len;
      const uz = dz / len;
      const run = Math.max(0.2, len - 1.1);
      const pace = kind === "maglev" ? 1.6 : kind === "bus" ? 1.1 : kind === "wagon" ? 0.75 : 0.45;
      // There and back again, a pause at each end.
      const cycle = (run / pace) * 2 + 2;
      const t = (clock.current + i * 3.7) % cycle;
      const half = run / pace + 1;
      const out = t < half;
      const k = Math.min(1, Math.max(0, ((out ? t : t - half) - 0.5) / (run / pace)));
      const s = 0.55 + (out ? k : 1 - k) * run;
      const x = r.a.x + ux * s;
      const z = r.a.z + uz * s;
      const y0 = tileTop(r.a);
      const y1 = tileTop(r.b);
      const y = y0 + (y1 - y0) * (s / len);
      g.position.set(x, y + (kind === "maglev" ? 0.12 + Math.sin(clock.current * 3 + i) * 0.01 : 0), z);
      g.rotation.y = Math.atan2(ux, uz) + (out ? 0 : Math.PI);
      // Wheels and legs: a little bob while moving.
      const moving = k > 0 && k < 1;
      g.children[0].position.y = moving && kind !== "maglev" && kind !== "bus" ? Math.abs(Math.sin(clock.current * 10 + i)) * 0.012 : 0;
    });
  });
  if (!kind || !routes.length) return null;
  return (
    <>
      {routes.map((r, i) => (
        <group key={`${r.a.id}-${r.b.id}`} ref={(g) => void (refs.current[i] = g)} scale={1.1}>
          <group>
            <Vehicle kind={kind} i={i} />
          </group>
        </group>
      ))}
    </>
  );
}

// One vehicle, facing +z.
function Vehicle({ kind, i }: { kind: Kind; i: number }) {
  const beast = (colour: string, big = 1) => (
    <group position={[0, 0, 0.22]} scale={big}>
      <mesh castShadow position={[0, 0.11, 0]}>
        <boxGeometry args={[0.08, 0.07, 0.17]} />
        <meshStandardMaterial color={colour} />
      </mesh>
      <mesh position={[0, 0.14, 0.1]}>
        <boxGeometry args={[0.05, 0.05, 0.07]} />
        <meshStandardMaterial color={colour} />
      </mesh>
      {[-0.03, 0.03].map((x) =>
        [-0.06, 0.06].map((z) => (
          <mesh key={`${x}${z}`} position={[x, 0.04, z]}>
            <boxGeometry args={[0.02, 0.08, 0.02]} />
            <meshStandardMaterial color="#3b2a1a" />
          </mesh>
        )),
      )}
    </group>
  );
  const wheels = (z: number, r = 0.05) =>
    [-0.075, 0.075].map((x) => (
      <mesh key={`${x}${z}`} position={[x, r, z]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[r, r, 0.02, 10]} />
        <meshStandardMaterial color="#3b2a1a" />
      </mesh>
    ));
  if (kind === "pack")
    return (
      <group>
        {beast("#8d7b68")}
        {/* Baskets either side. */}
        {[-0.06, 0.06].map((x) => (
          <mesh key={x} position={[x, 0.12, 0.22]}>
            <boxGeometry args={[0.04, 0.06, 0.08]} />
            <meshStandardMaterial color="#c9a24a" />
          </mesh>
        ))}
      </group>
    );
  if (kind === "cart" || kind === "wagon")
    return (
      <group>
        {beast(kind === "cart" ? "#6b4a2b" : "#4a3020", kind === "cart" ? 1.15 : 1.25)}
        <mesh castShadow position={[0, 0.1, -0.03]}>
          <boxGeometry args={[0.14, 0.07, 0.2]} />
          <meshStandardMaterial color="#8a5a2e" />
        </mesh>
        {kind === "wagon" ? (
          // A white canvas cover.
          <mesh position={[0, 0.15, -0.03]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.075, 0.075, 0.2, 10, 1, false, 0, Math.PI]} />
            <meshStandardMaterial color="#f1e6cf" side={2} />
          </mesh>
        ) : (
          <mesh position={[0, 0.15, -0.03]}>
            <boxGeometry args={[0.1, 0.04, 0.12]} />
            <meshStandardMaterial color={i % 2 ? "#3fa34d" : "#c9a24a"} />
          </mesh>
        )}
        {wheels(-0.03)}
      </group>
    );
  if (kind === "bus")
    return (
      <group>
        <mesh castShadow position={[0, 0.12, 0]}>
          <boxGeometry args={[0.16, 0.14, 0.42]} />
          <meshStandardMaterial color={i % 2 ? "#d7263d" : "#f2b705"} />
        </mesh>
        <mesh position={[0, 0.15, 0]}>
          <boxGeometry args={[0.165, 0.05, 0.38]} />
          <meshStandardMaterial color="#1e2a38" metalness={0.4} roughness={0.2} />
        </mesh>
        {wheels(0.13, 0.035)}
        {wheels(-0.13, 0.035)}
      </group>
    );
  return (
    <group>
      <mesh castShadow position={[0, 0.06, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <capsuleGeometry args={[0.07, 0.36, 6, 12]} />
        <meshStandardMaterial color="#f5f7fa" metalness={0.5} roughness={0.25} />
      </mesh>
      <mesh position={[0, 0.08, 0]}>
        <boxGeometry args={[0.145, 0.035, 0.32]} />
        <meshStandardMaterial color="#4fd8c4" emissive="#1a6b60" />
      </mesh>
    </group>
  );
}

// ---- Our fleet ----

// Our warships sail round the island; when raiders come, they sail out to
// meet them (cannon or arrow flashes, raiders' boats going down), and the
// camera flies out for a look.
export function Fleet({ state, home, speed }: { state: GameState; home: Tile; speed: number }) {
  const n = Math.min(8, warshipsOf(state));
  // Just off the coast of the home island.
  const ring = useMemo(() => {
    const isle = state.tiles.filter((t) => t.island === home.island && t.revealed);
    const r = isle.reduce((m, t) => Math.max(m, Math.hypot(t.x - home.x, t.z - home.z)), 3);
    return r + 2.2;
  }, [state.tiles, home]);
  const raid = state.raid;
  const fight = raid?.seaFight && !raid.roman ? raid : null;
  // Out at sea, beyond where they land.
  const at = useMemo(() => {
    if (!fight) return null;
    const shore = state.tiles[fight.fromTile];
    if (!shore) return null;
    const len = Math.hypot(home.x - shore.x, home.z - shore.z) || 1;
    return { x: shore.x - ((home.x - shore.x) / len) * 4, z: shore.z - ((home.z - shore.z) / len) * 4 };
  }, [fight, state.tiles, home]);
  // The camera flies out once for each sea fight.
  const shown = useRef<number | null>(null);
  useEffect(() => {
    if (!fight || !at || shown.current === fight.startTick) return;
    shown.current = fight.startTick;
    const sunk = fight.seaFight!.sunk;
    playShot({
      kind: "look",
      title: "Our warships meet the raiders at sea!",
      subtitle: sunk ? `${sunk} of them go down before they can land` : "They slip past our ships",
      seconds: 6,
      at: { x: at.x, z: at.z, y: 0.2 },
    });
  }, [fight, at]);
  const ships = useRef<(Group | null)[]>([]);
  const flashes = useRef<(Group | null)[]>([]);
  const wrecks = useRef<(Group | null)[]>([]);
  const clock = useRef(0);
  const fightAt = useRef<number | null>(null);
  useFrame((_, delta) => {
    clock.current += Math.min(delta, 0.1) * speed;
    const t = clock.current;
    if (fight && fightAt.current === null) fightAt.current = t;
    if (!fight) fightAt.current = null;
    const since = fightAt.current === null ? 99 : t - fightAt.current;
    // Out to the fight over 2.5 s, there for 6, then back to patrol.
    const out = at ? Math.min(1, since / 2.5) * (since > 8.5 ? Math.max(0, 1 - (since - 8.5) / 3) : 1) : 0;
    for (let i = 0; i < 8; i++) {
      const g = ships.current[i];
      if (!g) continue;
      g.visible = i < n;
      if (i >= n) continue;
      const a = (t * 0.05 + (i / Math.max(1, n)) * Math.PI * 2) % (Math.PI * 2);
      const px = home.x + Math.sin(a) * ring;
      const pz = home.z + Math.cos(a) * ring;
      const fx = at ? at.x + Math.sin(i * 2.1) * 1.2 : px;
      const fz = at ? at.z + Math.cos(i * 2.1) * 1.2 : pz;
      g.position.set(px + (fx - px) * out, 0.18 + Math.sin(t * 2 + i) * 0.03, pz + (fz - pz) * out);
      // Along the patrol circle, or turned broadside to the enemy.
      g.rotation.y = out > 0.5 && at ? Math.atan2(at.x - g.position.x, at.z - g.position.z) + Math.PI / 2 : a + Math.PI / 2;
      g.rotation.z = Math.sin(t * 1.5 + i) * 0.05;
    }
    // Flashes from the guns (or flaming arrows) while they fight.
    const firing = at && since > 2 && since < 8.5;
    flashes.current.forEach((f, i) => {
      if (!f) return;
      const phase = (t * 2.3 + i * 0.37) % 1;
      f.visible = !!firing && i < n * 2;
      if (!f.visible || !at) return;
      f.position.set(at.x + Math.sin(i * 1.7 + Math.floor(t * 2.3 + i * 0.37)) * 1.4, 0.35 + phase * 0.3, at.z + Math.cos(i * 2.3 + Math.floor(t * 2.3)) * 1.4);
      f.scale.setScalar(0.05 + Math.sin(phase * Math.PI) * 0.18);
    });
    // Raiders' boats going down.
    const sunk = Math.min(6, fight?.seaFight?.sunk ? Math.ceil(fight.seaFight.sunk / 2) : 0);
    wrecks.current.forEach((w, i) => {
      if (!w) return;
      w.visible = !!at && i < sunk && since > 2.5 && since < 11;
      if (!w.visible || !at) return;
      const k = Math.min(1, Math.max(0, (since - 3 - i * 0.6) / 3));
      w.position.set(at.x + Math.sin(i * 2.6) * 0.9, 0.18 - k * 0.4, at.z + Math.cos(i * 2.6) * 0.9);
      w.rotation.set(k * 1.1, i, k * 0.6);
    });
  });
  const steel = state.era >= 4;
  return (
    <>
      {Array.from({ length: 8 }, (_, i) => (
        <group key={i} ref={(g) => void (ships.current[i] = g)} visible={false} scale={1.5}>
          {steel ? <Ironclad modern={state.era >= 5} /> : <Galley era={state.era} />}
        </group>
      ))}
      {Array.from({ length: 16 }, (_, i) => (
        <group key={`f${i}`} ref={(g) => void (flashes.current[i] = g)} visible={false}>
          <mesh>
            <icosahedronGeometry args={[1, 0]} />
            <meshBasicMaterial color={i % 3 ? "#ffd23f" : "#f28c28"} transparent opacity={0.85} />
          </mesh>
        </group>
      ))}
      {Array.from({ length: 6 }, (_, i) => (
        <group key={`w${i}`} ref={(g) => void (wrecks.current[i] = g)} visible={false} scale={1.4}>
          <mesh position={[0, 0.04, 0]} scale={[0.8, 0.5, 4.4]}>
            <sphereGeometry args={[0.1, 10, 6]} />
            <meshStandardMaterial color="#4a2f1b" flatShading />
          </mesh>
        </group>
      ))}
    </>
  );
}

// A wooden warship: a long hull with a ram, a row of shields along each
// side, oars, and a red sail.
function Galley({ era }: { era: number }) {
  return (
    <group>
      <mesh castShadow position={[0, 0.06, 0]}>
        <boxGeometry args={[0.24, 0.12, 0.8]} />
        <meshStandardMaterial color="#4a3020" flatShading />
      </mesh>
      <mesh position={[0, 0.03, 0.45]} rotation={[0.3, 0, 0]}>
        <coneGeometry args={[0.05, 0.16, 4]} />
        <meshStandardMaterial color="#c89b3c" metalness={0.6} />
      </mesh>
      {[-1, 1].map((side) =>
        [-0.24, -0.08, 0.08, 0.24].map((z) => (
          <group key={`${side}${z}`}>
            <mesh position={[side * 0.125, 0.12, z]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.035, 0.035, 0.012, 10]} />
              <meshStandardMaterial color={z > 0 ? "#b3261e" : "#e9c46a"} />
            </mesh>
            <mesh position={[side * 0.2, 0.04, z]} rotation={[0, 0, side * 1.1]}>
              <boxGeometry args={[0.012, 0.2, 0.012]} />
              <meshStandardMaterial color="#5e3b1c" />
            </mesh>
          </group>
        )),
      )}
      <mesh position={[0, 0.45, 0]}>
        <cylinderGeometry args={[0.018, 0.022, 0.7, 6]} />
        <meshStandardMaterial color="#5e3b1c" />
      </mesh>
      <mesh castShadow position={[0, 0.5, 0.02]}>
        <boxGeometry args={[era >= 3 ? 0.56 : 0.46, 0.4, 0.02]} />
        <meshStandardMaterial color="#b3261e" />
      </mesh>
      <mesh position={[0, 0.5, 0.032]}>
        <boxGeometry args={[0.12, 0.12, 0.005]} />
        <meshStandardMaterial color="#f1e6cf" />
      </mesh>
    </group>
  );
}

// A steel warship: grey hull, a funnel (smoking), a gun turret.
function Ironclad({ modern }: { modern: boolean }) {
  return (
    <group>
      <mesh castShadow position={[0, 0.06, 0]}>
        <boxGeometry args={[0.24, 0.12, 0.85]} />
        <meshStandardMaterial color="#5f656b" metalness={0.5} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.06, 0.46]} rotation={[0, Math.PI / 4, 0]}>
        <boxGeometry args={[0.17, 0.12, 0.17]} />
        <meshStandardMaterial color="#5f656b" metalness={0.5} />
      </mesh>
      <mesh castShadow position={[0, 0.17, -0.08]}>
        <boxGeometry args={[0.16, 0.1, 0.25]} />
        <meshStandardMaterial color="#a3a9ae" />
      </mesh>
      {!modern && (
        <mesh position={[0, 0.3, -0.12]}>
          <cylinderGeometry args={[0.035, 0.04, 0.18, 8]} />
          <meshStandardMaterial color="#2b2119" />
        </mesh>
      )}
      <group position={[0, 0.15, 0.22]}>
        <mesh>
          <cylinderGeometry args={[0.06, 0.07, 0.06, 10]} />
          <meshStandardMaterial color="#4a5056" metalness={0.6} />
        </mesh>
        <mesh position={[0, 0.01, 0.1]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.16, 6]} />
          <meshStandardMaterial color="#2b2119" />
        </mesh>
      </group>
      {modern && (
        <mesh position={[0, 0.3, -0.08]}>
          <cylinderGeometry args={[0.008, 0.008, 0.2, 4]} />
          <meshStandardMaterial color="#a3a9ae" />
        </mesh>
      )}
    </group>
  );
}

// ---- Big moments, filmed ----
// The camera flies over for a few seconds when something big happens: we
// reach a new income level, our first warship is launched, a new way of getting
// around comes to the island, or we join the Council of Islands.
const LEVEL_RANK = { low: 0, middle: 1, high: 2 } as const;
export function BigMoments({ state, home, firstPerson }: { state: GameState; home: Tile; firstPerson: boolean }) {
  const seen = useRef<{ level?: string; ships: number; ways: number; joined: boolean } | null>(null);
  const level = state.income?.level;
  const ships = warshipsOf(state);
  const ways = transportNow(state).have.length;
  const joined = !!state.council?.joined;
  useEffect(() => {
    const before = seen.current;
    seen.current = { level, ships, ways, joined };
    // The first look just notes how things are; first person films nothing.
    if (!before || firstPerson) return;
    const look = (title: string, subtitle: string, at: Tile | undefined = home) =>
      playShot({ kind: "look", title, subtitle, seconds: 6, at: { x: at.x, z: at.z, y: tileTop(at) } });
    if (level && before.level && LEVEL_RANK[level] > LEVEL_RANK[before.level as keyof typeof LEVEL_RANK]) {
      look(level === "high" ? "A high-income nation!" : "A middle-income nation!", `${state.income!.perPerson} a person a day`);
    } else if (ships > before.ships && before.ships === 0) {
      // Our first warship (the rest just join the fleet).
      const yard = state.tiles.find((t) => t.building === "shipyard") ?? state.tiles.find((t) => t.building === "dock");
      look("Our first warship is launched", "It will meet raiders at sea", yard);
    } else if (ways > before.ways) {
      const way = transportNow(state).have[ways - 1];
      const busy = state.tiles.filter((t) => t.building && !HOMES.has(t.building) && t.island === home.island).sort((a, b) => hexDistance(b, home) - hexDistance(a, home))[0];
      look(`${way.name} on the island`, "People get to work faster", busy);
    } else if (joined && !before.joined) {
      look("We join the Council of Islands", "Its resolutions bind us now");
    }
  }, [level, ships, ways, joined, firstPerson, state, home]);
  return null;
}
