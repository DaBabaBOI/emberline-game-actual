"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { goldenDeer, launchFireworks, useKonami } from "./eggs";
import { playShot } from "./letterbox";
import { playSfx } from "@/lib/audio";
import { setTimeOfDay } from "./time-of-day";
import { AFTER_STEPS, DISASTERS, DISCOVERIES, DROUGHT, ERA_INTROS, ERAS, EVENTS, KINGDOMS, LESSONS, RAID_KINDS, RAID_RESPONSE, TREE_BY_ID, TUTORIAL, TUTORIAL_FAREWELL } from "@/game/content";
import {
  canAfford,
  countBuildings,
  defenseBreakdown,
  defenseStrength,
  famineOptions,
  inDrought,
  MOMENT_IDS,
  rainfall,
  secs,
  tributeCost,
  waterSupply,
  warnings,
} from "@/game/engine";
import { useGame } from "@/components/civ/game-provider";
import { Countdown } from "./countdown";
import { PixelIcon } from "@/components/civ/pixel-icon";
import { useGuide } from "./guide-overlay";
import { PlagueBanner, RebellionBanner } from "./medieval";

// An easter egg: poke Elder Ama's picture and she gets grumpier; the tenth poke
// earns a secret.
const AMA_LINES: Record<number, string> = {
  3: "Yes, child?",
  5: "I am listening, I promise.",
  7: "Please stop poking me.",
  9: "I am 74 years old, child.",
};
let amaPokes = 0;

function AmaFace() {
  const { dispatch } = useGame();
  const [line, setLine] = useState<string | null>(null);
  const hide = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (hide.current) clearTimeout(hide.current);
  }, []);
  const say = (text: string) => {
    setLine(text);
    if (hide.current) clearTimeout(hide.current);
    hide.current = setTimeout(() => setLine(null), 2500);
  };
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label="Elder Ama"
        data-testid="ama-face"
        onClick={() => {
          amaPokes++;
          if (amaPokes >= 10) {
            amaPokes = 0;
            dispatch({ type: "easterEgg", id: "ama" });
            playSfx("discover");
            say("Fine. Here is a secret for you.");
          } else if (AMA_LINES[amaPokes]) {
            playSfx("ama");
            say(AMA_LINES[amaPokes]);
          }
        }}
      >
        <PixelIcon name="elder" size={28} />
      </button>
      {line && (
        <span className="pixel-panel font-pixel absolute left-9 top-0 z-10 whitespace-nowrap px-2 py-0.5 text-xs" data-testid="ama-line">
          {line}
        </span>
      )}
    </span>
  );
}

// The Konami code sets off fireworks over the village (an easter egg).
export function KonamiFireworks() {
  const { dispatch } = useGame();
  const fire = useCallback(() => {
    launchFireworks();
    dispatch({ type: "easterEgg", id: "fireworks" });
  }, [dispatch]);
  useKonami(fire);
  return null;
}

// One short line per step; the why is behind "Tell me more".
export function TutorialPanel() {
  const { state, dispatch } = useGame();
  const { waiting } = useGuide();
  const step = TUTORIAL[state.tutorialStep];
  // Which step's "more" is open (it closes by itself on the next step).
  const [moreFor, setMoreFor] = useState<number | null>(null);
  if (!step) return null;
  const more = moreFor === state.tutorialStep;
  return (
    <div className="pixel-panel pointer-events-auto relative z-[26] w-full p-2.5 md:p-3" data-testid="tutorial">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="font-pixel flex items-center gap-2 text-base font-semibold">
          <AmaFace />
          Elder Ama
        </span>
        <span className="font-num text-xs text-amber-800/70">
          {state.tutorialStep + 1}/{TUTORIAL.length}
        </span>
      </div>
      <p className="text-sm font-semibold leading-snug md:text-base" data-testid="tutorial-text">
        {step.text}
      </p>
      {waiting && <p className="mt-1 text-xs italic text-amber-800">{waiting}</p>}
      {more && <p className="mt-1.5 text-xs leading-relaxed text-stone-600">{step.more}</p>}
      <div className="mt-2 flex items-center justify-between gap-2 text-xs">
        <button
          type="button"
          onClick={() => setMoreFor(more ? null : state.tutorialStep)}
          className="text-amber-800 underline"
          data-testid="tutorial-more"
        >
          {more ? "Less" : "Tell me more"}
        </button>
        <button type="button" onClick={() => dispatch({ type: "skipTutorial" })} className="text-stone-500 underline">
          Skip tutorial
        </button>
      </div>
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
        <AmaFace />
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
  // A new era's welcome is shown the same way.
  const intro = Object.values(ERA_INTROS).find((l) => l.id === state.lesson);
  const lesson = farewell ? TUTORIAL_FAREWELL : intro ?? LESSONS.find((l) => l.id === state.lesson);
  if (!lesson) return null;
  return (
    <div
      className="pixel-panel pointer-events-auto relative z-[15] w-full p-2.5 text-xs md:p-3 md:text-sm"
      data-testid="elder-lesson"
    >
      <div className="mb-1 flex items-center gap-2">
        <AmaFace />
        <span className="font-pixel flex flex-col leading-tight">
          <span className="text-[11px] text-amber-800/80">{farewell || intro ? "Elder Ama" : "Elder Ama\u2019s lesson"}</span>
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
        {farewell || intro ? "Let's go" : "Got it"}
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

// The great drought: the elders' warning with a countdown, then how the town is
// holding up (rain, water for how many people) until the rains return.
function DroughtBanner() {
  const { state } = useGame();
  const d = state.drought!;
  const on = inDrought(state);
  const pop = Math.floor(state.population);
  const water = waterSupply(state);
  const short = water < pop;
  const granaries = countBuildings(state).granary ?? 0;
  return (
    <div className="pointer-events-none flex justify-center" data-testid="drought-banner">
      <div
        className={
          "font-pixel flex max-w-xl items-start gap-2 border-[3px] border-[#140e0a] px-4 py-2 text-xs font-semibold text-[#2b2119] md:text-sm " +
          (on ? "bg-amber-500/95" : "bg-amber-200/95")
        }
      >
        <span className="shrink-0">
          <PixelIcon name="sun" size={20} />
        </span>
        <span>
          {on ? (
            <>
              The great drought: rain is down to {Math.round(rainfall(state) * 100)}%. Water for {Math.min(water, pop)} of {pop} people
              {short ? " (the rest are thirsty and unhappy)" : ""}. The rains return in <Countdown ticks={Math.max(0, d.endTick - state.tick)} />s.
            </>
          ) : (
            <>
              A great drought comes in <Countdown ticks={Math.max(0, d.startTick - state.tick)} />s and lasts {Math.round(secs(DROUGHT.ticks) / 60)}{" "}
              minutes. Water for {Math.min(water, pop)} of {pop} people, {granaries} granar{granaries === 1 ? "y" : "ies"}. Dig wells, build
              aqueducts, fill the granaries and keep the forest standing.
            </>
          )}
        </span>
      </div>
    </div>
  );
}

// A storm, flood, earthquake or landslide: the warning with a countdown, then
// what it is doing.
function DisasterBanner() {
  const { state } = useGame();
  const d = state.disaster!;
  const k = DISASTERS.kinds[d.kind];
  const coming = state.tick < d.startTick;
  const now: Record<string, string> = {
    storm: "A storm is raging over the village. Every fire is out.",
    flood: "The land by the water is flooded. Buildings under water have stopped working.",
    earthquake: "The ground is shaking!",
    landslide: "The hillside is sliding down!",
  };
  return (
    <div className="pointer-events-none flex justify-center" data-testid="disaster-banner">
      <div
        className={
          "font-pixel flex max-w-xl items-start gap-2 border-[3px] border-[#140e0a] px-4 py-2 text-xs font-semibold text-white md:text-sm " +
          (coming ? "bg-slate-700/95" : "bg-slate-900/95")
        }
      >
        <span className="shrink-0">
          <PixelIcon name={k.icon} size={20} />
        </span>
        <span>
          {coming ? (
            <>
              {k.warning} It strikes in <Countdown ticks={Math.max(0, d.startTick - state.tick)} />s.
            </>
          ) : (
            <>
              {now[d.kind]} Over in <Countdown ticks={Math.max(0, d.endTick - state.tick)} />s.
            </>
          )}
        </span>
      </div>
    </div>
  );
}

export function RaidBanner() {
  const { state, dispatch } = useGame();
  if (state.rebellion && !state.raid) return <RebellionBanner />;
  if (state.plague && !state.raid) return <PlagueBanner />;
  if (state.disaster && !state.raid) return <DisasterBanner />;
  if (state.drought && !state.raid) return <DroughtBanner />;
  if (state.legion && !state.raid) return <LegionWarning />;
  if (!state.raid) return null;
  const raid = state.raid;
  if (raid.roman) return <LegionWarning />;
  const kind = RAID_KINDS[raid.kind ?? "party"];
  const defense = defenseStrength(state);
  const safe = defense >= raid.strength;
  const eta = Math.max(0, raid.arriveTick - state.tick);

  // The fight is on: a tug of war you can still tip by training warriors.
  if (raid.fightStart !== undefined) {
    const left = Math.max(0, raid.fightStart + RAID_RESPONSE.fightTicks - state.tick);
    const share = Math.round((100 * defense) / Math.max(1, defense + raid.strength));
    return (
      <div className="pointer-events-none flex justify-center">
        <div className="pixel-panel-dark font-pixel w-[min(92vw,520px)] px-4 py-2 text-sm text-white" data-testid="raid-fight">
          <div className="flex items-center justify-between">
            <span className="font-semibold">The fight is on!</span>
            <span className="font-num text-base">
              <Countdown ticks={left} />s
            </span>
          </div>
          <div className="mt-1.5 flex h-4 w-full border-2 border-[#140e0a]">
            <div className="bg-sky-600" style={{ width: `${share}%` }} />
            <div className="flex-1 bg-red-700" />
          </div>
          <div className="mt-1 flex justify-between text-xs">
            <span>Our defense {defense}</span>
            <span>{safe ? "We are holding!" : "We are losing! Train a warrior to tip it."}</span>
            <span>Raiders {raid.strength}</span>
          </div>
        </div>
      </div>
    );
  }

  // They have landed: pick a response before they arrive (no choice means we fight).
  if (!raid.response) {
    const price = tributeCost(raid);
    const options: { id: "fight" | "hide" | "tribute"; label: string; note: string; ok: boolean }[] = [
      {
        id: "fight",
        label: "Fight",
        note: safe ? `Defense ${defense} vs ${raid.strength}: we can hold them` : `Defense ${defense} vs ${raid.strength}: train warriors first`,
        ok: true,
      },
      {
        id: "hide",
        label: "Hide in the houses",
        note: kind.burns ? "Nobody dies, but they still burn a building" : "Nobody dies, but they take a share",
        ok: true,
      },
      {
        id: "tribute",
        label: `Pay ${price} food`,
        note: "They leave, but come back sooner",
        ok: canAfford(state, { food: price }),
      },
    ];
    return (
      <div className="pointer-events-none flex justify-center">
        <div className="pixel-panel-dark font-pixel w-[min(92vw,560px)] px-4 py-2 text-sm text-white" data-testid="raid-card">
          <div className="flex items-center gap-2 font-semibold">
            <PixelIcon name="warning" size={18} />
            <span>
              {raid.kingdom ? `An army of ${KINGDOMS[raid.kingdom].name} (${raid.strength})!` : `${kind.name} of ${raid.strength} raiders! ${kind.wants}`} They
              arrive in <Countdown ticks={eta} />s.
            </span>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            {options.map((o) => (
              <button
                key={o.id}
                type="button"
                disabled={!o.ok}
                onClick={() => dispatch({ type: "raidResponse", choice: o.id })}
                className={
                  "pixel-btn pointer-events-auto px-2 py-1 text-left text-xs disabled:opacity-40 " +
                  (o.id === "fight" ? "bg-red-800 hover:bg-red-700" : "bg-[#4a3b2e] hover:bg-[#5a4a3a]")
                }
              >
                {o.label}
                <span className="block text-[11px] text-white/70">{o.note}</span>
              </button>
            ))}
          </div>
          <p className="mt-1 text-[11px] text-white/60">No choice means we fight.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pointer-events-none flex justify-center">
      <div
        className={
          "font-pixel flex items-center gap-2 border-[3px] border-[#140e0a] px-4 py-2 text-sm font-semibold text-white " +
          (raid.response === "hide" ? "bg-[#4a3b2e]/90" : safe ? "bg-emerald-700/85" : "animate-pulse bg-red-700/90")
        }
      >
        <PixelIcon name="warning" size={18} />
        <span>
          {raid.response === "hide" ? (
            <>
              Everyone is hiding in the houses. The raiders arrive in <Countdown ticks={eta} />s.
            </>
          ) : (
            <>
              {raid.strength} raiders arriving in <Countdown ticks={eta} />s · Defense {defense} = {defenseBreakdown(state)} ·{" "}
              {safe ? "You can hold them" : "Train more warriors!"}
            </>
          )}
        </span>
      </div>
    </div>
  );
}

// Only the most urgent warning is shown; the rest wait behind a "+N more" button.
export function Warnings() {
  const { state, dispatch } = useGame();
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
          <span className="shrink-0">
            <PixelIcon name={w.icon} size={20} />
          </span>
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
            {w.id === "famine" && (
              <span className="mt-1.5 flex flex-col gap-1" data-testid="famine-options">
                {famineOptions(state).map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    disabled={!o.ok}
                    onClick={() => dispatch({ type: "famineRelief", kind: o.id })}
                    className="pixel-btn pointer-events-auto bg-[#4a3b2e] px-2 py-1 text-left text-[11px] text-white disabled:opacity-40"
                  >
                    {o.label}
                    <span className="block text-white/60">{o.note}</span>
                  </button>
                ))}
              </span>
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
  const [sceneId, setSceneId] = useState(Object.keys(DISCOVERIES)[0]);
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
        {(
          [
            ["Dawn", 0.245],
            ["Noon", 0.5],
            ["Sunset", 0.755],
            ["Night", 0.95],
          ] as const
        ).map(([label, t]) => (
          <button key={label} type="button" className="pixel-btn bg-[#4a3b2e] px-2 py-1" onClick={() => setTimeOfDay(t)}>
            {label}
          </button>
        ))}
        <button
          type="button"
          className="pixel-btn bg-[#4a3b2e] px-2 py-1"
          onClick={() => {
            launchFireworks();
            dispatch({ type: "easterEgg", id: "fireworks" });
          }}
        >
          Fireworks
        </button>
        <button
          type="button"
          className="pixel-btn bg-[#4a3b2e] px-2 py-1"
          onClick={() => {
            goldenDeer.wanted = true;
          }}
          title="The next animal in the forest is the golden deer"
        >
          Golden deer
        </button>
        <button
          type="button"
          className="pixel-btn bg-[#4a3b2e] px-2 py-1"
          onClick={() => (["build", "discover", "step", "event", "raid", "battle", "era", "win", "lose"] as const).forEach((k, i) => setTimeout(() => playSfx(k), i * 1400))}
          title="Plays every sound effect in turn"
        >
          Sounds
        </button>
        <button
          type="button"
          className="pixel-btn bg-[#4a3b2e] px-2 py-1"
          onClick={() => playShot({ kind: "intro", title: state.nation ?? "The Emberfolk", subtitle: ERAS[state.era].name, seconds: 6 })}
        >
          Intro shot
        </button>
        <button
          type="button"
          className="pixel-btn bg-[#4a3b2e] px-2 py-1"
          onClick={() => playShot({ kind: "era", title: ERAS[state.era].name, subtitle: "Era shot", seconds: 9 })}
        >
          Era shot
        </button>
        <button type="button" className="pixel-btn bg-[#4a3b2e] px-2 py-1" onClick={() => dispatch({ type: "devGrief" })} title="As if someone was dropped into a fire">
          Grief
        </button>
        <button type="button" className="pixel-btn bg-[#4a3b2e] px-2 py-1" onClick={() => dispatch({ type: "devFiresOut" })}>
          Fires out
        </button>
        <button type="button" className="pixel-btn bg-[#4a3b2e] px-2 py-1" onClick={() => dispatch({ type: "devNearlyBehind" })}>
          Nearly behind
        </button>
        <button type="button" className="pixel-btn bg-[#4a3b2e] px-2 py-1" onClick={() => dispatch({ type: "devFogBack" })}>
          Back from fog
        </button>
        <button type="button" className="pixel-btn bg-[#4a3b2e] px-2 py-1" onClick={() => dispatch({ type: "devXp" })}>
          +100 XP
        </button>
        <button type="button" className="pixel-btn bg-[#4a3b2e] px-2 py-1" onClick={() => dispatch({ type: "devMoment" })}>
          Moment
        </button>
        {/* One moment in particular (only if it can happen right now). */}
        <select
          aria-label="Pick a moment"
          className="bg-[#4a3b2e] px-1 py-1"
          value=""
          onChange={(e) => e.target.value && dispatch({ type: "devMoment", id: e.target.value })}
        >
          <option value="">Moment...</option>
          {MOMENT_IDS().map((id) => (
            <option key={id} value={id}>
              {id}
            </option>
          ))}
        </select>
        <button type="button" className="pixel-btn bg-[#4a3b2e] px-2 py-1" onClick={() => dispatch({ type: "devStarve" })}>
          Starve
        </button>
        <button type="button" className="pixel-btn bg-[#4a3b2e] px-2 py-1" onClick={() => dispatch({ type: "devCollapse" })}>
          Collapse
        </button>
        <button type="button" className="pixel-btn bg-[#4a3b2e] px-2 py-1" onClick={() => dispatch({ type: "devOutbreak" })}>
          Outbreak
        </button>
        <button type="button" className="pixel-btn bg-[#4a3b2e] px-2 py-1" onClick={() => dispatch({ type: "devRaidKind", kind: "band" })}>
          Raid: band
        </button>
        <button type="button" className="pixel-btn bg-[#4a3b2e] px-2 py-1" onClick={() => dispatch({ type: "devRaidKind", kind: "party" })}>
          Raid: party
        </button>
        <button type="button" className="pixel-btn bg-[#4a3b2e] px-2 py-1" onClick={() => dispatch({ type: "devRaidKind", kind: "fire" })}>
          Raid: fire
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
      {/* Ancient and Classical era: skip the legion, the drought, caravans. */}
      <div className="flex max-w-xs flex-wrap gap-1">
        <button type="button" className="pixel-btn bg-[#4a3b2e] px-2 py-1" onClick={() => dispatch({ type: "devBeatLegion" })}>
          Beat legion
        </button>
        <button type="button" className="pixel-btn bg-[#4a3b2e] px-2 py-1" onClick={() => dispatch({ type: "devDrought", when: "soon" })}>
          Drought soon
        </button>
        <button type="button" className="pixel-btn bg-[#4a3b2e] px-2 py-1" onClick={() => dispatch({ type: "devDrought", when: "now" })}>
          Drought now
        </button>
        <button type="button" className="pixel-btn bg-[#4a3b2e] px-2 py-1" onClick={() => dispatch({ type: "devDrought", when: "end" })}>
          End drought
        </button>
        <button type="button" className="pixel-btn bg-[#4a3b2e] px-2 py-1" onClick={() => dispatch({ type: "devCaravanBack" })}>
          Caravan back
        </button>
        <button type="button" className="pixel-btn bg-[#4a3b2e] px-2 py-1" onClick={() => dispatch({ type: "devWear" })} title="Hard mode: wear every building down">
          Wear
        </button>
      </div>
      {/* Medieval era: finish the landmark, bring the plague, ships, kingdom moods. */}
      <div className="flex max-w-xs flex-wrap gap-1">
        <button type="button" className="pixel-btn bg-[#4a3b2e] px-2 py-1" onClick={() => dispatch({ type: "devLandmark" })}>
          Landmark
        </button>
        {(["soon", "now", "end"] as const).map((when) => (
          <button key={when} type="button" className="pixel-btn bg-[#4a3b2e] px-2 py-1" onClick={() => dispatch({ type: "devPlague", when })}>
            Plague {when}
          </button>
        ))}
        <button type="button" className="pixel-btn bg-[#4a3b2e] px-2 py-1" onClick={() => dispatch({ type: "devRebellion", when: "soon" })}>
          Unrest
        </button>
        <button type="button" className="pixel-btn bg-[#4a3b2e] px-2 py-1" onClick={() => dispatch({ type: "devRebellion", when: "now" })}>
          Rebellion
        </button>
        <button type="button" className="pixel-btn bg-[#4a3b2e] px-2 py-1" onClick={() => dispatch({ type: "devShipBack" })}>
          Ship back
        </button>
        {(["steppe", "reach"] as const).flatMap((kingdom) =>
          [-40, 40].map((by) => (
            <button key={kingdom + by} type="button" className="pixel-btn bg-[#4a3b2e] px-2 py-1" onClick={() => dispatch({ type: "devMood", kingdom, by })}>
              {kingdom} {by > 0 ? "+" : ""}
              {by}
            </button>
          )),
        )}
      </div>
      {/* Natural disasters: each is warned of, then strikes 3 ticks later. */}
      <div className="flex max-w-xs flex-wrap gap-1">
        {(["storm", "flood", "earthquake", "landslide"] as const).map((kind) => (
          <button key={kind} type="button" className="pixel-btn bg-[#4a3b2e] px-2 py-1" onClick={() => dispatch({ type: "devDisaster", kind })}>
            {kind[0].toUpperCase() + kind.slice(1)}
          </button>
        ))}
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
      <div className="flex gap-1">
        <select
          value={sceneId}
          onChange={(e) => setSceneId(e.target.value)}
          className="min-w-0 flex-1 border-2 border-[#140e0a] bg-[#4a3b2e] px-1 py-0.5 text-white"
          aria-label="Discovery scene to play"
        >
          {Object.keys(DISCOVERIES).map((id) => (
            <option key={id} value={id}>
              {TREE_BY_ID[id]?.name ?? id}
            </option>
          ))}
        </select>
        <button type="button" className="pixel-btn bg-[#4a3b2e] px-2 py-1" onClick={() => dispatch({ type: "devCutscene", id: sceneId })}>
          Scene
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
