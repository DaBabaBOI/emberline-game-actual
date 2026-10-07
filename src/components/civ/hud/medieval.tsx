"use client";

// The Medieval era's screens: choosing the landmark that carries the town into
// the Middle Ages, the two kingdoms, ships, and the Black Death.

import { CONQUEST, KINGDOMS, KINGDOM_RAID, LANDMARKS, PLAGUE, DIPLOMACY, REBELLION, TICK_SECONDS } from "@/game/content";
import {
  canAfford,
  crushOdds,
  rebelDemands,
  giftCost,
  giftError,
  inPlague,
  kingdomRaidError,
  moodOf,
  plagueProtection,
  plagueShield,
  plagueToll,
  raidOdds,
  conquestError,
  conquestOdds,
  secs,
  raidParty,
  treatyError,
} from "@/game/engine";
import type { KingdomId, LandmarkId, Resources } from "@/game/types";
import type { IconId } from "@/game/sprites";
import { useGame } from "@/components/civ/game-provider";
import { PixelIcon } from "@/components/civ/pixel-icon";
import { Countdown } from "./countdown";
import { cn } from "@/lib/utils";

const COST_ICONS: Record<keyof Resources, IconId> = { wood: "log", stone: "rock", food: "meat", currency: "coin", knowledge: "bulb" };

function CostLine({ cost }: { cost: Partial<Resources> }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {Object.entries(cost).map(([k, v]) => (
        <span key={k} className="inline-flex items-center gap-0.5">
          <PixelIcon name={COST_ICONS[k as keyof Resources]} size={11} />
          {v}
        </span>
      ))}
    </span>
  );
}

// After the drought: pick the landmark to build (it opens the Middle Ages).
export function LandmarkPicker() {
  const { state, dispatch } = useGame();
  if (state.era !== 2 || !state.droughtDone || state.landmark || state.debrief || state.phase !== "playing") return null;
  return (
    <div className="pixel-panel pointer-events-auto w-[min(92vw,640px)] p-3 text-xs md:text-sm" data-testid="landmark-picker">
      <p className="font-pixel mb-2 font-semibold">Choose a great landmark. Built in three stages, it carries the town into the Middle Ages.</p>
      <div className="grid gap-2 sm:grid-cols-3">
        {(Object.keys(LANDMARKS) as LandmarkId[]).map((id) => {
          const l = LANDMARKS[id];
          return (
            <button
              key={id}
              type="button"
              onClick={() => dispatch({ type: "chooseLandmark", kind: id })}
              className="pixel-btn flex flex-col items-start gap-1 bg-white p-2 text-left hover:bg-emerald-50"
              data-testid={`landmark-${id}`}
            >
              <span className="font-pixel flex items-center gap-1.5 font-semibold">
                <PixelIcon name={l.icon} size={18} />
                {l.name}
              </span>
              <span className="text-[11px] text-stone-600">{l.bonus}</span>
              <span className="mt-auto text-[10px] text-stone-500">
                {l.stages.map((c, i) => (
                  <span key={i} className="block">
                    Stage {i + 1}: <CostLine cost={c} />
                  </span>
                ))}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// The Black Death: the warning (with the harbour choice and how ready we are),
// then how it is going.
export function PlagueBanner() {
  const { state, dispatch } = useGame();
  const p = state.plague!;
  const on = inPlague(state);
  const pop = Math.floor(state.population);
  const toll = plagueToll(state);
  const parts = plagueProtection(state);
  const ready = Math.round((Math.max(0, plagueShield(state)) / PLAGUE.maxProtection) * 100);
  return (
    <div className="pointer-events-none flex justify-center" data-testid="plague-banner">
      <div
        className={cn(
          "font-pixel flex w-[min(92vw,560px)] flex-col gap-1.5 border-[3px] border-[#140e0a] px-4 py-2 text-xs text-white md:text-sm",
          on ? "bg-[#3b1f2b]/95" : "bg-[#4a3b2e]/95",
        )}
      >
        <span className="flex items-start gap-2 font-semibold">
          <PixelIcon name="rat" size={20} />
          <span>
            {on ? (
              <>
                The Black Death is here. {Math.round(p.deaths)} have died so far. It passes in <Countdown ticks={Math.max(0, p.endTick - state.tick)} />s.
              </>
            ) : (
              <>
                A great sickness is coming by ship. It reaches us in <Countdown ticks={Math.max(0, p.startTick - state.tick)} />s and lasts{" "}
                {minutes(secs(PLAGUE.ticks))} minutes.
              </>
            )}
          </span>
        </span>
        <span className="text-[11px] text-white/85">
          Ready: {ready}%. As things stand it would take about {Math.round(toll * pop)} of {pop} people ({Math.round(toll * 100)}%).
        </span>
        {parts.length > 0 && (
          <ul className="text-[11px] text-white/75">
            {parts.map((part) => (
              <li key={part.label} className={part.value < 0 ? "text-red-300" : ""}>
                {part.value < 0 ? "−" : "+"} {part.label}
              </li>
            ))}
          </ul>
        )}
        <span className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => dispatch({ type: "harbour", closed: !p.closed })}
            className={cn("pixel-btn pointer-events-auto px-2 py-1 text-xs", p.closed ? "bg-emerald-700 hover:bg-emerald-600" : "bg-red-800 hover:bg-red-700")}
            data-testid="harbour-toggle"
          >
            {p.closed ? "Open the harbour again" : "Close the harbour"}
          </button>
          <span className="text-[11px] text-white/70">
            {p.closed
              ? "No ships, no sea trade, no caravans while it is closed."
              : `Closing it stops trade and upsets both kingdoms${on ? ", and helps less now it is here" : ""}.`}
          </span>
        </span>
        <span className="text-[11px] text-white/60">Also helps: Quarantine (advancement), latrines and clean streets, Healer&apos;s Huts.</span>
      </div>
    </div>
  );
}

// 270 s -> "4.5", 300 s -> "5".
const minutes = (s: number) => String(Math.round((s / 60) * 10) / 10);

const MOOD_STYLE = { friendly: "bg-emerald-600", wary: "bg-amber-500", hostile: "bg-red-700" } as const;

// The two kingdoms: how they feel about us, and what we can do about it.
export function KingdomsPanel() {
  const { state, dispatch, setPanel } = useGame();
  if (!state.kingdoms) return null;
  const party = raidParty(state);
  return (
    // Above Elder Ama's panels (z-26): the game waits while it is open.
    <div className="pointer-events-auto absolute inset-0 z-[27] flex items-center justify-center bg-black/30" data-testid="kingdoms-panel">
      <div className="pixel-panel w-[min(94vw,640px)] p-4 text-xs md:text-sm">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-pixel flex items-center gap-2 text-lg font-bold">
            <PixelIcon name="crown" size={22} />
            {state.era >= 4 ? "The nations" : "The kingdoms"}
          </h3>
          <button type="button" onClick={() => setPanel(null)} className="font-pixel text-sm underline">
            Close
          </button>
        </div>
        <p className="mb-3 text-[11px] text-stone-600">
          {state.era >= 4 ? "They are nations now. " : ""}Friendly ones trade with us; hostile ones send armies. Moods slowly drift back toward wary. Ships that reach their coasts, caravans and
          gifts please them; castles worry them.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {(Object.keys(state.kingdoms) as KingdomId[]).map((id) => {
            const k = state.kingdoms![id];
            const mood = moodOf(k.mood);
            const gift = giftError(state, id);
            const treaty = treatyError(state, id);
            const raid = kingdomRaidError(state, id);
            const odds = Math.round(raidOdds(state, id) * 100);
            const conquest = conquestError(state, id);
            const conquestChance = Math.round(conquestOdds(state, id) * 100);
            return (
              <div key={id} className="border-2 border-[#140e0a] bg-white/60 p-2" data-testid={`kingdom-${id}`}>
                <div className="font-pixel flex items-center justify-between font-semibold">
                  <span className="capitalize">{KINGDOMS[id].name.replace(/^the /, "")}</span>
                  <span className={cn("px-1.5 text-[11px] text-white", k.conquered ? "bg-[#5b6f8a]" : MOOD_STYLE[mood])}>
                    {k.conquered ? "ours" : mood}
                    {k.treaty ? " · treaty" : ""}
                  </span>
                </div>
                <p className="mb-1 text-[11px] text-stone-600">{KINGDOMS[id].blurb}</p>
                {/* -100 .. 100, with the wary band in the middle. */}
                <div className="relative mb-2 h-2 border border-[#140e0a] bg-stone-200">
                  <div className={cn("absolute inset-y-0 left-1/2", MOOD_STYLE[mood])} style={k.mood >= 0 ? { width: `${k.mood / 2}%` } : { width: `${-k.mood / 2}%`, transform: "translateX(-100%)" }} />
                  <div className="absolute inset-y-0 left-1/2 w-px bg-[#140e0a]" />
                </div>
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    disabled={!!gift}
                    onClick={() => dispatch({ type: "gift", kingdom: id })}
                    className="pixel-btn flex justify-between bg-amber-300 px-2 py-1 text-left text-[#2b2119] disabled:opacity-40"
                    title={gift ?? `Mood +${DIPLOMACY.gift.mood}`}
                  >
                    <span>Send gifts</span>
                    <CostLine cost={giftCost(state, id)} />
                  </button>
                  <button
                    type="button"
                    disabled={!!treaty}
                    onClick={() => dispatch({ type: "treaty", kingdom: id })}
                    className="pixel-btn flex justify-between bg-emerald-300 px-2 py-1 text-left text-[#2b2119] disabled:opacity-40"
                    title={treaty ?? "Trade every day, and no war while it holds"}
                  >
                    <span>Treaty</span>
                    <CostLine cost={{ currency: DIPLOMACY.treaty.coins }} />
                  </button>
                  <button
                    type="button"
                    disabled={!!raid}
                    onClick={() => dispatch({ type: "raidKingdom", kingdom: id })}
                    className="pixel-btn flex justify-between bg-red-800 px-2 py-1 text-left text-white disabled:opacity-40"
                    title={raid ?? "They will be furious, and their army will come for revenge"}
                    data-testid={`raid-${id}`}
                  >
                    <span>Raid them</span>
                    <span className="text-[11px]">{raid ? "" : `${party.sent} warriors · ${odds}% chance`}</span>
                  </button>
                  <button
                    type="button"
                    disabled={!!conquest}
                    onClick={() => dispatch({ type: "conquer", kingdom: id })}
                    className="pixel-btn flex justify-between bg-[#3b0d0d] px-2 py-1 text-left text-white disabled:opacity-40"
                    title={conquest ?? "Take the whole kingdom: their island becomes ours and they pay tribute. Many warriors will fall."}
                    data-testid={`conquer-${id}`}
                  >
                    <span>Conquer them</span>
                    <span className="text-[11px]">{conquest ? "" : `all ${state.soldiers} warriors · ${conquestChance}% chance`}</span>
                  </button>
                  {k.conquered ? (
                    <span className="text-[10px] text-emerald-800">
                      Ours: they pay about {Math.round((CONQUEST.tribute.currency * 60) / TICK_SECONDS)} coins and {Math.round((CONQUEST.tribute.food * 60) / TICK_SECONDS)} food a minute, and their island is ours to build on.
                    </span>
                  ) : (
                    !conquest && (
                      <span className="text-[10px] text-red-900">
                        Conquest: about {Math.round(CONQUEST.losses.won * 100)}% of the army falls even if we win, our people mourn (−{-CONQUEST.happiness} happiness), and the other kingdom will fear and hate us.
                      </span>
                    )
                  )}
                  <span className="text-[10px] text-stone-500">
                    {gift && gift !== "Not enough coins" ? `Gifts: ${gift}. ` : ""}
                    {treaty ? `Treaty: ${treaty}. ` : ""}
                    {raid ? `Raid: ${raid}.` : `A raid brings back ${Object.entries(KINGDOM_RAID.loot[id]).map(([r, v]) => `${v} ${r === "currency" ? "coins" : r}`).join(" and ")} if it wins, and makes them hostile either way.`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Unrest, then rebels with arms: what is happening, and what we can do.
export function RebellionBanner() {
  const { state, dispatch } = useGame();
  const r = state.rebellion;
  if (!r) return null;
  const risen = r.stage === "risen";
  const demands = rebelDemands(state);
  const odds = Math.round(crushOdds(state) * 100);
  return (
    <div className="pointer-events-none flex justify-center" data-testid="rebellion-banner">
      <div className={cn("font-pixel flex w-[min(92vw,560px)] flex-col gap-1.5 border-[3px] border-[#140e0a] px-4 py-2 text-xs text-white md:text-sm", risen ? "bg-[#5a1414]/95" : "bg-[#4a3b2e]/95")}>
        <span className="flex items-start gap-2 font-semibold">
          <PixelIcon name={risen ? "sword" : "sad"} size={20} />
          <span>
            {risen ? (
              <>
                Rebellion! {r.rebels} of our people have taken up arms. If nothing is done they sack the stores in{" "}
                <Countdown ticks={Math.max(0, r.sackTick - state.tick)} />s.
              </>
            ) : (
              <>
                Unrest in the streets. Happiness is {state.meters.happiness}: if it stays under {REBELLION.mood}, people rise up in{" "}
                <Countdown ticks={Math.max(0, r.riseTick - state.tick)} />s.
              </>
            )}
          </span>
        </span>
        {risen ? (
          <span className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={state.soldiers < 1}
              onClick={() => dispatch({ type: "crushRebels" })}
              className="pixel-btn pointer-events-auto bg-red-800 px-2 py-1 text-xs hover:bg-red-700 disabled:opacity-40"
              title={state.soldiers < 1 ? "We have no warriors" : `People die on both sides, and happiness drops ${REBELLION.crushMood}`}
              data-testid="crush-rebels"
            >
              Crush them ({state.soldiers < 1 ? "no warriors" : `${odds}% chance`})
            </button>
            <button
              type="button"
              disabled={!canAfford(state, demands)}
              onClick={() => dispatch({ type: "meetDemands" })}
              className="pixel-btn pointer-events-auto flex items-center gap-1.5 bg-amber-300 px-2 py-1 text-xs text-[#2b2119] disabled:opacity-40"
              title={`They go home, and happiness rises ${REBELLION.demandMood}`}
              data-testid="meet-demands"
            >
              Meet their demands <CostLine cost={demands} />
            </button>
          </span>
        ) : (
          <span className="text-[11px] text-white/80">Raise happiness: food, homes, fires, a feast, healers. Happy people don&apos;t rebel.</span>
        )}
      </div>
    </div>
  );
}
