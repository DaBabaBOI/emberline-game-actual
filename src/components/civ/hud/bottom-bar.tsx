"use client";

import { useState, type ReactNode } from "react";
import { BUILDINGS, CANOE, LOW_WOOD_AFTER_BUY, PLANT_COST, SPEAR_COST, TRAIN_COST, TREE_BY_ID, TUTORIAL, WARRIORS_PER_CAMP } from "@/game/content";
import {
  affordableResearch,
  buildingCost,
  canAfford,
  caravanCost,
  caravanError,
  hostileKingdoms,
  nextVoyage,
  canoeError,
  canoeTrip,
  shipCost,
  shipError,
  waterSupply,
  consumption,
  countBuildings,
  defenseBreakdown,
  defenseStrength,
  DEMOLISH_TOOL,
  PLANT_TOOL,
  foodKeeps,
  foodSpoiling,
  housingCapacity,
  isUnlocked,
  perSecond,
  production,
  rainfall,
  scoutCost,
  spearmenOf,
  tutorialLocked,
  warriorCap,
} from "@/game/engine";
import type { Resources } from "@/game/types";
import type { IconId } from "@/game/sprites";
import { useGame } from "@/components/civ/game-provider";
import { PixelIcon } from "@/components/civ/pixel-icon";
import { cn } from "@/lib/utils";
import { useCompact } from "@/lib/use-compact";
import { Countdown } from "./countdown";

const COST_ICONS: Record<keyof Resources, IconId> = {
  wood: "log",
  stone: "rock",
  food: "meat",
  currency: "coin",
  knowledge: "bulb",
};

// Per-tick amount shown per real second.
function rate(n: number) {
  const s = perSecond(n);
  return `${s >= 0 ? "+" : ""}${s.toFixed(1)}`;
}

const perSec = (n: number) => perSecond(n).toFixed(1);

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

// How hard a building is on the land: tree stumps, or a leaf if it's gentle.
function LandImpact({ level }: { level: number }) {
  return (
    <span
      className="absolute right-0.5 top-0.5 flex"
      title={level ? `Hard on the land (${level}/3)` : "Gentle on the land"}
    >
      {level === 0 ? (
        <PixelIcon name="leaf" size={10} />
      ) : (
        Array.from({ length: level }, (_, i) => <PixelIcon key={i} name="stump" size={10} />)
      )}
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
  badge,
}: {
  // A small marker in the corner: something here is ready.
  badge?: string;
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
  const compact = useCompact();
  return (
    <button
      type="button"
      data-guide={guide}
      onClick={onClick}
      disabled={disabled || locked}
      title={locked ? "Unlocks later in the tutorial" : title}
      className={cn(
        "pixel-btn relative flex flex-col items-center justify-center gap-0.5 text-[11px] disabled:opacity-40",
        compact ? "min-w-14 px-1.5 py-0.5 leading-tight" : "min-w-16 px-2 py-1",
        locked ? "bg-[#4a3b2e]" : tone,
      )}
    >
      {badge && !locked && (
        <span
          className="font-num absolute -right-1 -top-1 border-2 border-[#2b2119] bg-amber-300 px-1 text-[10px] leading-tight text-[#2b2119]"
          data-testid="tool-badge"
        >
          {badge}
        </span>
      )}
      <PixelIcon name={locked ? "lock" : icon} size={compact ? 18 : 24} />
      {label}
      {!locked && children}
    </button>
  );
}

export function BottomBar() {
  const { state, dispatch, selected, setSelected, setPanel } = useGame();
  const prod = production(state);
  const net = prod.food - consumption(state) - foodSpoiling(state);
  const eraBuildings = BUILDINGS.filter((b) => b.era <= state.era);
  const inTutorial = state.tutorialStep < TUTORIAL.length;
  const counts = countBuildings(state);
  const affordable = affordableResearch(state);
  // After the tutorial, flag purchases that would leave the fires short of wood.
  const tight = (cost: Partial<Resources>) =>
    !inTutorial && (cost.wood ?? 0) > 0 && state.resources.wood - (cost.wood ?? 0) < LOW_WOOD_AFTER_BUY;
  const compact = useCompact();
  // The bar can be tucked away to see more of the island. It comes back by
  // itself whenever it's needed: the tutorial, a guided step, a building or
  // tool in hand, or one of Elder Ama's hints (they point at its buttons).
  const [tucked, setTucked] = useState(false);
  const hidden = tucked && !inTutorial && !state.coach && !selected && !state.hint;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-1.5 flex flex-col items-center gap-1.5 px-1.5 md:bottom-3 md:px-3" data-hud="bottom">
      {!inTutorial && (
        <button
          type="button"
          onClick={() => setTucked(!tucked)}
          className="pixel-btn font-pixel pointer-events-auto self-end bg-[#2b2119] px-2 py-0.5 text-[11px] text-white/90"
          aria-expanded={!hidden}
          data-testid="bar-toggle"
        >
          {hidden ? "▲ Build" : "▼ Hide"}
        </button>
      )}
      {selected && (
        // Phones have no Esc key or right click: a clear way out of build mode.
        <button
          type="button"
          onClick={() => setSelected(null)}
          className="pixel-btn font-pixel pointer-events-auto bg-[#fdf6e3] px-3 py-1 text-xs text-[#2b2119]"
          data-testid="cancel-tool"
        >
          Cancel
        </button>
      )}
      {!hidden && (
      <div
        className={cn(
          "pixel-panel-dark font-pixel pointer-events-auto flex w-full min-w-0 max-w-full flex-col items-stretch md:w-auto md:flex-row",
          compact ? "gap-1 p-1 md:gap-2" : "gap-2 p-1.5 md:gap-3 md:p-2",
        )}
      >
        <div className={cn("flex-col justify-center gap-0.5 border-r-2 border-white/10 pr-3 text-[11px] text-white/85", compact ? "hidden" : "hidden md:flex")}>
          <Stat icon="hut" title="Housing">
            {Math.floor(state.population)}/{housingCapacity(state)}
          </Stat>
          <Stat
            icon="meat"
            title={`Food: +${perSec(prod.food)}/s made, −${perSec(consumption(state))}/s eaten by ${Math.floor(state.population)} people`}
            bad={net < 0}
          >
            {rate(net)}/s
          </Stat>
          <span className="font-num whitespace-nowrap text-[11px] text-white/60" title="More people eat more food">
            eat −{perSec(consumption(state))}/s
          </span>
          {foodSpoiling(state) > 0.05 && (
            <span className="font-num whitespace-nowrap text-[11px] text-amber-300" title={`Stored food above ${foodKeeps(state)} rots away. Granaries keep more.`}>
              rot −{perSec(foodSpoiling(state))}/s
            </span>
          )}
          {(counts.farm ?? 0) > 0 && (
            <span
              className={cn("font-num whitespace-nowrap text-[11px]", rainfall(state) < 0.8 ? "text-amber-300" : "text-white/60")}
              title="Forests bring rain. Fields grow this share of their food."
            >
              rain {Math.round(rainfall(state) * 100)}%
            </span>
          )}
          {state.era >= 2 && (
            <Stat icon="drop" title="Water in a dry year: springs, wells and aqueducts, for this many people" bad={waterSupply(state) < state.population}>
              {Math.min(waterSupply(state), Math.floor(state.population))}/{Math.floor(state.population)}
            </Stat>
          )}
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
                    ? `${b.description}\n\nYou get: ${b.gain}\nThe land pays: ${b.landCost}`
                    : tutorialLocked(state, b.id)
                      ? "Unlocks later in the tutorial"
                      : `Research ${TREE_BY_ID[b.requires ?? ""]?.name ?? "more"} to unlock`
                }
                className={cn(
                  "pixel-btn relative flex shrink-0 flex-col items-center gap-0.5 px-1 text-center",
                  compact ? "w-[4.25rem] py-0.5" : "w-20 py-1.5",
                  active ? "bg-amber-400 text-[#2b2119]" : "bg-[#4a3b2e] hover:bg-[#5c4a3a]",
                  (!unlocked || usedUp) && "cursor-not-allowed opacity-40",
                  // Can't afford it yet: dimmed like the tool buttons (still selectable to look).
                  unlocked && !usedUp && !affordable && !active && "opacity-50",
                )}
              >
                {unlocked && <LandImpact level={b.landImpact} />}
                <PixelIcon name={unlocked ? b.icon : "lock"} size={compact ? 18 : 24} />
                <span className={cn("leading-tight", compact ? "text-[10px]" : "text-[11px]")}>{b.name}</span>
                {usedUp ? (
                  <span className="text-[10px] text-emerald-300">built</span>
                ) : (
                  <Cost cost={cost} bad={!affordable && !active} tight={!active && tight(cost)} />
                )}
              </button>
            );
          })}
        </div>

        <div className="flex shrink-0 gap-1.5 overflow-x-auto border-t-2 border-white/10 pt-1.5 md:overflow-visible md:border-l-2 md:border-t-0 md:pl-3 md:pt-0">
          <ToolButton
            guide="tool-sell"
            icon="coin"
            label="Sell"
            onClick={() => setSelected(selected === DEMOLISH_TOOL ? null : DEMOLISH_TOOL)}
            title="Sell a building to make room. You get half its cost back."
            tone={selected === DEMOLISH_TOOL ? "bg-amber-400 text-[#2b2119]" : "bg-[#4a3b2e] hover:bg-[#5c4a3a]"}
          />
          {/* Planting saplings comes with Early Farming. */}
          {state.researched.includes("early-farming") && (
            <ToolButton
              guide="tool-plant"
              locked={tutorialLocked(state, "plant")}
              icon="sapling"
              label="Plant"
              onClick={() => setSelected(selected === PLANT_TOOL ? null : PLANT_TOOL)}
              disabled={!canAfford(state, PLANT_COST)}
              title="Plant saplings on open land or thinned forest. A new forest raises Sustainability and gives more wood later."
              tone={selected === PLANT_TOOL ? "bg-emerald-400 text-[#2b2119]" : "bg-emerald-900 hover:bg-emerald-800"}
            >
              <Cost cost={PLANT_COST} />
            </ToolButton>
          )}
          <ArmyButton />
          {state.researched.includes("spears") && spearmenOf(state) < state.soldiers && (
            <ToolButton
              guide="tool-upgrade"
              icon="sword"
              label={`Spear ${spearmenOf(state)}/${state.soldiers}`}
              onClick={() => dispatch({ type: "upgradeWarrior" })}
              disabled={!canAfford(state, SPEAR_COST)}
              title="Give a warrior a spear: spearmen fight 1.5x as hard."
              tone="bg-red-900 hover:bg-red-800"
            >
              <Cost cost={SPEAR_COST} />
            </ToolButton>
          )}
          {state.researched.includes("barter-roads") && <CaravanButton />}
          {(countBuildings(state).dock ?? 0) > 0 && <CanoeButton />}
          {state.researched.includes("navigation") && <ShipButton />}
          {state.kingdoms && (
            <ToolButton
              guide="tool-kingdoms"
              icon="crown"
              label={state.era >= 4 ? "Nations" : "Kingdoms"}
              onClick={() => setPanel("kingdoms")}
              badge={hostileKingdoms(state).length ? "!" : undefined}
              title={hostileKingdoms(state).length ? "A kingdom is hostile: its armies will raid us" : "Gifts, treaties and raids with the two kingdoms"}
              tone="bg-purple-800 hover:bg-purple-700"
            />
          )}
          <ToolButton
            guide="tool-scout"
            locked={tutorialLocked(state, "scout")}
            icon="spyglass"
            label="Scout"
            onClick={() => dispatch({ type: "scout" })}
            disabled={!!state.scouting || !canAfford(state, scoutCost(state))}
            title={state.scouting ? "The scouts are out exploring" : "Send scouts to reveal new land. A trip takes a little while, and each costs more than the last."}
            tone="bg-[#4a3b2e] hover:bg-[#5c4a3a]"
          >
            {state.scouting ? (
              <span className="text-[10px] text-amber-200" data-testid="scouts-out">
                Back in <Countdown ticks={Math.max(0, state.scouting.back - state.tick)} />s
              </span>
            ) : (
              <Cost cost={scoutCost(state)} bad={!canAfford(state, scoutCost(state))} tight={tight(scoutCost(state))} />
            )}
          </ToolButton>
          <ToolButton
            guide="tool-advancements"
            locked={tutorialLocked(state, "advancements")}
            icon="star"
            label="Advancements"
            onClick={() => setPanel("tree")}
            badge={affordable.length ? String(affordable.length) : undefined}
            title={
              affordable.length
                ? `Enough Knowledge for: ${affordable.map((n) => n.name).join(", ")}`
                : "Research new technology and see your goals"
            }
            tone="bg-emerald-700 hover:bg-emerald-600"
          />
          {state.flags.rocket && (
            <ToolButton icon="rocket" label="Space" title="Zoom out to space" tone="bg-indigo-700 hover:bg-indigo-600" />
          )}
        </div>
      </div>
      )}
    </div>
  );
}

// Send a canoe from a Canoe Dock: first to find the Southern Isles, then to
// fish the open sea. Each one costs a big tree.
function CanoeButton() {
  const { state, dispatch } = useGame();
  const out = (state.canoes ?? []).length;
  const problem = canoeError(state);
  const goal = canoeTrip(state) === "explore" ? "to find the islands to the south (then you can build there)" : `to fish the open sea (+${CANOE.fish} food)`;
  return (
    <ToolButton
      guide="tool-canoe"
      icon="boat"
      label={out ? `Canoe (${out} out)` : "Canoe"}
      onClick={() => dispatch({ type: "canoe" })}
      disabled={!!problem}
      title={problem ?? `Send a canoe ${goal}. Each canoe is cut from one big tree.`}
      tone="bg-sky-900 hover:bg-sky-800"
    >
      <Cost cost={CANOE.cost} bad={!canAfford(state, CANOE.cost)} />
    </ToolButton>
  );
}

// Send a ship from a Shipyard (or the Grand Harbour): first to find islands and
// the kingdoms' coasts, then to trade.
function ShipButton() {
  const { state, dispatch } = useGame();
  const out = (state.ships ?? []).length;
  const problem = shipError(state);
  const voyage = nextVoyage(state);
  const goal = !voyage ? "to trade (coins and goodwill)" : voyage.kind === "outpost" ? "to find new land for an outpost" : "to find a kingdom's coast";
  return (
    <ToolButton
      guide="tool-ship"
      icon="boat"
      label={`Ship ${out} at sea`}
      onClick={() => dispatch({ type: "ship" })}
      disabled={!!problem}
      title={problem ?? `Send a ship ${goal}. Ships can also bring sickness home.`}
      tone="bg-sky-800 hover:bg-sky-700"
    >
      <Cost cost={shipCost(state)} bad={!canAfford(state, shipCost(state))} />
    </ToolButton>
  );
}

// Send a caravan from a Market to the Silk Steppe (one per Market at a time).
function CaravanButton() {
  const { state, dispatch } = useGame();
  const markets = countBuildings(state).market ?? 0;
  const out = (state.caravans ?? []).length;
  const problem = caravanError(state);
  return (
    <ToolButton
      guide="tool-caravan"
      icon="market"
      label={`Caravan ${out}/${markets}`}
      onClick={() => dispatch({ type: "caravan" })}
      disabled={!!problem}
      title={problem ?? "Send a caravan to the Silk Steppe: it comes back with coins and new ideas, and sometimes sickness."}
      tone="bg-teal-800 hover:bg-teal-700"
    >
      <Cost cost={caravanCost(state)} bad={!canAfford(state, caravanCost(state))} />
    </ToolButton>
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
        ? `All War Camps are full (${WARRIORS_PER_CAMP} warriors each). Build another War Camp to train more.`
        : `Train a warrior. Defense: ${defenseStrength(state)} = ${defenseBreakdown(state)}`;
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
      {full && cap > 0 ? (
        <span className="text-[10px] leading-tight text-white/80">+1 camp = +{WARRIORS_PER_CAMP}</span>
      ) : (
        <Cost cost={TRAIN_COST} />
      )}
    </ToolButton>
  );
}
