"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, InstancedMesh, Object3D } from "three";
import { hexDistance } from "@/game/hex";
import { isLand } from "@/game/map";
import type { Tile } from "@/game/types";

const MAX = 60;
const TUNICS = ["#b5651d", "#8e5a3a", "#a0522d", "#6b8e23", "#c2956b", "#7a4e2d"];

interface Walker {
  x: number;
  z: number;
  y: number;
  tx: number;
  tz: number;
  ty: number;
  speed: number;
  child: boolean;
  wait: number;
}

function jitter(n: number) {
  const x = Math.sin(n * 91.7) * 43758.5453;
  return x - Math.floor(x);
}

export function Villagers({
  tiles,
  population,
  homeTile,
}: {
  tiles: Tile[];
  population: number;
  homeTile: Tile;
}) {
  const bodies = useRef<InstancedMesh>(null);
  const heads = useRef<InstancedMesh>(null);
  const walkers = useRef<Walker[]>([]);

  const spots = useMemo(() => {
    const built = tiles.filter((t) => t.building);
    const wander = tiles.filter(
      (t) => t.revealed && isLand(t.terrain) && t.terrain !== "mountain" && hexDistance(t, homeTile) <= 4,
    );
    return {
      all: built.length ? built : [homeTile],
      wander: wander.length ? wander : [homeTile],
      school: built.filter((t) => t.building === "elder"),
    };
  }, [tiles, homeTile]);

  const count = Math.min(MAX, Math.max(2, Math.ceil(population / 2)));

  useLayoutEffect(() => {
    const list = walkers.current;
    while (list.length < count) {
      const i = list.length;
      const start = spots.all[Math.floor(jitter(i) * spots.all.length)];
      list.push({
        x: start.x,
        z: start.z,
        y: start.height,
        tx: start.x,
        tz: start.z,
        ty: start.height,
        speed: 0.35 + jitter(i + 5) * 0.25,
        child: i % 4 === 3,
        wait: jitter(i + 9) * 2,
      });
    }
    list.length = count;
    const color = new Color();
    list.forEach((w, i) => {
      color.set(w.child ? "#4a90d9" : TUNICS[i % TUNICS.length]);
      bodies.current?.setColorAt(i, color);
    });
    if (bodies.current) {
      bodies.current.count = count;
      if (bodies.current.instanceColor) bodies.current.instanceColor.needsUpdate = true;
    }
    if (heads.current) heads.current.count = count;
  }, [count, spots]);

  useFrame((_, delta) => {
    const dummy = new Object3D();
    const dt = Math.min(delta, 0.1);
    walkers.current.forEach((w, i) => {
      const dx = w.tx - w.x;
      const dz = w.tz - w.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.05) {
        w.wait -= dt;
        if (w.wait <= 0) {
          const pool =
            w.child && spots.school.length
              ? spots.school
              : Math.random() < 0.4
                ? spots.wander
                : spots.all;
          const goHome = w.child && spots.school.length && jitter(i + w.x) < 0.5;
          const target = goHome ? spots.all[i % spots.all.length] : pool[Math.floor(Math.random() * pool.length)];
          w.tx = target.x + (Math.random() - 0.5) * 0.7;
          w.tz = target.z + (Math.random() - 0.5) * 0.7;
          w.ty = target.height;
          w.wait = 1 + Math.random() * 3;
        }
      } else {
        const step = Math.min(dist, w.speed * dt);
        w.x += (dx / dist) * step;
        w.z += (dz / dist) * step;
        w.y += (w.ty - w.y) * Math.min(1, dt * 3);
      }
      const scale = w.child ? 0.9 : 1.35;
      const bob = dist > 0.05 ? Math.abs(Math.sin(performance.now() / 120 + i)) * 0.02 : 0;
      dummy.position.set(w.x, w.y + 0.15 * scale + bob, w.z);
      dummy.rotation.set(0, Math.atan2(dx, dz), 0);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      bodies.current?.setMatrixAt(i, dummy.matrix);
      dummy.position.y = w.y + 0.36 * scale + bob;
      dummy.updateMatrix();
      heads.current?.setMatrixAt(i, dummy.matrix);
    });
    if (bodies.current) bodies.current.instanceMatrix.needsUpdate = true;
    if (heads.current) heads.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      <instancedMesh ref={bodies} args={[undefined, undefined, MAX]} castShadow frustumCulled={false} raycast={() => null}>
        <cylinderGeometry args={[0.06, 0.085, 0.3, 7]} />
        <meshStandardMaterial />
      </instancedMesh>
      <instancedMesh ref={heads} args={[undefined, undefined, MAX]} castShadow frustumCulled={false} raycast={() => null}>
        <sphereGeometry args={[0.07, 10, 8]} />
        <meshStandardMaterial color="#e0ac69" />
      </instancedMesh>
    </group>
  );
}
