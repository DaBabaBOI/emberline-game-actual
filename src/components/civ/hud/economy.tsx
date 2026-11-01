"use client";

import { useGame } from "@/components/civ/game-provider";
import { PixelIcon } from "@/components/civ/pixel-icon";
import { ECONOMY, INCOME, LEVELS, economyMoodParts, hasEconomy, incomeLines, wageBill } from "@/game/economy";
import { incomeNow } from "@/game/engine";
import { ERAS } from "@/game/content";
import type { IconId } from "@/game/sprites";
import type { EconomySystem, GameState, Wage } from "@/game/types";
import { cn } from "@/lib/utils";

// The economy panel: how rich each person is (and why), the challenges and
// the goal of the town's income level, how work is organised (free market,
// shared work or mixed), what people are paid, and how fair incomes are.
export function EconomyPanel() {
  const { state, dispatch, setPanel } = useGame();
  if (!hasEconomy(state)) return null;
  const eco = state.economy;
  const income = incomeNow(state);
  const level = state.income?.level ?? "low";
  const info = LEVELS[level];
  const [mid, high] = incomeLines(state);
  const coin = ERAS[state.era].currency.toLowerCase();
  const luck = state.income?.luck ?? 1;
  const moods = economyMoodParts(state);
  // Each wage's cost a day, at today's numbers.
  const costOf = (wage: Wage) => wageBill({ ...state, economy: eco ? { ...eco, wage } : { system: "mixed", wage, inequality: 25, changed: -1e6, cycle: null, nextCycle: 0 } } as GameState) * 10;
  return (
    <div className="pointer-events-auto absolute inset-0 z-[27] flex items-center justify-center bg-black/30" data-testid="economy-panel">
      <div className="pixel-panel max-h-[90vh] w-[min(95vw,720px)] overflow-y-auto p-4 text-xs md:text-sm">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-pixel flex items-center gap-2 text-lg font-bold">
            <PixelIcon name="scales" size={22} />
            Economy
          </h3>
          <button type="button" onClick={() => setPanel(null)} className="font-pixel text-sm underline">
            Close
          </button>
        </div>

        {/* How rich we are, and why. */}
        <section className="border-2 border-[#140e0a] bg-white/60 p-3" data-testid="income-level">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-pixel px-2 py-0.5 text-sm font-bold text-white" style={{ background: info.colour }}>
              {info.short}
            </span>
            <span className="font-pixel text-base font-semibold">{info.name} nation</span>
            <span className="ml-auto font-num text-sm">
              {income.perPerson} {coin} a person a day
            </span>
          </div>
          {/* Low | middle | high, and where we are. */}
          <div className="relative mt-2 h-3 w-full border-2 border-black/70 bg-amber-700/40">
            <div className="absolute inset-y-0 bg-blue-600/40" style={{ left: `${(mid / (high * 1.4)) * 100}%`, width: `${((high - mid) / (high * 1.4)) * 100}%` }} />
            <div className="absolute inset-y-0 right-0 bg-emerald-600/50" style={{ left: `${(high / (high * 1.4)) * 100}%` }} />
            <div className="absolute -top-1 h-4 w-1 bg-black" style={{ left: `${Math.min(99, (income.perPerson / (high * 1.4)) * 100)}%` }} />
          </div>
          <div className="mt-0.5 flex justify-between text-[10px] text-stone-600">
            <span>Low</span>
            <span>Middle from {mid}</span>
            <span>High from {high}</span>
          </div>
          <p className="mt-2 text-[11px] font-semibold">What each person earns comes from:</p>
          <ul className="mt-0.5 grid gap-x-4 sm:grid-cols-2" data-testid="income-parts">
            {income.parts.map((p) => (
              <li key={p.label} className="flex justify-between gap-2 text-[11px]">
                <span>{p.label}</span>
                <span className={cn("font-num", p.good ? "text-emerald-700" : "text-red-700")}>{p.value}</span>
              </li>
            ))}
          </ul>
          <p className="mt-1 text-[10px] text-stone-500">
            The island&apos;s luck (×{luck}) is its soil, ores, fish and where the trade winds blow: it shifts now and then. What counts as rich rises each era.
          </p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <div>
              <p className="text-[11px] font-semibold">Challenges</p>
              <ul className="list-disc pl-4 text-[11px] text-stone-700">
                {info.challenges.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-semibold">Goal</p>
              <p className="text-[11px] text-stone-700">{info.goal}</p>
              {level !== "high" && INCOME.rewards[level === "low" ? "middle" : "high"] && !(state.income?.reached ?? []).includes(level === "low" ? "middle" : "high") && (
                <p className="mt-0.5 text-[11px] text-emerald-700">Reward: +{INCOME.rewards[level === "low" ? "middle" : "high"]!.knowledge} Knowledge the first time.</p>
              )}
            </div>
          </div>
        </section>

        {/* How work is organised. */}
        <h4 className="font-pixel mt-3 font-semibold">How we work{!eco && <span className="ml-2 text-amber-700">Choose one!</span>}</h4>
        <div className="mt-1 grid gap-2 sm:grid-cols-3">
          {(Object.keys(ECONOMY.systems) as EconomySystem[]).map((id) => {
            const sys = ECONOMY.systems[id];
            const on = eco?.system === id;
            const pct = (k: number) => `${k >= 1 ? "+" : "−"}${Math.round(Math.abs(k - 1) * 100)}%`;
            return (
              <button
                key={id}
                type="button"
                onClick={() => dispatch({ type: "setEconomy", system: id })}
                className={cn("border-2 p-2 text-left", on ? "border-amber-500 bg-amber-100" : "border-[#140e0a] bg-white/60 hover:bg-white")}
                data-testid={`economy-${id}`}
              >
                <span className="font-pixel flex items-center gap-1.5 font-semibold">
                  <PixelIcon name={sys.icon as IconId} size={18} />
                  {sys.name}
                </span>
                <span className="block text-[10px] italic text-stone-500">{sys.real}</span>
                <span className="mt-1 block text-[11px]">{sys.blurb}</span>
                <span className="mt-1 block text-[10px] text-stone-600">
                  Money {pct(sys.coins)} · goods {pct(sys.goods)} · food {pct(sys.food)} · knowledge {pct(sys.knowledge)}
                  {sys.mood ? ` · happiness +${sys.mood}` : ""} · inequality heads to {sys.pull}
                </span>
                {on ? (
                  <span className="font-pixel mt-1 block text-[11px] text-amber-700">Our way now</span>
                ) : (
                  <span className="font-pixel mt-1 block text-[11px] text-stone-500">{eco ? "Change to this (people need time to get used to it)" : "Choose"}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Pay. */}
        {eco && (
          <>
            <h4 className="font-pixel mt-3 font-semibold">Wages{eco.system === "shared" ? " (shared out as rations and pay)" : ""}</h4>
            <div className="mt-1 grid grid-cols-3 gap-2">
              {(Object.keys(ECONOMY.wages) as Wage[]).map((w) => {
                const wage = ECONOMY.wages[w];
                const on = eco.wage === w;
                return (
                  <button
                    key={w}
                    type="button"
                    onClick={() => dispatch({ type: "setWage", wage: w })}
                    className={cn("border-2 p-2 text-left", on ? "border-amber-500 bg-amber-100" : "border-[#140e0a] bg-white/60 hover:bg-white")}
                    data-testid={`wage-${w}`}
                  >
                    <span className="font-pixel block font-semibold">{wage.name}</span>
                    <span className="block text-[11px]">
                      {Math.round(costOf(w) * 10) / 10} {coin} a day
                    </span>
                    <span className="block text-[10px] text-stone-600">
                      Happiness {wage.mood > 0 ? "+" : ""}
                      {wage.mood} · work {wage.work >= 1 ? "+" : "−"}
                      {Math.round(Math.abs(wage.work - 1) * 100)}%
                    </span>
                  </button>
                );
              })}
            </div>
            {eco.unpaid && <p className="mt-1 font-semibold text-red-700">We can&apos;t pay the wages! Earn more money, or lower the wages.</p>}

            {/* Fairness. */}
            <h4 className="font-pixel mt-3 font-semibold">How fair incomes are</h4>
            <div className="mt-1 h-3 w-full border-2 border-black/70 bg-gradient-to-r from-emerald-500 via-amber-400 to-red-600" data-testid="inequality">
              <div className="h-full w-1 bg-black" style={{ marginLeft: `${Math.min(99, eco.inequality)}%` }} />
            </div>
            <div className="mt-0.5 flex justify-between text-[10px] text-stone-600">
              <span>Everyone about the same</span>
              <span>{Math.round(eco.inequality)} / 100</span>
              <span>A few very rich, many poor</span>
            </div>
            {eco.cycle && state.tick < eco.cycle.until && (
              <p className={cn("mt-1 font-semibold", eco.cycle.kind === "boom" ? "text-emerald-700" : "text-red-700")}>
                {eco.cycle.kind === "boom" ? "A boom: much more money for now." : "A bust: hard times, less money for now."}
              </p>
            )}
            {moods.length > 0 && (
              <p className="mt-1 text-[11px]">
                Happiness from the economy:{" "}
                {moods.map((m) => (
                  <span key={m.label} className={cn("mr-2", m.value >= 0 ? "text-emerald-700" : "text-red-700")}>
                    {m.label} {m.value > 0 ? "+" : ""}
                    {m.value}
                  </span>
                ))}
              </p>
            )}
          </>
        )}
        <p className="font-pixel mt-3 flex items-start gap-1.5 border-l-4 border-[#1e4f9c] bg-[#1e4f9c]/5 px-2 py-1.5 text-[11px] text-[#1e4f9c]">
          <PixelIcon name="leaf" size={14} />
          <span>
            In the real world: countries are grouped as low-, middle- and high-income by what each person earns. UN Goal 8 is decent work and fair pay for everyone, and Goal 10 is to reduce
            inequality within and between countries.
          </span>
        </p>
      </div>
    </div>
  );
}
