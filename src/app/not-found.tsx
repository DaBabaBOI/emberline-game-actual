import Link from "next/link";
import { HOME } from "@/lib/home";
import { PixelIcon } from "@/components/civ/pixel-icon";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-sky-200 via-sky-50 to-[#fbf7ef] px-4 py-10 text-stone-900">
      <div className="w-full max-w-2xl">
        <div className="pixel-panel relative overflow-hidden p-6 sm:p-8">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-100/60 via-transparent to-emerald-100/60" aria-hidden="true" />

          <div className="relative">
            <div className="mb-4 flex items-center justify-center gap-3 text-amber-800">
              <PixelIcon name="flame" size={42} />
              <span className="font-pixel text-sm uppercase tracking-[0.35em]">Emberline</span>
            </div>

            <div className="text-center">
              <p className="font-pixel text-5xl font-bold text-stone-800 sm:text-7xl">404</p>
              <h1 className="font-pixel mt-2 text-3xl font-bold sm:text-4xl">The trail goes cold</h1>
              <p className="mt-4 text-base text-stone-600 sm:text-lg">
                This page is off the map. The village still stands, but this route has wandered beyond
                the known land.
              </p>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <a
                href={HOME}
                className="pixel-btn font-pixel inline-flex items-center justify-center bg-emerald-600 px-4 py-3 text-lg font-semibold text-white hover:bg-emerald-500"
              >
                Back to the landing page
              </a>
              <Link
                href="/play"
                className="pixel-btn font-pixel inline-flex items-center justify-center bg-amber-400 px-4 py-3 text-lg font-semibold text-stone-900 hover:bg-amber-300"
              >
                Return to the game
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
