"use client";

import { useEffect, useRef } from "react";
import { useGame } from "@/components/civ/game-provider";
import { defenseStrength } from "@/game/engine";
import { currentShot, endShot, playShot, useShot } from "./letterbox";
import { useLeader } from "@/components/civ/world/leader";

// When our warriors start fighting, the camera goes in close over the field
// (a "battle" shot, with the black bars) and comes back a few seconds after the
// fight is decided. A click or a key leaves it at any time.
export function BattleCamera() {
  const { state } = useGame();
  const raid = state.raid;
  const fighting = raid?.fightStart !== undefined ? raid : null;
  const started = useRef<number | null>(null);
  const walking = useLeader().view === "fp";

  useEffect(() => {
    // Walking in first person: you're there in person, no need to fly the camera in.
    if (walking) return;
    if (!fighting || started.current === fighting.fightStart) return;
    started.current = fighting.fightStart!;
    const tile = state.tiles[fighting.meetTile ?? fighting.targetTile];
    if (!tile) return;
    const who = fighting.roman
      ? "The Roman legion"
      : fighting.rival
        ? `Raiders from ${fighting.rival}`
        : fighting.kingdom
          ? "An army is attacking"
          : "Raiders are attacking";
    playShot({ kind: "battle", title: who, subtitle: "Click to leave the fight (train warriors to tip it)", seconds: 600, at: { x: tile.x, z: tile.z, y: tile.height } });
  }, [fighting, state.tiles, walking]);

  // The fight is over (the raid is gone): back to the village after a moment.
  useEffect(() => {
    if (fighting || started.current === null) return;
    const id = setTimeout(() => {
      if (currentShot()?.kind === "battle") endShot();
    }, 4500);
    return () => clearTimeout(id);
  }, [fighting]);

  return null;
}

// Over the battle shot: how the fight stands (our side against theirs, a tug of
// war you can still tip by training warriors), then how it ended.
export function BattleBar() {
  const { state } = useGame();
  const shot = useShot();
  if (shot?.kind !== "battle") return null;
  const raid = state.raid;
  const live = raid && !raid.roman && raid.fightStart !== undefined ? raid : null;
  const done = !raid && state.battle && state.tick - state.battle.tick < 4 ? state.battle : null;
  if (!live && !done) return null;
  if (done)
    return (
      <div className="pointer-events-none fixed inset-x-0 top-[22vh] z-[61] flex justify-center px-3" data-testid="battle-result">
        <div className="battle-result font-pixel text-center drop-shadow-[0_3px_0_rgba(0,0,0,0.7)]">
          <div className={`text-4xl font-bold md:text-6xl ${done.won ? "text-amber-300" : "text-red-400"}`}>{done.won ? "Raiders driven off!" : "The raiders broke through"}</div>
          <div className="mt-1 text-sm text-white md:text-lg">
            {done.warriorsLost} warrior{done.warriorsLost === 1 ? "" : "s"} fell · {done.raidersLost} raider{done.raidersLost === 1 ? "" : "s"} fell
          </div>
        </div>
      </div>
    );
  const defense = defenseStrength(state);
  const share = Math.round((100 * defense) / Math.max(1, defense + live!.strength));
  const holding = defense >= live!.strength;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[12.5vh] z-[61] flex justify-center px-3" data-testid="battle-bar">
      <div className="font-pixel w-[min(92vw,560px)] text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
        <div className="flex items-end justify-between text-sm md:text-base">
          <span>
            Our warriors <span className="text-sky-300">{state.soldiers}</span>
          </span>
          <span className={holding ? "text-emerald-300" : "animate-pulse text-red-300"}>{holding ? "We are holding!" : "We are losing!"}</span>
          <span>
            Raiders <span className="text-red-300">{live!.strength}</span>
          </span>
        </div>
        <div className="mt-1 flex h-3.5 w-full border-2 border-black/80 bg-black/40">
          <div className="bg-sky-500 transition-[width] duration-500" style={{ width: `${share}%` }} />
          <div className="flex-1 bg-red-600" />
        </div>
        <div className="mt-0.5 flex justify-between text-[11px] text-white/80">
          <span>Defense {defense}</span>
          <span>Strength {live!.strength}</span>
        </div>
      </div>
    </div>
  );
}
