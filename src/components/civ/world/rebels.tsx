"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "./html";
import type { GameState } from "@/game/types";
import { PixelIcon } from "@/components/civ/pixel-icon";
import { Figures, HAIRS, SKINS, type Agent } from "./figures";
import { tileTop } from "./hex-terrain";

// Rebels with clubs milling round the building they have taken over, under a
// "Rebels" label, while a rebellion is on (state.rebellion, stage "risen").
const SHOWN = 8;

export function Rebels({ state }: { state: GameState }) {
  const r = state.rebellion;
  const tile = r?.stage === "risen" ? state.tiles[r.tile] : null;
  const agents = useRef<Agent[]>([]);
  const count = Math.min(SHOWN, r?.rebels ?? 0);
  useFrame(({ clock }) => {
    if (!tile) {
      agents.current = [];
      return;
    }
    const t = clock.elapsedTime;
    const y = tileTop(tile);
    agents.current = Array.from({ length: count }, (_, i) => {
      // A slow, restless circle round the building, each at their own pace.
      const ang = (i / count) * Math.PI * 2 + Math.sin(t * 0.3 + i) * 0.4;
      const d = 0.75 + (i % 2) * 0.15;
      return {
        x: tile.x + Math.cos(ang) * d,
        z: tile.z + Math.sin(ang) * d,
        y,
        // Facing outwards, at the town.
        heading: Math.atan2(Math.cos(ang), Math.sin(ang)),
        moving: Math.sin(t * 0.8 + i * 2) > 0.3,
        scale: 1.4,
        tunic: i % 2 ? "#6b4a2b" : "#5a5a52",
        skin: SKINS[i % SKINS.length],
        hair: HAIRS[i % HAIRS.length],
        phase: i * 1.3,
      };
    });
  });
  if (!tile) return null;
  return (
    <>
      <Figures agents={agents} max={SHOWN} weapon="club" />
      <group position={[tile.x, tileTop(tile), tile.z]}>
        <Html zIndexRange={[13, 0]} center position={[0, 1.6, 0]} style={{ pointerEvents: "none" }}>
          <div className="pixel-panel font-pixel flex items-center gap-1 whitespace-nowrap px-2 py-0.5 text-xs" data-testid="rebels-label">
            <PixelIcon name="sword" size={16} />
            Rebels ({r!.rebels})
          </div>
        </Html>
      </group>
    </>
  );
}
