"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Object3D, type Group, type InstancedMesh, type PointLight } from "three";
import type { Tile } from "@/game/types";
import type { IconId } from "@/game/sprites";
import { WALKS, fxNow, iconsOf, poseNow, type FxKind, type Now, type SceneLook, type SceneScript } from "@/game/scenes";
import { Figures, type Agent } from "@/components/civ/world/figures";
import { makeGround } from "@/components/civ/world/ground";
import { VoxelIcon } from "./voxel";

// A discovery scene's script, played in 3D: people (the game's own figures)
// and things (pixel icons built of blocks) on a strip of ground in front of the
// camera, moving, growing, riding and working line by line, with the script's
// effects (seeds, sparks, smoke, splashes, dust, leaves, stars, a glow).

export interface ScriptView {
  script: SceneScript;
  line: number;
  // A new scene (the clock starts again).
  key: string;
  sea?: boolean;
  cave?: boolean;
  // Where the strip of ground is (world z).
  stripZ: number;
}

// A person on the stage is this many pixels tall against a 56px icon.
const PX = 0.63 / 56;
const WIDE = 7;
const LOOKS: Record<SceneLook, { tunic: string; hair: string; scale: number }> = {
  villager: { tunic: "#a0522d", hair: "#2b1b10", scale: 1.35 },
  elder: { tunic: "#7e4fb8", hair: "#f2efe8", scale: 1.38 },
  child: { tunic: "#c2956b", hair: "#4a2f1b", scale: 0.95 },
  robot: { tunic: "#9aa4ad", hair: "#5a6670", scale: 1.3 },
};
const SKINS = ["#e0ac69", "#c68642", "#f1c7a0", "#8d5524", "#f5d0b0"];

// A few things are real models rather than flat blocks, so they can be ridden:
// a log lies on the water (a bird can perch on it), a raft is logs lashed
// together (people sit on it). `base`: the size (px) the model is drawn for;
// `seat`: how high a rider sits on it at that size.
const MODELED: Partial<Record<IconId, { base: number; seat: number }>> = { log: { base: 44, seat: 0.09 }, raft: { base: 64, seat: 0.13 } };

function LogModel() {
  return (
    <group position={[0, 0.07, 0]} rotation={[0, 0, Math.PI / 2]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.07, 0.07, 0.56, 10]} />
        <meshStandardMaterial color="#7a4a24" roughness={0.9} />
      </mesh>
      {[-0.281, 0.281].map((y) => (
        <mesh key={y} position={[0, y, 0]}>
          <cylinderGeometry args={[0.064, 0.064, 0.006, 10]} />
          <meshStandardMaterial color="#d8b07a" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

function RaftModel() {
  return (
    <group position={[0, 0.06, 0]}>
      {[-2.5, -1.5, -0.5, 0.5, 1.5, 2.5].map((i) => (
        <mesh key={i} position={[i * 0.12, 0, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.06, 0.06, 0.62 + (Math.abs(i) < 1 ? 0.06 : 0), 8]} />
          <meshStandardMaterial color={i % 2 ? "#7a4a24" : "#8a5a2e"} roughness={0.9} />
        </mesh>
      ))}
      {/* The vines that hold it together. */}
      {[-0.2, 0.2].map((z) => (
        <mesh key={z} position={[0, 0.05, z]}>
          <boxGeometry args={[0.76, 0.025, 0.04]} />
          <meshStandardMaterial color="#4f8a2c" roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}
const backOut = (k: number) => (k >= 1 ? 1 : 1 + 2.2 * Math.pow(k - 1, 3) + 1.2 * Math.pow(k - 1, 2));

export function ScriptedScene({ view, tiles }: { view: ScriptView; tiles: Tile[] }) {
  const ground = useMemo(() => makeGround(tiles), [tiles]);
  const entries = useMemo(() => Object.entries(view.script.things), [view.script]);
  const things = entries.filter(([, t]) => !t.person);
  const groups = useRef<Record<string, Group | null>>({});
  const icons = useRef<Record<string, Group | null>>({});
  const people = useRef<Agent[]>([]);
  const glows = useRef<(Group | null)[]>([]);
  const started = useRef({ key: "", line: -1, at: 0 });
  const fxMeshes = useRef<Partial<Record<FxKind, InstancedMesh | null>>>({});
  const dummy = useMemo(() => new Object3D(), []);
  const glowFx = (view.script.fx ?? []).filter((f) => f.kind === "glow");

  // How high a spot above the ground is: true to the stage low down, then
  // squeezed, so what is up in the sky (a satellite, the Moon) stays in shot.
  const lift = (y: number) => {
    const d = Math.max(0, y - 18);
    return d <= 22 ? d * 0.038 : 0.836 + (d - 22) * 0.012;
  };
  // Where a spot on the stage is in the world.
  const place = (x: number, y: number) => {
    const ax = (view.sea ? -1 : 1) * (x / 100 - 0.5) * WIDE;
    const groundAt = (gx: number, gz: number) => (tiles.length ? ground.heightAt(gx, gz) : 0.5);
    if (view.cave) return { x: ax, z: y > 26 ? -1.6 : 0, h: 0.5 + Math.max(0, y - 18) / 100 * 3.8 };
    if (view.sea) {
      if (y > 44) return { x: ax, z: view.stripZ + 3.2, h: 1.4 + ((y - 44) / 100) * 3.8 };
      const z = view.stripZ + Math.max(0, y - 18) * 0.16;
      // Off the shore, never below the water (a raft at the water's edge floats).
      return { x: ax, z, h: y > 21 ? 0.18 : y > 18.5 ? Math.max(groundAt(ax, z), groundAt(ax, view.stripZ), 0.18) : groundAt(ax, z) };
    }
    return { x: ax, z: view.stripZ, h: groundAt(ax, view.stripZ) + lift(y) };
  };

  useFrame(({ clock }) => {
    const s = started.current;
    if (s.key !== view.key || s.line !== view.line) started.current = { key: view.key, line: view.line, at: clock.elapsedTime };
    const time = clock.elapsedTime - started.current.at;
    const now = clock.elapsedTime;

    // Where everything is: those standing on their own first, then those riding.
    const pose: Record<string, Now> = {};
    const world: Record<string, { x: number; z: number; h: number; roll?: number }> = {};
    for (const [id, t] of entries) pose[id] = poseNow(t, view.line, time, view.script);
    for (let pass = 0; pass < 3; pass++) {
      for (const [id] of entries) {
        if (world[id]) continue;
        const p = pose[id];
        if (p.on && pose[p.on]) {
          const carrier = world[p.on];
          if (!carrier) continue;
          // On a log or a raft, sit on top of it; on anything else, as the script says.
          const under = view.script.things[p.on];
          const model = MODELED[pose[p.on].icon ?? under.icon!];
          const up = model ? model.seat * ((under.size ?? model.base) / model.base) * pose[p.on].scale : (p.dy / 100) * 3.8;
          world[id] = { x: carrier.x + (view.sea ? -1 : 1) * (p.dx / 100) * WIDE, z: carrier.z + (view.sea ? -0.05 : 0.05), h: carrier.h + up, roll: carrier.roll };
        } else {
          world[id] = place(p.x, p.y);
          // Afloat: bobbing and rocking on the swell (riders with it).
          if (view.sea && p.y > 21) {
            const seed = id.length * 1.7 + id.charCodeAt(0);
            world[id].h += Math.sin(now * 1.8 + seed) * 0.025;
            world[id].roll = Math.sin(now * 1.3 + seed) * 0.06;
          }
        }
      }
    }

    // Things: placed, grown, popped in, flipped and spun.
    const turn = view.sea ? Math.PI : 0;
    for (const [id, t] of things) {
      const g = groups.current[id];
      const p = pose[id];
      const w = world[id];
      if (!g || !w) continue;
      g.visible = p.show && p.scale > 0.01;
      const pop = p.appeared !== null ? backOut(Math.min(1, (time - p.appeared) / 0.35)) : 1;
      // Animals and machines on the move step along.
      const step = p.moving && !p.on && WALKS.includes(p.icon ?? t.icon!) ? Math.abs(Math.sin(now * 9)) * 0.05 : 0;
      g.position.set(w.x, w.h + step, w.z);
      g.scale.setScalar(Math.max(0.001, p.scale * pop));
      g.rotation.set(0, turn, p.spin ? -now * 5 : (w.roll ?? 0));
      for (const icon of iconsOf(t)) {
        const ig = icons.current[`${id}:${icon}`];
        if (ig) {
          ig.visible = icon === (p.icon ?? t.icon);
          ig.scale.x = p.flip ? -1 : 1;
        }
      }
    }

    // People: the game's figures, walking, sitting, working.
    const camZ = view.sea ? -10 : 20;
    people.current = entries
      .filter(([, t]) => t.person)
      .filter(([id]) => pose[id].show)
      .map(([id, t], i) => {
        const p = pose[id];
        const w = world[id];
        const look = LOOKS[t.person!];
        const prev = people.current.find((a) => (a as Agent & { id?: string }).id === id);
        let heading = Math.atan2(0, camZ - w.z);
        if (p.moving && prev && Math.hypot(w.x - prev.x, w.z - prev.z) > 1e-4) heading = Math.atan2(w.x - prev.x, w.z - prev.z);
        else if (p.face !== undefined) {
          const f = place(p.face, 18);
          heading = Math.atan2(f.x - w.x, f.z - w.z + (Math.abs(f.x - w.x) < 0.05 ? 1 : 0));
        }
        return {
          id,
          x: w.x,
          z: w.z,
          y: w.h,
          heading,
          moving: p.moving,
          scale: look.scale * (p.scale || 1),
          tunic: look.tunic,
          skin: SKINS[i % SKINS.length],
          hair: look.hair,
          phase: i * 1.3,
          sitting: p.sit,
          working: !!p.work && !p.moving,
          workTool: p.work ?? undefined,
        } as Agent & { id: string };
      });

    // Effects.
    const fxs = view.script.fx ?? [];
    const count: Partial<Record<FxKind, number>> = {};
    const put = (kind: FxKind, x: number, y: number, z: number, s: number, sy = s) => {
      const m = fxMeshes.current[kind];
      const n = count[kind] ?? 0;
      if (!m || n >= 60) return;
      dummy.position.set(x, y, z);
      dummy.scale.set(s, sy, s);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      m.setMatrixAt(n, dummy.matrix);
      count[kind] = n + 1;
    };
    fxs.forEach((f, fi) => {
      const k = fxNow(f, view.line, time);
      if (k === null || f.kind === "glow") return;
      const at = place(f.x, f.y ?? 18);
      const base = place(f.x, 18);
      const age = k * (f.secs ?? 1.5);
      for (let i = 0; i < 12; i++) {
        const r = Math.sin(fi * 31 + i * 12.9898) * 43758.5453;
        const rand = r - Math.floor(r);
        const life = ((age * 1.4 + i / 12) % 1);
        switch (f.kind) {
          case "seeds": {
            // Falling from a hand into the soil.
            const top = at.h + 0.5;
            put("seeds", at.x + (rand - 0.5) * 0.5, top + (base.h - top) * life, at.z + (rand - 0.5) * 0.2, 0.025);
            break;
          }
          case "sparks":
            put("sparks", at.x + Math.cos(i * 2.1) * life * 0.5, at.h + 0.3 + Math.sin(i * 1.7) * life * 0.4 + life * 0.3, at.z + Math.sin(i * 2.1) * life * 0.3, 0.035 * (1 - life));
            break;
          case "smoke":
            put("smoke", at.x + Math.sin(now + i) * 0.2 * life, at.h + 0.4 + life * 1.6, at.z, (0.12 + life * 0.35) * (1 - life * 0.6));
            break;
          case "splash":
            put("splash", at.x + (rand - 0.5) * 0.7, at.h + Math.sin(life * Math.PI) * 0.5, at.z + (rand - 0.5) * 0.3, 0.04);
            break;
          case "dust":
            put("dust", at.x + (rand - 0.5) * 1.2 * life, at.h + 0.1 + life * 0.4, at.z + (rand - 0.5) * 0.4, (0.1 + life * 0.3) * (1 - life * 0.7));
            break;
          case "leaves":
            put("leaves", at.x - 2.5 + life * 5, at.h + 0.3 + Math.sin(life * 8 + i) * 0.3 - life * 0.6, at.z + (rand - 0.5) * 0.6, 0.05, 0.02);
            break;
          case "stars":
            put("stars", at.x + (rand - 0.5) * 6, at.h + 1 + Math.cos(i * 3.3) * 0.8, at.z - 2, 0.05 * Math.abs(Math.sin(now * 3 + i)));
            break;
          case "rain":
            put("rain", at.x + (rand - 0.5) * 6, at.h + 3 - life * 3, at.z + (rand - 0.5) * 2, 0.012, 0.25);
            break;
        }
      }
    });
    for (const [kind, m] of Object.entries(fxMeshes.current)) {
      if (!m) continue;
      m.count = count[kind as FxKind] ?? 0;
      m.instanceMatrix.needsUpdate = true;
    }
    glowFx.forEach((f, i) => {
      const g = glows.current[i];
      if (!g) return;
      // A glow stays from its moment to the end of the scene.
      const on = view.line > f.line || (view.line === f.line && time >= (f.delay ?? 0));
      g.visible = on;
      const at = place(f.x, f.y ?? 18);
      g.position.set(at.x, at.h + 0.05, at.z);
      g.rotation.y = now * 0.8;
      const light = g.children.find((c) => (c as PointLight).isPointLight) as PointLight | undefined;
      if (light) light.intensity = 2 + Math.sin(now * 3) * 0.4;
    });
  });

  const FX_LOOK: Record<Exclude<FxKind, "glow">, { color: string; geo: "box" | "ball" | "star"; opacity?: number }> = {
    seeds: { color: "#8a5a2b", geo: "box" },
    sparks: { color: "#ffd860", geo: "star" },
    smoke: { color: "#cfcac2", geo: "ball", opacity: 0.6 },
    splash: { color: "#8fd0ff", geo: "ball", opacity: 0.85 },
    dust: { color: "#cdb995", geo: "ball", opacity: 0.55 },
    leaves: { color: "#5fae4a", geo: "box" },
    stars: { color: "#fff6c0", geo: "star" },
    rain: { color: "#b8c8e0", geo: "box", opacity: 0.6 },
  };

  return (
    <group>
      {things.map(([id, t]) => (
        <group key={id} ref={(g) => void (groups.current[id] = g)} visible={false}>
          {iconsOf(t).map((icon) => (
            <group key={icon} ref={(g) => void (icons.current[`${id}:${icon}`] = g)} visible={icon === t.icon}>
              {icon === "log" || icon === "raft" ? (
                <group scale={(t.size ?? 44) / MODELED[icon]!.base}>{icon === "log" ? <LogModel /> : <RaftModel />}</group>
              ) : (
                <VoxelIcon name={icon} size={(t.size ?? 40) * PX} pop={false} />
              )}
            </group>
          ))}
        </group>
      ))}
      <Figures agents={people} max={12} />
      {(Object.keys(FX_LOOK) as Exclude<FxKind, "glow">[]).map((kind) => {
        const look = FX_LOOK[kind];
        return (
          <instancedMesh key={kind} ref={(m) => void (fxMeshes.current[kind] = m)} args={[undefined, undefined, 60]} frustumCulled={false}>
            {look.geo === "box" ? <boxGeometry args={[1, 1, 1]} /> : look.geo === "ball" ? <sphereGeometry args={[1, 8, 6]} /> : <octahedronGeometry args={[1, 0]} />}
            {look.opacity ? (
              <meshStandardMaterial color={look.color} transparent opacity={look.opacity} depthWrite={false} />
            ) : (
              <meshBasicMaterial color={look.color} />
            )}
          </instancedMesh>
        );
      })}
      {glowFx.map((_, i) => (
        <group key={i} ref={(g) => void (glows.current[i] = g)} visible={false}>
          <pointLight color="#ffd23f" intensity={2} distance={5} position={[0, 1, 0]} />
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.7, 0.82, 6]} />
            <meshBasicMaterial color="#ffd23f" transparent opacity={0.75} />
          </mesh>
          <mesh position={[0, 1.6, 0]}>
            <cylinderGeometry args={[0.04, 0.5, 3.2, 12, 1, true]} />
            <meshBasicMaterial color="#ffd23f" transparent opacity={0.16} depthWrite={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
