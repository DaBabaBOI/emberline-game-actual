"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { Group, Mesh } from "three";
import { useGame } from "@/components/civ/game-provider";
import { Figures, type Agent } from "@/components/civ/world/figures";
import { useHoldWorld } from "@/components/civ/cutscene/active";
import { KINGDOM_LOOK } from "@/components/civ/world/trade";
import { PixelIcon } from "@/components/civ/pixel-icon";
import { amountText, battleRoster, commandSetup, commanding, raidSpoils } from "@/game/engine";
import {
  FIGHTERS,
  HALF_W,
  THEM_ZONE,
  US_ZONE,
  autoLineup,
  battleResult,
  inOurZone,
  startBattle,
  stepBattle,
  type BattleResult,
  type BattleSim,
  type FighterKind,
  type Placed,
} from "@/game/battle";
import type { IconId } from "@/game/sprites";
import { playSfx } from "@/lib/audio";
import { currentShot, endShot } from "./letterbox";
import { cn } from "@/lib/utils";

// A commanded battle, like a tabletop: when the raiders land, the game waits
// while you set out your army on your side of the field (warriors, spearmen,
// the chief, palisades, towers), then press Fight and watch it play out, blow
// by blow. The engine plays the very same fight to take the result.

const NAMES: Record<FighterKind, [string, string]> = {
  warrior: ["Warrior", "warriors"],
  spearman: ["Spearman", "spearmen"],
  chief: ["Chief", "the chief"],
  raider: ["Raider", "raiders"],
  brute: ["Brute", "brutes"],
  torch: ["Torch-bearer", "torch-bearers"],
  palisade: ["Palisade", "palisades"],
  tower: ["Tower", "towers"],
};
const ICONS: Partial<Record<FighterKind, IconId>> = { warrior: "sword", spearman: "spear", chief: "crown", palisade: "shield", tower: "beacon" };
const OURS: FighterKind[] = ["warrior", "spearman", "chief", "palisade", "tower"];
const STEP = 0.05;

export function CommandBattle() {
  const { state } = useGame();
  if (!commanding(state) || !state.raid) return null;
  return <BattleScreen key={state.raid.startTick} />;
}

type Phase = "deploy" | "fight" | "done";

function BattleScreen() {
  useHoldWorld();
  const { state, dispatch } = useGame();
  const raid = state.raid!;
  const { roster } = battleRoster(state);
  const [placed, setPlaced] = useState<Placed[]>(() => autoLineup(roster));
  const [tool, setTool] = useState<FighterKind | "erase">("warrior");
  const [phase, setPhase] = useState<Phase>("deploy");
  const [speed, setSpeed] = useState(1);
  const [result, setResult] = useState<BattleResult | null>(null);
  const [count, setCount] = useState<{ us: number; them: number } | null>(null);
  const sim = useRef<BattleSim | null>(null);
  // How the raiders stand (the same lineup the fight will use).
  const preview = useMemo(() => commandSetup(state, raid, []), [state, raid]);

  // The mouse is needed here (first person had it locked), and any camera
  // shot on the map behind is over.
  useEffect(() => {
    if (document.pointerLockElement) document.exitPointerLock();
    if (currentShot()) endShot();
  }, []);

  const left = (k: FighterKind) => (roster[k] ?? 0) - placed.filter((p) => p.kind === k).length;
  const mobile = placed.filter((p) => !FIGHTERS[p.kind].still).length;
  const theirCount: Partial<Record<FighterKind, number>> = {};
  for (const p of preview.theirs) theirCount[p.kind] = (theirCount[p.kind] ?? 0) + 1;
  const describe = (c: Partial<Record<FighterKind, number>>) =>
    (Object.entries(c) as [FighterKind, number][])
      .filter(([, n]) => n)
      .map(([k, n]) => (k === "chief" ? NAMES.chief[1] : `${n} ${n === 1 ? NAMES[k][0].toLowerCase() : NAMES[k][1]}`))
      .join(", ");

  const place = (x: number, z: number) => {
    if (phase !== "deploy") return;
    if (tool === "erase") {
      erase(x, z);
      return;
    }
    if (!inOurZone(x, z) || left(tool) <= 0) return;
    const r = FIGHTERS[tool].radius;
    if (placed.some((p) => Math.hypot(p.x - x, p.z - z) < r + FIGHTERS[p.kind].radius + 0.02)) return;
    setPlaced((list) => [...list, { kind: tool, x: Math.round(x * 20) / 20, z: Math.round(z * 20) / 20 }]);
  };
  const erase = (x: number, z: number) => {
    if (phase !== "deploy") return;
    let best = -1;
    let bestD = 0.35;
    placed.forEach((p, i) => {
      const d = Math.hypot(p.x - x, p.z - z);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    if (best >= 0) setPlaced((list) => list.filter((_, i) => i !== best));
  };

  const fight = () => {
    sim.current = startBattle(commandSetup(state, raid, placed));
    setPhase("fight");
    playSfx("battle");
  };
  const finish = (s: BattleSim) => {
    const r = battleResult(s);
    setResult(r);
    setPhase("done");
    playSfx(r.won ? "win" : "lose");
  };
  const skip = () => {
    const s = sim.current;
    if (!s) return;
    while (!s.over) stepBattle(s);
    finish(s);
  };

  const spoils = raidSpoils(raid);
  const fell = result ? Object.entries(result.fell).reduce((n, [k, v]) => n + (k === "chief" ? 0 : (v ?? 0)), 0) : 0;
  const theirTunic = raid.kingdom ? KINGDOM_LOOK[raid.kingdom].tunic : "#9b1c1c";

  return (
    <div className="fixed inset-0 z-[65] bg-[#1b2a17]" data-testid="command-battle">
      <Canvas dpr={[1, 1.5]} shadows camera={{ position: [0, 6.4, 7.2], fov: 46, near: 0.1, far: 120 }} gl={{ antialias: true }}>
        <Field phase={phase} tool={tool} onPlace={place} onErase={erase} era={state.era} />
        <Army phase={phase} placed={placed} theirs={preview.theirs} sim={sim} speed={speed} theirTunic={theirTunic} era={state.era} onCount={setCount} onDone={finish} />
        {phase !== "deploy" && <OrbitControls enablePan={false} target={[0, 0, 0]} minDistance={4} maxDistance={14} maxPolarAngle={1.3} />}
      </Canvas>

      {/* Who is on the field. */}
      <div className="pointer-events-none absolute inset-x-0 top-2 flex justify-center px-3">
        <div className="pixel-panel-dark font-pixel w-full max-w-[640px] px-4 py-2 text-white">
          <div className="flex items-center justify-between gap-2">
            <span className="text-base font-semibold md:text-lg">{raid.kingdom ? "An army has landed!" : "The raiders have landed!"}</span>
            {count && (
              <span className="font-num text-sm">
                <span className="text-sky-300">Ours {count.us}</span> · <span className="text-red-300">Theirs {count.them}</span>
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-white/80">
            <span className="text-red-300">Them:</span> {describe(theirCount)}. <span className="text-sky-300">You:</span>{" "}
            {describe(Object.fromEntries(OURS.map((k) => [k, roster[k] ?? 0])))}.
          </p>
          {phase === "deploy" && (
            <p className="mt-1 text-[11px] text-amber-200">
              Click (or drag) on the blue ground to place the chosen unit · right-click to take one away. Brutes hit hard; torch-bearers run round the sides; spearmen strike over palisades.
            </p>
          )}
        </div>
      </div>

      {/* Deploying: the roster and the orders. */}
      {phase === "deploy" && (
        <div className="absolute inset-x-0 bottom-2 flex justify-center px-3">
          <div className="pixel-panel-dark font-pixel flex w-full max-w-[760px] flex-wrap items-center gap-1.5 p-2 text-white">
            {OURS.filter((k) => (roster[k] ?? 0) > 0).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setTool(k)}
                className={cn("pixel-btn flex items-center gap-1.5 px-2 py-1 text-xs", tool === k ? "bg-amber-400 text-[#2b2119]" : "bg-[#4a3b2e]")}
                data-testid={`deploy-${k}`}
              >
                <PixelIcon name={ICONS[k]!} size={18} />
                {NAMES[k][0]}
                <span className="font-num">
                  {left(k)}/{roster[k]}
                </span>
              </button>
            ))}
            <button type="button" onClick={() => setTool("erase")} className={cn("pixel-btn px-2 py-1 text-xs", tool === "erase" ? "bg-amber-400 text-[#2b2119]" : "bg-[#4a3b2e]")}>
              Remove
            </button>
            <span className="flex-1" />
            <button type="button" onClick={() => setPlaced(autoLineup(roster))} className="pixel-btn bg-[#4a3b2e] px-2 py-1 text-xs">
              Auto
            </button>
            <button type="button" onClick={() => setPlaced([])} className="pixel-btn bg-[#4a3b2e] px-2 py-1 text-xs">
              Clear
            </button>
            <button type="button" onClick={() => dispatch({ type: "autoBattle" })} className="pixel-btn bg-[#4a3b2e] px-2 py-1 text-xs" title="Leave it to your warriors: the usual fight">
              Let them fight it out
            </button>
            <button
              type="button"
              disabled={mobile === 0}
              onClick={fight}
              className="pixel-btn bg-red-700 px-4 py-1.5 text-sm font-bold hover:bg-red-600 disabled:opacity-40"
              data-testid="battle-fight"
            >
              Fight!
            </button>
          </div>
        </div>
      )}

      {/* Fighting: how fast to watch. */}
      {phase === "fight" && (
        <div className="absolute inset-x-0 bottom-2 flex justify-center px-3">
          <div className="pixel-panel-dark font-pixel flex items-center gap-1.5 p-2 text-xs text-white">
            {[0.5, 1, 2, 4].map((s) => (
              <button key={s} type="button" onClick={() => setSpeed(s)} className={cn("pixel-btn px-2 py-1", speed === s ? "bg-amber-400 text-[#2b2119]" : "bg-[#4a3b2e]")}>
                {s === 0.5 ? "½" : s}×
              </button>
            ))}
            <span className="px-1 text-white/60">Drag to look around</span>
            <button type="button" onClick={skip} className="pixel-btn bg-[#4a3b2e] px-2 py-1" data-testid="battle-skip">
              Skip to the end
            </button>
          </div>
        </div>
      )}

      {/* How it went. */}
      {phase === "done" && result && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 p-3">
          <div className="pixel-panel w-full max-w-[420px] p-4 text-center" data-testid="battle-done">
            <div className={cn("font-pixel text-3xl font-bold", result.won ? "text-amber-600" : "text-red-700")}>{result.won ? "Victory!" : "The line broke"}</div>
            <p className="mt-1 text-sm">
              {fell} of ours fell · {result.theirsFell} of theirs fell{result.fell.chief ? " · the chief was wounded" : ""}
            </p>
            <p className="mt-1 text-sm">{result.won ? `They left behind ${amountText(state, spoils)}.` : "They will take what they came for."}</p>
            <button
              type="button"
              autoFocus
              onClick={() => dispatch({ type: "commandBattle", placements: placed })}
              className="pixel-btn font-pixel mt-3 bg-amber-400 px-4 py-1.5 text-sm font-semibold text-[#2b2119]"
              data-testid="battle-continue"
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// The field: grass, our side lit blue (where we may deploy), theirs red;
// clicks and drags on it place (or take away) units.
function Field({ phase, tool, onPlace, onErase, era }: { phase: Phase; tool: FighterKind | "erase"; onPlace: (x: number, z: number) => void; onErase: (x: number, z: number) => void; era: number }) {
  const down = useRef(false);
  const grass = ["#6f9e45", "#7aa24c", "#8a9a50", "#5f8a3e", "#6a6a5a", "#4f9a5a"][Math.min(era, 5)];
  const at = (e: ThreeEvent<PointerEvent>) => ({ x: e.point.x, z: e.point.z });
  return (
    <>
      <color attach="background" args={["#9fc7e8"]} />
      <fog attach="fog" args={["#9fc7e8", 14, 30]} />
      <hemisphereLight args={["#e8f2ff", "#3c4a2a", 0.9]} />
      <directionalLight position={[4, 9, 5]} intensity={1.6} castShadow shadow-mapSize={[1024, 1024]} />
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
        onPointerDown={(e) => {
          if (phase !== "deploy") return;
          e.stopPropagation();
          if (e.button === 2) {
            onErase(e.point.x, e.point.z);
            return;
          }
          down.current = true;
          const p = at(e);
          onPlace(p.x, p.z);
        }}
        onPointerMove={(e) => {
          if (!down.current || phase !== "deploy" || tool === "erase") return;
          const p = at(e);
          onPlace(p.x, p.z);
        }}
        onPointerUp={() => (down.current = false)}
        onPointerLeave={() => (down.current = false)}
        onContextMenu={(e) => e.nativeEvent.preventDefault()}
      >
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color={grass} />
      </mesh>
      {/* Our side, and theirs. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, (US_ZONE[0] + US_ZONE[1]) / 2]}>
        <planeGeometry args={[HALF_W * 2, US_ZONE[1] - US_ZONE[0]]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={phase === "deploy" ? 0.22 : 0.06} depthWrite={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, (THEM_ZONE[0] + THEM_ZONE[1]) / 2]}>
        <planeGeometry args={[HALF_W * 2, THEM_ZONE[1] - THEM_ZONE[0]]} />
        <meshBasicMaterial color="#ef4444" transparent opacity={phase === "deploy" ? 0.16 : 0.05} depthWrite={false} />
      </mesh>
      {/* A few rocks and trees round the edge. */}
      {[
        [-5.6, -2.5],
        [5.4, -1.2],
        [-5.2, 2.2],
        [5.8, 2.8],
        [-3, -5.2],
        [3.4, -5.4],
      ].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          {i % 2 ? (
            <mesh castShadow position={[0, 0.25, 0]}>
              <dodecahedronGeometry args={[0.35, 0]} />
              <meshStandardMaterial color="#8f8a84" flatShading />
            </mesh>
          ) : (
            <>
              <mesh castShadow position={[0, 0.25, 0]}>
                <cylinderGeometry args={[0.06, 0.09, 0.5, 6]} />
                <meshStandardMaterial color="#6b4423" />
              </mesh>
              <mesh castShadow position={[0, 0.85, 0]}>
                <coneGeometry args={[0.45, 1.1, 7]} />
                <meshStandardMaterial color="#3f7a35" flatShading />
              </mesh>
            </>
          )}
        </group>
      ))}
    </>
  );
}

const SKINS = ["#e0ac69", "#c68642", "#f1c7a0", "#8d5524", "#f5d0b0"];

// Everyone on the field: before the fight where they were put, then as the
// fight plays out (stepped here, as fast as chosen).
function Army({
  phase,
  placed,
  theirs,
  sim,
  speed,
  theirTunic,
  era,
  onCount,
  onDone,
}: {
  phase: Phase;
  placed: Placed[];
  theirs: Placed[];
  sim: React.RefObject<BattleSim | null>;
  speed: number;
  theirTunic: string;
  era: number;
  onCount: (c: { us: number; them: number }) => void;
  onDone: (s: BattleSim) => void;
}) {
  const clubs = useRef<Agent[]>([]);
  const spears = useRef<Agent[]>([]);
  const chiefs = useRef<Agent[]>([]);
  const raiders = useRef<Agent[]>([]);
  const statics = useRef<(Group | null)[]>([]);
  const arrows = useRef<(Mesh | null)[]>([]);
  const acc = useRef(0);
  const counted = useRef(0);
  const ended = useRef(false);
  const maxStatics = 16;

  useFrame((_, delta) => {
    const s = sim.current;
    const fighting = phase !== "deploy" && s;
    if (fighting && phase === "fight" && !s.over) {
      acc.current += Math.min(delta, 0.1) * speed;
      while (acc.current >= STEP && !s.over) {
        stepBattle(s);
        acc.current -= STEP;
      }
      if (s.over && !ended.current) {
        ended.current = true;
        onDone(s);
      }
    }
    const t = s?.t ?? 0;
    // Who to draw: the fight's figures, or (deploying) where they were put.
    const list = fighting
      ? s.fighters
      : [
          ...placed.map((p, i) => ({ id: i, side: "us" as const, kind: p.kind, x: p.x, z: p.z, alive: true, heading: Math.PI, moving: false, struckAt: -9, diedAt: -1, hp: 1, maxHp: 1 })),
          ...theirs.map((p, i) => ({ id: 1000 + i, side: "them" as const, kind: p.kind, x: p.x, z: p.z, alive: true, heading: 0, moving: false, struckAt: -9, diedAt: -1, hp: 1, maxHp: 1 })),
        ];
    const won = s?.over ? s.won : null;
    const out = { club: [] as Agent[], spear: [] as Agent[], chief: [] as Agent[], raider: [] as Agent[] };
    let si = 0;
    for (const f of list) {
      const spec = FIGHTERS[f.kind];
      if (spec.still) {
        const g = statics.current[si++];
        if (!g) continue;
        g.visible = true;
        g.position.set(f.x, 0, f.z);
        g.userData.kind = f.kind;
        // Broken down: it sinks and tips over.
        const broken = !f.alive ? Math.min(1, (t - f.diedAt) / 0.5) : 0;
        g.rotation.set(broken * 1.2, 0, 0);
        g.position.y = -broken * 0.15;
        for (const c of g.children) c.visible = c.name === f.kind;
        continue;
      }
      const us = f.side === "us";
      const strike = t - f.struckAt < 0.45 ? (t - f.struckAt) / 0.45 : undefined;
      const fallen = f.alive ? 0 : Math.min(1, (t - f.diedAt) / 0.35);
      const big = f.kind === "brute" ? 1.75 : f.kind === "chief" ? 1.6 : f.kind === "torch" ? 1.3 : 1.45;
      const agent: Agent = {
        x: f.x,
        y: 0,
        z: f.z,
        heading: f.heading,
        moving: f.alive && f.moving,
        scale: big,
        tunic: us ? (f.kind === "chief" ? "#7c3aed" : f.kind === "spearman" ? "#3f5f8a" : "#5b6f8a") : f.kind === "torch" ? "#c2410c" : f.kind === "brute" ? "#5a1414" : theirTunic,
        skin: SKINS[f.id % SKINS.length],
        hair: "#2b1b10",
        phase: f.id * 0.7,
        strike: f.alive ? strike : undefined,
        fallen,
        crown: f.kind === "chief",
        cheer: f.alive && won !== null && (us ? won : !won),
      };
      if (!us) out.raider.push(agent);
      else if (f.kind === "spearman") out.spear.push(agent);
      else if (f.kind === "chief") out.chief.push(agent);
      else out.club.push(agent);
    }
    for (let i = si; i < maxStatics; i++) if (statics.current[i]) statics.current[i]!.visible = false;
    clubs.current = out.club;
    spears.current = out.spear;
    chiefs.current = out.chief;
    raiders.current = out.raider;
    // Arrows in flight, on an arc from the tower to their mark.
    const flying = s?.arrows ?? [];
    arrows.current.forEach((m, i) => {
      if (!m) return;
      const a = flying[i];
      if (!a || !s) {
        m.visible = false;
        return;
      }
      const target = s.fighters[a.target];
      const k = Math.min(1, (t - a.shot) / Math.max(0.01, a.lands - a.shot));
      const x = a.from.x + (target.x - a.from.x) * k;
      const z = a.from.z + (target.z - a.from.z) * k;
      m.visible = true;
      m.position.set(x, 1.0 + (0.35 - 1.0) * k + Math.sin(k * Math.PI) * 0.4, z);
      m.rotation.set(0, Math.atan2(target.x - a.from.x, target.z - a.from.z), 0);
    });
    // The tally, a few times a second.
    if (s && t - counted.current > 0.25) {
      counted.current = t;
      const alive = (side: "us" | "them") => s.fighters.filter((f) => f.alive && f.side === side && !FIGHTERS[f.kind].still).length;
      onCount({ us: alive("us"), them: alive("them") });
    }
  });

  return (
    <>
      <Figures agents={clubs} max={44} weapon={era >= 2 ? "sword" : "club"} colorKey="club" />
      <Figures agents={spears} max={44} weapon="spear" colorKey="spear" />
      <Figures agents={chiefs} max={2} weapon="sword" colorKey="chief" />
      <Figures agents={raiders} max={44} weapon="club" colorKey="raider" />
      {Array.from({ length: 16 }, (_, i) => (
        <group key={i} ref={(g) => void (statics.current[i] = g)} visible={false}>
          {/* A palisade: three sharpened stakes, lashed. */}
          <group name="palisade">
            {[-0.13, 0, 0.13].map((x) => (
              <group key={x} position={[x, 0, 0]}>
                <mesh castShadow position={[0, 0.22, 0]}>
                  <cylinderGeometry args={[0.04, 0.045, 0.44, 6]} />
                  <meshStandardMaterial color="#7a4a24" />
                </mesh>
                <mesh castShadow position={[0, 0.49, 0]}>
                  <coneGeometry args={[0.04, 0.1, 6]} />
                  <meshStandardMaterial color="#a8763e" />
                </mesh>
              </group>
            ))}
            <mesh position={[0, 0.3, 0]}>
              <boxGeometry args={[0.34, 0.03, 0.05]} />
              <meshStandardMaterial color="#4f8a2c" />
            </mesh>
          </group>
          {/* A watch tower: four legs, a platform, a roof. */}
          <group name="tower">
            {[
              [-0.15, -0.15],
              [0.15, -0.15],
              [-0.15, 0.15],
              [0.15, 0.15],
            ].map(([x, z]) => (
              <mesh key={`${x}${z}`} castShadow position={[x, 0.45, z]}>
                <boxGeometry args={[0.05, 0.9, 0.05]} />
                <meshStandardMaterial color="#6b4423" />
              </mesh>
            ))}
            <mesh castShadow position={[0, 0.92, 0]}>
              <boxGeometry args={[0.44, 0.06, 0.44]} />
              <meshStandardMaterial color="#8a5a2e" />
            </mesh>
            <mesh castShadow position={[0, 1.28, 0]}>
              <coneGeometry args={[0.36, 0.3, 4]} />
              <meshStandardMaterial color="#9b1c1c" flatShading />
            </mesh>
          </group>
        </group>
      ))}
      {Array.from({ length: 24 }, (_, i) => (
        <mesh key={i} ref={(m) => void (arrows.current[i] = m)} visible={false}>
          <boxGeometry args={[0.012, 0.012, 0.22]} />
          <meshStandardMaterial color="#3b2a1a" />
        </mesh>
      ))}
    </>
  );
}
