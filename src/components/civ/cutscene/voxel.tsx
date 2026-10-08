"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, Object3D, type Group, type InstancedMesh } from "three";
import { PALETTE, SPRITES, type IconId } from "@/game/sprites";

// Seconds since this piece first appeared.
function useSince() {
  const since = useRef({ start: -1, t: 0 });
  useFrame(({ clock }) => {
    const s = since.current;
    if (s.start < 0) s.start = clock.elapsedTime;
    s.t = clock.elapsedTime - s.start;
  }, -1);
  return since;
}

// One of the game's pixel icons, built of little blocks (12 by 12) and standing
// on its bottom edge. It pops up when it appears; `spin` turns it slowly.
export function VoxelIcon({ name, size = 0.8, flip = false, spin = false, pop = true }: { name: IconId; size?: number; flip?: boolean; spin?: boolean; pop?: boolean }) {
  const cells = useMemo(() => {
    const out: { x: number; y: number; color: string }[] = [];
    SPRITES[name].forEach((row, y) => Array.from(row).forEach((ch, x) => ch !== "." && out.push({ x, y, color: PALETTE[ch] })));
    return out;
  }, [name]);
  return <Voxels key={name} cells={cells} size={size} flip={flip} spin={spin} pop={pop} />;
}

function Voxels({ cells, size, flip, spin, pop }: { cells: { x: number; y: number; color: string }[]; size: number; flip: boolean; spin: boolean; pop: boolean }) {
  const mesh = useRef<InstancedMesh>(null);
  const g = useRef<Group>(null);
  const since = useSince();
  const px = size / 12;
  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const d = new Object3D();
    const c = new Color();
    cells.forEach((cell, i) => {
      d.position.set((cell.x - 5.5) * px * (flip ? -1 : 1), (11.5 - cell.y) * px, 0);
      d.scale.set(px, px, px * 1.6);
      d.updateMatrix();
      m.setMatrixAt(i, d.matrix);
      m.setColorAt(i, c.set(cell.color));
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [cells, px, flip]);
  useFrame(({ clock }) => {
    const p = pop ? Math.min(1, since.current.t / 0.45) : 1;
    // Up with a little overshoot, like the icons popping in the old scenes.
    const s = p >= 1 ? 1 : 1 + 2.2 * Math.pow(p - 1, 3) + 1.2 * Math.pow(p - 1, 2);
    if (g.current) {
      g.current.scale.setScalar(Math.max(0.001, s));
      g.current.rotation.y = spin ? Math.sin(clock.elapsedTime * 0.9) * 0.6 : 0;
    }
  });
  return (
    <group ref={g}>
      <instancedMesh ref={mesh} args={[undefined, undefined, cells.length]} castShadow frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.8} />
      </instancedMesh>
    </group>
  );
}
