"use client";

import { useMemo, useState } from "react";
import { Html } from "./html";
import { isLand } from "@/game/map";
import type { Tile } from "@/game/types";
import { SEA_LEVEL } from "./water";

// Open sea as near home as it can be while well clear of all land (the sea is
// tiles too, under the water, so only land counts).
function isletSpot(tiles: Tile[], home: Tile) {
  const land = tiles.filter((t) => isLand(t.terrain) || t.terrain === "river");
  for (let r = 10; r <= 30; r += 2) {
    for (let a = 0; a < 32; a++) {
      const x = home.x + Math.cos((a / 32) * Math.PI * 2 + 0.4) * r;
      const z = home.z + Math.sin((a / 32) * Math.PI * 2 + 0.4) * r;
      if (land.every((t) => Math.hypot(t.x - x, t.z - z) >= 3)) return { x, z };
    }
  }
  return null;
}

// An easter egg: a tiny island far out at sea, with one palm tree and a chest.
// It isn't part of the map: click it once you have a canoe to find what's
// there; before that it's too far to paddle.
export function Islet({ tiles, home, canReach, found, onFind }: { tiles: Tile[]; home: Tile; canReach: boolean; found: boolean; onFind: () => void }) {
  const spot = useMemo(() => isletSpot(tiles, home), [tiles, home]);
  const [note, setNote] = useState<string | null>(null);
  if (!spot) return null;
  return (
    <group
      position={[spot.x, SEA_LEVEL, spot.z]}
      onClick={(e) => {
        e.stopPropagation();
        if (canReach && !found) onFind();
        setNote(found ? "Nothing more to find here." : canReach ? null : "Too far to swim. A canoe could reach it.");
        setTimeout(() => setNote(null), 3500);
      }}
    >
      <mesh receiveShadow castShadow>
        <cylinderGeometry args={[0.9, 1.15, 0.22, 10]} />
        <meshStandardMaterial color="#ead79c" flatShading />
      </mesh>
      {/* The palm: a leaning trunk and a crown of leaves. */}
      <group position={[0.2, 0.1, -0.1]} rotation={[0, 0, -0.25]}>
        <mesh castShadow position={[0, 0.6, 0]}>
          <cylinderGeometry args={[0.05, 0.08, 1.2, 6]} />
          <meshStandardMaterial color="#8b5a2b" />
        </mesh>
        {[0, 1, 2, 3, 4].map((i) => (
          <mesh key={i} castShadow position={[Math.cos(i * 1.26) * 0.3, 1.2, Math.sin(i * 1.26) * 0.3]} rotation={[Math.sin(i * 1.26) * 0.6, 0, -Math.cos(i * 1.26) * 0.6]}>
            <boxGeometry args={[0.55, 0.03, 0.16]} />
            <meshStandardMaterial color="#3fa34d" />
          </mesh>
        ))}
      </group>
      {/* The chest (open once found). */}
      <group position={[-0.35, 0.18, 0.25]} rotation={[0, 0.5, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.3, 0.16, 0.2]} />
          <meshStandardMaterial color="#6b4423" />
        </mesh>
        <mesh position={[0, found ? 0.16 : 0.1, found ? -0.1 : 0]} rotation={[found ? -1.1 : 0, 0, 0]}>
          <boxGeometry args={[0.31, 0.05, 0.21]} />
          <meshStandardMaterial color="#8b5a2b" />
        </mesh>
        {found && (
          <mesh position={[0, 0.09, 0]}>
            <boxGeometry args={[0.24, 0.03, 0.14]} />
            <meshStandardMaterial color="#ffd23f" emissive="#ffb000" emissiveIntensity={0.8} />
          </mesh>
        )}
      </group>
      {note && (
        <Html zIndexRange={[13, 0]} center position={[0, 2, 0]} style={{ pointerEvents: "none" }}>
          <div className="pixel-panel font-pixel whitespace-nowrap px-2 py-0.5 text-xs" data-testid="islet-note">
            {note}
          </div>
        </Html>
      )}
    </group>
  );
}
