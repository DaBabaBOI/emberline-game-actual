"use client";

import { BUILDINGS, TRAIN_COST, TREE_BY_ID } from "@/game/content";
import {
  buildingCost,
  canAfford,
  consumption,
  defenseStrength,
  housingCapacity,
  isUnlocked,
  production,
  warriorCap,
} from "@/game/engine";
import { useGame } from "@/components/civ/game-provider";
import { cn } from "@/lib/utils";

const COST_ICONS: Record<string, string> = { wood: "🪵", stone: "🪨", food: "🍖", currency: "🐚", knowledge: "💡" };

function rate(n: number) {
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}`;
}

export function BottomBar() {
  const { state, dispatch, selected, setSelected, setPanel } = useGame();
  const prod = production(state);
  const net = prod.food - consumption(state);
  const eraBuildings = BUILDINGS.filter((b) => b.era <= state.era);

  return (
    <div className="pointer-events-auto absolute inset-x-0 bottom-3 flex justify-center px-3">
      <div className="flex max-w-full items-stretch gap-3 rounded-2xl bg-slate-950/65 p-2 text-white shadow-lg ring-1 ring-white/10 backdrop-blur">
        <div className="hidden flex-col justify-center gap-0.5 border-r border-white/10 pr-3 text-[11px] text-white/80 md:flex">
          <span title="Housing">🏠 {Math.floor(state.population)}/{housingCapacity(state)}</span>
          <span title="Food per second" className={net < 0 ? "text-red-300" : ""}>🍖 {rate(net)}/s</span>
          <span title="Wood per second">🪵 {rate(prod.wood)}/s</span>
          <span title="Knowledge per second">💡 {rate(prod.knowledge)}/s</span>
        </div>

        <div className="flex gap-1.5 overflow-x-auto">
          {eraBuildings.map((b) => {
            const unlocked = isUnlocked(state, b);
            const cost = buildingCost(state, b);
            const affordable = canAfford(state, cost);
            const active = selected === b.id;
            return (
              <button
                key={b.id}
                type="button"
                disabled={!unlocked}
                onClick={() => setSelected(active ? null : b.id)}
                title={
                  unlocked
                    ? b.description
                    : `Research ${TREE_BY_ID[b.requires ?? ""]?.name ?? "more"} to unlock`
                }
                className={cn(
                  "flex w-20 shrink-0 flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-center transition",
                  active ? "bg-amber-400 text-slate-950" : "bg-white/5 hover:bg-white/15",
                  !unlocked && "cursor-not-allowed opacity-35",
                )}
              >
                <span className="text-xl leading-none">{unlocked ? b.icon : "🔒"}</span>
                <span className="text-[11px] font-medium leading-tight">{b.name}</span>
                <span className={cn("flex gap-1 text-[10px]", !affordable && !active && "text-red-300")}>
                  {Object.entries(cost).map(([k, v]) => (
                    <span key={k}>
                      {COST_ICONS[k]}
                      {v}
                    </span>
                  ))}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex gap-1.5 border-l border-white/10 pl-3">
          <ArmyButton />
          <button
            type="button"
            onClick={() => dispatch({ type: "scout" })}
            disabled={state.resources.food < 10}
            title="Send scouts to reveal new land (costs 10 food)"
            className="flex w-16 flex-col items-center justify-center gap-0.5 rounded-xl bg-white/5 text-[11px] hover:bg-white/15 disabled:opacity-40"
          >
            <span className="text-xl leading-none">🧭</span>
            Scout
          </button>
          <button
            type="button"
            onClick={() => setPanel("tree")}
            title="Research new technology and see your goals"
            className="flex w-24 flex-col items-center justify-center gap-0.5 rounded-xl bg-emerald-500/25 text-[11px] hover:bg-emerald-500/40"
          >
            <span className="text-xl leading-none">✨</span>
            Advancements
          </button>
          {state.flags.rocket && (
            <button
              type="button"
              title="Zoom out to space"
              className="flex w-16 flex-col items-center justify-center gap-0.5 rounded-xl bg-indigo-500/30 text-[11px] hover:bg-indigo-500/50"
            >
              <span className="text-xl leading-none">🚀</span>
              Space
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ArmyButton() {
  const { state, dispatch } = useGame();
  const cap = warriorCap(state);
  const full = state.soldiers >= cap;
  const affordable = canAfford(state, TRAIN_COST);
  const title =
    cap === 0
      ? "Build a War Camp to train warriors"
      : full
        ? "All War Camps are full. Build another to train more."
        : `Train a warrior (🍖${TRAIN_COST.food} 🪵${TRAIN_COST.wood}). Defense: ${defenseStrength(state)}`;
  return (
    <button
      type="button"
      onClick={() => dispatch({ type: "train" })}
      disabled={cap === 0 || full || !affordable}
      title={title}
      className="flex w-20 flex-col items-center justify-center gap-0.5 rounded-xl bg-red-500/20 text-[11px] hover:bg-red-500/35 disabled:opacity-45"
    >
      <span className="text-xl leading-none">🗡️</span>
      Train {state.soldiers}/{cap}
      <span className="text-[10px] text-white/70">
        🍖{TRAIN_COST.food} 🪵{TRAIN_COST.wood}
      </span>
    </button>
  );
}
