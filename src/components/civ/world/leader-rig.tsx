"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { PerspectiveCamera } from "three";
import type { Battle, Tile } from "@/game/types";
import { makeGround } from "./ground";
import { grabStore } from "./villagers";
import { Figures, type Agent } from "./figures";
import { leader, leaderSnapshot, setLeaderLocked, setLeaderMenu, setLeaderPrompt, setLeaderView, villagerName } from "./leader";

// Leader mode: the chief, walked in first person. WASD or the arrows to move
// (Shift to run), the mouse to look (click the view to take the mouse; Esc gives
// it back), E to talk to the villager in front, a click to strike in a fight,
// Tab for the build view (and back).

const EYE = 0.62;
const WALK = 2.2;
const RUN = 4;
const REACH = 1.25;

export function LeaderRig({ tiles, home, active, battle, onStrike }: { tiles: Tile[]; home: Tile; active: boolean; battle: Battle | null; onStrike: () => void }) {
  const { gl } = useThree();
  // Whether the first-person lens is on, and the map's lens to put back.
  const lens = useRef<{ on: boolean; fov: number; near: number }>({ on: false, fov: 38, near: 0.5 });
  const ground = useMemo(() => makeGround(tiles), [tiles]);
  const keys = useRef(new Set<string>());
  const strike = useRef(onStrike);
  useEffect(() => {
    strike.current = onStrike;
  });
  const fight = battle?.live ? tiles[battle.tile] : null;
  const fightRef = useRef(fight);
  useEffect(() => {
    fightRef.current = fight;
  });

  // The chief starts beside the fire, looking out over the village.
  useEffect(() => {
    if (leader.ready) return;
    const spot = ground.spotOn(home);
    leader.x = spot.x + 0.9;
    leader.z = spot.z + 0.9;
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
      if (e.key === "Tab") {
        e.preventDefault();
        if (document.pointerLockElement) document.exitPointerLock();
        setLeaderView(leaderSnapshot().view === "fp" ? "map" : "fp");
        return;
      }
      if (!active) return;
      keys.current.add(e.key.toLowerCase());
      if (e.key.toLowerCase() === "e") {
        const p = leaderSnapshot().prompt;
        if (p?.kind === "talk") {
          if (document.pointerLockElement) document.exitPointerLock();
          setLeaderMenu({ index: p.index, name: p.name });
        }
      }
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
    const move = (e: MouseEvent) => {
      if (!active || document.pointerLockElement !== gl.domElement) return;
      leader.yaw -= e.movementX * 0.0024;
      leader.pitch = Math.max(-1.2, Math.min(1.0, leader.pitch - e.movementY * 0.0024));
    };
    const click = () => {
      if (!active) return;
      if (document.pointerLockElement !== gl.domElement) {
        if (!leaderSnapshot().menu) gl.domElement.requestPointerLock?.();
        return;
      }
      // A blow, when the raiders are within reach (at most two a second).
      const now = performance.now();
      if (fightRef.current && now - leader.strikeAt > 450) {
        leader.strikeAt = now;
        strike.current();
      }
    };
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
  }, [active, gl]);

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
    const ahead = (k.has("w") || k.has("arrowup") ? 1 : 0) - (k.has("s") || k.has("arrowdown") ? 1 : 0);
    const side = (k.has("d") || k.has("arrowright") ? 1 : 0) - (k.has("a") || k.has("arrowleft") ? 1 : 0);
    const fx = -Math.sin(leader.yaw);
    const fz = -Math.cos(leader.yaw);
    leader.moving = active && (ahead !== 0 || side !== 0);
    if (leader.moving) {
      const len = Math.hypot(ahead, side) || 1;
      const step = ((k.has("shift") ? RUN : WALK) * dt) / len;
      const dx = (fx * ahead - fz * side) * step;
      const dz = (fz * ahead + fx * side) * step;
      // Slide along whatever is in the way (water, a building, a mountain).
      if (ground.walkable(leader.x + dx, leader.z + dz)) {
        leader.x += dx;
        leader.z += dz;
      } else if (ground.walkable(leader.x + dx, leader.z)) leader.x += dx;
      else if (ground.walkable(leader.x, leader.z + dz)) leader.z += dz;
    }
    leader.y += (ground.heightAt(leader.x, leader.z) - leader.y) * Math.min(1, dt * 10);
    if (!active) return;

    const bob = leader.moving ? Math.sin(performance.now() / 120) * 0.025 : 0;
    camera.position.set(leader.x, leader.y + EYE + bob, leader.z);
    camera.rotation.set(leader.pitch, leader.yaw, 0, "YXZ");

    // Within reach: a fight, or a villager in front.
    if (fightRef.current && Math.hypot(fightRef.current.x - leader.x, fightRef.current.z - leader.z) < 3.2) {
      setLeaderPrompt({ kind: "fight" });
      return;
    }
    let best: { index: number; d: number } | null = null;
    grabStore.walkers.forEach((w, index) => {
      if (w.child || w.held || w.hunting || (w.goneUntil ?? 0) > performance.now()) return;
      const vx = w.x - leader.x;
      const vz = w.z - leader.z;
      const d = Math.hypot(vx, vz);
      if (d > REACH || d < 1e-3) return;
      // In front of us, not behind.
      if ((vx * fx + vz * fz) / d < 0.35) return;
      if (!best || d < best.d) best = { index, d };
    });
    const found = best as { index: number; d: number } | null;
    setLeaderPrompt(found ? { kind: "talk", index: found.index, name: villagerName(found.index) } : null);
  });

  // In the build view the chief stands on the map, crowned, so you can find them.
  const body = useRef<Agent[]>([]);
  useFrame(() => {
    body.current = active
      ? []
      : [{ x: leader.x, y: leader.y, z: leader.z, heading: leader.yaw + Math.PI, moving: leader.moving, scale: 1.55, tunic: "#7c3aed", skin: "#e0ac69", hair: "#2b1b10", phase: 0, crown: true }];
  });
  return <Figures agents={body} max={1} />;
}
