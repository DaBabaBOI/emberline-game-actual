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
  // Working at a building (dropped there to help): hoeing or chopping.
  working?: boolean;
  // What they work with: a hoe in the fields, an axe at the woodcutter...
  workTool?: "hoe" | "axe" | "pick";
  // Being carried by the player.
  held?: boolean;
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
  gear,
  colorKey = "",
}: {
  agents: React.RefObject<Agent[]>;
  max: number;
  weapon?: "spear" | "club" | "sword";
  // "roman": crested bronze helmet and a big curved red shield.
  gear?: "roman";
  // Change this when agents' colours change so they get repainted.
  colorKey?: string | number;
}) {
  const torso = useRef<InstancedMesh>(null);
  const head = useRef<InstancedMesh>(null);
  const hair = useRef<InstancedMesh>(null);
  const legs = useRef<InstancedMesh>(null);
  const arms = useRef<InstancedMesh>(null);
  const tool = useRef<InstancedMesh>(null);
  const helmet = useRef<InstancedMesh>(null);
  const crest = useRef<InstancedMesh>(null);
  const shield = useRef<InstancedMesh>(null);
  // Workers' tools (handle and head) and the dirt or chips their strokes kick up.
  const handle = useRef<InstancedMesh>(null);
  const toolHead = useRef<InstancedMesh>(null);
  const dust = useRef<InstancedMesh>(null);
  const colored = useRef("");

  useLayoutEffect(() => {
    colored.current = "";
  });

  useFrame(({ clock }) => {
    const list = agents.current ?? [];
    const n = Math.min(list.length, max);
    const t = clock.elapsedTime;

    const paintKey = `${n}|${colorKey}`;
    if (colored.current !== paintKey) {
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
      colored.current = paintKey;
    }

    const put = (mesh: InstancedMesh | null, i: number) => {
      local.updateMatrix();
      out.multiplyMatrices(fig.matrix, local.matrix);
      mesh?.setMatrixAt(i, out);
    };

    for (let i = 0; i < n; i++) {
      const a = list[i];
      const swing = a.moving ? Math.sin(t * 9 + a.phase) * 0.6 : 0;
      // Working: both arms raise and bring a tool down, over and over.
      const stroke = Math.max(0, Math.sin(t * 5 + a.phase));
      const work = a.working && !a.moving ? -1.3 + stroke * 1.1 : null;
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

        const armSwing = work !== null ? work : a.sitting ? -0.75 : -swing * side * 0.8;
        local.rotation.set(armSwing, 0, side * 0.12);
        local.position.set(0.078 * side, 0.37 - 0.075 * Math.cos(armSwing), -0.075 * Math.sin(armSwing));
        put(arms.current, i * 2 + k);
      }

      if (weapon && tool.current) {
        local.rotation.set(weapon === "spear" ? 0.15 : weapon === "sword" ? -1.1 : -0.6, 0, 0);
        local.position.set(0.1, weapon === "spear" ? 0.4 : weapon === "sword" ? 0.3 : 0.34, weapon === "sword" ? 0.08 : 0.04);
        put(tool.current, i);
      }
      if (gear === "roman") {
        local.rotation.set(0, 0, 0);
        local.scale.set(1, 1, 1);
        local.position.set(0, 0.47, 0);
        put(helmet.current, i);
        local.position.set(0, 0.54, 0);
        put(crest.current, i);
        local.position.set(-0.1, 0.3, 0.05);
        local.rotation.set(0, 0.25, 0);
        put(shield.current, i);
      }
    }

    // Tools in hand while working (hidden, scaled to nothing, otherwise).
    for (let i = 0; i < n; i++) {
      const a = list[i];
      const busy = !!a.working && !a.moving && !a.held;
      fig.position.set(a.x, a.y, a.z);
      fig.rotation.set(0, a.heading, 0, "YXZ");
      fig.scale.setScalar(busy ? a.scale : 0.0001);
      fig.updateMatrix();
      const stroke = Math.max(0, Math.sin(t * 5 + a.phase));
      // The tool swings with the arms: up behind the head, then down in front.
      const swingAngle = -1.3 + stroke * 1.1;
      local.scale.set(1, 1, 1);
      local.rotation.set(swingAngle - 0.6, 0, 0);
      local.position.set(0.0, 0.34 - 0.12 * Math.cos(swingAngle), -0.12 * Math.sin(swingAngle) + 0.04);
      put(handle.current, i);
      // The head sits at the far end of the handle, across it (hoe) or along it (axe).
      const reach = 0.17;
      local.position.set(0, 0.34 - (0.12 + reach) * Math.cos(swingAngle - 0.3), -(0.12 + reach) * Math.sin(swingAngle - 0.3) + 0.04);
      local.rotation.set(swingAngle + (a.workTool === "axe" ? 0 : 0.9), a.workTool === "axe" ? Math.PI / 2 : 0, 0);
      put(toolHead.current, i);
      // A puff of dirt (or wood chips) as the tool hits the ground.
      const puff = busy ? Math.max(0, 0.25 - stroke) * 4 : 0;
      local.rotation.set(0, 0, 0);
      local.scale.setScalar(Math.max(0.0001, puff));
      local.position.set(0, 0.03 + puff * 0.04, 0.24);
      put(dust.current, i);
    }

    for (const m of [torso, head, hair, tool, helmet, crest, shield, handle, toolHead, dust]) if (m.current) m.current.count = n;
    for (const m of [legs, arms]) if (m.current) m.current.count = n * 2;
    for (const m of [torso, head, hair, legs, arms, tool, helmet, crest, shield, handle, toolHead, dust]) {
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
      <instancedMesh ref={handle} args={[undefined, undefined, max]} {...common}>
        <cylinderGeometry args={[0.009, 0.009, 0.32, 5]} />
        <meshStandardMaterial color="#8a6a45" />
      </instancedMesh>
      <instancedMesh ref={toolHead} args={[undefined, undefined, max]} {...common}>
        <boxGeometry args={[0.07, 0.025, 0.05]} />
        <meshStandardMaterial color="#7d7f84" metalness={0.4} />
      </instancedMesh>
      <instancedMesh ref={dust} args={[undefined, undefined, max]} frustumCulled={false} raycast={() => null}>
        <sphereGeometry args={[0.035, 6, 5]} />
        <meshStandardMaterial color="#9b7a4e" transparent opacity={0.7} depthWrite={false} />
      </instancedMesh>
      {weapon && (
        <instancedMesh ref={tool} args={[undefined, undefined, max]} {...common}>
          {weapon === "spear" ? (
            <cylinderGeometry args={[0.008, 0.008, 0.6, 5]} />
          ) : weapon === "sword" ? (
            <boxGeometry args={[0.015, 0.2, 0.03]} />
          ) : (
            <cylinderGeometry args={[0.03, 0.014, 0.22, 6]} />
          )}
          <meshStandardMaterial
            color={weapon === "spear" ? "#8a6a45" : weapon === "sword" ? "#c9ccd1" : "#5b3b22"}
            metalness={weapon === "sword" ? 0.7 : 0.1}
          />
        </instancedMesh>
      )}
      {gear === "roman" && (
        <>
          <instancedMesh ref={helmet} args={[undefined, undefined, max]} {...common}>
            <sphereGeometry args={[0.066, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#c89b3c" metalness={0.6} roughness={0.35} />
          </instancedMesh>
          <instancedMesh ref={crest} args={[undefined, undefined, max]} {...common}>
            <boxGeometry args={[0.02, 0.05, 0.1]} />
            <meshStandardMaterial color="#d62d2d" />
          </instancedMesh>
          <instancedMesh ref={shield} args={[undefined, undefined, max]} {...common}>
            <boxGeometry args={[0.025, 0.24, 0.15]} />
            <meshStandardMaterial color="#a8201a" />
          </instancedMesh>
        </>
      )}
    </group>
  );
}
