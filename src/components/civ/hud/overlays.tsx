"use client";

import Link from "next/link";
import { formatYear, TUTORIAL } from "@/game/content";
import { clearSave, defenseStrength } from "@/game/engine";
import { useGame } from "@/components/civ/game-provider";

export function TutorialPanel() {
  const { state, dispatch } = useGame();
  const step = TUTORIAL[state.tutorialStep];
  if (!step) return null;
  return (
    <div className="pointer-events-auto absolute left-16 top-20 max-w-xs rounded-2xl bg-amber-50/95 p-3 text-sm text-amber-950 shadow-xl ring-1 ring-amber-900/10">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="font-semibold">🧓 Elder Ama</span>
        <span className="text-[11px] text-amber-800/70">
          {state.tutorialStep + 1}/{TUTORIAL.length}
        </span>
      </div>
      <p>{step.text}</p>
      <button
        type="button"
        onClick={() => dispatch({ type: "skipTutorial" })}
        className="mt-2 text-xs text-amber-800/80 underline"
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
      <div className="w-[min(92vw,380px)] rounded-2xl bg-[#f6ecd6] p-5 text-stone-900 shadow-2xl ring-4 ring-[#8a6a3d]/40">
        <div className="mb-2 text-4xl">{event.icon}</div>
        <h3 className="text-lg font-bold">{event.title}</h3>
        <p className="mb-4 text-sm text-stone-700">{event.body}</p>
        <div className="flex flex-col gap-2">
          {event.choices.map((c, i) => (
            <button
              key={c.label}
              type="button"
              onClick={() => dispatch({ type: "resolveEvent", choice: i })}
              className="rounded-lg bg-[#8a6a3d] px-3 py-2 text-left text-sm font-medium text-white hover:bg-[#735630]"
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
      <div className="w-[min(92vw,400px)] rounded-2xl bg-slate-900 p-6 text-center text-white shadow-2xl">
        <div className="mb-2 text-5xl">🥀</div>
        <h2 className="text-2xl font-bold">Famine</h2>
        <p className="mt-2 text-sm text-white/70">
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
            className="rounded-lg bg-amber-400 px-4 py-2 font-semibold text-slate-950"
          >
            New game
          </button>
          <Link href="/" className="rounded-lg bg-white/10 px-4 py-2">
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
          className="rounded-lg bg-slate-950/55 px-2.5 py-1 text-xs text-white backdrop-blur"
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
          "rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-lg " +
          (safe ? "bg-emerald-700/85" : "animate-pulse bg-red-700/90")
        }
      >
        ⚔️ {state.raid.strength} raiders arriving in {eta}s · Your defense: {defense}
        {safe ? " (you can hold them)" : " (train more warriors!)"}
      </div>
    </div>
  );
}
