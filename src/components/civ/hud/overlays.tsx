"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ERAS, formatYear, TUTORIAL } from "@/game/content";
import { clearSave, defenseStrength, secs, warnings } from "@/game/engine";
import { useGame } from "@/components/civ/game-provider";
import { PixelIcon } from "@/components/civ/pixel-icon";
import { useGuide } from "./guide-overlay";

export function TutorialPanel() {
  const { state, dispatch } = useGame();
  const { waiting } = useGuide();
  const step = TUTORIAL[state.tutorialStep];
  if (!step) return null;
  return (
    <div className="pixel-panel pointer-events-auto absolute left-16 top-20 z-[26] max-w-xs p-3 text-sm">
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
      {waiting && <p className="mt-1 text-xs italic text-amber-800">{waiting}</p>}
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
  const unrest = state.lostTo === "unrest";
  return (
    <div className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center bg-black/60">
      <div className="pixel-panel w-[min(92vw,400px)] p-6 text-center">
        <PixelIcon name={unrest ? "sad" : "skull"} size={64} className="mx-auto mb-2" />
        <h2 className="font-pixel text-3xl font-bold">{unrest ? "The tribe has left" : "Famine"}</h2>
        <p className="mt-2 text-sm text-stone-600">
          {unrest
            ? `Your people were too unhappy for too long and wandered away in ${formatYear(state.year)}.`
            : `Your people ran out of food in ${formatYear(state.year)}.`}{" "}
          They built{" "}
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

const TOAST_MS = 5000;
const MAX_TOASTS = 2;

// New log lines pop up briefly (at most two at a time) and then fade away,
// so the screen never fills with messages.
export function Toasts() {
  const { state } = useGame();
  const [toasts, setToasts] = useState<{ id: number; text: string }[]>([]);
  const seen = useRef(state.log);
  const nextId = useRef(0);

  useEffect(() => {
    const prev = seen.current;
    seen.current = state.log;
    if (state.log === prev) return;
    // New lines are added to the front; find where the old log starts.
    let fresh = state.log.length;
    for (let k = 0; k < state.log.length; k++) {
      if (state.log[k] === prev[0] && state.log[k + 1] === prev[1]) {
        fresh = k;
        break;
      }
    }
    const added = state.log.slice(0, Math.min(fresh, MAX_TOASTS)).reverse();
    if (!added.length) return;
    const ids = added.map(() => nextId.current++);
    const show = setTimeout(() => {
      setToasts((list) =>
        [...added.map((text, i) => ({ id: ids[i], text })).reverse(), ...list].slice(0, MAX_TOASTS),
      );
    }, 0);
    // The hide timer is left running on purpose, even if the log changes again.
    setTimeout(() => {
      setToasts((list) => list.filter((t) => !ids.includes(t.id)));
    }, TOAST_MS);
    return () => clearTimeout(show);
  }, [state.log]);

  return (
    <div className="pointer-events-none absolute right-16 top-20 flex w-64 flex-col items-end gap-1">
      {toasts.map((t, i) => (
        <div
          key={t.id}
          className="pixel-panel-dark font-pixel px-2.5 py-1 text-xs"
          style={{ opacity: 1 - i * 0.35 }}
        >
          {t.text}
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
        {state.raid.strength} raiders arriving in {secs(eta)}s · Your defense: {defense}
        {safe ? " (you can hold them)" : " (train more warriors!)"}
      </div>
    </div>
  );
}

// Only the most urgent warning is shown; the rest wait behind a "+N more" button.
export function Warnings() {
  const { state } = useGame();
  const [open, setOpen] = useState(false);
  const list = [...warnings(state)].sort((a, b) => Number(b.severe) - Number(a.severe));
  if (list.length === 0) return null;
  const shown = open ? list : list.slice(0, 1);
  return (
    <div className="pointer-events-none absolute bottom-32 left-3 flex max-w-72 flex-col gap-1.5">
      {shown.map((w) => (
        <div
          key={w.id}
          className={
            "pixel-panel-dark font-pixel flex items-center gap-2 px-2.5 py-1.5 text-xs " +
            (w.severe ? "!border-red-700" : "")
          }
        >
          <PixelIcon name={w.icon} size={20} />
          <span>{w.text}</span>
        </div>
      ))}
      {list.length > 1 && (
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="pixel-btn font-pixel pointer-events-auto self-start bg-[#4a3b2e] px-2 py-0.5 text-[11px] text-white"
        >
          {open ? "Show less" : `+${list.length - 1} more`}
        </button>
      )}
    </div>
  );
}

export function DevPanel() {
  const { state, dispatch } = useGame();
  if (!state.dev) return null;
  return (
    <div className="pixel-panel-dark font-pixel pointer-events-auto absolute left-16 top-20 flex max-w-xs flex-col gap-1.5 p-2 text-xs">
      <span className="text-amber-300">Dev mode</span>
      <div className="flex max-w-xs flex-wrap gap-1">
        <button type="button" className="pixel-btn bg-[#4a3b2e] px-2 py-1" onClick={() => dispatch({ type: "devGrant" })}>
          +500 all
        </button>
        <button type="button" className="pixel-btn bg-[#4a3b2e] px-2 py-1" onClick={() => dispatch({ type: "devReveal" })}>
          Reveal map
        </button>
        <button type="button" className="pixel-btn bg-[#4a3b2e] px-2 py-1" onClick={() => dispatch({ type: "devEvent", id: "wildfire" })}>
          Wildfire
        </button>
        <button type="button" className="pixel-btn bg-[#4a3b2e] px-2 py-1" onClick={() => dispatch({ type: "devPeople" })}>
          +10 people
        </button>
        <button type="button" className="pixel-btn bg-[#4a3b2e] px-2 py-1" onClick={() => dispatch({ type: "devFiresOut" })}>
          Fires out
        </button>
        <button type="button" className="pixel-btn bg-[#4a3b2e] px-2 py-1" onClick={() => dispatch({ type: "devOutbreak" })}>
          Outbreak
        </button>
        <button type="button" className="pixel-btn bg-[#4a3b2e] px-2 py-1" onClick={() => dispatch({ type: "devRaid" })}>
          Raid now
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
