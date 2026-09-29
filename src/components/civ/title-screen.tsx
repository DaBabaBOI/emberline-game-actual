"use client";

import { useState } from "react";
import Link from "next/link";
import { UpdatesBar } from "@/components/updates-bar";
import { CULTURES, DIFFICULTIES, ERAS } from "@/game/content";
import { DEFAULT_NATION, type NewGameOptions } from "@/game/engine";
import type { CultureId, DifficultyId } from "@/game/types";
import { cn } from "@/lib/utils";
import { PixelIcon } from "@/components/civ/pixel-icon";

export function TitleScreen({
  canContinue,
  onContinue,
  onStart,
}: {
  canContinue: boolean;
  onContinue: () => void;
  onStart: (culture: CultureId, difficulty: DifficultyId, options?: NewGameOptions) => void;
}) {
  const [devMode] = useState(() => {
    try {
      return new URLSearchParams(window.location.search).has("dev");
    } catch {
      return false;
    }
  });
  const [culture, setCulture] = useState<CultureId>("balanced");
  const [nation, setNation] = useState("");
  const [difficulty, setDifficulty] = useState<DifficultyId>("normal");

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-sky-200 via-sky-50 to-[#fbf7ef] text-stone-900">
      <UpdatesBar />
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-3xl">
          <div className="mb-8 text-center">
            <p className="font-pixel text-sm font-semibold uppercase tracking-[0.3em] text-amber-700">
              A sustainability trade-off game
            </p>
            <h1 className="font-pixel mt-2 flex items-center justify-center gap-3 text-6xl font-bold">
              <PixelIcon name="flame" size={56} />
              Emberline
            </h1>
            <p className="mt-3 text-stone-600">
              Grow a Stone Age tribe without destroying the land that feeds it.
            </p>
          </div>

          {canContinue && (
            <button
              type="button"
              onClick={onContinue}
              className="pixel-btn font-pixel mb-6 w-full bg-amber-400 py-3 text-lg font-semibold text-stone-900 hover:bg-amber-300"
            >
              Continue saved game
            </button>
          )}

          <div className="pixel-panel p-5">
            <label className="font-pixel mb-4 block">
              <span className="mb-1 block text-lg font-semibold">Name your people</span>
              <input
                value={nation}
                onChange={(e) => setNation(e.target.value.slice(0, 24))}
                placeholder={DEFAULT_NATION}
                maxLength={24}
                className="w-full border-[3px] border-[#2b2119] bg-white px-3 py-2 text-base outline-none focus:bg-amber-50"
                data-testid="nation-input"
              />
            </label>
            <h2 className="font-pixel mb-3 text-lg font-semibold">Choose your culture</h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(Object.keys(CULTURES) as CultureId[]).map((id) => {
                const c = CULTURES[id];
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setCulture(id)}
                    className={cn(
                      "pixel-btn p-3 text-left",
                      culture === id ? "bg-amber-200" : "bg-white hover:bg-amber-50",
                    )}
                  >
                    <PixelIcon name={c.icon} size={32} />
                    <div className="font-pixel mt-1 font-medium">{c.name}</div>
                    <div className="text-xs text-stone-500">{c.blurb}</div>
                  </button>
                );
              })}
            </div>

            <h2 className="font-pixel mb-3 mt-6 text-lg font-semibold">Difficulty</h2>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(DIFFICULTIES) as DifficultyId[]).map((id) => {
                const d = DIFFICULTIES[id];
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setDifficulty(id)}
                    className={cn(
                      "pixel-btn p-3 text-left",
                      difficulty === id ? "bg-emerald-200" : "bg-white hover:bg-emerald-50",
                    )}
                  >
                    <div className="font-pixel font-medium">{d.name}</div>
                    <div className="text-xs text-stone-500">{d.blurb}</div>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => onStart(culture, difficulty, { nation })}
              className="pixel-btn font-pixel mt-6 w-full bg-emerald-600 py-3 text-xl font-semibold text-white hover:bg-emerald-500"
            >
              {canContinue ? "Start a new game" : "Start"}
            </button>
          </div>

          {devMode && (
            <div className="pixel-panel mt-6 border-dashed p-4">
              <h2 className="font-pixel mb-1 text-lg font-semibold">Dev mode</h2>
              <p className="mb-3 text-xs text-stone-500">
                Start in any era with 999 of everything and earlier advancements done.
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {ERAS.map((era, i) => (
                  <button
                    key={era.name}
                    type="button"
                    onClick={() => onStart(culture, difficulty, { dev: true, startEra: i, nation })}
                    className="pixel-btn font-pixel bg-sky-100 px-2 py-2 text-sm hover:bg-sky-200"
                  >
                    {era.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <p className="mt-6 text-center text-sm text-stone-500">
            <Link href="/" className="underline">
              Back to the project page
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
