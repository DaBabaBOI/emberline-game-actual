"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { Group, PerspectiveCamera } from "three";
import type { Battle, Tile } from "@/game/types";
import { makeGround } from "./ground";
import { peakHeight, treeSpots } from "./hex-terrain";
import { grabStore } from "./villagers";
import { Figures, type Agent } from "./figures";
import { CHIP_COLORS, Chips, HeldTool, holdTool, spawnChips, type HeldKind } from "./held-tool";
import { isLand } from "@/game/map";
import { LEADER } from "@/game/content";
import { leader, leaderButtons, leaderSnapshot, leaderStick, setLeaderBuild, setLeaderLocked, setLeaderMenu, setLeaderPrompt, setLeaderView, villagerName, type LeaderPrompt } from "./leader";

// Leader mode: the chief, walked in first person. WASD or the arrows to move
// (Shift to run, Space to jump), the mouse to look (click the view to take the
// mouse; Esc gives it back). What's under the crosshair decides what you can
// do: E to talk to a villager, step into a building or relight a cold fire; a
// click to strike in a fight, chop wood or break stone; P to plant a tree.
// Pick a building from the hotbar (1-9 or the wheel) and a click builds it
// where you look (Q puts it away). Tab for the build view (and back).

const EYE = 0.62;
const WALK = 2.2;
const RUN = 4;
const REACH = 1.25;
// How far the crosshair reaches: to build or plant, and to work or step in.
const SIGHT = 7;
const HANDS = 3.2;

export type LeaderAct = { kind: "build" | "gather" | "plant" | "open" | "relight"; tile: number };

export function LeaderRig({
  leaderMode = false,
  tiles,
  home,
  active,
  battle,
  onStrike,
  onAct,
  coldFires = [],
  era = 0,
  armed = false,
  quarry = false,
}: {
  // Leader mode (started as the chief): Tab switches views, and the chief always stands on the map.
  leaderMode?: boolean;
  tiles: Tile[];
  home: Tile;
  active: boolean;
  battle: Battle | null;
  onStrike: () => void;
  onAct: (act: LeaderAct) => void;
  // Campfires gone cold (E relights them).
  coldFires?: number[];
  // The era (a spear early on, a sword later), and raiders about (weapon in hand).
  era?: number;
  armed?: boolean;
  // The Stone Quarry is known: stone can be broken off by hand.
  quarry?: boolean;
}) {
  const { gl } = useThree();
  // Whether the first-person lens is on, and the map's lens to put back.
  const lens = useRef<{ on: boolean; fov: number; near: number }>({ on: false, fov: 38, near: 0.5 });
  const ground = useMemo(() => makeGround(tiles), [tiles]);
  // The trees of the woods, by half-tile cell, so the crosshair stops at a
  // trunk or a crown (not the hill behind it).
  const woods = useMemo(() => {
    const cells = new Map<string, { x: number; y: number; z: number; s: number; tile: number }[]>();
    for (const t of tiles) {
      if (t.terrain !== "forest") continue;
      for (const s of treeSpots(t)) {
        const key = `${Math.floor(s.x * 2)},${Math.floor(s.z * 2)}`;
        const list = cells.get(key) ?? [];
        list.push({ ...s, tile: t.id });
        cells.set(key, list);
      }
    }
    return cells;
  }, [tiles]);
  const keys = useRef(new Set<string>());
  const strike = useRef(onStrike);
  const act = useRef(onAct);
  const cold = useRef(coldFires);
  useEffect(() => {
    strike.current = onStrike;
    act.current = onAct;
    cold.current = coldFires;
  });
  const fight = battle?.live ? tiles[battle.tile] : null;
  const fightRef = useRef(fight);
  const armedRef = useRef(armed);
  const canQuarry = useRef(quarry);
  useEffect(() => {
    fightRef.current = fight;
    armedRef.current = armed;
    canQuarry.current = quarry;
  });
  // What's in the chief's hand.
  const tool = useRef<Group>(null);
  const held = useRef<{ kind: HeldKind | null; since: number }>({ kind: null, since: 0 });

  // The chief starts near the fire, looking across the village: on open
  // ground (not inside the fire, a hut or the sea), the nearest free spot.
  useEffect(() => {
    if (leader.ready) return;
    // A couple of steps back from the fire, so it isn't right in your face.
    let at = { x: home.x + 1.3, z: home.z + 1.3 };
    for (let r = 1.8; r < 4 && !ground.walkable(at.x, at.z); r += 0.3) {
      for (let a = 0; a < 12; a++) {
        const p = { x: home.x + Math.cos((a * Math.PI) / 6) * r, z: home.z + Math.sin((a * Math.PI) / 6) * r };
        if (ground.walkable(p.x, p.z)) {
          at = p;
          break;
        }
      }
    }
    leader.x = at.x;
    leader.z = at.z;
    leader.y = ground.heightAt(leader.x, leader.z);
    leader.yaw = Math.atan2(leader.x - home.x, leader.z - home.z);
    leader.ready = true;
  }, [ground, home]);

  // Keys, the mouse, and the pointer lock.
  useEffect(() => {
    const typing = (e: Event) => {
      const t = e.target as HTMLElement | null;
      return !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA");
    };
    const down = (e: KeyboardEvent) => {
      if (typing(e)) return;
      // V (any game), or Tab in Leader mode: walk, or back to the map.
      if ((e.key === "Tab" && leaderMode) || (e.key.toLowerCase() === "v" && !e.ctrlKey && !e.metaKey && !e.altKey)) {
        e.preventDefault();
        if (document.pointerLockElement) document.exitPointerLock();
        setLeaderView(leaderSnapshot().view === "fp" ? "map" : "fp");
        return;
      }
      if (!active) return;
      const key = e.key.toLowerCase();
      keys.current.add(key);
      // WASD by where the keys are, whatever the keyboard's layout.
      if (/^Key[WASD]$/.test(e.code)) keys.current.add(e.code.slice(3).toLowerCase());
      // E: talk, or step into a building (its panel, with the mouse free to use it).
      if (key === "e") interact();
      if (key === "p") plant();
      if (key === "q") setLeaderBuild(null);
      if (key === " ") {
        e.preventDefault();
        jump();
      }
    };
    const up = (e: KeyboardEvent) => {
      keys.current.delete(e.key.toLowerCase());
      if (/^Key[WASD]$/.test(e.code)) keys.current.delete(e.code.slice(3).toLowerCase());
    };
    const move = (e: MouseEvent) => {
      if (!active || document.pointerLockElement !== gl.domElement) return;
      leader.yaw -= e.movementX * 0.0024;
      leader.pitch = Math.max(-1.2, Math.min(1.0, leader.pitch - e.movementY * 0.0024));
    };
    // A blow, when the raiders are within reach (at most two a second);
    // otherwise build, or work with your hands, at what's under the crosshair.
    const doAct = () => {
      const now = performance.now();
      const p = leaderSnapshot().prompt;
      if (p?.kind === "fight") {
        if (now - leader.strikeAt > 450) {
          leader.strikeAt = now;
          strike.current();
          // Sparks where the blow lands, just ahead.
          spawnChips({ x: leader.x - Math.sin(leader.yaw) * 0.7, y: leader.y + EYE - 0.15, z: leader.z - Math.cos(leader.yaw) * 0.7 }, CHIP_COLORS.spark, 10, 1.6);
        }
      } else if (p?.kind === "build") act.current({ kind: "build", tile: p.tile });
      else if (p?.kind === "gather" && !p.spent && now - leader.actAt > 350) {
        leader.actAt = now;
        act.current({ kind: "gather", tile: p.tile });
        spawnChips(leader.aimAt, CHIP_COLORS[p.what], 8);
      }
    };
    const click = (e: MouseEvent) => {
      if (!active) return;
      // Touch screens use the on-screen buttons (and have no pointer lock).
      if ((e as PointerEvent).pointerType === "touch") return;
      if (document.pointerLockElement !== gl.domElement) {
        if (!leaderSnapshot().menu) gl.domElement.requestPointerLock?.();
        return;
      }
      doAct();
    };
    const interact = () => {
      const p = leaderSnapshot().prompt;
      if (p?.kind === "talk") {
        if (document.pointerLockElement) document.exitPointerLock();
        setLeaderMenu({ index: p.index, name: p.name });
      } else if (p?.kind === "building") {
        if (cold.current.includes(p.tile)) act.current({ kind: "relight", tile: p.tile });
        else {
          if (document.pointerLockElement) document.exitPointerLock();
          act.current({ kind: "open", tile: p.tile });
        }
      }
    };
    const plant = () => {
      const p = leaderSnapshot().prompt;
      if (p?.kind === "plant" || (p?.kind === "gather" && p.what === "wood")) act.current({ kind: "plant", tile: p.tile });
    };
    const jump = () => {
      if (leader.hop === 0) leader.vy = 2.8;
    };
    if (active) Object.assign(leaderButtons, { act: doAct, use: interact, plant, jump });
    const lock = () => setLeaderLocked(document.pointerLockElement === gl.domElement);
    const blur = () => keys.current.clear();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("mousemove", move);
    window.addEventListener("blur", blur);
    gl.domElement.addEventListener("mousedown", click);
    document.addEventListener("pointerlockchange", lock);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("mousemove", move);
      window.removeEventListener("blur", blur);
      gl.domElement.removeEventListener("mousedown", click);
      document.removeEventListener("pointerlockchange", lock);
    };
  }, [active, gl, leaderMode]);

  // Walk, look, and see what's within reach.
  useFrame((three, delta) => {
    if (!leader.ready) return;
    const camera = three.camera as PerspectiveCamera;
    // Into first person: a wide view, and close things don't clip. Out of it:
    // the map's lens back, above the chief, the map turning round them.
    if (active !== lens.current.on) {
      if (active) {
        lens.current = { on: true, fov: camera.fov, near: camera.near };
        camera.fov = 72;
        camera.near = 0.05;
      } else {
        lens.current.on = false;
        camera.fov = lens.current.fov;
        camera.near = lens.current.near;
        camera.position.set(leader.x, leader.y + 14, leader.z + 12);
        camera.lookAt(leader.x, leader.y, leader.z);
        const controls = three.controls as unknown as { target?: { set: (x: number, y: number, z: number) => void }; update?: () => void } | null;
        controls?.target?.set(leader.x, leader.y, leader.z);
        controls?.update?.();
      }
      camera.updateProjectionMatrix();
    }
    const dt = Math.min(delta, 0.1);
    const k = keys.current;
    // The keys, or the on-screen stick.
    const ahead = Math.max(-1, Math.min(1, (k.has("w") || k.has("arrowup") ? 1 : 0) - (k.has("s") || k.has("arrowdown") ? 1 : 0) + leaderStick.ahead));
    const side = Math.max(-1, Math.min(1, (k.has("d") || k.has("arrowright") ? 1 : 0) - (k.has("a") || k.has("arrowleft") ? 1 : 0) + leaderStick.side));
    const fx = -Math.sin(leader.yaw);
    const fz = -Math.cos(leader.yaw);
    leader.moving = active && (ahead !== 0 || side !== 0);
    if (leader.moving) {
      const len = Math.max(1, Math.hypot(ahead, side));
      const step = ((k.has("shift") ? RUN : WALK) * dt) / len;
      const dx = (fx * ahead - fz * side) * step;
      const dz = (fz * ahead + fx * side) * step;
      // Slide along whatever is in the way (water, a building, a mountain);
      // and if somehow standing inside something, any step gets you out.
      if (!ground.walkable(leader.x, leader.z) || ground.walkable(leader.x + dx, leader.z + dz)) {
        leader.x += dx;
        leader.z += dz;
      } else if (ground.walkable(leader.x + dx, leader.z)) leader.x += dx;
      else if (ground.walkable(leader.x, leader.z + dz)) leader.z += dz;
    }
    leader.y += (ground.heightAt(leader.x, leader.z) - leader.y) * Math.min(1, dt * 10);
    // A jump: up, and back down.
    if (leader.hop > 0 || leader.vy > 0) {
      leader.hop += leader.vy * dt;
      leader.vy -= 9 * dt;
      if (leader.hop <= 0) leader.hop = leader.vy = 0;
    }
    if (!active) {
      if (tool.current) tool.current.visible = false;
      return;
    }

    const now = performance.now();
    const bob = leader.moving ? Math.sin(now / 120) * 0.025 : 0;
    // The view dips with a swing of the axe (or a blow).
    const swing = Math.max(0, 1 - (now - Math.max(leader.actAt, leader.strikeAt)) / 260);
    camera.position.set(leader.x, leader.y + EYE + bob + leader.hop, leader.z);
    camera.rotation.set(leader.pitch - Math.sin(swing * Math.PI) * 0.06, leader.yaw, 0, "YXZ");
    // In hand: a weapon in a fight (or with raiders about), the right tool for
    // what's under the crosshair, a hammer while building.
    const was = leaderSnapshot();
    const weapon: HeldKind = era >= 2 ? "sword" : "spear";
    const kind: HeldKind | null =
      was.prompt?.kind === "fight"
        ? weapon
        : was.prompt?.kind === "gather"
          ? was.prompt.what === "wood"
            ? "axe"
            : "pick"
          : was.build
            ? "hammer"
            : armedRef.current
              ? weapon
              : null;
    holdTool(tool.current, camera, kind, held.current, now, Math.max(leader.actAt, leader.strikeAt), leader.moving);

    // Within reach: a fight, or a villager in front.
    if (fightRef.current && Math.hypot(fightRef.current.x - leader.x, fightRef.current.z - leader.z) < 3.2) {
      setLeaderPrompt({ kind: "fight" });
      return;
    }
    // What the crosshair is on: a tree, a mountain's peak, a building (it
    // stands about this high over the middle of its tile) or the ground.
    const lx = -Math.sin(leader.yaw) * Math.cos(leader.pitch);
    const ly = Math.sin(leader.pitch);
    const lz = -Math.cos(leader.yaw) * Math.cos(leader.pitch);
    let aim: { tile: Tile; d: number; tree?: boolean } | null = null;
    march: for (let t = 0.3; t <= SIGHT; t += 0.06) {
      const x = leader.x + lx * t;
      const y = leader.y + EYE + leader.hop + ly * t;
      const z = leader.z + lz * t;
      const cx = Math.floor(x * 2);
      const cz = Math.floor(z * 2);
      for (let i = -1; i <= 1; i++)
        for (let j = -1; j <= 1; j++)
          for (const tree of woods.get(`${cx + i},${cz + j}`) ?? []) {
            // A little more than the tree itself (they're about head high on
            // the chief, so a look straight ahead skims their tops).
            if (y < tree.y || y > tree.y + 0.68 * tree.s + 0.12 || Math.hypot(x - tree.x, z - tree.z) > 0.2 * tree.s + 0.05) continue;
            aim = { tile: tiles[tree.tile], d: t, tree: true };
            Object.assign(leader.aimAt, { x, y, z });
            break march;
          }
      const tile = ground.tileAt(x, z);
      if (!tile) continue;
      const peak = tile.terrain === "mountain" && !tile.building ? peakHeight(tile) * Math.max(0, 1 - Math.hypot(x - tile.x, z - tile.z) / 0.97) : 0;
      if ((tile.building && Math.hypot(x - tile.x, z - tile.z) < 0.62 && y < tile.height + 0.8) || y <= ground.heightAt(x, z) + peak) {
        aim = { tile, d: t };
        Object.assign(leader.aimAt, { x, y, z });
        break;
      }
    }
    // Holding a building from the hotbar: it goes where you look.
    if (leaderSnapshot().build) {
      setLeaderPrompt(aim && aim.tile.revealed ? { kind: "build", tile: aim.tile.id } : null);
      return;
    }
    let best: { index: number; d: number } | null = null;
    grabStore.walkers.forEach((w, index) => {
      if (w.child || w.held || w.hunting || (w.goneUntil ?? 0) > performance.now()) return;
      const vx = w.x - leader.x;
      const vz = w.z - leader.z;
      const d = Math.hypot(vx, vz);
      if (d > REACH || d < 1e-3) return;
      // Right in front of us (where we look), not off to the side.
      if ((vx * fx + vz * fz) / d < 0.85) return;
      if (!best || d < best.d) best = { index, d };
    });
    const found = best as { index: number; d: number } | null;
    if (found) {
      // A cameo answers to the name on their tag.
      setLeaderPrompt({ kind: "talk", index: found.index, name: grabStore.walkers[found.index]?.cameo ?? villagerName(found.index) });
      return;
    }
    let prompt: LeaderPrompt = null;
    if (aim && aim.d <= HANDS && aim.tile.revealed) {
      const t = aim.tile;
      if (t.building) prompt = { kind: "building", tile: t.id };
      // A tree: wood (until the wood is thinned right out, then let it grow back).
      else if (aim.tree || t.terrain === "forest") prompt = { kind: "gather", tile: t.id, what: "wood", spent: t.growth <= LEADER.chopMin };
      // Stone by hand only once the Stone Quarry is known (the tools for it).
      else if ((t.terrain === "hills" || t.terrain === "mountain") && canQuarry.current) prompt = { kind: "gather", tile: t.id, what: "stone" };
      else if (isLand(t.terrain)) prompt = { kind: "plant", tile: t.id };
    }
    setLeaderPrompt(prompt);
  });

  // In the build view the chief stands on the map, crowned, so you can find them.
  const body = useRef<Agent[]>([]);
  useFrame(() => {
    if (active) leader.walked = true;
    body.current = active || !(leaderMode || leader.walked)
      ? []
      : [{ x: leader.x, y: leader.y, z: leader.z, heading: leader.yaw + Math.PI, moving: leader.moving, scale: 1.55, tunic: "#7c3aed", skin: "#e0ac69", hair: "#2b1b10", phase: 0, crown: true }];
  });
  return (
    <>
      <Figures agents={body} max={1} />
      <HeldTool toolRef={tool} />
      <Chips />
    </>
  );
}
