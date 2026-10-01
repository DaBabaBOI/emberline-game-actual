"use client";

// Medieval era buildings and the three landmarks, in the same low-poly style as
// building-models.tsx. Each fits inside one hex (about ±0.5 around the centre),
// facing +z.

import { useEffect, useRef, type JSX } from "react";
import { useFrame } from "@react-three/fiber";
import { Plane, Vector3, type Group, type Material, type Mesh } from "three";
import { Part } from "./part";

interface ModelProps {
  opacity: number;
}

const STONE = "#b9b2a6";
const STONE_DARK = "#8f887d";
const SLATE = "#5b6370";
const TIMBER = "#5e3b1c";
const PLASTER = "#efe3c8";
const WOOD = "#8b5a2b";
const RED = "#9b1c1c";

// A row of battlements along the top of a wall running along x.
function Battlements({ opacity, length, y, z = 0, count }: ModelProps & { length: number; y: number; z?: number; count: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <Part key={i} color={STONE} opacity={opacity} position={[-length / 2 + (i + 0.5) * (length / count), y, z]}>
          <boxGeometry args={[(length / count) * 0.55, 0.05, 0.07]} />
        </Part>
      ))}
    </>
  );
}

// A triangular roof: a three-sided cylinder lying on its side, ridge on top.
// `y` is where it sits (the top of the walls). It runs along x (`width` long,
// `depth` across), or along z with `alongZ`. The cylinder's triangle has a
// corner at +z and its flat side 0.125 below the middle, 0.433 wide.
function Roof({ opacity, color, width, depth, y, z = 0, x = 0, height = 0.18, alongZ = false }: ModelProps & { color: string; width: number; depth: number; y: number; z?: number; x?: number; height?: number; alongZ?: boolean }) {
  const tall = height / 0.375;
  return (
    <group position={[x, y + 0.125 * tall, z]} rotation={[0, alongZ ? 0 : Math.PI / 2, 0]}>
      <Part color={color} opacity={opacity} rotation={[-Math.PI / 2, 0, 0]} scale={[depth / 0.433, 1, tall]}>
        <cylinderGeometry args={[0.25, 0.25, width, 3]} />
      </Part>
    </group>
  );
}

// A stone keep inside a square curtain wall with round corner towers.
export function CastleModel({ opacity }: ModelProps) {
  const half = 0.36;
  return (
    <group>
      {/* Curtain wall: four sides, a gate gap in the front. */}
      {[
        { p: [0, 0.13, -half] as [number, number, number], r: 0 },
        { p: [-half, 0.13, 0] as [number, number, number], r: Math.PI / 2 },
        { p: [half, 0.13, 0] as [number, number, number], r: Math.PI / 2 },
      ].map((w, i) => (
        <group key={i} position={w.p} rotation={[0, w.r, 0]}>
          <Part color={STONE} opacity={opacity}>
            <boxGeometry args={[half * 2, 0.26, 0.07]} />
          </Part>
          <Battlements opacity={opacity} length={half * 2} y={0.155} count={5} />
        </group>
      ))}
      {[-1, 1].map((side) => (
        <Part key={side} color={STONE} opacity={opacity} position={[side * half * 0.62, 0.13, half]}>
          <boxGeometry args={[half * 0.75, 0.26, 0.07]} />
        </Part>
      ))}
      {/* The gate. */}
      <Part color={TIMBER} opacity={opacity} position={[0, 0.08, half + 0.01]}>
        <boxGeometry args={[0.13, 0.16, 0.04]} />
      </Part>
      {/* Corner towers with pointed slate roofs. */}
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <group key={`${sx}${sz}`} position={[sx * half, 0, sz * half]}>
            <Part color={STONE_DARK} opacity={opacity} position={[0, 0.2, 0]}>
              <cylinderGeometry args={[0.075, 0.085, 0.4, 8]} />
            </Part>
            <Part color={SLATE} opacity={opacity} position={[0, 0.47, 0]}>
              <coneGeometry args={[0.095, 0.16, 8]} />
            </Part>
          </group>
        )),
      )}
      {/* The keep, with a banner. */}
      <Part color={STONE_DARK} opacity={opacity} position={[0, 0.27, -0.05]}>
        <boxGeometry args={[0.3, 0.54, 0.3]} />
      </Part>
      <Battlements opacity={opacity} length={0.3} y={0.565} z={0.12} count={4} />
      <Battlements opacity={opacity} length={0.3} y={0.565} z={-0.22} count={4} />
      <Part color={TIMBER} opacity={opacity} position={[0, 0.7, -0.05]}>
        <cylinderGeometry args={[0.008, 0.008, 0.26, 4]} />
      </Part>
      <Part color={RED} opacity={opacity} position={[0.06, 0.78, -0.05]}>
        <boxGeometry args={[0.11, 0.07, 0.01]} />
      </Part>
      {[-0.07, 0.07].map((x) => (
        <Part key={x} color="#2b2119" opacity={opacity} position={[x, 0.36, 0.101]}>
          <boxGeometry args={[0.03, 0.07, 0.01]} />
        </Part>
      ))}
    </group>
  );
}

// A white tower windmill with four turning sails.
export function WindmillModel({ opacity }: ModelProps) {
  const sails = useRef<Group>(null);
  useFrame((_, dt) => {
    if (sails.current) sails.current.rotation.z -= dt * 0.9;
  });
  return (
    <group>
      <Part color={PLASTER} opacity={opacity} position={[0, 0.28, 0]}>
        <cylinderGeometry args={[0.13, 0.19, 0.56, 10]} />
      </Part>
      <Part color={WOOD} opacity={opacity} position={[0, 0.63, 0]}>
        <coneGeometry args={[0.16, 0.18, 10]} />
      </Part>
      <Part color={TIMBER} opacity={opacity} position={[0, 0.08, 0.18]}>
        <boxGeometry args={[0.08, 0.14, 0.02]} />
      </Part>
      <Part color="#2b2119" opacity={opacity} position={[0, 0.36, 0.155]}>
        <boxGeometry args={[0.05, 0.06, 0.01]} />
      </Part>
      <group position={[0, 0.52, 0.2]} ref={sails}>
        <Part color={TIMBER} opacity={opacity} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.025, 0.025, 0.06, 6]} />
        </Part>
        {[0, 1, 2, 3].map((i) => (
          <group key={i} rotation={[0, 0, (i * Math.PI) / 2]}>
            {/* The arm, and the cloth sail on its lattice. */}
            <Part color={TIMBER} opacity={opacity} position={[0, 0.2, 0]}>
              <boxGeometry args={[0.02, 0.4, 0.02]} />
            </Part>
            <Part color="#f4ecd8" opacity={opacity} position={[0.045, 0.23, 0]}>
              <boxGeometry args={[0.07, 0.3, 0.008]} />
            </Part>
          </group>
        ))}
      </group>
    </group>
  );
}

// A half-timbered hall with a steep roof and a hanging sign.
export function GuildHallModel({ opacity }: ModelProps) {
  return (
    <group>
      <Part color={PLASTER} opacity={opacity} position={[0, 0.2, 0]}>
        <boxGeometry args={[0.62, 0.4, 0.42]} />
      </Part>
      {/* Dark beams across the front and back. */}
      {[0.211, -0.211].flatMap((z) => [
        ...[-0.3, -0.1, 0.1, 0.3].map((x) => (
          <Part key={`v${x}${z}`} color={TIMBER} opacity={opacity} position={[x, 0.2, z]}>
            <boxGeometry args={[0.025, 0.4, 0.01]} />
          </Part>
        )),
        ...[0.02, 0.2, 0.39].map((y) => (
          <Part key={`h${y}${z}`} color={TIMBER} opacity={opacity} position={[0, y, z]}>
            <boxGeometry args={[0.62, 0.025, 0.01]} />
          </Part>
        )),
      ])}
      <Roof opacity={opacity} color="#7a2e1f" width={0.68} depth={0.5} y={0.4} height={0.22} />
      <Part color={TIMBER} opacity={opacity} position={[0, 0.08, 0.213]}>
        <boxGeometry args={[0.1, 0.16, 0.01]} />
      </Part>
      {/* The guild sign on a bracket. */}
      <Part color={TIMBER} opacity={opacity} position={[0.33, 0.33, 0.12]}>
        <boxGeometry args={[0.08, 0.015, 0.015]} />
      </Part>
      <Part color="#d4a72c" opacity={opacity} position={[0.36, 0.27, 0.12]}>
        <boxGeometry args={[0.012, 0.09, 0.09]} />
      </Part>
    </group>
  );
}

// A long stone hall of learning with tall windows and a bell tower.
export function UniversityModel({ opacity }: ModelProps) {
  return (
    <group>
      <Part color={STONE} opacity={opacity} position={[-0.08, 0.17, 0]}>
        <boxGeometry args={[0.66, 0.34, 0.36]} />
      </Part>
      <Roof opacity={opacity} color={SLATE} width={0.7} depth={0.44} y={0.34} x={-0.08} />
      {[-0.32, -0.16, 0, 0.16].map((x) => (
        <Part key={x} color="#3d4a63" opacity={opacity} position={[x, 0.2, 0.181]}>
          <boxGeometry args={[0.06, 0.16, 0.01]} />
        </Part>
      ))}
      {/* The tower and its spire. */}
      <Part color={STONE_DARK} opacity={opacity} position={[0.3, 0.3, 0.02]}>
        <boxGeometry args={[0.18, 0.6, 0.18]} />
      </Part>
      <Part color={SLATE} opacity={opacity} position={[0.3, 0.72, 0.02]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[0.14, 0.26, 4]} />
      </Part>
      <Part color="#d4a72c" opacity={opacity} position={[0.3, 0.46, 0.112]}>
        <cylinderGeometry args={[0.04, 0.04, 0.01, 10]} />
      </Part>
    </group>
  );
}

// A slipway with a half-built ship's hull and a timber crane.
export function ShipyardModel({ opacity }: ModelProps) {
  return (
    <group>
      <Part color="#a07a4a" opacity={opacity} position={[0, 0.02, 0]}>
        <boxGeometry args={[0.8, 0.04, 0.5]} />
      </Part>
      {/* The keel and the ribs of the hull. */}
      <Part color={TIMBER} opacity={opacity} position={[0, 0.07, 0]}>
        <boxGeometry args={[0.6, 0.04, 0.04]} />
      </Part>
      {[-0.24, -0.12, 0, 0.12, 0.24].map((x) => (
        <Part key={x} color={WOOD} opacity={opacity} position={[x, 0.14, 0]} rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[0.12 - Math.abs(x) * 0.15, 0.012, 4, 10, Math.PI]} />
        </Part>
      ))}
      {/* Planks done on one side. */}
      <Part color="#7a4e25" opacity={opacity} position={[-0.08, 0.14, 0.09]} rotation={[0.5, 0, 0]}>
        <boxGeometry args={[0.36, 0.1, 0.012]} />
      </Part>
      {/* The crane. */}
      <Part color={TIMBER} opacity={opacity} position={[0.32, 0.3, -0.18]}>
        <boxGeometry args={[0.04, 0.6, 0.04]} />
      </Part>
      <Part color={TIMBER} opacity={opacity} position={[0.2, 0.58, -0.18]}>
        <boxGeometry args={[0.28, 0.03, 0.03]} />
      </Part>
      <Part color="#c9b48a" opacity={opacity} position={[0.08, 0.45, -0.18]}>
        <cylinderGeometry args={[0.004, 0.004, 0.24, 3]} />
      </Part>
      <Part color={WOOD} opacity={opacity} position={[0.08, 0.32, -0.18]}>
        <boxGeometry args={[0.06, 0.04, 0.04]} />
      </Part>
    </group>
  );
}

// A wooden store with a jetty, crates and barrels: trade from a far island.
export function TradingPostModel({ opacity }: ModelProps) {
  return (
    <group>
      <Part color={WOOD} opacity={opacity} position={[-0.12, 0.15, -0.08]}>
        <boxGeometry args={[0.4, 0.3, 0.32]} />
      </Part>
      <Roof opacity={opacity} color="#6b4a2b" width={0.46} depth={0.4} y={0.3} x={-0.12} z={-0.08} height={0.14} />
      <Part color={TIMBER} opacity={opacity} position={[-0.12, 0.09, 0.081]}>
        <boxGeometry args={[0.1, 0.18, 0.01]} />
      </Part>
      {/* The jetty out to the water. */}
      <Part color="#a07a4a" opacity={opacity} position={[0.25, 0.04, 0.15]}>
        <boxGeometry args={[0.4, 0.03, 0.14]} />
      </Part>
      {[0.1, 0.25, 0.4].map((x) => (
        <Part key={x} color={TIMBER} opacity={opacity} position={[x, 0.02, 0.23]}>
          <cylinderGeometry args={[0.015, 0.015, 0.1, 5]} />
        </Part>
      ))}
      {/* Goods waiting to be shipped. */}
      <Part color="#b8874a" opacity={opacity} position={[0.14, 0.09, -0.12]}>
        <boxGeometry args={[0.1, 0.1, 0.1]} />
      </Part>
      <Part color="#a77a40" opacity={opacity} position={[0.24, 0.07, -0.05]}>
        <boxGeometry args={[0.08, 0.08, 0.08]} />
      </Part>
      <Part color="#6b4a2b" opacity={opacity} position={[0.3, 0.07, -0.18]}>
        <cylinderGeometry args={[0.04, 0.04, 0.1, 8]} />
      </Part>
    </group>
  );
}

// The Great Library: a stone hall under a green copper dome, columns in front.
export function LibraryModel({ opacity }: ModelProps) {
  return (
    <group>
      <Part color={STONE} opacity={opacity} position={[0, 0.03, 0]}>
        <boxGeometry args={[0.86, 0.06, 0.66]} />
      </Part>
      <Part color="#e6dfd2" opacity={opacity} position={[0, 0.24, -0.06]}>
        <boxGeometry args={[0.7, 0.36, 0.44]} />
      </Part>
      {[-0.27, -0.09, 0.09, 0.27].map((x) => (
        <Part key={x} color="#f2ece0" opacity={opacity} position={[x, 0.24, 0.21]}>
          <cylinderGeometry args={[0.03, 0.035, 0.36, 8]} />
        </Part>
      ))}
      <Part color="#d9d1c2" opacity={opacity} position={[0, 0.44, 0.02]}>
        <boxGeometry args={[0.76, 0.05, 0.58]} />
      </Part>
      {/* The drum and the dome. */}
      <Part color="#e6dfd2" opacity={opacity} position={[0, 0.52, -0.06]}>
        <cylinderGeometry args={[0.2, 0.2, 0.12, 14]} />
      </Part>
      <Part color="#4f9a83" opacity={opacity} position={[0, 0.58, -0.06]}>
        <sphereGeometry args={[0.2, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </Part>
      <Part color="#d4a72c" opacity={opacity} position={[0, 0.82, -0.06]}>
        <sphereGeometry args={[0.03, 8, 6]} />
      </Part>
      {/* Steps. */}
      <Part color={STONE} opacity={opacity} position={[0, 0.07, 0.3]}>
        <boxGeometry args={[0.4, 0.03, 0.08]} />
      </Part>
    </group>
  );
}

// The Cathedral: a long nave, two towers with spires, a round window.
export function CathedralModel({ opacity }: ModelProps) {
  return (
    <group rotation={[0, 0, 0]}>
      {/* The nave, running front to back, and the transept across it. */}
      <Part color={STONE} opacity={opacity} position={[0, 0.22, -0.06]}>
        <boxGeometry args={[0.32, 0.44, 0.7]} />
      </Part>
      <Roof opacity={opacity} color={SLATE} width={0.7} depth={0.36} y={0.44} z={-0.06} height={0.2} alongZ />
      <Roof opacity={opacity} color={SLATE} width={0.76} depth={0.24} y={0.36} z={-0.14} height={0.14} />
      <Part color={STONE} opacity={opacity} position={[0, 0.18, -0.14]}>
        <boxGeometry args={[0.72, 0.36, 0.2]} />
      </Part>
      {/* The west front: two towers with spires. */}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 0.13, 0, 0.27]}>
          <Part color={STONE_DARK} opacity={opacity} position={[0, 0.34, 0]}>
            <boxGeometry args={[0.12, 0.68, 0.12]} />
          </Part>
          <Part color={SLATE} opacity={opacity} position={[0, 0.82, 0]} rotation={[0, Math.PI / 4, 0]}>
            <coneGeometry args={[0.09, 0.3, 4]} />
          </Part>
        </group>
      ))}
      {/* The rose window and the door. */}
      <Part color="#4a6fb5" opacity={opacity} position={[0, 0.36, 0.291]} rotation={[Math.PI / 2, 0, 0]} emissive="#4a6fb5" emissiveIntensity={0.25}>
        <cylinderGeometry args={[0.06, 0.06, 0.01, 12]} />
      </Part>
      <Part color={TIMBER} opacity={opacity} position={[0, 0.1, 0.29]}>
        <boxGeometry args={[0.1, 0.2, 0.01]} />
      </Part>
      {/* Pointed windows along the side. */}
      {[-0.25, -0.05, 0.12].map((z) => (
        <Part key={z} color="#4a6fb5" opacity={opacity} position={[0.161, 0.26, z]}>
          <boxGeometry args={[0.01, 0.16, 0.05]} />
        </Part>
      ))}
    </group>
  );
}

// The Grand Harbour: a stone pier, a warehouse and a lighthouse.
export function HarbourModel({ opacity }: ModelProps) {
  return (
    <group>
      <Part color={STONE} opacity={opacity} position={[0.1, 0.04, 0.12]}>
        <boxGeometry args={[0.7, 0.08, 0.16]} />
      </Part>
      <Part color={STONE} opacity={opacity} position={[0.38, 0.04, -0.06]}>
        <boxGeometry args={[0.14, 0.08, 0.5]} />
      </Part>
      {/* The warehouse. */}
      <Part color="#d8c7a3" opacity={opacity} position={[-0.18, 0.15, -0.14]}>
        <boxGeometry args={[0.4, 0.3, 0.3]} />
      </Part>
      <Roof opacity={opacity} color="#b5553a" width={0.46} depth={0.38} y={0.3} x={-0.18} z={-0.14} height={0.14} />
      {/* The lighthouse at the end of the pier. */}
      <Part color="#f4efe6" opacity={opacity} position={[0.38, 0.32, -0.26]}>
        <cylinderGeometry args={[0.06, 0.08, 0.5, 10]} />
      </Part>
      <Part color={RED} opacity={opacity} position={[0.38, 0.3, -0.26]}>
        <cylinderGeometry args={[0.081, 0.081, 0.06, 10]} />
      </Part>
      <Part color="#ffd23f" opacity={opacity} position={[0.38, 0.6, -0.26]} emissive="#ffb000" emissiveIntensity={0.9}>
        <cylinderGeometry args={[0.05, 0.05, 0.07, 10]} />
      </Part>
      <Part color={SLATE} opacity={opacity} position={[0.38, 0.68, -0.26]}>
        <coneGeometry args={[0.07, 0.1, 10]} />
      </Part>
      {/* A little cog moored at the pier. */}
      <group position={[0.05, 0.03, 0.3]}>
        <Part color="#6b4a2b" opacity={opacity} position={[0, 0.06, 0]} scale={[1, 0.7, 0.45]}>
          <sphereGeometry args={[0.19, 10, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
        </Part>
        <Part color={TIMBER} opacity={opacity} position={[0, 0.22, 0]}>
          <cylinderGeometry args={[0.01, 0.01, 0.36, 4]} />
        </Part>
        <Part color="#f4ecd8" opacity={opacity} position={[0, 0.26, 0.012]}>
          <boxGeometry args={[0.2, 0.16, 0.01]} />
        </Part>
      </group>
    </group>
  );
}

// A landmark still being built: inside a cage of scaffolding, its walls rise
// stage by stage (everything above the current height is cut away, so you see
// the half-built walls, not a squashed building). `done` is how many of its
// three stages are finished. Needs `localClippingEnabled` on the renderer (set
// where the map's canvas is created).
export function UnderConstruction({ done, children }: { done: number; children: JSX.Element }) {
  const built = useRef<Group>(null);
  const height = [0.32, 0.55, 0.78][Math.max(0, Math.min(2, done))];
  const cut = useRef<{ plane: Plane; probe: Vector3 } | null>(null);
  useEffect(() => {
    cut.current ??= { plane: new Plane(new Vector3(0, -1, 0), 0), probe: new Vector3() };
    const { plane } = cut.current;
    built.current?.traverse((o) => {
      const mesh = o as Mesh;
      if (!mesh.isMesh) return;
      const material = mesh.material as Material;
      material.clippingPlanes = [plane];
      material.clipShadows = true;
    });
  }, [done]);
  // The cut follows the building in the world (planes are in world space).
  useFrame(() => {
    if (!built.current || !cut.current) return;
    const { plane, probe } = cut.current;
    plane.constant = built.current.localToWorld(probe.set(0, height, 0)).y;
  });
  const poles: [number, number][] = [
    [-0.42, -0.36],
    [0.42, -0.36],
    [-0.42, 0.36],
    [0.42, 0.36],
    [0, 0.38],
    [0, -0.38],
  ];
  const top = height + 0.1;
  return (
    <group>
      <group ref={built}>{children}</group>
      {poles.map(([x, z]) => (
        <Part key={`${x}${z}`} color="#a0784a" opacity={1} position={[x, top / 2, z]}>
          <cylinderGeometry args={[0.012, 0.012, top, 4]} />
        </Part>
      ))}
      {/* Planks to walk on, round the top. */}
      {[-0.36, 0.36].map((z) => (
        <Part key={z} color="#c9a46a" opacity={1} position={[0, height, z]}>
          <boxGeometry args={[0.86, 0.015, 0.06]} />
        </Part>
      ))}
      {[-0.42, 0.42].map((x) => (
        <Part key={x} color="#c9a46a" opacity={1} position={[x, height, 0]}>
          <boxGeometry args={[0.06, 0.015, 0.74]} />
        </Part>
      ))}
    </group>
  );
}

export const MEDIEVAL_MODELS: Record<string, (props: ModelProps) => JSX.Element> = {
  castle: CastleModel,
  windmill: WindmillModel,
  guildhall: GuildHallModel,
  university: UniversityModel,
  shipyard: ShipyardModel,
  tradingpost: TradingPostModel,
  library: LibraryModel,
  cathedral: CathedralModel,
  harbour: HarbourModel,
};
