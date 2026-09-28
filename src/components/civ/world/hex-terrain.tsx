"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import { Color, CylinderGeometry, InstancedMesh, Object3D } from "three";
import { isLand } from "@/game/map";
import type { Terrain, Tile } from "@/game/types";

const TERRAIN_COLORS: Record<Terrain, string> = {
  deep: "#1f6fa8",
  shallow: "#43a9d6",
  beach: "#ead79c",
  grass: "#86c95f",
  forest: "#5aa24a",
  hills: "#b3ab72",
  mountain: "#9c968f",
};

const FOG_HEIGHT = 0.62;

function jitter(id: number, salt: number) {
  const x = Math.sin(id * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export function tileTop(tile: Tile) {
  return tile.revealed ? tile.height : FOG_HEIGHT;
}

export function HexTerrain({
  tiles,
  onHover,
  onPick,
}: {
  tiles: Tile[];
  onHover: (id: number | null) => void;
  onPick: (id: number) => void;
}) {
  const ref = useRef<InstancedMesh>(null);
  const geometry = useMemo(() => new CylinderGeometry(0.985, 0.985, 1, 6, 1), []);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const dummy = new Object3D();
    const color = new Color();
    for (const tile of tiles) {
      const h = tileTop(tile);
      dummy.position.set(tile.x, h / 2, tile.z);
      dummy.scale.set(1, h, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(tile.id, dummy.matrix);
      if (tile.revealed) {
        color.set(TERRAIN_COLORS[tile.terrain]);
        color.offsetHSL(0, 0, (jitter(tile.id, 1) - 0.5) * 0.06);
      } else {
        color.set(isLand(tile.terrain) ? "#e9eef3" : "#dfe8f0");
        color.offsetHSL(0, 0, (jitter(tile.id, 2) - 0.5) * 0.05);
      }
      mesh.setColorAt(tile.id, color);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [tiles]);

  return (
    <instancedMesh
      ref={ref}
      args={[geometry, undefined, tiles.length]}
      receiveShadow
      castShadow
      onPointerMove={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        onHover(e.instanceId ?? null);
      }}
      onPointerOut={() => onHover(null)}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        if (e.delta > 6 || e.instanceId === undefined) return;
        onPick(e.instanceId);
      }}
    >
      <meshStandardMaterial roughness={0.85} flatShading />
    </instancedMesh>
  );
}

export function Forests({ tiles }: { tiles: Tile[] }) {
  const trunks = useRef<InstancedMesh>(null);
  const crowns = useRef<InstancedMesh>(null);
  const spots = useMemo(() => {
    const out: { x: number; y: number; z: number; s: number; tone: number }[] = [];
    for (const t of tiles) {
      if (!t.revealed || t.building) continue;
      const trees = t.terrain === "forest" ? 3 : t.terrain === "grass" && jitter(t.id, 9) < 0.12 ? 1 : 0;
      for (let i = 0; i < trees; i++) {
        out.push({
          x: t.x + (jitter(t.id, i * 3 + 1) - 0.5) * 1.1,
          z: t.z + (jitter(t.id, i * 3 + 2) - 0.5) * 1.1,
          y: t.height,
          s: 0.75 + jitter(t.id, i * 3 + 3) * 0.5,
          tone: jitter(t.id, i + 20),
        });
      }
    }
    return out;
  }, [tiles]);

  useLayoutEffect(() => {
    const dummy = new Object3D();
    const color = new Color();
    spots.forEach((p, i) => {
      dummy.position.set(p.x, p.y + 0.12 * p.s, p.z);
      dummy.scale.setScalar(p.s);
      dummy.updateMatrix();
      trunks.current?.setMatrixAt(i, dummy.matrix);
      dummy.position.set(p.x, p.y + 0.42 * p.s, p.z);
      dummy.updateMatrix();
      crowns.current?.setMatrixAt(i, dummy.matrix);
      color.setHSL(0.3 + p.tone * 0.06, 0.45, 0.28 + p.tone * 0.08);
      crowns.current?.setColorAt(i, color);
    });
    for (const m of [trunks.current, crowns.current]) {
      if (!m) continue;
      m.count = spots.length;
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }
  }, [spots]);

  const max = Math.max(1, tiles.length * 3);
  return (
    <group>
      <instancedMesh ref={trunks} args={[undefined, undefined, max]} castShadow raycast={() => null}>
        <cylinderGeometry args={[0.035, 0.05, 0.24, 6]} />
        <meshStandardMaterial color="#6b4a2b" />
      </instancedMesh>
      <instancedMesh ref={crowns} args={[undefined, undefined, max]} castShadow raycast={() => null}>
        <coneGeometry args={[0.2, 0.5, 7]} />
        <meshStandardMaterial flatShading />
      </instancedMesh>
    </group>
  );
}

export function Mountains({ tiles }: { tiles: Tile[] }) {
  const peaks = useMemo(
    () => tiles.filter((t) => t.revealed && t.terrain === "mountain" && !t.building),
    [tiles],
  );
  return (
    <group>
      {peaks.map((t) => (
        <group key={t.id} position={[t.x, t.height, t.z]} rotation={[0, jitter(t.id, 4) * 3, 0]}>
          <mesh castShadow position={[0, 0.35, 0]} raycast={() => null}>
            <coneGeometry args={[0.6, 0.75, 5]} />
            <meshStandardMaterial color="#8f8a84" flatShading />
          </mesh>
          <mesh position={[0, 0.63, 0]} raycast={() => null}>
            <coneGeometry args={[0.27, 0.25, 5]} />
            <meshStandardMaterial color="#f4f6f8" flatShading />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function Deposits({ tiles }: { tiles: Tile[] }) {
  const visible = useMemo(
    () => tiles.filter((t) => t.revealed && t.deposit && !t.building && t.terrain !== "mountain"),
    [tiles],
  );
  return (
    <group>
      {visible.map((t) => {
        const pos: [number, number, number] = [t.x + 0.25, t.height, t.z - 0.2];
        switch (t.deposit) {
          case "berries":
            return (
              <group key={t.id} position={pos}>
                <mesh castShadow position={[0, 0.12, 0]} raycast={() => null}>
                  <sphereGeometry args={[0.15, 8, 6]} />
                  <meshStandardMaterial color="#3e8a3a" flatShading />
                </mesh>
                {[[0.1, 0.18, 0.06], [-0.08, 0.2, 0.08], [0.02, 0.24, -0.1]].map(([x, y, z], i) => (
                  <mesh key={i} position={[x, y, z]} raycast={() => null}>
                    <sphereGeometry args={[0.035, 6, 5]} />
                    <meshStandardMaterial color="#d62d4a" />
                  </mesh>
                ))}
              </group>
            );
          case "stone":
            return (
              <group key={t.id} position={pos}>
                {[[0, 0.08, 0, 0.13], [0.15, 0.05, 0.1, 0.08], [-0.12, 0.04, 0.12, 0.07]].map(([x, y, z, s], i) => (
                  <mesh key={i} castShadow position={[x, y, z]} rotation={[i, i * 2, 0]} raycast={() => null}>
                    <dodecahedronGeometry args={[s, 0]} />
                    <meshStandardMaterial color="#7d7a76" flatShading />
                  </mesh>
                ))}
              </group>
            );
          case "clay":
            return (
              <mesh key={t.id} position={[pos[0], pos[1] + 0.02, pos[2]]} scale={[1, 0.3, 1]} raycast={() => null}>
                <sphereGeometry args={[0.2, 8, 6]} />
                <meshStandardMaterial color="#b5653a" flatShading />
              </mesh>
            );
          case "fish":
            return (
              <group key={t.id} position={[t.x, t.height + 0.01, t.z]}>
                {[0, 2.1, 4.2].map((a) => (
                  <mesh key={a} position={[Math.cos(a) * 0.3, 0, Math.sin(a) * 0.3]} rotation={[-Math.PI / 2, 0, a]} raycast={() => null}>
                    <circleGeometry args={[0.08, 3]} />
                    <meshStandardMaterial color="#e6f4fb" transparent opacity={0.85} />
                  </mesh>
                ))}
              </group>
            );
          default:
            return null;
        }
      })}
    </group>
  );
}

