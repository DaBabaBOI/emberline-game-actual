"use client";

import Link from "next/link";
import { ERAS, formatYear } from "@/game/content";
import { useGame } from "@/components/civ/game-provider";
import type { GameState } from "@/game/types";
import { cn } from "@/lib/utils";

const SPEEDS: { value: GameState["speed"]; label: string }[] = [
  { value: 0, label: "⏸" },
  { value: 1, label: "▶" },
  { value: 2, label: "▶▶" },
  { value: 4, label: "▶▶▶" },
];

function Chip({ icon, value, title }: { icon: string; value: string; title: string }) {
  return (
    <span title={title} className="flex items-center gap-1 whitespace-nowrap tabular-nums">
      <span>{icon}</span>
      {value}
    </span>
  );
}

export function TopBar() {
  const { state, dispatch } = useGame();
  const era = ERAS[state.era];
  const r = state.resources;

  return (
    <div className="pointer-events-auto absolute inset-x-0 top-3 flex justify-center px-3">
      <div className="flex max-w-full items-center gap-4 overflow-x-auto rounded-2xl bg-slate-950/60 px-4 py-2 text-sm text-white shadow-lg ring-1 ring-white/10 backdrop-blur">
        <Link href="/" className="font-semibold text-amber-300" title="Back to the home page">
          ◀
        </Link>
        <div className="flex flex-col leading-tight">
          <span className="text-[11px] uppercase tracking-wide text-amber-300">{era.name}</span>
          <span className="font-semibold tabular-nums">{formatYear(state.year)}</span>
        </div>
        <span className="h-6 w-px bg-white/20" />
        <Chip icon="👥" value={Math.floor(state.population).toLocaleString()} title="Population" />
        <Chip icon="🐚" value={Math.floor(r.currency).toLocaleString()} title={era.currency} />
        <Chip icon="⚔️" value={state.soldiers.toString()} title="Warriors" />
        <span className="h-6 w-px bg-white/20" />
        <Chip icon="🍖" value={Math.floor(r.food).toString()} title="Food stored" />
        <Chip icon="🪵" value={Math.floor(r.wood).toString()} title="Wood" />
        <Chip icon="🪨" value={Math.floor(r.stone).toString()} title="Stone" />
        <Chip icon="💡" value={Math.floor(r.knowledge).toString()} title="Knowledge" />
        <span className="h-6 w-px bg-white/20" />
        <div className="flex gap-1">
          {SPEEDS.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => dispatch({ type: "setSpeed", speed: s.value })}
              className={cn(
                "rounded-md px-2 py-0.5 text-xs",
                state.speed === s.value ? "bg-amber-400 text-slate-950" : "bg-white/10 hover:bg-white/20",
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
