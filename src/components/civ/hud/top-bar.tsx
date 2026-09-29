"use client";

import Link from "next/link";
import { ERAS, XP, chiefTitle, formatYear, xpToReach } from "@/game/content";
import { useGame } from "@/components/civ/game-provider";
import { warnings } from "@/game/engine";
import type { GameState } from "@/game/types";
import { cn } from "@/lib/utils";
import { PixelIcon } from "@/components/civ/pixel-icon";
import type { IconId } from "@/game/sprites";

const SPEEDS: { value: GameState["speed"]; label: string }[] = [
  { value: 0, label: "⏸" },
  { value: 1, label: "▶" },
  { value: 2, label: "▶▶" },
  { value: 4, label: "▶▶▶" },
];

function Chip({ icon, value, title, low }: { icon: IconId; value: string; title: string; low?: boolean }) {
  return (
    <span title={title} className={cn("flex items-center gap-1 whitespace-nowrap", low && "animate-pulse text-red-400")}>
      <PixelIcon name={icon} size={16} />
      <span className="font-num">{value}</span>
    </span>
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
        Lv {level} {chiefTitle(level)}
      </span>
      <span className="mt-0.5 block h-2 w-24 border border-[#140e0a] bg-white/15">
        <span className="block h-full bg-amber-400" style={{ width: `${share * 100}%` }} />
      </span>
    </div>
  );
}

export function TopBar() {
  const { state, dispatch } = useGame();
  const era = ERAS[state.era];
  const r = state.resources;
  const low = new Set(warnings(state).map((w) => w.id));

  return (
    <div className="pointer-events-auto absolute inset-x-0 top-2 flex justify-center px-2 md:top-3 md:px-3">
      <div
        className="pixel-panel-dark font-pixel flex max-w-full flex-wrap items-center justify-center gap-x-3 gap-y-1 px-2 py-1 text-xs md:flex-nowrap md:gap-4 md:px-4 md:py-1.5 md:text-sm"
        // A bronze trim from the Ancient era on.
        style={state.era >= 1 ? { borderColor: "#b0773a", boxShadow: "inset 0 -3px 0 #8a5a2b" } : undefined}
      >
        <Link href="/" className="font-semibold text-amber-300" title="Back to the home page">
          ◀
        </Link>
        <div className="flex flex-col leading-tight">
          <span className="max-w-40 truncate text-xs font-semibold text-white" title="Your people">
            {state.nation ?? "The Emberfolk"}
          </span>
          <span className={"text-[11px] uppercase tracking-wide " + (state.era >= 1 ? "text-orange-300" : "text-amber-300")}>
            {era.name}
          </span>
          <span className="font-num text-base">{formatYear(state.year)}</span>
        </div>
        <ChiefXp state={state} />
        <span className="hidden h-6 w-px bg-white/20 md:block" />
        <Chip icon="person" value={Math.floor(state.population).toLocaleString()} title="Population" />
        <Chip icon="coin" value={Math.floor(r.currency).toLocaleString()} title={era.currency} />
        <Chip icon="sword" value={state.soldiers.toString()} title="Warriors" />
        <span className="hidden h-6 w-px bg-white/20 md:block" />
        <Chip icon="meat" value={Math.floor(r.food).toString()} title="Food stored" low={low.has("food") || low.has("famine")} />
        <Chip icon="log" value={Math.floor(r.wood).toString()} title="Wood" low={low.has("wood")} />
        <Chip icon="rock" value={Math.floor(r.stone).toString()} title="Stone" />
        <Chip icon="bulb" value={Math.floor(r.knowledge).toString()} title="Knowledge" />
        <span className="hidden h-6 w-px bg-white/20 md:block" />
        <div className="flex gap-1">
          {SPEEDS.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => dispatch({ type: "setSpeed", speed: s.value })}
              className={cn(
                "px-2 py-0.5 text-xs",
                state.speed === s.value ? "bg-amber-400 text-[#2b2119]" : "bg-white/10 hover:bg-white/20",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
