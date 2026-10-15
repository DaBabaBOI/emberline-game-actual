"use client";

import { CommandBattle } from "./hud/command-battle";
import { AskAma } from "./hud/ask-ama";
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
import { Debrief, GoalLine, LastIntro, LastTutorialPanel, NextEraPrompt } from "./hud/debrief";
import { DiscoveryScene } from "./hud/discovery-scene";
import { FinalEnding } from "./hud/final-ending";
import { NameEggCard } from "./hud/name-egg-card";
import { StoryPanel, StoryScene } from "./hud/story";
import { LeaderHud } from "./hud/leader-hud";
import { resetLeader, useLeader } from "./world/leader";
import { Letterbox, useShot } from "./hud/letterbox";
import { HintPanel } from "./hud/hints";
import { GameAudio } from "./hud/game-audio";
import { setMusicScene, unlockAudio } from "@/lib/audio";
import { KingdomsPanel, LandmarkPicker } from "./hud/medieval";
import { SpacePanel } from "./hud/future";
import { BattleBar, BattleCamera } from "./hud/battle-camera";
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
  const { panel, setSelected, state } = useGame();
  const leaderView = useLeader().view;
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
        {/* Everything that pops up lives in one column on the left, most
            important first, so panels queue up instead of drawing over each
            other: what needs you now (raiders, disasters), Elder Ama's guided
            steps, choices waiting, serious warnings, the goal, other warnings,
            her tips, then the latest news. It starts under the top bar and
            ends above the bottom bar (scrolling if it must). With the
            Advancements tree open it moves aside, out of the tree's way. */}
        <div
          ref={stack}
          style={treeOpen ? spot : { top: "calc(var(--hud-top, 6rem) + 0.5rem)", maxHeight: "calc(100dvh - var(--hud-top, 6rem) - var(--hud-bottom, 10rem) - 1rem)" }}
          className={cn(
            "absolute flex flex-col gap-2 overflow-y-auto md:right-auto md:w-80 xl:w-96",
            compact ? "left-2 right-2 md:left-3" : "left-11 right-11 md:left-16",
            treeOpen && "bottom-[var(--spot-bottom)] top-[var(--spot-top)] max-h-[var(--spot-max)] md:left-auto md:right-6",
          )}
          data-testid="hud-stack"
        >
          {/* 1. What needs you now. */}
          <RaidBanner />
          {/* 2. Elder Ama's guided steps (above the tutorial's dimmed overlay,
              so what she is waiting for can always be read). */}
          <div ref={elder} className="relative z-[26] flex flex-col gap-2 empty:hidden">
            <TutorialPanel />
            <LastTutorialPanel />
            <CoachPanel />
            <ElderLesson />
          </div>
          {/* 3. Choices waiting. */}
          <NextEraPrompt />
          <LandmarkPicker />
          {/* 4. Serious warnings (famine, collapse...). */}
          <Warnings only="severe" />
          {/* 5. Where we're going. */}
          <StoryPanel />
          <GoalLine />
          {/* 6. Other warnings. */}
          <Warnings only="mild" />
          {/* 7. Elder Ama's tips (a speedrun goes without her). */}
          {!state.speedrun && (
            <div className="relative z-[26] flex flex-col gap-2 empty:hidden">
              <HintPanel />
              <AskAma />
            </div>
          )}
          {/* 8. The latest news, and the others in a match. */}
          <Toasts />
          {match && <MultiplayerPanel match={match} />}
          <DevPanel />
        </div>
        {/* Leader mode: building happens in the build view. */}
        {leaderView !== "fp" && <BottomBar />}
        {panel === "tree" && <TreeOverlay />}
        {panel === "kingdoms" && <KingdomsPanel />}
        {panel === "space" && <SpacePanel />}
        <GuideOverlay />
        <EventModal />
        <DiscoveryScene />
        <Debrief onRestart={onRestart} />
      </div>
      <FinalEnding />
      <CommandBattle />
      <NameEggCard />
      <LeaderHud />
      <StoryScene />
      <Letterbox />
      <BattleCamera />
      <BattleBar />
      <LastIntro />
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

// The last name egg a new game used (see NAME_EGGS), kept in this browser.
const LAST_EGG = "emberline-last-name-egg";
function readLastEgg(): string | null {
  try {
    return localStorage.getItem(LAST_EGG);
  } catch {
    return null;
  }
}
function writeLastEgg(id: string | null) {
  try {
    if (id) localStorage.setItem(LAST_EGG, id);
    else localStorage.removeItem(LAST_EGG);
  } catch {
    // Private mode: no memory, so no curse either.
  }
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
        onContinue={() => {
          resetLeader(saved?.leader ? "fp" : "map");
          setGame(saved);
        }}
        onLoadCloud={(state) => {
          resetLeader(state.leader ? "fp" : "map");
          setGame(state);
        }}
        onStart={(culture: CultureId, difficulty: DifficultyId, options?: NewGameOptions) => {
          clearSave();
          // Story mode tells its own beginning.
          setIntro(!options?.dev && options?.mode !== "last" && !options?.story);
          // Leader mode starts in first person, beside the fire; any other game on the map.
          resetLeader(options?.leader ? "fp" : "map");
          // Name eggs: the same one twice in a row and the second game is cursed.
          const last = readLastEgg();
          const game = newGame(culture, difficulty, { ...options, lastNameEgg: last });
          writeLastEgg(game.nameEgg && !game.nameEgg.cursed ? game.nameEgg.id : null);
          setGame(game);
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
      const box = stack.current?.getBoundingClientRect();
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
