"use client";

import { useEffect, useState } from "react";
import { TICK_SECONDS } from "@/game/content";
import type { GameState } from "@/game/types";
import { useGame } from "@/components/civ/game-provider";

// Game time only moves every tick (1.5 s), so a plain countdown would jump
// 30, 29, 27, 26... This one keeps counting between ticks so every second shows.
export function Countdown({ ticks }: { ticks: number }) {
  const { state } = useGame();
  return <CountdownFor ticks={ticks} state={state} />;
}

// For places without the game context (inside the 3D scene): pass state in.
export function CountdownFor({ ticks, state }: { ticks: number; state: GameState }) {
  const running = state.phase === "playing" && state.speed > 0 && !state.event;
  const [since, setSince] = useState({ tick: state.tick, secs: 0 });
  useEffect(() => {
    if (!running) return;
    const start = performance.now();
    const id = setInterval(() => {
      const secs = Math.min(TICK_SECONDS, ((performance.now() - start) / 1000) * state.speed);
      setSince({ tick: state.tick, secs });
    }, 100);
    return () => clearInterval(id);
  }, [state.tick, state.speed, running]);
  const elapsed = running && since.tick === state.tick ? since.secs : 0;
  return <>{Math.max(0, Math.ceil(ticks * TICK_SECONDS - elapsed))}</>;
}
