"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Color, Matrix4, Object3D, type Group, type InstancedMesh } from "three";
import { useGame } from "@/components/civ/game-provider";
import { Figures, type Agent } from "@/components/civ/world/figures";
import { useHoldWorld } from "@/components/civ/cutscene/active";
import { PixelIcon } from "@/components/civ/pixel-icon";
import { amountText, battleRoster, commandSetup, commanding, kingdomInfo, raidSpoils } from "@/game/engine";
import {
  BIOMES,
  FIGHTERS,
  HALF_W,
  TACTICS,
  THEM_ZONE,
  US_ZONE,
  applyOrder,
  autoLineup,
  battleResult,
  fieldOf,
  heightAt,
  inOurZone,
  shoots,
  startBattle,
  stepBattle,
  waterAt,
  type BattleResult,
  type BattleSim,
  type Field as Ground,
  type FighterKind,
  type Order,
  type Placed,
} from "@/game/battle";
import { mulberry32 } from "@/game/noise";
import type { IconId } from "@/game/sprites";
import { playSfx } from "@/lib/audio";
import { currentShot, endShot } from "./letterbox";
import { cn } from "@/lib/utils";

// A commanded battle, like a tabletop: when the raiders land, the game waits
// while you set out your army on your side of the field (warriors, spearmen,
// archers, riders, mercenaries, the chief, palisades, towers) on the ground
// where they landed (woods, a river, hills, rocks, mud), then press Fight.
// In the fight, pick fighters (click one, shift-click more, or a whole group)
// and click the ground to send them there; tell them to hold or charge; or
// fight as one of them yourself. The engine plays the very same fight, with
// the very same orders, to take the result.

const NAMES: Record<FighterKind, [string, string]> = {
  warrior: ["Warrior", "warriors"],
  spearman: ["Spearman", "spearmen"],
  archer: ["Archer", "archers"],
  rider: ["Rider", "riders"],
  merc: ["Mercenary", "mercenaries"],
  chief: ["Chief", "the chief"],
  raider: ["Raider", "raiders"],
  brute: ["Brute", "brutes"],
  torch: ["Torch-bearer", "torch-bearers"],
  bowman: ["Bowman", "bowmen"],
  horseman: ["Horseman", "horsemen"],
  palisade: ["Palisade", "palisades"],
  tower: ["Tower", "towers"],
};
const ICONS: Partial<Record<FighterKind, IconId>> = {
  warrior: "sword",
  spearman: "spear",
  archer: "bow",
  rider: "horse",
  merc: "coin",
  chief: "crown",
  palisade: "shield",
  tower: "beacon",
};
const OURS: FighterKind[] = ["warrior", "spearman", "archer", "rider", "merc", "chief", "palisade", "tower"];
const MOBILE: FighterKind[] = ["warrior", "spearman", "archer", "rider", "merc", "chief"];
const STEP = 0.05;
// An order as given (the step it starts at is added).
type Bare<T> = T extends unknown ? Omit<T, "at"> : never;
type Given = Bare<Order>;
// The last blows play out slowly, like a film.
const SLOW_MO = 0.35;

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
  // How the raiders stand (the same lineup the fight will use), and the ground.
  const preview = useMemo(() => commandSetup(state, raid, []), [state, raid]);
  const field = useMemo(() => fieldOf(preview.seed, preview.biome), [preview.seed, preview.biome]);
  const [placed, setPlaced] = useState<Placed[]>(() => autoLineup(roster, preview.seed, preview.biome));
  const [tool, setTool] = useState<FighterKind | "erase">("warrior");
  const [phase, setPhase] = useState<Phase>("deploy");
  // How the army starts: charging, or holding where they were put.
  const [stance, setStance] = useState<"charge" | "hold">("charge");
  const [speed, setSpeed] = useState(1);
  const [result, setResult] = useState<BattleResult | null>(null);
  const [count, setCount] = useState<{ us: number; them: number } | null>(null);
  // Who is picked, and who the player fights as.
  const [picked, setPicked] = useState<number[]>([]);
  const [hero, setHero] = useState<{ id: number; kind: FighterKind } | null>(null);
  const pickedRef = useRef<number[]>([]);
  const sim = useRef<BattleSim | null>(null);
  const orders = useRef<Order[]>([]);
  const keys = useRef({ up: false, down: false, left: false, right: false });

  const pick = (ids: number[]) => {
    pickedRef.current = ids;
    setPicked(ids);
  };

  // The mouse is needed here (first person had it locked), and any camera
  // shot on the map behind is over.
  useEffect(() => {
    if (document.pointerLockElement) document.exitPointerLock();
    if (currentShot()) endShot();
  }, []);

  // An order: carried out now, and kept for the engine to replay.
  const give = (o: Given) => {
    const s = sim.current;
    if (!s || s.over) return;
    const order = { ...o, at: s.steps } as Order;
    applyOrder(s, order);
    orders.current.push(order);
  };
  const alive = (ids: number[]) => ids.filter((id) => sim.current?.fighters[id]?.alive);
  const ours = (kind?: FighterKind) =>
    (sim.current?.fighters ?? []).filter((f) => f.alive && f.side === "us" && !FIGHTERS[f.kind].still && (!kind || f.kind === kind)).map((f) => f.id);
  const fightAs = (id: number) => {
    const f = sim.current?.fighters[id];
    if (!f) return;
    keys.current = { up: false, down: false, left: false, right: false };
    give({ kind: "steer", id, dx: 0, dz: 0 });
    setHero({ id, kind: f.kind });
    playSfx("click");
  };
  // A few times a second (from the field): the tally, and the fallen
  // dropped from who is picked (and who you fight as).
  const tally = (c: { us: number; them: number }) => {
    setCount(c);
    const s = sim.current;
    if (!s) return;
    const live = pickedRef.current.filter((id) => s.fighters[id]?.alive);
    if (live.length !== pickedRef.current.length) pick(live);
    if (!s.control) setHero(null);
  };
  const letGo = () => {
    give({ kind: "steer", id: -1, dx: 0, dz: 0 });
    setHero(null);
  };

  // Keys in the fight: WASD or arrows steer the one you fight as; F fights as
  // the one picked; H holds, C charges; Esc lets go, then unpicks.
  useEffect(() => {
    if (phase !== "fight") return;
    const map: Record<string, keyof typeof keys.current> = {
      w: "up",
      arrowup: "up",
      s: "down",
      arrowdown: "down",
      a: "left",
      arrowleft: "left",
      d: "right",
      arrowright: "right",
    };
    const update = () => {
      const s = sim.current;
      if (!s?.control) return;
      const k = keys.current;
      const dx = (k.right ? 1 : 0) - (k.left ? 1 : 0);
      const dz = (k.down ? 1 : 0) - (k.up ? 1 : 0);
      if (dx !== s.control.dx || dz !== s.control.dz) give({ kind: "steer", id: s.control.id, dx, dz });
    };
    const down = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === "escape") {
        if (sim.current?.control) letGo();
        else pick([]);
        return;
      }
      const k = map[key];
      if (k && sim.current?.control) {
        e.preventDefault();
        keys.current[k] = true;
        update();
        return;
      }
      const sel = alive(pickedRef.current);
      if (key === "f" && sel.length === 1) fightAs(sel[0]);
      if (key === "h" && sel.length) give({ kind: "hold", ids: sel });
      if (key === "c" && sel.length) give({ kind: "charge", ids: sel });
    };
    const up = (e: KeyboardEvent) => {
      const k = map[e.key.toLowerCase()];
      if (!k) return;
      keys.current[k] = false;
      update();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
    // The handlers read refs; they only need setting up once a fight starts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // A click on the field in the fight: on one of ours, pick them (shift: add
  // or take away); on open ground, send whoever is picked there.
  const clickFight = (x: number, z: number, shift: boolean) => {
    const s = sim.current;
    if (!s || s.over) return;
    let best = -1;
    let bestD = 0.4;
    for (const f of s.fighters) {
      if (!f.alive || f.side !== "us" || FIGHTERS[f.kind].still) continue;
      const d = Math.hypot(f.x - x, f.z - z);
      if (d < bestD) {
        bestD = d;
        best = f.id;
      }
    }
    const sel = alive(pickedRef.current);
    if (best >= 0) {
      if (shift) pick(sel.includes(best) ? sel.filter((id) => id !== best) : [...sel, best]);
      else pick(sel.length === 1 && sel[0] === best ? [] : [best]);
      playSfx("click");
      return;
    }
    if (!sel.length) return;
    give({ kind: "move", ids: sel, x, z });
    playSfx("step");
  };

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
    if (!inOurZone(x, z, field) || left(tool) <= 0) return;
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
    orders.current = [];
    setPhase("fight");
    if (stance === "hold") give({ kind: "hold", ids: ours() });
    playSfx("battle");
  };
  const finish = (s: BattleSim) => {
    setResult(battleResult(s));
    setHero(null);
    pick([]);
    setPhase("done");
    playSfx(s.won ? "win" : "lose");
  };
  const skip = () => {
    const s = sim.current;
    if (!s) return;
    while (!s.over) stepBattle(s);
    finish(s);
  };

  const spoils = raidSpoils(raid);
  const fell = result ? Object.entries(result.fell).reduce((n, [k, v]) => n + (k === "chief" ? 0 : (v ?? 0)), 0) : 0;
  const theirTunic = raid.kingdom ? kingdomInfo(state, raid.kingdom).tunic : "#9b1c1c";
  const plan = TACTICS[preview.tactic ?? "rush"];
  const sel = phase === "fight" ? picked : [];
  const heroKind = hero?.kind;
  const groups = MOBILE.filter((k) => (roster[k] ?? 0) > 0);
  const a = (word: string) => (/^[aeiou]/i.test(word) ? "an" : "a");

  return (
    <div className="fixed inset-0 z-[65] bg-[#1b2a17]" data-testid="command-battle">
      <Canvas dpr={[1, 1.5]} shadows camera={{ position: [0, 6.4, 7.2], fov: 46, near: 0.1, far: 120 }} gl={{ antialias: true }}>
        <Field phase={phase} tool={tool} onPlace={place} onErase={erase} onFightClick={clickFight} era={state.era} field={field} />
        <Army
          phase={phase}
          placed={placed}
          theirs={preview.theirs}
          sim={sim}
          speed={speed}
          theirTunic={theirTunic}
          era={state.era}
          field={field}
          picked={pickedRef}
          onCount={tally}
          onDone={finish}
        />
        {phase !== "deploy" && <OrbitControls enablePan={false} target={[0, 0, 0]} minDistance={4} maxDistance={14} maxPolarAngle={1.3} />}
      </Canvas>

      {/* Who is on the field, and the ground. */}
      <div className="pointer-events-none absolute inset-x-0 top-2 flex justify-center px-3">
        <div className="pixel-panel-dark font-pixel w-full max-w-[700px] px-4 py-2 text-white">
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
          <p className="mt-0.5 text-xs text-amber-200" data-testid="battle-plan">
            Their plan: <span className="font-semibold">{plan.name}</span>. {plan.hint}
          </p>
          <p className="mt-0.5 text-xs text-emerald-200" data-testid="battle-ground">
            The ground: {BIOMES[field.biome]}
          </p>
          {phase === "deploy" && (
            <p className="mt-1 text-[11px] text-white/75">
              Click (or drag) on the blue ground to place the chosen unit · right-click to take one away. Hills give height; trees give cover from arrows but slow you; wade a river only at a ford; rocks
              block the way and arrows. Hit them from the side or behind; a tight line holds; spearmen stop a charge.
            </p>
          )}
          {phase === "fight" && (
            <p className="mt-1 text-[11px] text-white/75" data-testid="battle-hero">
              {heroKind ? (
                <>
                  You are fighting as {heroKind === "chief" ? "the chief" : `${a(NAMES[heroKind][0])} ${NAMES[heroKind][0].toLowerCase()}`}:{" "}
                  <span className="text-amber-200">WASD or arrows to move</span>, they {shoots(heroKind) ? "shoot" : "strike"} whoever is in reach. Esc lets go.
                </>
              ) : sel.length ? (
                <>
                  {sel.length} picked: <span className="text-amber-200">click the ground to send them there</span> (they hold that spot), or Hold (H) or Charge (C)
                  {sel.length === 1 ? ", or fight as them (F)" : ""}. Esc unpicks.
                </>
              ) : (
                <>Click one of your fighters (shift-click for more), or pick a group below, then click where they should go. Drag to look around.</>
              )}
            </p>
          )}
        </div>
      </div>

      {/* Deploying: the roster and the orders. */}
      {phase === "deploy" && (
        <div className="absolute inset-x-0 bottom-2 flex justify-center px-3">
          <div className="pixel-panel-dark font-pixel flex w-full max-w-[860px] flex-wrap items-center gap-1.5 p-2 text-white">
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
            <button
              type="button"
              onClick={() => setStance(stance === "charge" ? "hold" : "charge")}
              className="pixel-btn bg-[#3f5a6b] px-2 py-1 text-xs"
              title="Charge: everyone goes for the raiders at once. Hold: everyone stays where you put them until you send them."
              data-testid="battle-stance"
            >
              Start: {stance === "charge" ? "Charge!" : "Hold the line"}
            </button>
            <button type="button" onClick={() => setPlaced(autoLineup(roster, preview.seed, preview.biome))} className="pixel-btn bg-[#4a3b2e] px-2 py-1 text-xs">
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

      {/* Fighting: picking groups, orders, and how fast to watch. */}
      {phase === "fight" && (
        <div className="absolute inset-x-0 bottom-2 flex justify-center px-3">
          <div className="pixel-panel-dark font-pixel flex max-w-[900px] flex-wrap items-center justify-center gap-1.5 p-2 text-xs text-white">
            <button type="button" onClick={() => pick(ours())} className="pixel-btn bg-[#4a3b2e] px-2 py-1" data-testid="pick-all">
              All
            </button>
            {groups.map((k) => (
              <button key={k} type="button" onClick={() => pick(ours(k))} className="pixel-btn flex items-center gap-1 bg-[#4a3b2e] px-2 py-1" data-testid={`pick-${k}`}>
                <PixelIcon name={ICONS[k]!} size={14} />
                {k === "chief" ? "Chief" : NAMES[k][1][0].toUpperCase() + NAMES[k][1].slice(1)}
              </button>
            ))}
            <span className="mx-1 h-5 w-px bg-white/20" />
            <button type="button" disabled={!sel.length} onClick={() => give({ kind: "hold", ids: sel })} className="pixel-btn bg-[#3f5a6b] px-2 py-1 disabled:opacity-40" data-testid="order-hold">
              Hold
            </button>
            <button type="button" disabled={!sel.length} onClick={() => give({ kind: "charge", ids: sel })} className="pixel-btn bg-red-800 px-2 py-1 disabled:opacity-40" data-testid="order-charge">
              Charge!
            </button>
            <button
              type="button"
              disabled={sel.length !== 1 && hero === null}
              onClick={() => (hero !== null ? letGo() : fightAs(sel[0]))}
              className="pixel-btn bg-amber-600 px-2 py-1 disabled:opacity-40"
              data-testid="order-fight-as"
            >
              {hero !== null ? "Let go" : "Fight as"}
            </button>
            <span className="mx-1 h-5 w-px bg-white/20" />
            {[0.5, 1, 2, 4].map((s) => (
              <button key={s} type="button" onClick={() => setSpeed(s)} className={cn("pixel-btn px-2 py-1", speed === s ? "bg-amber-400 text-[#2b2119]" : "bg-[#4a3b2e]")}>
                {s === 0.5 ? "½" : s}×
              </button>
            ))}
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
              onClick={() => dispatch({ type: "commandBattle", placements: placed, orders: orders.current })}
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

// The field: grass with what the land is like where they landed (hills,
// woods, a river and its fords, rocks, mud), our side lit blue (where we may
// deploy), theirs red. Clicks and drags on it place (or take away) units; in
// the fight a click picks fighters or sends them.
function Field({
  phase,
  tool,
  onPlace,
  onErase,
  onFightClick,
  era,
  field,
}: {
  phase: Phase;
  tool: FighterKind | "erase";
  onPlace: (x: number, z: number) => void;
  onErase: (x: number, z: number) => void;
  onFightClick: (x: number, z: number, shift: boolean) => void;
  era: number;
  field: Ground;
}) {
  const down = useRef(false);
  const grass = ["#6f9e45", "#7aa24c", "#8a9a50", "#5f8a3e", "#6a6a5a", "#4f9a5a"][Math.min(era, 5)];
  const at = (e: ThreeEvent<PointerEvent>) => ({ x: e.point.x, z: e.point.z });
  // Trees in each wood, the same every time.
  const trees = useMemo(() => {
    const out: { x: number; z: number; h: number }[] = [];
    field.woods.forEach((w, i) => {
      const rand = mulberry32(i * 97 + Math.round(w.x * 100) + Math.round(w.z * 1000));
      const n = Math.max(4, Math.round(w.r * w.r * 9));
      for (let k = 0; k < n; k++) {
        const a = rand() * Math.PI * 2;
        const r = Math.sqrt(rand()) * (w.r - 0.1);
        out.push({ x: w.x + Math.cos(a) * r, z: w.z + Math.sin(a) * r, h: 0.4 + rand() * 0.22 });
      }
    });
    return out;
  }, [field]);
  const trunks = useRef<InstancedMesh>(null);
  const crowns = useRef<InstancedMesh>(null);
  useEffect(() => {
    const o = new Object3D();
    trees.forEach((t, i) => {
      const y = heightAt(field, t.x, t.z);
      o.position.set(t.x, y + t.h * 0.25, t.z);
      o.scale.set(1, t.h, 1);
      o.updateMatrix();
      trunks.current?.setMatrixAt(i, o.matrix);
      o.position.set(t.x, y + t.h * 0.75, t.z);
      o.scale.set(t.h, t.h, t.h);
      o.updateMatrix();
      crowns.current?.setMatrixAt(i, o.matrix);
    });
    for (const m of [trunks.current, crowns.current]) if (m) m.instanceMatrix.needsUpdate = true;
  }, [trees, field]);
  const river = field.river;
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
        onClick={(e) => {
          // A click (not a drag to look around) in the fight.
          if (phase !== "fight" || e.delta > 6) return;
          onFightClick(e.point.x, e.point.z, e.nativeEvent.shiftKey);
        }}
        onContextMenu={(e) => {
          e.nativeEvent.preventDefault();
          // Right-click in the fight: send whoever is picked there.
          if (phase === "fight") onFightClick(e.point.x, e.point.z, false);
        }}
      >
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color={grass} />
      </mesh>
      {/* Hills (clicks go through them to the ground). */}
      {field.hills.map((h, i) => (
        <mesh key={`h${i}`} position={[h.x, 0, h.z]} scale={[1, 0.32 / h.r, 1]} receiveShadow castShadow raycast={() => null}>
          <sphereGeometry args={[h.r, 28, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={grass} flatShading />
        </mesh>
      ))}
      {/* The woods' floor. */}
      {field.woods.map((w, i) => (
        <mesh key={`w${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[w.x, 0.005, w.z]} raycast={() => null}>
          <circleGeometry args={[w.r, 24]} />
          <meshStandardMaterial color="#4c7a35" roughness={1} />
        </mesh>
      ))}
      {/* Mud. */}
      {field.mud.map((m, i) => (
        <mesh key={`m${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[m.x, 0.008, m.z]} raycast={() => null}>
          <circleGeometry args={[m.r, 20]} />
          <meshStandardMaterial color="#6b4f2e" roughness={1} />
        </mesh>
      ))}
      {/* The river, its sandy banks, and the fords (shallow, with stepping stones). */}
      {river && (
        <group raycast={() => null}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, river.z]} raycast={() => null}>
            <planeGeometry args={[HALF_W * 2 + 6, river.half * 2 + 0.16]} />
            <meshStandardMaterial color="#cdb889" />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, river.z]} raycast={() => null}>
            <planeGeometry args={[HALF_W * 2 + 6, river.half * 2]} />
            <meshStandardMaterial color="#2f7fc1" transparent opacity={0.9} metalness={0.2} roughness={0.3} />
          </mesh>
          {river.fords.map((f, i) => (
            <group key={`f${i}`}>
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[f.x, 0.016, river.z]} raycast={() => null}>
                <planeGeometry args={[f.half * 2, river.half * 2]} />
                <meshStandardMaterial color="#8fc0dc" transparent opacity={0.92} />
              </mesh>
              {[-0.5, 0, 0.5].map((k) => (
                <mesh key={k} position={[f.x + k * f.half, 0.03, river.z + k * 0.12]} raycast={() => null}>
                  <dodecahedronGeometry args={[0.06, 0]} />
                  <meshStandardMaterial color="#9a958e" flatShading />
                </mesh>
              ))}
            </group>
          ))}
        </group>
      )}
      {/* Rocks. */}
      {field.rocks.map((r, i) => (
        <mesh key={`r${i}`} position={[r.x, r.r * 0.45, r.z]} scale={[1, 0.8, 1]} castShadow raycast={() => null}>
          <dodecahedronGeometry args={[r.r, 0]} />
          <meshStandardMaterial color="#8f8a84" flatShading />
        </mesh>
      ))}
      {/* Woods. */}
      <instancedMesh key={`t${trees.length}`} ref={trunks} args={[undefined, undefined, Math.max(1, trees.length)]} castShadow raycast={() => null}>
        <cylinderGeometry args={[0.035, 0.05, 0.5, 6]} />
        <meshStandardMaterial color="#6b4423" />
      </instancedMesh>
      <instancedMesh key={`c${trees.length}`} ref={crowns} args={[undefined, undefined, Math.max(1, trees.length)]} castShadow raycast={() => null}>
        <coneGeometry args={[0.2, 0.55, 7]} />
        {/* A little see-through, so nobody is lost in the trees. */}
        <meshStandardMaterial color="#3f7a35" flatShading transparent opacity={0.82} />
      </instancedMesh>
      {/* Our side, and theirs. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, (US_ZONE[0] + US_ZONE[1]) / 2]} raycast={() => null}>
        <planeGeometry args={[HALF_W * 2, US_ZONE[1] - US_ZONE[0]]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={phase === "deploy" ? 0.2 : 0.04} depthWrite={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, (THEM_ZONE[0] + THEM_ZONE[1]) / 2]} raycast={() => null}>
        <planeGeometry args={[HALF_W * 2, THEM_ZONE[1] - THEM_ZONE[0]]} />
        <meshBasicMaterial color="#ef4444" transparent opacity={phase === "deploy" ? 0.14 : 0.04} depthWrite={false} />
      </mesh>
    </>
  );
}

const SKINS = ["#e0ac69", "#c68642", "#f1c7a0", "#8d5524", "#f5d0b0"];
// Someone on horseback sits this high above the ground (their horse below).
const SADDLE = 0.13;
const MOUNT = 1.3;

// A horse for each rider (drawn under them): body, neck, head, tail and four
// legs that gallop while moving, all from one instanced box.
type Mount = { x: number; y: number; z: number; heading: number; moving: boolean; phase: number; fallen: number; ours: boolean };
const HORSE_PARTS: { size: [number, number, number]; at: [number, number, number]; tilt: number; leg?: number }[] = [
  { size: [0.12, 0.13, 0.4], at: [0, 0.26, 0], tilt: 0 },
  { size: [0.08, 0.2, 0.08], at: [0, 0.37, 0.17], tilt: 0.55 },
  { size: [0.07, 0.07, 0.17], at: [0, 0.46, 0.25], tilt: 0 },
  { size: [0.03, 0.15, 0.03], at: [0, 0.26, -0.22], tilt: -0.5 },
  { size: [0.04, 0.2, 0.04], at: [-0.045, 0.1, 0.14], tilt: 0, leg: 0 },
  { size: [0.04, 0.2, 0.04], at: [0.045, 0.1, 0.14], tilt: 0, leg: 1 },
  { size: [0.04, 0.2, 0.04], at: [-0.045, 0.1, -0.14], tilt: 0, leg: 1 },
  { size: [0.04, 0.2, 0.04], at: [0.045, 0.1, -0.14], tilt: 0, leg: 0 },
];
function Horses({ mounts, max }: { mounts: React.RefObject<Mount[]>; max: number }) {
  const mesh = useRef<InstancedMesh>(null);
  const tmp = useMemo(() => ({ horse: new Object3D(), part: new Object3D(), out: new Matrix4(), colour: new Color() }), []);
  useFrame(({ clock }) => {
    const m = mesh.current;
    if (!m) return;
    const list = (mounts.current ?? []).slice(0, Math.floor(max / HORSE_PARTS.length));
    const t = clock.elapsedTime;
    const { horse, part, out, colour } = tmp;
    let n = 0;
    for (const h of list) {
      horse.position.set(h.x, h.y, h.z);
      horse.rotation.set(0, h.heading, (h.fallen * Math.PI) / 2, "YXZ");
      horse.scale.setScalar(MOUNT);
      horse.updateMatrix();
      const gallop = h.moving ? Math.sin(t * 13 + h.phase) * 0.7 : 0;
      for (const p of HORSE_PARTS) {
        part.position.set(p.at[0], p.at[1] + (p.leg === undefined && h.moving ? Math.abs(gallop) * 0.02 : 0), p.at[2]);
        part.rotation.set(p.leg === undefined ? p.tilt : gallop * (p.leg ? 1 : -1), 0, 0);
        part.scale.set(...p.size);
        part.updateMatrix();
        out.multiplyMatrices(horse.matrix, part.matrix);
        m.setMatrixAt(n, out);
        m.setColorAt(n, colour.set(h.ours ? "#8a5a33" : "#3b2a20"));
        n++;
      }
    }
    m.count = n;
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  });
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, max]} castShadow frustumCulled={false} raycast={() => null}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#ffffff" />
    </instancedMesh>
  );
}

// Flat rings and markers on the ground, as many as needed (the rest hidden).
function Marks({ marks, max, color, inner, outer, opacity = 0.9 }: { marks: React.RefObject<{ x: number; y: number; z: number; s?: number }[]>; max: number; color: string; inner: number; outer: number; opacity?: number }) {
  const mesh = useRef<InstancedMesh>(null);
  const o = useMemo(() => new Object3D(), []);
  useFrame(({ clock }) => {
    const m = mesh.current;
    if (!m) return;
    const list = (marks.current ?? []).slice(0, max);
    list.forEach((p, i) => {
      o.position.set(p.x, p.y + 0.025, p.z);
      o.rotation.set(-Math.PI / 2, 0, clock.elapsedTime * 1.5);
      o.scale.setScalar(p.s ?? 1);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    });
    m.count = list.length;
    m.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, max]} frustumCulled={false} raycast={() => null}>
      <ringGeometry args={[inner, outer, 20]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
    </instancedMesh>
  );
}

// Everyone on the field: before the fight where they were put, then as the
// fight plays out (stepped here, as fast as chosen). The fallen go flying
// from the blow that felled them; every hit throws a spark; the last blows
// play out slowly.
function Army({
  phase,
  placed,
  theirs,
  sim,
  speed,
  theirTunic,
  era,
  field,
  picked,
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
  field: Ground;
  picked: React.RefObject<number[]>;
  onCount: (c: { us: number; them: number }) => void;
  onDone: (s: BattleSim) => void;
}) {
  const clubs = useRef<Agent[]>([]);
  const spears = useRef<Agent[]>([]);
  const bows = useRef<Agent[]>([]);
  const riders = useRef<Agent[]>([]);
  const mercs = useRef<Agent[]>([]);
  const chiefs = useRef<Agent[]>([]);
  const raiders = useRef<Agent[]>([]);
  const bowmen = useRef<Agent[]>([]);
  const horsemen = useRef<Agent[]>([]);
  const mounts = useRef<Mount[]>([]);
  const pickedMarks = useRef<{ x: number; y: number; z: number; s?: number }[]>([]);
  const heroMarks = useRef<{ x: number; y: number; z: number; s?: number }[]>([]);
  const goalMarks = useRef<{ x: number; y: number; z: number; s?: number }[]>([]);
  const sparks = useRef<InstancedMesh>(null);
  const statics = useRef<(Group | null)[]>([]);
  const arrows = useRef<(Group | null)[]>([]);
  const acc = useRef(0);
  const counted = useRef(0);
  const ended = useRef(false);
  const spark = useMemo(() => new Object3D(), []);
  const maxStatics = 16;
  const maxArrows = 80;
  const ground = (x: number, z: number) => heightAt(field, x, z) - (waterAt(field, x, z) === "deep" ? 0.07 : waterAt(field, x, z) === "ford" ? 0.02 : 0);

  useFrame((_, delta) => {
    const s = sim.current;
    const fighting = phase !== "deploy" && s;
    if (fighting && phase === "fight" && !s.over) {
      const left = (side: "us" | "them") => s.fighters.filter((f) => f.alive && f.side === side && !FIGHTERS[f.kind].still).length;
      const slow = Math.min(left("us"), left("them")) <= 1 ? SLOW_MO : 1;
      acc.current += Math.min(delta, 0.1) * speed * slow;
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
          ...placed.map((p, i) => ({ id: i, side: "us" as const, kind: p.kind, x: p.x, z: p.z, alive: true, heading: Math.PI, moving: false, struckAt: -9, hurtAt: -9, diedAt: -1, flung: 0, goal: null, holding: false })),
          ...theirs.map((p, i) => ({ id: 1000 + i, side: "them" as const, kind: p.kind, x: p.x, z: p.z, alive: true, heading: 0, moving: false, struckAt: -9, hurtAt: -9, diedAt: -1, flung: 0, goal: null, holding: false })),
        ];
    const won = s?.over ? s.won : null;
    const out = {
      club: [] as Agent[],
      spear: [] as Agent[],
      bow: [] as Agent[],
      rider: [] as Agent[],
      merc: [] as Agent[],
      chief: [] as Agent[],
      raider: [] as Agent[],
      bowman: [] as Agent[],
      horseman: [] as Agent[],
    };
    const horses: Mount[] = [];
    const goals: { x: number; y: number; z: number; s?: number }[] = [];
    let si = 0;
    let sparked = 0;
    for (const f of list) {
      const spec = FIGHTERS[f.kind];
      if (spec.still) {
        const g = statics.current[si++];
        if (!g) continue;
        const y = ground(f.x, f.z);
        g.visible = true;
        // Broken down: it sinks and tips over.
        const broken = !f.alive ? Math.min(1, (t - f.diedAt) / 0.5) : 0;
        g.position.set(f.x, y - broken * 0.15, f.z);
        g.rotation.set(broken * 1.2, 0, 0);
        for (const c of g.children) c.visible = c.name === f.kind;
        continue;
      }
      const us = f.side === "us";
      const riding = !!spec.charge;
      // Felled: flung away from the blow, tumbling, then down.
      const k = f.alive ? 0 : Math.min(1, (t - f.diedAt) / 0.5);
      const fly = f.flung * (1 - (1 - k) * (1 - k));
      const x = f.x + Math.sin(f.heading) * fly;
      const z = f.z + Math.cos(f.heading) * fly;
      const lift = Math.sin(k * Math.PI) * f.flung * 0.45;
      // A shot is quicker to draw than a blow.
      const blowTime = shoots(f.kind) ? 0.6 : 0.45;
      const strike = t - f.struckAt < blowTime ? (t - f.struckAt) / blowTime : undefined;
      const fallen = f.alive ? 0 : Math.min(1, (t - f.diedAt) / 0.45);
      const big = f.kind === "brute" ? 1.75 : f.kind === "chief" ? 1.6 : f.kind === "torch" ? 1.3 : f.kind === "merc" ? 1.55 : 1.45;
      const tunic = us
        ? ({ chief: "#7c3aed", spearman: "#3f5f8a", archer: "#2f6b4f", rider: "#4b5e9a", merc: "#8a6d2b" } as Record<string, string>)[f.kind] ?? "#5b6f8a"
        : f.kind === "torch"
          ? "#c2410c"
          : f.kind === "brute"
            ? "#5a1414"
            : f.kind === "bowman"
              ? "#6b2a2a"
              : theirTunic;
      const y = ground(x, z) + lift;
      const agent: Agent = {
        x,
        y: y + (riding && !fallen ? SADDLE * MOUNT : 0),
        z,
        heading: f.heading + (f.alive ? 0 : k * f.flung * 5),
        moving: f.alive && f.moving && !riding,
        scale: big,
        tunic,
        skin: SKINS[f.id % SKINS.length],
        hair: f.kind === "merc" ? "#5a3a1a" : "#2b1b10",
        phase: f.id * 0.7,
        strike: f.alive ? strike : undefined,
        fallen,
        crown: f.kind === "chief",
        cheer: f.alive && won !== null && (us ? won : !won),
        riding: riding && !fallen,
      };
      if (riding) horses.push({ x: f.x, y: ground(f.x, f.z), z: f.z, heading: f.heading, moving: f.alive && f.moving, phase: f.id * 0.9, fallen, ours: us });
      // A spark where a blow or an arrow just landed.
      const hurt = t - f.hurtAt;
      if (fighting && hurt < 0.18 && sparks.current && sparked < 40) {
        const g = 1 - hurt / 0.18;
        spark.position.set(f.x, y + 0.42 * big * 0.75, f.z);
        spark.rotation.set(t * 9, t * 7, 0);
        spark.scale.setScalar(0.05 + g * 0.09);
        spark.updateMatrix();
        sparks.current.setMatrixAt(sparked++, spark.matrix);
      }
      if (f.alive && us && f.goal && !f.holding) goals.push({ x: f.goal.x, y: ground(f.goal.x, f.goal.z), z: f.goal.z, s: 0.6 });
      const group: keyof typeof out = us
        ? f.kind === "spearman"
          ? "spear"
          : f.kind === "archer"
            ? "bow"
            : f.kind === "rider"
              ? "rider"
              : f.kind === "merc"
                ? "merc"
                : f.kind === "chief"
                  ? "chief"
                  : "club"
        : f.kind === "bowman"
          ? "bowman"
          : f.kind === "horseman"
            ? "horseman"
            : "raider";
      out[group].push(agent);
    }
    if (sparks.current) {
      sparks.current.count = sparked;
      sparks.current.instanceMatrix.needsUpdate = true;
    }
    for (let i = si; i < maxStatics; i++) if (statics.current[i]) statics.current[i]!.visible = false;
    clubs.current = out.club;
    spears.current = out.spear;
    bows.current = out.bow;
    riders.current = out.rider;
    mercs.current = out.merc;
    chiefs.current = out.chief;
    raiders.current = out.raider;
    bowmen.current = out.bowman;
    horsemen.current = out.horseman;
    mounts.current = horses;
    goalMarks.current = goals;
    // Rings: who is picked, and (gold) who you fight as.
    const at = (id: number) => {
      const f = s?.fighters[id];
      return f && f.alive ? [{ x: f.x, y: ground(f.x, f.z), z: f.z, s: FIGHTERS[f.kind].charge ? 1.4 : 1 }] : [];
    };
    pickedMarks.current = s ? (picked.current ?? []).flatMap(at) : [];
    heroMarks.current = s?.control ? at(s.control.id) : [];
    // Arrows in flight, on an arc from the bow (or tower) to their mark (or
    // just beside it, when they miss, or the rock that stops them).
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
      const dx = target.x - a.from.x;
      const dz = target.z - a.from.z;
      const d = Math.hypot(dx, dz) || 1;
      const ex = a.stop ? a.stop.x : target.x + (-dz / d) * a.miss;
      const ez = a.stop ? a.stop.z : target.z + (dx / d) * a.miss;
      const lift = 0.25 + d * 0.18;
      const y0 = ground(a.from.x, a.from.z) + 0.6;
      const y1 = ground(ex, ez) + (a.miss ? 0.05 : a.stop ? 0.2 : 0.4);
      const y = y0 + (y1 - y0) * k + Math.sin(k * Math.PI) * lift;
      // Pointing along the arc: up at first, down as it falls.
      const slope = (y1 - y0) / d + (Math.cos(k * Math.PI) * Math.PI * lift) / d;
      m.visible = true;
      m.position.set(a.from.x + (ex - a.from.x) * k, y, a.from.z + (ez - a.from.z) * k);
      m.rotation.set(-Math.atan(slope), Math.atan2(ex - a.from.x, ez - a.from.z), 0, "YXZ");
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
      <Figures agents={bows} max={44} weapon="bow" colorKey="bow" />
      <Figures agents={riders} max={44} weapon={era >= 2 ? "sword" : "spear"} colorKey="rider" />
      <Figures agents={mercs} max={44} weapon="sword" colorKey="merc" />
      <Figures agents={chiefs} max={2} weapon="sword" colorKey="chief" />
      <Figures agents={raiders} max={44} weapon="club" colorKey="raider" />
      <Figures agents={bowmen} max={44} weapon="bow" colorKey="bowman" />
      <Figures agents={horsemen} max={44} weapon="club" colorKey="horseman" />
      <Horses mounts={mounts} max={HORSE_PARTS.length * 44} />
      <Marks marks={pickedMarks} max={44} color="#67e8f9" inner={0.19} outer={0.24} />
      <Marks marks={heroMarks} max={1} color="#fcd34d" inner={0.2} outer={0.28} />
      <Marks marks={goalMarks} max={44} color="#67e8f9" inner={0.05} outer={0.1} opacity={0.6} />
      <instancedMesh ref={sparks} args={[undefined, undefined, 40]} frustumCulled={false} raycast={() => null}>
        <icosahedronGeometry args={[1, 0]} />
        <meshBasicMaterial color="#fff3b0" />
      </instancedMesh>
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
      {/* Arrows: a pale shaft with red feathers, big enough to follow. */}
      {Array.from({ length: maxArrows }, (_, i) => (
        <group key={i} ref={(g) => void (arrows.current[i] = g)} visible={false}>
          <mesh>
            <boxGeometry args={[0.022, 0.022, 0.36]} />
            <meshStandardMaterial color="#f1e2bd" emissive="#3a2a10" />
          </mesh>
          <mesh position={[0, 0, -0.16]}>
            <boxGeometry args={[0.07, 0.008, 0.07]} />
            <meshStandardMaterial color="#d7263d" />
          </mesh>
          <mesh position={[0, 0, 0.19]} rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.025, 0.06, 4]} />
            <meshStandardMaterial color="#5f656b" />
          </mesh>
        </group>
      ))}
    </>
  );
}
