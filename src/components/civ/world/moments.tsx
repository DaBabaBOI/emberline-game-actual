"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import type { Group, Mesh } from "three";
import type { GameState, Tile } from "@/game/types";
import type { IconId } from "@/game/sprites";
import { PixelIcon } from "@/components/civ/pixel-icon";
import { Plume } from "./atmosphere";
import { tileTop } from "./hex-terrain";
import { BUILDING_SCALE, buildingTurn } from "./building-models";
import { Figures, SKINS, type Agent } from "./figures";
import { makeGround } from "./ground";
import { TICK_SECONDS } from "@/game/content";

// Small moments (berries found, birds coming back, a gust of wind) play out
// on the map where they happen, for MOMENT_TICKS, with a short label above.
export const MOMENT_TICKS = 8;

const LABELS: Record<string, { icon: IconId; text: string }> = {
  berries: { icon: "basket", text: "Berries found" },
  baby: { icon: "smile", text: "A baby was born" },
  gust: { icon: "flame", text: "The wind blew a fire out" },
  grow: { icon: "wheat", text: "The crops shot up" },
  story: { icon: "feather", text: "Stories by the fire" },
  smoke: { icon: "warning", text: "Smoke over the village" },
  birds: { icon: "leaf", text: "The birds are back" },
  mice: { icon: "warning", text: "Mice in the stores" },
  dust: { icon: "rock", text: "Dust off the bare land" },
  bottle: { icon: "scroll", text: "A message in a bottle!" },
};

// Seconds since this moment began (the scene mounts fresh for each one).
function useAge() {
  const start = useRef<number | null>(null);
  return (t: number) => {
    if (start.current === null) start.current = t;
    return t - start.current;
  };
}

// Things that rise and fade: berries, hearts, sparks by the fire.
function Rising({ color, count, spread = 0.4, size = 0.06, speed = 0.5 }: { color: string; count: number; spread?: number; size?: number; speed?: number }) {
  const bits = useRef<(Mesh | null)[]>([]);
  useFrame(({ clock }) => {
    bits.current.forEach((m, i) => {
      if (!m) return;
      const k = (clock.elapsedTime * speed + i / count) % 1;
      const ang = (i / count) * Math.PI * 2;
      m.position.set(Math.cos(ang) * spread * (0.5 + k * 0.5), 0.3 + k * 1.2, Math.sin(ang) * spread * (0.5 + k * 0.5));
      (m.material as { opacity: number }).opacity = 1 - k;
    });
  });
  return (
    <group>
      {Array.from({ length: count }, (_, i) => (
        <mesh key={i} ref={(el) => void (bits.current[i] = el)}>
          <boxGeometry args={[size, size, size]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} transparent depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

// A berry bush with fruit popping off it.
function Berries() {
  return (
    <group>
      <mesh castShadow position={[0, 0.18, 0]}>
        <sphereGeometry args={[0.28, 8, 6]} />
        <meshStandardMaterial color="#3f7d3a" />
      </mesh>
      <Rising color="#d7263d" count={8} spread={0.3} />
    </group>
  );
}

// Streaks of wind swirling round (a gust, or dust blowing off bare land).
function Wind({ color, opacity }: { color: string; opacity: number }) {
  const streaks = useRef<(Mesh | null)[]>([]);
  useFrame(({ clock }) => {
    streaks.current.forEach((m, i) => {
      if (!m) return;
      const k = (clock.elapsedTime * 0.6 + i / 6) % 1;
      const ang = k * Math.PI * 2 + i;
      m.position.set(-1.2 + k * 2.4, 0.3 + (i % 3) * 0.25, Math.sin(ang) * 0.4);
      m.rotation.y = Math.PI / 2;
      (m.material as { opacity: number }).opacity = Math.sin(k * Math.PI) * opacity;
    });
  });
  return (
    <group>
      {Array.from({ length: 6 }, (_, i) => (
        <mesh key={i} ref={(el) => void (streaks.current[i] = el)}>
          <boxGeometry args={[0.03, 0.03, 0.6]} />
          <meshStandardMaterial color={color} transparent depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

// The field's wheat shooting up: the farm's own rows of stalks (the same
// layout, turned and scaled like the building) grow tall, then settle back
// before the moment ends. All of it stays on the field.
const FARM_STALKS = [-0.36, -0.18, 0, 0.18, 0.36].flatMap((z) => {
  const n = Math.round(7 - Math.abs(z) * 6);
  const span = 0.8 - Math.abs(z) * 0.9;
  return Array.from({ length: n }, (_, i) => ({ x: -span / 2 + (span / Math.max(1, n - 1)) * i, z }));
});

function Grow({ tile }: { tile: Tile }) {
  const field = useRef<Group>(null);
  const age = useAge();
  useFrame(({ clock }) => {
    const a = age(clock.elapsedTime);
    // Up over 2.5 s, back down from 8.5 s to 10 s.
    const up = Math.min(1, a / 2.5) * (1 - Math.min(1, Math.max(0, (a - 8.5) / 1.5)));
    const tall = 1 - (1 - up) ** 2;
    field.current?.children.forEach((stalk, i) => {
      stalk.scale.y = 1 + tall * 1.8;
      stalk.rotation.z = Math.sin(clock.elapsedTime * 1.6 + i * 0.7) * 0.08 * tall;
    });
  });
  return (
    <group rotation={[0, buildingTurn(tile.id), 0]} scale={BUILDING_SCALE}>
      <group ref={field}>
        {FARM_STALKS.map((s, i) => (
          <group key={i} position={[s.x, 0.04, s.z]}>
            <mesh position={[0, 0.07, 0]}>
              <cylinderGeometry args={[0.011, 0.011, 0.14, 4]} />
              <meshStandardMaterial color="#c9a63e" />
            </mesh>
            <mesh position={[0, 0.15, 0]} scale={[1, 2.2, 1]}>
              <sphereGeometry args={[0.026, 6, 4]} />
              <meshStandardMaterial color="#f0cf5e" />
            </mesh>
          </group>
        ))}
      </group>
      <Rising color="#9fd356" count={8} spread={0.32} size={0.04} speed={0.45} />
    </group>
  );
}

// A flock circling over the forest, wings flapping. The moment picks a tile
// deep in the forest; the circles (0.3 to 0.6) stay inside that tile, just
// above the treetops (they reach about 0.85), so seen from the camera they
// stay over the trees rather than drifting over the tile behind.
function Birds() {
  const birds = useRef<(Group | null)[]>([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    birds.current.forEach((g, i) => {
      if (!g) return;
      const ang = t * 0.8 + i * 0.9;
      const r = 0.3 + (i % 3) * 0.15;
      g.position.set(Math.cos(ang) * r, 1.1 + Math.sin(t * 2 + i) * 0.06, Math.sin(ang) * r);
      g.rotation.y = -ang;
      const flap = Math.sin(t * 12 + i) * 0.6;
      (g.children[0] as Mesh).rotation.x = flap;
      (g.children[1] as Mesh).rotation.x = -flap;
    });
  });
  return (
    <group>
      {Array.from({ length: 7 }, (_, i) => (
        <group key={i} ref={(el) => void (birds.current[i] = el)} scale={1.5}>
          <mesh position={[0, 0, 0.08]}>
            <boxGeometry args={[0.04, 0.01, 0.16]} />
            <meshStandardMaterial color="#2b2119" />
          </mesh>
          <mesh position={[0, 0, -0.08]}>
            <boxGeometry args={[0.04, 0.01, 0.16]} />
            <meshStandardMaterial color="#2b2119" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// Mice (or the plague's rats) darting about.
export function Mice() {
  const mice = useRef<(Mesh | null)[]>([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    mice.current.forEach((m, i) => {
      if (!m) return;
      const ang = t * (2 + i * 0.5) + i * 2;
      m.position.set(Math.cos(ang) * (0.4 + i * 0.12), 0.05, Math.sin(ang * 1.3) * (0.4 + i * 0.1));
      m.rotation.y = -ang;
    });
  });
  return (
    <group>
      {[0, 1, 2].map((i) => (
        <mesh key={i} ref={(el) => void (mice.current[i] = el)} castShadow>
          <boxGeometry args={[0.06, 0.05, 0.12]} />
          <meshStandardMaterial color="#6f6d68" />
        </mesh>
      ))}
    </group>
  );
}

// A green glass bottle with a rolled message inside, rocking on the sand.
function Bottle() {
  const ref = useRef<Group>(null);
  useFrame(({ clock }) => {
    const g = ref.current;
    if (!g) return;
    const t = clock.elapsedTime;
    g.rotation.set(Math.PI / 2 + Math.sin(t * 2) * 0.08, t * 0.3, Math.sin(t * 1.4) * 0.25);
    g.position.y = 0.08 + Math.sin(t * 2.2) * 0.02;
  });
  return (
    <group ref={ref} position={[0.35, 0.08, 0.2]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.07, 0.07, 0.26, 10]} />
        <meshStandardMaterial color="#3f8f5a" transparent opacity={0.65} roughness={0.1} />
      </mesh>
      <mesh position={[0, 0.17, 0]}>
        <cylinderGeometry args={[0.03, 0.05, 0.09, 8]} />
        <meshStandardMaterial color="#3f8f5a" transparent opacity={0.65} roughness={0.1} />
      </mesh>
      <mesh position={[0, 0.23, 0]}>
        <cylinderGeometry args={[0.028, 0.028, 0.04, 8]} />
        <meshStandardMaterial color="#8b5a2b" />
      </mesh>
      {/* The rolled-up message inside. */}
      <mesh>
        <cylinderGeometry args={[0.035, 0.035, 0.18, 8]} />
        <meshStandardMaterial color="#f4efe6" />
      </mesh>
    </group>
  );
}

function Scene({ id, tile }: { id: string; tile: Tile }) {
  switch (id) {
    case "berries":
      return <Berries />;
    case "baby":
      return <Rising color="#f28cb1" count={6} spread={0.25} size={0.08} speed={0.4} />;
    case "gust":
      return <Wind color="#ffffff" opacity={0.8} />;
    case "grow":
      return <Grow tile={tile} />;
    case "story":
      return <Rising color="#ffd23f" count={10} spread={0.5} size={0.05} speed={0.35} />;
    case "smoke":
      return <Plume x={0} y={0} z={0} strength={1.6} seed={tile.id} />;
    case "birds":
      return <Birds />;
    case "mice":
      return <Mice />;
    case "dust":
      return <Wind color="#c9a46a" opacity={0.7} />;
    case "bottle":
      return <Bottle />;
    default:
      return null;
  }
}

export function SmallMoment({ state }: { state: GameState }) {
  const m = state.moment;
  if (!m || state.tick - m.tick >= MOMENT_TICKS) return null;
  const tile = state.tiles[m.tile];
  const label = LABELS[m.id];
  if (!tile) return null;
  const top = tileTop(tile);
  return (
    // Keyed by when it began, so each moment starts its animation fresh.
    <group key={`${m.id}-${m.tick}`} position={[tile.x, top, tile.z]}>
      <Scene id={m.id} tile={tile} />
      {label && (
        <Html zIndexRange={[13, 0]} center position={[0, 2.9, 0]} style={{ pointerEvents: "none" }}>
          <div className="pixel-panel font-pixel flex items-center gap-1 whitespace-nowrap px-2 py-0.5 text-xs" data-testid="moment-label">
            <PixelIcon name={label.icon} size={16} />
            {label.text}
          </div>
        </Html>
      )}
    </group>
  );
}


// While scouts are out: a marker over the land they are exploring.
// The scouts out exploring: three of them walk from the village to the spot
// picked in the fog (the first half of the trip), look around, and walk back
// (the second half). Their label follows them.
export function ScoutMarker({ state }: { state: GameState }) {
  const trip = state.scouting;
  const tiles = state.tiles;
  const ground = useMemo(() => makeGround(tiles), [tiles]);
  const agents = useRef<Agent[]>([]);
  const label = useRef<Group>(null);
  const shown = useRef(0);
  const target = trip ? tiles[trip.tile] : null;
  const from = trip ? tiles[trip.from ?? state.startTile] : null;
  const start = trip?.start ?? (trip ? trip.back - 12 : 0);
  const tick = state.tick;
  const speed = state.speed;

  useFrame((_, delta) => {
    if (!trip || !target || !from) {
      agents.current = [];
      shown.current = 0;
      return;
    }
    const span = Math.max(1, trip.back - start);
    // Walk smoothly between ticks, never drifting from the game's clock.
    const goal = Math.min(1, (tick - start) / span);
    const step = (speed / TICK_SECONDS / span) * Math.min(delta, 0.1);
    shown.current = Math.min(goal + 1 / span, Math.max(goal, shown.current + step));
    const p = shown.current;
    const out = p < 0.5;
    // 0 at home, 1 at the spot: out for the first half, back for the second.
    const along = out ? p * 2 : (1 - p) * 2;
    const list = agents.current;
    list.length = 3;
    for (let i = 0; i < 3; i++) {
      // Single file, a little apart.
      const k = Math.max(0, Math.min(1, along - i * 0.04 * (out ? 1 : -1)));
      const side = (i - 1) * 0.18;
      const dx = target.x - from.x;
      const dz = target.z - from.z;
      const len = Math.hypot(dx, dz) || 1;
      const x = from.x + dx * k - (dz / len) * side;
      const z = from.z + dz * k + (dx / len) * side;
      const there = along > 0.97;
      list[i] = {
        x,
        z,
        y: ground.heightAt(x, z),
        // Facing the way they walk; at the spot, looking around.
        heading: there ? Math.sin(p * 40 + i) * 1.2 : Math.atan2(dx * (out ? 1 : -1), dz * (out ? 1 : -1)),
        moving: !there && speed > 0,
        scale: 1.3,
        tunic: "#c58b3a",
        skin: SKINS[i % SKINS.length],
        hair: "#1a1a1a",
        phase: i * 1.9,
      };
    }
    const lead = list[0];
    if (label.current && lead) label.current.position.set(lead.x, lead.y + 1.4, lead.z);
  });

  if (!trip || !target) return null;
  return (
    <>
      <Figures agents={agents} max={3} />
      <group ref={label}>
        <Html zIndexRange={[13, 0]} center style={{ pointerEvents: "none" }}>
          <div className="pixel-panel font-pixel flex items-center gap-1 whitespace-nowrap px-2 py-0.5 text-xs" data-testid="scout-marker">
            <PixelIcon name="spyglass" size={16} />
            Scouts {tick - start < (trip.back - start) / 2 ? "heading out" : "coming back"}
          </div>
        </Html>
      </group>
      {/* Where they're going. */}
      <mesh position={[target.x, tileTop(target) + 0.05, target.z]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.55, 0.7, 6]} />
        <meshBasicMaterial color="#facc15" transparent opacity={0.8} />
      </mesh>
    </>
  );
}
