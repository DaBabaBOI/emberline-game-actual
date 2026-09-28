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
import { reducer, saveGame, type Action } from "@/game/engine";
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

  useEffect(() => {
    if (state.speed === 0 || state.phase !== "playing" || panel) return;
    const id = setInterval(() => dispatch({ type: "tick" }), 1000 / state.speed);
    return () => clearInterval(id);
  }, [state.speed, state.phase, panel]);

  useEffect(() => {
    if (state.tick % 5 === 0) saveGame(state);
  }, [state]);

  return (
    <GameContext.Provider value={{ state, dispatch, selected, setSelected, panel, setPanel }}>
      {children}
    </GameContext.Provider>
  );
}
