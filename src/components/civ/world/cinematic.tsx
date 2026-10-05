"use client";

import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Vector3 } from "three";
import type { Tile } from "@/game/types";
import { prefersLessMotion } from "@/lib/graphics";
import { endShot, type Shot, useShot } from "@/components/civ/hud/letterbox";

const ease = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

interface Controls {
  enabled: boolean;
  target: Vector3;
  update: () => void;
}

// Runs inside the 3D scene: moves the camera while a shot plays, then hands it
// back exactly where the player had it (or, after the fly-in, at the usual
// starting view). Also shakes the camera briefly when a battle breaks out.
export function CinematicCamera({ home, battleTick }: { home: Tile; battleTick: number | null }) {
  const current = useShot();
  const run = useRef<{ shot: Shot; start: number; fromPos: Vector3; fromTarget: Vector3 } | null>(null);
  const shake = useRef({ until: 0, last: new Vector3() });
  const lastBattle = useRef(battleTick);

  useEffect(() => {
    if (battleTick !== null && battleTick !== lastBattle.current && !prefersLessMotion()) {
      shake.current.until = performance.now() + 700;
    }
    lastBattle.current = battleTick;
  }, [battleTick]);

  useFrame((frame) => {
    const { clock, camera } = frame;
    const controls = frame.controls as unknown as Controls | null;
    // Undo last frame's jolt first, so the shake never drifts the camera.
    camera.position.sub(shake.current.last);
    shake.current.last.set(0, 0, 0);

    if (current && (!run.current || run.current.shot !== current)) {
      run.current = {
        shot: current,
        start: clock.elapsedTime,
        fromPos: camera.position.clone(),
        fromTarget: controls ? controls.target.clone() : new Vector3(home.x, 0, home.z),
      };
      if (controls) controls.enabled = false;
    }
    const r = run.current;
    if (r && (!current || current !== r.shot)) {
      // Skipped or finished: back to where the player was.
      camera.position.copy(r.fromPos);
      if (controls) {
        controls.target.copy(r.fromTarget);
        controls.enabled = true;
        controls.update();
      }
      camera.lookAt(r.fromTarget);
      run.current = null;
    } else if (r) {
      const k = Math.min(1, (clock.elapsedTime - r.start) / r.shot.seconds);
      const centre = new Vector3(home.x, 0.6, home.z);
      if (r.shot.kind === "intro" || r.shot.kind === "era") {
        // From high over the sea, sweeping round and down to the village (the
        // fly-in at the start, and again for each new era). It ends exactly at
        // the player's view, so there is no jump.
        const e = ease(k);
        const endX = r.fromPos.x - r.fromTarget.x;
        const endZ = r.fromPos.z - r.fromTarget.z;
        const endAngle = Math.atan2(endX, endZ);
        const angle = endAngle - 1.6 * (1 - e);
        const dist = 95 + (Math.hypot(endX, endZ) - 95) * e;
        const height = 70 + (r.fromPos.y - 70) * e;
        const look = centre.clone().lerp(r.fromTarget, e);
        camera.position.set(look.x + Math.sin(angle) * dist, height, look.z + Math.cos(angle) * dist);
        camera.lookAt(look);
      } else if (r.shot.kind === "battle" && r.shot.at) {
        // In close over the fight, low, turning slowly round it. It lasts until
        // the fight is over (the game ends the shot) or the player leaves it.
        const at = r.shot.at;
        const look = new Vector3(at.x, (at.y ?? 0.4) + 0.3, at.z);
        const t = clock.elapsedTime - r.start;
        const zoom = ease(Math.min(1, t / 1.6));
        const angle = Math.atan2(r.fromPos.x - r.fromTarget.x, r.fromPos.z - r.fromTarget.z) + t * 0.12;
        const dist = 22 + (6.5 - 22) * zoom;
        const height = r.fromPos.y + (4.2 - r.fromPos.y) * zoom;
        const aim = r.fromTarget.clone().lerp(look, zoom);
        camera.position.set(aim.x + Math.sin(angle) * dist, height, aim.z + Math.cos(angle) * dist);
        camera.lookAt(aim);
      } else {
        // A slow, low turn round the village.
        const angle = k * Math.PI * 1.2;
        const dist = 22 - Math.sin(k * Math.PI) * 6;
        camera.position.set(centre.x + Math.sin(angle) * dist, 9 + Math.sin(k * Math.PI) * 3, centre.z + Math.cos(angle) * dist);
        camera.lookAt(centre);
      }
      if (k >= 1) endShot();
    }

    const left = shake.current.until - performance.now();
    if (left > 0) {
      const s = (left / 700) * 0.35;
      shake.current.last.set((Math.random() - 0.5) * s, (Math.random() - 0.5) * s * 0.6, (Math.random() - 0.5) * s);
      camera.position.add(shake.current.last);
    }
  });

  return null;
}
