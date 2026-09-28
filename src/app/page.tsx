import Link from "next/link";
import { ERAS } from "@/game/content";

const SDGS = [
  { n: 4, name: "Quality Education", color: "#c5192d", how: "Literacy is a core meter. Stories, schools and scholars drive every discovery." },
  { n: 7, name: "Affordable & Clean Energy", color: "#e5a800", how: "Energy evolves from firewood to coal to fusion, and every choice has a cost." },
  { n: 9, name: "Industry, Innovation & Infrastructure", color: "#fd6925", how: "Supply chains, trade routes and a tech tree from stone tools to spaceflight." },
  { n: 11, name: "Sustainable Cities & Communities", color: "#f08b1a", how: "Pollution turns the sky grey and hurts your people. Build cities that last." },
];

const ERA_ICONS = ["🔥", "🏺", "🏛️", "🏰", "🏭", "🚀"];

const FEATURES = [
  ["🧭", "Explore islands hidden under the clouds"],
  ["🏗️", "Place buildings on hex tiles with a live preview"],
  ["👥", "Watch your people farm, hunt and walk to lessons"],
  ["⚔️", "Train warriors and fight off raiders"],
  ["✨", "Unlock advancements, including secret ones"],
  ["🌫️", "Neglect sustainability and smog rolls in"],
];

const TEAM = ["Prithu Sharma", "Aarav Kumar", "Vagisha Sinha", "Aaradhya Verma"];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#fbf7ef] text-stone-900">
      <section className="bg-gradient-to-b from-sky-200 via-sky-100 to-[#fbf7ef]">
        <div className="mx-auto max-w-5xl px-4 pb-16 pt-16 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-700">SHISTECH · Hacktrack</p>
          <h1 className="mt-3 text-6xl font-bold tracking-tight text-stone-900 sm:text-7xl">
            🔥 Emberline
          </h1>
          <p className="mt-2 text-xl font-medium text-amber-800">From the first fire to the stars</p>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-stone-600">
            A civilization builder on hand-crafted hex islands. Lead a people at the crossroads of
            the world from the first campfire to fusion power and interstellar travel, and discover
            that how you grow matters as much as how fast.
          </p>
          <Link
            href="/play"
            className="mt-8 inline-block rounded-2xl bg-emerald-600 px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-emerald-600/25 hover:bg-emerald-500"
          >
            ▶ Play now
          </Link>
          <p className="mt-3 text-xs text-stone-500">Runs in the browser. Best on a laptop.</p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-12">
        <h2 className="text-2xl font-semibold">Six eras of history</h2>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {ERAS.map((era, i) => (
            <div key={era.name} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200">
              <div className="text-3xl">{ERA_ICONS[i]}</div>
              <div className="mt-2 text-sm font-semibold">{era.name}</div>
              <div className="text-xs text-stone-500">Currency: {era.currency}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-12">
        <h2 className="text-2xl font-semibold">How it connects to the UN SDGs</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {SDGS.map((g) => (
            <div key={g.n} className="flex gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200">
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-xl font-bold text-white"
                style={{ background: g.color }}
              >
                {g.n}
              </div>
              <div>
                <div className="font-semibold">{g.name}</div>
                <p className="text-sm text-stone-600">{g.how}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-14">
        <h2 className="text-2xl font-semibold">What you do</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(([icon, text]) => (
            <div key={text} className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-stone-200">
              <span className="text-2xl">{icon}</span>
              <span className="text-sm text-stone-700">{text}</span>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-stone-200 bg-white/60">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-sm text-stone-500">
          <span>Team: {TEAM.join(" · ")}</span>
          <span>SHISTECH 2026</span>
        </div>
      </footer>
    </main>
  );
}
