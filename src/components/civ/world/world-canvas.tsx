"use client";

import { useMemo, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Vector3 } from "three";
import { Html, MapControls } from "@react-three/drei";
import { BUILDINGS_BY_ID, LOW_WOOD_AFTER_BUY, RELIGHT_WOOD, TUTORIAL, WEAR } from "@/game/content";
import {
  buildingCost,
  DEMOLISH_TOOL,
  dustNote,
  sparkNote,
  forestToClear,
  rainfall,
  spearmenOf,
  residents,
  fireScareNote,
  gatherNote,
  inDrought,
  isLit,
  landStrain,
  litFires,
  demolishError,
  demolishRefund,
  PLANT_TOOL,
  plantError,
  placementError,
  townNote,
} from "@/game/engine";
import { BuildingInfo } from "./building-info";
import { useGame } from "@/components/civ/game-provider";
import { PixelIcon } from "@/components/civ/pixel-icon";
import { tileAnchor } from "@/components/civ/guide";
import { useGuide } from "@/components/civ/hud/guide-overlay";
import type { Tile } from "@/game/types";
import { BiomeDetails, Deposits, Forests, HexTerrain, Mountains, tileTop } from "./hex-terrain";
import { MODELS } from "./building-models";
import { BattleScene, FireVictims, Raiders, Villagers, Warriors } from "./villagers";
import { PickUp } from "./pick-up";
import { TradeShips } from "./trade";
import { Cracks, DisasterDust, disasterView, FloodWater, QuakeShake, Rubble, StormRain } from "./disasters";
import { Wildlife } from "./wildlife";
import { CampfireSmoke, Haze, Wildfire } from "./atmosphere";

function HexOutline({ x, y, z, color }: { x: number; y: number; z: number; color: string }) {
  return (
    <mesh position={[x, y + 0.02, z]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
      <ringGeometry args={[0.8, 0.98, 6, 1, Math.PI / 6]} />
      <meshBasicMaterial color={color} transparent opacity={0.85} depthWrite={false} />
    </mesh>
  );
}

// The old grove the tribe swore to protect: small standing stones on each of its
// tiles and a label over the middle, so it's clear which trees are safe.
function OldGrove({ tiles, ids }: { tiles: Tile[]; ids: number[] }) {
  const grove = ids.map((id) => tiles[id]).filter((t): t is Tile => !!t && t.revealed);
  if (!grove.length) return null;
  const cx = grove.reduce((sum, t) => sum + t.x, 0) / grove.length;
  const cz = grove.reduce((sum, t) => sum + t.z, 0) / grove.length;
  const centre = grove.reduce((best, t) => (Math.hypot(t.x - cx, t.z - cz) < Math.hypot(best.x - cx, best.z - cz) ? t : best));
  return (
    <group>
      {grove.map((t) =>
        [0.3, 2.4, 4.5].map((a) => (
          <mesh
            key={`${t.id}-${a}`}
            position={[t.x + Math.cos(a) * 0.78, t.height + 0.12, t.z + Math.sin(a) * 0.78]}
            castShadow
            raycast={() => null}
          >
            <boxGeometry args={[0.1, 0.26, 0.08]} />
            <meshStandardMaterial color="#cfc8bb" flatShading />
          </mesh>
        )),
      )}
      <Html zIndexRange={[15, 0]} center position={[centre.x, centre.height + 1.9, centre.z]} style={{ pointerEvents: "none" }}>
        <div className="pixel-panel font-pixel whitespace-nowrap px-1.5 py-0.5 text-[11px]" data-testid="grove-label">
          Old grove (protected)
        </div>
      </Html>
    </group>
  );
}

const probe = new Vector3();

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

export function WorldCanvas() {
  const { state, dispatch, selected, setSelected, panel } = useGame();
  const [rawHovered, setHovered] = useState<number | null>(null);
  // Tall phone screens start further out so more of the island fits.
  const [portrait] = useState(() => typeof window !== "undefined" && window.innerHeight > window.innerWidth);
  // The building whose info panel is open (click a building with no tool picked).
  const [inspected, setInspected] = useState<number | null>(null);
  const guide = useGuide();
  // Picking people up (see world/pick-up.tsx).
  const [holding, setHolding] = useState(false);
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
  const def = selected && !demolishing && !planting ? BUILDINGS_BY_ID[selected] : null;
  const plantNote = planting && hoverTile ? plantError(state, hoverTile) ?? null : null;
  const error = hoverTile && def ? placementError(state, hoverTile, def) : null;
  const demolishNote = (() => {
    if (!demolishing || !hoverTile) return null;
    const problem = demolishError(state, hoverTile);
    if (problem) return { ok: false, text: problem };
    const target = BUILDINGS_BY_ID[hoverTile.building!];
    const refund = Object.entries(demolishRefund(target))
      .filter(([, v]) => (v ?? 0) > 0)
      .map(([k, v]) => `+${v} ${k}`)
      .join(", ");
    return { ok: true, text: `Sell ${target.name}${refund ? ` (${refund})` : ""}` };
  })();
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

  const burning = useMemo(() => litFires(state), [state]);
  // A battle is played out for a few ticks after it happens.
  const battleShowing = !!state.battle && state.tick - state.battle.tick < 7;
  const burningIds = burning.map((t) => t.id);
  // The great drought: warned of (a little dry), then on (parched land, hazy sky).
  const dry = inDrought(state) ? 1 : state.drought ? 0.2 : 0;
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
    if (demolishing) {
      dispatch({ type: "demolish", tileId: id });
      return;
    }
    if (!selected) return;
    dispatch({ type: "place", tileId: id, buildingId: selected });
    // After a two-tap build on a phone, drop the preview so no stale label lingers.
    if (touch) setHovered(null);
  }

  return (
    <Canvas
      shadows
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
      <Haze fires={burning.length + 2 * buildings.filter((t) => t.building === "smithy").length} dust={dry >= 1 ? 1 : 0} storm={storm} />
      {/* The Ancient era is a touch warmer and more golden, so the change of era shows. */}
      <hemisphereLight args={[dry >= 1 ? "#ffe2a8" : state.era >= 1 ? "#ffeccc" : "#d6f1ff", "#6f8f4e", 0.75 - storm * 0.3]} />
      <directionalLight
        position={[home.x + 25, 40, home.z + 15]}
        intensity={1.5}
        color={state.era >= 1 ? "#fff0d2" : "#ffffff"}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-camera-left={-60}
        shadow-camera-right={60}
        shadow-camera-top={60}
        shadow-camera-bottom={-60}
        shadow-camera-far={150}
      >
        <object3D attach="target" position={[home.x, 0, home.z]} />
      </directionalLight>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]} receiveShadow raycast={() => null}>
        <planeGeometry args={[600, 600]} />
        <meshStandardMaterial color="#1a5f93" roughness={0.3} />
      </mesh>

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
            rotation={[broken ? 0.12 : 0, (t.id % 6) * (Math.PI / 3), broken ? 0.1 : 0]}
            scale={1.55}
          >
            <Model opacity={1} lit={t.building !== "campfire" || burningIds.includes(t.id)} />
          </group>
        );
      })}
      {/* Hard mode: a hammer over buildings that need repair (red when broken). */}
      {buildings
        .filter((t) => (t.worn ?? 0) >= WEAR.warnAt)
        .map((t) => (
          <Html zIndexRange={[14, 0]} key={`wear-${t.id}`} center position={[t.x, tileTop(t) + 1.5, t.z]} style={{ pointerEvents: "none" }}>
            <span
              className={"block border-2 border-[#140e0a] p-0.5 " + ((t.worn ?? 0) >= 1 ? "bg-red-500" : "bg-amber-300")}
              title="Needs repair"
            >
              <PixelIcon name="hammer" size={14} />
            </span>
          </Html>
        ))}

      <Villagers
        tiles={state.tiles}
        population={state.population}
        soldiers={state.soldiers}
        homeTile={home}
        litFires={burningIds}
        sick={state.population > 0 ? (state.sick ?? 0) / state.population : 0}
        era={state.era}
      />
      <PickUp state={state} dispatch={dispatch} enabled={canPickUp} onHolding={setHolding} />
      <Warriors
        tiles={state.tiles}
        population={state.population}
        soldiers={state.soldiers}
        spearmen={spearmenOf(state)}
        era={state.era}
        homeTile={home}
        rally={state.raid && state.raid.response !== "hide" ? state.tiles[state.raid.meetTile ?? state.raid.targetTile] : null}
        hidden={battleShowing}
      />
      <BattleScene tiles={state.tiles} battle={battleShowing ? state.battle ?? null : null} homeTile={home} />
      <Raiders tiles={state.tiles} raid={state.raid} tick={state.tick} speed={state.speed} />
      <TradeShips tiles={state.tiles} home={home} caravans={state.caravans ?? []} tick={state.tick} speed={state.speed} />
      <QuakeShake active={disaster.kind === "earthquake" && disaster.active} />
      {disaster.kind === "flood" && disaster.active && <FloodWater tiles={state.tiles} ids={disaster.tiles} progress={disaster.progress} />}
      {storm > 0 && <StormRain centre={home} heavy={disaster.active} />}
      {(disaster.kind === "earthquake" || disaster.kind === "landslide") && disaster.active && <DisasterDust tiles={state.tiles} ids={disaster.tiles} />}
      <Cracks tiles={state.tiles} />
      <Rubble tiles={state.tiles} />
      <Wildlife
        tiles={state.tiles}
        homeTile={home}
        onHunt={(animal) => dispatch({ type: "hunt", animal })}
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
            planting
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
      {hoverTile && dwellers && (
        <Html zIndexRange={[15, 0]} center position={[hoverTile.x, tileTop(hoverTile) + 1.2, hoverTile.z]} style={{ pointerEvents: "none" }}>
          <div className="pixel-panel-dark font-pixel whitespace-nowrap px-2 py-1 text-xs" data-testid="home-label">
            {BUILDINGS_BY_ID[hoverTile.building!].name}: {dwellers.living} of {dwellers.room} people live here
          </div>
        </Html>
      )}
      {hoverTile && demolishNote && hoverTile.building && (
        <Html zIndexRange={[15, 0]} center position={[hoverTile.x, tileTop(hoverTile) + 1.2, hoverTile.z]} style={{ pointerEvents: "none" }}>
          <div className="pixel-panel-dark font-pixel whitespace-nowrap px-2 py-1 text-xs">{demolishNote.text}</div>
        </Html>
      )}
      {hoverTile && Ghost && (
        <group position={[hoverTile.x, tileTop(hoverTile), hoverTile.z]} scale={1.55}>
          <Ghost opacity={0.45} />
          <Html
            // In the tutorial the card sits above the dimming so it can be read.
            zIndexRange={state.tutorialStep < TUTORIAL.length ? [40, 30] : [15, 0]}
            // Beside the tile, not on it, so you can see where you're placing.
            position={[0, 0.3, 0]}
            style={{ pointerEvents: "none", transform: "translate(56px, -50%)" }}
          >
            {error ? (
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
        <Html zIndexRange={[15, 0]} center position={[state.tiles[inspected].x, tileTop(state.tiles[inspected]) + 2.2, state.tiles[inspected].z]}>
          <BuildingInfo state={state} tileId={inspected} dispatch={dispatch} onClose={() => setInspected(null)} />
        </Html>
      )}

      <GuideAnchor tile={guideTile === null ? null : state.tiles[guideTile]} />

      <MapControls
        enabled={!guide.target && !holding}
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
