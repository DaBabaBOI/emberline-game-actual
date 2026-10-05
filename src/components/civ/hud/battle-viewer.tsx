"use client";

import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Figures, HAIRS, SKINS, type Agent } from "@/components/civ/world/figures";
import { fightResult, type Fight } from "@/lib/multiplayer";
import { PixelIcon } from "@/components/civ/pixel-icon";

// Watching a raid between two players (or a player and a bot) in multiplayer.
// The real fight happens in the defender's game; this shows the two sides
// charge and clash, and plays out the result as soon as it arrives. It always
// fights for at least `MIN_FIGHT` seconds so there is something to see.
const MIN_FIGHT = 6;
const MAX_SHOWN = 12;

function makeSide(n: number, side: 1 | -1, tunic: string): Agent[] {
  return Array.from({ length: n }, (_, i) => {
    const row = Math.floor(i / 4);
    const col = i % 4;
    return {
      x: side * (2.4 + row * 0.35),
      y: 0.25,
      z: (col - 1.5) * 0.42 + (row % 2) * 0.2,
      heading: side === 1 ? -Math.PI / 2 : Math.PI / 2,
      moving: false,
      scale: 1.6,
      tunic,
      skin: SKINS[(i * 3 + (side === 1 ? 1 : 0)) % SKINS.length],
      hair: HAIRS[(i * 2) % HAIRS.length],
      phase: i * 1.3,
      fallen: 0,
    };
  });
}

function Battle({ fight }: { fight: Fight }) {
  // When the fight was decided (seconds into the scene).
  const doneAt = useRef<number | null>(null);
  const raiders = Math.max(1, Math.min(MAX_SHOWN, fight.raiders));
  const warriors = Math.min(MAX_SHOWN, fight.warriors);
  const att = useRef<Agent[]>(makeSide(raiders, 1, "#8a2b22"));
  const def = useRef<Agent[]>(makeSide(warriors, -1, "#2b4f8a"));
  // When each figure falls (seconds into the fight), decided once.
  const fallAt = useRef(new Map<Agent, number>());

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime;
    const over = fight.held !== undefined || fight.avoided;
    if (over && doneAt.current === null && t >= MIN_FIGHT) doneAt.current = t;
    const end = doneAt.current;
    for (const [list, side] of [
      [att.current, 1],
      [def.current, -1],
    ] as const) {
      const lost = end !== null && !fight.avoided && (side === 1 ? fight.held : !fight.held);
      list.forEach((a, i) => {
        // Charge to the middle, then trade blows in place.
        const front = side * (0.32 + (i % 3) * 0.12);
        const charging = Math.abs(a.x - front) > 0.05 && !fight.avoided;
        if (charging && (a.fallen ?? 0) === 0) {
          a.x += Math.sign(front - a.x) * Math.min(Math.abs(front - a.x), delta * 1.6);
          a.moving = true;
        } else {
          a.moving = !fight.avoided && end === null && Math.sin(t * 3 + a.phase) > 0.2;
        }
        // A few fall during the fight; most of the losing side at the end,
        // and the rest of them run.
        if (!fallAt.current.has(a)) fallAt.current.set(a, 2.5 + ((i * 7 + (side === 1 ? 3 : 0)) % 10) * 0.6);
        const falls = !fight.avoided && (t > fallAt.current.get(a)! && i % 4 === 0 ? true : lost && end !== null && i % 5 !== 4);
        if (falls) a.fallen = Math.min(1, (a.fallen ?? 0) + delta * 2.5);
        else if (lost && end !== null) {
          a.heading = side === 1 ? Math.PI / 2 : -Math.PI / 2;
          a.x += side * delta * 1.4;
          a.moving = true;
        }
      });
    }
  });

  return (
    <>
      <Figures agents={att} max={MAX_SHOWN} weapon="club" colorKey={`a${raiders}`} />
      <Figures agents={def} max={MAX_SHOWN} weapon="spear" colorKey={`d${warriors}`} />
    </>
  );
}

export function BattleViewer({ fight, mySeat, onClose }: { fight: Fight; mySeat: number; onClose: () => void }) {
  // Don't give the result away before the fight has played out.
  const [ripe, setRipe] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setRipe(true), MIN_FIGHT * 1000);
    return () => clearTimeout(id);
  }, []);
  const finished = (fight.held !== undefined || fight.avoided) && ripe;
  const title = `${fight.attSeat === mySeat ? "Your" : `${fight.att}'s`} raid on ${fight.defSeat === mySeat ? "you" : fight.def}`;
  return (
    <div className="pointer-events-auto fixed inset-0 z-[45] flex items-center justify-center bg-black/55 p-2" data-testid="battle-viewer">
      <div className="pixel-panel-dark font-pixel flex w-[min(96vw,640px)] flex-col text-white">
        <div className="flex items-center justify-between gap-2 px-3 py-2">
          <span className="flex items-center gap-2 text-sm font-semibold md:text-base">
            <PixelIcon name="sword" size={20} />
            {title}
          </span>
          <button type="button" onClick={onClose} className="pixel-btn bg-[#4a3b2e] px-2 py-0.5 text-xs" data-testid="battle-viewer-exit">
            {finished ? "Close" : "Exit"}
          </button>
        </div>
        <div className="h-56 border-y-[3px] border-[#140e0a] md:h-72">
          <Canvas camera={{ position: [0, 2.1, 3.7], fov: 42 }} dpr={[1, 1.5]}>
            <color attach="background" args={["#8fc7e8"]} />
            <hemisphereLight args={["#fff6e0", "#3d5a2a", 0.9]} />
            <directionalLight position={[3, 6, 2]} intensity={1.4} />
            <mesh position={[0, 0, 0]}>
              <cylinderGeometry args={[3.6, 3.6, 0.5, 6]} />
              <meshStandardMaterial color="#6fae4f" flatShading />
            </mesh>
            <mesh position={[0, -0.3, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[40, 40]} />
              <meshStandardMaterial color="#2f74a8" />
            </mesh>
            <Battle fight={fight} />
          </Canvas>
        </div>
        <div className="flex items-center justify-between gap-2 px-3 py-2 text-xs md:text-sm">
          <span>
            <span className="text-red-300">{fight.raiders} raiders</span> against <span className="text-sky-300">{fight.warriors} warriors</span>
          </span>
          <span className="text-amber-200" data-testid="battle-viewer-status">
            {finished ? fightResult(fight, mySeat) : "Fighting..."}
          </span>
        </div>
      </div>
    </div>
  );
}
