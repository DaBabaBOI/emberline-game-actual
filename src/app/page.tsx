import Link from "next/link";
import { ERAS } from "@/game/content";
import type { IconId } from "@/game/sprites";
import { PixelIcon } from "@/components/civ/pixel-icon";

const SDGS = [
  { n: 4, name: "Quality Education", color: "#c5192d", how: "Literacy is a core meter. Stories, schools and scholars drive every discovery." },
  { n: 7, name: "Affordable & Clean Energy", color: "#e5a800", how: "Energy evolves from firewood to coal to fusion, and every choice has a cost." },
  { n: 9, name: "Industry, Innovation & Infrastructure", color: "#fd6925", how: "Supply chains, trade routes and a tech tree from stone tools to spaceflight." },
  { n: 11, name: "Sustainable Cities & Communities", color: "#f08b1a", how: "Pollution turns the sky grey and hurts your people. Build cities that last." },
];

const ERA_ICONS: IconId[] = ["flame", "amphora", "column", "castle", "factory", "rocket"];

const FEATURES: [IconId, string][] = [
  ["spyglass", "Explore islands hidden under the clouds"],
  ["hut", "Place buildings on hex tiles with a live preview"],
  ["person", "Watch your people farm, hunt and walk to lessons"],
  ["shield", "Train warriors and fight off raiders"],
  ["star", "Unlock advancements, including secret ones"],
  ["leaf", "Neglect sustainability and smog rolls in"],
];

const TEAM = ["Prithu Sharma", "Aarav Kumar", "Vagisha Sinha", "Aaradhya Verma"];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#fbf3de] text-[#2b2119]">
      <section className="border-b-4 border-[#2b2119] bg-gradient-to-b from-sky-300 via-sky-200 to-[#fbf3de]">
        <div className="mx-auto max-w-5xl px-4 pb-14 pt-14 text-center">
          <p className="font-pixel text-sm font-semibold uppercase tracking-[0.3em] text-amber-800">
            SHISTECH · Hacktrack
          </p>
          <h1 className="font-pixel mt-3 flex items-center justify-center gap-4 text-6xl font-bold sm:text-7xl">
            <PixelIcon name="flame" size={72} />
            Emberline
          </h1>
          <p className="font-pixel mt-3 text-2xl text-amber-900">From the first fire to the stars</p>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-stone-700">
            A civilization builder on hand-crafted hex islands. Lead a people at the crossroads of
            the world from the first campfire to fusion power and interstellar travel, and discover
            that how you grow matters as much as how fast.
          </p>
          <Link
            href="/play"
            className="pixel-btn font-pixel mt-8 inline-block bg-emerald-600 px-10 py-4 text-2xl font-semibold text-white hover:bg-emerald-500"
          >
            Play now
          </Link>
          <p className="mt-4 text-xs text-stone-600">Runs in the browser. Best on a laptop.</p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-12">
        <h2 className="font-pixel text-3xl font-semibold">Six eras of history</h2>
        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {ERAS.map((era, i) => (
            <div key={era.name} className="pixel-panel p-4">
              <PixelIcon name={ERA_ICONS[i]} size={40} />
              <div className="font-pixel mt-2 font-semibold leading-tight">{era.name}</div>
              <div className="text-xs text-stone-500">{era.currency}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-12">
        <h2 className="font-pixel text-3xl font-semibold">How it connects to the UN SDGs</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {SDGS.map((g) => (
            <div key={g.n} className="pixel-panel flex gap-4 p-4">
              <div
                className="font-pixel flex h-14 w-14 shrink-0 items-center justify-center border-[3px] border-[#2b2119] text-2xl font-bold text-white"
                style={{ background: g.color }}
              >
                {g.n}
              </div>
              <div>
                <div className="font-pixel text-lg font-semibold">{g.name}</div>
                <p className="text-sm text-stone-600">{g.how}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-14">
        <h2 className="font-pixel text-3xl font-semibold">What you do</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(([icon, text]) => (
            <div key={text} className="pixel-panel flex items-center gap-3 px-4 py-3">
              <PixelIcon name={icon} size={28} />
              <span className="text-sm">{text}</span>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t-4 border-[#2b2119] bg-[#f3e6c4]">
        <div className="font-pixel mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-sm">
          <span>Team: {TEAM.join(" · ")}</span>
          <span>SHISTECH 2026</span>
        </div>
      </footer>
    </main>
  );
}
