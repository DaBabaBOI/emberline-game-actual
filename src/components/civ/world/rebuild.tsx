"use client";

import { useMemo, useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group, InstancedMesh } from "three";
import { Object3D } from "three";
import type { Tile } from "@/game/types";
import { tileTop } from "./hex-terrain";

// A new era rebuilds the town (ERA_MAKEOVER): each rebuilt building sinks into
// a puff of dust and springs back up as its new-age self, one after another in
// a ripple out from the middle of town, with gold sparks rising. It plays over
// the era's fly-over shot.

const START = 4.6; // seconds before the first one (as the fly-over comes in close)
const STAGGER = 0.18; // between one building and the next
const POP = 0.9; // how long each takes

// When this makeover started playing (by its tick), shared by every piece.
const started = new Map<number, number>();
function since(key: number, now: number) {
  if (!started.has(key)) started.set(key, now);
  return now - started.get(key)!;
}

// The building itself: shrinks into the dust, then grows back with a bounce.
export function RebuildPop({ playKey, order, children }: { playKey: number | null; order: number; children: ReactNode }) {
  const group = useRef<Group>(null);
  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    if (playKey === null) {
      g.scale.setScalar(1);
      return;
    }
    const t = since(playKey, clock.elapsedTime) - START - order * STAGGER;
    if (t < 0 || t > POP) {
      g.scale.setScalar(1);
      return;
    }
    const p = t / POP;
    // Down to nothing in the first third, then back up past full size and settle.
    const s = p < 0.3 ? 1 - p / 0.3 : (() => {
      const q = (p - 0.3) / 0.7;
      const c = 1.7;
      return 1 + (c + 1) * Math.pow(q - 1, 3) + c * Math.pow(q - 1, 2);
    })();
    g.scale.set(Math.max(0.02, s), Math.max(0.02, s), Math.max(0.02, s));
  });
  return <group ref={group}>{children}</group>;
}

const PUFFS = 6;
const SPARKS = 8;
const dummy = new Object3D();

// Dust and sparks for every rebuilt building.
export function RebuildDust({ tiles, ids, playKey }: { tiles: Tile[]; ids: number[]; playKey: number }) {
  const spots = useMemo(() => ids.map((id) => tiles[id]).filter(Boolean), [ids, tiles]);
  const dust = useRef<InstancedMesh>(null);
  const sparks = useRef<InstancedMesh>(null);
  useFrame(({ clock }) => {
    const elapsed = since(playKey, clock.elapsedTime);
    let d = 0;
    let s = 0;
    spots.forEach((tile, i) => {
      const t = elapsed - START - i * STAGGER;
      const y0 = tileTop(tile);
      for (let k = 0; k < PUFFS; k++) {
        const a = (k / PUFFS) * Math.PI * 2 + i;
        const p = t / 1.6;
        const on = p > 0 && p < 1;
        const r = 0.25 + p * 0.55;
        dummy.position.set(tile.x + Math.cos(a) * r, y0 + 0.12 + p * 0.25, tile.z + Math.sin(a) * r);
        dummy.scale.setScalar(on ? 0.22 * (1 - p) + 0.08 : 0.0001);
        dummy.updateMatrix();
        dust.current?.setMatrixAt(d++, dummy.matrix);
      }
      for (let k = 0; k < SPARKS; k++) {
        const a = (k / SPARKS) * Math.PI * 2 + i * 0.7;
        const p = (t - 0.4 - (k % 3) * 0.12) / 1.8;
        const on = p > 0 && p < 1;
        dummy.position.set(tile.x + Math.cos(a) * 0.35, y0 + 0.3 + p * 1.6, tile.z + Math.sin(a) * 0.35);
        dummy.scale.setScalar(on ? 0.05 * (1 - p * 0.6) : 0.0001);
        dummy.updateMatrix();
        sparks.current?.setMatrixAt(s++, dummy.matrix);
      }
    });
    if (dust.current) {
      dust.current.count = d;
      dust.current.instanceMatrix.needsUpdate = true;
    }
    if (sparks.current) {
      sparks.current.count = s;
      sparks.current.instanceMatrix.needsUpdate = true;
    }
  });
  if (!spots.length) return null;
  return (
    <>
      <instancedMesh ref={dust} args={[undefined, undefined, spots.length * PUFFS]} raycast={() => null} frustumCulled={false}>
        <sphereGeometry args={[1, 7, 5]} />
        <meshStandardMaterial color="#d8cbb0" transparent opacity={0.75} depthWrite={false} />
      </instancedMesh>
      <instancedMesh ref={sparks} args={[undefined, undefined, spots.length * SPARKS]} raycast={() => null} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#ffd23f" />
      </instancedMesh>
    </>
  );
}
