"use client";

import { useState } from "react";

// The Future & Space era's screens: the climate tipping point banner, and
// Space (a view of the planet from orbit, with the projects to launch).

import { CARBON, KARDASHEV, SPACE, TIPPING } from "@/game/content";
import { canAfford, carbonCaptured, carbonFlow, cleanPower, forestSink, kardashev, launchError, secs, spaceDone } from "@/game/engine";
import type { Resources } from "@/game/types";
import { useGame } from "@/components/civ/game-provider";
import { PixelIcon } from "@/components/civ/pixel-icon";
import { Countdown } from "./countdown";
import { cn } from "@/lib/utils";

// ppm a minute at normal speed (a minute is 40 ticks).
const perMinute = (perTick: number) => perTick * 40;

// The tipping point: how far the air is from safe, which way it's going, and
// what pulls carbon back out.
export function TippingBanner() {
  const { state } = useGame();
  // Click to shrink it to one line (and back).
  const [small, setSmall] = useState(false);
  const t = state.tipping!;
  const carbon = state.carbon ?? CARBON.start;
  const flow = perMinute(carbonFlow(state));
  const left = Math.max(0, t.endTick - state.tick);
  // What it would take: ppm a minute, from now to the deadline.
  const needed = (carbon - TIPPING.safe) / Math.max(1, secs(left) / 60);
  const onTrack = -flow >= needed;
  return (
    <button type="button" onClick={() => setSmall(!small)} title={small ? "Show more" : "Click to hide the details"} className="pointer-events-auto flex w-full justify-center text-left" data-testid="tipping-banner">
      {small ? (
        <span className="font-pixel border-[3px] border-[#140e0a] bg-[#4a3b2e]/95 px-3 py-1 text-xs text-white">
          The tipping point: {Math.round(carbon)} ppm, {onTrack ? "on track" : "not fast enough"} · show more
        </span>
      ) : (
        <>
      <div className={cn("font-pixel flex w-[min(92vw,560px)] flex-col gap-1.5 border-[3px] border-[#140e0a] px-4 py-2 text-xs text-white md:text-sm", onTrack ? "bg-[#2f5d3a]/95" : "bg-[#5a2a4a]/95")}>
        <span className="flex items-start gap-2 font-semibold">
          <PixelIcon name="earth" size={20} />
          <span>
            The tipping point: get the air down to {TIPPING.safe} ppm in <Countdown ticks={left} />s, or the climate tips for good.
          </span>
        </span>
        <span className="text-[11px] text-white/85">
          Now {Math.round(carbon)} ppm, {flow <= 0 ? "falling" : "rising"} by {Math.abs(flow).toFixed(1)} a minute. Needed: falling by {needed.toFixed(1)} a minute.{" "}
          {onTrack ? "On track!" : "Not fast enough yet."}
        </span>
        <ul className="text-[11px] text-white/75">
          <li>− Forest takes back {perMinute(forestSink(state)).toFixed(1)} a minute{state.researched.includes("rewilding") ? " (Rewilding: twice as much)" : ""}</li>
          {carbonCaptured(state) > 0 && <li>− Air capture takes back {perMinute(carbonCaptured(state)).toFixed(1)} a minute</li>}
        </ul>
        <span className="text-[11px] text-white/60">
          Helps: Air Capture Plants on clean power, planting forest, Rewilding, and closing coal plants and smoky factories.
        </span>
      </div>
        </>
      )}
    </button>
  );
}

// The planet from orbit: what's been launched circles it; the Moon base sits on the Moon.
export function SpacePanel() {
  const { state, dispatch, setPanel } = useGame();
  const k = kardashev(state);
  const launched = state.space ?? [];
  return (
    <div className="pointer-events-auto absolute inset-0 z-[27] flex items-center justify-center bg-black/40 p-2" data-testid="space-panel">
      <div className="pixel-panel-dark font-pixel w-[min(94vw,680px)] p-3 text-xs text-white md:p-4 md:text-sm">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-bold">
            <PixelIcon name="rocket" size={22} />
            Space
          </h3>
          <button type="button" onClick={() => setPanel(null)} className="text-sm underline">
            Close
          </button>
        </div>

        {/* The view: stars, our planet, its orbit and the Moon. */}
        <div className="relative mb-3 h-44 overflow-hidden border-[3px] border-[#140e0a] bg-[#060a1a] md:h-56" data-testid="space-view">
          {Array.from({ length: 40 }, (_, i) => (
            <span
              key={i}
              className="scene-twinkle absolute h-0.5 w-0.5 bg-white"
              style={{ left: `${(i * 37) % 100}%`, top: `${(i * 53) % 100}%`, animationDelay: `${(i % 7) * 0.4}s`, opacity: 0.4 + (i % 3) * 0.2 }}
            />
          ))}
          <span className="absolute left-1/2 top-1/2 h-36 w-36 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-white/25 md:h-44 md:w-44" />
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <PixelIcon name="earth" size={84} title="Our planet" />
          </span>
          {/* Satellites on the orbit. */}
          {(["satellites", "telescope", "solarsat"] as const).map((id, i) =>
            launched.includes(id) ? (
              <span
                key={id}
                className="absolute"
                style={{ left: `calc(50% + ${Math.cos(i * 2.1 + 0.5) * 72}px - 10px)`, top: `calc(50% + ${Math.sin(i * 2.1 + 0.5) * 72}px - 10px)` }}
              >
                <PixelIcon name={id === "telescope" ? "spyglass" : id === "solarsat" ? "solar" : "satellite"} size={20} />
              </span>
            ) : null,
          )}
          {/* Further out: Mars, the asteroid belt, and a far star with our probe and Ark on the way. */}
          <span className="absolute left-[7%] top-[14%] flex flex-col items-center">
            <span className="block h-7 w-7 rounded-full bg-[#c1440e] shadow-[inset_-5px_-4px_0_#7a2a08]" title="Mars" />
            {launched.includes("mars") && <span className="mt-0.5 text-[10px] text-teal-200">Greenhouse</span>}
          </span>
          <span className="absolute bottom-[10%] right-[4%] flex gap-1" title="The asteroid belt">
            {[5, 3, 4, 2, 3].map((d, i) => (
              <span key={i} className="block bg-stone-400" style={{ width: d * 2, height: d * 2, marginTop: (i % 2) * 6 }} />
            ))}
            {launched.includes("asteroids") && <span className="ml-1 text-[10px] text-teal-200">Miners</span>}
          </span>
          <span className="absolute right-[3%] top-[48%] flex flex-col items-center" title="Alpha Centauri, 4.2 light-years away">
            <span className="scene-twinkle block h-2 w-2 rounded-full bg-amber-200 shadow-[0_0_8px_3px_rgba(253,230,138,0.7)]" />
            <span className="mt-0.5 text-[9px] text-white/60">Alpha Centauri</span>
          </span>
          {(launched.includes("probe") || launched.includes("ark")) && (
            <span className="absolute right-[12%] top-[56%] flex items-center gap-1 text-[10px] text-teal-200">
              {launched.includes("probe") && <PixelIcon name="star" size={12} title="The probe, on its way" />}
              {launched.includes("ark") && <PixelIcon name="rocket" size={16} title="The Ember Ark, on its way" />}
              <span>→</span>
            </span>
          )}
          <span className="absolute right-[8%] top-[12%] flex flex-col items-center">
            <PixelIcon name="moon" size={40} title="The Moon" />
            {launched.includes("moonbase") && <span className="mt-0.5 text-[10px] text-teal-200">Moon base</span>}
          </span>
          <span className="absolute bottom-2 left-2 text-[11px] text-white/80" data-testid="space-kardashev">
            Kardashev {k.toFixed(2)} · {Math.round(cleanPower(state))}/{KARDASHEV.clean} clean power
          </span>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {SPACE.projects.map((p) => {
            const done = spaceDone(state, p.id);
            const cost = p.cost as Partial<Resources>;
            const locked = done ? null : launchError(state, p.id);
            const ok = canAfford(state, cost) && !locked;
            return (
              <div key={p.id} className={cn("flex flex-col gap-1 border-2 border-white/15 p-2", done && "border-teal-400/60 bg-teal-900/30")}>
                <span className="flex items-center gap-1.5 font-semibold">
                  <PixelIcon name={p.icon} size={18} />
                  {p.name}
                </span>
                <span className="text-[11px] text-white/80">{p.text}</span>
                {done ? (
                  <span className="text-[11px] text-teal-200">Launched</span>
                ) : locked ? (
                  <span className="mt-auto flex items-center gap-1 text-[11px] text-amber-200" data-testid={`locked-${p.id}`}>
                    <PixelIcon name="lock" size={12} />
                    {locked}
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={!ok}
                    onClick={() => dispatch({ type: "launch", project: p.id })}
                    className="pixel-btn mt-auto bg-indigo-600 px-2 py-1 text-left text-white hover:bg-indigo-500 disabled:opacity-50"
                    data-testid={`launch-${p.id}`}
                  >
                    Launch:{" "}
                    {Object.entries(cost)
                      .map(([r, v]) => `${v} ${r === "currency" ? "coins" : r}`)
                      .join(", ")}
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] text-white/60">Every launch burns rocket fuel: +{SPACE.carbon} ppm of carbon each.</p>
      </div>
    </div>
  );
}
