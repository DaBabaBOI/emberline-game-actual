"use client";

import { useEffect, useRef, useState } from "react";
import { AFTER_STEPS, ERAS, EVENTS, LESSONS, TREE_BY_ID, TUTORIAL, TUTORIAL_FAREWELL } from "@/game/content";
import { defenseBreakdown, defenseStrength, warnings } from "@/game/engine";
import { useGame } from "@/components/civ/game-provider";
import { Countdown } from "./countdown";
import { PixelIcon } from "@/components/civ/pixel-icon";
import { useGuide } from "./guide-overlay";

export function TutorialPanel() {
  const { state, dispatch } = useGame();
  const { waiting } = useGuide();
  const step = TUTORIAL[state.tutorialStep];
  if (!step) return null;
  return (
    <div className="pixel-panel pointer-events-auto relative z-[26] w-full p-2.5 text-xs md:p-3 md:text-sm">
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

// Right after an advancement, Elder Ama explains what it unlocked and (with
// the hand) walks you through using it once. The clock waits meanwhile.
export function CoachPanel() {
  const { state, dispatch } = useGame();
  const { waiting } = useGuide();
  const step = state.coach ? AFTER_STEPS[state.coach.node] : null;
  if (!step || state.tutorialStep < TUTORIAL.length) return null;
  const guided = !!(step.build || step.upgrade);
  return (
    <div className="pixel-panel pointer-events-auto relative z-[26] w-full p-2.5 text-xs md:p-3 md:text-sm" data-testid="coach">
      <div className="mb-1 flex items-center gap-2">
        <PixelIcon name="elder" size={28} />
        <span className="font-pixel flex flex-col leading-tight">
          <span className="text-[11px] text-amber-800/80">New: {TREE_BY_ID[state.coach!.node]?.name}</span>
          <span className="text-base font-semibold">Elder Ama</span>
        </span>
      </div>
      <p>{step.text}</p>
      {waiting && <p className="mt-1 text-xs italic text-amber-800">{waiting}</p>}
      {guided ? (
        <button type="button" onClick={() => dispatch({ type: "endCoach" })} className="mt-2 text-xs text-stone-500 underline">
          Skip
        </button>
      ) : (
        <button
          type="button"
          onClick={() => dispatch({ type: "endCoach" })}
          className="pixel-btn font-pixel mt-2 bg-amber-400 px-3 py-1 text-xs font-semibold text-[#2b2119]"
        >
          Got it
        </button>
      )}
    </div>
  );
}

// Elder Ama explains the lesson behind what just happened, with its real-world
// UN target. One at a time; the game keeps running.
export function ElderLesson() {
  const { state, dispatch } = useGame();
  const farewell = state.lesson === TUTORIAL_FAREWELL.id;
  const lesson = farewell ? TUTORIAL_FAREWELL : LESSONS.find((l) => l.id === state.lesson);
  if (!lesson) return null;
  return (
    <div
      className="pixel-panel pointer-events-auto relative z-[15] w-full p-2.5 text-xs md:p-3 md:text-sm"
      data-testid="elder-lesson"
    >
      <div className="mb-1 flex items-center gap-2">
        <PixelIcon name="elder" size={28} />
        <span className="font-pixel flex flex-col leading-tight">
          <span className="text-[11px] text-amber-800/80">{farewell ? "Elder Ama" : "Elder Ama\u2019s lesson"}</span>
          <span className="text-base font-semibold">{lesson.title}</span>
        </span>
      </div>
      <p>{lesson.text}</p>
      <p className="font-pixel mt-2 flex items-start gap-1.5 border-t-2 border-stone-300 pt-1.5 text-xs text-[#1e4f9c]">
        <PixelIcon name="leaf" size={14} />
        <span>In the real world: {lesson.sdg}</span>
      </p>
      <button
        type="button"
        onClick={() => dispatch({ type: "dismissLesson" })}
        className="pixel-btn font-pixel mt-2 bg-amber-400 px-3 py-1 text-xs font-semibold text-[#2b2119]"
      >
        {farewell ? "Let's go" : "Got it"}
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
        <p className="mb-3 text-sm text-stone-700">{event.body}</p>
        {event.realWorld && (
          <p className="font-pixel mb-4 flex items-start gap-1.5 border-l-4 border-[#1e4f9c] bg-[#1e4f9c]/5 px-2 py-1.5 text-xs text-[#1e4f9c]">
            <PixelIcon name="leaf" size={14} />
            <span>In the real world: {event.realWorld}</span>
          </p>
        )}
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
    <div className="pointer-events-none flex w-full flex-col items-end gap-1">
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

// The Roman legion: seen by scouts, then landing. Shows their attack against
// your defense so the player knows what to prepare.
function LegionWarning() {
  const { state } = useGame();
  const size = state.raid?.legion ?? state.legion?.size ?? 0;
  const attack = state.raid?.strength ?? size * 2;
  const defense = defenseStrength(state);
  const eta = state.raid ? state.raid.arriveTick - state.tick : (state.legion?.arriveTick ?? state.tick) - state.tick;
  const safe = defense >= attack;
  return (
    <div className="pointer-events-none flex justify-center" data-testid="legion-banner">
      <div
        className={
          "font-pixel flex max-w-xl items-start gap-2 border-[3px] border-[#140e0a] px-4 py-2 text-xs font-semibold text-white md:text-sm " +
          (safe ? "bg-emerald-800/90" : "bg-red-800/95")
        }
      >
        <PixelIcon name="shield" size={20} />
        <span>
          {state.raid ? "The Roman legion has landed" : "A Roman legion is marching on us"}: {size} legionaries, each
          as strong as two of our warriors (attack {attack}). {state.raid ? "They reach us" : "They land"} in{" "}
          <Countdown ticks={Math.max(0, eta)} />s. Our defense: {defense}
          {safe ? ". We can hold them." : ". Train warriors, forge bronze weapons, build walls!"}
        </span>
      </div>
    </div>
  );
}

export function RaidBanner() {
  const { state } = useGame();
  if (state.legion && !state.raid) return <LegionWarning />;
  if (!state.raid) return null;
  if (state.raid.roman) return <LegionWarning />;
  const defense = defenseStrength(state);
  const safe = defense >= state.raid.strength;
  const eta = Math.max(0, state.raid.arriveTick - state.tick);
  return (
    <div className="pointer-events-none flex justify-center">
      <div
        className={
          "font-pixel flex items-center gap-2 border-[3px] border-[#140e0a] px-4 py-2 text-sm font-semibold text-white " +
          (safe ? "bg-emerald-700/85" : "animate-pulse bg-red-700/90")
        }
      >
        <PixelIcon name="warning" size={18} />
        <span>
          {state.raid.strength} raiders arriving in <Countdown ticks={eta} />s · Defense {defense} ={" "}
          {defenseBreakdown(state)} · {safe ? "You can hold them" : "Train more warriors!"}
        </span>
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
    <div data-testid="warnings" className="pointer-events-none absolute bottom-48 left-11 right-11 flex flex-col gap-1.5 md:bottom-32 md:left-3 md:right-auto md:max-w-72">
      {shown.map((w) => (
        <div
          key={w.id}
          className={
            "pixel-panel-dark font-pixel flex items-center gap-2 px-2.5 py-1.5 text-xs " +
            (w.severe ? "!border-red-700" : "")
          }
        >
          <PixelIcon name={w.icon} size={20} />
          <span>
            {w.countdown === undefined ? (
              w.text
            ) : (
              <>
                {w.text.split("{secs}")[0]}
                <Countdown ticks={w.countdown} />
                {w.text.split("{secs}")[1]}
              </>
            )}
          </span>
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
  const [eventId, setEventId] = useState(EVENTS[0].id);
  const [lessonId, setLessonId] = useState(LESSONS[0].id);
  if (!state.dev) return null;
  return (
    <div className="pixel-panel-dark font-pixel pointer-events-auto flex w-full flex-col gap-1.5 p-2 text-xs">
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
        <button type="button" className="pixel-btn bg-[#4a3b2e] px-2 py-1" onClick={() => dispatch({ type: "devXp" })}>
          +100 XP
        </button>
        <button type="button" className="pixel-btn bg-[#4a3b2e] px-2 py-1" onClick={() => dispatch({ type: "devOutbreak" })}>
          Outbreak
        </button>
        <button type="button" className="pixel-btn bg-[#4a3b2e] px-2 py-1" onClick={() => dispatch({ type: "devRaid" })}>
          Raid now
        </button>
        <button type="button" className="pixel-btn bg-[#4a3b2e] px-2 py-1" onClick={() => dispatch({ type: "devRomans" })}>
          Romans
        </button>
        <button
          type="button"
          className={"pixel-btn px-2 py-1 " + (state.devGoals ? "bg-amber-400 text-[#2b2119]" : "bg-[#4a3b2e]")}
          onClick={() => dispatch({ type: "devGoals" })}
          title="Treat every advancement goal as met"
        >
          Goals {state.devGoals ? "on" : "off"}
        </button>
        <button type="button" className="pixel-btn bg-[#4a3b2e] px-2 py-1" onClick={() => dispatch({ type: "devSparks" })}>
          Sparks
        </button>
        <button type="button" className="pixel-btn bg-[#4a3b2e] px-2 py-1" onClick={() => dispatch({ type: "devClearForest" })}>
          Clear forest
        </button>
        <button type="button" className="pixel-btn bg-[#4a3b2e] px-2 py-1" onClick={() => dispatch({ type: "devCutHills" })}>
          Cut hills
        </button>
        <button type="button" className="pixel-btn bg-[#4a3b2e] px-2 py-1" onClick={() => dispatch({ type: "devFinishEra" })}>
          Finish era
        </button>
      </div>
      {/* Trigger any event card or elder lesson on demand. */}
      <div className="flex gap-1">
        <select
          value={eventId}
          onChange={(e) => setEventId(e.target.value)}
          className="min-w-0 flex-1 border-2 border-[#140e0a] bg-[#4a3b2e] px-1 py-0.5 text-white"
          aria-label="Event to trigger"
          data-testid="dev-event-select"
        >
          {EVENTS.map((ev) => (
            <option key={ev.id} value={ev.id}>
              {ev.title}
            </option>
          ))}
        </select>
        <button type="button" className="pixel-btn bg-[#4a3b2e] px-2 py-1" onClick={() => dispatch({ type: "devEvent", id: eventId })}>
          Event
        </button>
      </div>
      <div className="flex gap-1">
        <select
          value={lessonId}
          onChange={(e) => setLessonId(e.target.value)}
          className="min-w-0 flex-1 border-2 border-[#140e0a] bg-[#4a3b2e] px-1 py-0.5 text-white"
          aria-label="Lesson to show"
        >
          {LESSONS.map((l) => (
            <option key={l.id} value={l.id}>
              {l.title}
            </option>
          ))}
        </select>
        <button type="button" className="pixel-btn bg-[#4a3b2e] px-2 py-1" onClick={() => dispatch({ type: "devLesson", id: lessonId })}>
          Lesson
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
