"use client";

import type { ReactNode } from "react";
import { BUILDINGS, LOW_WOOD_AFTER_BUY, TRAIN_COST, TREE_BY_ID, TUTORIAL } from "@/game/content";
import {
  buildingCost,
  canAfford,
  consumption,
  countBuildings,
  defenseStrength,
  DEMOLISH_TOOL,
  housingCapacity,
  isUnlocked,
  production,
  scoutCost,
  tutorialLocked,
  warriorCap,
} from "@/game/engine";
import type { Resources } from "@/game/types";
import type { IconId } from "@/game/sprites";
import { useGame } from "@/components/civ/game-provider";
import { PixelIcon } from "@/components/civ/pixel-icon";
import { cn } from "@/lib/utils";

const COST_ICONS: Record<keyof Resources, IconId> = {
  wood: "log",
  stone: "rock",
  food: "meat",
  currency: "coin",
  knowledge: "bulb",
};

function rate(n: number) {
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}`;
}

function Cost({ cost, bad, tight }: { cost: Partial<Resources>; bad?: boolean; tight?: boolean }) {
  return (
    <span
      className={cn("flex items-center gap-1 text-[10px]", bad ? "text-red-300" : tight && "text-amber-300")}
      title={tight && !bad ? `Buying this leaves less than ${LOW_WOOD_AFTER_BUY} wood` : undefined}
    >
      {Object.entries(cost).map(([k, v]) => (
        <span key={k} className="flex items-center gap-0.5">
          <PixelIcon name={COST_ICONS[k as keyof Resources]} size={11} />
          <span className="font-num">{v}</span>
        </span>
      ))}
    </span>
  );
}

function Stat({ icon, children, title, bad }: { icon: IconId; children: ReactNode; title: string; bad?: boolean }) {
  return (
    <span title={title} className={cn("flex items-center gap-1", bad && "text-red-300")}>
      <PixelIcon name={icon} size={12} />
      <span className="font-num">{children}</span>
    </span>
  );
}

function ToolButton({
  icon,
  label,
  onClick,
  disabled,
  title,
  tone,
  children,
  locked,
  guide,
}: {
  locked?: boolean;
  guide?: string;
  icon: IconId;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  title: string;
  tone: string;
  children?: ReactNode;
}) {
  return (
    <button
      type="button"
      data-guide={guide}
      onClick={onClick}
      disabled={disabled || locked}
      title={locked ? "Unlocks later in the tutorial" : title}
      className={cn(
        "pixel-btn flex min-w-16 flex-col items-center justify-center gap-0.5 px-2 py-1 text-[11px] disabled:opacity-40",
        locked ? "bg-[#4a3b2e]" : tone,
      )}
    >
      <PixelIcon name={locked ? "lock" : icon} size={24} />
      {label}
      {!locked && children}
    </button>
  );
}

export function BottomBar() {
  const { state, dispatch, selected, setSelected, setPanel } = useGame();
  const prod = production(state);
  const net = prod.food - consumption(state);
  const eraBuildings = BUILDINGS.filter((b) => b.era <= state.era);
  const inTutorial = state.tutorialStep < TUTORIAL.length;
  const counts = countBuildings(state);
  // After the tutorial, flag purchases that would leave the fires short of wood.
  const tight = (cost: Partial<Resources>) =>
    !inTutorial && (cost.wood ?? 0) > 0 && state.resources.wood - (cost.wood ?? 0) < LOW_WOOD_AFTER_BUY;

  return (
    <div className="pointer-events-auto absolute inset-x-0 bottom-3 flex justify-center px-3">
      <div className="pixel-panel-dark font-pixel flex min-w-0 max-w-full items-stretch gap-3 p-2">
        <div className="hidden flex-col justify-center gap-0.5 border-r-2 border-white/10 pr-3 text-[11px] text-white/85 md:flex">
          <Stat icon="hut" title="Housing">
            {Math.floor(state.population)}/{housingCapacity(state)}
          </Stat>
          <Stat
            icon="meat"
            title={`Food: +${prod.food.toFixed(1)}/s made, −${consumption(state).toFixed(1)}/s eaten by ${Math.floor(state.population)} people`}
            bad={net < 0}
          >
            {rate(net)}/s
          </Stat>
          <span className="font-num whitespace-nowrap text-[11px] text-white/60" title="More people eat more food">
            eat −{consumption(state).toFixed(1)}/s
          </span>
          <Stat icon="log" title="Wood per second" bad={prod.wood < 0}>
            {rate(prod.wood)}/s
          </Stat>
          <Stat icon="bulb" title="Knowledge per second">
            {rate(prod.knowledge)}/s
          </Stat>
        </div>

        <div className="flex min-w-0 gap-1.5 overflow-x-auto pb-1">
          {eraBuildings.map((b) => {
            const unlocked = isUnlocked(state, b);
            const cost = buildingCost(state, b);
            const affordable = canAfford(state, cost);
            const active = selected === b.id;
            const usedUp = inTutorial && unlocked && (counts[b.id] ?? 0) >= 1;
            return (
              <button
                key={b.id}
                type="button"
                data-guide={`build-${b.id}`}
                disabled={!unlocked || usedUp}
                onClick={() => setSelected(active ? null : b.id)}
                title={
                  usedUp
                    ? "Only one of each during the tutorial"
                    : unlocked
                    ? b.description
                    : tutorialLocked(state, b.id)
                      ? "Unlocks later in the tutorial"
                      : `Research ${TREE_BY_ID[b.requires ?? ""]?.name ?? "more"} to unlock`
                }
                className={cn(
                  "pixel-btn flex w-20 shrink-0 flex-col items-center gap-0.5 px-1 py-1.5 text-center",
                  active ? "bg-amber-400 text-[#2b2119]" : "bg-[#4a3b2e] hover:bg-[#5c4a3a]",
                  (!unlocked || usedUp) && "cursor-not-allowed opacity-40",
                )}
              >
                <PixelIcon name={unlocked ? b.icon : "lock"} size={24} />
                <span className="text-[11px] leading-tight">{b.name}</span>
                {usedUp ? (
                  <span className="text-[10px] text-emerald-300">built</span>
                ) : (
                  <Cost cost={cost} bad={!affordable && !active} tight={!active && tight(cost)} />
                )}
              </button>
            );
          })}
        </div>

        <div className="flex shrink-0 gap-1.5 border-l-2 border-white/10 pl-3">
          <ToolButton
            icon="coin"
            label="Sell"
            onClick={() => setSelected(selected === DEMOLISH_TOOL ? null : DEMOLISH_TOOL)}
            title="Sell a building to make room. You get half its cost back."
            tone={selected === DEMOLISH_TOOL ? "bg-amber-400 text-[#2b2119]" : "bg-[#4a3b2e] hover:bg-[#5c4a3a]"}
          />
          <ArmyButton />
          <ToolButton
            guide="tool-scout"
            locked={tutorialLocked(state, "scout")}
            icon="spyglass"
            label="Scout"
            onClick={() => dispatch({ type: "scout" })}
            disabled={!canAfford(state, scoutCost(state))}
            title="Send scouts to reveal new land. Each trip costs more than the last."
            tone="bg-[#4a3b2e] hover:bg-[#5c4a3a]"
          >
            <Cost cost={scoutCost(state)} bad={!canAfford(state, scoutCost(state))} tight={tight(scoutCost(state))} />
          </ToolButton>
          <ToolButton
            guide="tool-advancements"
            locked={tutorialLocked(state, "advancements")}
            icon="star"
            label="Advancements"
            onClick={() => setPanel("tree")}
            title="Research new technology and see your goals"
            tone="bg-emerald-700 hover:bg-emerald-600"
          />
          {state.flags.rocket && (
            <ToolButton icon="rocket" label="Space" title="Zoom out to space" tone="bg-indigo-700 hover:bg-indigo-600" />
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
        : `Train a warrior. Defense: ${defenseStrength(state)}`;
  return (
    <ToolButton
      guide="tool-train"
      locked={tutorialLocked(state, "train")}
      icon="sword"
      label={`Train ${state.soldiers}/${cap}`}
      onClick={() => dispatch({ type: "train" })}
      disabled={cap === 0 || full || !affordable}
      title={title}
      tone="bg-red-800 hover:bg-red-700"
    >
      <Cost cost={TRAIN_COST} />
    </ToolButton>
  );
}
