"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, Fog, type Mesh } from "three";
import type { Tile } from "@/game/types";

const CLEAN_SKY = new Color("#a8dcf5");
const SMOG = new Color("#8f8b80");

// Sustainability drives how hazy the world gets: clean air far away, smog
// that closes in and greys the sky as it drops.
export function Haze({ sustainability }: { sustainability: number }) {
  const goal = useMemo(() => {
    const dirty = Math.max(0, (70 - sustainability) / 70);
    return {
      near: 60 - dirty * 45,
      far: 160 - dirty * 110,
      color: CLEAN_SKY.clone().lerp(SMOG, dirty),
    };
  }, [sustainability]);

  useFrame(({ scene }) => {
    if (!(scene.fog instanceof Fog)) scene.fog = new Fog(CLEAN_SKY, 60, 160);
    const fog = scene.fog as Fog;
    fog.near += (goal.near - fog.near) * 0.03;
    fog.far += (goal.far - fog.far) * 0.03;
    fog.color.lerp(goal.color, 0.03);
    if (scene.background instanceof Color) scene.background.copy(fog.color);
  });

  return null;
}

function Plume({ x, y, z, strength, seed }: { x: number; y: number; z: number; strength: number; seed: number }) {
  const puffs = useRef<(Mesh | null)[]>([]);
  useFrame(({ clock }) => {
    puffs.current.forEach((m, i) => {
      if (!m) return;
      const t = (clock.elapsedTime * 0.25 + i / 4 + seed) % 1;
      m.position.set(Math.sin(t * 4 + seed) * 0.15, t * 2.2, Math.cos(t * 3 + seed) * 0.1);
      m.scale.setScalar(0.15 + t * 0.5 * strength);
      const mat = m.material as { opacity: number };
      mat.opacity = (1 - t) * 0.55 * strength;
    });
  });
  return (
    <group position={[x, y + 0.4, z]}>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} ref={(el) => { puffs.current[i] = el; }} raycast={() => null}>
          <sphereGeometry args={[1, 8, 6]} />
          <meshStandardMaterial color="#6f6d68" transparent depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

const POLLUTERS = new Set(["woodcutter", "quarry", "campfire"]);

export function SmogPlumes({ tiles, sustainability }: { tiles: Tile[]; sustainability: number }) {
  const strength = Math.max(0, (60 - sustainability) / 60);
  const sources = useMemo(
    () => tiles.filter((t) => t.building && POLLUTERS.has(t.building)).slice(0, 25),
    [tiles],
  );
  if (strength <= 0) return null;
  return (
    <group>
      {sources.map((t) => (
        <Plume key={t.id} x={t.x} y={t.height} z={t.z} strength={strength} seed={t.id * 0.37} />
      ))}
    </group>
  );
}
