"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import { Color, CylinderGeometry, InstancedMesh, Object3D } from "three";
import { LAND } from "@/game/content";
import { hexDistance } from "@/game/hex";
import { isLand } from "@/game/map";
import type { Terrain, Tile } from "@/game/types";

const TERRAIN_COLORS: Record<Terrain, string> = {
  steppe: "#d4c47a",
  marsh: "#6f8f78",
  deep: "#1f6fa8",
  shallow: "#43a9d6",
  beach: "#ead79c",
  grass: "#86c95f",
  forest: "#5aa24a",
  hills: "#b3ab72",
  mountain: "#9c968f",
  river: "#5bb8e3",
};

const FOG_HEIGHT = 0.62;
const CHARRED = new Color("#2e2620");
// Cut-over forest shows bare earth and stumps; worn-out grass dries up.
const BARE = new Color("#7a6443");
const DRY = new Color("#b8a060");
// Bare rock where a quarry has cut the hill away.
const CUT = new Color("#8d8780");
// From the Ancient era, open ground between buildings wears into dirt paths;
// with Paved Roads they become stone roads.
const PATH = new Color("#b89a66");
const ROAD = new Color("#a8a196");
// In the drought the grass burns brown and the river runs low and muddy.
const PARCHED = new Color("#c2a45e");
const LOW_RIVER = new Color("#8fae9a");

function jitter(id: number, salt: number) {
  const x = Math.sin(id * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

// Unexplored sea stays blue (just a little darker); unexplored land (and any
// river running through it) is hidden under a layer of cloud.
export function underCloud(tile: Tile) {
  return !tile.revealed && (isLand(tile.terrain) || tile.terrain === "river");
}

export function tileTop(tile: Tile) {
  return underCloud(tile) ? FOG_HEIGHT : tile.height;
}

export function HexTerrain({
  tiles,
  home,
  wear = 0,
  era = 0,
  roads = false,
  dry = 0,
  onHover,
  onPick,
}: {
  tiles: Tile[];
  home?: Tile;
  era?: number;
  // Paved Roads researched: paths are stone.
  roads?: boolean;
  // 0–1: how hard the drought has hit (browns the grass, lowers the river).
  dry?: number;
  // 0–1: how worn out the land around home is (dries the grass).
  wear?: number;
  onHover: (id: number | null) => void;
  // `touch` is true when the tap came from a finger (no hover on phones).
  onPick: (id: number, touch: boolean) => void;
}) {
  const ref = useRef<InstancedMesh>(null);
  const lastPointer = useRef("mouse");
  const geometry = useMemo(() => new CylinderGeometry(1.0, 1.0, 1, 6, 1), []);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const dummy = new Object3D();
    const color = new Color();
    // Paths become sparser in later eras so dense cities stay readable.
    const paths = new Set<number>();
    if (era >= 1) {
      const built = tiles.filter((t) => t.building);
      const pathThreshold = era >= 5 ? 4 : era >= 4 ? 3 : 2;
      for (const t of tiles) {
        if (t.building || (t.terrain !== "grass" && t.terrain !== "steppe")) continue;
        if (built.filter((b) => hexDistance(b, t) === 1).length >= pathThreshold) paths.add(t.id);
      }
    }
    for (const tile of tiles) {
      const h = tileTop(tile);
      dummy.position.set(tile.x, h / 2, tile.z);
      dummy.scale.set(1, h, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(tile.id, dummy.matrix);
      if (tile.revealed) {
        color.set(TERRAIN_COLORS[tile.terrain]);
        color.offsetHSL(0, 0, (jitter(tile.id, 1) - 0.5) * 0.06);
        if (tile.terrain === "forest" && tile.growth < 0.6) color.lerp(BARE, (0.6 - tile.growth) * 1.1);
        if (wear > 0 && tile.terrain === "grass" && home && hexDistance(tile, home) <= LAND.radius) {
          color.lerp(DRY, wear * 0.55);
        }
        if (tile.scorch > 0) color.lerp(CHARRED, Math.min(1, tile.scorch * 1.2));
        if (tile.dug) color.lerp(CUT, Math.min(1, tile.dug * 0.9));
        if (paths.has(tile.id)) color.lerp(roads ? ROAD : PATH, roads ? 0.7 : 0.45);
        if (dry > 0 && (tile.terrain === "grass" || tile.terrain === "steppe" || tile.terrain === "marsh")) color.lerp(PARCHED, dry * 0.6);
        if (dry > 0 && tile.terrain === "river") color.lerp(LOW_RIVER, dry * 0.7);
      } else {
        if (underCloud(tile)) {
          color.set("#eef2f6");
          color.offsetHSL(0, 0, (jitter(tile.id, 2) - 0.5) * 0.05);
        } else {
          color.set(TERRAIN_COLORS.deep);
          color.offsetHSL(0, 0, -0.04 + (jitter(tile.id, 2) - 0.5) * 0.03);
        }
      }
      mesh.setColorAt(tile.id, color);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [tiles, wear, home, era, roads, dry]);

  return (
    <instancedMesh
      ref={ref}
      args={[geometry, undefined, tiles.length]}
      receiveShadow
      castShadow
      onPointerDown={(e: ThreeEvent<PointerEvent>) => {
        lastPointer.current = e.pointerType;
      }}
      onPointerMove={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        // Fingers dragging the map shouldn't move the preview around.
        if (e.pointerType === "touch") return;
        onHover(e.instanceId ?? null);
      }}
      onPointerOut={(e: ThreeEvent<PointerEvent>) => {
        if (e.pointerType !== "touch") onHover(null);
      }}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        if (e.delta > 6 || e.instanceId === undefined) return;
        onPick(e.instanceId, lastPointer.current === "touch");
      }}
    >
      <meshStandardMaterial roughness={0.85} flatShading />
    </instancedMesh>
  );
}

// Where the trees on a tile stand, and how big they are (shared with the old
// grove, which ties ribbons round these same trunks).
export function treeSpots(t: Tile) {
  const out: { x: number; y: number; z: number; s: number; tone: number }[] = [];
  if (!t.revealed || t.building) return out;
  const trees = t.terrain === "forest" ? 3 : t.terrain === "grass" && jitter(t.id, 9) < 0.12 ? 1 : 0;
  for (let i = 0; i < trees; i++) {
    out.push({
      x: t.x + (jitter(t.id, i * 3 + 1) - 0.5) * 1.1,
      z: t.z + (jitter(t.id, i * 3 + 2) - 0.5) * 1.1,
      y: t.height,
      s: (0.75 + jitter(t.id, i * 3 + 3) * 0.5) * Math.max(0.2, t.terrain === "forest" ? t.growth : 1),
      tone: jitter(t.id, i + 20),
    });
  }
  return out;
}

export function Forests({ tiles }: { tiles: Tile[] }) {
  const trunks = useRef<InstancedMesh>(null);
  const crowns = useRef<InstancedMesh>(null);
  const spots = useMemo(() => tiles.flatMap(treeSpots), [tiles]);

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

// The mountain is the peak itself: a steep six-sided cone that fills the whole
// hex, with a snow cap and sometimes a smaller shoulder peak beside it.
export function Mountains({
  tiles,
  onHover,
  onPick,
}: {
  tiles: Tile[];
  onHover?: (id: number | null) => void;
  onPick?: (id: number, touch: boolean) => void;
}) {
  const peaks = useMemo(
    () => tiles.filter((t) => t.revealed && t.terrain === "mountain" && !t.building),
    [tiles],
  );
  return (
    <group>
      {peaks.map((t) => {
        // A quarried mountain loses its peak for good.
        const h = (1.7 + jitter(t.id, 4) * 0.9) * (1 - 0.75 * (t.dug ?? 0));
        const cap = h * 0.28;
        const shoulder = jitter(t.id, 5) > 0.45;
        return (
          <group
            key={t.id}
            position={[t.x, t.height, t.z]}
            onPointerMove={(e) => {
              e.stopPropagation();
              onHover?.(t.id);
            }}
            onClick={(e) => {
              e.stopPropagation();
              onPick?.(t.id, e.nativeEvent instanceof PointerEvent && e.nativeEvent.pointerType === "touch");
            }}
          >
            <mesh castShadow receiveShadow position={[0, h / 2, 0]}>
              <coneGeometry args={[0.97, h, 6]} />
              <meshStandardMaterial color="#8f8a84" flatShading />
            </mesh>
            <mesh position={[0, h - cap / 2 + 0.01, 0]} raycast={() => null}>
              <coneGeometry args={[(0.97 * cap) / h + 0.02, cap, 6]} />
              <meshStandardMaterial color="#f4f6f8" flatShading />
            </mesh>
            {shoulder && (
              <mesh
                castShadow
                position={[0.35 * Math.cos(jitter(t.id, 6) * 6), h * 0.3, 0.35 * Math.sin(jitter(t.id, 6) * 6)]}
                raycast={() => null}
              >
                <coneGeometry args={[0.5, h * 0.6, 5]} />
                <meshStandardMaterial color="#7f7a74" flatShading />
              </mesh>
            )}
          </group>
        );
      })}
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


// Small details that make the biomes readable: water and reeds in the marsh,
// dry tufts on the steppe. Instanced so a big steppe stays cheap.
export function BiomeDetails({ tiles }: { tiles: Tile[] }) {
  const puddles = useRef<InstancedMesh>(null);
  const reeds = useRef<InstancedMesh>(null);
  const tufts = useRef<InstancedMesh>(null);
  const { marsh, steppe } = useMemo(
    () => ({
      marsh: tiles.filter((t) => t.revealed && t.terrain === "marsh" && !t.building),
      steppe: tiles.filter((t) => t.revealed && t.terrain === "steppe" && !t.building),
    }),
    [tiles],
  );

  useLayoutEffect(() => {
    const dummy = new Object3D();
    const place = (mesh: InstancedMesh | null, list: Tile[], per: number, set: (t: Tile, i: number) => void) => {
      if (!mesh) return;
      let n = 0;
      for (const t of list) {
        for (let i = 0; i < per; i++) {
          set(t, i);
          dummy.updateMatrix();
          mesh.setMatrixAt(n++, dummy.matrix);
        }
      }
      mesh.count = n;
      mesh.instanceMatrix.needsUpdate = true;
    };
    const spot = (t: Tile, i: number, spread: number) => {
      const a = jitter(t.id, i * 5 + 11) * Math.PI * 2;
      const r = 0.15 + jitter(t.id, i * 5 + 12) * spread;
      return [t.x + Math.cos(a) * r, t.z + Math.sin(a) * r] as const;
    };
    place(puddles.current, marsh, 2, (t, i) => {
      const [x, z] = spot(t, i, 0.35);
      dummy.position.set(x, tileTop(t) + 0.015, z);
      dummy.rotation.set(-Math.PI / 2, 0, 0);
      dummy.scale.setScalar(0.8 + jitter(t.id, i + 30) * 0.6);
    });
    place(reeds.current, marsh, 6, (t, i) => {
      const [x, z] = spot(t, i + 3, 0.55);
      dummy.position.set(x, tileTop(t) + 0.15, z);
      dummy.rotation.set((jitter(t.id, i + 40) - 0.5) * 0.3, 0, (jitter(t.id, i + 41) - 0.5) * 0.3);
      dummy.scale.set(1, 0.8 + jitter(t.id, i + 42) * 0.6, 1);
    });
    place(tufts.current, steppe, 4, (t, i) => {
      const [x, z] = spot(t, i, 0.6);
      dummy.position.set(x, tileTop(t) + 0.06, z);
      dummy.rotation.set(0, jitter(t.id, i + 50) * 3, 0);
      dummy.scale.setScalar(0.7 + jitter(t.id, i + 51) * 0.6);
    });
  }, [marsh, steppe]);

  return (
    <group>
      <instancedMesh ref={puddles} args={[undefined, undefined, Math.max(1, marsh.length * 2)]} raycast={() => null} frustumCulled={false}>
        <circleGeometry args={[0.22, 7]} />
        <meshStandardMaterial color="#5d9fc4" roughness={0.2} />
      </instancedMesh>
      <instancedMesh ref={reeds} args={[undefined, undefined, Math.max(1, marsh.length * 6)]} raycast={() => null} frustumCulled={false}>
        <cylinderGeometry args={[0.018, 0.025, 0.3, 4]} />
        <meshStandardMaterial color="#8a9a4a" flatShading />
      </instancedMesh>
      <instancedMesh ref={tufts} args={[undefined, undefined, Math.max(1, steppe.length * 4)]} raycast={() => null} frustumCulled={false}>
        <coneGeometry args={[0.1, 0.14, 5]} />
        <meshStandardMaterial color="#a8904a" flatShading />
      </instancedMesh>
    </group>
  );
}
