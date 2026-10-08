"use client";

import { createContext, memo, useContext, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Color, Object3D, Vector3, type Group, type InstancedMesh, type Mesh } from "three";
import type { Tile } from "@/game/types";
import type { IconId } from "@/game/sprites";
import { VoxelIcon } from "./voxel";
import { ScriptedScene, type ScriptView } from "./scripted";
import { HexTerrain, Forests, Mountains, BiomeDetails } from "@/components/civ/world/hex-terrain";
import { BUILDING_SCALE, MODELS } from "@/components/civ/world/building-models";
import { Wildfire } from "@/components/civ/world/atmosphere";
import { Figures, type Agent, type WorkTool } from "@/components/civ/world/figures";
import { makeGround } from "@/components/civ/world/ground";
import { makeDiorama, type DioramaSpec } from "./diorama";
import { useHoldWorld } from "./active";

// A cutscene shot, played on a little 3D island made of the game's own tiles,
// buildings and people: the sky, who stands where and what they do, how the
// camera moves, and any special pieces (a launch, the planet, a flood...).

type V3 = [number, number, number];
export type SkyId = "day" | "dawn" | "dusk" | "night" | "space" | "red" | "storm" | "cave";

export interface ActorSpec {
  x: number;
  z: number;
  // Who they look like.
  look?: "villager" | "elder" | "warrior" | "raider" | "chief" | "robot" | "kito" | "lina";
  // Where they face (a point), or a turn.
  face?: [number, number];
  // Walk somewhere, starting `walkAt` seconds into the shot.
  walkTo?: [number, number];
  walkAt?: number;
  speed?: number;
  work?: WorkTool;
  sit?: boolean;
  // Step forward and bob (speaking, cheering).
  lively?: boolean;
  // Topple over this many seconds in.
  fallAt?: number;
  scale?: number;
}

export interface CameraSpec {
  from: V3;
  to: V3;
  lookFrom: V3;
  lookTo?: V3;
  seconds: number;
  // Shake from `at` for `for` seconds.
  shake?: { at: number; for: number; amp: number };
  fov?: number;
  // A new framing within the same shot (the next speaker): with `blend`, the
  // camera glides there from wherever it is instead of cutting to `from`.
  key?: string;
  blend?: boolean;
}

export interface Shot {
  key: string;
  island?: DioramaSpec | null;
  sky: SkyId;
  actors?: ActorSpec[];
  camera: CameraSpec;
  extras?: Extra[];
  // A discovery scene's script, acted out on the strip in front of the camera.
  script?: ScriptView;
}

export type Extra =
  | { kind: "launch"; x: number; z: number; liftAt?: number }
  | { kind: "ascent" }
  | { kind: "planet"; green: number }
  | { kind: "warp" }
  | { kind: "flood"; from: number; to: number; seconds: number }
  | { kind: "boat"; from: [number, number]; to: [number, number]; seconds: number; y?: number }
  | { kind: "glow"; x: number; z: number; color?: string }
  | { kind: "rise"; x: number; z: number; building: string }
  | { kind: "stars" }
  | { kind: "rain" }
  | { kind: "cave" }
  // A pixel icon from the game, built of little blocks, standing in the scene.
  | { kind: "voxel"; id?: string; icon: IconId; x: number; z: number; y?: number; size?: number; flip?: boolean; spin?: boolean; turn?: number };

const SKIES: Record<SkyId, { bg: string; fog?: [string, number, number]; sun: [string, number]; ambient: [string, number]; sea: string }> = {
  day: { bg: "#a8dcf5", fog: ["#cfe9f7", 30, 80], sun: ["#fff6e0", 1.6], ambient: ["#dbe8ff", 0.65], sea: "#2f7fb8" },
  dawn: { bg: "#f6b58c", fog: ["#f8d2b0", 26, 75], sun: ["#ffd2a0", 1.3], ambient: ["#ffe1c8", 0.6], sea: "#3b7aa8" },
  dusk: { bg: "#c2704a", fog: ["#d58a62", 24, 70], sun: ["#ff9a5c", 1.1], ambient: ["#b4889c", 0.55], sea: "#2b5a82" },
  night: { bg: "#0b1430", fog: ["#0e1a3a", 22, 70], sun: ["#8fa6ff", 0.55], ambient: ["#3a4a80", 0.45], sea: "#0f2a4a" },
  space: { bg: "#02030a", sun: ["#ffffff", 1.4], ambient: ["#223", 0.25], sea: "#02030a" },
  red: { bg: "#5a1a10", fog: ["#7a2a14", 16, 55], sun: ["#ff7a3a", 1.2], ambient: ["#6a2a2a", 0.55], sea: "#3a2a2a" },
  storm: { bg: "#4a5566", fog: ["#56606e", 18, 60], sun: ["#b8c6da", 0.85], ambient: ["#6a7488", 0.75], sea: "#2c4a66" },
  cave: { bg: "#1a120d", fog: ["#1a120d", 6, 22], sun: ["#ffb070", 0.35], ambient: ["#5a3a28", 0.5], sea: "#1a120d" },
};

// Time since the shot began (seconds), shared with the pieces in it.
const ShotClock = createContext<{ current: number }>({ current: 0 });
export const useShotClock = () => useContext(ShotClock);

// Memoized: the captions round it change often (typing), the scene shouldn't redraw for that.
export const Stage3D = memo(function Stage3D({ shot, className, style }: { shot: Shot; className?: string; style?: React.CSSProperties }) {
  useHoldWorld();
  return (
    <div className={className} style={style}>
      <Canvas dpr={[1, 1.5]} camera={{ position: shot.camera.from, fov: shot.camera.fov ?? 40, near: 0.05, far: 600 }} gl={{ antialias: true }}>
        <Scene shot={shot} />
      </Canvas>
    </div>
  );
});

function Scene({ shot }: { shot: Shot }) {
  const sky = SKIES[shot.sky];
  const clock = useRef(0);
  const started = useRef<{ key: string; at: number }>({ key: "", at: 0 });
  // The island by its contents, so a new shot object with the same island keeps it.
  const islandKey = shot.island ? JSON.stringify(shot.island) : "";
  const tiles = useMemo(() => (islandKey ? makeDiorama(JSON.parse(islandKey) as DioramaSpec) : []), [islandKey]);
  useFrame(({ clock: c }) => {
    if (started.current.key !== shot.key) started.current = { key: shot.key, at: c.elapsedTime };
    clock.current = c.elapsedTime - started.current.at;
  }, -2);
  return (
    <ShotClock.Provider value={clock}>
      <color attach="background" args={[sky.bg]} />
      {sky.fog && <fog attach="fog" args={sky.fog} />}
      <ambientLight color={sky.ambient[0]} intensity={sky.ambient[1]} />
      <hemisphereLight args={[sky.bg, "#3a5a2a", 0.35]} />
      <directionalLight position={[8, 14, 6]} color={sky.sun[0]} intensity={sky.sun[1]} />
      {shot.island && (
        <>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]}>
            <circleGeometry args={[220, 48]} />
            <meshStandardMaterial color={sky.sea} roughness={0.35} metalness={0.1} />
          </mesh>
          <HexTerrain tiles={tiles} era={0} onHover={noop} onPick={noop} />
          <Forests tiles={tiles} />
          <Mountains tiles={tiles} onHover={noop} onPick={noop} />
          <BiomeDetails tiles={tiles} />
          {shot.island.burning && <Wildfire tiles={tiles} />}
          <Buildings tiles={tiles} />
        </>
      )}
      <Actors key={shot.key} tiles={tiles} actors={shot.actors ?? []} />
      {shot.script && <ScriptedScene view={shot.script} tiles={tiles} />}
      {(shot.sky === "night" || shot.sky === "space") && <StarDome />}
      {(shot.extras ?? []).map((e, i) => (
        <ExtraPiece key={("id" in e && e.id) || `${shot.key}-${i}`} extra={e} />
      ))}
      <CameraRig shot={shot} />
    </ShotClock.Provider>
  );
}

const noop = () => {};

function Buildings({ tiles }: { tiles: Tile[] }) {
  return (
    <>
      {tiles
        .filter((t) => t.building && MODELS[t.building])
        .map((t) => {
          const Model = MODELS[t.building!];
          return (
            <group key={t.id} position={[t.x, t.height, t.z]} rotation={[0, (t.id % 6) * (Math.PI / 3), 0]} scale={BUILDING_SCALE}>
              <Model opacity={1} lit />
            </group>
          );
        })}
    </>
  );
}

const LOOKS: Record<NonNullable<ActorSpec["look"]>, { tunic: string; hair: string; scale: number; crown?: boolean; weapon?: "spear" | "club" }> = {
  villager: { tunic: "#a0522d", hair: "#2b1b10", scale: 1.35 },
  elder: { tunic: "#7e4fb8", hair: "#f2efe8", scale: 1.38 },
  warrior: { tunic: "#5b6f8a", hair: "#1a1a1a", scale: 1.4, weapon: "spear" },
  raider: { tunic: "#9b1c1c", hair: "#1a1a1a", scale: 1.4, weapon: "club" },
  chief: { tunic: "#7c3aed", hair: "#2b1b10", scale: 1.5, crown: true },
  robot: { tunic: "#9aa4ad", hair: "#5a6670", scale: 1.3 },
  kito: { tunic: "#b5432f", hair: "#1a1a1a", scale: 1.4, weapon: "spear" },
  lina: { tunic: "#3f8a4a", hair: "#4a2f1b", scale: 1.36 },
};
const SKINS = ["#e0ac69", "#c68642", "#f1c7a0", "#8d5524", "#f5d0b0"];

// The people in the shot: they walk, work, sit, cheer or fall, on the ground.
function Actors({ tiles, actors }: { tiles: Tile[]; actors: ActorSpec[] }) {
  const ground = useMemo(() => makeGround(tiles), [tiles]);
  const clock = useShotClock();
  const plain = useRef<Agent[]>([]);
  const spears = useRef<Agent[]>([]);
  const clubs = useRef<Agent[]>([]);
  const state = useRef(actors.map((a) => ({ x: a.x, z: a.z })));
  useFrame((_, delta) => {
    const t = clock.current;
    const dt = Math.min(delta, 0.1);
    const out = { plain: [] as Agent[], spear: [] as Agent[], club: [] as Agent[] };
    actors.forEach((a, i) => {
      const look = LOOKS[a.look ?? "villager"];
      // Someone new joined the shot (a later line of a scene): they start where they stand.
      const s = (state.current[i] ??= { x: a.x, z: a.z });
      let moving = false;
      let heading = a.face ? Math.atan2(a.face[0] - s.x, a.face[1] - s.z) : (i * 1.7) % (Math.PI * 2);
      if (a.walkTo && t >= (a.walkAt ?? 0)) {
        const dx = a.walkTo[0] - s.x;
        const dz = a.walkTo[1] - s.z;
        const d = Math.hypot(dx, dz);
        if (d > 0.03) {
          const step = Math.min(d, (a.speed ?? 0.9) * dt);
          s.x += (dx / d) * step;
          s.z += (dz / d) * step;
          heading = Math.atan2(dx, dz);
          moving = true;
        }
      }
      const fallen = a.fallAt !== undefined ? Math.max(0, Math.min(1, (t - a.fallAt) / 0.4)) : 0;
      const bob = a.lively ? Math.abs(Math.sin(t * 5 + i)) * 0.05 : 0;
      const agent: Agent = {
        x: s.x,
        z: s.z,
        // No island (inside the cave): they stand on its floor.
        y: (tiles.length ? ground.heightAt(s.x, s.z) : 0.5) + bob,
        heading,
        moving: moving && fallen === 0,
        scale: (a.scale ?? 1) * look.scale,
        tunic: look.tunic,
        skin: SKINS[i % SKINS.length],
        hair: look.hair,
        phase: i * 1.3,
        sitting: a.sit,
        working: !!a.work && !moving,
        workTool: a.work,
        fallen,
        crown: look.crown,
      };
      (look.weapon === "spear" ? out.spear : look.weapon === "club" ? out.club : out.plain).push(agent);
    });
    plain.current = out.plain;
    spears.current = out.spear;
    clubs.current = out.club;
  });
  return (
    <>
      <Figures agents={plain} max={40} />
      <Figures agents={spears} max={20} weapon="spear" />
      <Figures agents={clubs} max={20} weapon="club" />
    </>
  );
}

const ease = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const tmp = new Vector3();
const look = new Vector3();
const goal = new Vector3();

function CameraRig({ shot }: { shot: Shot }) {
  // Where this framing started from, and when; and where the camera looks now.
  const rig = useRef({ id: "", at: 0, from: new Vector3(), lookFrom: new Vector3(), looking: new Vector3() });
  useFrame(({ camera, clock }) => {
    const c = shot.camera;
    const r = rig.current;
    const id = `${shot.key}|${c.key ?? ""}`;
    if (r.id !== id) {
      const blend = c.blend && r.id !== "";
      if (blend) {
        r.from.copy(camera.position);
        r.lookFrom.copy(r.looking);
      } else {
        r.from.set(...c.from);
        r.lookFrom.set(...c.lookFrom);
      }
      r.id = id;
      r.at = clock.elapsedTime;
    }
    const t = clock.elapsedTime - r.at;
    const p = ease(Math.min(1, t / c.seconds));
    tmp.lerpVectors(r.from, goal.set(...c.to), p);
    look.lerpVectors(r.lookFrom, goal.set(...(c.lookTo ?? c.lookFrom)), p);
    r.looking.copy(look);
    if (c.shake && t > c.shake.at && t < c.shake.at + c.shake.for) {
      const k = c.shake.amp * (1 - (t - c.shake.at) / c.shake.for);
      tmp.x += (Math.random() - 0.5) * k;
      tmp.y += (Math.random() - 0.5) * k;
    }
    camera.position.copy(tmp);
    camera.lookAt(look);
    const cam = camera as unknown as { fov?: number; updateProjectionMatrix?: () => void };
    const fov = c.fov ?? 40;
    if (cam.fov !== undefined && Math.abs(cam.fov - fov) > 0.01) {
      cam.fov = fov;
      cam.updateProjectionMatrix?.();
    }
  });
  return null;
}

// Seconds since this piece first appeared (for things that pop in mid-shot).
function useSince() {
  const since = useRef({ start: -1, t: 0 });
  useFrame(({ clock }) => {
    const s = since.current;
    if (s.start < 0) s.start = clock.elapsedTime;
    s.t = clock.elapsedTime - s.start;
  }, -1);
  return since;
}

// Stars on a dome round everything.
function StarDome() {
  const mesh = useRef<InstancedMesh>(null);
  const n = 500;
  useEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const d = new Object3D();
    for (let i = 0; i < n; i++) {
      const u = ((i * 0.618034) % 1) * Math.PI * 2;
      const v = Math.acos(1 - 2 * ((i * 0.7548776 + 0.3) % 1));
      d.position.set(Math.sin(v) * Math.cos(u) * 250, Math.abs(Math.cos(v)) * 250 - 20, Math.sin(v) * Math.sin(u) * 250);
      d.scale.setScalar(0.35 + ((i * 37) % 10) / 12);
      d.updateMatrix();
      m.setMatrixAt(i, d.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  }, []);
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, n]} frustumCulled={false}>
      <sphereGeometry args={[0.35, 4, 3]} />
      <meshBasicMaterial color="#ffffff" fog={false} />
    </instancedMesh>
  );
}

function ExtraPiece({ extra }: { extra: Extra }) {
  switch (extra.kind) {
    case "launch":
      return <LaunchPad x={extra.x} z={extra.z} liftAt={extra.liftAt} />;
    case "ascent":
      return <Ascent />;
    case "planet":
      return <Planet green={extra.green} />;
    case "warp":
      return <Warp />;
    case "flood":
      return <Flood from={extra.from} to={extra.to} seconds={extra.seconds} />;
    case "boat":
      return <Boat from={extra.from} to={extra.to} seconds={extra.seconds} y={extra.y} />;
    case "glow":
      return <Glow x={extra.x} z={extra.z} color={extra.color} />;
    case "rise":
      return <Rise x={extra.x} z={extra.z} building={extra.building} />;
    case "stars":
      return <StarDome />;
    case "rain":
      return <Rain />;
    case "cave":
      return <Cave />;
    case "voxel":
      return (
        <group position={[extra.x, extra.y ?? 0.5, extra.z]} rotation={[0, extra.turn ?? 0, 0]}>
          <VoxelIcon name={extra.icon} size={extra.size ?? 0.8} flip={extra.flip} spin={extra.spin} />
        </group>
      );
  }
}

// ---- The Ark -------------------------------------------------------------------

export function ArkShip({ flame = false, scale = 1 }: { flame?: boolean; scale?: number }) {
  const fire = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    if (fire.current) fire.current.scale.set(1, 0.8 + Math.sin(clock.elapsedTime * 40) * 0.2, 1);
  });
  return (
    <group scale={scale}>
      <mesh position={[0, 2.2, 0]}>
        <cylinderGeometry args={[0.45, 0.5, 3.6, 12]} />
        <meshStandardMaterial color="#f2f0ea" roughness={0.5} />
      </mesh>
      <mesh position={[0, 4.4, 0]}>
        <coneGeometry args={[0.45, 1, 12]} />
        <meshStandardMaterial color="#c2410c" roughness={0.5} />
      </mesh>
      {/* The lantern with the ember from the first fire. */}
      <mesh position={[0, 3.3, 0.46]}>
        <sphereGeometry args={[0.12, 10, 8]} />
        <meshBasicMaterial color="#fbbf24" />
      </mesh>
      <pointLight position={[0, 3.3, 0.7]} color="#fbbf24" intensity={1.2} distance={4} />
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[Math.cos((i * Math.PI) / 2) * 0.5, 0.7, Math.sin((i * Math.PI) / 2) * 0.5]} rotation={[0, (-i * Math.PI) / 2, 0]}>
          <boxGeometry args={[0.5, 0.9, 0.08]} />
          <meshStandardMaterial color="#c2410c" />
        </mesh>
      ))}
      {flame && (
        <mesh ref={fire} position={[0, -0.6, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.42, 2.2, 10]} />
          <meshBasicMaterial color="#ffb347" transparent opacity={0.9} />
        </mesh>
      )}
      {flame && <pointLight position={[0, -1, 0]} color="#ff9a3c" intensity={3} distance={14} />}
    </group>
  );
}

function LaunchPad({ x, z, liftAt }: { x: number; z: number; liftAt?: number }) {
  const clock = useShotClock();
  const ship = useRef<Group>(null);
  const smoke = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  useFrame(() => {
    const t = clock.current;
    const lifting = liftAt !== undefined && t > liftAt;
    const u = lifting ? t - liftAt! : 0;
    if (ship.current) ship.current.position.set(x, 0.55 + u * u * 1.6, z);
    const m = smoke.current;
    if (!m) return;
    for (let i = 0; i < 40; i++) {
      const life = lifting ? ((u * 0.6 + i / 40) % 1) : 0;
      const a = i * 2.4;
      dummy.position.set(x + Math.cos(a) * life * 3, 0.6 + life * 1.2, z + Math.sin(a) * life * 3);
      dummy.scale.setScalar(lifting ? 0.3 + life * 1.4 : 0.0001);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });
  return (
    <group>
      {/* The tower beside the pad. */}
      <mesh position={[x - 1.1, 2.2, z]}>
        <boxGeometry args={[0.3, 4.4, 0.3]} />
        <meshStandardMaterial color="#5a6270" wireframe />
      </mesh>
      <mesh position={[x, 0.5, z]}>
        <cylinderGeometry args={[1.4, 1.6, 0.25, 16]} />
        <meshStandardMaterial color="#8a8f98" />
      </mesh>
      <group ref={ship}>
        <ArkShip flame={liftAt !== undefined} scale={0.72} />
      </group>
      <instancedMesh ref={smoke} args={[undefined, undefined, 40]} frustumCulled={false}>
        <sphereGeometry args={[1, 8, 6]} />
        <meshStandardMaterial color="#d8d4cc" transparent opacity={0.75} depthWrite={false} />
      </instancedMesh>
    </group>
  );
}

// Climbing through the clouds into black: clouds rush past, the ship in front.
function Ascent() {
  const clock = useShotClock();
  const clouds = useRef<Group>(null);
  useFrame(({ camera, scene }) => {
    const t = clock.current;
    const g = clouds.current;
    if (g) g.children.forEach((c, i) => (c.position.y = ((i * 7 - t * 30) % 60) + 30 + camera.position.y - 40));
    // The sky darkens to space.
    const bg = scene.background as Color | null;
    if (bg) bg.set("#7cc4ee").lerp(new Color("#02030a"), Math.min(1, t / 4));
  });
  return (
    <group>
      <group ref={clouds}>
        {Array.from({ length: 10 }, (_, i) => (
          <mesh key={i} position={[((i * 13) % 20) - 10, 0, ((i * 7) % 14) - 7]} scale={[3 + (i % 3), 0.8, 2.5]}>
            <sphereGeometry args={[1, 10, 8]} />
            <meshStandardMaterial color="#ffffff" transparent opacity={0.85} />
          </mesh>
        ))}
      </group>
      <group position={[0, 40, 0]} rotation={[0.1, 0, 0.05]}>
        <ArkShip flame />
      </group>
    </group>
  );
}

// Home from space: a blue world with its islands (greener the healthier the
// land), the Moon and Mars, and the Ark passing.
function Planet({ green }: { green: number }) {
  const clock = useShotClock();
  const world = useRef<Group>(null);
  const ark = useRef<Group>(null);
  const land = useMemo(() => {
    const spots: { pos: V3; size: number }[] = [];
    for (let i = 0; i < 26; i++) {
      const u = ((i * 0.618034) % 1) * Math.PI * 2;
      const v = Math.acos(1 - 2 * ((i * 0.38 + 0.11) % 1));
      spots.push({ pos: [Math.sin(v) * Math.cos(u), Math.cos(v), Math.sin(v) * Math.sin(u)], size: 0.12 + ((i * 7) % 5) * 0.04 });
    }
    return spots;
  }, []);
  useFrame(() => {
    const t = clock.current;
    if (world.current) world.current.rotation.y = t * 0.08;
    if (ark.current) ark.current.position.set(-9 + t * 3.2, 3 + t * 0.4, 6);
  });
  const landColor = green > 0.5 ? "#4f9a4a" : "#9a8a5a";
  return (
    <group>
      <pointLight position={[-30, 10, 30]} intensity={2} />
      <group ref={world}>
        <mesh>
          <sphereGeometry args={[6, 48, 32]} />
          <meshStandardMaterial color="#2a6fb0" roughness={0.6} />
        </mesh>
        {land.map((s, i) => (
          // Sunk into the sea so only a low hump shows: land, not balls.
          <mesh key={i} position={[s.pos[0] * (6 - s.size * 6.5), s.pos[1] * (6 - s.size * 6.5), s.pos[2] * (6 - s.size * 6.5)]} scale={s.size * 8}>
            <sphereGeometry args={[1, 10, 8]} />
            <meshStandardMaterial color={landColor} roughness={0.9} />
          </mesh>
        ))}
        {/* The air: a thin blue line round it. */}
        <mesh scale={1.04}>
          <sphereGeometry args={[6, 32, 24]} />
          <meshBasicMaterial color="#8fd0ff" transparent opacity={0.18} />
        </mesh>
      </group>
      <mesh position={[14, 6, -10]}>
        <sphereGeometry args={[1.4, 24, 16]} />
        <meshStandardMaterial color="#d6d4cf" />
      </mesh>
      <mesh position={[-20, 9, -26]}>
        <sphereGeometry args={[1.8, 24, 16]} />
        <meshStandardMaterial color="#c1440e" />
      </mesh>
      <group ref={ark} rotation={[0, 0, -1.2]} scale={0.5}>
        <ArkShip flame />
      </group>
    </group>
  );
}

// Between the stars: they stream past, the Ark holds its course, and Alpha
// Centauri grows ahead.
function Warp() {
  const clock = useShotClock();
  const mesh = useRef<InstancedMesh>(null);
  const star = useRef<Mesh>(null);
  const n = 220;
  const seeds = useMemo(() => Array.from({ length: n }, (_, i) => ({ x: ((i * 37.7) % 60) - 30, y: ((i * 53.3) % 40) - 20, z0: (i * 13.1) % 120 })), []);
  const d = useMemo(() => new Object3D(), []);
  useFrame(() => {
    const t = clock.current;
    const m = mesh.current;
    if (m) {
      seeds.forEach((s, i) => {
        const z = ((s.z0 + t * 40) % 120) - 110;
        d.position.set(s.x, s.y, z);
        d.scale.set(0.05, 0.05, 2.2);
        d.updateMatrix();
        m.setMatrixAt(i, d.matrix);
      });
      m.instanceMatrix.needsUpdate = true;
    }
    if (star.current) star.current.scale.setScalar(0.6 + t * 0.35);
  });
  return (
    <group>
      <instancedMesh ref={mesh} args={[undefined, undefined, n]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#cfe0ff" />
      </instancedMesh>
      <mesh ref={star} position={[6, 3, -90]}>
        <sphereGeometry args={[1.2, 16, 12]} />
        <meshBasicMaterial color="#fff2c0" />
      </mesh>
      <pointLight position={[6, 3, -60]} color="#fff2c0" intensity={2} />
      <group rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <ArkShip flame />
      </group>
    </group>
  );
}

function Flood({ from, to, seconds }: { from: number; to: number; seconds: number }) {
  const clock = useShotClock();
  const water = useRef<Mesh>(null);
  useFrame(() => {
    if (water.current) water.current.position.y = from + (to - from) * Math.min(1, clock.current / seconds);
  });
  return (
    <mesh ref={water} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[60, 48]} />
      <meshStandardMaterial color="#3a73a0" transparent opacity={0.9} roughness={0.25} />
    </mesh>
  );
}

function Boat({ from, to, seconds, y = 0.1 }: { from: [number, number]; to: [number, number]; seconds: number; y?: number }) {
  const clock = useShotClock();
  const boat = useRef<Group>(null);
  useFrame(() => {
    const p = Math.min(1, clock.current / seconds);
    if (boat.current) {
      boat.current.position.set(from[0] + (to[0] - from[0]) * p, y + 0.1 + Math.sin(clock.current * 2) * 0.05, from[1] + (to[1] - from[1]) * p);
      boat.current.rotation.z = Math.sin(clock.current * 1.6) * 0.06;
      boat.current.rotation.y = Math.atan2(to[0] - from[0], to[1] - from[1]);
    }
  });
  return (
    <group ref={boat} scale={2.2}>
      <mesh position={[0, 0.12, 0]}>
        <boxGeometry args={[0.5, 0.2, 1.4]} />
        <meshStandardMaterial color="#6b4a2b" />
      </mesh>
      <mesh position={[0, 0.8, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 1.2, 6]} />
        <meshStandardMaterial color="#4a3020" />
      </mesh>
      <mesh position={[0, 0.85, 0.2]}>
        <planeGeometry args={[0.7, 0.9]} />
        <meshStandardMaterial color="#efe6d2" side={2} />
      </mesh>
    </group>
  );
}

// A discovery's glow: light and a slowly turning ring.
function Glow({ x, z, color = "#ffd23f" }: { x: number; z: number; color?: string }) {
  const ring = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    if (ring.current) {
      ring.current.rotation.z = clock.elapsedTime * 0.8;
      const s = 1 + Math.sin(clock.elapsedTime * 3) * 0.06;
      ring.current.scale.set(s, s, s);
    }
  });
  return (
    <group position={[x, 0.75, z]}>
      <pointLight color={color} intensity={2.4} distance={6} position={[0, 1.2, 0]} />
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.85, 1, 6]} />
        <meshBasicMaterial color={color} transparent opacity={0.8} />
      </mesh>
      <mesh position={[0, 2, 0]}>
        <cylinderGeometry args={[0.04, 0.6, 4, 12, 1, true]} />
        <meshBasicMaterial color={color} transparent opacity={0.18} depthWrite={false} />
      </mesh>
    </group>
  );
}

// A new building rising out of the ground (a discovery that unlocks one).
function Rise({ x, z, building }: { x: number; z: number; building: string }) {
  const since = useSince();
  const g = useRef<Group>(null);
  const Model = MODELS[building];
  useFrame(() => {
    const p = Math.min(1, Math.max(0, (since.current.t - 0.3) / 1.6));
    const s = p < 1 ? 1 - Math.pow(1 - p, 3) : 1;
    if (g.current) {
      g.current.scale.setScalar(BUILDING_SCALE * Math.max(0.01, s));
      g.current.rotation.y = (1 - s) * 2;
    }
  });
  if (!Model) return null;
  return (
    <group ref={g} position={[x, 0.55, z]}>
      <Model opacity={1} lit />
    </group>
  );
}

function Rain() {
  const mesh = useRef<InstancedMesh>(null);
  const d = useMemo(() => new Object3D(), []);
  const n = 300;
  useFrame(({ clock, camera }) => {
    const m = mesh.current;
    if (!m) return;
    // Round the camera, wherever it goes, and none right against the lens.
    const [cx, cz] = [camera.position.x, camera.position.z];
    for (let i = 0; i < n; i++) {
      const y = 12 - ((clock.elapsedTime * 14 + i * 0.37) % 12);
      const ox = ((i * 7.3) % 24) - 12;
      const oz = ((i * 3.7) % 24) - 12;
      const near = Math.hypot(ox, oz) < 2.5 ? 3 : 1;
      d.position.set(cx + ox * near, y, cz + oz * near);
      d.rotation.set(0.2, 0, 0);
      d.scale.set(0.02, 0.4, 0.02);
      d.updateMatrix();
      m.setMatrixAt(i, d.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, n]} frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial color="#b8c8e0" transparent opacity={0.5} />
    </instancedMesh>
  );
}

// Inside a cave: a rock floor and walls round the back, lit by a torch.
function Cave() {
  const torch = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    if (torch.current) torch.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 13) * 0.12);
  });
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.5, 0]}>
        <circleGeometry args={[14, 32]} />
        <meshStandardMaterial color="#4a3a2e" roughness={1} />
      </mesh>
      <mesh position={[0, 0.5, 0]} rotation={[0, Math.PI, 0]}>
        <sphereGeometry args={[7, 24, 16, 0, Math.PI, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#6b5644" roughness={1} side={2} />
      </mesh>
      <group position={[-2.6, 1.6, -0.6]}>
        <mesh ref={torch}>
          <coneGeometry args={[0.12, 0.35, 8]} />
          <meshBasicMaterial color="#ffb347" />
        </mesh>
        <pointLight color="#ffa050" intensity={4} distance={12} decay={1.2} />
      </group>
    </group>
  );
}

export { VoxelIcon };
