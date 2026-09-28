"use client";

import { useState } from "react";
import { METERS } from "@/game/content";
import { sustainabilityBreakdown, sustainabilityTrend } from "@/game/engine";
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
  const [open, setOpen] = useState(false);
  const trend = sustainabilityTrend(state);
  return (
    <div
      className={cn(
        "pointer-events-auto absolute top-1/2 flex -translate-y-1/2 flex-col gap-2",
        side === "left" ? "left-3" : "right-3",
      )}
    >
      {METERS.filter((m) => m.side === side).map((m) => {
        const value = state.meters[m.key];
        const land = m.key === "sustainability";
        return (
          <div
            key={m.key}
            role={land ? "button" : undefined}
            tabIndex={land ? 0 : undefined}
            onClick={land ? () => setOpen(!open) : undefined}
            data-testid={land ? "sustain-meter" : undefined}
            className={cn(
              "pixel-panel-dark font-pixel group relative flex w-10 flex-col items-center gap-1 px-1 py-1.5",
              land && "cursor-pointer hover:bg-[#3a2e24]",
              land && open && "outline outline-2 outline-emerald-400",
            )}
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
            <span className="font-num text-xs">{value}</span>
            {land && Math.abs(trend) >= 1 && (
              <span
                className={cn("font-num text-[11px] leading-none", trend < 0 ? "text-red-300" : "text-emerald-300")}
                title="Change over the last minute"
              >
                {trend < 0 ? "▼" : "▲"}
                {Math.round(Math.abs(trend))}
              </span>
            )}
            {!(land && open) && (
              <span
                className={cn(
                  "pixel-panel-dark pointer-events-none absolute top-1/2 hidden -translate-y-1/2 whitespace-nowrap px-2 py-1 text-xs group-hover:block",
                  side === "left" ? "left-12" : "right-12",
                )}
              >
                {m.label}: {value}/100{land ? " (click to see why)" : ""}
              </span>
            )}
          </div>
        );
      })}
      {side === "right" && open && <SustainabilityPanel onClose={() => setOpen(false)} />}
    </div>
  );
}

// Why is Sustainability where it is? Every part, with a hint on what helps.
function SustainabilityPanel({ onClose }: { onClose: () => void }) {
  const { state } = useGame();
  const parts = sustainabilityBreakdown(state);
  const trend = sustainabilityTrend(state);
  return (
    <div className="pixel-panel font-pixel absolute bottom-0 right-12 w-72 p-3 text-xs" data-testid="sustain-panel">
      <div className="mb-1 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm font-semibold">
          <PixelIcon name="leaf" size={16} />
          Sustainability: <span className="font-num text-base">{state.meters.sustainability}</span>
        </span>
        <button type="button" onClick={onClose} className="text-stone-500 underline">
          Close
        </button>
      </div>
      <p className="mb-2 text-stone-600">
        How healthy your land is. It starts at 100, and each choice below takes some of it away.
      </p>
      <ul className="flex flex-col gap-1.5">
        {parts.map((p) => (
          <li key={p.label} className="flex flex-col">
            <span className="flex justify-between gap-2">
              <span className="font-semibold">{p.label}</span>
              <span className={cn("font-num text-sm", p.value < 0 ? "text-red-700" : "text-emerald-700")}>
                {p.value >= 0 ? "+" : "−"}
                {Math.abs(Math.round(p.value))}
              </span>
            </span>
            <span className="text-[11px] text-stone-500">{p.hint}</span>
          </li>
        ))}
      </ul>
      <p
        className={cn(
          "mt-2 border-t-2 border-stone-300 pt-1.5",
          trend < -1 ? "text-red-700" : trend > 1 ? "text-emerald-700" : "text-stone-600",
        )}
      >
        Last minute:{" "}
        {Math.abs(trend) < 1 ? "holding steady" : `${trend < 0 ? "falling" : "rising"} by ${Math.round(Math.abs(trend))}`}
      </p>
      <p className="mt-1 text-[11px] text-stone-500">
        In the real world: SDG 15.2 is about halting deforestation and restoring forests, and SDG 11.6 about
        cutting the pollution our towns and cities make.
      </p>
    </div>
  );
}
