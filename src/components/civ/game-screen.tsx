"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { clearSave, loadGame, newGame, type NewGameOptions } from "@/game/engine";
import type { CultureId, DifficultyId, GameState } from "@/game/types";
import { cn } from "@/lib/utils";
import { GameProvider, useGame } from "./game-provider";
import { TitleScreen } from "./title-screen";
import { IntroStory } from "./intro-story";
import { TopBar } from "./hud/top-bar";
import { SideMeters } from "./hud/side-meters";
import { BottomBar } from "./hud/bottom-bar";
import { TreeOverlay } from "./hud/tree-overlay";
import { GuideOverlay } from "./hud/guide-overlay";
import { Debrief, GoalLine, NextEraPrompt } from "./hud/debrief";
import {
  DevPanel,
  ElderLesson,
  EventModal,
  RaidBanner,
  Toasts,
  TutorialPanel,
  CoachPanel,
  Warnings,
} from "./hud/overlays";

const WorldCanvas = dynamic(
  () => import("./world/world-canvas").then((m) => m.WorldCanvas),
  { ssr: false, loading: () => <div className="absolute inset-0 bg-sky-300" /> },
);

function Hud({ onRestart }: { onRestart: () => void }) {
  const { panel, setSelected } = useGame();
  // The Advancements tree fills the screen: Elder Ama steps down to the corner.
  const treeOpen = panel === "tree";

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
      {/* Everything that pops up under the top bar lives in stacks, so panels
          queue up instead of drawing over each other. Wide screens get three
          columns (panels left, notices centre, messages right); smaller
          screens get one column. */}
      <div
        className={cn(
          "absolute left-11 right-11 top-24 flex max-h-[calc(100dvh-22rem)] flex-col gap-2 overflow-y-auto md:left-16 md:right-auto md:top-20 md:max-h-[calc(100dvh-17rem)] md:w-80 lg:contents",
          treeOpen && "bottom-10 top-auto md:left-auto md:right-6 md:top-auto",
        )}
      >
        <div className="flex flex-col items-center gap-2 lg:absolute lg:left-[25rem] lg:right-[21rem] lg:top-20">
          <GoalLine />
          <NextEraPrompt />
          <RaidBanner />
        </div>
        <div
          className={cn(
            "flex flex-col gap-2 lg:absolute lg:left-16 lg:top-20 lg:max-h-[calc(100dvh-16rem)] lg:w-80 lg:overflow-y-auto",
            treeOpen && "lg:bottom-12 lg:left-auto lg:right-8 lg:top-auto",
          )}
        >
          <DevPanel />
          <TutorialPanel />
          <CoachPanel />
          <ElderLesson />
        </div>
        <div className="flex flex-col items-end lg:absolute lg:right-16 lg:top-20 lg:w-64">
          <Toasts />
        </div>
      </div>
      <Warnings />
      <BottomBar />
      {panel === "tree" && <TreeOverlay />}
      <GuideOverlay />
      <EventModal />
      <Debrief onRestart={onRestart} />
    </div>
  );
}

export function GameScreen() {
  const [game, setGame] = useState<GameState | null>(null);
  const [saved, setSaved] = useState<GameState | null>(() => loadGame());
  // A new game opens with a short story (not when continuing, and not in dev starts).
  const [intro, setIntro] = useState(false);

  if (game && intro) {
    return <IntroStory nation={game.nation ?? "The Emberfolk"} onBegin={() => setIntro(false)} />;
  }

  if (!game) {
    return (
      <TitleScreen
        canContinue={Boolean(saved && saved.phase === "playing")}
        onContinue={() => setGame(saved)}
        onStart={(culture: CultureId, difficulty: DifficultyId, options?: NewGameOptions) => {
          clearSave();
          setIntro(!options?.dev);
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
