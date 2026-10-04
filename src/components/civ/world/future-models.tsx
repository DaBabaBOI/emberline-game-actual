"use client";

// Future & Space era buildings (and the Industrial era's nuclear plant), in
// the same low-poly style as building-models.tsx. Each fits inside one hex
// (about ±0.5 around the centre), facing +z.

import { useRef, type JSX } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group, Mesh } from "three";
import { Part } from "./part";

interface ModelProps {
  opacity: number;
}

const CONCRETE = "#cfcac0";
const CONCRETE_DARK = "#9a958b";
const STEEL = "#6d737a";
const GLASS = "#7fb3d5";
const WHITE = "#f4f2ec";
const TEAL = "#4fd8c4";
const LEAF = "#4f9d48";

// A nuclear plant: a tall cooling tower letting off steam, and the domed reactor.
export function NuclearModel({ opacity }: ModelProps) {
  return (
    <group>
      {/* The cooling tower: wide at the foot, narrow at the waist, flared at the top. */}
      <group position={[-0.16, 0, -0.06]}>
        <Part color={CONCRETE} opacity={opacity} position={[0, 0.16, 0]}>
          <cylinderGeometry args={[0.19, 0.27, 0.32, 16, 1, true]} />
        </Part>
        <Part color={CONCRETE} opacity={opacity} position={[0, 0.44, 0]}>
          <cylinderGeometry args={[0.22, 0.19, 0.24, 16, 1, true]} />
        </Part>
        {/* Steam. */}
        {[0, 1, 2].map((i) => (
          <Part key={i} color={WHITE} opacity={opacity * (0.75 - i * 0.18)} position={[0.03 * i, 0.64 + i * 0.13, 0]}>
            <sphereGeometry args={[0.15 + i * 0.03, 10, 8]} />
          </Part>
        ))}
      </group>
      {/* The reactor dome. */}
      <Part color={WHITE} opacity={opacity} position={[0.22, 0.12, 0.14]}>
        <cylinderGeometry args={[0.15, 0.15, 0.24, 14]} />
      </Part>
      <Part color={WHITE} opacity={opacity} position={[0.22, 0.24, 0.14]}>
        <sphereGeometry args={[0.15, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </Part>
      <Part color={CONCRETE_DARK} opacity={opacity} position={[0.2, 0.06, -0.22]}>
        <boxGeometry args={[0.28, 0.12, 0.16]} />
      </Part>
    </group>
  );
}

// A fusion reactor: a white hall with a glowing ring of plasma on top.
export function FusionModel({ opacity }: ModelProps) {
  const ring = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    if (ring.current) ring.current.rotation.z = clock.elapsedTime * 0.8;
  });
  return (
    <group>
      <Part color={WHITE} opacity={opacity} position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.42, 0.44, 0.2, 6]} />
      </Part>
      <Part color={GLASS} opacity={opacity} position={[0, 0.25, 0]}>
        <sphereGeometry args={[0.3, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </Part>
      {/* The plasma ring, held by magnets, glowing through the glass. */}
      <mesh ref={ring} position={[0, 0.33, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.2, 0.04, 8, 28]} />
        <meshStandardMaterial color={TEAL} emissive={TEAL} emissiveIntensity={1.6} transparent={opacity < 1} opacity={opacity} />
      </mesh>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <Part key={i} color={STEEL} opacity={opacity} position={[Math.cos((i * Math.PI) / 3) * 0.2, 0.33, Math.sin((i * Math.PI) / 3) * 0.2]}>
          <boxGeometry args={[0.06, 0.12, 0.06]} />
        </Part>
      ))}
    </group>
  );
}

// A data center: a long low hall with rows of cooling fans and blinking lights.
export function DataCenterModel({ opacity }: ModelProps) {
  const lights = useRef<(Mesh | null)[]>([]);
  useFrame(({ clock }) => {
    lights.current.forEach((m, i) => {
      if (m) m.visible = Math.sin(clock.elapsedTime * 3 + i * 1.7) > -0.2;
    });
  });
  return (
    <group>
      <Part color={CONCRETE_DARK} opacity={opacity} position={[0, 0.13, 0]}>
        <boxGeometry args={[0.78, 0.26, 0.5]} />
      </Part>
      {[-0.27, -0.09, 0.09, 0.27].map((x) =>
        [-0.12, 0.12].map((z) => (
          <Part key={`${x},${z}`} color={STEEL} opacity={opacity} position={[x, 0.28, z]}>
            <cylinderGeometry args={[0.07, 0.07, 0.04, 10]} />
          </Part>
        )),
      )}
      {[-0.3, -0.18, -0.06, 0.06, 0.18, 0.3].map((x, i) => (
        <mesh key={x} ref={(el) => void (lights.current[i] = el)} position={[x, 0.15, 0.252]}>
          <boxGeometry args={[0.05, 0.03, 0.01]} />
          <meshStandardMaterial color={i % 2 ? "#7cff8a" : "#6fd3ff"} emissive={i % 2 ? "#7cff8a" : "#6fd3ff"} emissiveIntensity={1.5} />
        </mesh>
      ))}
    </group>
  );
}

// An air capture plant: a wall of big fans that pull air through filters.
export function AirCaptureModel({ opacity }: ModelProps) {
  const fans = useRef<(Group | null)[]>([]);
  useFrame((_, dt) => {
    fans.current.forEach((f) => {
      if (f) f.rotation.z += dt * 3;
    });
  });
  return (
    <group>
      <Part color={CONCRETE} opacity={opacity} position={[0, 0.22, -0.04]}>
        <boxGeometry args={[0.76, 0.44, 0.24]} />
      </Part>
      {[-0.25, 0, 0.25].map((x, i) =>
        [0.12, 0.32].map((y, j) => (
          <group key={`${i}${j}`} position={[x, y, 0.09]}>
            <Part color="#2b2f33" opacity={opacity} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.09, 0.09, 0.02, 14]} />
            </Part>
            <group ref={(el) => void (fans.current[i * 2 + j] = el)} position={[0, 0, 0.015]}>
              {[0, 1, 2].map((b) => (
                <group key={b} rotation={[0, 0, (b * Math.PI * 2) / 3]}>
                  <Part color={WHITE} opacity={opacity} position={[0, 0.04, 0]}>
                    <boxGeometry args={[0.03, 0.08, 0.005]} />
                  </Part>
                </group>
              ))}
            </group>
          </group>
        )),
      )}
      {/* The tank the captured carbon goes into, on its way underground. */}
      <Part color={LEAF} opacity={opacity} position={[0.22, 0.09, 0.3]}>
        <cylinderGeometry args={[0.08, 0.08, 0.18, 12]} />
      </Part>
    </group>
  );
}

// A vertical farm: a glass tower with green crops on every floor.
export function VerticalFarmModel({ opacity }: ModelProps) {
  return (
    <group>
      <Part color={GLASS} opacity={Math.min(opacity, 0.85)} position={[0, 0.42, 0]}>
        <boxGeometry args={[0.42, 0.84, 0.42]} />
      </Part>
      {[0.1, 0.28, 0.46, 0.64, 0.82].map((y) => (
        <Part key={y} color={LEAF} opacity={opacity} position={[0, y, 0]} emissive="#9fff7a" emissiveIntensity={0.15}>
          <boxGeometry args={[0.38, 0.06, 0.38]} />
        </Part>
      ))}
      <Part color={STEEL} opacity={opacity} position={[0, 0.86, 0]}>
        <boxGeometry args={[0.46, 0.04, 0.46]} />
      </Part>
    </group>
  );
}

// An arcology: a tall tapering tower with gardens on its terraces.
export function ArcologyModel({ opacity }: ModelProps) {
  const tiers: [number, number][] = [
    [0.42, 0.18],
    [0.34, 0.5],
    [0.26, 0.8],
    [0.18, 1.08],
  ];
  return (
    <group>
      {tiers.map(([w, y], i) => (
        <group key={i}>
          <Part color={WHITE} opacity={opacity} position={[0, y, 0]}>
            <cylinderGeometry args={[w * 0.9, w, i === 0 ? 0.36 : 0.3, 6]} />
          </Part>
          <Part color={LEAF} opacity={opacity} position={[0, y + (i === 0 ? 0.19 : 0.16), 0]}>
            <cylinderGeometry args={[w * 0.92, w * 0.92, 0.03, 6]} />
          </Part>
          <Part color={GLASS} opacity={opacity} position={[0, y, w * 0.86]} emissive="#bfe6ff" emissiveIntensity={0.2}>
            <boxGeometry args={[w * 0.8, 0.12, 0.01]} />
          </Part>
        </group>
      ))}
      <Part color={STEEL} opacity={opacity} position={[0, 1.36, 0]}>
        <cylinderGeometry args={[0.01, 0.02, 0.24, 6]} />
      </Part>
    </group>
  );
}

// An ocean clean-up station: a little harbour with a boat and a long floating boom.
export function OceanCleanerModel({ opacity }: ModelProps) {
  const boat = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (boat.current) boat.current.position.y = 0.02 + Math.sin(clock.elapsedTime * 1.4) * 0.015;
  });
  return (
    <group>
      <Part color={CONCRETE} opacity={opacity} position={[0, 0.04, -0.18]}>
        <boxGeometry args={[0.6, 0.08, 0.2]} />
      </Part>
      <group ref={boat} position={[0, 0.02, 0.15]}>
        <Part color="#e04b3a" opacity={opacity} position={[0, 0.06, 0]}>
          <boxGeometry args={[0.36, 0.08, 0.14]} />
        </Part>
        <Part color={WHITE} opacity={opacity} position={[-0.06, 0.14, 0]}>
          <boxGeometry args={[0.14, 0.08, 0.1]} />
        </Part>
      </group>
      {/* The boom: a line of yellow floats sweeping up plastic. */}
      {[-0.36, -0.27, -0.18, 0.18, 0.27, 0.36].map((x) => (
        <Part key={x} color="#ffd23f" opacity={opacity} position={[x, 0.03, 0.32 - Math.abs(x) * 0.4]}>
          <sphereGeometry args={[0.035, 8, 6]} />
        </Part>
      ))}
    </group>
  );
}

// A launch site: a round pad, a lattice tower, and a rocket ready to go.
export function LaunchSiteModel({ opacity }: ModelProps) {
  return (
    <group>
      <Part color={CONCRETE_DARK} opacity={opacity} position={[0, 0.03, 0]}>
        <cylinderGeometry args={[0.44, 0.46, 0.06, 18]} />
      </Part>
      {/* The service tower. */}
      <Part color="#c0392b" opacity={opacity} position={[-0.22, 0.45, -0.05]}>
        <boxGeometry args={[0.1, 0.84, 0.1]} />
      </Part>
      {[0.25, 0.5, 0.75].map((y) => (
        <Part key={y} color={STEEL} opacity={opacity} position={[-0.12, y, -0.05]}>
          <boxGeometry args={[0.14, 0.02, 0.03]} />
        </Part>
      ))}
      {/* The rocket. */}
      <Part color={WHITE} opacity={opacity} position={[0.06, 0.46, -0.05]}>
        <cylinderGeometry args={[0.08, 0.08, 0.76, 14]} />
      </Part>
      <Part color={WHITE} opacity={opacity} position={[0.06, 0.92, -0.05]}>
        <coneGeometry args={[0.08, 0.18, 14]} />
      </Part>
      <Part color="#2b2f33" opacity={opacity} position={[0.06, 0.66, -0.05]}>
        <cylinderGeometry args={[0.081, 0.081, 0.06, 14]} />
      </Part>
      {[0, 1, 2].map((i) => (
        <Part
          key={i}
          color="#2b2f33"
          opacity={opacity}
          position={[0.06 + Math.cos((i * Math.PI * 2) / 3) * 0.1, 0.13, -0.05 + Math.sin((i * Math.PI * 2) / 3) * 0.1]}
        >
          <boxGeometry args={[0.04, 0.14, 0.04]} />
        </Part>
      ))}
    </group>
  );
}

export const FUTURE_MODELS: Record<string, (props: ModelProps) => JSX.Element> = {
  nuclear: NuclearModel,
  fusion: FusionModel,
  datacenter: DataCenterModel,
  aircapture: AirCaptureModel,
  vfarm: VerticalFarmModel,
  arcology: ArcologyModel,
  oceancleaner: OceanCleanerModel,
  launchsite: LaunchSiteModel,
};
