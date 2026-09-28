"use client";

import { METERS } from "@/game/content";
import { useGame } from "@/components/civ/game-provider";
import { cn } from "@/lib/utils";

function barColor(value: number) {
  if (value < 25) return "bg-red-500";
  if (value < 50) return "bg-amber-400";
  return "bg-emerald-400";
}

export function SideMeters({ side }: { side: "left" | "right" }) {
  const { state } = useGame();
  return (
    <div
      className={cn(
        "pointer-events-auto absolute top-1/2 flex -translate-y-1/2 flex-col gap-2",
        side === "left" ? "left-3" : "right-3",
      )}
    >
      {METERS.filter((m) => m.side === side).map((m) => {
        const value = state.meters[m.key];
        return (
          <div
            key={m.key}
            className="group relative flex w-10 flex-col items-center gap-1 rounded-xl bg-slate-950/55 px-1 py-1.5 text-white shadow-lg ring-1 ring-white/10 backdrop-blur"
          >
            <span className="text-sm leading-none">{m.icon}</span>
            <div className="relative h-14 w-1.5 overflow-hidden rounded-full bg-white/15">
              <div
                className={cn("absolute bottom-0 w-full rounded-full transition-all duration-700", barColor(value))}
                style={{ height: `${value}%` }}
              />
            </div>
            <span className="text-[10px] font-semibold tabular-nums">{value}</span>
            <span
              className={cn(
                "pointer-events-none absolute top-1/2 hidden -translate-y-1/2 whitespace-nowrap rounded-md bg-slate-950/90 px-2 py-1 text-xs group-hover:block",
                side === "left" ? "left-12" : "right-12",
              )}
            >
              {m.label}: {value}/100
            </span>
          </div>
        );
      })}
    </div>
  );
}
