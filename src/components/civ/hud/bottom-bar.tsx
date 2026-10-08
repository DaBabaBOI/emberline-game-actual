"use client";

import { setHoveredBuilding } from "@/components/civ/world/hovered";
import { setPlanMode, usePlanMode } from "@/components/civ/world/plan-mode";
import { useState, type ReactNode } from "react";
import { BUILDINGS, CANOE, ERAS, LAST, SPACE, TRADE, LOW_WOOD_AFTER_BUY, PLANT_COST, SPEAR_COST, TRAIN_COST, TREE_BY_ID, TUTORIAL, WARRIORS_PER_CAMP } from "@/game/content";
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
  everydayWater,
  consumption,
  countBuildings,
  defenseBreakdown,
  defenseStrength,
  DEMOLISH_TOOL,
  PLANT_TOOL,
  CLEAR_TOOL,
  SCOUT_TOOL,
  CANOE_TOOL,
  foodKeeps,
  foodSpoiling,
  housingCapacity,
  isUnlocked,
  perSecond,
  production,
  rainfall,
  scoutCost,
  spearmenOf,
  tradeOffer,
  sellOffer,
  tutorialLocked,
  warriorCap,
  newResearch,
  launchError,
} from "@/game/engine";
import type { Resources } from "@/game/types";
import type { IconId } from "@/game/sprites";
import { useGame } from "@/components/civ/game-provider";
import { PixelIcon } from "@/components/civ/pixel-icon";
import { cn } from "@/lib/utils";
import { useGuide } from "./guide-overlay";
import { HINTS_BY_ID } from "@/game/hints";
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

// Traders: swap shells (or coins) for food, wood or stone. Every trade makes
// the next one dearer; prices ease back over time.
function TradeButton() {
  const { state, dispatch } = useGame();
  const [open, setOpen] = useState(false);
  const money = ERAS[state.era].currency.toLowerCase();
  const can = state.resources.currency >= TRADE.lot && state.tutorialStep >= TUTORIAL.length;
  return (
    // A flex wrapper, so the button stretches to the row's height like the others.
    <span className="relative flex">
      <ToolButton
        guide="tool-trade"
        icon="scales"
        label="Trade"
        onClick={() => setOpen(!open)}
        disabled={state.tutorialStep < TUTORIAL.length}
        // Shells piling up: worth a trade.
        badge={can && state.resources.currency >= TRADE.idle ? "!" : undefined}
        title={`${state.resources.currency >= TRADE.idle ? `${Math.floor(state.resources.currency)} ${money} piling up! ` : ""}Traders swap ${TRADE.lot} ${money} for food, wood or stone, and buy what you have spare. Buying wood and stone spares your own forest and hills.`}
        tone={open ? "bg-amber-400 text-[#2b2119]" : "bg-[#4a3b2e] hover:bg-[#5c4a3a]"}
      >
        <Cost cost={{ currency: TRADE.lot }} bad={!can} />
      </ToolButton>
      {open && (
        <span className="pixel-panel-dark absolute bottom-full left-1/2 z-10 mb-2 flex w-52 -translate-x-1/2 flex-col gap-1 p-2 text-[11px]" data-testid="trade-menu">
          <span className="text-white/80">
            {TRADE.lot} {money} buys:
          </span>
          {(["food", "wood", "stone"] as const).map((k) => (
            <button
              key={k}
              type="button"
              disabled={!can}
              onClick={() => dispatch({ type: "trade", get: k })}
              className="pixel-btn flex items-center justify-between bg-emerald-800 px-2 py-1 text-white hover:bg-emerald-700 disabled:opacity-40"
              data-testid={`trade-${k}`}
            >
              <span className="flex items-center gap-1">
                <PixelIcon name={COST_ICONS[k]} size={14} />
                {tradeOffer(state, k)} {k}
              </span>
              <span className="text-white/70">
                −{TRADE.lot} <PixelIcon name="coin" size={12} />
              </span>
            </button>
          ))}
          <span className="text-[10px] text-white/60">
            {(state.tradePrice ?? 1) > 1.05 ? "Prices are up after your trades; they ease back slowly." : "Buying spares your own forest and hills."}
          </span>
          <span className="mt-1 border-t border-white/15 pt-1 text-white/80">Sell to the traders:</span>
          {(["food", "wood", "stone"] as const).map((k) => {
            const offer = sellOffer(state, k);
            return (
              <button
                key={k}
                type="button"
                disabled={state.resources[k] < offer.amount}
                onClick={() => dispatch({ type: "sell", give: k })}
                className="pixel-btn flex items-center justify-between bg-amber-800 px-2 py-1 text-white hover:bg-amber-700 disabled:opacity-40"
                data-testid={`sell-${k}`}
              >
                <span className="flex items-center gap-1">
                  −{offer.amount} <PixelIcon name={COST_ICONS[k]} size={14} /> {k}
                </span>
                <span className="text-white/70">
                  +{offer.coins} <PixelIcon name="coin" size={12} />
                </span>
              </button>
            );
          })}
          {(state.sellPrice ?? 1) < 0.95 && <span className="text-[10px] text-white/60">You have sold a lot: traders pay less for a while.</span>}
        </span>
      )}
    </span>
  );
}

// The build bar's groups, so only a few cards show at once. Anything not
// listed goes under "Town & nature".
const GROUPS: { id: string; label: string; ids: string[] }[] = [
  { id: "homes", label: "Homes & health", ids: ["campfire", "hut", "house", "townhouse", "apartments", "arcology", "latrine", "baths", "hospital", "healer"] },
  { id: "food", label: "Food & water", ids: ["gatherer", "farm", "pen", "fishing", "granary", "well", "aqueduct", "canal", "watermill", "windmill", "vfarm"] },
  { id: "work", label: "Work", ids: ["woodcutter", "quarry", "smithy", "market", "factory", "station", "guildhall"] },
  { id: "power", label: "Power", ids: ["coalplant", "hydrodam", "windfarm", "solarfarm", "nuclear", "fusion", "datacenter"] },
  { id: "sea", label: "Trade & sea", ids: ["dock", "harbour", "shipyard", "tradingpost"] },
  { id: "town", label: "Town & nature", ids: [] },
];
const groupOf = (id: string) => GROUPS.find((g) => g.ids.includes(id))?.id ?? "town";
// Fewer buildings than this: no groups, everything shows.
const GROUP_FROM = 9;

export function BottomBar() {
  const { state, dispatch, selected, setSelected, setPanel } = useGame();
  const planning = usePlanMode();
  const prod = production(state);
  const net = prod.food - consumption(state) - foodSpoiling(state);
  // Build to Last keeps the bar short: no Stone Age buildings, no army, scouts or ships.
  const last = state.mode === "last";
  // Only what can be built now: locked ones appear once researched (the
  // tutorial's own locks still show, so the steps make sense).
  const eraBuildings = BUILDINGS.filter(
    (b) => b.era <= state.era && !(last && LAST.hidden.includes(b.id)) && (isUnlocked(state, b) || state.tutorialStep < TUTORIAL.length),
  );
  const inTutorial = state.tutorialStep < TUTORIAL.length;
  const counts = countBuildings(state);
  const affordable = affordableResearch(state);
  // Newly researchable advancements the player hasn't looked at yet.
  const fresh = newResearch(state);
  // After the tutorial, flag purchases that would leave the fires short of wood.
  const tight = (cost: Partial<Resources>) =>
    !inTutorial && (cost.wood ?? 0) > 0 && state.resources.wood - (cost.wood ?? 0) < LOW_WOOD_AFTER_BUY;
  const compact = useCompact();
  // The bar can be tucked away to see more of the island. It comes back by
  // itself whenever it's needed: the tutorial, a guided step, a building or
  // tool in hand, or one of Elder Ama's hints (they point at its buttons).
  const [tucked, setTucked] = useState(false);
  const hidden = tucked && !inTutorial && !state.coach && !selected && !state.hint;
  // One group of buildings at a time once there are many. Everything shows
  // while a guide or hint may point at one of them.
  const [group, setGroup] = useState("homes");
  // While the hand points at a building card, its group is the one shown.
  const guide = useGuide();
  // (A hint can point at a card too: the shrine.)
  const hintTarget = state.hint ? HINTS_BY_ID[state.hint.id]?.target : undefined;
  const hinted = (typeof hintTarget === "function" ? hintTarget(state) : hintTarget)?.match(/build-([a-z]+)/)?.[1];
  // The guide's hand (it waits for that card to be clicked) and, more gently, a hint.
  const guided = guide.target?.kind === "ui" ? guide.target.ids.find((id) => id.startsWith("build-"))?.slice(6) : undefined;
  const pointed = guided ?? hinted;
  // Tabs stay put: only the Stone Age tutorial (a handful of buildings) shows them all.
  const grouped = eraBuildings.length >= GROUP_FROM && (!inTutorial || !!pointed);
  const groups = GROUPS.filter((g) => eraBuildings.some((b) => groupOf(b.id) === g.id));
  // The hand's building, else the one in hand, else the tab picked.
  const holding = selected && eraBuildings.some((b) => b.id === selected) ? selected : undefined;
  // A card the guide's hand newly points at (or one newly picked up) opens its
  // tab once; after that the player's own tab choice sticks. Hints never switch
  // the tab on their own: their card's tab just glows.
  const lead = guided ?? holding;
  const [followed, setFollowed] = useState<string | undefined>(undefined);
  if (lead !== followed) {
    setFollowed(lead);
    if (lead) setGroup(groupOf(lead));
  }
  const showing = !grouped ? null : groups.some((g) => g.id === group) ? group : groups[0]?.id;
  const shownBuildings = showing ? eraBuildings.filter((b) => groupOf(b.id) === showing) : eraBuildings;

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
        <div className={cn("flex-col justify-center gap-0.5 border-r-2 border-white/10 pr-3 text-[11px] text-white/85", compact || last ? "hidden" : "hidden md:flex")}>
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
          {foodSpoiling(state) > 0.3 && (
            <span className="font-num whitespace-nowrap text-[11px] text-amber-300" title={`Stored food above ${foodKeeps(state)} rots away. Granaries keep more.`}>
              rot −{perSec(foodSpoiling(state))}/s
            </span>
          )}
          {(counts.farm ?? 0) > 0 && rainfall(state) < 0.8 && (
            <span
              className={cn("font-num whitespace-nowrap text-[11px]", rainfall(state) < 0.8 ? "text-amber-300" : "text-white/60")}
              title="Forests bring rain. Fields grow this share of their food."
            >
              rain {Math.round(rainfall(state) * 100)}%
            </span>
          )}
          {((everydayWater(state) && !inTutorial) || (state.era >= 2 && waterSupply(state) < state.population)) && (
            <Stat
              icon="drop"
              title={
                everydayWater(state)
                  ? "People with water: the springs, homes near the river, wells and (with Pottery) jars. Everyone drinks every day."
                  : "Water in a dry year: springs, wells and aqueducts, for this many people"
              }
              bad={waterSupply(state) < state.population}
            >
              {Math.min(waterSupply(state), Math.floor(state.population))}/{Math.floor(state.population)}
            </Stat>
          )}
          <Stat icon="log" title="Wood per second" bad={prod.wood < 0}>
            {rate(prod.wood)}/s
          </Stat>
        </div>

        <div className="flex min-w-0 flex-col gap-1">
        {showing && (
          <div className="flex gap-1 overflow-x-auto text-[11px]" role="tablist" data-testid="build-groups">
            {groups.map((g) => (
              <button
                key={g.id}
                type="button"
                role="tab"
                aria-selected={showing === g.id}
                onClick={() => setGroup(g.id)}
                className={cn(
                  "shrink-0 px-2 py-0.5",
                  showing === g.id ? "bg-amber-400 text-[#2b2119]" : "bg-white/10 text-white/80 hover:bg-white/20",
                  // The card the hand points at is in this tab.
                  pointed && showing !== g.id && groupOf(pointed) === g.id && "animate-pulse ring-2 ring-amber-300",
                )}
                data-testid={`build-group-${g.id}`}
              >
                {g.label}
              </button>
            ))}
          </div>
        )}
        <div className="flex min-w-0 gap-1.5 overflow-x-auto pb-1">
          {shownBuildings.map((b) => {
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
                onPointerEnter={() => setHoveredBuilding(b.id)}
                onPointerLeave={() => setHoveredBuilding(null)}
                onFocus={() => setHoveredBuilding(b.id)}
                onBlur={() => setHoveredBuilding(null)}
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
        </div>

        <div className="flex shrink-0 gap-1.5 overflow-x-auto border-t-2 border-white/10 pt-1.5 md:overflow-visible md:border-l-2 md:border-t-0 md:pl-3 md:pt-0">
          <ToolButton
            guide="tool-sell"
            icon="coin"
            label="Sell"
            onClick={() => setSelected(selected === DEMOLISH_TOOL ? null : DEMOLISH_TOOL)}
            title="Sell a building to make room (half its cost back), or clear an empty forest back to grassland for its wood."
            tone={selected === DEMOLISH_TOOL ? "bg-amber-400 text-[#2b2119]" : "bg-[#4a3b2e] hover:bg-[#5c4a3a]"}
          />
          <TradeButton />
          {/* Plan mode: lay out blueprints, built by themselves as the resources come in. */}
          {!inTutorial && (
            <ToolButton
              guide="tool-plan"
              icon="scroll"
              label={planning ? "Planning" : (state.plans?.length ?? 0) > 0 ? `Plan (${state.plans!.length})` : "Plan"}
              onClick={() => setPlanMode(!planning)}
              title={
                planning
                  ? "Plan mode is on: pick a building card, then click the map to lay out a blueprint. Click Plan again to stop."
                  : `Plan ahead: lay out buildings as blueprints, free. Each is built by itself, in order, as soon as you can afford it.${(state.plans?.length ?? 0) > 0 ? ` Planned now: ${state.plans!.map((p) => BUILDINGS.find((b) => b.id === p.building)?.name ?? p.building).join(", ")}.` : ""}`
              }
              tone={planning ? "bg-amber-400 text-[#2b2119]" : "bg-[#5b4a2e] hover:bg-[#6b5836]"}
            />
          )}
          {/* What Plan mode does, in words on screen (not only in a tooltip). */}
          {planning && !inTutorial && (
            <div className={"pointer-events-none fixed inset-x-0 z-[25] flex justify-center px-3 " + (state.leader ? "top-[8.5rem]" : "top-[5.5rem]")} data-testid="plan-banner">
              <div className="pixel-panel-dark font-pixel w-[min(94vw,560px)] px-3 py-2 text-xs text-white md:text-sm">
                <div className="font-semibold text-amber-300">Plan mode is on</div>
                <ol className="mt-0.5 list-decimal space-y-0.5 pl-5">
                  <li>Pick a building card below.</li>
                  <li>Click the map to lay out its blueprint. It costs nothing yet, even if you can&apos;t afford it.</li>
                  <li>Blueprints build themselves, one by one in the order you laid them out, as soon as you have the resources.</li>
                </ol>
                <div className="mt-1 text-white/70">
                  {(state.plans?.length ?? 0) > 0 ? `${state.plans!.length} planned, waiting for resources. ` : ""}Click Plan again to go back to building straight away.
                </div>
              </div>
            </div>
          )}
          {(state.plans?.length ?? 0) > 0 && planning && (
            <ToolButton
              guide="tool-plans"
              icon="warning"
              label="Clear plans"
              onClick={() => dispatch({ type: "unplanAll" })}
              title="Cancel every blueprint (or click one blueprint with the same building to cancel just that one)."
              tone="bg-stone-700 hover:bg-stone-600"
            />
          )}
          {/* Clearing whole patches of forest into open land. */}
          {!inTutorial && (
            <ToolButton
              guide="tool-clear"
              icon="axe"
              label="Clear"
              onClick={() => setSelected(selected === CLEAR_TOOL ? null : CLEAR_TOOL)}
              title="Clear land: click a forest to fell it and the forest touching it (up to 7 tiles) into open grassland. You get the wood; the land pays in Sustainability."
              tone={selected === CLEAR_TOOL ? "bg-amber-400 text-[#2b2119]" : "bg-[#5a3b22] hover:bg-[#6b4a2b]"}
            />
          )}
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
          {!last && <ArmyButton />}
          {!last && state.researched.includes("spears") && spearmenOf(state) < state.soldiers && (
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
          {!last && state.researched.includes("barter-roads") && <CaravanButton />}
          {!last && (countBuildings(state).dock ?? 0) > 0 && <CanoeButton />}
          {!last && state.researched.includes("navigation") && <ShipButton />}
          {!last && state.kingdoms && (
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
          {!last && <ToolButton
            guide="tool-scout"
            locked={tutorialLocked(state, "scout")}
            icon="spyglass"
            label="Scout"
            // After the tutorial: pick where on the map (in the fog) to send them.
            onClick={() => (inTutorial ? dispatch({ type: "scout" }) : setSelected(selected === SCOUT_TOOL ? null : SCOUT_TOOL))}
            disabled={!!state.scouting || !canAfford(state, scoutCost(state))}
            title={state.scouting ? "The scouts are out exploring" : "Send scouts to reveal new land: press, then click a spot in the fog. Further in takes longer, and each trip costs more than the last."}
            tone={selected === SCOUT_TOOL ? "bg-amber-400 text-[#2b2119]" : "bg-[#4a3b2e] hover:bg-[#5c4a3a]"}
          >
            {state.scouting ? (
              <span className="text-[10px] text-amber-200" data-testid="scouts-out">
                Back in <Countdown ticks={Math.max(0, state.scouting.back - state.tick)} />s
              </span>
            ) : (
              <Cost cost={scoutCost(state)} bad={!canAfford(state, scoutCost(state))} tight={tight(scoutCost(state))} />
            )}
          </ToolButton>}
          <ToolButton
            guide="tool-advancements"
            locked={tutorialLocked(state, "advancements")}
            icon="star"
            label="Advancements"
            onClick={() => setPanel("tree")}
            badge={fresh.length ? `${fresh.length} new` : affordable.length ? String(affordable.length) : undefined}
            title={
              fresh.length
                ? `New to research: ${fresh.map((n) => n.name).join(", ")}`
                : affordable.length
                ? `Enough Knowledge for: ${affordable.map((n) => n.name).join(", ")}`
                : "Research new technology and see your goals"
            }
            tone="bg-emerald-700 hover:bg-emerald-600"
          />
          {(countBuildings(state).launchsite ?? 0) > 0 && (
            <ToolButton
              guide="tool-space"
              icon="rocket"
              label="Space"
              onClick={() => setPanel("space")}
              badge={SPACE.projects.some((p) => !(state.space ?? []).includes(p.id) && canAfford(state, p.cost) && !launchError(state, p.id)) ? "!" : undefined}
              title="Look at our planet from orbit, and launch satellites, a Moon base, Mars, asteroid miners and, at last, a ship to the stars"
              tone="bg-indigo-700 hover:bg-indigo-600"
            />
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
  const { state, selected, setSelected } = useGame();
  const out = (state.canoes ?? []).length;
  const problem = canoeError(state);
  const goal = canoeTrip(state) === "explore" ? "to find the islands to the south (then you can build there)" : `to fish the open sea (+${CANOE.fish} food)`;
  return (
    <ToolButton
      guide="tool-canoe"
      icon="boat"
      label={out ? `Canoe (${out} out)` : "Canoe"}
      // Pick where on the sea (or which island) to paddle to.
      onClick={() => setSelected(selected === CANOE_TOOL ? null : CANOE_TOOL)}
      disabled={!!problem}
      title={problem ?? `Press, then click where on the sea to go: near the Southern Isles ${goal.startsWith("to find") ? "to find them" : "or"} anywhere else to fish (+${CANOE.fish} food) and map the sea. Each canoe is cut from one big tree.`}
      tone={selected === CANOE_TOOL ? "bg-amber-400 text-[#2b2119]" : "bg-sky-900 hover:bg-sky-800"}
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
