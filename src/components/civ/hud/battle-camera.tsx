"use client";

import { useEffect, useRef } from "react";
import { useGame } from "@/components/civ/game-provider";
import { currentShot, endShot, playShot } from "./letterbox";

// When our warriors start fighting, the camera goes in close over the field
// (a "battle" shot, with the black bars) and comes back a few seconds after the
// fight is decided. A click or a key leaves it at any time.
export function BattleCamera() {
  const { state } = useGame();
  const raid = state.raid;
  const fighting = raid?.fightStart !== undefined ? raid : null;
  const started = useRef<number | null>(null);

  useEffect(() => {
    // Leader mode: the chief is there in person, no need to fly the camera in.
    if (state.leader) return;
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
    playShot({ kind: "battle", title: who, subtitle: "Click to leave the fight", seconds: 600, at: { x: tile.x, z: tile.z, y: tile.height } });
  }, [fighting, state.tiles, state.leader]);

  // The fight is over (the raid is gone): back to the village after a moment.
  useEffect(() => {
    if (fighting || started.current === null) return;
    const id = setTimeout(() => {
      if (currentShot()?.kind === "battle") endShot();
    }, 3000);
    return () => clearTimeout(id);
  }, [fighting]);

  return null;
}
