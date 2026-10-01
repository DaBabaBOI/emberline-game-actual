"use client";

// The Industrial & Modern era's screens: the climate crisis banner.

import { CARBON, CLIMATE } from "@/game/content";
import { climateBase, climateReadiness, climateShield, climateToll, inClimateCrisis, secs, warming } from "@/game/engine";
import { useGame } from "@/components/civ/game-provider";
import { PixelIcon } from "@/components/civ/pixel-icon";
import { Countdown } from "./countdown";
import { cn } from "@/lib/utils";

// 360 s -> "6", 225 s -> "3.8".
const minutes = (s: number) => String(Math.round((s / 60) * 10) / 10);

// The climate crisis: the scientists' warning (with how ready the town is and
// what it would cost now), then how it is going.
export function ClimateBanner() {
  const { state } = useGame();
  const c = state.climate!;
  const on = inClimateCrisis(state);
  const pop = Math.floor(state.population);
  const toll = climateToll(state);
  const ready = Math.round((climateShield(state) / CLIMATE.maxReady) * 100);
  return (
    <div className="pointer-events-none flex justify-center" data-testid="climate-banner">
      <div
        className={cn(
          "font-pixel flex w-[min(92vw,560px)] flex-col gap-1.5 border-[3px] border-[#140e0a] px-4 py-2 text-xs text-white md:text-sm",
          on ? "bg-[#7a2e1f]/95" : "bg-[#4a3b2e]/95",
        )}
      >
        <span className="flex items-start gap-2 font-semibold">
          <PixelIcon name={on ? "flood" : "sun"} size={20} />
          <span>
            {on ? (
              <>
                The climate crisis is here: heat, storms and floods. {Math.round(c.deaths)} have died so far. It eases in{" "}
                <Countdown ticks={Math.max(0, c.endTick - state.tick)} />s.
              </>
            ) : (
              <>
                The climate crisis strikes in <Countdown ticks={Math.max(0, c.startTick - state.tick)} />s and lasts {minutes(secs(CLIMATE.ticks))} minutes.
              </>
            )}
          </span>
        </span>
        <span className="text-[11px] text-white/85">
          The world is {warming(state).toFixed(1)} °C warmer ({Math.round(state.carbon ?? CARBON.start)} ppm of carbon): on its own that would take{" "}
          {Math.round(climateBase(state) * 100)}% of the town. Ready: {ready}%, so about {Math.round(toll * pop)} of {pop} people ({Math.round(toll * 100)}
          %).
        </span>
        <ul className="text-[11px] text-white/75">
          {climateReadiness(state).map((part) => (
            <li key={part.label}>+ {part.label}</li>
          ))}
        </ul>
        <span className="text-[11px] text-white/60">
          Helps: Sea Walls, Hospitals, City Parks, clean power (wind, sun, water) and standing forest. Coal makes it worse.
        </span>
      </div>
    </div>
  );
}
