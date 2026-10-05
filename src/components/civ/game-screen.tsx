"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import { clearSave, loadGame, newGame, type NewGameOptions } from "@/game/engine";
import type { CultureId, DifficultyId, GameState } from "@/game/types";
import { cn } from "@/lib/utils";
import { useCompact } from "@/lib/use-compact";
import { GameProvider, useGame } from "./game-provider";
import { TitleScreen } from "./title-screen";
import { MultiplayerLobby } from "./multiplayer-lobby";
import { MultiplayerPanel, type Match } from "./hud/mp-panel";
import { IntroStory } from "./intro-story";
import { TopBar } from "./hud/top-bar";
import { MeterStrip, SideMeters } from "./hud/side-meters";
import { BottomBar } from "./hud/bottom-bar";
import { TreeOverlay } from "./hud/tree-overlay";
import { GuideOverlay, useGuide } from "./hud/guide-overlay";
import { Debrief, GoalLine, NextEraPrompt } from "./hud/debrief";
import { DiscoveryScene } from "./hud/discovery-scene";
import { Letterbox, useShot } from "./hud/letterbox";
import { HintPanel } from "./hud/hints";
import { GameAudio } from "./hud/game-audio";
import { setMusicScene, unlockAudio } from "@/lib/audio";
import { KingdomsPanel, LandmarkPicker } from "./hud/medieval";
import { SpacePanel } from "./hud/future";
import { BattleCamera } from "./hud/battle-camera";
import {
  DevPanel,
  ElderLesson,
  EventModal,
  KonamiFireworks,
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

function Hud({ onRestart, match }: { onRestart: () => void; match: Match | null }) {
  const { panel, setSelected } = useGame();
  // The Advancements tree fills the screen: Elder Ama moves out of the way.
  const treeOpen = panel === "tree";
  const { target } = useGuide();
  const shot = useShot();
  const stack = useRef<HTMLDivElement>(null);
  const elder = useRef<HTMLDivElement>(null);
  const spot = useSpotInTree(treeOpen, stack, elder, target?.kind === "ui" ? target.ids : []);
  const compact = useCompact();
  const root = useRef<HTMLDivElement>(null);
  useHudEdges(root);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setSelected]);

  return (
    <>
      {/* During a camera shot the HUD fades away, leaving the film. */}
      {/* z-14: the screen's panels sit above markers drawn on the map (z up to 13),
          but under a building's own info panel (z 20-30). */}
      <div ref={root} className={cn("pointer-events-none absolute inset-0 z-[14] transition-opacity duration-700", shot && "invisible opacity-0")}>
        {/* Phones: the meters sit in a strip under the top bar. */}
        <TopBar>{compact && <MeterStrip />}</TopBar>
        {!compact && (
          <>
            <SideMeters side="left" />
            <SideMeters side="right" />
          </>
        )}
        {/* Everything that pops up under the top bar lives in stacks, so panels
            queue up instead of drawing over each other. Wide screens get three
            columns (panels left, notices centre, messages right); smaller
            screens get one column. */}
        <div
          ref={stack}
          // Below 1024 px the stack starts under the top bar (and the meter
          // strip) and ends above the bottom bar, however tall they are.
          style={treeOpen ? spot : { top: "calc(var(--hud-top, 6rem) + 0.5rem)", maxHeight: "calc(100dvh - var(--hud-top, 6rem) - var(--hud-bottom, 10rem) - 1rem)" }}
          className={cn(
            "absolute flex flex-col gap-2 overflow-y-auto md:right-auto md:w-80 lg:contents",
            compact ? "left-2 right-2 md:left-3" : "left-11 right-11 md:left-16",
            treeOpen && "bottom-[var(--spot-bottom)] top-[var(--spot-top)] max-h-[var(--spot-max)] md:left-auto md:right-6",
          )}
        >
          <div className="flex flex-col items-center gap-2 lg:absolute lg:left-[25rem] lg:right-[21rem] lg:top-20">
            <GoalLine />
            <NextEraPrompt />
            <LandmarkPicker />
            <RaidBanner />
          </div>
          {/* Elder Ama's panels stay above the tutorial's dimmed overlay, so what
              she is waiting for can always be read. */}
          <div
            ref={elder}
            className={cn(
              "relative z-[26] flex flex-col gap-2 lg:absolute lg:w-80 lg:overflow-y-auto",
              treeOpen
                ? "lg:bottom-[var(--spot-bottom)] lg:right-8 lg:top-[var(--spot-top)] lg:max-h-[var(--spot-max)]"
                : "lg:left-16 lg:top-20 lg:max-h-[calc(100dvh-16rem)]",
            )}
          >
            <DevPanel />
            <TutorialPanel />
            <CoachPanel />
            <ElderLesson />
          <HintPanel />
          </div>
          <div className="flex flex-col items-end gap-2 lg:absolute lg:right-16 lg:top-20 lg:w-64">
            {match && <MultiplayerPanel match={match} />}
            <Toasts />
          </div>
        </div>
        <Warnings />
        <BottomBar />
        {panel === "tree" && <TreeOverlay />}
        {panel === "kingdoms" && <KingdomsPanel />}
        {panel === "space" && <SpacePanel />}
        <GuideOverlay />
        <EventModal />
        <DiscoveryScene />
        <Debrief onRestart={onRestart} />
      </div>
      <Letterbox />
      <BattleCamera />
      <GameAudio />
      <KonamiFireworks />
    </>
  );
}

// Browsers allow sound only after a click or key press: the first one starts
// the music (the Stone Age theme on the title screen, then the game's own).
function useUnlockAudio() {
  useEffect(() => {
    setMusicScene({ playing: true, era: 0, night: 0, tension: false });
    const unlock = () => unlockAudio();
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);
}

export function GameScreen() {
  useUnlockAudio();
  const [game, setGame] = useState<GameState | null>(null);
  const [saved, setSaved] = useState<GameState | null>(() => loadGame());
  // A new game opens with a short story (not when continuing, and not in dev starts).
  const [intro, setIntro] = useState(false);
  // Multiplayer: the lobby (opened by a ?room=ABCD link too), then the match.
  const [lobby, setLobby] = useState<{ code?: string } | null>(() => {
    try {
      const code = new URLSearchParams(window.location.search).get("room");
      return code ? { code: code.toUpperCase().slice(0, 4) } : null;
    } catch {
      return null;
    }
  });
  const [match, setMatch] = useState<Match | null>(null);
  // Tell the page a game is on screen (hides the floating Settings button; the
  // same options are in the game's Menu).
  const playing = !!game && !intro;
  useEffect(() => {
    if (!playing) return;
    document.documentElement.dataset.inGame = "1";
    return () => {
      delete document.documentElement.dataset.inGame;
    };
  }, [playing]);

  if (game && intro) {
    return <IntroStory nation={game.nation ?? "The Emberfolk"} onBegin={() => setIntro(false)} />;
  }

  if (!game && lobby) {
    return (
      <MultiplayerLobby
        initialCode={lobby.code}
        onBack={() => setLobby(null)}
        onStart={(room, session, seats) => {
          if (match) return;
          setMatch({ room, session, humans: seats });
          setLobby(null);
          clearSave();
          setGame(newGame("balanced", "normal", { seed: room.seed, skipTutorial: true, nation: session.name, mp: { mode: room.mode, speed: room.speed } }));
        }}
      />
    );
  }

  if (!game) {
    return (
      <TitleScreen
        onMultiplayer={() => setLobby({})}
        canContinue={Boolean(saved && saved.phase === "playing")}
        onContinue={() => setGame(saved)}
        onLoadCloud={(state) => setGame(state)}
        onStart={(culture: CultureId, difficulty: DifficultyId, options?: NewGameOptions) => {
          clearSave();
          setIntro(!options?.dev && options?.mode !== "last");
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
          match={match}
          onRestart={() => {
            setMatch(null);
            setSaved(null);
            setGame(null);
          }}
        />
      </GameProvider>
    </div>
  );
}

// Where the top bar ends and the bottom bar begins (CSS --hud-top and
// --hud-bottom on the HUD), so the panels in between fit whatever their size.
function useHudEdges(root: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const measure = () => {
      const top = el.querySelector('[data-hud="top"]')?.getBoundingClientRect();
      const bottom = el.querySelector('[data-hud="bottom"]')?.getBoundingClientRect();
      if (top) el.style.setProperty("--hud-top", `${Math.round(top.bottom)}px`);
      if (bottom) el.style.setProperty("--hud-bottom", `${Math.round(window.innerHeight - bottom.top)}px`);
    };
    const watch = new ResizeObserver(measure);
    el.querySelectorAll("[data-hud]").forEach((n) => watch.observe(n));
    window.addEventListener("resize", measure);
    measure();
    return () => {
      watch.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [root]);
}

// With Advancements open, Elder Ama's panels sit between the tree's header and
// its details bar, so they never cover the Research button or the description:
// just above the details bar, or just under the header when what she is
// pointing at is down there. Below 1024 px the whole stack moves; above, only
// her column (the stack is `display: contents` there).
function useSpotInTree(
  open: boolean,
  stack: RefObject<HTMLDivElement | null>,
  elder: RefObject<HTMLDivElement | null>,
  targetIds: string[],
): CSSProperties | undefined {
  const [spot, setSpot] = useState<CSSProperties>();
  const ids = targetIds.join(" ");
  useEffect(() => {
    if (!open) return;
    const gap = 8;
    const place = () => {
      const area = document.querySelector("[data-tree-area]")?.getBoundingClientRect();
      const details = document.querySelector("[data-tree-details]")?.getBoundingClientRect();
      const box = (window.innerWidth >= 1024 ? elder.current : stack.current)?.getBoundingClientRect();
      if (!area || !details || !box) return;
      const room = Math.max(120, details.top - area.top - 2 * gap);
      const height = Math.min(box.height, room);
      // Where she would be, just above the details bar.
      const low = { top: details.top - gap - height, bottom: details.top - gap };
      const target = ids
        .split(" ")
        .map((id) => document.querySelector(`[data-guide="${id}"]`)?.getBoundingClientRect())
        .find((r) => r && r.width > 0);
      const inTheWay = !!target && target.left < box.right && box.left < target.right && target.top < low.bottom && low.top < target.bottom;
      const next = {
        "--spot-top": inTheWay ? `${Math.round(area.top + gap)}px` : "auto",
        "--spot-bottom": inTheWay ? "auto" : `${Math.round(window.innerHeight - details.top + gap)}px`,
        "--spot-max": `${Math.round(room)}px`,
      } as CSSProperties;
      setSpot((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
    };
    const first = requestAnimationFrame(place);
    const timer = window.setInterval(place, 250);
    window.addEventListener("resize", place);
    return () => {
      cancelAnimationFrame(first);
      window.clearInterval(timer);
      window.removeEventListener("resize", place);
    };
  }, [open, stack, elder, ids]);
  return open ? spot : undefined;
}
