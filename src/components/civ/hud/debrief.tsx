"use client";

import { HOME } from "@/lib/home";
import { useState, type ReactNode } from "react";
import { ERAS, formatYear, LESSONS, METERS, METER_SDG, MIN_SUSTAINABILITY_FOR_BEST_ENDING } from "@/game/content";
import { clearSave, currentGoal, lastProblems, makeDebrief, readyForNextEra, secs } from "@/game/engine";
import type { Debrief as DebriefData } from "@/game/types";
import { useGame } from "@/components/civ/game-provider";
import { LeaderboardPanel } from "./online";
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
        ? `${who} reached Type I on the Kardashev scale (${(d.kardashev ?? 1).toFixed(2)}): the whole planet runs on clean energy${d.tipped ? ", though the climate tipped on the way" : ", and the climate held"}. Here is the whole story, from the first fire.`
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

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <h3 className="font-pixel mb-1 font-semibold text-emerald-800">What you achieved</h3>
            <ul className="font-pixel flex flex-col gap-0.5 text-sm">
              <Row label="Most people at once" value={Math.round(d.stats.peakPopulation)} />
              <Row label="Buildings built" value={d.stats.built} />
              <Row label="Advancements discovered" value={d.researched} />
              <Row label="Raids driven off" value={d.stats.raidsWon} />
              <Row label="Saplings planted" value={d.planted} />
              <Row label="Lessons learned" value={d.lessons.length} />
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
  if (compact)
    // Phones: one line; tap to read it all.
    return (
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
    );
  return (
    <div className="pointer-events-none flex justify-center">
      <span className="pixel-panel-dark font-pixel max-w-[min(92vw,640px)] px-3 py-1 text-center text-xs" data-testid="goal-line">
        {goal}
      </span>
    </div>
  );
}

// Build to Last: the three big problems, each with a tick when solved.
function ProblemsLine() {
  const { state } = useGame();
  const problems = lastProblems(state);
  return (
    <div className="pointer-events-none flex justify-center">
      <div className="pixel-panel-dark font-pixel flex max-w-[min(94vw,760px)] flex-wrap justify-center gap-x-4 gap-y-1 px-3 py-1 text-xs" data-testid="problems">
        {problems.map((p) => (
          <span key={p.id} className="flex items-center gap-1" title={p.status} data-testid={`problem-${p.id}`}>
            <span className={cn("inline-block h-3 w-3 border-2", p.done ? "border-emerald-300 bg-emerald-400" : "border-white/60")} />
            <span className={p.done ? "text-emerald-300" : ""}>{p.title}</span>
            <span className="text-white/60">· {p.status}</span>
          </span>
        ))}
      </div>
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
