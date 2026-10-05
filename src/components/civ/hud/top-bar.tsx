"use client";

import { HOME } from "@/lib/home";
import { CARBON, ERAS, KARDASHEV, SETTLERS, XP, chiefTitle, formatYear, xpToReach } from "@/game/content";
import { useGame } from "@/components/civ/game-provider";
import { cleanPower, kardashev, nextEraPopulation, nextYear, powerCover, powerDemand, powerSupply, settlersAffordable, settlersCost, settlersReady, warming, warnings } from "@/game/engine";
import { realCalendar } from "@/game/calendar";
import type { GameState } from "@/game/types";
import { cn } from "@/lib/utils";
import { PixelIcon } from "@/components/civ/pixel-icon";
import type { IconId } from "@/game/sprites";
import { GameMenu } from "./online";
import { MuteButton } from "./game-audio";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { figureCounts, highlight } from "@/components/civ/world/crowd";
import { KnowledgeGain, KnowledgeHelp } from "./knowledge-help";

const SPEEDS: { value: GameState["speed"]; label: string }[] = [
  { value: 0, label: "⏸" },
  { value: 1, label: "▶" },
  { value: 2, label: "▶▶" },
  { value: 4, label: "▶▶▶" },
];

function Chip({ icon, value, title, low }: { icon: IconId; value: string; title: string; low?: boolean }) {
  return (
    <span title={title} className={cn("flex items-center gap-0.5 whitespace-nowrap sm:gap-1", low && "animate-pulse text-red-400")}>
      <PixelIcon name={icon} size={16} />
      <span className="font-num">{value}</span>
    </span>
  );
}

// Population or warriors: hovering (or tapping) lights up those people on the
// map in yellow, and says how many people each figure stands for.
function CrowdChip({
  icon,
  count,
  figures,
  group,
  noun,
  controls,
}: {
  icon: IconId;
  count: number;
  figures: number;
  group: "people" | "warriors";
  noun: string;
  // A panel a click opens (population control), instead of the tip.
  controls?: (close: () => void) => React.ReactNode;
}) {
  const [on, setOn] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    highlight.group = on ? group : highlight.group === group ? null : highlight.group;
  }, [on, group]);
  // A tap on a phone lights them up for a few seconds.
  useEffect(() => {
    if (!on) return;
    const id = setTimeout(() => setOn(false), 4000);
    return () => clearTimeout(id);
  }, [on]);
  useEffect(() => () => void (highlight.group = null), []);
  const each = figures ? count / figures : 0;
  return (
    <span className="relative">
      <button
        type="button"
        onMouseEnter={() => setOn(true)}
        onMouseLeave={() => setOn(false)}
        onFocus={() => setOn(true)}
        onBlur={() => setOn(false)}
        onClick={() => {
          setOn(true);
          if (controls) setOpen(!open);
        }}
        aria-expanded={controls ? open : undefined}
        className={cn("flex items-center gap-1 whitespace-nowrap px-1", (on || open) && "bg-amber-400 text-[#2b2119]")}
        data-testid={`crowd-${group}`}
      >
        <PixelIcon name={icon} size={16} />
        <span className="font-num">{count.toLocaleString()}</span>
      </button>
      {open && controls && (
        <span className="pixel-panel-dark absolute left-1/2 top-full z-30 mt-2 flex w-64 -translate-x-1/2 flex-col gap-2 p-2 text-left text-xs" data-testid={`crowd-panel-${group}`}>
          {controls(() => setOpen(false))}
        </span>
      )}
      {on && !open && (
        <span className="pixel-panel-dark absolute left-1/2 top-full z-30 mt-2 w-56 -translate-x-1/2 p-2 text-left text-xs" data-testid={`crowd-tip-${group}`}>
          {count.toLocaleString()} {noun}. {figures > 0 ? (
            <>
              They are lit up in yellow on the map: {figures} figure{figures === 1 ? "" : "s"}
              {each > 1.05 ? `, each one about ${Math.round(each)} ${noun}` : ""}.
            </>
          ) : (
            "None on the map yet."
          )}
        </span>
      )}
    </span>
  );
}

// Population control: hold the tribe at a size, or let some families leave to
// start a village of their own (no one is harmed).
function PopulationControl({ close }: { close: () => void }) {
  const { state, dispatch } = useGame();
  const pop = Math.floor(state.population);
  const limit = state.popLimit ?? null;
  const goal = nextEraPopulation(state);
  const leaving = settlersReady(state);
  const cost = settlersCost(leaving || SETTLERS.size);
  const affordable = settlersAffordable(state);
  const set = (n: number) => dispatch({ type: "setPopLimit", limit: Math.max(SETTLERS.keep, n) });
  return (
    <>
      <span className="flex items-center justify-between">
        <span className="font-semibold text-amber-300">Population: {pop}</span>
        <button type="button" onClick={close} className="text-white/60 underline">
          Close
        </button>
      </span>
      <span className="text-white/70">More people means more food, wood and land needed. You choose how big the tribe gets.</span>
      <span className="grid grid-cols-2 gap-1">
        <button
          type="button"
          onClick={() => dispatch({ type: "setPopLimit", limit: null })}
          className={cn("pixel-btn px-2 py-1", limit === null ? "bg-amber-300 text-[#2b2119]" : "bg-[#4a3b2e] text-white")}
          data-testid="pop-grow"
        >
          Grow freely
        </button>
        <button
          type="button"
          onClick={() => set(limit ?? pop)}
          className={cn("pixel-btn px-2 py-1", limit !== null ? "bg-amber-300 text-[#2b2119]" : "bg-[#4a3b2e] text-white")}
          data-testid="pop-hold"
        >
          Hold at {limit ?? pop}
        </button>
      </span>
      {limit !== null && (
        <span className="flex items-center justify-between gap-2">
          <button type="button" onClick={() => set(limit - 1)} className="pixel-btn bg-[#4a3b2e] px-2 py-0.5 text-white" aria-label="Lower the limit" data-testid="pop-lower">
            −
          </button>
          <span>
            Stop at <span className="font-num">{limit}</span> people
          </span>
          <button type="button" onClick={() => set(limit + 1)} className="pixel-btn bg-[#4a3b2e] px-2 py-0.5 text-white" aria-label="Raise the limit" data-testid="pop-raise">
            +
          </button>
        </span>
      )}
      {limit !== null && goal !== null && limit < goal && (
        <span className="text-amber-300">The next era needs {goal} people: raise the limit when you are ready.</span>
      )}
      <button
        type="button"
        disabled={!leaving || !affordable}
        onClick={() => dispatch({ type: "sendSettlers" })}
        className="pixel-btn bg-[#4a3b2e] px-2 py-1 text-white disabled:opacity-40"
        data-testid="pop-settlers"
      >
        Send {leaving || SETTLERS.size} settlers to start a new village
      </button>
      <span className="text-white/60" data-testid="pop-settlers-cost">
        {!leaving
          ? `At least ${SETTLERS.keep} people stay.`
          : `Fewer mouths to feed, but they take ${cost.food} food and ${cost.wood} wood, you lose ${leaving} workers, and their families miss them (−${SETTLERS.missed} happiness for a while).`}
        {leaving > 0 && !affordable && <span className="text-red-300"> Not enough food or wood to spare.</span>}
      </span>
    </>
  );
}

// Chief level: a bar that only ever fills up, so progress is always visible.
function ChiefXp({ state }: { state: GameState }) {
  const level = state.chiefLevel ?? 1;
  const xp = state.xp ?? 0;
  const from = xpToReach(level);
  const to = xpToReach(level + 1);
  const share = Math.max(0, Math.min(1, (xp - from) / (to - from)));
  return (
    <div
      className="flex flex-col leading-tight"
      title={`Chief XP ${xp}/${to}. You earn XP by building (+${XP.build}), growing, researching (+${XP.research}), beating raids (+${XP.raidWon}), planting trees, and every minute everyone is fed and the land is healthy. Each level: +${XP.levelKnowledge} Knowledge.`}
      data-testid="chief-xp"
    >
      <span className="text-[11px] text-amber-300">
        Lv {level}
        <span className="hidden sm:inline"> {chiefTitle(level)}</span>
      </span>
      <span className="mt-0.5 block h-2 w-8 border border-[#140e0a] bg-white/15 min-[380px]:w-12 sm:w-24">
        <span className="block h-full bg-amber-400" style={{ width: `${share * 100}%` }} />
      </span>
    </div>
  );
}

export function TopBar({ children }: { children?: React.ReactNode }) {
  const { state, dispatch, panel } = useGame();
  const era = ERAS[state.era];
  const r = state.resources;
  const low = new Set(warnings(state).map((w) => w.id));
  const [knowHelp, setKnowHelp] = useState(false);

  return (
    // Above the tutorial's dimmed overlay (z-25) so speed and Menu always work,
    // but under the Advancements screen (z-20) while it is open. Only the bar
    // itself takes clicks, not the full-width strip around it. Below 1024 px it
    // takes two rows: who and when, speed and Menu; then the stores.
    <div
      className={cn("game-top-bar pointer-events-none absolute inset-x-0 top-1.5 flex flex-col items-center gap-1 px-1.5 lg:top-3 lg:px-3", panel !== "tree" && "z-[27]")}
      data-hud="top"
    >
      <div
        className="pixel-panel-dark font-pixel pointer-events-auto flex max-w-full flex-wrap items-center justify-center gap-x-2 gap-y-1 px-2 py-1 text-xs lg:flex-nowrap lg:gap-4 lg:px-4 lg:py-1.5 lg:text-sm"
        // A bronze trim from the Ancient era on.
        style={state.era >= 1 ? { borderColor: "#b0773a", boxShadow: "inset 0 -3px 0 #8a5a2b" } : undefined}
      >
        <a href={HOME} className="order-1 font-semibold text-amber-300 lg:order-none" title="Back to the home page">
          ◀
        </a>
        <div className="order-1 flex flex-col leading-tight lg:order-none">
          <span className="hidden max-w-40 truncate text-xs font-semibold text-white lg:block" title="Your people">
            {state.nation ?? "The Emberfolk"}
          </span>
          <span className={"text-[11px] uppercase tracking-wide " + (state.era >= 1 ? "text-orange-300" : "text-amber-300")}>
            {era.name}
          </span>
          {state.realTimeFrom ? <RealCalendar /> : <RollingYear />}
        </div>
        {/* The stores: their own row below 1024 px. */}
        <div className="order-6 flex w-full flex-wrap items-center justify-center gap-x-1 gap-y-1 min-[380px]:gap-x-1.5 sm:gap-x-2.5 lg:contents">
          <ChiefXp state={state} />
          <span className="hidden h-6 w-px bg-white/20 lg:block" />
          <CrowdChip
            icon="person"
            count={Math.floor(state.population)}
            figures={figureCounts(state.population, state.soldiers).villagers}
            group="people"
            noun="people"
            controls={(close) => <PopulationControl close={close} />}
          />
          <Chip icon="coin" value={Math.floor(r.currency).toLocaleString()} title={era.currency} />
          <CrowdChip
            icon="sword"
            count={state.soldiers}
            figures={figureCounts(state.population, state.soldiers).warriors}
            group="warriors"
            noun="warriors"
          />
          <span className="hidden h-6 w-px bg-white/20 lg:block" />
          <Chip icon="meat" value={Math.floor(r.food).toString()} title="Stored food" low={low.has("food") || low.has("famine")} />
          <Chip icon="log" value={Math.floor(r.wood).toString()} title="Wood" low={low.has("wood")} />
          <Chip icon="rock" value={Math.floor(r.stone).toString()} title="Stone" />
          {/* Industrial era: the power grid, and the carbon in the air. */}
          {state.era >= 4 && (
            <>
              <Chip
                icon="powerplant"
                value={`${Math.round(powerSupply(state))}/${Math.round(powerDemand(state))}`}
                title="Power: made / needed. Short of power, the buildings that need it work less well."
                low={powerCover(state) < 1}
              />
              <Chip
                icon="sun"
                value={`${Math.round(state.carbon ?? CARBON.start)} ppm +${warming(state).toFixed(1)}°`}
                title="Carbon in the air (parts per million) and how much warmer the world is. 280 before industry. It only goes up: coal and factories add to it for good."
                low={warming(state) >= 1.5}
              />
              {state.era >= 5 && (
                <Chip
                  icon="earth"
                  value={`K ${kardashev(state).toFixed(2)}`}
                  title={`Kardashev rating (scaled for the game): ${Math.round(cleanPower(state))} of ${KARDASHEV.clean} clean power. At 1.00 (Type I) the whole planet runs on clean energy.`}
                />
              )}
            </>
          )}
          {/* Knowledge: click to see how to get more. */}
          <span className="relative">
            <button
              type="button"
              onClick={() => setKnowHelp(!knowHelp)}
              className={cn("flex items-center gap-1 whitespace-nowrap px-1", knowHelp ? "bg-amber-400 text-[#2b2119]" : "hover:bg-white/15")}
              title="Knowledge: click to see how to get more"
              data-testid="knowledge-chip"
            >
              <PixelIcon name="bulb" size={16} />
              <span className="font-num">{Math.floor(r.knowledge)}</span>
              <span className="hidden text-[10px] text-amber-300 sm:inline">?</span>
            </button>
            <KnowledgeGain value={r.knowledge} />
            {knowHelp && <KnowledgeHelp state={state} onClose={() => setKnowHelp(false)} />}
          </span>
        </div>
        <span className="hidden h-6 w-px bg-white/20 lg:block" />
        <div className="order-2 flex gap-1 lg:order-none" data-guide="speed">
          {SPEEDS.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => dispatch({ type: "setSpeed", speed: s.value })}
              aria-label={s.value === 0 ? "Pause" : `Speed ${s.value}`}
              className={cn(
                "px-2 py-0.5 text-xs",
                state.speed === s.value ? "bg-amber-400 text-[#2b2119]" : "bg-white/10 hover:bg-white/20",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
        <span className="order-3 lg:order-none">
          <MuteButton />
        </span>
        <span className="order-4 lg:order-none">
          <GameMenu />
        </span>
      </div>
      {children}
    </div>
  );
}

// Realistic time (a joke mode): today's date and the real time, in 50,000 BCE.
function RealCalendar() {
  const { state } = useGame();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const c = realCalendar(state, now);
  return (
    <span
      className="font-num flex flex-col text-xs leading-tight"
      data-testid="real-calendar"
      title={`Realistic time: the calendar runs in real time. The Ancient era is about ${c.yearsToNext.toLocaleString()} real years away. Good luck.`}
    >
      <span>{c.date}</span>
      <span className="text-[11px] text-white/70">
        {c.time} · {c.season}
      </span>
    </span>
  );
}

// The year counts up smoothly between ticks, towards next tick's year, instead
// of jumping every 1.5 s. It holds still while time is stopped, and carries on
// from what it shows when time starts again. The text is set here only (not by
// React), so the two never fight over it.
function RollingYear() {
  const { state, clock } = useGame();
  const span = useRef<HTMLSpanElement>(null);
  const shown = useRef(state.year);
  const from = state.year;
  const to = nextYear(state);
  const { running, msPerTick } = clock;
  // A new tick (or a jump, like a new era): show its year straight away.
  useLayoutEffect(() => {
    shown.current = from;
    if (span.current) span.current.textContent = formatYear(from);
  }, [from]);
  useEffect(() => {
    const el = span.current;
    if (!el || !running || to === from) return;
    const begin = shown.current;
    const start = performance.now();
    let frame = 0;
    const draw = (now: number) => {
      const done = Math.min(1, (now - start) / msPerTick);
      shown.current = begin + (to - begin) * done;
      el.textContent = formatYear(shown.current);
      if (done < 1) frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [from, to, running, msPerTick]);
  return <span ref={span} className="font-num text-sm lg:text-base" data-testid="year" />;
}
