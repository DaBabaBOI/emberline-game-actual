"use client";

import { useLayoutEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, DoubleSide, InstancedMesh, Matrix4, Object3D } from "three";
import { highlight } from "./crowd";

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
  // Working at a building (dropped there to help).
  working?: boolean;
  // How they work there: a tool they swing (hoe, axe, pick, hammer, shovel),
  // something held in both hands (a book to read, a load to carry), or
  // kneeling in prayer.
  workTool?: WorkTool;
  // Being carried by the player.
  held?: boolean;
  // 0–1: how far the figure has toppled over (fire victims).
  fallen?: number;
  // A gold crown (the team cameos, an easter egg).
  crown?: boolean;
}

export type WorkTool = "hoe" | "axe" | "pick" | "hammer" | "shovel" | "book" | "carry" | "pray";
const STRIKES: WorkTool[] = ["hoe", "axe", "pick", "hammer", "shovel"];
const strikes = (tool?: WorkTool) => !tool || STRIKES.includes(tool);
// What's in their hands, by kind: [size across, up, through, colour].
const HELD: Partial<Record<WorkTool, [number, number, number, string]>> = {
  book: [0.075, 0.095, 0.022, "#8b2b2b"],
  carry: [0.13, 0.09, 0.09, "#9a6a3a"],
};

// How someone dropped on a building works there (none listed: they help by hand).
export const WORK_TOOLS: Record<string, WorkTool> = {
  woodcutter: "axe",
  quarry: "pick",
  farm: "hoe",
  gatherer: "hoe",
  pen: "hoe",
  forester: "hoe",
  vfarm: "hoe",
  smithy: "hammer",
  factory: "hammer",
  shipyard: "hammer",
  guildhall: "hammer",
  station: "hammer",
  coalplant: "shovel",
  elder: "book",
  school: "book",
  academy: "book",
  university: "book",
  library: "book",
  market: "carry",
  granary: "carry",
  tradingpost: "carry",
  harbour: "carry",
  dock: "carry",
  well: "carry",
  baths: "carry",
  latrine: "carry",
  healer: "carry",
  hospital: "carry",
  shrine: "pray",
  temple: "pray",
  cathedral: "pray",
};

export const SKINS = ["#f1c7a0", "#e0ac69", "#c68642", "#8d5524", "#f5d0b0"];
export const HAIRS = ["#2b1b10", "#4a2f1b", "#1a1a1a", "#7a4a22", "#a0703c"];

const HIGHLIGHT = "#ffd23f";

const fig = new Object3D();
const local = new Object3D();
const out = new Matrix4();

// Arms hang from shoulders at this height and are this long.
const SHOULDER = 0.37;
const HANDLE = 0.32;
const ARM = 0.15;

// Where a hand is (in the figure's own space, facing +z) for an arm swung
// forward by `swing` (negative = forward/up) and tilted sideways by `tilt`.
function handAt(side: number, swing: number, tilt: number, along = ARM) {
  return {
    x: 0.078 * side + along * Math.sin(tilt),
    y: SHOULDER - along * Math.cos(tilt) * Math.cos(swing),
    z: -along * Math.cos(tilt) * Math.sin(swing),
  };
}

// A work stroke, 0–1 through the cycle: lift the tool slowly overhead, bring it
// down fast, and leave it in the ground a moment. Returns the arms' swing angle
// and how hard it just hit (for the puff of dirt).
function workStroke(t: number, phase: number) {
  const p = (t * 0.7 + phase / (Math.PI * 2)) % 1;
  const LOW = -0.75; // arms forward and down: tool in the ground
  const HIGH = -2.7; // arms up over the head
  if (p < 0.55) {
    const k = p / 0.55;
    return { swing: LOW + (HIGH - LOW) * (k * k * (3 - 2 * k)), hit: 0 };
  }
  if (p < 0.68) {
    const k = (p - 0.55) / 0.13;
    return { swing: HIGH + (LOW - HIGH) * k * k, hit: 0 };
  }
  return { swing: LOW, hit: 1 - (p - 0.68) / 0.32 };
}

// Puts `obj` so a stick of `length` (built along y, like a cylinder) points
// along `angle` in the figure's side plane, its grip (`grip` from the low end)
// in the hand. `angle` uses the arms' convention: 0 = straight down,
// -PI/2 = straight ahead, -PI = straight up.
function holdStick(obj: Object3D, hand: { x: number; y: number; z: number }, angle: number, length: number, grip: number) {
  const dy = -Math.cos(angle);
  const dz = -Math.sin(angle);
  const fromHand = length / 2 - grip;
  obj.rotation.set(angle + Math.PI, 0, 0);
  obj.position.set(hand.x, hand.y + dy * fromHand, hand.z + dz * fromHand);
}

// Renders a crowd of little people with a handful of instanced meshes: legs
// and arms swing while walking. Agents are mutated in place by the owner.
export function Figures({
  agents,
  max,
  weapon,
  gear,
  colorKey = "",
  group,
}: {
  agents: React.RefObject<Agent[]>;
  max: number;
  weapon?: "spear" | "club" | "sword";
  // "roman": crested bronze helmet and a big curved red shield.
  gear?: "roman";
  // Change this when agents' colours change so they get repainted.
  colorKey?: string | number;
  // Which top-bar counter these figures belong to (for the highlight).
  group?: "people" | "warriors";
}) {
  const torso = useRef<InstancedMesh>(null);
  const head = useRef<InstancedMesh>(null);
  const hair = useRef<InstancedMesh>(null);
  const crown = useRef<InstancedMesh>(null);
  const legs = useRef<InstancedMesh>(null);
  const arms = useRef<InstancedMesh>(null);
  const tool = useRef<InstancedMesh>(null);
  const helmet = useRef<InstancedMesh>(null);
  const crest = useRef<InstancedMesh>(null);
  const shield = useRef<InstancedMesh>(null);
  const marker = useRef<InstancedMesh>(null);
  // Workers' tools (handle and head) and the dirt or chips their strokes kick up.
  const handle = useRef<InstancedMesh>(null);
  const toolHead = useRef<InstancedMesh>(null);
  const dust = useRef<InstancedMesh>(null);
  // The stone point on a spear.
  const tip = useRef<InstancedMesh>(null);
  const colored = useRef("");

  useLayoutEffect(() => {
    colored.current = "";
  });

  useFrame(({ clock }) => {
    const list = agents.current ?? [];
    const n = Math.min(list.length, max);
    const t = clock.elapsedTime;

    const lit = !!group && highlight.group === group;
    const paintKey = `${n}|${colorKey}|${lit}`;
    if (colored.current !== paintKey) {
      const c = new Color();
      list.slice(0, n).forEach((a, i) => {
        torso.current?.setColorAt(i, c.set(lit ? HIGHLIGHT : a.tunic));
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
      // Working: both hands on the tool, lifting it overhead and bringing it down.
      const work = a.working && strikes(a.workTool) && !a.moving && !a.held ? workStroke(t, a.phase).swing : null;
      // Or holding something in both hands (also while walking with a load), or praying.
      const holding = !!a.working && !a.held && !!HELD[a.workTool!] && (a.workTool === "carry" || !a.moving);
      const praying = !!a.working && !a.held && a.workTool === "pray" && !a.moving;
      // Reading: the book rises and falls a little as the pages turn.
      const hold = holding ? (a.workTool === "book" ? -1.05 + Math.sin(t * 1.3 + a.phase) * 0.06 : -1.3) : null;
      const bob = a.moving ? Math.abs(Math.sin(t * 9 + a.phase)) * 0.015 : 0;
      // Sitting on a log: hips drop to the top of the log, legs reach down and
      // forward to the ground, hands out to the fire. Praying: down on the knees.
      fig.position.set(a.x, a.y + bob - (praying ? 0.15 * a.scale : a.sitting ? 0.075 * a.scale : 0), a.z);
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
      local.position.set(0, 0.525, 0);
      local.scale.setScalar(a.crown ? 1 : 0.0001);
      put(crown.current, i);
      local.scale.set(1, 1, 1);

      // The weapon arm stays bent forward, gripping it, with only a small swing.
      const weaponArm = weapon && work === null && !a.sitting ? -0.7 + swing * 0.15 : null;
      for (const side of [-1, 1]) {
        const k = side < 0 ? 0 : 1;
        const legAngle = praying ? -Math.PI / 2 + 0.15 : a.sitting ? -0.85 : (holding ? swing * 0.6 : swing) * side;
        local.rotation.set(legAngle, 0, 0);
        local.position.set(0.035 * side, 0.19 - 0.09 * Math.cos(legAngle), -0.09 * Math.sin(legAngle));
        put(legs.current, i * 2 + k);

        const armSwing =
          work !== null
            ? work
            : hold !== null
              ? hold
              : praying
                ? -2.75 + Math.sin(t * 0.9 + a.phase) * 0.08
                : a.sitting
                  ? -0.75
                  : side > 0 && weaponArm !== null
                    ? weaponArm
                    : -swing * side * 0.8;
        // Both hands meet on the tool's handle (or the book, or the load).
        const tilt = work !== null ? -side * 0.4 : hold !== null ? -side * 0.3 : praying ? -side * 0.15 : side * 0.12;
        const mid = handAt(side, armSwing, tilt, ARM / 2);
        local.rotation.set(armSwing, 0, tilt);
        local.position.set(mid.x, mid.y, mid.z);
        put(arms.current, i * 2 + k);
      }

      if (weapon && tool.current) {
        // Held in the right hand: a spear upright and tilted forward, a club or
        // sword raised ready in front.
        const hand = handAt(1, weaponArm ?? (a.sitting ? -0.75 : 0), 0.12);
        if (weapon === "spear") {
          holdStick(local, hand, -2.75, 0.6, 0.2);
          put(tool.current, i);
          // The stone point at the top end.
          const d = { y: -Math.cos(-2.75), z: -Math.sin(-2.75) };
          local.position.set(hand.x, hand.y + d.y * 0.42, hand.z + d.z * 0.42);
          put(tip.current, i);
        } else if (weapon === "sword") {
          holdStick(local, hand, -2.55, 0.2, 0.0);
          put(tool.current, i);
        } else {
          holdStick(local, hand, -2.6, 0.2, 0.02);
          put(tool.current, i);
        }
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

    // A yellow marker bobbing over each highlighted figure (hidden otherwise).
    for (let i = 0; i < n; i++) {
      const a = list[i];
      fig.position.set(a.x, a.y + 0.75 * a.scale + Math.sin(t * 4 + i) * 0.04, a.z);
      fig.rotation.set(0, t * 2, 0);
      fig.scale.setScalar(lit ? a.scale : 0.0001);
      fig.updateMatrix();
      marker.current?.setMatrixAt(i, fig.matrix);
    }

    // Tools in hand while working (hidden, scaled to nothing, otherwise). The
    // handle runs on from the hands, a little steeper than the arms, so the
    // head ends up overhead on the lift and in the ground on the stroke.
    const paint = new Color();
    for (let i = 0; i < n; i++) {
      const a = list[i];
      const busy = !!a.working && strikes(a.workTool) && !a.moving && !a.held;
      const held = a.working && !a.held ? HELD[a.workTool!] : undefined;
      const holding = !!held && (a.workTool === "carry" || !a.moving);
      if (holding) {
        // A book or a load in both hands, in front of the chest: no handle.
        fig.position.set(a.x, a.y, a.z);
        fig.rotation.set(0, a.heading, 0, "YXZ");
        fig.scale.setScalar(a.scale);
        fig.updateMatrix();
        const lift = a.workTool === "book" ? -1.05 + Math.sin(t * 1.3 + a.phase) * 0.06 : -1.3;
        const hand = handAt(1, lift, -0.3);
        local.rotation.set(a.workTool === "book" ? -0.5 : 0, 0, 0);
        local.scale.set(0.0001, 0.0001, 0.0001);
        local.position.set(0, hand.y, hand.z);
        put(handle.current, i);
        local.scale.set(held[0], held[1], held[2]);
        local.position.set(0, hand.y + (a.workTool === "carry" ? 0.03 : 0.01), hand.z + 0.03);
        put(toolHead.current, i);
        toolHead.current?.setColorAt(i, paint.set(held[3]));
        local.scale.setScalar(0.0001);
        put(dust.current, i);
        continue;
      }
      toolHead.current?.setColorAt(i, paint.set("#7d7f84"));
      fig.position.set(a.x, a.y, a.z);
      fig.rotation.set(0, a.heading, 0, "YXZ");
      fig.scale.setScalar(busy ? a.scale : 0.0001);
      fig.updateMatrix();
      const { swing, hit } = workStroke(t, a.phase);
      const hand = handAt(1, swing, -0.4);
      hand.x = 0;
      const angle = 1.6 * swing + 0.55;
      local.scale.set(1, 1, 1);
      holdStick(local, hand, angle, HANDLE, 0.04);
      put(handle.current, i);
      // The head at the far end, sticking out on the side it strikes with: a
      // flat blade (hoe), a wedge (axe) or a point both ways (pick).
      const d = { y: -Math.cos(angle), z: -Math.sin(angle) };
      const lead = { y: Math.sin(angle), z: -Math.cos(angle) };
      const end = HANDLE - 0.04;
      // A hammer is a heavy block; a shovel a wide, flat scoop.
      const shape =
        a.workTool === "axe"
          ? { out: 0.03, w: 0.014, l: 0.05, t: 0.045 }
          : a.workTool === "pick"
            ? { out: 0, w: 0.016, l: 0.13, t: 0.016 }
            : a.workTool === "hammer"
              ? { out: 0, w: 0.045, l: 0.07, t: 0.045 }
              : a.workTool === "shovel"
                ? { out: 0.02, w: 0.07, l: 0.08, t: 0.014 }
                : { out: 0.03, w: 0.06, l: 0.06, t: 0.012 };
      local.rotation.set(angle - Math.PI / 2, 0, 0);
      local.scale.set(shape.w, shape.l, shape.t);
      local.position.set(0, hand.y + d.y * end + lead.y * shape.out, hand.z + d.z * end + lead.z * shape.out);
      put(toolHead.current, i);
      // A puff of dirt (or wood chips) where the tool hits the ground.
      const puff = busy ? hit * hit : 0;
      local.rotation.set(0, 0, 0);
      local.scale.setScalar(Math.max(0.0001, puff));
      local.position.set(0, 0.03 + (1 - hit) * 0.05, hand.z + d.z * end);
      put(dust.current, i);
    }

    if (toolHead.current?.instanceColor) toolHead.current.instanceColor.needsUpdate = true;
    for (const m of [torso, head, hair, crown, tool, tip, helmet, crest, shield, marker, handle, toolHead, dust]) if (m.current) m.current.count = n;
    for (const m of [legs, arms]) if (m.current) m.current.count = n * 2;
    for (const m of [torso, head, hair, crown, legs, arms, tool, tip, helmet, crest, shield, marker, handle, toolHead, dust]) {
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
      <instancedMesh ref={crown} args={[undefined, undefined, max]} {...common}>
        <cylinderGeometry args={[0.052, 0.046, 0.05, 6, 1, true]} />
        <meshStandardMaterial color="#ffd23f" emissive="#b8860b" emissiveIntensity={0.5} metalness={0.6} roughness={0.3} side={DoubleSide} />
      </instancedMesh>
      <instancedMesh ref={marker} args={[undefined, undefined, max]} frustumCulled={false} raycast={() => null}>
        <octahedronGeometry args={[0.06, 0]} />
        <meshStandardMaterial color={HIGHLIGHT} emissive={HIGHLIGHT} emissiveIntensity={0.8} />
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
        <cylinderGeometry args={[0.009, 0.009, HANDLE, 5]} />
        <meshStandardMaterial color="#8a6a45" />
      </instancedMesh>
      <instancedMesh ref={toolHead} args={[undefined, undefined, max]} {...common}>
        <boxGeometry args={[1, 1, 1]} />
        {/* Coloured per figure: grey metal for tools, red for a book, wood for a load. */}
        <meshStandardMaterial color="#ffffff" metalness={0.2} />
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
            <cylinderGeometry args={[0.026, 0.012, 0.2, 6]} />
          )}
          <meshStandardMaterial
            color={weapon === "spear" ? "#8a6a45" : weapon === "sword" ? "#c9ccd1" : "#7a5230"}
            metalness={weapon === "sword" ? 0.7 : 0.1}
          />
        </instancedMesh>
      )}
      {weapon === "spear" && (
        <instancedMesh ref={tip} args={[undefined, undefined, max]} {...common}>
          <coneGeometry args={[0.022, 0.07, 5]} />
          <meshStandardMaterial color="#6e6a64" flatShading />
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
