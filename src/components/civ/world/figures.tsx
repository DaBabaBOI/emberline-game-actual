"use client";

import { useLayoutEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, InstancedMesh, Matrix4, Object3D } from "three";

export interface Agent {
  x: number;
  y: number;
  z: number;
  heading: number;
  moving: boolean;
  scale: number;
  tunic: string;
  skin: string;
  hair: string;
  phase: number;
  sitting?: boolean;
  // 0–1: how far the figure has toppled over (fire victims).
  fallen?: number;
}

export const SKINS = ["#f1c7a0", "#e0ac69", "#c68642", "#8d5524", "#f5d0b0"];
export const HAIRS = ["#2b1b10", "#4a2f1b", "#1a1a1a", "#7a4a22", "#a0703c"];

const fig = new Object3D();
const local = new Object3D();
const out = new Matrix4();

// Renders a crowd of little people with a handful of instanced meshes: legs
// and arms swing while walking. Agents are mutated in place by the owner.
export function Figures({
  agents,
  max,
  weapon,
}: {
  agents: React.RefObject<Agent[]>;
  max: number;
  weapon?: "spear" | "club";
}) {
  const torso = useRef<InstancedMesh>(null);
  const head = useRef<InstancedMesh>(null);
  const hair = useRef<InstancedMesh>(null);
  const legs = useRef<InstancedMesh>(null);
  const arms = useRef<InstancedMesh>(null);
  const tool = useRef<InstancedMesh>(null);
  const colored = useRef(0);

  useLayoutEffect(() => {
    colored.current = -1;
  });

  useFrame(({ clock }) => {
    const list = agents.current ?? [];
    const n = Math.min(list.length, max);
    const t = clock.elapsedTime;

    if (colored.current !== n) {
      const c = new Color();
      list.slice(0, n).forEach((a, i) => {
        torso.current?.setColorAt(i, c.set(a.tunic));
        head.current?.setColorAt(i, c.set(a.skin));
        hair.current?.setColorAt(i, c.set(a.hair));
        arms.current?.setColorAt(i * 2, c.set(a.skin));
        arms.current?.setColorAt(i * 2 + 1, c.set(a.skin));
      });
      for (const m of [torso, head, hair, arms]) {
        if (m.current?.instanceColor) m.current.instanceColor.needsUpdate = true;
      }
      colored.current = n;
    }

    const put = (mesh: InstancedMesh | null, i: number) => {
      local.updateMatrix();
      out.multiplyMatrices(fig.matrix, local.matrix);
      mesh?.setMatrixAt(i, out);
    };

    for (let i = 0; i < n; i++) {
      const a = list[i];
      const swing = a.moving ? Math.sin(t * 9 + a.phase) * 0.6 : 0;
      const bob = a.moving ? Math.abs(Math.sin(t * 9 + a.phase)) * 0.015 : 0;
      // Sitting: hips drop to the ground, legs point forward, hands reach out.
      fig.position.set(a.x, a.y + bob - (a.sitting ? 0.15 * a.scale : 0), a.z);
      // Toppling pivots at the feet, forward along the way they face.
      fig.rotation.set(((a.fallen ?? 0) * Math.PI) / 2, a.heading, 0, "YXZ");
      fig.scale.setScalar(a.scale);
      fig.updateMatrix();

      local.scale.set(1, 1, 1);
      local.rotation.set(0, 0, 0);
      local.position.set(0, 0.29, 0);
      put(torso.current, i);
      local.position.set(0, 0.45, 0);
      put(head.current, i);
      local.position.set(0, 0.475, -0.005);
      local.scale.set(1, 0.62, 1);
      put(hair.current, i);
      local.scale.set(1, 1, 1);

      for (const side of [-1, 1]) {
        const k = side < 0 ? 0 : 1;
        const legAngle = a.sitting ? -Math.PI / 2 + 0.15 : swing * side;
        local.rotation.set(legAngle, 0, 0);
        local.position.set(0.035 * side, 0.19 - 0.09 * Math.cos(legAngle), -0.09 * Math.sin(legAngle));
        put(legs.current, i * 2 + k);

        const armSwing = a.sitting ? -0.75 : -swing * side * 0.8;
        local.rotation.set(armSwing, 0, side * 0.12);
        local.position.set(0.078 * side, 0.37 - 0.075 * Math.cos(armSwing), -0.075 * Math.sin(armSwing));
        put(arms.current, i * 2 + k);
      }

      if (weapon && tool.current) {
        local.rotation.set(weapon === "spear" ? 0.15 : -0.6, 0, 0);
        local.position.set(0.1, weapon === "spear" ? 0.4 : 0.34, 0.04);
        put(tool.current, i);
      }
    }

    for (const m of [torso, head, hair, tool]) if (m.current) m.current.count = n;
    for (const m of [legs, arms]) if (m.current) m.current.count = n * 2;
    for (const m of [torso, head, hair, legs, arms, tool]) {
      if (m.current) m.current.instanceMatrix.needsUpdate = true;
    }
  });

  const common = { castShadow: true, frustumCulled: false, raycast: () => null } as const;
  return (
    <group>
      <instancedMesh ref={torso} args={[undefined, undefined, max]} {...common}>
        <cylinderGeometry args={[0.058, 0.072, 0.2, 8]} />
        <meshStandardMaterial />
      </instancedMesh>
      <instancedMesh ref={head} args={[undefined, undefined, max]} {...common}>
        <sphereGeometry args={[0.058, 12, 10]} />
        <meshStandardMaterial />
      </instancedMesh>
      <instancedMesh ref={hair} args={[undefined, undefined, max]} {...common}>
        <sphereGeometry args={[0.062, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial />
      </instancedMesh>
      <instancedMesh ref={legs} args={[undefined, undefined, max * 2]} {...common}>
        <cylinderGeometry args={[0.024, 0.02, 0.18, 6]} />
        <meshStandardMaterial color="#4a3526" />
      </instancedMesh>
      <instancedMesh ref={arms} args={[undefined, undefined, max * 2]} {...common}>
        <cylinderGeometry args={[0.018, 0.016, 0.15, 6]} />
        <meshStandardMaterial />
      </instancedMesh>
      {weapon && (
        <instancedMesh ref={tool} args={[undefined, undefined, max]} {...common}>
          {weapon === "spear" ? (
            <cylinderGeometry args={[0.008, 0.008, 0.6, 5]} />
          ) : (
            <cylinderGeometry args={[0.03, 0.014, 0.22, 6]} />
          )}
          <meshStandardMaterial color={weapon === "spear" ? "#8a6a45" : "#5b3b22"} />
        </instancedMesh>
      )}
    </group>
  );
}
