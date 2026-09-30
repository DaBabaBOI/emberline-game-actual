"use client";

import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useState,
  type Dispatch,
  type ReactNode,
} from "react";
import { TUTORIAL } from "@/game/content";
import { reducer, saveGame, tickSeconds, type Action } from "@/game/engine";
import { guideFor } from "./guide";
import type { GameState } from "@/game/types";

interface GameContextValue {
  state: GameState;
  dispatch: Dispatch<Action>;
  selected: string | null;
  setSelected: (id: string | null) => void;
  panel: "tree" | null;
  setPanel: (panel: "tree" | null) => void;
}

const GameContext = createContext<GameContextValue | null>(null);

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used inside GameProvider");
  return ctx;
}

export function GameProvider({
  initial,
  children,
}: {
  initial: GameState;
  children: ReactNode;
}) {
  const [state, dispatch] = useReducer(reducer, initial);
  const [selected, setSelected] = useState<string | null>(null);
  const [panel, setPanel] = useState<"tree" | null>(null);

  // Time stands still while the tutorial hand is guiding: the starting resources
  // cover every step exactly, so nothing should be eaten or burned meanwhile.
  // It only runs if the player is somehow short and has to wait.
  const inTutorial = state.tutorialStep < TUTORIAL.length;
  // The same goes for Elder Ama's guided step after an advancement.
  const held =
    ((inTutorial && !state.dev) || (!inTutorial && !!state.coach)) && guideFor(state, selected, panel).waiting === null;
  // The world waits while the debrief is on screen.
  const paused = !!state.debrief;

  // First-time mode starts with a slower clock (tickSeconds).
  const perTick = tickSeconds(state);
  useEffect(() => {
    if (state.speed === 0 || state.phase !== "playing" || panel || held || paused) return;
    const id = setInterval(() => dispatch({ type: "tick" }), (perTick * 1000) / state.speed);
    return () => clearInterval(id);
  }, [state.speed, state.phase, panel, held, paused, perTick]);

  useEffect(() => {
    // Save every few ticks, and always the moment the game ends, so a lost game
    // can never be "continued" from a save made a few seconds earlier.
    if (state.tick % 5 === 0 || inTutorial || state.phase !== "playing") saveGame(state);
  }, [state, inTutorial]);

  return (
    <GameContext.Provider value={{ state, dispatch, selected, setSelected, panel, setPanel }}>
      {children}
    </GameContext.Provider>
  );
}
