"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group, Mesh } from "three";
import { Part } from "./part";

export interface BuildingProps {
  opacity: number;
}

const QUARTER_TURN = Math.PI / 4;

export function SchoolBuilding({ opacity }: BuildingProps) {
  return (
    <group>
      <Part color="#dd8a52" opacity={opacity} position={[0, 0.4, 0]}>
        <boxGeometry args={[1.1, 0.8, 0.9]} />
      </Part>
      <Part
        color="#8c3f2b"
        opacity={opacity}
        position={[0, 1.05, 0]}
        rotation={[0, QUARTER_TURN, 0]}
      >
        <coneGeometry args={[0.82, 0.5, 4]} />
      </Part>
      <Part color="#2b2320" opacity={opacity} position={[0, 0.22, 0.46]}>
        <boxGeometry args={[0.24, 0.42, 0.04]} />
      </Part>
      <Part
        color="#7fd6f2"
        opacity={opacity}
        emissive="#7fd6f2"
        emissiveIntensity={0.2}
        position={[-0.32, 0.5, 0.46]}
      >
        <boxGeometry args={[0.2, 0.2, 0.04]} />
      </Part>
      <Part
        color="#7fd6f2"
        opacity={opacity}
        emissive="#7fd6f2"
        emissiveIntensity={0.2}
        position={[0.32, 0.5, 0.46]}
      >
        <boxGeometry args={[0.2, 0.2, 0.04]} />
      </Part>
      <Part color="#c9c9c9" opacity={opacity} position={[0.48, 0.9, -0.3]}>
        <cylinderGeometry args={[0.02, 0.02, 0.9, 6]} />
      </Part>
      <Part color="#e6484f" opacity={opacity} position={[0.55, 1.28, -0.3]}>
        <boxGeometry args={[0.16, 0.1, 0.01]} />
      </Part>
    </group>
  );
}

export function SolarPanelsBuilding({ opacity }: BuildingProps) {
  const offsets = [-0.45, 0, 0.45];
  return (
    <group>
      <Part color="#9c9c9c" opacity={opacity} position={[0, 0.03, 0]}>
        <boxGeometry args={[1.3, 0.06, 0.9]} />
      </Part>
      {offsets.map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <Part color="#616161" opacity={opacity} position={[0, 0.2, -0.2]}>
            <cylinderGeometry args={[0.025, 0.025, 0.4, 6]} />
          </Part>
          <Part color="#616161" opacity={opacity} position={[0, 0.35, 0.2]}>
            <cylinderGeometry args={[0.025, 0.025, 0.7, 6]} />
          </Part>
          <Part
            color="#1e3a5f"
            opacity={opacity}
            metalness={0.6}
            roughness={0.25}
            position={[0, 0.5, 0]}
            rotation={[0.55, 0, 0]}
          >
            <boxGeometry args={[0.34, 0.02, 0.55]} />
          </Part>
        </group>
      ))}
    </group>
  );
}

export function RecyclingBuilding({ opacity }: BuildingProps) {
  const ringRef = useRef<Mesh>(null);
  useFrame((_, delta) => {
    if (ringRef.current) ringRef.current.rotation.y += delta * 0.8;
  });

  return (
    <group>
      <Part color="#4c9a63" opacity={opacity} position={[-0.2, 0.3, 0]}>
        <boxGeometry args={[0.6, 0.6, 0.6]} />
      </Part>
      <Part color="#2f7a48" opacity={opacity} position={[0.35, 0.35, 0.15]}>
        <cylinderGeometry args={[0.22, 0.22, 0.7, 10]} />
      </Part>
      <Part color="#1f9d55" opacity={opacity} position={[0.65, 0.2, -0.25]}>
        <cylinderGeometry args={[0.15, 0.15, 0.4, 10]} />
      </Part>
      <mesh ref={ringRef} position={[0.35, 0.75, 0.15]}>
        <torusGeometry args={[0.16, 0.03, 8, 16]} />
        <meshStandardMaterial
          color="#e8fff0"
          transparent={opacity < 1}
          opacity={opacity}
        />
      </mesh>
    </group>
  );
}

export function BikeLanesBuilding({ opacity }: BuildingProps) {
  return (
    <group>
      <Part color="#555a5e" opacity={opacity} position={[0, 0.03, 0]}>
        <boxGeometry args={[1.3, 0.05, 0.5]} />
      </Part>
      <Part color="#f4d35e" opacity={opacity} position={[0, 0.065, 0]}>
        <boxGeometry args={[1.1, 0.01, 0.06]} />
      </Part>
      <group position={[0, 0.22, 0.2]} rotation={[0, 0.3, 0]}>
        <Part color="#1c1c1c" opacity={opacity} position={[-0.22, -0.1, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.16, 0.03, 8, 16]} />
        </Part>
        <Part color="#1c1c1c" opacity={opacity} position={[0.22, -0.1, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.16, 0.03, 8, 16]} />
        </Part>
        <Part color="#d1495b" opacity={opacity} position={[0, 0, 0]} rotation={[0, 0, 0.35]}>
          <cylinderGeometry args={[0.02, 0.02, 0.42, 6]} />
        </Part>
        <Part color="#d1495b" opacity={opacity} position={[0, 0.08, 0]}>
          <boxGeometry args={[0.16, 0.03, 0.1]} />
        </Part>
      </group>
    </group>
  );
}

export function LiteracyBuilding({ opacity }: BuildingProps) {
  const bookColors = ["#c0392b", "#2980b9", "#f1c40f"];
  return (
    <group>
      <Part color="#c8a165" opacity={opacity} position={[-0.15, 0.35, 0]}>
        <boxGeometry args={[0.7, 0.7, 0.7]} />
      </Part>
      <Part
        color="#5b3a8e"
        opacity={opacity}
        position={[-0.15, 0.82, 0]}
        rotation={[0, QUARTER_TURN, 0]}
      >
        <coneGeometry args={[0.55, 0.35, 4]} />
      </Part>
      {bookColors.map((color, i) => (
        <Part
          key={color}
          color={color}
          opacity={opacity}
          position={[0.35, 0.05 + i * 0.09, 0.15 - i * 0.03]}
          rotation={[0, 0.15 * i, 0]}
        >
          <boxGeometry args={[0.42, 0.08, 0.32]} />
        </Part>
      ))}
    </group>
  );
}

export function GridUpgradeBuilding({ opacity }: BuildingProps) {
  const poles: [number, number, number][] = [
    [-0.4, 0, -0.2],
    [0.4, 0, 0.2],
  ];
  return (
    <group>
      <Part color="#8a8f94" opacity={opacity} position={[0, 0.2, 0]}>
        <boxGeometry args={[0.9, 0.4, 0.7]} />
      </Part>
      <Part color="#f4c542" opacity={opacity} position={[0, 0.41, 0.36]}>
        <boxGeometry args={[0.9, 0.06, 0.02]} />
      </Part>
      {poles.map(([x, , z]) => (
        <group key={x}>
          <Part color="#5a5f63" opacity={opacity} position={[x, 0.55, z]}>
            <cylinderGeometry args={[0.04, 0.04, 1.1, 8]} />
          </Part>
          <Part color="#e8e8e8" opacity={opacity} position={[x, 1.08, z]}>
            <sphereGeometry args={[0.07, 8, 8]} />
          </Part>
        </group>
      ))}
      <Part
        color="#3a3d40"
        opacity={opacity}
        position={[0, 1.02, 0]}
        rotation={[0, 0, Math.atan2(0.4, 0.4)]}
      >
        <cylinderGeometry args={[0.015, 0.015, 1.13, 6]} />
      </Part>
    </group>
  );
}

export function CommunityGardenBuilding({ opacity }: BuildingProps) {
  const beds: [number, number][] = [
    [-0.35, -0.2],
    [0.05, -0.2],
    [-0.15, 0.25],
  ];
  const trees: [number, number, number][] = [[0.5, 0, -0.35]];
  return (
    <group>
      {beds.map(([x, z], i) => (
        <group key={i}>
          <Part color="#7a5230" opacity={opacity} position={[x, 0.08, z]}>
            <boxGeometry args={[0.32, 0.16, 0.32]} />
          </Part>
          <Part color="#3f7d3a" opacity={opacity} position={[x, 0.18, z]}>
            <boxGeometry args={[0.26, 0.06, 0.26]} />
          </Part>
        </group>
      ))}
      {trees.map(([x, , z], i) => (
        <group key={i} position={[x, 0, z]}>
          <Part color="#6b4423" opacity={opacity} position={[0, 0.18, 0]}>
            <cylinderGeometry args={[0.04, 0.05, 0.36, 6]} />
          </Part>
          <Part color="#2f8f4e" opacity={opacity} position={[0, 0.45, 0]}>
            <coneGeometry args={[0.24, 0.45, 8]} />
          </Part>
        </group>
      ))}
    </group>
  );
}

export function CoalPlantBuilding({ opacity }: BuildingProps) {
  const puffRefs = useRef<Mesh[]>([]);
  useFrame(({ clock }) => {
    puffRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const t = (clock.elapsedTime * 0.3 + i * 0.6) % 2;
      mesh.position.y = 1.3 + t * 0.5;
      const mat = mesh.material as { opacity: number };
      mat.opacity = Math.max(0, 0.5 - t * 0.25);
    });
  });

  return (
    <group>
      <Part color="#4a4a4a" opacity={opacity} position={[0, 0.35, 0]}>
        <boxGeometry args={[1.2, 0.7, 0.9]} />
      </Part>
      <Part
        color="#f4a63f"
        opacity={opacity}
        emissive="#f4a63f"
        emissiveIntensity={0.4}
        position={[0, 0.35, 0.46]}
      >
        <boxGeometry args={[0.9, 0.15, 0.02]} />
      </Part>
      {[-0.3, 0.3].map((x) => (
        <Part
          key={x}
          color="#3a3a3a"
          opacity={opacity}
          position={[x, 0.95, -0.1]}
        >
          <cylinderGeometry args={[0.12, 0.14, 0.8, 10]} />
        </Part>
      ))}
      {opacity >= 1 &&
        [0, 1, 2].map((i) => (
          <mesh
            key={i}
            ref={(el) => {
              if (el) puffRefs.current[i] = el;
            }}
            position={[i % 2 === 0 ? -0.3 : 0.3, 1.3, -0.1]}
          >
            <sphereGeometry args={[0.16, 8, 8]} />
            <meshStandardMaterial color="#888888" transparent opacity={0.4} />
          </mesh>
        ))}
    </group>
  );
}

export const BUILDING_COMPONENTS: Record<
  string,
  (props: BuildingProps) => React.JSX.Element
> = {
  "build-school": SchoolBuilding,
  "solar-panels": SolarPanelsBuilding,
  "recycling-program": RecyclingBuilding,
  "bike-lanes": BikeLanesBuilding,
  "literacy-classes": LiteracyBuilding,
  "grid-upgrade": GridUpgradeBuilding,
  "community-garden": CommunityGardenBuilding,
  "coal-plant": CoalPlantBuilding,
};

export type { Group };
