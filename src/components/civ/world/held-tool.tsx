"use client";

import { useLayoutEffect, useMemo, useRef, type ReactNode, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, Object3D, type Camera, type Group, type InstancedMesh } from "three";

// First person: what the chief has in hand, seen at the bottom right of the
// view (an axe at a tree, a pick at rock, a hammer while building, a spear or
// a sword in a fight and whenever raiders are about), swung with each blow;
// and the chips that fly off what is struck.

export type HeldKind = "axe" | "pick" | "hammer" | "spear" | "sword";
const KINDS: HeldKind[] = ["axe", "pick", "hammer", "spear", "sword"];

// Drawn over everything (a tool in your hand never sinks into a tree).
function Part({ children, color, top = false, ...rest }: { children: ReactNode; color: string; top?: boolean; position?: [number, number, number]; rotation?: [number, number, number] }) {
  return (
    <mesh renderOrder={top ? 1001 : 1000} {...rest}>
      {children}
      <meshStandardMaterial color={color} depthTest={false} depthWrite={false} roughness={0.7} />
    </mesh>
  );
}

const WOOD = "#7a4a24";
const IRON = "#9aa3ab";

// Each tool with its grip at the origin, along +y.
function Model({ kind }: { kind: HeldKind }) {
  if (kind === "spear")
    return (
      <>
        <Part color={WOOD} position={[0, 0.28, 0]}>
          <cylinderGeometry args={[0.014, 0.016, 0.78, 6]} />
        </Part>
        <Part color="#6b7280" top position={[0, 0.71, 0]}>
          <coneGeometry args={[0.032, 0.1, 5]} />
        </Part>
        <Part color="#5fae4a" top position={[0, 0.63, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 0.03, 6]} />
        </Part>
      </>
    );
  if (kind === "sword")
    return (
      <>
        <Part color="#5a3a1c" position={[0, 0.03, 0]}>
          <cylinderGeometry args={[0.016, 0.016, 0.1, 6]} />
        </Part>
        <Part color="#c9a14a" top position={[0, 0.09, 0]}>
          <boxGeometry args={[0.13, 0.022, 0.03]} />
        </Part>
        <Part color="#dfe5ea" top position={[0, 0.32, 0]}>
          <boxGeometry args={[0.042, 0.44, 0.012]} />
        </Part>
        <Part color="#c9a14a" position={[0, -0.03, 0]}>
          <sphereGeometry args={[0.022, 8, 6]} />
        </Part>
      </>
    );
  return (
    <>
      <Part color={WOOD} position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.017, 0.019, 0.44, 6]} />
      </Part>
      {kind === "axe" && (
        <>
          <Part color={IRON} top position={[0.05, 0.38, 0]}>
            <boxGeometry args={[0.11, 0.08, 0.02]} />
          </Part>
          <Part color="#d9dee3" top position={[0.11, 0.38, 0]}>
            <boxGeometry args={[0.018, 0.11, 0.022]} />
          </Part>
        </>
      )}
      {kind === "pick" && (
        <>
          <Part color={IRON} top position={[0, 0.41, 0]} rotation={[0, 0, 0.12]}>
            <boxGeometry args={[0.26, 0.032, 0.03]} />
          </Part>
          <Part color="#6b7280" top position={[0.13, 0.4, 0]} rotation={[0, 0, -0.5]}>
            <coneGeometry args={[0.017, 0.06, 4]} />
          </Part>
        </>
      )}
      {kind === "hammer" && (
        <Part color="#8a8f96" top position={[0, 0.41, 0]}>
          <boxGeometry args={[0.12, 0.065, 0.065]} />
        </Part>
      )}
    </>
  );
}

export function HeldTool({ toolRef }: { toolRef: RefObject<Group | null> }) {
  return (
    <group ref={toolRef} visible={false}>
      <group>
        {KINDS.map((k) => (
          <group key={k} name={k} visible={false}>
            <Model kind={k} />
          </group>
        ))}
      </group>
    </group>
  );
}

const ease = (k: number) => 1 - Math.pow(1 - k, 3);

// Keeps the tool in front of the camera (call after the camera has moved this
// frame): which tool, raised into view when it changes, bobbing as the chief
// walks, swung (or, a spear, thrust) with each blow.
export function holdTool(
  g: Group | null,
  camera: Camera,
  kind: HeldKind | null,
  held: { kind: HeldKind | null; since: number },
  now: number,
  blowAt: number,
  walking: boolean,
) {
  if (!g) return;
  if (kind !== held.kind) Object.assign(held, { kind, since: now });
  g.visible = !!kind;
  if (!kind) return;
  g.position.copy(camera.position);
  g.quaternion.copy(camera.quaternion);
  const hand = g.children[0];
  for (const c of hand.children) c.visible = c.name === kind;
  const raise = 1 - ease(Math.min(1, (now - held.since) / 180));
  const s = Math.sin(Math.min(1, Math.max(0, (now - blowAt) / 260)) * Math.PI);
  const step = walking ? now / 130 : 0;
  const thrust = kind === "spear";
  hand.scale.setScalar(0.55);
  hand.position.set(
    0.24 + Math.sin(step) * 0.008 - (thrust ? s * 0.03 : 0),
    -0.25 - raise * 0.22 + Math.abs(Math.sin(step)) * 0.01 - (thrust ? 0 : s * 0.04),
    -0.46 - (thrust ? s * 0.16 : s * 0.04),
  );
  hand.rotation.set(thrust ? -1.25 : -0.35 - s * 1.15, thrust ? 0.08 : 0.1, thrust ? 0.05 : 0.38 - s * 0.2);
}

// ---- Chips --------------------------------------------------------------------

const CHIPS = 40;
type Chip = { x: number; y: number; z: number; vx: number; vy: number; vz: number; born: number; color: string; size: number };
const chips: Chip[] = [];

export const CHIP_COLORS = {
  wood: ["#8a5a2b", "#c89b5a", "#5fae4a"],
  stone: ["#8f8a84", "#b9b3ab", "#6b665f"],
  spark: ["#ffd860", "#ff9f3a", "#fff3c0"],
};

// A burst of chips from a point: `n` of them, in these colours.
export function spawnChips(at: { x: number; y: number; z: number }, colors: string[], n = 8, speed = 1.1) {
  const now = performance.now();
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    chips.push({
      x: at.x,
      y: at.y,
      z: at.z,
      vx: Math.cos(a) * speed * (0.4 + Math.random() * 0.6),
      vy: speed * (0.6 + Math.random() * 0.8),
      vz: Math.sin(a) * speed * (0.4 + Math.random() * 0.6),
      born: now,
      color: colors[i % colors.length],
      size: 0.012 + Math.random() * 0.014,
    });
  }
  if (chips.length > CHIPS) chips.splice(0, chips.length - CHIPS);
}

export function Chips() {
  const mesh = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const color = useMemo(() => new Color(), []);
  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    for (let i = 0; i < CHIPS; i++) m.setColorAt(i, color.set("#ffffff"));
  }, [color]);
  useFrame((_, delta) => {
    const m = mesh.current;
    if (!m) return;
    const now = performance.now();
    const dt = Math.min(delta, 0.05);
    let n = 0;
    for (let i = chips.length - 1; i >= 0; i--) {
      const c = chips[i];
      const age = (now - c.born) / 1000;
      if (age > 0.7) {
        chips.splice(i, 1);
        continue;
      }
      c.vy -= 7 * dt;
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.z += c.vz * dt;
      dummy.position.set(c.x, c.y, c.z);
      dummy.rotation.set(age * 9, age * 7, 0);
      dummy.scale.setScalar(c.size * (1 - age * 0.6));
      dummy.updateMatrix();
      m.setMatrixAt(n, dummy.matrix);
      m.setColorAt(n, color.set(c.color));
      n++;
    }
    m.count = n;
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  });
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, CHIPS]} frustumCulled={false} raycast={() => null}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#ffffff" roughness={0.8} />
    </instancedMesh>
  );
}
