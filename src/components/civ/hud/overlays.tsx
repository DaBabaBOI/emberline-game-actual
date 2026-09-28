"use client";

import Link from "next/link";
import { ERAS, formatYear, TUTORIAL } from "@/game/content";
import { clearSave, defenseStrength, hasLitFire, NO_FIRE_PENALTY } from "@/game/engine";
import { useGame } from "@/components/civ/game-provider";
import { PixelIcon } from "@/components/civ/pixel-icon";

export function TutorialPanel() {
  const { state, dispatch } = useGame();
  const step = TUTORIAL[state.tutorialStep];
  if (!step) return null;
  return (
    <div className="pixel-panel pointer-events-auto absolute left-16 top-20 max-w-xs p-3 text-sm">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="font-pixel flex items-center gap-2 text-base font-semibold">
          <PixelIcon name="elder" size={28} />
          Elder Ama
        </span>
        <span className="text-[11px] text-amber-800/70">
          {state.tutorialStep + 1}/{TUTORIAL.length}
        </span>
      </div>
      <p>{step.text}</p>
      <button
        type="button"
        onClick={() => dispatch({ type: "skipTutorial" })}
        className="mt-2 text-xs text-stone-500 underline"
      >
        Skip tutorial
      </button>
    </div>
  );
}

export function EventModal() {
  const { state, dispatch } = useGame();
  if (!state.event) return null;
  const { event } = state;
  return (
    <div className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center bg-black/30">
      <div className="pixel-panel w-[min(92vw,380px)] p-5">
        <PixelIcon name={event.icon} size={48} className="mb-2" />
        <h3 className="font-pixel text-xl font-bold">{event.title}</h3>
        <p className="mb-4 text-sm text-stone-700">{event.body}</p>
        <div className="flex flex-col gap-2">
          {event.choices.map((c, i) => (
            <button
              key={c.label}
              type="button"
              onClick={() => dispatch({ type: "resolveEvent", choice: i })}
              className="pixel-btn bg-[#8a6a3d] px-3 py-2 text-left text-sm font-medium text-white hover:bg-[#735630]"
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function GameOver({ onRestart }: { onRestart: () => void }) {
  const { state } = useGame();
  if (state.phase !== "gameover") return null;
  return (
    <div className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center bg-black/60">
      <div className="pixel-panel w-[min(92vw,400px)] p-6 text-center">
        <PixelIcon name="skull" size={64} className="mx-auto mb-2" />
        <h2 className="font-pixel text-3xl font-bold">Famine</h2>
        <p className="mt-2 text-sm text-stone-600">
          Your people ran out of food in {formatYear(state.year)}. They built{" "}
          {state.tiles.filter((t) => t.building).length} structures and made{" "}
          {state.researched.length - 1} discoveries.
        </p>
        <div className="mt-5 flex justify-center gap-2">
          <button
            type="button"
            onClick={() => {
              clearSave();
              onRestart();
            }}
            className="pixel-btn bg-amber-400 px-4 py-2 font-semibold text-[#2b2119]"
          >
            New game
          </button>
          <Link href="/" className="pixel-btn bg-white px-4 py-2">
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export function Toasts() {
  const { state } = useGame();
  return (
    <div className="pointer-events-none absolute right-16 top-20 flex w-64 flex-col items-end gap-1">
      {state.log.slice(0, 3).map((line, i) => (
        <div
          key={`${line}-${i}`}
          className="pixel-panel-dark font-pixel px-2.5 py-1 text-xs"
          style={{ opacity: 1 - i * 0.3 }}
        >
          {line}
        </div>
      ))}
    </div>
  );
}

export function RaidBanner() {
  const { state } = useGame();
  if (!state.raid) return null;
  const defense = defenseStrength(state);
  const safe = defense >= state.raid.strength;
  const eta = Math.max(0, state.raid.arriveTick - state.tick);
  return (
    <div className="pointer-events-none absolute inset-x-0 top-20 flex justify-center">
      <div
        className={
          "font-pixel flex items-center gap-2 border-[3px] border-[#140e0a] px-4 py-2 text-sm font-semibold text-white " +
          (safe ? "bg-emerald-700/85" : "animate-pulse bg-red-700/90")
        }
      >
        <PixelIcon name="warning" size={18} />
        {state.raid.strength} raiders arriving in {eta}s · Your defense: {defense}
        {safe ? " (you can hold them)" : " (train more warriors!)"}
      </div>
    </div>
  );
}

export function NoFireWarning() {
  const { state } = useGame();
  if (hasLitFire(state)) return null;
  const noCampfire = !state.tiles.some((t) => t.building === "campfire");
  return (
    <div className="pixel-panel-dark font-pixel pointer-events-none absolute bottom-28 left-3 flex max-w-60 items-center gap-2 px-2.5 py-1.5 text-xs">
      <PixelIcon name="flame" size={20} />
      <span>
        {noCampfire ? "No campfire!" : "The fire is out: no wood!"} Your people are cold.{" "}
        <span className="text-red-300">−{NO_FIRE_PENALTY} happiness</span>
      </span>
    </div>
  );
}

export function DevPanel() {
  const { state, dispatch } = useGame();
  if (!state.dev) return null;
  return (
    <div className="pixel-panel-dark font-pixel pointer-events-auto absolute left-16 top-20 flex max-w-xs flex-col gap-1.5 p-2 text-xs">
      <span className="text-amber-300">Dev mode</span>
      <div className="flex gap-1">
        <button type="button" className="pixel-btn bg-[#4a3b2e] px-2 py-1" onClick={() => dispatch({ type: "devGrant" })}>
          +500 all
        </button>
        <button type="button" className="pixel-btn bg-[#4a3b2e] px-2 py-1" onClick={() => dispatch({ type: "devReveal" })}>
          Reveal map
        </button>
      </div>
      <div className="flex flex-wrap gap-1">
        {ERAS.map((era, i) => (
          <button
            key={era.name}
            type="button"
            onClick={() => dispatch({ type: "devEra", era: i })}
            className={"pixel-btn px-2 py-1 " + (state.era === i ? "bg-amber-400 text-[#2b2119]" : "bg-[#4a3b2e]")}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  );
}
