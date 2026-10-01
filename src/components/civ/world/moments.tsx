"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import type { Group, Mesh } from "three";
import type { GameState, Tile } from "@/game/types";
import type { IconId } from "@/game/sprites";
import { PixelIcon } from "@/components/civ/pixel-icon";
import { Plume } from "./atmosphere";
import { tileTop } from "./hex-terrain";

// Small moments (a herd passing, a tree blown down, birds coming back) play out
// on the map where they happen, for MOMENT_TICKS, with a short label above.
export const MOMENT_TICKS = 8;

const LABELS: Record<string, { icon: IconId; text: string }> = {
  herd: { icon: "meat", text: "Deer at the forest edge" },
  berries: { icon: "basket", text: "Berries found" },
  baby: { icon: "smile", text: "A baby was born" },
  windfall: { icon: "log", text: "A tree blew down" },
  gust: { icon: "flame", text: "The wind blew a fire out" },
  rain: { icon: "wheat", text: "Rain on the fields" },
  story: { icon: "feather", text: "Stories by the fire" },
  smoke: { icon: "warning", text: "Smoke over the village" },
  birds: { icon: "leaf", text: "The birds are back" },
  mice: { icon: "warning", text: "Mice in the stores" },
  dust: { icon: "rock", text: "Dust off the bare land" },
};

// Seconds since this moment began (the scene mounts fresh for each one).
function useAge() {
  const start = useRef<number | null>(null);
  return (t: number) => {
    if (start.current === null) start.current = t;
    return t - start.current;
  };
}

// A few deer bounding past, from one side of the tile to the other.
function Herd() {
  const deer = useRef<(Group | null)[]>([]);
  const age = useAge();
  useFrame(({ clock }) => {
    const a = age(clock.elapsedTime);
    deer.current.forEach((g, i) => {
      if (!g) return;
      const k = Math.min(1, Math.max(0, (a - i * 0.4) / 7));
      g.position.set(-2.4 + k * 4.8, Math.abs(Math.sin(a * 7 + i)) * 0.12, (i - 1.5) * 0.35);
      g.visible = k > 0 && k < 1;
    });
  });
  return (
    <group>
      {[0, 1, 2, 3].map((i) => (
        <group key={i} ref={(el) => void (deer.current[i] = el)} rotation={[0, Math.PI / 2, 0]} scale={1.4}>
          <mesh castShadow position={[0, 0.2, 0]}>
            <boxGeometry args={[0.12, 0.12, 0.28]} />
            <meshStandardMaterial color="#9c6a3c" />
          </mesh>
          <mesh castShadow position={[0, 0.34, 0.16]}>
            <boxGeometry args={[0.07, 0.1, 0.1]} />
            <meshStandardMaterial color="#8a5c33" />
          </mesh>
          {[[-0.04, 0.1], [0.04, 0.1], [-0.04, -0.1], [0.04, -0.1]].map(([x, z]) => (
            <mesh key={`${x}${z}`} position={[x, 0.08, z]}>
              <cylinderGeometry args={[0.012, 0.01, 0.16, 5]} />
              <meshStandardMaterial color="#6b4a2b" />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
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

// An old tree tipping over, then lying there as firewood.
function Windfall() {
  const tree = useRef<Group>(null);
  const age = useAge();
  useFrame(({ clock }) => {
    const a = age(clock.elapsedTime);
    if (tree.current) tree.current.rotation.z = -Math.min(Math.PI / 2 - 0.1, Math.max(0, a - 0.8) ** 2 * 0.9);
  });
  return (
    <group ref={tree} position={[0.3, 0, 0]}>
      <mesh castShadow position={[0, 0.45, 0]}>
        <cylinderGeometry args={[0.06, 0.08, 0.9, 6]} />
        <meshStandardMaterial color="#6b4a2b" />
      </mesh>
      <mesh castShadow position={[0, 1.05, 0]}>
        <coneGeometry args={[0.35, 0.8, 7]} />
        <meshStandardMaterial color="#2d6e35" />
      </mesh>
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

// A small dark cloud raining on the fields.
function Rain() {
  const drops = useRef<(Mesh | null)[]>([]);
  useFrame(({ clock }) => {
    drops.current.forEach((m, i) => {
      if (!m) return;
      const k = (clock.elapsedTime * 1.4 + (i * 0.37) % 1) % 1;
      m.position.set(((i * 0.53) % 1.4) - 0.7, 2 - k * 1.9, ((i * 0.29) % 1) - 0.5);
    });
  });
  return (
    <group>
      {[-0.4, 0, 0.4].map((x) => (
        <mesh key={x} position={[x, 2.2, 0]}>
          <sphereGeometry args={[0.45, 8, 6]} />
          <meshStandardMaterial color="#8a93a0" />
        </mesh>
      ))}
      {Array.from({ length: 18 }, (_, i) => (
        <mesh key={i} ref={(el) => void (drops.current[i] = el)}>
          <boxGeometry args={[0.02, 0.14, 0.02]} />
          <meshStandardMaterial color="#4a90e2" />
        </mesh>
      ))}
    </group>
  );
}

// A flock circling over the forest, wings flapping.
function Birds() {
  const birds = useRef<(Group | null)[]>([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    birds.current.forEach((g, i) => {
      if (!g) return;
      const ang = t * 0.6 + i * 0.5;
      g.position.set(Math.cos(ang) * (1 + (i % 3) * 0.3), 1.8 + Math.sin(t * 2 + i) * 0.15, Math.sin(ang) * (1 + (i % 3) * 0.3));
      g.rotation.y = -ang;
      const flap = Math.sin(t * 12 + i) * 0.6;
      (g.children[0] as Mesh).rotation.x = flap;
      (g.children[1] as Mesh).rotation.x = -flap;
    });
  });
  return (
    <group>
      {Array.from({ length: 7 }, (_, i) => (
        <group key={i} ref={(el) => void (birds.current[i] = el)} scale={2.2}>
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

// Mice darting about.
function Mice() {
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

function Scene({ id, tile }: { id: string; tile: Tile }) {
  switch (id) {
    case "herd":
      return <Herd />;
    case "berries":
      return <Berries />;
    case "baby":
      return <Rising color="#f28cb1" count={6} spread={0.25} size={0.08} speed={0.4} />;
    case "windfall":
      return <Windfall />;
    case "gust":
      return <Wind color="#ffffff" opacity={0.8} />;
    case "rain":
      return <Rain />;
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
