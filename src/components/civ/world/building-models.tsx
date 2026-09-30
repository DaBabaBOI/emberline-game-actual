"use client";

import { useRef, type JSX } from "react";
import { useFrame } from "@react-three/fiber";
import type { Mesh } from "three";
import { Part } from "./part";

interface ModelProps {
  opacity: number;
  // Campfires only: false when it has burned out.
  lit?: boolean;
}

export function Flame({ opacity, position = [0, 0, 0], scale = 1 }: ModelProps & {
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

export function CampfireModel({ opacity, lit = true }: ModelProps) {
  return (
    <group>
      <StoneRing opacity={opacity} radius={0.2} count={9} />
      <Log opacity={opacity} position={[0, 0.06, 0]} rotation={[0, 0.4, Math.PI / 2.4]} length={0.34} />
      <Log opacity={opacity} position={[0, 0.06, 0]} rotation={[0, -0.9, Math.PI / 2.4]} length={0.34} />
      <Log opacity={opacity} position={[0, 0.06, 0]} rotation={[0, 1.8, Math.PI / 2.4]} length={0.34} />
      {lit ? (
        <Flame opacity={opacity} position={[0, 0.06, 0]} scale={1.2} />
      ) : (
        // Burnt out: grey ash and a few dull embers.
        <group>
          <Part color="#6e6862" opacity={opacity} position={[0, 0.03, 0]}>
            <cylinderGeometry args={[0.16, 0.18, 0.04, 8]} />
          </Part>
          {[0.5, 2.4, 4.1].map((a) => (
            <Part key={a} color="#7a2e14" opacity={opacity} position={[Math.cos(a) * 0.07, 0.06, Math.sin(a) * 0.07]}>
              <boxGeometry args={[0.04, 0.03, 0.04]} />
            </Part>
          ))}
        </group>
      )}
      {/* Log seats. Villagers sit on these: keep FIRE_SEATS in villagers.tsx in step. */}
      {[0, 1.3, 2.6, 3.9, 5.2].map((a) => (
        <Log key={a} opacity={opacity} position={[Math.cos(a) * 0.5, 0.05, Math.sin(a) * 0.5]} rotation={[0, -a, Math.PI / 2]} length={0.3} radius={0.05} />
      ))}
    </group>
  );
}

// A small wooden house: log walls and a bark-plank roof. No thatch yet: that
// needs straw from farmed grain.
function WoodenHouse({ opacity }: ModelProps) {
  const w = 0.56;
  const d = 0.42;
  const h = 0.26;
  return (
    <group>
      <Part color="#8a5a34" opacity={opacity} position={[0, h / 2, 0]}>
        <boxGeometry args={[w, h, d]} />
      </Part>
      {/* Seams between the logs */}
      {[0.07, 0.14, 0.21].map((y) => (
        <Part key={y} color="#5e3b1c" opacity={opacity} position={[0, y, 0]}>
          <boxGeometry args={[w + 0.01, 0.012, d + 0.01]} />
        </Part>
      ))}
      {/* Gabled roof of bark planks, with a ridge log */}
      {[-1, 1].map((s) => (
        <Part key={s} color="#4e3220" opacity={opacity} position={[0, h + 0.1, (s * d) / 4]} rotation={[s * 0.62, 0, 0]}>
          <boxGeometry args={[w + 0.1, 0.03, d * 0.62]} />
        </Part>
      ))}
      <Log opacity={opacity} position={[0, h + 0.19, 0]} rotation={[0, 0, Math.PI / 2]} length={w + 0.12} radius={0.02} />
      <Part color="#2b1d12" opacity={opacity} position={[0.12, 0.1, d / 2 + 0.005]}>
        <boxGeometry args={[0.12, 0.19, 0.02]} />
      </Part>
    </group>
  );
}

export function HutModel({ opacity }: ModelProps) {
  return (
    <group>
      <WoodenHouse opacity={opacity} />
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

export function FarmModel({ opacity }: ModelProps) {
  const rows = [-0.36, -0.18, 0, 0.18, 0.36];
  return (
    <group>
      <Part color="#7a5230" opacity={opacity} position={[0, 0.012, 0]}>
        <cylinderGeometry args={[0.62, 0.62, 0.025, 6]} />
      </Part>
      {rows.map((z) => (
        <group key={z}>
          <Part color="#5e3d22" opacity={opacity} position={[0, 0.03, z]}>
            <boxGeometry args={[0.9 - Math.abs(z) * 0.9, 0.03, 0.06]} />
          </Part>
          {Array.from({ length: Math.round(7 - Math.abs(z) * 6) }, (_, i) => {
            const n = Math.round(7 - Math.abs(z) * 6);
            const span = 0.8 - Math.abs(z) * 0.9;
            const x = -span / 2 + (span / Math.max(1, n - 1)) * i;
            return (
              <group key={i} position={[x, 0.04, z]}>
                <Part color="#d9b44a" opacity={opacity} position={[0, 0.07, 0]}>
                  <cylinderGeometry args={[0.008, 0.008, 0.14, 4]} />
                </Part>
                <Part color="#e8c65a" opacity={opacity} position={[0, 0.15, 0]} scale={[1, 2.2, 1]}>
                  <sphereGeometry args={[0.022, 6, 4]} />
                </Part>
              </group>
            );
          })}
        </group>
      ))}
      <group position={[0.42, 0, 0.3]}>
        <Log opacity={opacity} position={[0, 0.2, 0]} rotation={[0, 0, 0]} length={0.4} radius={0.015} />
        <Log opacity={opacity} position={[0, 0.3, 0]} rotation={[0, 0, Math.PI / 2]} length={0.26} radius={0.012} />
        <Part color="#a3552b" opacity={opacity} position={[0, 0.3, 0]}>
          <boxGeometry args={[0.1, 0.12, 0.06]} />
        </Part>
        <Part color="#e8c9a0" opacity={opacity} position={[0, 0.41, 0]}>
          <sphereGeometry args={[0.045, 8, 6]} />
        </Part>
        <Part color="#c9a24d" opacity={opacity} position={[0, 0.45, 0]}>
          <coneGeometry args={[0.08, 0.06, 8]} />
        </Part>
      </group>
    </group>
  );
}

export function WarCampModel({ opacity }: ModelProps) {
  const stakes = Array.from({ length: 14 }, (_, i) => (i / 14) * Math.PI * 2);
  return (
    <group>
      {stakes.map((a) => (
        <Part key={a} color="#6b4a2b" opacity={opacity} position={[Math.cos(a) * 0.52, 0.13, Math.sin(a) * 0.52]}>
          <coneGeometry args={[0.035, 0.28, 5]} />
        </Part>
      ))}
      <group position={[-0.12, 0, -0.08]}>
        <Part color="#8c6a4a" opacity={opacity} position={[0, 0.2, 0]}>
          <coneGeometry args={[0.26, 0.42, 6]} />
        </Part>
        <Part color="#2b1d12" opacity={opacity} position={[0, 0.1, 0.19]} rotation={[-0.45, 0, 0]}>
          <boxGeometry args={[0.1, 0.16, 0.02]} />
        </Part>
      </group>
      <group position={[0.22, 0, 0.12]}>
        {[-0.05, 0, 0.05].map((x, i) => (
          <Log key={x} opacity={opacity} position={[x, 0.2, 0]} rotation={[0, 0, (i - 1) * 0.15]} length={0.42} radius={0.008} />
        ))}
        <Log opacity={opacity} position={[0, 0.12, 0]} rotation={[0, 0, Math.PI / 2]} length={0.2} radius={0.012} />
      </group>
      <group position={[0.05, 0, 0.3]}>
        <Log opacity={opacity} position={[0, 0.25, 0]} rotation={[0, 0, 0]} length={0.5} radius={0.012} />
        <Part color="#9b1c1c" opacity={opacity} position={[0.08, 0.42, 0]}>
          <boxGeometry args={[0.15, 0.1, 0.01]} />
        </Part>
      </group>
    </group>
  );
}

// A log lookout tower on the shore with a fire kept burning on top.
export function WatchFireModel({ opacity }: ModelProps) {
  const legs: [number, number][] = [
    [-0.13, -0.13],
    [0.13, -0.13],
    [-0.13, 0.13],
    [0.13, 0.13],
  ];
  return (
    <group>
      {legs.map(([x, z]) => (
        <Log key={`${x}${z}`} opacity={opacity} position={[x, 0.36, z]} rotation={[0, 0, 0]} length={0.72} radius={0.018} />
      ))}
      {[0.2, 0.46].map((y) => (
        <group key={y}>
          <Log opacity={opacity} position={[0, y, -0.13]} rotation={[0, 0, Math.PI / 2]} length={0.3} radius={0.01} />
          <Log opacity={opacity} position={[0, y, 0.13]} rotation={[0, 0, Math.PI / 2]} length={0.3} radius={0.01} />
        </group>
      ))}
      <Part color="#7a5534" opacity={opacity} position={[0, 0.72, 0]}>
        <boxGeometry args={[0.38, 0.04, 0.38]} />
      </Part>
      <Part color="#5f656b" opacity={opacity} position={[0, 0.77, 0]}>
        <cylinderGeometry args={[0.1, 0.08, 0.06, 7]} />
      </Part>
      <Flame opacity={opacity} position={[0, 0.8, 0]} scale={0.8} />
      {[0.12, 0.24, 0.36, 0.48, 0.6].map((y) => (
        <Log key={y} opacity={opacity} position={[0, y, 0.2]} rotation={[0, 0, Math.PI / 2]} length={0.14} radius={0.007} />
      ))}
      <Log opacity={opacity} position={[-0.07, 0.36, 0.2]} rotation={[0, 0, 0]} length={0.72} radius={0.008} />
      <Log opacity={opacity} position={[0.07, 0.36, 0.2]} rotation={[0, 0, 0]} length={0.72} radius={0.008} />
    </group>
  );
}

// A fenced pen with a few sheep and goats that graze and look around.
function Sheep({ opacity, position, dark, phase }: ModelProps & { position: [number, number, number]; dark?: boolean; phase: number }) {
  const head = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    if (head.current) head.current.position.y = 0.1 + Math.max(0, Math.sin(clock.elapsedTime * 0.8 + phase)) * -0.05;
  });
  return (
    <group position={position} rotation={[0, phase, 0]}>
      <Part color={dark ? "#6b5a48" : "#f1ede4"} opacity={opacity} position={[0, 0.1, 0]}>
        <boxGeometry args={[0.16, 0.1, 0.1]} />
      </Part>
      <mesh ref={head} position={[0.1, 0.1, 0]}>
        <boxGeometry args={[0.06, 0.06, 0.06]} />
        <meshStandardMaterial color="#2b2119" transparent opacity={opacity} />
      </mesh>
      {[
        [0.05, 0.035],
        [-0.05, 0.035],
        [0.05, -0.035],
        [-0.05, -0.035],
      ].map(([x, z]) => (
        <Part key={`${x}${z}`} color="#2b2119" opacity={opacity} position={[x, 0.03, z]}>
          <boxGeometry args={[0.02, 0.06, 0.02]} />
        </Part>
      ))}
    </group>
  );
}

export function PenModel({ opacity }: ModelProps) {
  const posts = 10;
  return (
    <group>
      {Array.from({ length: posts }, (_, i) => {
        const a = (i / posts) * Math.PI * 2;
        const next = ((i + 1) / posts) * Math.PI * 2;
        const r = 0.5;
        const mid = (a + next) / 2;
        return (
          <group key={i}>
            <Part color="#6b4a2b" opacity={opacity} position={[Math.cos(a) * r, 0.08, Math.sin(a) * r]}>
              <cylinderGeometry args={[0.018, 0.018, 0.16, 5]} />
            </Part>
            <Part
              color="#8b5a2b"
              opacity={opacity}
              position={[Math.cos(mid) * r * 0.98, 0.11, Math.sin(mid) * r * 0.98]}
              rotation={[0, -mid, 0]}
            >
              <boxGeometry args={[0.02, 0.02, 0.31]} />
            </Part>
          </group>
        );
      })}
      <Sheep opacity={opacity} position={[0.12, 0, 0.1]} phase={0.4} />
      <Sheep opacity={opacity} position={[-0.18, 0, -0.05]} phase={2.1} />
      <Sheep opacity={opacity} position={[0.05, 0, -0.22]} phase={4.2} dark />
      <Part color="#7a9a4a" opacity={opacity} position={[0, 0.005, 0]}>
        <cylinderGeometry args={[0.46, 0.46, 0.01, 12]} />
      </Part>
    </group>
  );
}

// ---- Ancient era ------------------------------------------------------------

const BRICK = "#c98f5a";
const BRICK_DARK = "#9c6a3f";
const CLAY = "#d9b07a";

// Two stacked mud-brick blocks with a flat roof, a door and a ladder.
export function HouseModel({ opacity }: ModelProps) {
  return (
    <group>
      <Part color={BRICK} opacity={opacity} position={[0, 0.16, 0]}>
        <boxGeometry args={[0.62, 0.32, 0.5]} />
      </Part>
      <Part color={BRICK_DARK} opacity={opacity} position={[0, 0.33, 0]}>
        <boxGeometry args={[0.66, 0.03, 0.54]} />
      </Part>
      <Part color={BRICK} opacity={opacity} position={[-0.12, 0.45, -0.05]}>
        <boxGeometry args={[0.32, 0.22, 0.34]} />
      </Part>
      <Part color={BRICK_DARK} opacity={opacity} position={[-0.12, 0.57, -0.05]}>
        <boxGeometry args={[0.35, 0.02, 0.37]} />
      </Part>
      <Part color="#4a3526" opacity={opacity} position={[0.14, 0.1, 0.251]}>
        <boxGeometry args={[0.12, 0.2, 0.01]} />
      </Part>
      <Part color="#2b2119" opacity={opacity} position={[-0.18, 0.2, 0.251]}>
        <boxGeometry args={[0.08, 0.07, 0.01]} />
      </Part>
      <Log opacity={opacity} position={[0.25, 0.28, 0.1]} rotation={[0.3, 0, 0]} length={0.36} radius={0.012} />
    </group>
  );
}

// A long clay hall with a thatched roof and a clay tablet on a post.
export function SchoolModel({ opacity }: ModelProps) {
  return (
    <group>
      <Part color={CLAY} opacity={opacity} position={[0, 0.15, 0]}>
        <boxGeometry args={[0.8, 0.3, 0.46]} />
      </Part>
      <Part color="#c9a24a" opacity={opacity} position={[0, 0.38, 0]} rotation={[0, 0, Math.PI / 4]} scale={[1, 1, 1]}>
        <boxGeometry args={[0.36, 0.36, 0.52]} />
      </Part>
      <Part color="#4a3526" opacity={opacity} position={[0, 0.1, 0.231]}>
        <boxGeometry args={[0.14, 0.2, 0.01]} />
      </Part>
      <group position={[0.48, 0, 0.26]}>
        <Log opacity={opacity} position={[0, 0.16, 0]} rotation={[0, 0, 0]} length={0.32} radius={0.012} />
        <Part color="#b5835a" opacity={opacity} position={[0, 0.3, 0.015]}>
          <boxGeometry args={[0.14, 0.1, 0.02]} />
        </Part>
      </group>
    </group>
  );
}

// A stone forge with a tall chimney, a glowing furnace and an anvil.
export function SmithyModel({ opacity }: ModelProps) {
  return (
    <group>
      <Part color="#8d8a86" opacity={opacity} position={[0, 0.14, 0]}>
        <boxGeometry args={[0.6, 0.28, 0.46]} />
      </Part>
      <Part color="#6b4a2b" opacity={opacity} position={[0, 0.3, 0]}>
        <boxGeometry args={[0.66, 0.04, 0.52]} />
      </Part>
      <Part color="#7d7a76" opacity={opacity} position={[0.2, 0.45, -0.12]}>
        <boxGeometry args={[0.12, 0.34, 0.12]} />
      </Part>
      <Part color="#2b2119" opacity={opacity} position={[0, 0.1, 0.231]}>
        <boxGeometry args={[0.2, 0.16, 0.01]} />
      </Part>
      <Flame opacity={opacity} position={[0, 0.03, 0.26]} scale={0.6} />
      <Part color="#3a3a3a" opacity={opacity} position={[-0.3, 0.07, 0.32]} metalness={0.6} roughness={0.4}>
        <boxGeometry args={[0.12, 0.06, 0.06]} />
      </Part>
      <Part color="#b87333" opacity={opacity} position={[0.36, 0.04, 0.3]} metalness={0.7} roughness={0.3}>
        <cylinderGeometry args={[0.05, 0.05, 0.08, 8]} />
      </Part>
    </group>
  );
}

// A water channel with earth banks running across the tile.
export function CanalModel({ opacity }: ModelProps) {
  return (
    <group>
      <Part color="#8a6a3d" opacity={opacity} position={[0, 0.03, -0.14]}>
        <boxGeometry args={[1.2, 0.06, 0.1]} />
      </Part>
      <Part color="#8a6a3d" opacity={opacity} position={[0, 0.03, 0.14]}>
        <boxGeometry args={[1.2, 0.06, 0.1]} />
      </Part>
      <Part color="#4a90c2" opacity={opacity} position={[0, 0.02, 0]} roughness={0.2}>
        <boxGeometry args={[1.2, 0.03, 0.18]} />
      </Part>
      <Part color="#6b4a2b" opacity={opacity} position={[0.35, 0.09, 0]}>
        <boxGeometry args={[0.04, 0.12, 0.34]} />
      </Part>
    </group>
  );
}

// Two round clay silos with pointed roofs.
export function GranaryModel({ opacity }: ModelProps) {
  return (
    <group>
      {[
        [-0.18, 0, 0.9],
        [0.2, 0.05, 0.75],
      ].map(([x, z, s]) => (
        <group key={x} position={[x, 0, z]} scale={s}>
          <Part color={CLAY} opacity={opacity} position={[0, 0.2, 0]}>
            <cylinderGeometry args={[0.18, 0.2, 0.4, 10]} />
          </Part>
          <Part color="#c9a24a" opacity={opacity} position={[0, 0.5, 0]}>
            <coneGeometry args={[0.24, 0.22, 10]} />
          </Part>
          <Part color="#4a3526" opacity={opacity} position={[0, 0.12, 0.19]}>
            <boxGeometry args={[0.08, 0.12, 0.02]} />
          </Part>
        </group>
      ))}
    </group>
  );
}

// A small lodge beside rows of young trees in a nursery bed.
export function ForesterModel({ opacity }: ModelProps) {
  return (
    <group>
      <group position={[-0.22, 0, -0.1]} scale={0.7}>
        <Part color="#8b5a2b" opacity={opacity} position={[0, 0.15, 0]}>
          <boxGeometry args={[0.4, 0.3, 0.34]} />
        </Part>
        <Part color="#3e6b35" opacity={opacity} position={[0, 0.38, 0]} rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[0.3, 0.3, 0.4]} />
        </Part>
      </group>
      <Part color="#6b4f33" opacity={opacity} position={[0.2, 0.015, 0.1]}>
        <boxGeometry args={[0.44, 0.03, 0.44]} />
      </Part>
      {[-0.1, 0.05, 0.2].flatMap((x) =>
        [-0.05, 0.1, 0.25].map((z) => (
          <Part key={`${x}${z}`} color="#4f9a43" opacity={opacity} position={[x + 0.1, 0.08, z]}>
            <coneGeometry args={[0.04, 0.12, 5]} />
          </Part>
        )),
      )}
    </group>
  );
}

// A ring of stone walls with a gate, around a small watch post.
export function WallsModel({ opacity }: ModelProps) {
  const sides = 6;
  return (
    <group>
      {Array.from({ length: sides }, (_, i) => {
        if (i === 1) return null; // the gate
        const a = (i / sides) * Math.PI * 2 + Math.PI / 6;
        const r = 0.5;
        return (
          <Part
            key={i}
            color={i % 2 ? "#9a958e" : "#a8a39b"}
            opacity={opacity}
            position={[Math.cos(a) * r, 0.14, Math.sin(a) * r]}
            rotation={[0, -a + Math.PI / 2, 0]}
          >
            <boxGeometry args={[0.52, 0.28, 0.1]} />
          </Part>
        );
      })}
      <Part color="#8d8a86" opacity={opacity} position={[0, 0.22, 0]}>
        <boxGeometry args={[0.18, 0.44, 0.18]} />
      </Part>
      <Part color="#9b1c1c" opacity={opacity} position={[0, 0.52, 0]}>
        <boxGeometry args={[0.12, 0.08, 0.01]} />
      </Part>
    </group>
  );
}


// ---- Classical era ---------------------------------------------------------
const STONE = "#c9c1b3";
const STONE_DARK = "#a39a8b";
const MARBLE = "#ece6da";
const ROOF_TILE = "#b5553a";
const WATER = "#4a9fd4";

// A round stone well with a little roof on two posts and a bucket.
export function WellModel({ opacity }: ModelProps) {
  return (
    <group>
      <Part color={STONE} opacity={opacity} position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.2, 0.22, 0.2, 12]} />
      </Part>
      <Part color={WATER} opacity={opacity} position={[0, 0.201, 0]} roughness={0.15}>
        <cylinderGeometry args={[0.15, 0.15, 0.01, 12]} />
      </Part>
      {[-0.17, 0.17].map((x) => (
        <Log key={x} opacity={opacity} position={[x, 0.32, 0]} rotation={[0, 0, 0]} length={0.44} radius={0.018} />
      ))}
      <Log opacity={opacity} position={[0, 0.46, 0]} rotation={[0, 0, Math.PI / 2]} length={0.38} radius={0.015} />
      <Part color={ROOF_TILE} opacity={opacity} position={[0, 0.58, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[0.3, 0.2, 4]} />
      </Part>
      <Part color="#6b4a2b" opacity={opacity} position={[0.05, 0.32, 0]}>
        <cylinderGeometry args={[0.04, 0.035, 0.07, 8]} />
      </Part>
    </group>
  );
}

// Stone arches carrying a water channel across the tile.
export function AqueductModel({ opacity }: ModelProps) {
  return (
    <group>
      {[-0.54, -0.18, 0.18, 0.54].map((x) => (
        <Part key={x} color={STONE} opacity={opacity} position={[x, 0.26, 0]}>
          <boxGeometry args={[0.12, 0.52, 0.2]} />
        </Part>
      ))}
      {[-0.36, 0, 0.36].map((x) => (
        <Part key={x} color={STONE_DARK} opacity={opacity} position={[x, 0.46, 0]}>
          <boxGeometry args={[0.26, 0.1, 0.2]} />
        </Part>
      ))}
      <Part color={STONE} opacity={opacity} position={[0, 0.56, 0]}>
        <boxGeometry args={[1.26, 0.1, 0.24]} />
      </Part>
      <Part color={WATER} opacity={opacity} position={[0, 0.615, 0]} roughness={0.15}>
        <boxGeometry args={[1.24, 0.02, 0.12]} />
      </Part>
    </group>
  );
}

// A timber mill house with a big water wheel that turns.
export function WatermillModel({ opacity }: ModelProps) {
  const wheel = useRef<Mesh>(null);
  useFrame((_, dt) => {
    if (wheel.current) wheel.current.rotation.z -= dt * 0.8;
  });
  return (
    <group>
      <Part color="#8b5a2b" opacity={opacity} position={[-0.08, 0.17, 0]}>
        <boxGeometry args={[0.46, 0.34, 0.4]} />
      </Part>
      <Part color={ROOF_TILE} opacity={opacity} position={[-0.08, 0.42, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[0.38, 0.24, 4]} />
      </Part>
      <Part color="#4a3526" opacity={opacity} position={[-0.08, 0.1, 0.201]}>
        <boxGeometry args={[0.1, 0.18, 0.01]} />
      </Part>
      <group position={[0.25, 0.24, 0]}>
        <mesh ref={wheel} castShadow={opacity >= 1}>
          <torusGeometry args={[0.2, 0.025, 6, 16]} />
          <meshStandardMaterial color="#6b4a2b" transparent={opacity < 1} opacity={opacity} />
          {[0, 1, 2, 3].map((i) => (
            <mesh key={i} rotation={[0, 0, (i * Math.PI) / 4]}>
              <boxGeometry args={[0.42, 0.03, 0.03]} />
              <meshStandardMaterial color="#5e3b1c" transparent={opacity < 1} opacity={opacity} />
            </mesh>
          ))}
        </mesh>
        <Part color="#5e3b1c" opacity={opacity} position={[-0.02, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.03, 0.03, 0.12, 6]} />
        </Part>
      </group>
    </group>
  );
}

// A tall block of flats: three storeys of windows under a red tile roof.
export function TownHouseModel({ opacity }: ModelProps) {
  return (
    <group>
      <Part color="#e3cfa4" opacity={opacity} position={[0, 0.34, 0]}>
        <boxGeometry args={[0.66, 0.68, 0.5]} />
      </Part>
      <Part color={ROOF_TILE} opacity={opacity} position={[0, 0.78, 0]} rotation={[0, Math.PI / 4, 0]} scale={[1, 1, 0.76]}>
        <coneGeometry args={[0.5, 0.2, 4]} />
      </Part>
      {[0.16, 0.36, 0.56].flatMap((y) =>
        [-0.2, 0, 0.2].map((x) => (
          <Part key={`${x}${y}`} color="#4a3526" opacity={opacity} position={[x, y, 0.251]}>
            <boxGeometry args={[0.08, 0.1, 0.01]} />
          </Part>
        )),
      )}
      <Part color="#6b4a2b" opacity={opacity} position={[0, 0.07, 0.252]}>
        <boxGeometry args={[0.12, 0.14, 0.01]} />
      </Part>
      <Part color="#d9c294" opacity={opacity} position={[0.33, 0.24, -0.1]}>
        <boxGeometry args={[0.2, 0.48, 0.3]} />
      </Part>
    </group>
  );
}

// A long low stone building over a drain of running water.
export function LatrineModel({ opacity }: ModelProps) {
  return (
    <group>
      <Part color={STONE} opacity={opacity} position={[0, 0.13, -0.08]}>
        <boxGeometry args={[0.7, 0.26, 0.34]} />
      </Part>
      <Part color={ROOF_TILE} opacity={opacity} position={[0, 0.29, -0.08]}>
        <boxGeometry args={[0.76, 0.05, 0.4]} />
      </Part>
      {[-0.2, 0, 0.2].map((x) => (
        <Part key={x} color="#4a3526" opacity={opacity} position={[x, 0.1, 0.091]}>
          <boxGeometry args={[0.1, 0.16, 0.01]} />
        </Part>
      ))}
      <Part color={STONE_DARK} opacity={opacity} position={[0, 0.02, 0.26]}>
        <boxGeometry args={[0.9, 0.04, 0.16]} />
      </Part>
      <Part color={WATER} opacity={opacity} position={[0, 0.042, 0.26]} roughness={0.15}>
        <boxGeometry args={[0.9, 0.01, 0.08]} />
      </Part>
    </group>
  );
}

// A domed bathhouse with a pool in front and steam rising.
export function BathsModel({ opacity }: ModelProps) {
  const steam = useRef<Mesh[]>([]);
  useFrame(({ clock }) => {
    steam.current.forEach((m, i) => {
      if (!m) return;
      const k = (clock.elapsedTime * 0.35 + i / 3) % 1;
      m.position.y = 0.12 + k * 0.5;
      m.scale.setScalar(0.5 + k);
      (m.material as { opacity: number }).opacity = 0.45 * (1 - k) * opacity;
    });
  });
  return (
    <group>
      <Part color={MARBLE} opacity={opacity} position={[0, 0.16, -0.12]}>
        <boxGeometry args={[0.64, 0.32, 0.4]} />
      </Part>
      <Part color="#b8b0a2" opacity={opacity} position={[0, 0.32, -0.12]}>
        <sphereGeometry args={[0.2, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </Part>
      <Part color={STONE} opacity={opacity} position={[0, 0.03, 0.26]}>
        <boxGeometry args={[0.62, 0.06, 0.32]} />
      </Part>
      <Part color={WATER} opacity={opacity} position={[0, 0.061, 0.26]} roughness={0.1}>
        <boxGeometry args={[0.5, 0.01, 0.22]} />
      </Part>
      {[-0.12, 0.05, 0.18].map((x, i) => (
        <mesh
          key={x}
          ref={(m) => {
            if (m) steam.current[i] = m;
          }}
          position={[x, 0.2, 0.26]}
        >
          <sphereGeometry args={[0.05, 6, 5]} />
          <meshStandardMaterial color="#ffffff" transparent opacity={0.4} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

// Market stalls with striped awnings, crates and jars.
export function MarketModel({ opacity }: ModelProps) {
  return (
    <group>
      {[
        [-0.25, -0.12, "#c0392b"],
        [0.22, 0.02, "#2e7fbf"],
        [-0.05, 0.3, "#d4a017"],
      ].map(([x, z, awning]) => (
        <group key={String(x)} position={[x as number, 0, z as number]}>
          <Part color="#8b5a2b" opacity={opacity} position={[0, 0.08, 0]}>
            <boxGeometry args={[0.3, 0.16, 0.2]} />
          </Part>
          {[-0.13, 0.13].map((px) => (
            <Log key={px} opacity={opacity} position={[px, 0.2, -0.09]} rotation={[0, 0, 0]} length={0.4} radius={0.012} />
          ))}
          <Part color={awning as string} opacity={opacity} position={[0, 0.38, 0]} rotation={[0.35, 0, 0]}>
            <boxGeometry args={[0.36, 0.02, 0.28]} />
          </Part>
          <Part color="#f4efe6" opacity={opacity} position={[0, 0.385, 0]} rotation={[0.35, 0, 0]}>
            <boxGeometry args={[0.08, 0.021, 0.28]} />
          </Part>
          <Part color="#e0a030" opacity={opacity} position={[-0.06, 0.19, 0.02]}>
            <sphereGeometry args={[0.035, 6, 5]} />
          </Part>
          <Part color="#7fb03a" opacity={opacity} position={[0.06, 0.19, 0.03]}>
            <sphereGeometry args={[0.035, 6, 5]} />
          </Part>
        </group>
      ))}
      <Part color={CLAY} opacity={opacity} position={[0.35, 0.09, 0.32]}>
        <cylinderGeometry args={[0.04, 0.06, 0.18, 8]} />
      </Part>
    </group>
  );
}

// A marble portico: steps, four columns and a triangular pediment.
export function AcademyModel({ opacity }: ModelProps) {
  return (
    <group>
      <Part color={STONE} opacity={opacity} position={[0, 0.03, 0]}>
        <boxGeometry args={[0.82, 0.06, 0.6]} />
      </Part>
      <Part color={MARBLE} opacity={opacity} position={[0, 0.08, 0]}>
        <boxGeometry args={[0.74, 0.04, 0.52]} />
      </Part>
      <Part color={MARBLE} opacity={opacity} position={[0, 0.26, -0.1]}>
        <boxGeometry args={[0.6, 0.32, 0.26]} />
      </Part>
      {[-0.3, -0.1, 0.1, 0.3].map((x) => (
        <Part key={x} color={MARBLE} opacity={opacity} position={[x, 0.26, 0.17]}>
          <cylinderGeometry args={[0.035, 0.04, 0.32, 8]} />
        </Part>
      ))}
      <Part color="#ddd5c6" opacity={opacity} position={[0, 0.45, 0.02]}>
        <boxGeometry args={[0.74, 0.05, 0.5]} />
      </Part>
      {/* A triangular prism (a 3-sided cylinder) lying front to back, point up. */}
      <Part color={MARBLE} opacity={opacity} position={[0, 0.5, 0.02]} rotation={[-Math.PI / 2, 0, 0]} scale={[1, 1, 0.35]}>
        <cylinderGeometry args={[0.43, 0.43, 0.5, 3]} />
      </Part>
    </group>
  );
}

export const MODELS: Record<string, (props: ModelProps) => JSX.Element> = {
  well: WellModel,
  aqueduct: AqueductModel,
  watermill: WatermillModel,
  townhouse: TownHouseModel,
  latrine: LatrineModel,
  baths: BathsModel,
  market: MarketModel,
  academy: AcademyModel,
  house: HouseModel,
  school: SchoolModel,
  smithy: SmithyModel,
  canal: CanalModel,
  granary: GranaryModel,
  forester: ForesterModel,
  walls: WallsModel,
  pen: PenModel,
  campfire: CampfireModel,
  hut: HutModel,
  gatherer: GathererModel,
  woodcutter: WoodcutterModel,
  fishing: FishingModel,
  quarry: QuarryModel,
  elder: ElderModel,
  healer: HealerModel,
  farm: FarmModel,
  warcamp: WarCampModel,
  watchfire: WatchFireModel,
};
