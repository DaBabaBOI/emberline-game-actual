"use client";

import { useState } from "react";
import Link from "next/link";
import { UpdatesBar } from "@/components/updates-bar";
import { CULTURES, DIFFICULTIES, ERAS } from "@/game/content";
import { DEFAULT_NATION, type NewGameOptions } from "@/game/engine";
import type { CultureId, DifficultyId, GameState } from "@/game/types";
import { SAVE_VERSION } from "@/game/engine";
import { loadFromCloud } from "@/lib/online";
import { cn } from "@/lib/utils";
import { PixelIcon } from "@/components/civ/pixel-icon";

// Set once a game has been started in this browser (First time is then no longer the default).
const PLAYED_KEY = "emberline-played";

export function TitleScreen({
  canContinue,
  onContinue,
  onStart,
  onLoadCloud,
}: {
  canContinue: boolean;
  onContinue: () => void;
  // Continue a game saved to the cloud with its code.
  onLoadCloud: (state: GameState) => void;
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
  // Someone who has never started a game here gets First-time mode by default.
  const [difficulty, setDifficulty] = useState<DifficultyId>(() => {
    try {
      return localStorage.getItem(PLAYED_KEY) ? "normal" : "first";
    } catch {
      return "normal";
    }
  });
  const start = (options?: NewGameOptions) => {
    try {
      localStorage.setItem(PLAYED_KEY, "1");
    } catch {
      // Private mode: fine, they just see First time again next visit.
    }
    onStart(culture, difficulty, options);
  };
  const [cloudCode, setCloudCode] = useState("");
  const [cloudStatus, setCloudStatus] = useState<"idle" | "loading" | "missing" | "old">("idle");

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
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
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
              onClick={() => start({ nation })}
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

          <form
            className="pixel-panel mt-6 flex flex-wrap items-center gap-2 p-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setCloudStatus("loading");
              const saved = await loadFromCloud(cloudCode);
              if (!saved) return setCloudStatus("missing");
              if (saved.version !== SAVE_VERSION) return setCloudStatus("old");
              onLoadCloud(saved);
            }}
          >
            <span className="font-pixel text-sm font-semibold">Continue from a cloud save</span>
            <input
              value={cloudCode}
              onChange={(e) => setCloudCode(e.target.value)}
              placeholder="ABCD-1234"
              maxLength={9}
              className="font-num w-32 border-2 border-[#2b2119] bg-white px-2 py-1 text-lg uppercase tracking-widest"
              data-testid="cloud-code-input"
            />
            <button
              type="submit"
              disabled={cloudCode.replace(/[^A-Za-z0-9]/g, "").length !== 8 || cloudStatus === "loading"}
              className="pixel-btn font-pixel bg-sky-100 px-3 py-1 text-sm hover:bg-sky-200 disabled:opacity-40"
            >
              {cloudStatus === "loading" ? "Loading..." : "Load"}
            </button>
            {cloudStatus === "missing" && <span className="text-sm text-red-700">No save with that code (or you&apos;re offline).</span>}
            {cloudStatus === "old" && <span className="text-sm text-red-700">That save is from an older version of the game.</span>}
          </form>

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
