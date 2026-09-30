"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { Plane, Raycaster, Vector2, Vector3 } from "three";
import { BUILDINGS_BY_ID, DROP, TICK_SECONDS } from "@/game/content";
import { dropOutcome, type Action, type DropOutcome } from "@/game/engine";
import { isLand } from "@/game/map";
import type { GameState, Tile } from "@/game/types";
import { makeGround } from "./ground";
import { tileTop } from "./hex-terrain";
import { grabStore, type Walker } from "./villagers";

// How close (in screen pixels) a click must be to a person to pick them up.
const GRAB_RADIUS = 22;

// What the ring under a carried person says, and its colour.
const HINTS: Record<DropOutcome, { text: (t: Tile | null) => string; color: string }> = {
  land: { text: () => "Put down", color: "#f4efe6" },
  help: { text: (t) => `Help at the ${t?.building ? BUILDINGS_BY_ID[t.building].name : "building"}`, color: "#3fa34d" },
  relight: { text: () => "Relight the fire", color: "#f28c28" },
  fire: { text: () => "Into the fire!", color: "#d7263d" },
  shallow: { text: () => "Into the water (a cold)", color: "#4a90e2" },
  deep: { text: () => "The open sea!", color: "#1e4f9c" },
  fog: { text: () => "Into the unknown (rarely comes back)", color: "#8e5cc2" },
  mountain: { text: () => "Onto the mountain (a fall)", color: "#a3a9ae" },
};

// Pick villagers up with the mouse (or a finger) and drop them somewhere. Where
// they land matters: see dropOutcome() in the engine.
export function PickUp({
  state,
  dispatch,
  enabled,
  onHolding,
}: {
  state: GameState;
  dispatch: (a: Action) => void;
  enabled: boolean;
  onHolding: (holding: boolean) => void;
}) {
  const { camera, gl } = useThree();
  const ground = useMemo(() => makeGround(state.tiles), [state.tiles]);
  const pointer = useRef(new Vector2());
  const live = useRef({ state, enabled, dispatch, onHolding });
  useEffect(() => {
    live.current = { state, enabled, dispatch, onHolding };
  });
  const [target, setTarget] = useState<{ tile: Tile | null; outcome: DropOutcome; x: number; z: number } | null>(null);
  const tools = useMemo(() => ({ ray: new Raycaster(), plane: new Plane(new Vector3(0, 1, 0), -0.6), hit: new Vector3(), v: new Vector3() }), []);

  useEffect(() => {
    const el = gl.domElement;
    const read = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      pointer.current.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      return { px: e.clientX - r.left, py: e.clientY - r.top, w: r.width, h: r.height };
    };
    // The person nearest the cursor on screen, if close enough.
    const nearest = (e: PointerEvent): Walker | null => {
      const p = read(e);
      let best: Walker | null = null;
      let bestD = GRAB_RADIUS;
      for (const w of grabStore.walkers) {
        tools.v.set(w.x, w.y + 0.25 * w.scale, w.z).project(camera);
        if (tools.v.z > 1) continue;
        const d = Math.hypot(((tools.v.x + 1) / 2) * p.w - p.px, ((1 - tools.v.y) / 2) * p.h - p.py);
        if (d < bestD) {
          bestD = d;
          best = w;
        }
      }
      return best;
    };
    const down = (e: PointerEvent) => {
      if (!live.current.enabled || e.button !== 0 || grabStore.held) return;
      const w = nearest(e);
      if (!w) return;
      // Ours: don't let the camera or the map treat this as a drag or a click.
      e.stopImmediatePropagation();
      e.preventDefault();
      grabStore.held = w;
      w.held = true;
      // Picked up from the fire or from work: they stop sitting or working.
      w.sitting = false;
      w.working = false;
      w.sitAt = null;
      el.style.cursor = "grabbing";
      live.current.onHolding(true);
    };
    const move = (e: PointerEvent) => {
      if (grabStore.held) {
        read(e);
        return;
      }
      if (e.pointerType === "mouse") el.style.cursor = live.current.enabled && nearest(e) ? "grab" : "";
    };
    const up = () => {
      const w = grabStore.held;
      if (!w) return;
      grabStore.held = null;
      w.held = false;
      el.style.cursor = "";
      live.current.onHolding(false);
      setTarget(null);
      const { state: s, dispatch: send } = live.current;
      const tile = ground.tileAt(w.x, w.z) ?? null;
      const outcome = dropOutcome(s, tile);
      send({ type: "dropPerson", tileId: tile ? tile.id : null });
      land(w, outcome, tile, s.tiles, ground);
    };
    el.addEventListener("pointerdown", down, { capture: true });
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      el.removeEventListener("pointerdown", down, { capture: true });
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [gl, camera, ground, tools]);

  // The carried person dangles under the cursor, legs kicking.
  useFrame(({ clock }) => {
    const w = grabStore.held;
    if (!w) return;
    tools.ray.setFromCamera(pointer.current, camera);
    if (!tools.ray.ray.intersectPlane(tools.plane, tools.hit)) return;
    const tile = ground.tileAt(tools.hit.x, tools.hit.z) ?? null;
    w.x = tools.hit.x;
    w.z = tools.hit.z;
    w.tx = w.x;
    w.tz = w.z;
    w.y = (tile ? tileTop(tile) : 0.2) + 0.9 + Math.sin(clock.elapsedTime * 9) * 0.05;
    w.moving = true;
    w.sitting = false;
    w.heading += 0.04;
    const outcome = dropOutcome(live.current.state, tile);
    if (!target || target.tile?.id !== tile?.id || target.outcome !== outcome) {
      setTarget({ tile, outcome, x: tile ? tile.x : w.x, z: tile ? tile.z : w.z });
    }
  });

  if (!target) return null;
  const hint = HINTS[target.outcome];
  const y = target.tile ? tileTop(target.tile) + 0.03 : 0.15;
  return (
    <group position={[target.x, y, target.z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
        <ringGeometry args={[0.55, 0.75, 6]} />
        <meshBasicMaterial color={hint.color} transparent opacity={0.85} />
      </mesh>
      <Html zIndexRange={[15, 0]} center position={[0, 1.6, 0]}>
        <span
          className="font-pixel pointer-events-none whitespace-nowrap border-2 border-[#140e0a] px-2 py-0.5 text-xs text-white"
          style={{ background: hint.color === "#f4efe6" ? "#4a3b2e" : hint.color }}
          data-testid="drop-hint"
        >
          {hint.text(target.tile)}
        </span>
      </Html>
    </group>
  );
}

// Where the person ends up after the drop (the engine has already applied the rules).
function land(w: Walker, outcome: DropOutcome, tile: Tile | null, tiles: Tile[], ground: ReturnType<typeof makeGround>) {
  const now = performance.now();
  switch (outcome) {
    case "fire":
    case "deep":
      // Lost; a new face turns up at a building a little later.
      w.goneUntil = now + 30000;
      return;
    case "fog":
      w.goneUntil = now + DROP.fogTicks * TICK_SECONDS * 1000;
      return;
    case "shallow":
    case "mountain": {
      // Clamber back to the nearest open land.
      const shore = tiles
        .filter((t) => t.revealed && isLand(t.terrain) && t.terrain !== "mountain" && !t.building)
        .sort((a, b) => Math.hypot(a.x - w.x, a.z - w.z) - Math.hypot(b.x - w.x, b.z - w.z))[0];
      if (shore) {
        const spot = ground.spotOn(shore);
        Object.assign(w, { x: spot.x, z: spot.z, tx: spot.x, tz: spot.z, y: shore.height });
      }
      w.wait = 2;
      return;
    }
    default: {
      // Land here (beside the building if there is one) and carry on.
      if (tile?.building) {
        const spot = ground.spotOn(tile);
        Object.assign(w, { x: spot.x, z: spot.z, tx: spot.x, tz: spot.z });
      }
      if (tile) w.y = tile.height;
      w.moving = false;
      w.sitting = false;
      w.sitAt = null;
      if (outcome === "help" && tile) {
        // Get to work for as long as the help lasts, facing the building.
        w.working = true;
        w.heading = Math.atan2(tile.x - w.x, tile.z - w.z);
        w.wait = DROP.helpTicks * TICK_SECONDS;
      } else w.wait = 1.5;
    }
  }
}
