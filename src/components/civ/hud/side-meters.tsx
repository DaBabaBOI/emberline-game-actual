"use client";

import { METERS } from "@/game/content";
import { useGame } from "@/components/civ/game-provider";
import { cn } from "@/lib/utils";
import { PixelIcon } from "@/components/civ/pixel-icon";

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
            className="pixel-panel-dark font-pixel group relative flex w-10 flex-col items-center gap-1 px-1 py-1.5"
          >
            <PixelIcon name={m.icon} size={18} />
            <div className="relative h-14 w-2.5 overflow-hidden bg-white/15">
              <div
                className={cn("absolute bottom-0 w-full transition-[height] duration-150", barColor(value))}
                style={{ height: `${value}%` }}
              />
              {[25, 50, 75].map((mark) => (
                <div key={mark} className="absolute inset-x-0 h-px bg-black/50" style={{ bottom: `${mark}%` }} />
              ))}
            </div>
            <span className="text-[10px] font-semibold tabular-nums">{value}</span>
            <span
              className={cn(
                "pixel-panel-dark pointer-events-none absolute top-1/2 hidden -translate-y-1/2 whitespace-nowrap px-2 py-1 text-xs group-hover:block",
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
