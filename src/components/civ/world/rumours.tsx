"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import type { GameState } from "@/game/types";
import { Html } from "./html";

// Rumours of land, out in the fog: a thin column of smoke where a people's
// fires were seen, or seabirds circling over an island nobody has found yet.
// Roughly where: send a canoe or ship near it to see.

function Smoke({ x, z }: { x: number; z: number }) {
  const ref = useRef<Group>(null);
  useFrame(({ clock }) => {
    const g = ref.current;
    if (!g) return;
    const t = clock.elapsedTime;
    g.children.forEach((puff, i) => {
      // Each puff rises, grows and fades, then starts again at the bottom.
      const k = (t * 0.18 + i / g.children.length) % 1;
      puff.position.set(Math.sin(t * 0.4 + i) * 0.25 + k * 0.6, 0.6 + k * 4.2, Math.cos(t * 0.3 + i) * 0.2);
      puff.scale.setScalar(0.35 + k * 0.9);
      const m = (puff as unknown as { material: { opacity: number } }).material;
      m.opacity = 0.55 * (1 - k);
    });
  });
  return (
    <group ref={ref} position={[x, 0, z]}>
      {Array.from({ length: 7 }, (_, i) => (
        <mesh key={i} raycast={() => null}>
          <icosahedronGeometry args={[1, 1]} />
          <meshStandardMaterial color="#9aa0a6" transparent opacity={0.4} depthWrite={false} flatShading />
        </mesh>
      ))}
    </group>
  );
}

function Birds({ x, z }: { x: number; z: number }) {
  const ref = useRef<Group>(null);
  useFrame(({ clock }) => {
    const g = ref.current;
    if (!g) return;
    const t = clock.elapsedTime;
    g.children.forEach((bird, i) => {
      const a = t * (0.5 + i * 0.07) + (i * Math.PI * 2) / g.children.length;
      const r = 1.6 + (i % 2) * 0.7;
      bird.position.set(Math.cos(a) * r, 2.6 + Math.sin(t * 1.3 + i) * 0.3 + i * 0.15, Math.sin(a) * r);
      bird.rotation.set(0, -a, Math.sin(t * 8 + i) * 0.5);
    });
  });
  return (
    <group ref={ref} position={[x, 0, z]}>
      {Array.from({ length: 4 }, (_, i) => (
        <group key={i}>
          {[-1, 1].map((side) => (
            <mesh key={side} position={[0, 0, side * 0.12]} rotation={[side * 0.5, 0, 0]} raycast={() => null}>
              <boxGeometry args={[0.08, 0.02, 0.24]} />
              <meshStandardMaterial color="#2b2b2b" />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

export function RumourMarkers({ state }: { state: GameState }) {
  const rumours = state.rumours ?? [];
  if (!rumours.length) return null;
  return (
    <group>
      {rumours.map((r) => (
        <group key={r.island}>
          {r.what === "smoke" ? <Smoke x={r.x} z={r.z} /> : <Birds x={r.x} z={r.z} />}
          <Html zIndexRange={[11, 0]} center position={[r.x, r.what === "smoke" ? 5.4 : 3.6, r.z]} style={{ pointerEvents: "none" }}>
            <div className="pixel-panel font-pixel whitespace-nowrap px-1.5 py-0.5 text-[11px]" data-testid="rumour">
              ? {r.what === "smoke" ? "Smoke seen" : "Birds circling"}
            </div>
          </Html>
        </group>
      ))}
    </group>
  );
}
