"use client";

import { useState } from "react";
import Link from "next/link";
import { CULTURES, DIFFICULTIES } from "@/game/content";
import type { CultureId, DifficultyId } from "@/game/types";
import { cn } from "@/lib/utils";

export function TitleScreen({
  canContinue,
  onContinue,
  onStart,
}: {
  canContinue: boolean;
  onContinue: () => void;
  onStart: (culture: CultureId, difficulty: DifficultyId) => void;
}) {
  const [culture, setCulture] = useState<CultureId>("balanced");
  const [difficulty, setDifficulty] = useState<DifficultyId>("normal");

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_top,#1e3a5f,#0b1220_70%)] p-4 text-white">
      <div className="w-full max-w-3xl">
        <div className="mb-8 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-amber-300/80">From fire to the stars</p>
          <h1 className="mt-2 text-5xl font-bold tracking-tight">🔥 Hacktrack</h1>
          <p className="mt-3 text-white/60">
            Lead a people at the crossroads of the world, from the first campfire to interstellar travel.
          </p>
        </div>

        {canContinue && (
          <button
            type="button"
            onClick={onContinue}
            className="mb-6 w-full rounded-2xl bg-amber-400 py-3 text-lg font-semibold text-slate-950 hover:bg-amber-300"
          >
            Continue saved game
          </button>
        )}

        <div className="rounded-3xl bg-white/5 p-5 ring-1 ring-white/10 backdrop-blur">
          <h2 className="mb-3 font-semibold">Choose your culture</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(Object.keys(CULTURES) as CultureId[]).map((id) => {
              const c = CULTURES[id];
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setCulture(id)}
                  className={cn(
                    "rounded-xl p-3 text-left ring-1 transition",
                    culture === id ? "bg-amber-400/20 ring-amber-300" : "bg-white/5 ring-white/10 hover:bg-white/10",
                  )}
                >
                  <div className="text-2xl">{c.icon}</div>
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-white/60">{c.blurb}</div>
                </button>
              );
            })}
          </div>

          <h2 className="mb-3 mt-6 font-semibold">Difficulty</h2>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(DIFFICULTIES) as DifficultyId[]).map((id) => {
              const d = DIFFICULTIES[id];
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setDifficulty(id)}
                  className={cn(
                    "rounded-xl p-3 text-left ring-1 transition",
                    difficulty === id ? "bg-emerald-400/20 ring-emerald-300" : "bg-white/5 ring-white/10 hover:bg-white/10",
                  )}
                >
                  <div className="font-medium">{d.name}</div>
                  <div className="text-xs text-white/60">{d.blurb}</div>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => onStart(culture, difficulty)}
            className="mt-6 w-full rounded-2xl bg-emerald-500 py-3 text-lg font-semibold text-slate-950 hover:bg-emerald-400"
          >
            {canContinue ? "Start a new game" : "Start"}
          </button>
        </div>

        <p className="mt-6 text-center text-sm text-white/40">
          <Link href="/" className="underline">
            Back to the project page
          </Link>
        </p>
      </div>
    </div>
  );
}
