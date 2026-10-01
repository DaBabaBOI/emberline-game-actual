"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { InstancedMesh, Object3D, type AmbientLight, type Mesh, type Vector3 } from "three";
import type { GameState, Tile } from "@/game/types";
import { Plume } from "./atmosphere";

// What the 3D scene needs to know about the disaster right now.
export function disasterView(state: GameState) {
  const d = state.disaster;
  if (!d) return { kind: null, warning: false, active: false, progress: 0, tiles: [] as number[] };
  const active = state.tick >= d.startTick && state.tick < d.endTick;
  return {
    kind: d.kind,
    warning: state.tick < d.startTick,
    active,
    progress: active ? (state.tick - d.startTick) / Math.max(1, d.endTick - d.startTick) : 0,
    tiles: d.tiles,
  };
}

// Earthquake: the camera shakes while it lasts.
export function QuakeShake({ active }: { active: boolean }) {
  const last = useRef<[number, number, number]>([0, 0, 0]);
  useFrame(({ camera }) => {
    const p: Vector3 = camera.position;
    // Undo last frame's jolt, then (while shaking) add a new one.
    p.x -= last.current[0];
    p.y -= last.current[1];
    p.z -= last.current[2];
    last.current = active ? [(Math.random() - 0.5) * 0.35, (Math.random() - 0.5) * 0.25, (Math.random() - 0.5) * 0.35] : [0, 0, 0];
    p.x += last.current[0];
    p.y += last.current[1];
    p.z += last.current[2];
  });
  return null;
}

// Flood: water rises over the low tiles, laps, then sinks away.
export function FloodWater({ tiles, ids, progress }: { tiles: Tile[]; ids: number[]; progress: number }) {
  const refs = useRef<(Mesh | null)[]>([]);
  // Up over the first fifth, down over the last fifth.
  const level = Math.min(1, progress / 0.2, (1 - progress) / 0.2);
  useFrame(({ clock }) => {
    refs.current.forEach((m, i) => {
      if (!m) return;
      m.position.y = m.userData.base + 0.02 + level * 0.16 + Math.sin(clock.elapsedTime * 2 + i) * 0.015;
    });
  });
  return (
    <group>
      {ids.map((id, i) => {
        const t = tiles[id];
        return (
          <mesh
            key={id}
            ref={(m) => {
              refs.current[i] = m;
              if (m) m.userData.base = t.height;
            }}
            position={[t.x, t.height, t.z]}
            raycast={() => null}
          >
            <cylinderGeometry args={[1.0, 1.0, 0.06, 6]} />
            <meshStandardMaterial color="#4f8fb8" transparent opacity={0.75} roughness={0.15} />
          </mesh>
        );
      })}
    </group>
  );
}

const RAIN = 450;

// Storm: rain streaks falling around the village, and flashes of lightning.
export function StormRain({ centre, heavy }: { centre: Tile; heavy: boolean }) {
  const ref = useRef<InstancedMesh>(null);
  const flash = useRef<AmbientLight>(null);
  const drops = useMemo(
    () => Array.from({ length: RAIN }, (_, i) => ({ x: ((i * 7919) % 400) / 10 - 20, z: ((i * 104729) % 400) / 10 - 20, y: (i * 13) % 14, v: 12 + (i % 5) })),
    [],
  );
  const dummy = useMemo(() => new Object3D(), []);
  useLayoutEffect(() => {
    if (ref.current) ref.current.count = heavy ? RAIN : Math.floor(RAIN / 4);
  }, [heavy]);
  useFrame((_, delta) => {
    const mesh = ref.current;
    if (!mesh) return;
    const dt = Math.min(delta, 0.1);
    drops.forEach((d, i) => {
      d.y -= d.v * dt;
      if (d.y < 0) d.y += 14;
      dummy.position.set(centre.x + d.x, d.y, centre.z + d.z);
      dummy.rotation.set(0.25, 0, 0.1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    // Now and then the sky lights up.
    if (flash.current) {
      const on = heavy && Math.random() < 0.01;
      flash.current.intensity = on ? 2.2 : Math.max(0, flash.current.intensity - dt * 6);
    }
  });
  return (
    <group>
      <instancedMesh ref={ref} args={[undefined, undefined, RAIN]} raycast={() => null} frustumCulled={false}>
        <boxGeometry args={[0.02, 0.45, 0.02]} />
        <meshBasicMaterial color="#cfe3f5" transparent opacity={0.55} />
      </instancedMesh>
      <ambientLight ref={flash} intensity={0} color="#e8f0ff" />
    </group>
  );
}

// Cracks from an earthquake: dark jagged lines across the ground (fading).
export function Cracks({ tiles }: { tiles: Tile[] }) {
  const cracked = useMemo(() => tiles.filter((t) => (t.cracked ?? 0) > 0.15 && t.revealed), [tiles]);
  return (
    <group>
      {cracked.map((t) =>
        [0, 1, 2].map((i) => {
          const a = ((t.id * 37 + i * 61) % 180) * (Math.PI / 180);
          return (
            <mesh
              key={`${t.id}-${i}`}
              position={[t.x + Math.cos(a + i) * 0.2, t.height + 0.012, t.z + Math.sin(a + i) * 0.2]}
              rotation={[-Math.PI / 2, 0, a]}
              raycast={() => null}
            >
              <planeGeometry args={[0.9, 0.06]} />
              <meshBasicMaterial color="#2b2119" transparent opacity={Math.min(0.85, t.cracked ?? 0)} />
            </mesh>
          );
        }),
      )}
    </group>
  );
}

// Landslide rubble: a heap of rocks and earth where the hill came down.
export function Rubble({ tiles }: { tiles: Tile[] }) {
  const heaps = useMemo(() => tiles.filter((t) => (t.rubble ?? 0) > 0.15 && t.revealed), [tiles]);
  return (
    <group>
      {heaps.map((t) => (
        <group key={t.id} position={[t.x, t.height, t.z]} scale={0.6 + 0.4 * (t.rubble ?? 0)}>
          <mesh position={[0, 0.06, 0]} scale={[1, 0.35, 1]} raycast={() => null}>
            <sphereGeometry args={[0.7, 8, 6]} />
            <meshStandardMaterial color="#7a6443" flatShading />
          </mesh>
          {[0.3, 1.5, 2.6, 3.8, 5].map((a, i) => (
            <mesh key={a} castShadow position={[Math.cos(a) * 0.45, 0.14, Math.sin(a) * 0.45]} rotation={[a, a * 2, 0]} raycast={() => null}>
              <dodecahedronGeometry args={[0.1 + (i % 3) * 0.04, 0]} />
              <meshStandardMaterial color="#8d8a86" flatShading />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

// Dust thrown up where an earthquake or landslide strikes.
export function DisasterDust({ tiles, ids }: { tiles: Tile[]; ids: number[] }) {
  return (
    <group>
      {ids.slice(0, 4).map((id) => {
        const t = tiles[id];
        return t ? <Plume key={id} x={t.x} y={t.height} z={t.z} strength={1.4} seed={id * 0.31} /> : null;
      })}
    </group>
  );
}
