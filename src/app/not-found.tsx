import Link from "next/link";
import { HOME } from "@/lib/home";
import { PixelIcon } from "@/components/civ/pixel-icon";

export default function NotFound() {
  return (
    <main className="not-found-page flex min-h-screen flex-col overflow-hidden bg-gradient-to-b from-sky-200 via-sky-50 to-[#fbf7ef] px-4 py-5 text-[#2b2119] sm:px-8 sm:py-8">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between border-b-2 border-[#2b2119]/25 pb-4 pr-32 sm:pr-40">
        <a href={HOME} className="font-pixel inline-flex items-center gap-2 text-lg font-bold text-[#2b2119]">
          <PixelIcon name="flame" size={28} />
          Emberline
        </a>
          <span className="font-pixel hidden text-xs font-semibold uppercase text-amber-900 sm:block sm:text-sm">
          Field report · 04
        </span>
      </header>

      <section className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-8 py-10 xl:grid-cols-[1fr_1.1fr] xl:gap-12 xl:py-14">
        <div className="order-1 xl:order-1">
          <p className="font-pixel mb-3 text-sm font-semibold uppercase text-emerald-900">
            Beyond the explored edge
          </p>
          <p className="nf-code text-7xl font-bold leading-none sm:text-8xl">404</p>
          <h1 className="font-pixel mt-3 max-w-xl text-3xl font-bold leading-tight sm:text-5xl">
            This trail ends in water.
          </h1>
          <p className="mt-4 max-w-lg text-base leading-relaxed text-stone-700 sm:text-lg">
            Your scouts have reached the edge of the map. This page isn’t part of the known world,
            but the village is still right where you left it.
          </p>

          <nav aria-label="404 page navigation" className="mt-7 flex flex-col gap-3 sm:flex-row">
            <a
              href={HOME}
              className="pixel-btn nf-home-button font-pixel inline-flex min-h-12 items-center justify-center gap-2 bg-emerald-700 px-5 py-3 text-base font-semibold text-white hover:bg-emerald-600"
            >
              <PixelIcon name="hut" size={20} />
              Return to the village
            </a>
            <Link
              href="/play"
              className="pixel-btn nf-game-button font-pixel inline-flex min-h-12 items-center justify-center gap-2 bg-amber-400 px-5 py-3 text-base font-semibold text-[#2b2119] hover:bg-amber-300"
            >
              <PixelIcon name="compass" size={20} />
              Open the game
            </Link>
          </nav>
        </div>

        <div
          aria-label="A small island surrounded by unexplored water"
          role="img"
          className="nf-map-scene order-2 relative mx-auto flex aspect-[1.3] w-full max-w-lg items-center justify-center overflow-hidden border-[3px] border-[#2b2119] bg-sky-500 shadow-[8px_8px_0_rgba(43,33,25,0.3)] xl:order-2"
        >
          <div className="nf-map-grid" aria-hidden="true">
            {Array.from({ length: 25 }, (_, index) => {
              const row = Math.floor(index / 5);
              const column = index % 5;
              const land =
                (row === 1 && column === 2) ||
                (row === 2 && column >= 1 && column <= 3) ||
                (row === 3 && column >= 1 && column <= 3) ||
                (row === 4 && column === 2);
              const forest = land && ((row === 1 && column === 2) || (row === 2 && column === 3));
              return (
                <span
                  key={index}
                  className={
                    "nf-map-tile " +
                    (forest ? "nf-map-forest" : land ? "nf-map-land" : "nf-map-water")
                  }
                />
              );
            })}
          </div>
          <div className="nf-map-marker pixel-panel absolute flex items-center gap-2 px-3 py-2">
            <PixelIcon name="compass" size={24} />
            <span className="font-pixel text-xs font-semibold">Map edge</span>
          </div>
          <div className="nf-map-caption absolute bottom-3 left-3 border-2 border-[#2b2119] bg-[#fdf6e3] px-2 py-1">
            <span className="font-pixel text-[10px] font-semibold uppercase text-[#2b2119]">
              Unknown waters
            </span>
          </div>
        </div>
      </section>

      <footer className="font-pixel mx-auto flex w-full max-w-6xl items-center justify-between gap-3 border-t-2 border-[#2b2119]/25 pt-4 text-xs text-stone-700">
        <span>Keep the fire. Find another path.</span>
        <span aria-hidden="true">EMBERLINE · WORLD MAP</span>
      </footer>
    </main>
  );
}
