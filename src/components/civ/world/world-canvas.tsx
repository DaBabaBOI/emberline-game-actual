"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Canvas, useFrame } from "@react-three/fiber";
import { Vector3, type Group } from "three";
import { MapControls, PerformanceMonitor } from "@react-three/drei";
import { Html } from "./html";
import type { MapControls as MapControlsImpl } from "three-stdlib";
import { BUILDINGS_BY_ID, CLEAR_LAND, ERAS, formatYear, IMPROVE, LAST_TUTORIAL, LOW_WOOD_AFTER_BUY, RELIGHT_WOOD, TUTORIAL, WEAR, SMOG } from "@/game/content";
import { CANOE_TOOL, SCOUT_TOOL, canoeTargetError, canoeTicks, scoutTargetError, scoutTicks } from "@/game/engine";
import {
  buildingCost,
  DEMOLISH_TOOL,
  dustNote,
  landmarkDone,
  inPlague,
  sparkNote,
  forestToClear,
  rainfall,
  spearmenOf,
  residents,
  tallyOf,
  fireScareNote,
  gatherNote,
  inDrought,
  isLit,
  landStrain,
  litFires,
  demolishError,
  demolishRefund,
  PLANT_TOOL,
  CLEAR_TOOL,
  clearArea,
  clearAreaError,
  plantError,
  placementError,
  townNote,
  connectionNote,
  effectAreas,
  dusty,
  scaredByFire,
  salvageOf,
  scrapClearCost,
  scrapEra,
  soilOf,
  linkedAqueducts,
  clearLandWood,
  shownBattle,
  planError,
} from "@/game/engine";
import { BuildingInfo } from "./building-info";
import { useGame } from "@/components/civ/game-provider";
import { PixelIcon } from "@/components/civ/pixel-icon";
import { ScoutMarker, SmallMoment } from "./moments";
import { Rebels } from "./rebels";
import { goodSpots, tileAnchor } from "@/components/civ/guide";
import { useGuide } from "@/components/civ/hud/guide-overlay";
import type { GameState, Tile } from "@/game/types";
import { BiomeDetails, Deposits, Forests, HexTerrain, Mountains, tileTop, treeSpots } from "./hex-terrain";
import { BUILDING_SCALE, MODELS, buildingTurn } from "./building-models";
import { turnFor } from "./facing";
import { BattleScene, FireVictims, Raiders, Villagers, Warriors } from "./villagers";
import { PickUp } from "./pick-up";
import { SeaTraffic, TradeShips, WaitingShips } from "./trade";
import { ForeignVillages } from "./foreign";
import { Cracks, DisasterDust, disasterView, FloodWater, QuakeShake, Rubble, StormRain } from "./disasters";
import { Wildlife } from "./wildlife";
import { Links } from "./links";
import { RebuildDust, RebuildPop } from "./rebuild";
import { useHoveredBuilding } from "./hovered";
import { usePlanMode } from "./plan-mode";
import { CampfireSmoke, ChimneySmoke, Wildfire } from "./atmosphere";
import { Clouds, DaySky, FireLights } from "./sky";
import { Sea } from "./water";
import { FilmLook } from "./effects";
import { CinematicCamera } from "./cinematic";
import { Fireworks } from "./fireworks";
import { Islet } from "./islet";
import { useFireworks } from "@/components/civ/hud/eggs";
import { cameosFor } from "@/game/easter";
import { playShot, useShot } from "@/components/civ/hud/letterbox";
import { useDaylight, useGraphics } from "@/lib/graphics";
import { UnderConstruction } from "./medieval-models";
import { Mice } from "./moments";
import { hexDistance } from "@/game/hex";

function HexOutline({ x, y, z, color }: { x: number; y: number; z: number; color: string }) {
  return (
    <mesh position={[x, y + 0.02, z]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
      <ringGeometry args={[0.8, 0.98, 6, 1, Math.PI / 6]} />
      <meshBasicMaterial color={color} transparent opacity={0.85} depthWrite={false} />
    </mesh>
  );
}

// Fields with tired soil: an orange ring and a little orange flag on a stake,
// so you can see at a glance which ones want a rest (click one to rest it).
function TiredFields({ state }: { state: GameState }) {
  const tired = state.tiles.filter((t) => soilOf(state, t) === "tired");
  if (!tired.length) return null;
  return (
    <group>
      {tired.map((t) => (
        <group key={t.id}>
          <HexOutline x={t.x} y={tileTop(t)} z={t.z} color="#f97316" />
          <group position={[t.x - 0.45, tileTop(t), t.z - 0.35]}>
            <mesh position={[0, 0.3, 0]} raycast={() => null}>
              <boxGeometry args={[0.035, 0.6, 0.035]} />
              <meshStandardMaterial color="#5a3b22" />
            </mesh>
            <mesh position={[0.11, 0.52, 0]} raycast={() => null}>
              <boxGeometry args={[0.2, 0.13, 0.02]} />
              <meshStandardMaterial color="#f97316" emissive="#7c2d12" />
            </mesh>
          </group>
        </group>
      ))}
    </group>
  );
}

// Planned buildings: see-through, waiting for the resources to build them.
// The next one up has a gold ring.
function Plans({ state }: { state: GameState }) {
  const plans = state.plans ?? [];
  if (!plans.length) return null;
  return (
    <group>
      {plans.map((p, i) => {
        const t = state.tiles[p.tile];
        const Model = MODELS[p.building];
        if (!t || !Model) return null;
        return (
          <group key={p.tile}>
            <group position={[t.x, tileTop(t), t.z]} scale={BUILDING_SCALE}>
              <group rotation={[0, turnFor(state.tiles, t, p.building), 0]}>
                <Model opacity={0.35} />
              </group>
            </group>
            <HexOutline x={t.x} y={tileTop(t)} z={t.z} color={i === 0 ? "#facc15" : "#e7d7b0"} />
          </group>
        );
      })}
    </group>
  );
}

// Every building of the kind whose card the pointer is over in the bottom bar:
// a gold ring round its tile and a marker bobbing over it.
function Spotlight({ tiles }: { tiles: Tile[] }) {
  const id = useHoveredBuilding();
  const group = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (group.current) group.current.position.y = Math.sin(clock.elapsedTime * 4) * 0.08;
  });
  const shown = id ? tiles.filter((t) => t.building === id) : [];
  if (!shown.length) return null;
  return (
    <group>
      {shown.map((t) => (
        <HexOutline key={t.id} x={t.x} y={tileTop(t)} z={t.z} color="#facc15" />
      ))}
      <group ref={group}>
        {shown.map((t) => (
          <mesh key={t.id} position={[t.x, tileTop(t) + 1.5, t.z]} rotation={[Math.PI, 0, 0]} raycast={() => null}>
            <coneGeometry args={[0.16, 0.34, 4]} />
            <meshBasicMaterial color="#facc15" />
          </mesh>
        ))}
      </group>
    </group>
  );
}

// While placing a building: the tiles it would reach, red where it does harm
// and green where it helps; the buildings it would affect stand out more.
function ReachArea({ tiles, centre, building }: { tiles: Tile[]; centre: Tile; building: string }) {
  const areas = effectAreas(building);
  if (!areas.length) return null;
  const range = Math.max(...areas.map((a) => a.range));
  const shown = tiles.filter((t) => t.revealed && t.id !== centre.id && t.terrain !== "deep" && hexDistance(t, centre) <= range);
  return (
    <group>
      {shown.map((t) => {
        const d = hexDistance(t, centre);
        const here = areas.filter((a) => d <= a.range);
        if (!here.length) return null;
        const harm = here.some((a) => a.harm);
        const hit = !!t.building && here.some((a) => a.hits.includes(t.building!));
        return (
          <group key={t.id} position={[t.x, tileTop(t) + 0.09, t.z]} rotation={[-Math.PI / 2, 0, 0]}>
            <mesh raycast={() => null} renderOrder={2}>
              <circleGeometry args={[0.93, 6, Math.PI / 6]} />
              <meshBasicMaterial color={harm ? "#ef4444" : "#22c55e"} transparent opacity={hit ? 0.55 : 0.3} depthWrite={false} />
            </mesh>
            <mesh raycast={() => null} renderOrder={2}>
              <ringGeometry args={[0.86, 0.95, 6, 1, Math.PI / 6]} />
              <meshBasicMaterial color={harm ? "#b91c1c" : "#15803d"} transparent opacity={0.9} depthWrite={false} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

// While placing: gold rings on the best few spots, to keep the town tidy.
function GoodSpots({ state, building }: { state: GameState; building: string }) {
  const ids = useMemo(() => goodSpots(state, building), [building, state.tiles]); // eslint-disable-line react-hooks/exhaustive-deps
  const rings = useRef<Group>(null);
  useFrame(({ clock }) => {
    const s = 1 + Math.sin(clock.elapsedTime * 3) * 0.06;
    rings.current?.children.forEach((c) => c.scale.set(s, 1, s));
  });
  return (
    <group ref={rings}>
      {ids.map((id) => {
        const t = state.tiles[id];
        return (
          <mesh key={id} position={[t.x, tileTop(t) + 0.06, t.z]} rotation={[-Math.PI / 2, 0, Math.PI / 6]} raycast={() => null}>
            <ringGeometry args={[0.72, 0.86, 6]} />
            <meshBasicMaterial color="#fbbf24" transparent opacity={0.85} depthWrite={false} toneMapped={false} />
          </mesh>
        );
      })}
    </group>
  );
}

// Buildings being harmed right now, so it's never a hidden rule: dust from a
// quarry over fields and camps, or a fire scaring a gatherer's game. A dusty
// haze over the tile and a thin red edge; the building's card says why.
function HazardMarks({ state }: { state: GameState }) {
  const hit = state.tiles.filter((t) => t.building && (dusty(state, t) || scaredByFire(state, t)));
  return (
    <group>
      {hit.map((t) => (
        <group key={t.id} position={[t.x, tileTop(t), t.z]} rotation={[-Math.PI / 2, 0, 0]}>
          <mesh position={[0, 0, 0.5]} raycast={() => null} renderOrder={2}>
            <circleGeometry args={[0.9, 6, Math.PI / 6]} />
            <meshBasicMaterial color="#c8b48a" transparent opacity={0.35} depthWrite={false} />
          </mesh>
          <mesh position={[0, 0, 0.06]} raycast={() => null} renderOrder={2}>
            <ringGeometry args={[0.86, 0.95, 6, 1, Math.PI / 6]} />
            <meshBasicMaterial color="#dc2626" transparent opacity={0.8} depthWrite={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// Scrap left by sold buildings (Industrial era on): a heap of beams, sheets and rust.
function ScrapPiles({ state }: { state: GameState }) {
  const ids = Object.keys(state.scrap ?? {}).map(Number);
  return (
    <group>
      {ids.map((id) => {
        const t = state.tiles[id];
        if (!t) return null;
        return (
          <group key={id} position={[t.x, tileTop(t), t.z]} rotation={[0, id % 6, 0]} raycast={() => null}>
            {[
              [0, 0.08, 0, 0.7, 0.16, 0.5, "#6b6258"],
              [0.15, 0.2, -0.05, 0.35, 0.12, 0.3, "#8a5a3c"],
              [-0.2, 0.18, 0.1, 0.3, 0.1, 0.25, "#4f4a44"],
              [0.05, 0.3, 0.05, 0.6, 0.05, 0.07, "#9a8f84"],
            ].map(([x, y, z, w, h, d, c], i) => (
              <mesh key={i} position={[x as number, y as number, z as number]} rotation={[0, i * 0.7, i % 2 ? 0.25 : -0.1]}>
                <boxGeometry args={[w as number, h as number, d as number]} />
                <meshStandardMaterial color={c as string} flatShading />
              </mesh>
            ))}
          </group>
        );
      })}
    </group>
  );
}

// The old grove the tribe swore to protect: a red cloth tied round each of its
// trees (as people do at real sacred groves) and a label over the
// middle, so it's clear which trees are safe.
function OldGrove({ tiles, ids }: { tiles: Tile[]; ids: number[] }) {
  const grove = ids.map((id) => tiles[id]).filter((t): t is Tile => !!t && t.revealed);
  if (!grove.length) return null;
  const cx = grove.reduce((sum, t) => sum + t.x, 0) / grove.length;
  const cz = grove.reduce((sum, t) => sum + t.z, 0) / grove.length;
  const centre = grove.reduce((best, t) => (Math.hypot(t.x - cx, t.z - cz) < Math.hypot(best.x - cx, best.z - cz) ? t : best));
  const trees = grove.flatMap(treeSpots);
  return (
    <group>
      {trees.map((p, i) => (
        // Matches the tree in Forests: its crown is a cone from 0.17 to 0.67
        // (times its size), so a ring of this radius sits snug on the branches.
        <group key={i} position={[p.x, p.y + 0.28 * p.s, p.z]} scale={p.s} rotation={[0, i * 1.7, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} raycast={() => null}>
            <torusGeometry args={[0.158, 0.018, 6, 14]} />
            <meshStandardMaterial color="#d0312d" />
          </mesh>
          {/* The loose ends hanging down. */}
          {[0, 0.5].map((a) => (
            <mesh key={a} position={[Math.cos(a) * 0.165, -0.05, Math.sin(a) * 0.165]} rotation={[0, -a, 0.2]} raycast={() => null}>
              <boxGeometry args={[0.012, 0.09, 0.03]} />
              <meshStandardMaterial color="#d0312d" />
            </mesh>
          ))}
        </group>
      ))}
      <Html zIndexRange={[15, 0]} center position={[centre.x, centre.height + 1.9, centre.z]} style={{ pointerEvents: "none" }}>
        <div className="pixel-panel font-pixel whitespace-nowrap px-1.5 py-0.5 text-[11px]" data-testid="grove-label">
          Old grove (protected)
        </div>
      </Html>
    </group>
  );
}

const probe = new Vector3();

// Pan the map without a drag. This deliberately uses the camera's current
// bearing, so Up always means further into the view and Left/Right remain
// intuitive after the player has turned the camera.
function KeyboardPan({ controls, enabled }: { controls: React.RefObject<MapControlsImpl | null>; enabled: boolean }) {
  const pressed = useRef(new Set<string>());
  const move = useRef(new Vector3());
  const right = useRef(new Vector3());

  useEffect(() => {
    const arrows: Record<string, string> = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" };
    const typing = (target: EventTarget | null) =>
      target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || (target instanceof HTMLElement && target.isContentEditable);
    const down = (event: KeyboardEvent) => {
      const direction = arrows[event.key];
      if (!enabled || !direction || event.defaultPrevented || typing(event.target)) return;
      event.preventDefault();
      pressed.current.add(direction);
    };
    const up = (event: KeyboardEvent) => {
      const direction = arrows[event.key];
      if (direction) pressed.current.delete(direction);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [enabled]);

  useFrame(({ camera }, delta) => {
    const c = controls.current;
    if (!enabled || !c || pressed.current.size === 0) return;
    const direction = move.current;
    const sidewaysDirection = right.current;
    camera.getWorldDirection(direction);
    direction.y = 0;
    const length = direction.length() || 1;
    direction.divideScalar(length);
    sidewaysDirection.set(-direction.z, 0, direction.x);
    const forward = (pressed.current.has("up") ? 1 : 0) - (pressed.current.has("down") ? 1 : 0);
    const sideways = (pressed.current.has("right") ? 1 : 0) - (pressed.current.has("left") ? 1 : 0);
    const step = Math.min(delta, 0.1) * 12;
    direction.multiplyScalar(forward * step).addScaledVector(sidewaysDirection, sideways * step);
    camera.position.add(direction);
    c.target.add(direction);
    c.update();
  });
  return null;
}

// Tells the tutorial overlay where the tile it points at is on screen.
function GuideAnchor({ tile }: { tile: Tile | null }) {
  useFrame(({ camera, size }) => {
    if (!tile) {
      tileAnchor.visible = false;
      return;
    }
    const top = tileTop(tile);
    probe.set(tile.x, top, tile.z).project(camera);
    const x = ((probe.x + 1) / 2) * size.width;
    const y = ((1 - probe.y) / 2) * size.height;
    const inFront = probe.z < 1;
    probe.set(tile.x + 0.9, top, tile.z).project(camera);
    const ex = ((probe.x + 1) / 2) * size.width;
    const ey = ((1 - probe.y) / 2) * size.height;
    tileAnchor.x = x;
    tileAnchor.y = y;
    tileAnchor.r = Math.max(26, Math.hypot(ex - x, ey - y) * 1.3);
    tileAnchor.visible = inFront;
  });
  return null;
}

// "The Stone Age", "The Ancient Era", "The Medieval & Renaissance Era".
function eraTitle(name: string) {
  return name.endsWith("Age") ? `The ${name}` : `The ${name} Era`;
}

export function WorldCanvas() {
  const { state, dispatch, selected, setSelected, panel, clock } = useGame();
  const graphics = useGraphics();
  // A computer that can't keep up with the film look (under 24 frames a
  // second for a few seconds) drops to "fast" for the rest of this visit.
  const [struggling, setStruggling] = useState(false);
  const fancy = graphics === "fancy" && !struggling;
  const daylight = useDaylight();
  const shot = useShot();
  const fireworksAt = useFireworks();
  const cameos = useMemo(() => cameosFor(state.nation).map((m) => m.name), [state.nation]);
  // Camera shots: the fly-in when a new game starts, a turn round the village
  // when a new era begins.
  const shownEra = useRef(state.era);
  useEffect(() => {
    // Every new game (the Stone Age, Build to Last, multiplayer), not a loaded one.
    if (state.tick === 0 && !state.dev) {
      const mode = state.mode === "last" ? "Build to Last" : state.mp ? (state.mp.mode === "race" ? "Race" : "Together") : ERAS[state.era].name;
      playShot({ kind: "intro", title: state.nation ?? "The Emberfolk", subtitle: `${mode} · ${formatYear(state.year)}`, seconds: 6 });
    }
    // Only on the first render of this game.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (state.era > shownEra.current) {
      playShot({ kind: "era", title: eraTitle(ERAS[state.era].name), subtitle: formatYear(state.year), seconds: 9 });
    }
    shownEra.current = state.era;
  }, [state.era, state.year]);
  const [rawHovered, setHovered] = useState<number | null>(null);
  // Tall phone screens start further out so more of the island fits.
  const [portrait] = useState(() => typeof window !== "undefined" && window.innerHeight > window.innerWidth);
  // The building whose info panel is open (click a building with no tool picked).
  const [inspected, setInspected] = useState<number | null>(null);
  const guide = useGuide();
  // Picking people up (see world/pick-up.tsx).
  const [holding, setHolding] = useState(false);
  const mapControls = useRef<MapControlsImpl>(null);
  const canPickUp =
    !selected && !panel && !guide.target && state.phase === "playing" && !state.debrief && state.tutorialStep >= TUTORIAL.length;
  const guideTile = guide.target?.kind === "tile" ? guide.target.tileId : null;
  // While the tutorial points at a tile, that is the only one you can build on.
  // No map preview while a menu like Advancements covers the map.
  const hovered = panel ? null : guideTile === null || rawHovered === guideTile ? rawHovered : null;
  const home = state.tiles[state.startTile];
  const target = useMemo<[number, number, number]>(() => [home.x, 0, home.z], [home.x, home.z]);

  const buildings = useMemo(() => state.tiles.filter((t) => t.building), [state.tiles]);
  const hoverTile = hovered !== null ? state.tiles[hovered] : null;
  const demolishing = selected === DEMOLISH_TOOL;
  const planting = selected === PLANT_TOOL;
  const clearing = selected === CLEAR_TOOL;
  const scoutPick = selected === SCOUT_TOOL;
  const canoePick = selected === CANOE_TOOL;
  const def = selected && !demolishing && !planting && !clearing ? BUILDINGS_BY_ID[selected] : null;
  // Picking where to send scouts or a canoe: can they go there, and how long.
  const tripNote = (() => {
    if (!hoverTile || !(scoutPick || canoePick)) return null;
    const problem = scoutPick ? scoutTargetError(state, hoverTile) : canoeTargetError(state, hoverTile);
    if (problem) return { ok: false, text: problem };
    const ticks = scoutPick ? scoutTicks(state, hoverTile) : canoeTicks(state, hoverTile);
    return { ok: true, text: `${scoutPick ? "Send the scouts here" : "Paddle here"}: back in ${Math.round(ticks * 1.5)} s` };
  })();
  const plantNote = planting && hoverTile ? plantError(state, hoverTile) ?? null : null;
  const clearNote = clearing && hoverTile ? clearAreaError(state, hoverTile) : null;
  const clearTiles = useMemo(() => (clearing && hoverTile && !clearNote ? clearArea(state, hoverTile) : []), [clearing, hoverTile, clearNote, state]);
  const error = hoverTile && def ? placementError(state, hoverTile, def) : null;
  const demolishNote = (() => {
    if (!demolishing || !hoverTile) return null;
    const problem = demolishError(state, hoverTile);
    if (problem) return { ok: false, text: problem };
    const list = (r: Partial<Record<string, number>>, sign: string) =>
      Object.entries(r).filter(([, v]) => (v ?? 0) > 0).map(([k, v]) => `${sign}${v} ${k === "currency" ? "coins" : k}`).join(", ");
    // A scrap pile: what clearing it costs and salvages.
    if (!hoverTile.building && state.scrap?.[hoverTile.id]) {
      const cost = list(scrapClearCost(state), "−");
      return { ok: true, text: `Clear the scrap${cost ? ` (${cost})` : ""}: ${list(state.scrap[hoverTile.id], "+") || "a little back"}` };
    }
    if (!hoverTile.building && hoverTile.terrain === "forest")
      return { ok: true, text: `Clear the trees for open grassland: +${clearLandWood(hoverTile)} wood, −${CLEAR_LAND.sustainability} Sustainability` };
    const target = BUILDINGS_BY_ID[hoverTile.building!];
    if (scrapEra(state)) return { ok: true, text: `Take down the ${target.name}: it leaves scrap worth ${list(salvageOf(state, target), "+") || "a little"} to clear` };
    const refund = Object.entries(demolishRefund(target))
      .filter(([, v]) => (v ?? 0) > 0)
      .map(([k, v]) => `+${v} ${k}`)
      .join(", ");
    return { ok: true, text: `Sell ${target.name}${refund ? ` (${refund})` : ""}` };
  })();
  const planning = usePlanMode();
  const Ghost = def ? MODELS[def.id] : null;
  // Warn before a purchase that would leave the fires short of wood.
  const woodLeft = def ? Math.floor(state.resources.wood - (buildingCost(state, def).wood ?? 0)) : null;
  const lowWood =
    def && !error && woodLeft !== null && woodLeft < LOW_WOOD_AFTER_BUY && state.tutorialStep >= TUTORIAL.length
      ? `Leaves only ${woodLeft} wood. Fires need wood, so you might save up first.`
      : null;

  const inTutorialNow = state.tutorialStep < TUTORIAL.length;
  // With no tool picked, hovering a home shows who lives there.
  const dwellers = !selected && hoverTile ? residents(state, hoverTile) : null;
  const scare = def && !error && hoverTile ? fireScareNote(state, hoverTile, def.id) : null;
  const spark = def && !error && hoverTile ? sparkNote(state, hoverTile, def.id) : null;
  const clears = def?.id === "farm" && !error && hoverTile ? forestToClear(state, hoverTile) : null;
  const farmNote =
    def?.id === "farm" && !error && hoverTile
      ? `${clears ? "Clears the forest next to it for good. " : ""}Rain now: fields grow ${Math.round(rainfall(state) * 100)}%.`
      : null;
  const dust = def && !error && hoverTile ? dustNote(state, hoverTile, def.id) : null;
  const gather = def?.id === "gatherer" && !error && hoverTile && !inTutorialNow ? gatherNote(state) : null;
  const town = def && !error && hoverTile ? townNote(state, hoverTile, def.id) : null;
  // What it would connect to here, and the bonus (CONNECTIONS).
  const link = def && !error && hoverTile ? connectionNote(state, hoverTile, def.id) : null;
  // Industrial: what it does to the grid, the air over the homes and the climate.
  const industry =
    def && !error && hoverTile && (def.power || def.smog || def.carbon)
      ? [
          def.power && def.power > 0 ? `+${def.power} power.` : def.power ? `Needs ${-def.power} power.` : "",
          def.smog
            ? `Smoke over ${state.tiles.filter((t) => t.building && ["hut", "house", "townhouse", "apartments"].includes(t.building) && hexDistance(t, hoverTile) <= SMOG.range).length} homes nearby.`
            : "",
          def.carbon ? "Carbon into the air, for good." : "",
        ]
          .filter(Boolean)
          .join(" ")
      : null;

  const burning = useMemo(() => litFires(state), [state]);
  // A new era just rebuilt the town (ERA_MAKEOVER): who pops back up when, in a
  // ripple out from the middle of town. Only soon after, not on a later reload.
  const makeover = state.makeover && state.tick - state.makeover.tick < 20 ? state.makeover : null;
  const rebuildOrder = useMemo(() => {
    if (!makeover) return null;
    const centre = state.tiles[state.startTile];
    const ids = [...makeover.tiles].sort((a, b) => Math.hypot(state.tiles[a].x - centre.x, state.tiles[a].z - centre.z) - Math.hypot(state.tiles[b].x - centre.x, state.tiles[b].z - centre.z));
    return { ids, order: new Map(ids.map((id, i) => [id, i])) };
    // Recomputed per makeover, not on every tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [makeover?.tick]);
  // A fight is played out from the moment the two sides meet until a few
  // seconds after it is decided.
  const shown = shownBattle(state);
  const battleShowing = !!shown;
  // Where people should run from: the fight, or raiders about to arrive there.
  const fightTile = shown
    ? state.tiles[shown.tile]
    : state.raid && state.raid.arriveTick - state.tick <= 4
      ? state.tiles[state.raid.meetTile ?? state.raid.targetTile]
      : null;
  const fightAt = useMemo(() => (fightTile ? { x: fightTile.x, z: fightTile.z } : null), [fightTile]);
  const burningIds = burning.map((t) => t.id);
  const wetIds = linkedAqueducts(state).map((t) => t.id);
  // The great drought: warned of (a little dry), then on (parched land, hazy sky).
  const dry = inDrought(state) ? 1 : state.drought ? 0.2 : 0;
  const plagueOn = inPlague(state);
  // A storm, flood, earthquake or landslide: warned of, then striking.
  const disaster = disasterView(state);
  const storm = disaster.kind === "storm" ? (disaster.active ? 1 : 0.5) : 0;
  const outFires = buildings.filter((t) => t.building === "campfire" && !isLit(state, t));

  // On a phone there is no hover: the first tap previews, the second tap builds.
  function pick(id: number, touch = false) {
    if (guideTile !== null && id !== guideTile) return;
    const tile = state.tiles[id];
    if (touch && selected && rawHovered !== id) {
      setHovered(id);
      return;
    }
    if (!selected && tile.building === "campfire" && !isLit(state, tile)) {
      dispatch({ type: "relight", tileId: id });
      return;
    }
    if (!selected) {
      setInspected(tile.building ? id : null);
      return;
    }
    if (planting) {
      dispatch({ type: "plant", tileId: id });
      return;
    }
    if (clearing) {
      dispatch({ type: "clearArea", tileId: id });
      return;
    }
    if (demolishing) {
      dispatch({ type: "demolish", tileId: id });
      return;
    }
    if (scoutPick || canoePick) {
      const problem = scoutPick ? scoutTargetError(state, tile) : canoeTargetError(state, tile);
      if (problem) return;
      dispatch(scoutPick ? { type: "scout", tileId: id } : { type: "canoe", tileId: id });
      setSelected(null);
      if (touch) setHovered(null);
      return;
    }
    if (!selected) return;
    // Can't afford it yet (or it's planned there already): plan it, and it goes
    // up by itself once we can. Not in the tutorial, which builds one of each.
    const planned = (state.plans ?? []).some((p) => p.tile === id);
    const short = placementError(state, tile, BUILDINGS_BY_ID[selected]) === "Not enough resources";
    if ((planned || short || planning) && state.tutorialStep >= TUTORIAL.length) dispatch({ type: "plan", tileId: id, buildingId: selected });
    else dispatch({ type: "place", tileId: id, buildingId: selected });
    // Build to Last's guide: one of each, so put the tool down once it's placed.
    if (state.mode === "last" && (state.lastStep ?? LAST_TUTORIAL.length) < LAST_TUTORIAL.length) setSelected(null);
    // After a two-tap build on a phone, drop the preview so no stale label lingers.
    if (touch) setHovered(null);
  }

  return (
    <Canvas
      // The tutorial overlay forwards camera turns and zooms here (guide-overlay.tsx).
      data-world-map=""
      // Plain PCF shadows: three.js dropped the soft kind.
      shadows="percentage"
      // Phones on "fast" graphics draw fewer pixels.
      dpr={fancy ? [1, 2] : [1, 1.25]}
      // A landmark under construction is cut off at its current height.
      onCreated={({ gl }) => {
        gl.localClippingEnabled = true;
      }}
      camera={{
        position: portrait ? [home.x, 30, home.z + 27] : [home.x, 18, home.z + 16],
        fov: 38,
        near: 0.5,
        far: 400,
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        setSelected(null);
      }}
    >
      <color attach="background" args={["#a8dcf5"]} />
      {/* The sky, the sun and moon, the fog: the time of day, with wood smoke,
          the drought's dust, storms and the plague's gloom on top. */}
      <DaySky
        home={home}
        tick={state.tick}
        running={clock.running}
        msPerTick={clock.msPerTick}
        era={state.era}
        fires={
          burning.length +
          2 * buildings.filter((t) => t.building === "smithy").length +
          // Industrial smoke: coal plants, factories and stations (half with Clean Air Laws).
          Math.round(
            buildings.reduce((n, t) => n + (t.building === "coalplant" ? 3 : t.building === "factory" ? 2 : t.building === "station" ? 1 : 0), 0) *
              (state.researched.includes("cleanair") ? 0.5 : 1),
          )
        }
        dust={dry >= 1 ? 1 : 0}
        storm={storm}
        plague={plagueOn}
        shadowSize={fancy ? 2048 : 1024}
        alwaysDay={daylight === "day"}
        realClock={!!state.realTimeFrom}
      />
      <Sea home={home} />
      <Clouds home={home} storm={storm} />
      {fancy && <FireLights fires={[...burning, ...buildings.filter((t) => t.building === "watchfire" || t.building === "smithy")]} home={home} />}

      <HexTerrain
        tiles={state.tiles}
        home={home}
        wear={landStrain(state)}
        era={state.era}
        roads={state.researched.includes("roads")}
        dry={dry}
        onHover={setHovered}
        onPick={pick}
      />
      <Forests tiles={state.tiles} />
      <OldGrove tiles={state.tiles} ids={state.protectedTiles ?? []} />
      <Mountains tiles={state.tiles} onHover={setHovered} onPick={pick} />
      <Deposits tiles={state.tiles} />
      <BiomeDetails tiles={state.tiles} />

      {buildings.map((t) => {
        const Model = MODELS[t.building!];
        const broken = (t.worn ?? 0) >= 1;
        return (
          // Hard mode: a broken-down building sags to one side.
          <group
            key={t.id}
            position={[t.x, t.height, t.z]}
            rotation={[broken ? 0.12 : 0, buildingTurn(t, state.tiles), broken ? 0.1 : 0]}
            scale={BUILDING_SCALE}
          >
            {state.landmark?.tile === t.id && !landmarkDone(state) ? (
              // The landmark rises stage by stage inside its scaffolding.
              <UnderConstruction done={state.landmark.stage - (state.tick < state.landmark.readyTick ? 1 : 0)}>
                <Model opacity={1} />
              </UnderConstruction>
            ) : (
              <RebuildPop playKey={rebuildOrder?.order.has(t.id) ? makeover!.tick * 10 + state.era : null} order={rebuildOrder?.order.get(t.id) ?? 0}>
                <Model
                  opacity={1}
                  lit={
                    t.building === "aqueduct"
                      ? wetIds.includes(t.id)
                      : t.building === "farm"
                        ? soilOf(state, t) !== "tired"
                        : t.building !== "campfire" || burningIds.includes(t.id)
                  }
                />
              </RebuildPop>
            )}
            {(t.level ?? 1) >= 2 && <Plinth level={t.level!} />}
            {/* Tired soil shows in the field itself (FarmModel); a resting field grows over with grass. */}
            {t.building === "farm" && soilOf(state, t) === "resting" && (
              <mesh position={[0, 0.22, 0]} raycast={() => null}>
                <cylinderGeometry args={[0.63, 0.63, 0.04, 6]} />
                <meshStandardMaterial color="#7fae52" flatShading />
              </mesh>
            )}
            {(t.worn ?? 0) >= 0.35 && <WearMarks worn={t.worn ?? 0} seed={t.id} />}
          </group>
        );
      })}
      {/* Hard mode: a hammer over buildings that need repair (red when broken). */}
      {buildings
        .filter((t) => (t.worn ?? 0) >= WEAR.warnAt)
        .map((t) => (
          <Html zIndexRange={[13, 0]} key={`wear-${t.id}`} center position={[t.x, tileTop(t) + 1.5, t.z]} style={{ pointerEvents: "none" }}>
            <span
              className={"block border-2 border-[#140e0a] p-0.5 " + ((t.worn ?? 0) >= 1 ? "bg-red-500" : "bg-amber-300")}
              title="Needs repair"
            >
              <PixelIcon name="hammer" size={14} />
            </span>
          </Html>
        ))}

      {/* Small moments play out where they happen. */}
      <SmallMoment state={state} />
      <ScoutMarker state={state} running={clock.running} msPerTick={clock.msPerTick} />
      <Rebels state={state} />
      <Villagers
        tiles={state.tiles}
        population={state.population}
        soldiers={state.soldiers}
        homeTile={home}
        litFires={burningIds}
        sick={state.population > 0 ? (state.sick ?? 0) / state.population : 0}
        tired={(state.fatigue ?? 0) / 100}
        era={state.era}
        cameos={cameos}
        gameSpeed={state.speed}
        danger={fightAt}
      />
      <PickUp state={state} dispatch={dispatch} enabled={canPickUp} onHolding={setHolding} />
      <KeyboardPan controls={mapControls} enabled={!holding && !shot && !guide.target} />
      <Warriors
        tiles={state.tiles}
        population={state.population}
        soldiers={state.soldiers}
        spearmen={spearmenOf(state)}
        era={state.era}
        homeTile={home}
        rally={state.raid && state.raid.response !== "hide" ? state.tiles[state.raid.meetTile ?? state.raid.targetTile] : null}
        hidden={battleShowing}
        gameSpeed={state.speed}
      />
      <BattleScene tiles={state.tiles} battle={shown} homeTile={home} speed={state.speed} />
      <Raiders tiles={state.tiles} raid={state.raid} tick={state.tick} speed={state.speed} />
      <TradeShips tiles={state.tiles} home={home} caravans={state.caravans ?? []} tick={state.tick} speed={state.speed} />
      <ChimneySmoke tiles={buildings} cleanAir={state.researched.includes("cleanair")} />
      <SeaTraffic state={state} home={home} />
      <ForeignVillages state={state} />
      <WaitingShips state={state} home={home} />
      {/* The plague: rats scurrying round a few homes. */}
      {plagueOn &&
        buildings
          .filter((t) => t.building === "house" || t.building === "townhouse" || t.building === "hut")
          .slice(0, 4)
          .map((t) => (
            // Bigger and further out than the mice moment, so they run round the house.
            <group key={`rats-${t.id}`} position={[t.x, tileTop(t), t.z]} scale={1.9}>
              <Mice />
            </group>
          ))}
      <QuakeShake active={disaster.kind === "earthquake" && disaster.active} />
      {disaster.kind === "flood" && disaster.active && <FloodWater tiles={state.tiles} ids={disaster.tiles} progress={disaster.progress} />}
      {storm > 0 && <StormRain centre={home} heavy={disaster.active} />}
      {(disaster.kind === "earthquake" || disaster.kind === "landslide") && disaster.active && <DisasterDust tiles={state.tiles} ids={disaster.tiles} />}
      <Cracks tiles={state.tiles} />
      <Links state={state} />
      <ScrapPiles state={state} />
      <HazardMarks state={state} />
      <Rubble tiles={state.tiles} />
      <Wildlife
        tiles={state.tiles}
        homeTile={home}
        onHunt={(animal) => dispatch({ type: "hunt", animal })}
        resting={state.huntersHelping ?? false}
        gameSpeed={state.speed}
      />
      <Fireworks home={home} startedAt={fireworksAt} />
      <Islet
        tiles={state.tiles}
        home={home}
        canReach={tallyOf(state, "canoes") > 0 || (state.outposts ?? []).length > 0}
        found={state.secretsFound.includes("egg-islet")}
        onFind={() => dispatch({ type: "easterEgg", id: "islet" })}
      />
      <CampfireSmoke fires={[...burning, ...buildings.filter((t) => t.building === "smithy")]} />
      {!guide.target &&
        outFires.map((t) => (
          <Html zIndexRange={[15, 0]} key={t.id} center position={[t.x, tileTop(t) + 1.3, t.z]}>
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onPointerUp={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                dispatch({ type: "relight", tileId: t.id });
              }}
              disabled={state.resources.wood < RELIGHT_WOOD}
              className="pixel-btn font-pixel flex items-center gap-1 whitespace-nowrap bg-amber-400 px-2 py-0.5 text-xs text-[#2b2119] disabled:opacity-50"
            >
              <PixelIcon name="flame" size={12} />
              Relight · <span className="font-num">{RELIGHT_WOOD}</span> wood
            </button>
          </Html>
        ))}
      <Wildfire tiles={state.tiles} />
      <FireVictims tiles={state.tiles} victims={state.fireVictims ?? []} />

      {hoverTile && (selected || (hoverTile.terrain !== "deep" && hoverTile.terrain !== "shallow")) && (
        // With no tool picked, open water isn't worth outlining.
        <HexOutline
          x={hoverTile.x}
          y={tileTop(hoverTile)}
          z={hoverTile.z}
          color={
            tripNote
              ? tripNote.ok
                ? "#38bdf8"
                : "#ef4444"
              : planting
              ? plantNote
                ? "#ef4444"
                : "#22c55e"
              : demolishNote
              ? demolishNote.ok
                ? "#f59e0b"
                : "#ef4444"
              : def
                ? error
                  ? "#ef4444"
                  : "#22c55e"
                : "#ffffff"
          }
        />
      )}
      {hoverTile && def && !error && <ReachArea tiles={state.tiles} centre={hoverTile} building={def.id} />}
      {def && !shot && <GoodSpots state={state} building={def.id} />}
      {hoverTile && dwellers && (
        <Html zIndexRange={[15, 0]} center position={[hoverTile.x, tileTop(hoverTile) + 1.2, hoverTile.z]} style={{ pointerEvents: "none" }}>
          <div className="pixel-panel-dark font-pixel whitespace-nowrap px-2 py-1 text-xs" data-testid="home-label">
            {BUILDINGS_BY_ID[hoverTile.building!].name}: {dwellers.living} of {dwellers.room} people live here
          </div>
        </Html>
      )}
      {hoverTile && tripNote && (
        <Html zIndexRange={[15, 0]} center position={[hoverTile.x, tileTop(hoverTile) + 1.2, hoverTile.z]} style={{ pointerEvents: "none" }}>
          <div className={"pixel-panel-dark font-pixel whitespace-nowrap px-2 py-1 text-xs " + (tripNote.ok ? "" : "text-red-300")} data-testid="trip-note">
            {tripNote.text}
          </div>
        </Html>
      )}
      {hoverTile && demolishNote && (hoverTile.building || state.scrap?.[hoverTile.id]) && (
        <Html zIndexRange={[15, 0]} center position={[hoverTile.x, tileTop(hoverTile) + 1.2, hoverTile.z]} style={{ pointerEvents: "none" }}>
          <div className="pixel-panel-dark font-pixel whitespace-nowrap px-2 py-1 text-xs">{demolishNote.text}</div>
        </Html>
      )}
      {hoverTile && Ghost && (
        <group position={[hoverTile.x, tileTop(hoverTile), hoverTile.z]} scale={BUILDING_SCALE}>
          {/* Turned the way it will stand, lined up with its neighbours. */}
          <group rotation={[0, turnFor(state.tiles, hoverTile, def?.id), 0]}>
            <Ghost opacity={0.45} />
          </group>
          <Html
            // In the tutorial the card sits above the dimming so it can be read.
            zIndexRange={state.tutorialStep < TUTORIAL.length ? [40, 30] : [15, 0]}
            // Beside the tile, not on it, so you can see where you're placing.
            position={[0, 0.3, 0]}
            style={{ pointerEvents: "none", transform: "translate(56px, -50%)" }}
          >
            {planning && (!error || error === "Not enough resources") && hoverTile && def && !planError(state, hoverTile, def) ? (
              <div className="pixel-panel-dark font-pixel w-56 px-2 py-1 text-xs" data-testid="plan-note">
                <span className="text-amber-200">Plan mode.</span> Click to lay out a blueprint: it is built by itself, in order, when you can afford it.
              </div>
            ) : error === "Not enough resources" && state.tutorialStep >= TUTORIAL.length ? (
              <div className="pixel-panel-dark font-pixel w-56 px-2 py-1 text-xs" data-testid="plan-note">
                <span className="text-amber-200">Not enough yet.</span> Click to plan it: it is built by itself as soon as you can afford it.
              </div>
            ) : error ? (
              <div className="pixel-panel-dark font-pixel whitespace-nowrap px-2 py-1 text-xs">{error}</div>
            ) : (
              // The trade-off of this building, right where you're about to place it.
              <div className="pixel-panel-dark font-pixel flex w-60 flex-col gap-1 px-2 py-1.5 text-xs">
                <span className="flex items-start gap-1.5 text-emerald-300">
                  <span className="font-num">+</span>
                  {def!.gain}
                </span>
                <span className="flex items-start gap-1.5 text-red-300">
                  <PixelIcon name={def!.landImpact ? "stump" : "leaf"} size={12} />
                  {def!.landCost}
                </span>
                {farmNote && (
                  <span className="flex items-start gap-1.5 text-amber-200">
                    <PixelIcon name="warning" size={12} />
                    {farmNote}
                  </span>
                )}
                {spark && (
                  <span className="flex items-start gap-1.5 text-amber-200">
                    <PixelIcon name="warning" size={12} />
                    {spark}
                  </span>
                )}
                {scare && (
                  <span className="flex items-start gap-1.5 text-amber-200">
                    <PixelIcon name="warning" size={12} />
                    {scare}
                  </span>
                )}
                {gather && (
                  <span className="flex items-start gap-1.5 text-amber-200">
                    <PixelIcon name="warning" size={12} />
                    {gather}
                  </span>
                )}
                {industry && (
                  <span className="flex items-start gap-1.5 text-amber-200" data-testid="industry-note">
                    <PixelIcon name="powerplant" size={12} />
                    {industry}
                  </span>
                )}
                {dust && (
                  <span className="flex items-start gap-1.5 text-amber-200">
                    <PixelIcon name="warning" size={12} />
                    {dust}
                  </span>
                )}
                {town && (
                  <span className="flex items-start gap-1.5 text-amber-200">
                    <PixelIcon name="warning" size={12} />
                    {town}
                  </span>
                )}
                {link && (
                  <span className="flex items-start gap-1.5 text-emerald-300" data-testid="connect-note">
                    <PixelIcon name="star" size={12} />
                    {link}
                  </span>
                )}
                {lowWood && (
                  <span className="flex items-start gap-1.5 text-amber-200">
                    <PixelIcon name="warning" size={12} />
                    {lowWood}
                  </span>
                )}
              </div>
            )}
          </Html>
        </group>
      )}

      <Spotlight tiles={state.tiles} />
      {makeover && rebuildOrder && <RebuildDust tiles={state.tiles} ids={rebuildOrder.ids} playKey={makeover.tick * 10 + state.era} />}
      <Plans state={state} />
      <TiredFields state={state} />
      {/* Clear land: every tile it would clear, and what it gives and costs. */}
      {clearTiles.map((t) => (
        <HexOutline key={`clear-${t.id}`} x={t.x} y={tileTop(t)} z={t.z} color="#f59e0b" />
      ))}
      {hoverTile && clearing && (
        <Html zIndexRange={[15, 0]} center position={[hoverTile.x, tileTop(hoverTile) + 1.1, hoverTile.z]} style={{ pointerEvents: "none" }}>
          <div className="pixel-panel-dark font-pixel w-60 px-2 py-1 text-xs" data-testid="clear-note">
            {clearNote ? (
              <span className="text-red-300">{clearNote}</span>
            ) : (
              <span className="text-amber-200">
                Clear {clearTiles.length} forest tile{clearTiles.length === 1 ? "" : "s"} into grassland: +
                {clearTiles.reduce((sum, t) => sum + clearLandWood(t), 0)} wood, −{CLEAR_LAND.sustainability * clearTiles.length} Sustainability
              </span>
            )}
          </div>
        </Html>
      )}
      {hoverTile && planting && (
        <Html zIndexRange={[15, 0]} center position={[hoverTile.x, tileTop(hoverTile) + 1.1, hoverTile.z]} style={{ pointerEvents: "none" }}>
          <div className="pixel-panel-dark font-pixel w-56 px-2 py-1 text-xs">
            {plantNote ?? (
              <span className="flex items-start gap-1.5 text-emerald-300">
                <PixelIcon name="sapling" size={12} />
                {hoverTile.terrain === "forest"
                  ? "Plant saplings (−4 food): this thinned forest grows back faster."
                  : "Plant saplings (−4 food): a new forest grows here and Sustainability rises."}
              </span>
            )}
          </div>
        </Html>
      )}
      {inspected !== null && state.tiles[inspected]?.building && !selected && (
        // Docked at the side of the screen (not floating over the building), so it
        // never runs off the edge when the camera is close. A portal out of the 3D
        // scene's overlay into the page.
        <Html zIndexRange={[30, 20]}>
          {createPortal(
            <div
              className="fixed bottom-48 right-2 z-30 max-h-[calc(100dvh-16rem)] overflow-y-auto md:bottom-auto md:right-16 md:top-24 lg:right-20"
              data-testid="building-info-dock"
            >
              <BuildingInfo state={state} tileId={inspected} dispatch={dispatch} onClose={() => setInspected(null)} />
            </div>,
            document.body,
          )}
        </Html>
      )}

      <GuideAnchor tile={guideTile === null ? null : state.tiles[guideTile]} />

      <PerformanceMonitor bounds={() => [24, 50]} onDecline={() => setStruggling(true)} />
      <CinematicCamera home={home} battleTick={shown ? shown.start ?? shown.tick : null} />
      {fancy && <FilmLook era={state.era} cinematic={!!shot} />}

      <MapControls
        ref={mapControls}
        makeDefault
        // During guided steps the camera still turns and zooms, but doesn't
        // slide, so a click on the highlighted spot can't turn into a drag.
        enabled={!holding && !shot}
        enablePan={!guide.target}
        target={target}
        enableDamping
        dampingFactor={0.12}
        minDistance={7}
        maxDistance={70}
        minPolarAngle={0.35}
        maxPolarAngle={1.15}
        screenSpacePanning={false}
      />
    </Canvas>
  );
}

// An improved building stands on a footing of its material: stone, bronze,
// iron or steel (IMPROVE.tiers), with a band of metal on the higher levels.
function Plinth({ level }: { level: number }) {
  const tier = IMPROVE.tiers.find((t) => t.level === level) ?? IMPROVE.tiers[0];
  const stone = IMPROVE.tiers[0].color;
  return (
    <group>
      <mesh position={[0, 0.04, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[0.48, 0.52, 0.1, 6]} />
        <meshStandardMaterial color={level === 2 ? tier.color : stone} roughness={0.9} flatShading />
      </mesh>
      {level >= 3 && (
        <mesh position={[0, 0.1, 0]}>
          <cylinderGeometry args={[0.5, 0.5, 0.035, 6]} />
          <meshStandardMaterial color={tier.color} metalness={0.6} roughness={0.35} flatShading />
        </mesh>
      )}
    </group>
  );
}

// A worn building shows it: broken planks and fallen stones pile up around it
// as it wears (one more every few percent), and a broken one gets a soot-dark
// patch and a fallen beam.
function WearMarks({ worn, seed }: { worn: number; seed: number }) {
  const bits = Math.min(8, Math.ceil((worn - 0.3) * 10));
  const rnd = (i: number) => {
    const v = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453;
    return v - Math.floor(v);
  };
  return (
    <group>
      {Array.from({ length: bits }, (_, i) => {
        const a = rnd(i) * Math.PI * 2;
        const r = 0.34 + rnd(i + 20) * 0.14;
        const plank = i % 2 === 0;
        return (
          <mesh key={i} position={[Math.cos(a) * r, 0.02, Math.sin(a) * r]} rotation={[0, rnd(i + 40) * Math.PI, plank ? 0.15 : 0]} castShadow>
            {plank ? <boxGeometry args={[0.16, 0.02, 0.035]} /> : <dodecahedronGeometry args={[0.035 + rnd(i + 60) * 0.02, 0]} />}
            <meshStandardMaterial color={plank ? "#6b4a2b" : "#8a8580"} roughness={1} flatShading />
          </mesh>
        );
      })}
      {worn >= 1 && (
        <>
          <mesh position={[0, 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.46, 6]} />
            <meshStandardMaterial color="#3a3029" transparent opacity={0.55} roughness={1} />
          </mesh>
          <mesh position={[0.18, 0.12, 0.2]} rotation={[0.2, 0.6, 1.0]} castShadow>
            <boxGeometry args={[0.36, 0.035, 0.035]} />
            <meshStandardMaterial color="#5a3d22" roughness={1} />
          </mesh>
        </>
      )}
    </group>
  );
}
