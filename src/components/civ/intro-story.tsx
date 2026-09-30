"use client";

import { NEXT_ERA_POPULATION } from "@/game/content";
import { PixelIcon } from "@/components/civ/pixel-icon";

// A short story before a new game: who you are, what you're aiming for, and how
// it can go wrong. Kept to a few lines on purpose.
export function IntroStory({ nation, onBegin }: { nation: string; onBegin: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-sky-200 via-sky-50 to-[#fbf7ef] p-4 text-stone-900">
      <div className="pixel-panel w-full max-w-xl p-6" data-testid="intro-story">
        <h1 className="font-pixel flex items-center gap-3 text-3xl font-bold">
          <PixelIcon name="flame" size={36} />
          {nation}
        </h1>
        <p className="mt-4 leading-relaxed">
          Your people have walked for many days. The old lands behind them are dry. Ahead lie green islands, full of
          forest, fish and game.
        </p>
        <p className="mt-3 leading-relaxed">
          You are their new chief. Light a fire, feed everyone and build homes. The forest gives you wood, rain and
          animals to hunt, but cut too much and it won&apos;t come back.
        </p>
        <div className="font-pixel mt-5 grid gap-2 text-sm sm:grid-cols-3">
          <div className="border-2 border-[#2b2119] bg-white p-2">
            <div className="font-semibold text-emerald-700">Your goal</div>
            Learn to farm and grow to {NEXT_ERA_POPULATION} people. That starts the Ancient era.
          </div>
          <div className="border-2 border-[#2b2119] bg-white p-2">
            <div className="font-semibold text-amber-700">Then</div>
            Beat the Roman legion, grow into a town and last through the great drought.
          </div>
          <div className="border-2 border-[#2b2119] bg-white p-2">
            <div className="font-semibold text-red-700">You lose if</div>
            Your people starve, lose hope, fall behind the world, or you ruin the land.
          </div>
        </div>
        <button
          type="button"
          onClick={onBegin}
          className="pixel-btn font-pixel mt-6 w-full bg-emerald-600 py-3 text-xl font-semibold text-white hover:bg-emerald-500"
        >
          Begin
        </button>
      </div>
    </div>
  );
}
