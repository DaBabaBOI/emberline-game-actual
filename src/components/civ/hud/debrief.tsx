"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ERAS, formatYear, LESSONS, METERS, METER_SDG, MIN_SUSTAINABILITY_FOR_BEST_ENDING, NEXT_ERA_POPULATION } from "@/game/content";
import { clearSave, makeDebrief, readyForNextEra, secs } from "@/game/engine";
import type { Debrief as DebriefData } from "@/game/types";
import { useGame } from "@/components/civ/game-provider";
import { PixelIcon } from "@/components/civ/pixel-icon";
import { cn } from "@/lib/utils";

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
  const tier = TIERS[d.kind === "loss" ? "lost" : d.tier];
  const deaths = d.stats.deaths;
  const lost = Math.round(deaths.famine + deaths.disease + deaths.fire + deaths.battle);
  const who = state.nation ?? "Your people";
  const heading =
    d.kind === "era"
      ? `The ${ERAS[d.era].name} is over`
      : d.kind === "final"
        ? "Your story is complete"
        : state.lostTo === "unrest"
          ? "The tribe has left"
          : state.lostTo === "conquest"
            ? "Conquered"
            : "Famine";
  const sub =
    d.kind === "era"
      ? `${who} are ready to settle down and farm for good. Here is how you got here.`
      : d.kind === "final"
        ? `${who} held back the Roman legion. Here is the whole story, from the first fire.`
        : state.lostTo === "conquest"
          ? `The Roman legion broke through in ${formatYear(d.year)} and ${who} lost their village.`
          : state.lostTo === "unrest"
          ? `${who} were too unhappy for too long and wandered away in ${formatYear(d.year)}.`
          : `${who} ran out of food in ${formatYear(d.year)}.`;

  return (
    <div className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center overflow-y-auto bg-black/60 p-2 md:p-6">
      <div className="pixel-panel my-auto w-[min(96vw,760px)] p-4 md:p-6" data-testid="debrief">
        <div className="flex items-center gap-3">
          <PixelIcon
            name={d.kind === "loss" ? (state.lostTo === "unrest" ? "sad" : state.lostTo === "conquest" ? "shield" : "skull") : "star"}
            size={48}
          />
          <div>
            <h2 className="font-pixel text-2xl font-bold md:text-3xl">{heading}</h2>
            <p className="text-sm text-stone-600">{sub}</p>
          </div>
        </div>

        <div className={cn("font-pixel mt-4 border-l-4 px-3 py-2", tier.tone)} data-testid="ending-tier">
          <div className="text-lg font-semibold">{tier.title}</div>
          <p className="text-sm">{tier.text}</p>
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
              <Link href="/" className="pixel-btn font-pixel bg-white px-4 py-2">
                Home
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// The call to move on: shown once the Stone Age goals are met, with a hint
// on what's missing once Agriculture is known.
export function NextEraPrompt() {
  const { state, dispatch } = useGame();
  if (state.era !== 0 || state.debrief || state.phase !== "playing") return null;
  if (!state.researched.includes("agriculture")) return null;
  const ready = readyForNextEra(state);
  return (
    <div className="pointer-events-none flex justify-center">
      {ready ? (
        <button
          type="button"
          onClick={() => dispatch({ type: "advanceEra" })}
          className="pixel-btn font-pixel pointer-events-auto animate-pulse bg-amber-400 px-4 py-2 text-sm font-semibold text-[#2b2119]"
          data-testid="next-era"
        >
          Your people are ready: enter the Ancient era
        </button>
      ) : (
        <span className="pixel-panel-dark font-pixel px-3 py-1 text-xs">
          Grow to {NEXT_ERA_POPULATION} people to enter the Ancient era (now {Math.floor(state.population)})
        </span>
      )}
    </div>
  );
}
