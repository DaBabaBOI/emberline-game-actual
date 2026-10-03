"use client";

import { useState } from "react";
import { METERS } from "@/game/content";
import { foodMeterNote, homelessCount, homelessMood, meterBreakdown, meterFixes, sustainabilityTrend } from "@/game/engine";
import type { MeterKey } from "@/game/types";
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
  // Whose "why" panel is open (one at a time).
  const [open, setOpen] = useState<MeterKey | null>(null);
  const trend = sustainabilityTrend(state);
  return (
    <div
      className={cn(
        "pointer-events-auto absolute top-1/2 flex -translate-y-1/2 flex-col gap-1.5 md:gap-2",
        side === "left" ? "left-1.5 md:left-3" : "right-1.5 md:right-3",
        // An open panel sits above Elder Ama's column (z-[26]), which it overlaps.
        open && "z-[27]",
      )}
    >
      {METERS.filter((m) => m.side === side).map((m) => {
        const value = state.meters[m.key];
        const land = m.key === "sustainability";
        const shown = open === m.key;
        const grief = m.key === "happiness" ? Math.round(state.grief ?? 0) : 0;
        const roofless = m.key === "happiness" ? homelessMood(state) : 0;
        return (
          <div
            key={m.key}
            role="button"
            tabIndex={0}
            aria-label={`${m.label}: ${value} out of 100. Show why`}
            aria-expanded={shown}
            onClick={() => setOpen(shown ? null : m.key)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setOpen(shown ? null : m.key);
              }
            }}
            data-testid={land ? "sustain-meter" : `meter-${m.key}`}
            className={cn(
              "pixel-panel-dark font-pixel group relative flex w-8 cursor-pointer flex-col items-center gap-0.5 px-0.5 py-1 hover:bg-[#3a2e24] md:w-10 md:gap-1 md:px-1 md:py-1.5",
              shown && "outline outline-2 outline-emerald-400",
            )}
          >
            <PixelIcon name={m.icon} size={18} />
            <div className="relative h-9 w-2 overflow-hidden bg-white/15 md:h-14 md:w-2.5">
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
            {!open && (
              <span
                className={cn(
                  "pixel-panel-dark pointer-events-none absolute top-1/2 hidden -translate-y-1/2 px-2 py-1 text-xs group-hover:block",
                  m.key === "food" || grief > 0 || roofless > 0 ? "w-60" : "whitespace-nowrap",
                  side === "left" ? "left-12" : "right-12",
                )}
                data-testid={m.key === "food" ? "food-meter-tip" : undefined}
              >
                {m.label}: {value}/100 (click to see why)
                {m.key === "food" && <span className="mt-1 block text-white/70">{foodMeterNote(state)}</span>}
                {roofless > 0 && (
                  <span className="mt-1 block text-red-300" data-testid="roof-note">
                    No roof: −{roofless}. {homelessCount(state)} sleeping out in the cold. Build homes.
                  </span>
                )}
                {grief > 0 && (
                  <span className="mt-1 block text-red-300" data-testid="grief-note">
                    Grieving: −{grief}. Someone was dropped into a fire or the sea. It fades slowly.
                  </span>
                )}
              </span>
            )}
          </div>
        );
      })}
      {open && <MeterPanel meter={open} side={side} onClose={() => setOpen(null)} />}
    </div>
  );
}

// What each meter means, and the real-world target it stands for.
const ABOUT: Record<MeterKey, { about: string; world: string }> = {
  food: {
    about: "Whether the tribe makes enough to eat and drink. It is not the food in store (top bar).",
    world: "In the real world: SDG 2.1 is about ending hunger, and 2.4 about growing food in ways the land can keep up with.",
  },
  shelter: {
    about: "A roof for everyone, healers, clean water and clean streets.",
    world: "In the real world: SDG 11.1 is about safe, decent homes for all, and SDG 6 about clean water and sanitation.",
  },
  happiness: {
    about: "How your people feel. It rises with the other meters and falls with cold, sickness, hunger and loss.",
    world: "In the real world: SDG 3.4 includes promoting mental health and well-being.",
  },
  literacy: {
    about: "How many of your people can read and learn: elders, schools and every advancement.",
    world: "In the real world: SDG 4.6 is about making sure young people and adults can read, write and count.",
  },
  energy: {
    about: "Light and heat. Fires give it but burn wood and add smoke; town houses and windmills give it more cleanly.",
    world: "In the real world: SDG 7.1 is about energy for everyone, and 7.2 about more of it from renewable sources.",
  },
  sustainability: {
    about: "How healthy your land is. It starts at 100, and each choice below takes some of it away.",
    world: "In the real world: SDG 15.2 is about halting deforestation and restoring forests, and SDG 11.6 about cutting the pollution our towns and cities make.",
  },
};

// Why is this meter where it is? Every part, with a hint on what helps, and
// "What should I fix?": the three changes that would raise it most.
function MeterPanel({ meter, side, onClose }: { meter: MeterKey; side: "left" | "right"; onClose: () => void }) {
  const { state } = useGame();
  const info = METERS.find((m) => m.key === meter)!;
  const land = meter === "sustainability";
  // Sustainability's starting 100 is said in words above the list.
  const parts = meterBreakdown(state, meter).filter((p) => !(land && p.value === 100));
  const fixes = meterFixes(state, meter);
  const trend = sustainabilityTrend(state);
  const [fixing, setFixing] = useState(false);
  const id = (name: string) => (land ? `sustain-${name}` : `meter-${name}`);
  return (
    <div
      className={cn(
        "pixel-panel font-pixel absolute bottom-0 w-64 max-w-[calc(100vw-4rem)] p-3 text-xs md:w-72",
        side === "left" ? "left-10 md:left-12" : "right-10 md:right-12",
      )}
      data-testid={id("panel")}
      data-meter={meter}
    >
      <div className="mb-1 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm font-semibold">
          <PixelIcon name={info.icon} size={16} />
          {info.label}: <span className="font-num text-base">{state.meters[meter]}</span>
        </span>
        <button type="button" onClick={onClose} className="text-stone-500 underline">
          Close
        </button>
      </div>
      <p className="mb-2 text-stone-600">{ABOUT[meter].about}</p>
      {meter === "food" && <p className="mb-2 text-stone-600">{foodMeterNote(state)}</p>}
      {parts.length === 0 && <p className="text-emerald-700">{land ? "Nothing is harming the land right now." : "Nothing is adding to this yet."}</p>}
      {fixes.length > 0 && (
        <button
          type="button"
          onClick={() => setFixing(!fixing)}
          className="pixel-btn mb-2 w-full bg-emerald-600 px-2 py-1 text-white hover:bg-emerald-500"
          data-testid={id("fix-toggle")}
        >
          {fixing ? "Show every cause" : "What should I fix?"}
        </button>
      )}
      {fixing && fixes.length > 0 ? (
        <ol className="flex flex-col gap-2" data-testid={id("fixes")}>
          {fixes.map((p, i) => (
            <li key={p.label} className="flex flex-col">
              <span className="flex justify-between gap-2">
                <span className="font-semibold">
                  {i + 1}. {p.label}
                </span>
                <span className="font-num text-sm text-emerald-700">+{Math.round(p.gain)}</span>
              </span>
              <span className="text-[11px] text-emerald-800">{p.fix}</span>
            </li>
          ))}
        </ol>
      ) : (
        <ul className="flex max-h-[45vh] flex-col gap-1.5 overflow-y-auto">
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
      )}
      {land && (
        <p
          className={cn(
            "mt-2 border-t-2 border-stone-300 pt-1.5",
            trend < -1 ? "text-red-700" : trend > 1 ? "text-emerald-700" : "text-stone-600",
          )}
        >
          Last minute:{" "}
          {Math.abs(trend) < 1 ? "holding steady" : `${trend < 0 ? "falling" : "rising"} by ${Math.round(Math.abs(trend))}`}
        </p>
      )}
      {!land && <p className="mt-2 border-t-2 border-stone-300 pt-1.5 text-[11px] text-stone-500">Each line adds to (or takes from) the meter; it can&apos;t go below 0 or above 100.</p>}
      <p className="mt-1 text-[11px] text-stone-500">{ABOUT[meter].world}</p>
    </div>
  );
}
