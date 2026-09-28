"use client";

import { useRef, type JSX } from "react";
import { useFrame } from "@react-three/fiber";
import type { Mesh } from "three";
import { Part } from "@/components/game/scene/part";

interface ModelProps {
  opacity: number;
}

function Flame({ opacity, position = [0, 0, 0], scale = 1 }: ModelProps & {
  position?: [number, number, number];
  scale?: number;
}) {
  const outer = useRef<Mesh>(null);
  const inner = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime * 8 + position[0] * 10;
    const s = 1 + Math.sin(t) * 0.12 + Math.sin(t * 2.3) * 0.06;
    outer.current?.scale.set(scale, scale * s, scale);
    inner.current?.scale.set(scale, scale * (2 - s), scale);
  });
  return (
    <group position={position}>
      <mesh ref={outer} position={[0, 0.12 * scale, 0]}>
        <coneGeometry args={[0.1, 0.28, 7]} />
        <meshStandardMaterial color="#ff7a1a" emissive="#ff5a00" emissiveIntensity={1.6} transparent opacity={0.9 * opacity} />
      </mesh>
      <mesh ref={inner} position={[0, 0.09 * scale, 0]}>
        <coneGeometry args={[0.055, 0.18, 6]} />
        <meshStandardMaterial color="#ffe066" emissive="#ffd23f" emissiveIntensity={2} transparent opacity={opacity} />
      </mesh>
    </group>
  );
}

function StoneRing({ opacity, radius, count, y = 0.03 }: ModelProps & { radius: number; count: number; y?: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const a = (i / count) * Math.PI * 2;
        return (
          <Part key={i} color={i % 2 ? "#8d8a86" : "#a19d97"} opacity={opacity} position={[Math.cos(a) * radius, y, Math.sin(a) * radius]} rotation={[a, a * 2, 0]}>
            <dodecahedronGeometry args={[0.055, 0]} />
          </Part>
        );
      })}
    </>
  );
}

function Log({ opacity, position, rotation, length = 0.4, radius = 0.035 }: ModelProps & {
  position: [number, number, number];
  rotation: [number, number, number];
  length?: number;
  radius?: number;
}) {
  return (
    <Part color="#6b4a2b" opacity={opacity} position={position} rotation={rotation}>
      <cylinderGeometry args={[radius, radius, length, 7]} />
    </Part>
  );
}

function ThatchHut({ opacity, radius = 0.32, height = 0.3, roofColor = "#c9a24d", wallColor = "#8a6440" }: ModelProps & {
  radius?: number;
  height?: number;
  roofColor?: string;
  wallColor?: string;
}) {
  return (
    <group>
      <Part color={wallColor} opacity={opacity} position={[0, height / 2, 0]}>
        <cylinderGeometry args={[radius, radius * 1.05, height, 10]} />
      </Part>
      <Part color={roofColor} opacity={opacity} position={[0, height + 0.2, 0]}>
        <coneGeometry args={[radius * 1.35, 0.46, 10]} />
      </Part>
      <Part color="#b8923f" opacity={opacity} position={[0, height + 0.02, 0]}>
        <torusGeometry args={[radius * 1.3, 0.025, 6, 16]} />
      </Part>
      <Part color="#2b1d12" opacity={opacity} position={[0, 0.11, radius + 0.005]}>
        <boxGeometry args={[0.14, 0.22, 0.02]} />
      </Part>
      <Log opacity={opacity} position={[0.06, height + 0.48, 0]} rotation={[0, 0, 0.5]} length={0.18} radius={0.015} />
      <Log opacity={opacity} position={[-0.06, height + 0.48, 0]} rotation={[0, 0, -0.5]} length={0.18} radius={0.015} />
    </group>
  );
}

export function CampfireModel({ opacity }: ModelProps) {
  return (
    <group>
      <StoneRing opacity={opacity} radius={0.2} count={9} />
      <Log opacity={opacity} position={[0, 0.06, 0]} rotation={[0, 0.4, Math.PI / 2.4]} length={0.34} />
      <Log opacity={opacity} position={[0, 0.06, 0]} rotation={[0, -0.9, Math.PI / 2.4]} length={0.34} />
      <Log opacity={opacity} position={[0, 0.06, 0]} rotation={[0, 1.8, Math.PI / 2.4]} length={0.34} />
      <Flame opacity={opacity} position={[0, 0.06, 0]} scale={1.2} />
      {[0, 1.3, 2.6, 3.9, 5.2].map((a) => (
        <Log key={a} opacity={opacity} position={[Math.cos(a) * 0.5, 0.05, Math.sin(a) * 0.5]} rotation={[0, -a, Math.PI / 2]} length={0.3} radius={0.05} />
      ))}
    </group>
  );
}

export function HutModel({ opacity }: ModelProps) {
  return (
    <group>
      <ThatchHut opacity={opacity} />
      <group position={[0.42, 0, 0.2]}>
        <Log opacity={opacity} position={[0, 0.03, 0]} rotation={[0, 0.2, Math.PI / 2]} length={0.26} radius={0.03} />
        <Log opacity={opacity} position={[0, 0.03, 0.07]} rotation={[0, 0.2, Math.PI / 2]} length={0.26} radius={0.03} />
        <Log opacity={opacity} position={[0, 0.08, 0.035]} rotation={[0, 0.2, Math.PI / 2]} length={0.26} radius={0.03} />
      </group>
      <Part color="#7a5a3a" opacity={opacity} position={[-0.4, 0.07, 0.15]}>
        <cylinderGeometry args={[0.07, 0.05, 0.14, 8]} />
      </Part>
    </group>
  );
}

export function GathererModel({ opacity }: ModelProps) {
  return (
    <group>
      <group position={[-0.1, 0, -0.1]}>
        <Part color="#8a6440" opacity={opacity} position={[0, 0.2, 0]} rotation={[0.55, 0, 0]}>
          <boxGeometry args={[0.55, 0.02, 0.5]} />
        </Part>
        <Log opacity={opacity} position={[-0.25, 0.2, 0.12]} rotation={[0, 0, 0]} length={0.42} radius={0.02} />
        <Log opacity={opacity} position={[0.25, 0.2, 0.12]} rotation={[0, 0, 0]} length={0.42} radius={0.02} />
      </group>
      {[[0.3, 0.2], [0.18, 0.38], [-0.3, 0.3]].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <Part color="#b58a4c" opacity={opacity} position={[0, 0.07, 0]}>
            <cylinderGeometry args={[0.08, 0.06, 0.14, 10]} />
          </Part>
          <Part color={i === 1 ? "#6aa84f" : "#c0392b"} opacity={opacity} position={[0, 0.15, 0]}>
            <sphereGeometry args={[0.065, 8, 6]} />
          </Part>
        </group>
      ))}
      <group position={[0.35, 0, -0.3]}>
        <Part color="#3f8a3a" opacity={opacity} position={[0, 0.14, 0]}>
          <sphereGeometry args={[0.16, 10, 8]} />
        </Part>
        {[[0.1, 0.2, 0.08], [-0.08, 0.22, 0.1], [0.05, 0.26, -0.1]].map(([x, y, z], i) => (
          <Part key={i} color="#d62d4a" opacity={opacity} position={[x, y, z]}>
            <sphereGeometry args={[0.03, 6, 5]} />
          </Part>
        ))}
      </group>
    </group>
  );
}

export function WoodcutterModel({ opacity }: ModelProps) {
  return (
    <group>
      <Part color="#7d5a3c" opacity={opacity} position={[0.25, 0.07, 0.2]}>
        <cylinderGeometry args={[0.11, 0.13, 0.14, 10]} />
      </Part>
      <Part color="#c9a77a" opacity={opacity} position={[0.25, 0.145, 0.2]}>
        <cylinderGeometry args={[0.1, 0.1, 0.01, 10]} />
      </Part>
      <group position={[0.25, 0.28, 0.2]} rotation={[0, 0, -0.5]}>
        <Part color="#6b4a2b" opacity={opacity}>
          <cylinderGeometry args={[0.012, 0.012, 0.3, 6]} />
        </Part>
        <Part color="#9aa0a6" opacity={opacity} metalness={0.3} position={[0.03, 0.13, 0]}>
          <boxGeometry args={[0.07, 0.05, 0.015]} />
        </Part>
      </group>
      {[0, 1, 2].map((row) =>
        Array.from({ length: 3 - row }, (_, i) => (
          <Log
            key={`${row}-${i}`}
            opacity={opacity}
            position={[-0.25 + i * 0.09 + row * 0.045, 0.05 + row * 0.08, -0.15]}
            rotation={[Math.PI / 2, 0, 0]}
            length={0.4}
            radius={0.04}
          />
        )),
      )}
      <Part color="#8a6440" opacity={opacity} position={[-0.3, 0.12, 0.25]} rotation={[0, 0.4, 0]}>
        <boxGeometry args={[0.2, 0.24, 0.02]} />
      </Part>
    </group>
  );
}

export function FishingModel({ opacity }: ModelProps) {
  return (
    <group>
      {[-0.12, 0, 0.12].map((x) => (
        <Part key={x} color="#9b7650" opacity={opacity} position={[x, 0.06, 0.25]}>
          <boxGeometry args={[0.1, 0.03, 0.55]} />
        </Part>
      ))}
      {[[-0.16, 0.05], [0.16, 0.05], [-0.16, 0.45], [0.16, 0.45]].map(([x, z], i) => (
        <Log key={i} opacity={opacity} position={[x, 0, z]} rotation={[0, 0, 0]} length={0.18} radius={0.02} />
      ))}
      <group position={[-0.3, 0.06, -0.1]} rotation={[0, 0.6, 0]}>
        <Part color="#7a5230" opacity={opacity} scale={[1, 0.5, 3]}>
          <sphereGeometry args={[0.09, 10, 6]} />
        </Part>
        <Log opacity={opacity} position={[0.05, 0.08, 0]} rotation={[0.4, 0, 0]} length={0.35} radius={0.01} />
      </group>
      <group position={[0.3, 0, -0.2]}>
        <Log opacity={opacity} position={[-0.12, 0.15, 0]} rotation={[0, 0, 0]} length={0.3} radius={0.018} />
        <Log opacity={opacity} position={[0.12, 0.15, 0]} rotation={[0, 0, 0]} length={0.3} radius={0.018} />
        <Log opacity={opacity} position={[0, 0.28, 0]} rotation={[0, 0, Math.PI / 2]} length={0.28} radius={0.012} />
        {[-0.06, 0.02, 0.09].map((x) => (
          <Part key={x} color="#8fb3c4" opacity={opacity} position={[x, 0.22, 0]} scale={[0.6, 1.4, 0.3]}>
            <sphereGeometry args={[0.04, 6, 5]} />
          </Part>
        ))}
      </group>
    </group>
  );
}

export function QuarryModel({ opacity }: ModelProps) {
  const blocks: [number, number, number, number][] = [
    [-0.2, 0.07, 0.1, 0.14],
    [0.02, 0.07, 0.12, 0.14],
    [-0.09, 0.21, 0.11, 0.14],
    [0.25, 0.06, -0.2, 0.12],
  ];
  return (
    <group>
      <Part color="#6f6a64" opacity={opacity} position={[0, 0.1, -0.15]} rotation={[0, 0.3, 0]}>
        <dodecahedronGeometry args={[0.28, 0]} />
      </Part>
      {blocks.map(([x, y, z, s], i) => (
        <Part key={i} color={i % 2 ? "#b8b2a7" : "#a39d93"} opacity={opacity} position={[x, y, z]} rotation={[0, i * 0.4, 0]}>
          <boxGeometry args={[s * 1.4, s, s]} />
        </Part>
      ))}
      {[[0.3, 0.3], [0.35, 0.18], [-0.35, -0.3]].map(([x, z], i) => (
        <Part key={i} color="#8d8a86" opacity={opacity} position={[x, 0.03, z]}>
          <dodecahedronGeometry args={[0.05, 0]} />
        </Part>
      ))}
      <group position={[0.3, 0.12, 0.35]} rotation={[0, 0, 0.6]}>
        <Part color="#6b4a2b" opacity={opacity}>
          <cylinderGeometry args={[0.012, 0.012, 0.26, 6]} />
        </Part>
        <Part color="#8d8a86" opacity={opacity} position={[0, 0.13, 0]}>
          <boxGeometry args={[0.12, 0.03, 0.03]} />
        </Part>
      </group>
    </group>
  );
}

export function ElderModel({ opacity }: ModelProps) {
  const totem = ["#c0392b", "#f1c40f", "#2e86c1", "#27ae60"];
  return (
    <group>
      <ThatchHut opacity={opacity} radius={0.36} height={0.34} roofColor="#9e6b3a" wallColor="#7a5236" />
      <group position={[0.45, 0, 0.25]}>
        {totem.map((c, i) => (
          <Part key={c} color={c} opacity={opacity} position={[0, 0.08 + i * 0.13, 0]}>
            <cylinderGeometry args={[0.055, 0.06, 0.12, 8]} />
          </Part>
        ))}
        <Part color="#f1c40f" opacity={opacity} position={[0, 0.58, 0]} scale={[2.2, 0.35, 0.6]}>
          <boxGeometry args={[0.12, 0.08, 0.06]} />
        </Part>
      </group>
      <Flame opacity={opacity} position={[-0.42, 0.02, 0.28]} scale={0.6} />
      <StoneRing opacity={opacity} radius={0.1} count={6} y={0.02} />
    </group>
  );
}

export function HealerModel({ opacity }: ModelProps) {
  return (
    <group>
      <ThatchHut opacity={opacity} radius={0.3} roofColor="#7fa35a" wallColor="#8a6440" />
      <group position={[0.35, 0, -0.1]}>
        <Log opacity={opacity} position={[0, 0.16, -0.12]} rotation={[0, 0, 0]} length={0.32} radius={0.015} />
        <Log opacity={opacity} position={[0, 0.16, 0.12]} rotation={[0, 0, 0]} length={0.32} radius={0.015} />
        <Log opacity={opacity} position={[0, 0.3, 0]} rotation={[Math.PI / 2, 0, 0]} length={0.28} radius={0.012} />
        {[-0.08, 0, 0.08].map((z) => (
          <Part key={z} color="#4f8f3a" opacity={opacity} position={[0, 0.24, z]} scale={[0.6, 1.6, 0.6]}>
            <sphereGeometry args={[0.035, 6, 5]} />
          </Part>
        ))}
      </group>
      <Part color="#6f9c9f" opacity={opacity} position={[-0.35, 0.06, 0.25]}>
        <cylinderGeometry args={[0.08, 0.06, 0.12, 10]} />
      </Part>
    </group>
  );
}

export const MODELS: Record<string, (props: ModelProps) => JSX.Element> = {
  campfire: CampfireModel,
  hut: HutModel,
  gatherer: GathererModel,
  woodcutter: WoodcutterModel,
  fishing: FishingModel,
  quarry: QuarryModel,
  elder: ElderModel,
  healer: HealerModel,
};
