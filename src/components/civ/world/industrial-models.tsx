"use client";

// Industrial & Modern era buildings, in the same low-poly style as
// building-models.tsx. Each fits inside one hex (about ±0.5 around the
// centre), facing +z. Chimney smoke is drawn separately (see world-canvas).

import { useRef, type JSX } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { Part } from "./part";

interface ModelProps {
  opacity: number;
}

const BRICK = "#9a4a32";
const BRICK_DARK = "#7a3826";
const CONCRETE = "#bdb8ae";
const CONCRETE_DARK = "#8f8a80";
const STEEL = "#6d737a";
const GLASS = "#5b7fa6";
const WHITE = "#f2f0ea";

// A sawtooth-roofed brick factory with two tall chimneys.
export function FactoryModel({ opacity }: ModelProps) {
  return (
    <group>
      <Part color={BRICK} opacity={opacity} position={[0, 0.16, 0.02]}>
        <boxGeometry args={[0.72, 0.32, 0.5]} />
      </Part>
      {/* The sawtooth roof: three sloping glass-and-tile teeth. */}
      {[-0.24, 0, 0.24].map((x) => (
        <group key={x} position={[x, 0.32, 0.02]}>
          <Part color={STEEL} opacity={opacity} position={[0, 0.07, 0]} rotation={[0, 0, 0.6]}>
            <boxGeometry args={[0.27, 0.02, 0.5]} />
          </Part>
          <Part color={GLASS} opacity={opacity} position={[0.09, 0.07, 0]}>
            <boxGeometry args={[0.02, 0.14, 0.48]} />
          </Part>
        </group>
      ))}
      {[-0.18, 0.04, 0.26].map((x) => (
        <Part key={x} color="#ffd36b" opacity={opacity} position={[x, 0.14, 0.271]} emissive="#ffb000" emissiveIntensity={0.3}>
          <boxGeometry args={[0.1, 0.09, 0.01]} />
        </Part>
      ))}
      {[-0.3, -0.12].map((x) => (
        <Part key={x} color={BRICK_DARK} opacity={opacity} position={[x, 0.45, -0.17]}>
          <cylinderGeometry args={[0.035, 0.05, 0.9, 8]} />
        </Part>
      ))}
    </group>
  );
}

// A station: a long platform under a canopy, rails, and a little steam engine.
export function StationModel({ opacity }: ModelProps) {
  return (
    <group>
      {/* Rails across the tile. */}
      {[-0.08, 0.08].map((z) => (
        <Part key={z} color={STEEL} opacity={opacity} position={[0, 0.02, z + 0.12]}>
          <boxGeometry args={[0.95, 0.02, 0.02]} />
        </Part>
      ))}
      {[-0.4, -0.2, 0, 0.2, 0.4].map((x) => (
        <Part key={x} color="#5e3b1c" opacity={opacity} position={[x, 0.012, 0.12]}>
          <boxGeometry args={[0.04, 0.015, 0.24]} />
        </Part>
      ))}
      {/* The platform and its canopy. */}
      <Part color={CONCRETE} opacity={opacity} position={[0, 0.04, -0.14]}>
        <boxGeometry args={[0.8, 0.08, 0.2]} />
      </Part>
      {[-0.32, 0, 0.32].map((x) => (
        <Part key={x} color={STEEL} opacity={opacity} position={[x, 0.18, -0.14]}>
          <cylinderGeometry args={[0.012, 0.012, 0.22, 5]} />
        </Part>
      ))}
      <Part color="#7a2e1f" opacity={opacity} position={[0, 0.3, -0.12]} rotation={[0.25, 0, 0]}>
        <boxGeometry args={[0.86, 0.025, 0.28]} />
      </Part>
      {/* The engine: boiler, cab and chimney. */}
      <group position={[0.18, 0.04, 0.12]}>
        <Part color="#2b2119" opacity={opacity} position={[0, 0.07, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.055, 0.055, 0.26, 10]} />
        </Part>
        <Part color="#2b2119" opacity={opacity} position={[-0.16, 0.1, 0]}>
          <boxGeometry args={[0.1, 0.13, 0.12]} />
        </Part>
        <Part color="#b3261e" opacity={opacity} position={[0.06, 0.15, 0]}>
          <cylinderGeometry args={[0.02, 0.025, 0.08, 6]} />
        </Part>
      </group>
    </group>
  );
}

// A coal power plant: a cooling tower, a turbine hall and a tall striped stack.
export function CoalPlantModel({ opacity }: ModelProps) {
  return (
    <group>
      {/* The cooling tower: wide at the foot, waisted, flaring at the top. */}
      <group position={[-0.2, 0, -0.05]}>
        <Part color={CONCRETE} opacity={opacity} position={[0, 0.14, 0]}>
          <cylinderGeometry args={[0.17, 0.24, 0.28, 14]} />
        </Part>
        <Part color={CONCRETE} opacity={opacity} position={[0, 0.38, 0]}>
          <cylinderGeometry args={[0.2, 0.17, 0.2, 14]} />
        </Part>
      </group>
      <Part color={CONCRETE_DARK} opacity={opacity} position={[0.2, 0.12, 0.12]}>
        <boxGeometry args={[0.34, 0.24, 0.28]} />
      </Part>
      <Part color={STEEL} opacity={opacity} position={[0.2, 0.25, 0.12]}>
        <boxGeometry args={[0.36, 0.03, 0.3]} />
      </Part>
      {/* The stack, red and white. */}
      {[0, 1, 2, 3].map((i) => (
        <Part key={i} color={i % 2 ? WHITE : "#b3261e"} opacity={opacity} position={[0.3, 0.12 + i * 0.22, -0.22]}>
          <cylinderGeometry args={[0.04 - i * 0.003, 0.045 - i * 0.003, 0.22, 8]} />
        </Part>
      ))}
    </group>
  );
}

// A tall block of flats with rows of lit windows.
export function ApartmentsModel({ opacity }: ModelProps) {
  return (
    <group>
      <Part color="#c9b79c" opacity={opacity} position={[0, 0.55, 0]}>
        <boxGeometry args={[0.5, 1.1, 0.42]} />
      </Part>
      <Part color={CONCRETE_DARK} opacity={opacity} position={[0, 1.12, 0]}>
        <boxGeometry args={[0.54, 0.04, 0.46]} />
      </Part>
      {[0.2, 0.4, 0.6, 0.8, 1.0].flatMap((y) =>
        [-0.15, 0, 0.15].map((x) => (
          <Part key={`${x}${y}`} color="#ffd36b" opacity={opacity} position={[x, y, 0.211]} emissive="#ffb000" emissiveIntensity={0.25}>
            <boxGeometry args={[0.07, 0.08, 0.01]} />
          </Part>
        )),
      )}
      <Part color="#4a3526" opacity={opacity} position={[0, 0.06, 0.212]}>
        <boxGeometry args={[0.12, 0.12, 0.01]} />
      </Part>
    </group>
  );
}

// A concrete dam across the river, water spilling down its face.
export function DamModel({ opacity }: ModelProps) {
  return (
    <group>
      <Part color={CONCRETE} opacity={opacity} position={[0, 0.2, 0]} rotation={[0, 0, 0]}>
        <boxGeometry args={[0.9, 0.4, 0.16]} />
      </Part>
      <Part color={CONCRETE_DARK} opacity={opacity} position={[0, 0.41, 0]}>
        <boxGeometry args={[0.92, 0.03, 0.2]} />
      </Part>
      {/* The lake behind it, and the spillway in front. */}
      <Part color="#4a90e2" opacity={opacity} position={[0, 0.3, -0.25]}>
        <boxGeometry args={[0.9, 0.02, 0.34]} />
      </Part>
      <Part color="#7cc4ee" opacity={opacity} position={[0, 0.2, 0.085]} emissive="#4a90e2" emissiveIntensity={0.2}>
        <boxGeometry args={[0.18, 0.38, 0.01]} />
      </Part>
      {/* The turbine house at its foot. */}
      <Part color={CONCRETE_DARK} opacity={opacity} position={[0.3, 0.07, 0.17]}>
        <boxGeometry args={[0.22, 0.14, 0.16]} />
      </Part>
    </group>
  );
}

// Three wind turbines, their blades turning.
export function WindFarmModel({ opacity }: ModelProps) {
  const rotors = useRef<(Group | null)[]>([]);
  useFrame((_, dt) => {
    rotors.current.forEach((r, i) => {
      if (r) r.rotation.z -= dt * (1.2 + i * 0.15);
    });
  });
  const spots: [number, number, number][] = [
    [-0.28, 0, -0.18],
    [0.25, 0, -0.1],
    [0, 0, 0.26],
  ];
  return (
    <group>
      {spots.map(([x, , z], i) => (
        <group key={i} position={[x, 0, z]}>
          <Part color={WHITE} opacity={opacity} position={[0, 0.35, 0]}>
            <cylinderGeometry args={[0.012, 0.022, 0.7, 6]} />
          </Part>
          <Part color={WHITE} opacity={opacity} position={[0, 0.7, 0.02]}>
            <boxGeometry args={[0.04, 0.04, 0.08]} />
          </Part>
          <group position={[0, 0.7, 0.07]} ref={(el) => void (rotors.current[i] = el)}>
            {[0, 1, 2].map((b) => (
              <group key={b} rotation={[0, 0, (b * Math.PI * 2) / 3]}>
                <Part color={WHITE} opacity={opacity} position={[0, 0.13, 0]}>
                  <boxGeometry args={[0.025, 0.26, 0.008]} />
                </Part>
              </group>
            ))}
          </group>
        </group>
      ))}
    </group>
  );
}

// Rows of tilted solar panels.
export function SolarFarmModel({ opacity }: ModelProps) {
  return (
    <group>
      {[-0.26, 0, 0.26].flatMap((z) =>
        [-0.22, 0.1].map((x) => (
          <group key={`${x}${z}`} position={[x, 0.1, z]}>
            <Part color="#1e3a6b" opacity={opacity} rotation={[-0.5, 0, 0]} metalness={0.4} roughness={0.3}>
              <boxGeometry args={[0.28, 0.015, 0.18]} />
            </Part>
            <Part color={STEEL} opacity={opacity} position={[0, -0.05, 0.02]}>
              <boxGeometry args={[0.02, 0.1, 0.02]} />
            </Part>
          </group>
        )),
      )}
    </group>
  );
}

// A white hospital with a red cross on the front.
export function HospitalModel({ opacity }: ModelProps) {
  return (
    <group>
      <Part color={WHITE} opacity={opacity} position={[0, 0.22, -0.04]}>
        <boxGeometry args={[0.7, 0.44, 0.4]} />
      </Part>
      <Part color={WHITE} opacity={opacity} position={[0, 0.3, 0.16]}>
        <boxGeometry args={[0.24, 0.6, 0.12]} />
      </Part>
      <Part color="#d7263d" opacity={opacity} position={[0, 0.46, 0.221]}>
        <boxGeometry args={[0.14, 0.04, 0.01]} />
      </Part>
      <Part color="#d7263d" opacity={opacity} position={[0, 0.46, 0.221]}>
        <boxGeometry args={[0.04, 0.14, 0.01]} />
      </Part>
      {[-0.25, -0.15, 0.15, 0.25].flatMap((x) =>
        [0.12, 0.3].map((y) => (
          <Part key={`${x}${y}`} color={GLASS} opacity={opacity} position={[x, y, 0.161]}>
            <boxGeometry args={[0.06, 0.08, 0.01]} />
          </Part>
        )),
      )}
      <Part color={GLASS} opacity={opacity} position={[0, 0.09, 0.221]}>
        <boxGeometry args={[0.12, 0.16, 0.01]} />
      </Part>
    </group>
  );
}

// A park: trees, a path, a pond and a bench.
export function ParkModel({ opacity }: ModelProps) {
  const trees: [number, number, number][] = [
    [-0.28, -0.22, 1],
    [0.3, -0.18, 0.85],
    [-0.12, 0.28, 0.9],
    [0.26, 0.26, 0.75],
  ];
  return (
    <group>
      <Part color="#d9c89a" opacity={opacity} position={[0, 0.01, 0]} rotation={[0, 0.5, 0]}>
        <boxGeometry args={[0.95, 0.012, 0.1]} />
      </Part>
      <Part color="#4a90e2" opacity={opacity} position={[0.06, 0.012, -0.02]} scale={[1, 1, 0.7]}>
        <cylinderGeometry args={[0.13, 0.13, 0.01, 12]} />
      </Part>
      {trees.map(([x, z, s]) => (
        <group key={`${x}${z}`} position={[x, 0, z]} scale={s}>
          <Part color="#6b4a2b" opacity={opacity} position={[0, 0.1, 0]}>
            <cylinderGeometry args={[0.02, 0.03, 0.2, 6]} />
          </Part>
          <Part color="#3f8f3a" opacity={opacity} position={[0, 0.27, 0]}>
            <sphereGeometry args={[0.13, 8, 6]} />
          </Part>
        </group>
      ))}
      <Part color="#8b5a2b" opacity={opacity} position={[-0.3, 0.05, 0.06]}>
        <boxGeometry args={[0.16, 0.02, 0.05]} />
      </Part>
    </group>
  );
}

// A concrete sea wall along the shore, stepped on the sea side.
export function SeaWallModel({ opacity }: ModelProps) {
  return (
    <group>
      <Part color={CONCRETE} opacity={opacity} position={[0, 0.14, 0.12]}>
        <boxGeometry args={[0.95, 0.28, 0.14]} />
      </Part>
      <Part color={CONCRETE_DARK} opacity={opacity} position={[0, 0.06, 0.24]}>
        <boxGeometry args={[0.95, 0.12, 0.12]} />
      </Part>
      <Part color={CONCRETE_DARK} opacity={opacity} position={[0, 0.29, 0.12]}>
        <boxGeometry args={[0.97, 0.03, 0.16]} />
      </Part>
      {[-0.35, 0, 0.35].map((x) => (
        <Part key={x} color="#c9a46a" opacity={opacity} position={[x, 0.05, -0.12]}>
          <boxGeometry args={[0.12, 0.08, 0.12]} />
        </Part>
      ))}
    </group>
  );
}

export const INDUSTRIAL_MODELS: Record<string, (props: ModelProps) => JSX.Element> = {
  factory: FactoryModel,
  station: StationModel,
  coalplant: CoalPlantModel,
  apartments: ApartmentsModel,
  hydrodam: DamModel,
  windfarm: WindFarmModel,
  solarfarm: SolarFarmModel,
  hospital: HospitalModel,
  park: ParkModel,
  seawall: SeaWallModel,
};
