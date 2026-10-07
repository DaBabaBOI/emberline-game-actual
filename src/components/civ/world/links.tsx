"use client";

import { useMemo } from "react";
import { connectedPairs } from "@/game/engine";
import type { GameState, Tile } from "@/game/types";
import { BUILDING_SCALE } from "./building-models";

// How high an aqueduct's water channel runs above its tile (AqueductModel).
const CHANNEL = 0.56 * BUILDING_SCALE;

// One link between two touching tiles: a raised stone channel with water for
// aqueducts, a short paved path for other buildings that help each other.
function Link({ a, b, kind }: { a: Tile; b: Tile; kind: "water" | "path" | "wall" }) {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const flat = Math.hypot(dx, dz);
  const yaw = Math.atan2(dz, dx);
  const mid = { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 };
  if (kind === "water") {
    const y = (a.height + b.height) / 2 + CHANNEL;
    const ground = Math.min(a.height, b.height);
    return (
      <group position={[mid.x, 0, mid.z]} rotation={[0, -yaw, 0]}>
        <mesh position={[0, y, 0]} raycast={() => null}>
          <boxGeometry args={[flat * 0.62, 0.15, 0.36]} />
          <meshStandardMaterial color="#c9bfae" flatShading />
        </mesh>
        <mesh position={[0, y + 0.08, 0]} raycast={() => null}>
          <boxGeometry args={[flat * 0.62, 0.03, 0.18]} />
          <meshStandardMaterial color="#4f9fd6" roughness={0.15} />
        </mesh>
        {[-0.18, 0.18].map((f) => (
          <mesh key={f} position={[f * flat, (ground + y) / 2, 0]} raycast={() => null}>
            <boxGeometry args={[0.16, y - ground, 0.3]} />
            <meshStandardMaterial color="#b5aa97" flatShading />
          </mesh>
        ))}
      </group>
    );
  }
  if (kind === "wall") {
    // A stretch of stone wall closing the gap between two wall towers.
    const ground = Math.min(a.height, b.height);
    const top = Math.max(a.height, b.height) + 0.42 * BUILDING_SCALE;
    return (
      <group position={[mid.x, 0, mid.z]} rotation={[0, -yaw, 0]}>
        <mesh position={[0, (ground + top) / 2, 0]} castShadow raycast={() => null}>
          <boxGeometry args={[flat * 0.75, top - ground, 0.24]} />
          <meshStandardMaterial color="#9a9083" flatShading />
        </mesh>
        {[-0.25, 0, 0.25].map((f) => (
          <mesh key={f} position={[f * flat, top + 0.06, 0]} castShadow raycast={() => null}>
            <boxGeometry args={[0.14, 0.12, 0.26]} />
            <meshStandardMaterial color="#8a8073" flatShading />
          </mesh>
        ))}
      </group>
    );
  }
  // The path covers the gap between the two buildings, sloping with the ground.
  const rise = b.height - a.height;
  return (
    <group position={[mid.x, (a.height + b.height) / 2 + 0.03, mid.z]} rotation={[0, -yaw, 0]}>
      <mesh rotation={[0, 0, Math.atan2(rise, flat)]} raycast={() => null}>
        <boxGeometry args={[Math.hypot(flat, rise) * 0.5, 0.03, 0.2]} />
        <meshStandardMaterial color="#d8c49a" flatShading />
      </mesh>
    </group>
  );
}

// Buildings that work together are joined on the map (see CONNECTIONS).
export function Links({ state }: { state: GameState }) {
  const pairs = useMemo(() => connectedPairs(state), [state.tiles]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <group>
      {pairs.map(([a, b, kind]) => (
        <Link key={`${a.id}-${b.id}`} a={a} b={b} kind={kind} />
      ))}
    </group>
  );
}
