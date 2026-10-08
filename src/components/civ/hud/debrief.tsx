"use client";

import { useShot } from "./letterbox";

import { HOME } from "@/lib/home";
import { useState, type ReactNode } from "react";
import { ERAS, formatYear, LAST, LAST_TUTORIAL, LESSONS, METERS, METER_SDG, MIN_SUSTAINABILITY_FOR_BEST_ENDING, REAL_CO2 } from "@/game/content";
import { clearSave, currentGoal, goalSteps, lastFocus, lastProblems, makeDebrief, readyForNextEra, secs } from "@/game/engine";
import type { GameState } from "@/game/types";
import type { Debrief as DebriefData } from "@/game/types";
import { useGame } from "@/components/civ/game-provider";
import { LeaderboardPanel } from "./online";
import { SpeedrunPanel } from "./speedrun";
import { PixelIcon } from "@/components/civ/pixel-icon";
import { cn } from "@/lib/utils";
import { useCompact } from "@/lib/use-compact";

const TIERS: Record<DebriefData["tier"], { title: string; text: string; tone: string }> = {
  thriving: {
    title: "A village that can last",
    text: `Your people grew and the land is still healthy (Sustainability ${MIN_SUSTAINABILITY_FOR_BEST_ENDING} or more). This is the best ending.`,
    tone: "border-emerald-700 bg-emerald-100 text-emerald-900",
  },
  costly: {
    title: "Growth at a cost",
    text: `Your people grew, but the land paid for it. The best ending needs Sustainability of ${MIN_SUSTAINABILITY_FOR_BEST_ENDING} or more.`,
    tone: "border-amber-700 bg-amber-100 text-amber-900",
  },
  lost: {
    title: "The village did not last",
    text: "A healthy land means little if the people are gone. A village that lasts needs both: land that can recover, and people who are fed, warm and hopeful.",
    tone: "border-red-800 bg-red-100 text-red-900",
  },
  stripped: {
    title: "A land stripped bare",
    text: "The forests are gone and the land is exhausted. Whoever comes next inherits the damage.",
    tone: "border-red-800 bg-red-100 text-red-900",
  },
};

function Row({ label, value, bad }: { label: string; value: ReactNode; bad?: boolean }) {
  return (
    <li className="flex justify-between gap-3">
      <span>{label}</span>
      <span className={cn("font-num text-base", bad && "text-red-800")}>{value}</span>
    </li>
  );
}

// The end-of-era (or end-of-game) debrief: what the tribe achieved, what it
// cost the land and the people, every meter with its real-world target, and
// the lessons learned along the way.
export function Debrief({ onRestart }: { onRestart: () => void }) {
  const { state, dispatch } = useGame();
  const d = state.debrief ?? (state.phase === "gameover" ? makeDebrief(state, "loss") : null);
  if (!d) return null;
  // Older saves may have stored a land-only verdict on a loss.
  const base = TIERS[d.kind === "loss" ? "lost" : d.tier];
  // A village in the Stone Age; a town, a city, then a whole world later on.
  const place = d.era >= 5 || d.kind === "final" ? "world" : d.era >= 4 ? "city" : d.era >= 1 ? "town" : "village";
  const tier = { ...base, title: base.title.replace("village", place) };
  const deaths = d.stats.deaths;
  const lost = Math.round(deaths.famine + deaths.disease + deaths.fire + deaths.battle + (deaths.accident ?? 0) + (deaths.disaster ?? 0));
  const who = state.nation ?? "Your people";
  const heading =
    d.kind === "era"
      ? `The ${ERAS[d.era].name}${ERAS[d.era].name.endsWith("Age") ? "" : " era"} is over`
      : d.kind === "final"
        ? state.mode === "last"
          ? "A civilisation that lasts"
          : "Your story is complete"
        : state.lostTo === "time"
          ? "Out of time"
        : state.lostTo === "unrest"
          ? "The tribe has left"
          : state.lostTo === "conquest"
            ? "Conquered"
            : state.lostTo === "behind"
              ? "Left behind"
            : state.lostTo === "collapse"
              ? "The land gave out"
              : "Famine";
  const sub =
    d.kind === "era"
      ? `${ERA_ENDS[d.era] ?? `${who} are ready for what comes next.`} Here is how you got here.`.replace("{who}", who)
      : d.kind === "final" && state.mode === "last"
        ? `${who} cleared the air, run on clean power, and give ${Math.floor(state.population)} people a home and food, with the forest still standing, in ${formatYear(d.year)}.`
      : d.kind === "final"
        ? `${who} powered the whole planet with clean energy (Kardashev ${(d.kardashev ?? 1).toFixed(2)})${d.tipped ? ", though the climate tipped on the way" : ", and the climate held"}, then sent the Ember Ark to the stars. Here is the whole story, from the first fire.`
        : state.lostTo === "time"
          ? `${LAST.deadline} came, and ${who} still hadn't solved all three problems at once. ${lastProblems(state).filter((p) => !p.done).map((p) => p.title).join(" and ")} ${lastProblems(state).filter((p) => !p.done).length === 1 ? "was" : "were"} still left to do.`
        : state.lostTo === "conquest"
          ? `The Roman legion broke through in ${formatYear(d.year)} and ${who} lost their village.`
          : state.lostTo === "unrest"
          ? `${who} were too unhappy for too long and wandered away in ${formatYear(d.year)}.`
          : state.lostTo === "behind"
          ? `${who} never learned to farm. By ${formatYear(d.year)} the peoples around them had moved on, and they were left behind.`
          : state.lostTo === "collapse"
          ? `${who} used up the land that fed them. With the forests gone and the soil worn out, they had to leave in ${formatYear(d.year)}.`
          : `${who} ran out of food in ${formatYear(d.year)}.`;

  return (
    <div className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center overflow-y-auto bg-black/60 p-2 md:p-6">
      <div className="pixel-panel my-auto w-[min(96vw,760px)] p-4 md:p-6" data-testid="debrief">
        <div className="flex items-center gap-3">
          <PixelIcon
            name={
              d.kind === "loss"
                ? state.lostTo === "unrest"
                  ? "sad"
                  : state.lostTo === "conquest"
                    ? "shield"
                    : state.lostTo === "behind"
                      ? "warning"
                    : state.lostTo === "time"
                      ? "warning"
                    : state.lostTo === "collapse"
                      ? "leaf"
                      : "skull"
                : "star"
            }
            size={48}
          />
          <div>
            <h2 className="font-pixel text-2xl font-bold md:text-3xl">{heading}</h2>
            <p className="text-sm text-stone-600">{sub}</p>
          </div>
        </div>

        <div className={cn("font-pixel mt-4 border-l-4 px-3 py-2", tier.tone)} data-testid="ending-tier">
          <div className="text-lg font-semibold">{tier.title}</div>
          <p className="text-sm">
            {d.kind === "loss" && state.lostTo === "collapse"
              ? "People can't outgrow the land that feeds them. A village that lasts takes only what the forest and soil can grow back."
              : tier.text}
          </p>
        </div>

        {state.mode === "last" && d.kind === "final" && <Hindsight state={state} year={d.year} />}

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <h3 className="font-pixel mb-1 font-semibold text-emerald-800">What you achieved</h3>
            <ul className="font-pixel flex flex-col gap-0.5 text-sm">
              <Row label="Most people at once" value={Math.round(d.stats.peakPopulation)} />
              <Row label="Buildings built" value={d.stats.built} />
              <Row label="Advancements discovered" value={d.researched} />
              {state.mode !== "last" && (
                <>
                  <Row label="Raids driven off" value={d.stats.raidsWon} />
                  <Row label="Saplings planted" value={d.planted} />
                  <Row label="Lessons learned" value={d.lessons.length} />
                </>
              )}
            </ul>
          </div>
          <div>
            <h3 className="font-pixel mb-1 font-semibold text-red-800">What it cost</h3>
            <ul className="font-pixel flex flex-col gap-0.5 text-sm">
              <Row label="Forest lost near the village" value={`${Math.round((1 - d.forestLeft) * 100)}%`} bad={d.forestLeft < 0.8} />
              <Row
                label={`Time with Sustainability under ${MIN_SUSTAINABILITY_FOR_BEST_ENDING}`}
                value={`${Math.round(secs(d.stats.lowLandTicks) / 60)} min`}
                bad={d.stats.lowLandTicks > 0}
              />
              <Row label="Lives lost" value={lost} bad={lost > 0} />
              <li className="text-xs text-stone-500">
                famine {Math.round(deaths.famine)} · sickness {Math.round(deaths.disease)} · fire {Math.round(deaths.fire)} ·
                battle {Math.round(deaths.battle)}
                {deaths.accident ? ` · accidents ${Math.round(deaths.accident)}` : ""}
                {deaths.disaster ? ` · disasters ${Math.round(deaths.disaster)}` : ""}
              </li>
              <Row label="Raids lost" value={d.stats.raidsLost} bad={d.stats.raidsLost > 0} />
            </ul>
          </div>
        </div>

        <h3 className="font-pixel mb-1 mt-4 font-semibold">Where your people ended up</h3>
        <ul className="grid gap-1.5 md:grid-cols-2">
          {METERS.map((m) => {
            const v = d.meters[m.key];
            return (
              <li key={m.key} className="font-pixel flex items-center gap-2 text-sm">
                <PixelIcon name={m.icon} size={18} />
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between gap-2">
                    <span>{m.label}</span>
                    <span className="font-num text-base">{v}</span>
                  </div>
                  <div className="h-1.5 bg-stone-300">
                    <div
                      className={cn("h-full", v < 25 ? "bg-red-600" : v < 50 ? "bg-amber-500" : "bg-emerald-600")}
                      style={{ width: `${v}%` }}
                    />
                  </div>
                  <div className="text-[11px] text-[#1e4f9c]">{METER_SDG[m.key]}</div>
                </div>
              </li>
            );
          })}
        </ul>

        {d.lessons.length > 0 && (
          <>
            <h3 className="font-pixel mb-1 mt-4 font-semibold">What your people learned</h3>
            <ul className="flex flex-wrap gap-1.5">
              {d.lessons.map((id) => {
                const l = LESSONS.find((x) => x.id === id);
                return l ? (
                  <li key={id} className="font-pixel border-2 border-stone-400 bg-white px-2 py-0.5 text-xs" title={l.sdg}>
                    {l.title}
                  </li>
                ) : null;
              })}
            </ul>
          </>
        )}

        {/* The story is over (won or lost): post it to the leaderboard. */}
        {d.kind !== "era" && <SpeedrunPanel />}
        {d.kind !== "era" && <LeaderboardPanel />}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          {d.kind === "final" && (
            <button
              type="button"
              onClick={() => dispatch({ type: "dismissDebrief" })}
              className="pixel-btn font-pixel bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-500"
            >
              Keep playing
            </button>
          )}
          {d.kind === "era" ? (
            <button
              type="button"
              onClick={() => dispatch({ type: "enterEra" })}
              className="pixel-btn font-pixel bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-500"
            >
              Continue into the {ERAS[d.era + 1]?.name} era
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  clearSave();
                  onRestart();
                }}
                className="pixel-btn font-pixel bg-amber-400 px-4 py-2 font-semibold text-[#2b2119]"
              >
                New game
              </button>
              <a href={HOME} className="pixel-btn font-pixel bg-white px-4 py-2">
                Home
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// The call to move on: shown once the Stone Age goals are met, with a hint
// on what's missing once Agriculture is known.
// Always one line saying what to aim for next (hidden while the tutorial or a
// guided step is already telling the player).
// How each era ended, for its debrief ({who}: the people's name).
const ERA_ENDS: Record<number, string> = {
  0: "{who} are ready to settle down and farm for good.",
  1: "{who} beat Rome, and their silver coins travel far. The village is becoming a town.",
  2: "{who} came through the great drought, and their landmark stands.",
  3: "{who} survived the Black Death, and the first steam engines are turning.",
  4: "{who} came through the climate crisis, and the computers are humming.",
};

export function GoalLine() {
  const { state } = useGame();
  const compact = useCompact();
  const [full, setFull] = useState(false);
  if (state.mode === "last") return <ProblemsLine />;
  const goal = currentGoal(state);
  if (!goal) return null;
  const steps = goalSteps(state);
  // "How to get there": every step behind the goal, ticked off when done.
  const how =
    full && steps?.length ? (
      <ul className="pixel-panel pointer-events-auto mt-1 flex w-full max-w-[min(92vw,640px)] flex-col gap-1 px-3 py-2 text-left text-xs" data-testid="goal-steps">
        <li className="font-pixel font-semibold">How to get there</li>
        {steps.map((st) => (
          <li key={st.text} className={cn("flex gap-1.5", st.done ? "text-emerald-700" : "text-[#2b2119]")}>
            <span className="font-bold">{st.done ? "✓" : "○"}</span>
            {st.text}
          </li>
        ))}
      </ul>
    ) : null;
  if (compact)
    // Phones: one line; tap to read it all, with the steps.
    return (
      <div className="flex w-full flex-col items-stretch">
        <button
          type="button"
          onClick={() => setFull(!full)}
          aria-expanded={full}
          className="pixel-panel-dark font-pixel pointer-events-auto flex w-full items-start gap-1 px-2 py-1 text-left text-xs"
          data-testid="goal-line"
        >
          <span className={cn("flex-1", !full && "line-clamp-1")}>{goal}</span>
          <span className="text-amber-300">{full ? "▴" : "▾"}</span>
        </button>
        {how}
      </div>
    );
  return (
    <div className="pointer-events-none flex flex-col items-center">
      <button
        type="button"
        onClick={() => setFull(!full)}
        aria-expanded={full}
        title={steps?.length ? "Click to see how to get there" : undefined}
        className="pixel-panel-dark font-pixel pointer-events-auto max-w-[min(92vw,640px)] px-3 py-1 text-center text-xs hover:brightness-125"
        data-testid="goal-line"
      >
        {goal}
        {!!steps?.length && <span className="ml-1.5 text-amber-300">{full ? "▴" : "How? ▾"}</span>}
      </button>
      {how}
    </div>
  );
}

// Build to Last: what the game is about, before the clock starts. The game
// waits (paused) until the player presses Start.
export function LastIntro() {
  const { state, dispatch } = useGame();
  const [open, setOpen] = useState(() => state.mode === "last" && state.tick < 2);
  // Wait for the fly-in over the town to finish (or be skipped) first.
  const shot = useShot();
  if (!open || shot?.kind === "intro") return null;
  const close = () => {
    setOpen(false);
    dispatch({ type: "setSpeed", speed: 1 });
  };
  // Kept short on purpose: the guide shows the rest, one thing at a time.
  return (
    <div className="pointer-events-auto fixed inset-0 z-[46] flex items-center justify-center bg-black/50 p-3" data-testid="last-intro">
      <div className="pixel-panel w-[min(94vw,480px)] p-4">
        <h2 className="font-pixel text-2xl font-bold">{formatYear(state.year)}</h2>
        <p className="mt-1 text-sm">
          Your people are starting a town in the age of coal. Start with homes and food; there is time to tackle clean power and the air after that.
        </p>
        <ol className="font-pixel mt-3 flex flex-col gap-1 text-sm">
          {lastProblems(state).map((p, i) => (
            <li key={p.id} className="flex gap-2">
              <span className="font-bold text-amber-700">{i + 1}.</span>
              {p.title}
            </li>
          ))}
        </ol>
        <p className="mt-2 text-xs text-stone-600">Take one problem at a time, and solve all three by {LAST.deadline}. Your adviser will walk you through the first steps.</p>
        <button type="button" onClick={close} className="pixel-btn font-pixel mt-4 w-full bg-emerald-600 py-2 text-lg font-semibold text-white" data-testid="last-start">
          Start
        </button>
      </div>
    </div>
  );
}

// Build to Last's guided start: one short step at a time, with the hand.
export function LastTutorialPanel() {
  const { state, dispatch } = useGame();
  const step = state.mode === "last" && !state.dev ? LAST_TUTORIAL[state.lastStep ?? LAST_TUTORIAL.length] : undefined;
  if (!step) return null;
  return (
    <div className="pixel-panel pointer-events-auto relative z-[26] w-full p-2.5 md:p-3" data-testid="last-tutorial">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="font-pixel flex items-center gap-2 text-base font-semibold">
          <PixelIcon name="book" size={18} />
          Your adviser
        </span>
        <span className="font-num text-xs text-amber-800/70">
          {(state.lastStep ?? 0) + 1}/{LAST_TUTORIAL.length}
        </span>
      </div>
      <p className="text-sm font-semibold leading-snug md:text-base" data-testid="last-tutorial-text">
        {step.text}
      </p>
      <div className="mt-2 flex justify-end text-xs">
        <button type="button" onClick={() => dispatch({ type: "lastStep", from: -1 })} className="text-stone-500 underline" data-testid="last-tutorial-skip">
          Skip the guide
        </button>
      </div>
    </div>
  );
}

// The end of Build to Last: stars for how early, and your air against the real world's.
function Hindsight({ state, year }: { state: GameState; year: number }) {
  const track = state.lastTrack ?? [];
  const stars = year < LAST.stars[0] ? 3 : year < LAST.stars[1] ? 2 : 1;
  const end = Math.max(2020, Math.ceil(year));
  const top = Math.max(420, ...track.map((p) => p.ppm)) + 5;
  const low = 270;
  const W = 600;
  const H = 170;
  const x = (y: number) => 34 + ((y - LAST.startYear) / (end - LAST.startYear)) * (W - 44);
  const yPos = (ppm: number) => 10 + ((top - ppm) / (top - low)) * (H - 34);
  const line = (pts: [number, number][]) => pts.map(([a, b], i) => `${i ? "L" : "M"}${x(a).toFixed(1)},${yPos(b).toFixed(1)}`).join(" ");
  const real = REAL_CO2.filter(([y]) => y <= end);
  const yours: [number, number][] = track.map((p) => [p.year, p.ppm]);
  const realThen = REAL_CO2.reduce((best, p) => (Math.abs(p[0] - year) < Math.abs(best[0] - year) ? p : best));
  return (
    <div className="mt-4 border-2 border-[#2b2119] bg-white p-3" data-testid="hindsight">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-pixel font-semibold">Your town against the real world</h3>
        <span className="font-pixel text-3xl leading-none text-amber-500" aria-label={`${stars} of 3 stars`}>
          {"★".repeat(stars)}
          <span className="text-stone-300">{"★".repeat(3 - stars)}</span>
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-1 w-full" role="img" aria-label="Carbon in the air over time: your town and the real world">
        {[300, 350, 400].filter((v) => v < top).map((v) => (
          <g key={v}>
            <line x1={34} x2={W - 10} y1={yPos(v)} y2={yPos(v)} stroke="#e7e1d6" />
            <text x={30} y={yPos(v) + 4} fontSize={10} textAnchor="end" fill="#78716c">{v}</text>
          </g>
        ))}
        {[1850, 1900, 1950, 2000].filter((v) => v <= end).map((v) => (
          <text key={v} x={x(v)} y={H - 6} fontSize={10} textAnchor="middle" fill="#78716c">{v}</text>
        ))}
        <path d={line(real)} fill="none" stroke="#dc2626" strokeWidth={2.5} strokeDasharray="6 4" />
        {yours.length > 1 && <path d={line(yours)} fill="none" stroke="#059669" strokeWidth={3} />}
        <line x1={x(year)} x2={x(year)} y1={10} y2={H - 24} stroke="#2b2119" strokeDasharray="2 3" />
      </svg>
      <div className="font-pixel flex flex-wrap gap-x-4 text-xs">
        <span className="text-emerald-700">━ Your town (ppm of CO2)</span>
        <span className="text-red-600">╍ The real world</span>
      </div>
      <p className="mt-2 text-sm">
        You solved all three in <b>{Math.floor(year)}</b>. In the real world, CO2 was about {realThen[1]} ppm in {realThen[0]} and still rising, and in
        2020 it passed 410 ppm. Most of the world&apos;s power still comes from coal, oil and gas.
        {stars < 3 ? ` Finish before ${stars === 2 ? LAST.stars[0] : LAST.stars[1]} for another star.` : " Three stars: far ahead of history."}
      </p>
    </div>
  );
}

// Build to Last: the three big problems, each with a tick when solved.
function ProblemsLine() {
  const { state, dispatch } = useGame();
  const problems = lastProblems(state);
  const focus = lastFocus(state);
  // Click a problem to read how to solve it; click again to hide it.
  const [openId, setOpenId] = useState<string | null>(null);
  const open = problems.find((p) => p.id === openId);
  const pick = (id: string) => {
    setOpenId(openId === id ? null : id);
    // The guide's first step: look at a problem.
    if (state.lastStep === 0) dispatch({ type: "lastStep", from: 0 });
  };
  return (
    <div className="pointer-events-none flex flex-col items-center gap-1">
      <div className="pixel-panel-dark font-pixel pointer-events-auto flex max-w-[min(94vw,760px)] flex-col items-center px-2 py-1 text-xs" data-testid="problems">
        <div className="flex flex-wrap justify-center gap-x-1 gap-y-1">
          {problems.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => pick(p.id)}
              aria-expanded={openId === p.id}
              title={`${p.status}. Click for how to solve it.`}
              className={cn("flex items-center gap-1 px-1.5 py-0.5 hover:bg-white/10", openId === p.id && "bg-white/15", focus?.id === p.id && "outline outline-1 outline-amber-300/70")}
              data-testid={`problem-${p.id}`}
              data-guide={`problem-${p.id}`}
            >
              <span className={cn("inline-block h-3 w-3 border-2", p.done ? "border-emerald-300 bg-emerald-400" : "border-white/60")} />
              <span className={p.done ? "text-emerald-300" : ""}>{p.title}</span>
            </button>
          ))}
        </div>
        {focus && (
          <button type="button" onClick={() => pick(focus.id)} className="mt-0.5 text-[11px] text-white/80 hover:text-white" data-testid="problem-focus">
            <span className="text-amber-300">Now:</span> {focus.title} · {focus.status} <span className="text-amber-300 underline">How?</span>
          </button>
        )}
      </div>
      {open && (
        <button
          type="button"
          onClick={() => setOpenId(null)}
          className="pixel-panel font-pixel pointer-events-auto max-w-[min(94vw,520px)] px-3 py-2 text-left text-xs"
          data-testid="problem-how"
        >
          <span className="font-semibold">How to solve {open.title}: </span>
          {open.how}
          <span className="mt-1 block text-stone-500">Now: {open.status}</span>
        </button>
      )}
    </div>
  );
}

export function NextEraPrompt() {
  const { state, dispatch } = useGame();
  if (!readyForNextEra(state)) return null;
  return (
    <div className="pointer-events-none flex justify-center">
      <button
        type="button"
        onClick={() => dispatch({ type: "advanceEra" })}
        className="pixel-btn font-pixel pointer-events-auto animate-pulse bg-amber-400 px-4 py-2 text-sm font-semibold text-[#2b2119]"
        data-testid="next-era"
      >
        Your people are ready: enter the {ERAS[state.era + 1].name} era
      </button>
    </div>
  );
}
