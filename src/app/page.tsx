import Link from "next/link";
import { ERAS } from "@/game/content";

const SDGS = [
  { n: 4, name: "Quality Education", color: "#c5192d", how: "Literacy is a core meter. Schools and scholars drive every discovery." },
  { n: 7, name: "Affordable & Clean Energy", color: "#fcc30b", how: "Energy evolves from firewood to coal to fusion. Clean choices matter." },
  { n: 9, name: "Industry, Innovation & Infrastructure", color: "#fd6925", how: "Supply chains, trade routes and a tech tree from stone tools to spaceflight." },
  { n: 11, name: "Sustainable Cities & Communities", color: "#fd9d24", how: "Pollution turns the sky grey and hurts your people. Build cities that last." },
];

const ERA_ICONS = ["🔥", "🏺", "🏛️", "🏰", "🏭", "🚀"];

const TEAM = ["Prithu Sharma", "Aarav Kumar", "Vagisha Sinha", "Aaradhya Verma"];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0b1220] text-white">
      <section className="relative overflow-hidden bg-[radial-gradient(ellipse_at_top,#1e3a5f,#0b1220_70%)]">
        <div className="mx-auto max-w-5xl px-4 pb-20 pt-16 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-amber-300/80">SHISTECH · Hacktrack</p>
          <h1 className="mt-4 text-5xl font-bold tracking-tight sm:text-6xl">From fire to the stars</h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-white/70">
            A civilization builder on hand-crafted hex islands. Lead a people at the crossroads of
            the world from the first campfire to fusion power and interstellar travel, and discover
            that how you grow matters as much as how fast.
          </p>
          <Link
            href="/play"
            className="mt-8 inline-block rounded-2xl bg-emerald-500 px-8 py-4 text-lg font-semibold text-slate-950 shadow-lg shadow-emerald-500/20 hover:bg-emerald-400"
          >
            ▶ Play now
          </Link>
          <p className="mt-3 text-xs text-white/40">Runs in the browser. Best on a laptop.</p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-14">
        <h2 className="text-2xl font-semibold">Six eras of history</h2>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {ERAS.map((era, i) => (
            <div key={era.name} className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
              <div className="text-3xl">{ERA_ICONS[i]}</div>
              <div className="mt-2 text-sm font-semibold">{era.name}</div>
              <div className="text-xs text-white/50">{era.currency}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-14">
        <h2 className="text-2xl font-semibold">How it connects to the UN SDGs</h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {SDGS.map((g) => (
            <div key={g.n} className="flex gap-4 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-xl font-bold"
                style={{ background: g.color }}
              >
                {g.n}
              </div>
              <div>
                <div className="font-semibold">{g.name}</div>
                <p className="text-sm text-white/65">{g.how}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-14">
        <h2 className="text-2xl font-semibold">What you do</h2>
        <ul className="mt-4 grid gap-2 text-white/75 sm:grid-cols-2">
          <li>🧭 Explore islands hidden under the clouds with scouts</li>
          <li>🏗️ Place buildings on hex tiles with a live preview</li>
          <li>👥 Watch your people walk to work, and kids go to learn</li>
          <li>🌳 Unlock a branching advancement tree, with secret goals</li>
          <li>🐫 Deal with traders, wanderers and wildfires</li>
          <li>🌫️ Neglect sustainability and smog rolls in</li>
        </ul>
      </section>

      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-sm text-white/50">
          <span>Team: {TEAM.join(" · ")}</span>
          <span>SHISTECH 2026</span>
        </div>
      </footer>
    </main>
  );
}
