"use client";

import { useLayoutEffect, useMemo, useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { BufferGeometry, DoubleSide, Float32BufferAttribute, InstancedMesh, Object3D, Vector3, type AmbientLight, type Group, type Mesh, type MeshBasicMaterial } from "three";
import type { GameState, Tile } from "@/game/types";
import { prefersLessMotion } from "@/lib/graphics";
import { tileTop } from "./hex-terrain";

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

// How hard the ground is shaking right now (0–1): the camera rumbles with it
// and every building sways. It builds up fast and dies away slowly, with a
// faint tremor while the animals are restless beforehand.
export const quake = { amp: 0 };

export function QuakeShake({ active, warning }: { active: boolean; warning: boolean }) {
  const last = useRef(new Vector3());
  useFrame(({ camera, clock }, delta) => {
    const target = active ? 1 : warning ? 0.07 : 0;
    quake.amp += (target - quake.amp) * Math.min(1, delta * (target > quake.amp ? 2.5 : 0.7));
    if (quake.amp < 0.003 && target === 0) quake.amp = 0;
    // Undo last frame's jolt, then add this frame's: a rumble of a few low
    // waves on top of each other (not random jitter).
    camera.position.sub(last.current);
    const t = clock.elapsedTime;
    const a = quake.amp * (prefersLessMotion() ? 0.25 : 1);
    last.current.set(
      (Math.sin(t * 23) * 0.6 + Math.sin(t * 37 + 1) * 0.4) * 0.11 * a,
      (Math.sin(t * 29 + 2) * 0.7 + Math.sin(t * 11) * 0.3) * 0.07 * a,
      (Math.sin(t * 31 + 4) * 0.6 + Math.sin(t * 17 + 3) * 0.4) * 0.11 * a,
    );
    camera.position.add(last.current);
  });
  return null;
}

// A building rocking on its footing while the ground shakes.
export function QuakeSway({ seed, children }: { seed: number; children: ReactNode }) {
  const g = useRef<Group>(null);
  useFrame(({ clock }) => {
    const m = g.current;
    if (!m) return;
    const a = quake.amp;
    const t = clock.elapsedTime;
    m.rotation.x = a ? Math.sin(t * 9 + seed) * 0.06 * a : 0;
    m.rotation.z = a ? Math.sin(t * 11 + seed * 1.7) * 0.06 * a : 0;
    m.position.y = a ? Math.abs(Math.sin(t * 14 + seed)) * 0.04 * a : 0;
  });
  return <group ref={g}>{children}</group>;
}

// Shock waves: rings of dust rolling out across the ground from where it struck.
export function QuakeWaves({ centre }: { centre: Tile }) {
  const rings = useRef<(Mesh | null)[]>([]);
  useFrame(({ clock }) => {
    rings.current.forEach((m, i) => {
      if (!m) return;
      const k = (clock.elapsedTime / 1.4 + i / 3) % 1;
      m.scale.setScalar(0.3 + k * 6.5);
      (m.material as MeshBasicMaterial).opacity = (1 - k) * (1 - k) * 0.5 * quake.amp;
    });
  });
  return (
    <group position={[centre.x, tileTop(centre) + 0.07, centre.z]}>
      {[0, 1, 2].map((i) => (
        <mesh key={i} ref={(m) => void (rings.current[i] = m)} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
          <ringGeometry args={[0.8, 1, 48]} />
          <meshBasicMaterial color="#e2cfa6" transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

// Dust thrown up low along the ground: round where it struck, and where
// buildings came down (an earthquake), or where the hillside slid (a landslide).
const DUST = 36;
export function GroundDust({ tiles, ids, centre }: { tiles: Tile[]; ids: number[]; centre: Tile }) {
  const mesh = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const spots = useMemo(() => {
    const anchors = [centre, ...ids.map((id) => tiles[id]).filter(Boolean)];
    return Array.from({ length: DUST }, (_, i) => {
      const at = anchors[i % anchors.length];
      const a = i * 2.39996;
      const r = 0.2 + ((i * 37) % 10) / 10 * (at === centre ? 2.2 : 0.7);
      return { x: at.x + Math.cos(a) * r, z: at.z + Math.sin(a) * r, y: tileTop(at), phase: (i * 0.618) % 1 };
    });
  }, [tiles, ids, centre]);
  useFrame(({ clock }) => {
    const m = mesh.current;
    if (!m) return;
    const t = clock.elapsedTime;
    const amp = Math.max(quake.amp, 0.6);
    spots.forEach((p, i) => {
      const k = (t * 0.45 + p.phase) % 1;
      dummy.position.set(p.x + Math.sin(t + i) * 0.1 * k, p.y + 0.08 + k * 0.45, p.z + Math.cos(t * 0.8 + i) * 0.1 * k);
      dummy.scale.set(1, 0.6, 1).multiplyScalar((0.18 + k * 0.55) * amp * (k < 0.75 ? 1 : (1 - k) / 0.25));
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, DUST]} raycast={() => null} frustumCulled={false}>
      <sphereGeometry args={[1, 9, 6]} />
      <meshStandardMaterial color="#cdb995" transparent opacity={0.5} depthWrite={false} roughness={1} />
    </instancedMesh>
  );
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

// A strip along a jagged line on the ground (y = 0), as wide as `widths` at each point.
function strip(points: [number, number][], widths: number[]) {
  const pos: number[] = [];
  const index: number[] = [];
  points.forEach(([x, z], i) => {
    const [px, pz] = points[Math.max(0, i - 1)];
    const [nx, nz] = points[Math.min(points.length - 1, i + 1)];
    const dx = nx - px;
    const dz = nz - pz;
    const l = Math.hypot(dx, dz) || 1;
    const w = widths[i] / 2;
    pos.push(x - (dz / l) * w, 0, z + (dx / l) * w, x + (dz / l) * w, 0, z - (dx / l) * w);
    if (i > 0) {
      const k = i * 2;
      index.push(k - 2, k - 1, k, k - 1, k + 1, k);
    }
  });
  return { pos, index };
}

// One fissure across a tile, along `dir`: a jagged split that is widest in the
// middle, with a smaller branch off it.
function fissure(dir: number, seed: number, length: number) {
  const r = (n: number) => {
    const v = Math.sin(seed * 127.1 + n * 311.7) * 43758.5453;
    return v - Math.floor(v);
  };
  const ux = Math.cos(dir);
  const uz = Math.sin(dir);
  const n = 8;
  const pts: [number, number][] = [];
  const ws: number[] = [];
  for (let i = 0; i < n; i++) {
    const k = i / (n - 1);
    const along = (k - 0.5) * length;
    const off = i === 0 || i === n - 1 ? 0 : (r(i) - 0.5) * 0.24;
    pts.push([ux * along - uz * off, uz * along + ux * off]);
    ws.push(0.015 + Math.sin(Math.PI * k) * 0.085);
  }
  const from = pts[3 + Math.floor(r(20) * 2)];
  const turn = dir + (r(21) > 0.5 ? 0.8 : -0.8);
  const branch: [number, number][] = [0, 1, 2, 3].map((i) => [from[0] + Math.cos(turn) * i * 0.14 + (i ? (r(30 + i) - 0.5) * 0.07 : 0), from[1] + Math.sin(turn) * i * 0.14 + (i ? (r(40 + i) - 0.5) * 0.07 : 0)]);
  return [strip(pts, ws), strip(branch, [0.045, 0.035, 0.022, 0.01])];
}

function geometryOf(parts: { pos: number[]; index: number[] }[], grow = 0) {
  const pos: number[] = [];
  const index: number[] = [];
  for (const p of parts) {
    const base = pos.length / 3;
    // A wider copy for the broken rim (grow scales each vertex out from the
    // strip's own centre line: approximated by pushing x/z apart a little).
    for (let i = 0; i < p.pos.length; i += 6) {
      const [ax, , az, bx, , bz] = p.pos.slice(i, i + 6);
      const cx = (ax + bx) / 2;
      const cz = (az + bz) / 2;
      const s = 1 + grow;
      pos.push(cx + (ax - cx) * s, 0, cz + (az - cz) * s, cx + (bx - cx) * s, 0, cz + (bz - cz) * s);
    }
    index.push(...p.index.map((v) => v + base));
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(pos, 3));
  g.setIndex(index);
  return g;
}

// Cracks from an earthquake: jagged fissures running out from where it struck,
// dark in the middle with a pale broken rim. They fade over a few minutes.
export function Cracks({ tiles, centre }: { tiles: Tile[]; centre?: number }) {
  const cracked = useMemo(() => tiles.filter((t) => (t.cracked ?? 0) > 0.15 && t.revealed), [tiles]);
  const key = cracked.map((t) => t.id).join(",");
  const shapes = useMemo(() => {
    const c = centre !== undefined ? tiles[centre] : null;
    return cracked.map((t) => {
      const here = c && c.id === t.id;
      // Out from the epicentre (several from the epicentre itself); a random way without one.
      const dirs = here ? [0.3, 2.4, 4.4] : [c ? Math.atan2(t.z - c.z, t.x - c.x) : (t.id * 2.399) % (Math.PI * 2)];
      const parts = dirs.flatMap((d, i) => fissure(d, t.id * 3 + i, here ? 1.2 : 1.7));
      return { id: t.id, core: geometryOf(parts), rim: geometryOf(parts, 0.9) };
    });
    // Only when which tiles are cracked changes (not as they fade).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, centre]);
  return (
    <group>
      {shapes.map(({ id, core, rim }) => {
        const t = tiles[id];
        const o = Math.min(1, (t.cracked ?? 0) * 1.3);
        return (
          <group key={id} position={[t.x, tileTop(t) + 0.012, t.z]}>
            <mesh geometry={rim} raycast={() => null} renderOrder={1}>
              <meshBasicMaterial color="#9a8462" transparent opacity={0.7 * o} depthWrite={false} polygonOffset polygonOffsetFactor={-1} side={DoubleSide} />
            </mesh>
            <mesh geometry={core} position={[0, 0.003, 0]} raycast={() => null} renderOrder={2}>
              <meshBasicMaterial color="#1f150e" transparent opacity={0.92 * o} depthWrite={false} polygonOffset polygonOffsetFactor={-2} side={DoubleSide} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

// What's left of a building the earthquake brought down: a heap of earth and
// broken stone, snapped beams sticking out, and a stub of wall. It sinks away
// as the ruin fades (or goes at once when something is built there).
export function Ruins({ tiles }: { tiles: Tile[] }) {
  const ruins = useMemo(() => tiles.filter((t) => (t.ruin ?? 0) > 0.1 && !t.building && t.revealed), [tiles]);
  return (
    <group>
      {ruins.map((t) => {
        const k = Math.min(1, (t.ruin ?? 0) * 1.5);
        return (
          <group key={t.id} position={[t.x, tileTop(t), t.z]} rotation={[0, t.id * 1.3, 0]} scale={[1, k, 1]}>
            <mesh position={[0, 0.03, 0]} scale={[1, 0.3, 0.85]} raycast={() => null}>
              <sphereGeometry args={[0.5, 9, 6]} />
              <meshStandardMaterial color="#7d6a52" flatShading />
            </mesh>
            {/* A stub of wall still standing. */}
            <mesh castShadow position={[-0.22, 0.14, -0.1]} rotation={[0, 0.3, 0.12]} raycast={() => null}>
              <boxGeometry args={[0.38, 0.28, 0.07]} />
              <meshStandardMaterial color="#b9a88a" flatShading />
            </mesh>
            {/* Snapped beams. */}
            {[
              [0.15, 0.12, 0.05, 0.9, 0.4],
              [0.05, 0.1, -0.2, -0.7, 1.9],
              [-0.05, 0.08, 0.22, 0.5, 3.1],
            ].map(([x, y, z, tilt, turn], i) => (
              <mesh key={i} castShadow position={[x, y, z]} rotation={[tilt, turn, 0.2]} raycast={() => null}>
                <boxGeometry args={[0.05, 0.05, 0.42]} />
                <meshStandardMaterial color="#5e4027" flatShading />
              </mesh>
            ))}
            {[0.4, 1.6, 2.7, 3.9, 5.1].map((a, i) => (
              <mesh key={a} castShadow position={[Math.cos(a) * 0.32, 0.07, Math.sin(a) * 0.32]} rotation={[a, a * 2, 0]} raycast={() => null}>
                <dodecahedronGeometry args={[0.06 + (i % 3) * 0.025, 0]} />
                <meshStandardMaterial color="#9b958c" flatShading />
              </mesh>
            ))}
          </group>
        );
      })}
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
