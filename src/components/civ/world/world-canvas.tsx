"use client";

import { useMemo, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Vector3 } from "three";
import { Html, MapControls } from "@react-three/drei";
import { BUILDINGS_BY_ID } from "@/game/content";
import { DEMOLISH_TOOL, demolishError, demolishRefund, placementError } from "@/game/engine";
import { useGame } from "@/components/civ/game-provider";
import { tileAnchor } from "@/components/civ/guide";
import { useGuide } from "@/components/civ/hud/guide-overlay";
import type { Tile } from "@/game/types";
import { Deposits, Forests, HexTerrain, Mountains, tileTop } from "./hex-terrain";
import { MODELS } from "./building-models";
import { Raiders, Villagers, Warriors } from "./villagers";
import { Wildlife } from "./wildlife";
import { Haze, SmogPlumes, Wildfire } from "./atmosphere";

function HexOutline({ x, y, z, color }: { x: number; y: number; z: number; color: string }) {
  return (
    <mesh position={[x, y + 0.02, z]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
      <ringGeometry args={[0.8, 0.98, 6, 1, Math.PI / 6]} />
      <meshBasicMaterial color={color} transparent opacity={0.85} depthWrite={false} />
    </mesh>
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
  const { state, dispatch, selected, setSelected } = useGame();
  const [rawHovered, setHovered] = useState<number | null>(null);
  const guide = useGuide();
  const guideTile = guide.target?.kind === "tile" ? guide.target.tileId : null;
  // While the tutorial points at a tile, that is the only one you can build on.
  const hovered = guideTile === null || rawHovered === guideTile ? rawHovered : null;
  const home = state.tiles[state.startTile];
  const target = useMemo<[number, number, number]>(() => [home.x, 0, home.z], [home.x, home.z]);

  const buildings = useMemo(() => state.tiles.filter((t) => t.building), [state.tiles]);
  const hoverTile = hovered !== null ? state.tiles[hovered] : null;
  const demolishing = selected === DEMOLISH_TOOL;
  const def = selected && !demolishing ? BUILDINGS_BY_ID[selected] : null;
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

  function pick(id: number) {
    if (guideTile !== null && id !== guideTile) return;
    if (demolishing) {
      dispatch({ type: "demolish", tileId: id });
      return;
    }
    if (!selected) return;
    dispatch({ type: "place", tileId: id, buildingId: selected });
  }

  return (
    <Canvas
      shadows
      camera={{ position: [home.x, 18, home.z + 16], fov: 38, near: 0.5, far: 400 }}
      onContextMenu={(e) => {
        e.preventDefault();
        setSelected(null);
      }}
    >
      <color attach="background" args={["#a8dcf5"]} />
      <Haze sustainability={state.meters.sustainability} />
      <hemisphereLight args={["#d6f1ff", "#6f8f4e", 0.75]} />
      <directionalLight
        position={[home.x + 25, 40, home.z + 15]}
        intensity={1.5}
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

      <HexTerrain tiles={state.tiles} onHover={setHovered} onPick={pick} />
      <Forests tiles={state.tiles} />
      <Mountains tiles={state.tiles} />
      <Deposits tiles={state.tiles} />

      {buildings.map((t) => {
        const Model = MODELS[t.building!];
        return (
          <group key={t.id} position={[t.x, t.height, t.z]} rotation={[0, (t.id % 6) * (Math.PI / 3), 0]} scale={1.55}>
            <Model opacity={1} />
          </group>
        );
      })}

      <Villagers tiles={state.tiles} population={state.population} homeTile={home} />
      <Warriors tiles={state.tiles} soldiers={state.soldiers} homeTile={home} />
      <Raiders tiles={state.tiles} raid={state.raid} tick={state.tick} />
      <Wildlife
        tiles={state.tiles}
        homeTile={home}
        onHunt={(animal) => dispatch({ type: "hunt", animal })}
      />
      <SmogPlumes tiles={state.tiles} sustainability={state.meters.sustainability} />
      <Wildfire tiles={state.tiles} />

      {hoverTile && (
        <HexOutline
          x={hoverTile.x}
          y={tileTop(hoverTile)}
          z={hoverTile.z}
          color={
            demolishNote
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
      {hoverTile && demolishNote && hoverTile.building && (
        <Html center position={[hoverTile.x, tileTop(hoverTile) + 1.2, hoverTile.z]} style={{ pointerEvents: "none" }}>
          <div className="pixel-panel-dark font-pixel whitespace-nowrap px-2 py-1 text-xs">{demolishNote.text}</div>
        </Html>
      )}
      {hoverTile && Ghost && (
        <group position={[hoverTile.x, tileTop(hoverTile), hoverTile.z]} scale={1.55}>
          <Ghost opacity={0.45} />
          {error && (
            <Html center position={[0, 0.8, 0]} style={{ pointerEvents: "none" }}>
              <div className="pixel-panel-dark font-pixel whitespace-nowrap px-2 py-1 text-xs">
                {error}
              </div>
            </Html>
          )}
        </group>
      )}

      <GuideAnchor tile={guideTile === null ? null : state.tiles[guideTile]} />

      <MapControls
        enabled={!guide.target}
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
