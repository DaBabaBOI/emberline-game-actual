"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { clearSave, loadGame, newGame, type NewGameOptions } from "@/game/engine";
import type { CultureId, DifficultyId, GameState } from "@/game/types";
import { GameProvider, useGame } from "./game-provider";
import { TitleScreen } from "./title-screen";
import { TopBar } from "./hud/top-bar";
import { SideMeters } from "./hud/side-meters";
import { BottomBar } from "./hud/bottom-bar";
import { TreeOverlay } from "./hud/tree-overlay";
import { DevPanel, EventModal, GameOver, RaidBanner, Toasts, TutorialPanel, Warnings } from "./hud/overlays";

const WorldCanvas = dynamic(
  () => import("./world/world-canvas").then((m) => m.WorldCanvas),
  { ssr: false, loading: () => <div className="absolute inset-0 bg-sky-300" /> },
);

function Hud({ onRestart }: { onRestart: () => void }) {
  const { panel, setSelected } = useGame();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setSelected]);

  return (
    <div className="pointer-events-none absolute inset-0">
      <TopBar />
      <SideMeters side="left" />
      <SideMeters side="right" />
      <TutorialPanel />
      <Toasts />
      <RaidBanner />
      <Warnings />
      <DevPanel />
      <BottomBar />
      {panel === "tree" && <TreeOverlay />}
      <EventModal />
      <GameOver onRestart={onRestart} />
    </div>
  );
}

export function GameScreen() {
  const [game, setGame] = useState<GameState | null>(null);
  const [saved, setSaved] = useState<GameState | null>(() => loadGame());

  if (!game) {
    return (
      <TitleScreen
        canContinue={Boolean(saved && saved.phase === "playing")}
        onContinue={() => setGame(saved)}
        onStart={(culture: CultureId, difficulty: DifficultyId, options?: NewGameOptions) => {
          clearSave();
          setGame(newGame(culture, difficulty, options));
        }}
      />
    );
  }

  return (
    <div className="fixed inset-0 overflow-hidden bg-sky-300 select-none">
      <GameProvider key={game.seed} initial={game}>
        <div className="absolute inset-0">
          <WorldCanvas />
        </div>
        <Hud
          onRestart={() => {
            setSaved(null);
            setGame(null);
          }}
        />
      </GameProvider>
    </div>
  );
}
