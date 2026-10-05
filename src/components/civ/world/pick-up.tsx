"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { Plane, Raycaster, Vector2, Vector3 } from "three";
import { BUILDINGS_BY_ID, DROP, GRIEF, TICK_SECONDS } from "@/game/content";
import { dropOutcome, type Action, type DropOutcome } from "@/game/engine";
import { isLand } from "@/game/map";
import type { GameState, Tile } from "@/game/types";
import { makeGround } from "./ground";
import { tileTop } from "./hex-terrain";
import { grabStore, type Walker } from "./villagers";

// The tool someone dropped on a building works with (none: they help by hand).
const TOOLS: Record<string, "axe" | "pick" | "hoe"> = { woodcutter: "axe", quarry: "pick", farm: "hoe", gatherer: "hoe", pen: "hoe", forester: "hoe", vfarm: "hoe" };

// How close (in screen pixels) a click must be to a person to pick them up...
const GRAB_RADIUS = 44;
// ...or how close on the ground (world units, about a hex) to where you clicked.
const GRAB_GROUND = 0.9;
// Over a building (people sit round a campfire), a click only picks someone up
// if it is right on them (pixels); otherwise the click is for the building.
const TIGHT_GRAB = 16;
// Putting someone into a fire or the open sea with a click needs a second
// click on the same spot within this long (ms). A drag there is deliberate.
const CONFIRM_MS = 2500;
const DEADLY: DropOutcome[] = ["fire", "deep"];
// A press that moves less than this (pixels) is a click: the person stays in
// your hand until the next click (or Enter). More is a drag, as before.
const CLICK_SLOP = 6;
// Carrying with the arrow keys: world units per second.
const KEY_SPEED = 3.5;

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

  // How the carried person is being moved: following the mouse (dragged, or
  // carried after a click), or walked with the arrow keys.
  const carry = useRef({ drag: false, keys: false, downX: 0, downY: 0, origin: { x: 0, z: 0 }, pressed: new Set<string>() });
  const [carrying, setCarrying] = useState(false);
  // A deadly drop waiting for its second click: on which tile, until when.
  const confirm = useRef<{ tile: number | null; until: number } | null>(null);
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    const el = gl.domElement;
    const read = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      pointer.current.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      return { px: e.clientX - r.left, py: e.clientY - r.top, w: r.width, h: r.height };
    };
    // The person nearest a point on screen: close on screen, or standing close to
    // where that point meets the ground (easier when zoomed out).
    const nearestTo = (px: number, py: number, w: number, h: number): Walker | null => nearestHit(px, py, w, h)?.walker ?? null;
    // The same, with how far away on screen they are and the tile clicked on.
    const nearestHit = (px: number, py: number, w: number, h: number): { walker: Walker; d: number; tile: Tile | null } | null => {
      pointer.current.set((px / w) * 2 - 1, -(py / h) * 2 + 1);
      tools.ray.setFromCamera(pointer.current, camera);
      const onGround = tools.ray.ray.intersectPlane(tools.plane, tools.hit);
      const tile = onGround ? ground.tileAt(tools.hit.x, tools.hit.z) ?? null : null;
      let best: Walker | null = null;
      let bestD = Infinity;
      for (const walker of grabStore.walkers) {
        if (walker.goneUntil) continue;
        tools.v.set(walker.x, walker.y + 0.25 * walker.scale, walker.z).project(camera);
        if (tools.v.z > 1) continue;
        const d = Math.hypot(((tools.v.x + 1) / 2) * w - px, ((1 - tools.v.y) / 2) * h - py);
        const near = d < GRAB_RADIUS || (onGround && Math.hypot(walker.x - tools.hit.x, walker.z - tools.hit.z) < GRAB_GROUND);
        if (near && d < bestD) {
          bestD = d;
          best = walker;
        }
      }
      return best ? { walker: best, d: bestD, tile } : null;
    };
    // Who a click here would pick up: anyone close, but over a building only
    // someone right under the cursor (the click is meant for the building).
    const nearest = (e: PointerEvent): Walker | null => {
      const p = read(e);
      const hit = nearestHit(p.px, p.py, p.w, p.h);
      if (!hit) return null;
      if (hit.tile?.building && hit.d > TIGHT_GRAB) return null;
      return hit.walker;
    };
    // Into a fire or the open sea with a click or Enter: only on a second
    // click (or Enter) on the same spot. True when it can go ahead now.
    const confirmed = (): boolean => {
      const w = grabStore.held;
      if (!w) return true;
      const tile = ground.tileAt(w.x, w.z) ?? null;
      if (!DEADLY.includes(dropOutcome(live.current.state, tile))) return true;
      const c = confirm.current;
      const id = tile ? tile.id : null;
      if (c && c.tile === id && performance.now() < c.until) return true;
      confirm.current = { tile: id, until: performance.now() + CONFIRM_MS };
      setArmed(true);
      return false;
    };
    const pickUp = (w: Walker) => {
      grabStore.held = w;
      w.held = true;
      // Picked up from the fire or from work: they stop sitting or working.
      w.sitting = false;
      w.working = false;
      w.workAt = null;
      w.faceAt = null;
      w.sitAt = null;
      carry.current.origin = { x: w.x, z: w.z };
      el.style.cursor = "grabbing";
      live.current.onHolding(true);
      setCarrying(true);
    };
    const release = () => {
      confirm.current = null;
      setArmed(false);
      grabStore.held = null;
      carry.current.drag = false;
      carry.current.keys = false;
      carry.current.pressed.clear();
      el.style.cursor = "";
      live.current.onHolding(false);
      setTarget(null);
      setCarrying(false);
    };
    // Put the person down where they are now; the engine decides what happens.
    const drop = () => {
      const w = grabStore.held;
      if (!w) return;
      w.held = false;
      release();
      const { state: s, dispatch: send } = live.current;
      const tile = ground.tileAt(w.x, w.z) ?? null;
      const outcome = dropOutcome(s, tile);
      send({ type: "dropPerson", tileId: tile ? tile.id : null });
      land(w, outcome, tile, s.tiles, ground);
    };
    // Esc: put them back where they were picked up, nothing happens.
    const putBack = () => {
      const w = grabStore.held;
      if (!w) return;
      Object.assign(w, { x: carry.current.origin.x, z: carry.current.origin.z, tx: carry.current.origin.x, tz: carry.current.origin.z, held: false, moving: false });
      w.y = ground.heightAt(w.x, w.z);
      release();
    };

    const down = (e: PointerEvent) => {
      if (!live.current.enabled || e.button !== 0) return;
      // Carrying after a click: this click puts them down.
      if (grabStore.held) {
        e.stopImmediatePropagation();
        e.preventDefault();
        read(e);
        carry.current.keys = false;
        if (confirmed()) drop();
        return;
      }
      const w = nearest(e);
      if (!w) return;
      // Ours: don't let the camera or the map treat this as a drag or a click.
      e.stopImmediatePropagation();
      e.preventDefault();
      carry.current.drag = true;
      carry.current.downX = e.clientX;
      carry.current.downY = e.clientY;
      pickUp(w);
    };
    const move = (e: PointerEvent) => {
      if (grabStore.held) {
        read(e);
        // The mouse takes over from the arrow keys once it moves.
        if (!carry.current.drag && carry.current.keys && Math.abs(e.movementX) + Math.abs(e.movementY) > 2) carry.current.keys = false;
        return;
      }
      if (e.pointerType === "mouse") el.style.cursor = live.current.enabled && nearest(e) ? "grab" : "";
    };
    const up = (e: PointerEvent) => {
      if (!grabStore.held || !carry.current.drag) return;
      carry.current.drag = false;
      // Hardly moved: it was a click, so keep carrying until the next click.
      if (Math.hypot(e.clientX - carry.current.downX, e.clientY - carry.current.downY) < CLICK_SLOP) return;
      drop();
    };
    const ARROWS: Record<string, string> = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", w: "up", s: "down", a: "left", d: "right" };
    const key = (e: KeyboardEvent) => {
      // Never while typing (feedback box, name field).
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const dir = ARROWS[e.key] ?? ARROWS[e.key.toLowerCase()];
      if (grabStore.held) {
        if (dir) {
          e.preventDefault();
          carry.current.keys = true;
          carry.current.pressed.add(dir);
        } else if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (confirmed()) drop();
        } else if (e.key === "Escape") {
          putBack();
        }
        return;
      }
      // P: pick up the person nearest the middle of the screen.
      if ((e.key === "p" || e.key === "P") && live.current.enabled) {
        const r = el.getBoundingClientRect();
        const w = nearestTo(r.width / 2, r.height / 2, r.width, r.height) ?? nearestToCentre();
        if (!w) return;
        carry.current.keys = true;
        pickUp(w);
      }
    };
    const keyUp = (e: KeyboardEvent) => {
      const dir = ARROWS[e.key] ?? ARROWS[e.key.toLowerCase()];
      if (dir) carry.current.pressed.delete(dir);
    };
    // Nobody right in the middle: the closest person to it on the ground.
    const nearestToCentre = (): Walker | null => {
      pointer.current.set(0, 0);
      tools.ray.setFromCamera(pointer.current, camera);
      if (!tools.ray.ray.intersectPlane(tools.plane, tools.hit)) return null;
      const list = grabStore.walkers.filter((w) => !w.goneUntil);
      return list.sort((a, b) => Math.hypot(a.x - tools.hit.x, a.z - tools.hit.z) - Math.hypot(b.x - tools.hit.x, b.z - tools.hit.z))[0] ?? null;
    };
    el.addEventListener("pointerdown", down, { capture: true });
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    window.addEventListener("keydown", key);
    window.addEventListener("keyup", keyUp);
    return () => {
      el.removeEventListener("pointerdown", down, { capture: true });
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      window.removeEventListener("keydown", key);
      window.removeEventListener("keyup", keyUp);
    };
  }, [gl, camera, ground, tools]);

  // The carried person dangles under the cursor (or walks with the arrow keys), legs kicking.
  useFrame(({ clock }, delta) => {
    const w = grabStore.held;
    if (!w) return;
    const c = carry.current;
    if (c.keys) {
      // Up is away from the camera, left and right across the screen.
      camera.getWorldDirection(tools.v);
      const fx = tools.v.x;
      const fz = tools.v.z;
      const len = Math.hypot(fx, fz) || 1;
      const step = KEY_SPEED * Math.min(delta, 0.3);
      const f = (c.pressed.has("up") ? 1 : 0) - (c.pressed.has("down") ? 1 : 0);
      const s = (c.pressed.has("right") ? 1 : 0) - (c.pressed.has("left") ? 1 : 0);
      w.x += ((fx * f - fz * s) / len) * step;
      w.z += ((fz * f + fx * s) / len) * step;
    } else {
      tools.ray.setFromCamera(pointer.current, camera);
      if (!tools.ray.ray.intersectPlane(tools.plane, tools.hit)) return;
      w.x = tools.hit.x;
      w.z = tools.hit.z;
    }
    const tile = ground.tileAt(w.x, w.z) ?? null;
    w.tx = w.x;
    w.tz = w.z;
    w.y = (tile ? tileTop(tile) : 0.2) + 0.9 + Math.sin(clock.elapsedTime * 9) * 0.05;
    w.moving = true;
    w.sitting = false;
    w.heading += 0.04;
    const outcome = dropOutcome(live.current.state, tile);
    if (!target || target.tile?.id !== tile?.id || target.outcome !== outcome) {
      setTarget({ tile, outcome, x: tile ? tile.x : w.x, z: tile ? tile.z : w.z });
      // Moved somewhere else: a pending "click again" no longer applies.
      if (confirm.current && confirm.current.tile !== (tile ? tile.id : null)) {
        confirm.current = null;
        setArmed(false);
      }
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
          className="font-pixel pointer-events-none flex flex-col items-center whitespace-nowrap border-2 border-[#140e0a] px-2 py-0.5 text-xs text-white"
          style={{ background: hint.color === "#f4efe6" ? "#4a3b2e" : hint.color }}
          data-testid="drop-hint"
        >
          {hint.text(target.tile)}
          {armed && DEADLY.includes(target.outcome) && (
            <span className="block text-[11px] font-bold text-amber-200" data-testid="drop-confirm">
              Click again to really drop them there
              <span className="block font-normal text-white">They die, and the tribe grieves: −{GRIEF.happiness} happiness</span>
            </span>
          )}
          {carrying && <span className="block text-[10px] text-white/80">Click or Enter: put down · Arrows: move · Esc: put back</span>}
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
        // Get to work for as long as the help lasts, facing the building. A
        // tool only where one makes sense: an axe for wood, a pick for stone,
        // a hoe for the land. Anywhere else (a school, a market, a factory)
        // they pitch in by hand, without digging at the floor.
        const tool = tile.building ? TOOLS[tile.building] : undefined;
        w.working = !!tool;
        w.workAt = tile;
        w.workUntil = performance.now() + DROP.helpTicks * TICK_SECONDS * 1000;
        w.workTool = tool;
        // A woodcutter's helper walks out to a tree; the others work where
        // they land, facing the building.
        const spot = w.workTool === "axe" ? ground.workSpot(tile, "axe") : { x: w.x, z: w.z, face: { x: tile.x, z: tile.z } };
        w.tx = spot.x;
        w.tz = spot.z;
        w.faceAt = spot.face;
        w.heading = Math.atan2(spot.face.x - w.x, spot.face.z - w.z);
        w.wait = 3;
      } else w.wait = 1.5;
    }
  }
}
