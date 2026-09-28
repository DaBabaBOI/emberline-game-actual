import Link from "next/link";
import { BUILDINGS_BY_ID } from "@/game/content";
import type { IconId } from "@/game/sprites";
import { PixelIcon } from "@/components/civ/pixel-icon";

// SDG 11 is the core; the others are the goals the game's lessons and events link to.
// Colours are the official UN SDG colours.
const SDGS = [
  { n: 11, name: "Sustainable Cities & Communities", color: "#fd9d24", core: true, how: "The core of the game: grow a settlement that can last. Shelter, crowding, planning and pollution all matter." },
  { n: 15, name: "Life on Land", color: "#56c02b", how: "Sustainability measures the forest left standing. Clear-cut it and the deer vanish and the land wears out; restore it by planting." },
  { n: 7, name: "Affordable & Clean Energy", color: "#fcc30b", how: "Warmth comes from fire, and fire costs wood and fills the air with smoke. Warm clothes are the efficient alternative." },
  { n: 12, name: "Responsible Consumption", color: "#bf8b2e", how: "Take more food than you can keep and it rots. Hunt too hard and the herds disappear." },
  { n: 4, name: "Quality Education", color: "#c5192d", how: "Literacy is one of the six meters, and knowledge unlocks every advancement." },
  { n: 9, name: "Industry & Innovation", color: "#fd6925", how: "Every new technology on the advancement tree opens new buildings, and new trade-offs." },
];

// What you get, and what the land pays: taken straight from the game's data.
const TRADEOFFS = ["woodcutter", "campfire", "farm", "pen", "quarry"].map((id) => BUILDINGS_BY_ID[id]);

const TEACH: [IconId, string, string][] = [
  ["stump", "See the cost before you build", "Every building shows what you get and what the land pays, right where you place it."],
  ["leaf", "Watch the land change", "Forests turn to stumps and bare earth, smoke rises over the fires, the deer disappear. Click the Sustainability meter to see exactly why."],
  ["elder", "Learn what it means", "Elder Ama explains each lesson as it happens, and every event card links your choice to the real world and a UN target."],
];

const FEATURES: [IconId, string][] = [
  ["axe", "Clear-cut the forest for fast wood, or log selectively so it lasts"],
  ["sapling", "Plant saplings to restore the land you cut"],
  ["sheep", "Keep people warm with fires, or with clothes from your herds"],
  ["wheat", "Face real dilemmas: floods, overhunting, sacred groves"],
  ["ill", "Survive sickness and fend off raiders"],
  ["person", "Name your people and play on a laptop or a phone"],
];

const TEAM = ["Prithu Sharma", "Aarav Kumar", "Vagisha Sinha", "Aaradhya Verma"];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#fbf3de] text-[#2b2119]">
      <section className="border-b-4 border-[#2b2119] bg-gradient-to-b from-sky-300 via-sky-200 to-[#fbf3de]">
        <div className="mx-auto max-w-5xl px-4 pb-14 pt-12 text-center">
          <p className="font-pixel text-sm font-semibold uppercase tracking-[0.3em] text-amber-800">
            SHISTECH · Hacktrack · SDG 11
          </p>
          <h1 className="font-pixel mt-3 flex items-center justify-center gap-3 text-5xl font-bold sm:gap-4 sm:text-7xl">
            <PixelIcon name="flame" size={64} />
            Emberline
          </h1>
          <p className="font-pixel mt-3 text-xl text-amber-900 sm:text-2xl">A sustainability trade-off game</p>
          <p className="mx-auto mt-5 max-w-2xl text-base text-stone-700 sm:text-lg">
            Grow a Stone Age tribe without destroying the land that feeds it. Every hut, fire and
            woodcutter helps your people now and costs the land later. Can your village grow and
            still last?
          </p>
          <Link
            href="/play"
            className="pixel-btn font-pixel mt-8 inline-block bg-emerald-600 px-10 py-4 text-2xl font-semibold text-white hover:bg-emerald-500"
          >
            Play now
          </Link>
          <p className="mt-4 text-xs text-stone-600">Runs in the browser, on a laptop or a phone.</p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-12">
        <h2 className="font-pixel text-2xl font-semibold sm:text-3xl">Every choice is a trade-off</h2>
        <p className="mt-2 text-stone-600">
          Most builders reward you for building as much as you can. Emberline shows you the price.
        </p>
        <div className="mt-5 grid gap-3">
          {TRADEOFFS.map((b) => (
            <div key={b.id} className="pixel-panel grid gap-2 p-4 sm:grid-cols-[11rem_1fr_1fr] sm:items-center">
              <div className="font-pixel flex items-center gap-2 text-lg font-semibold">
                <PixelIcon name={b.icon} size={28} />
                {b.name}
              </div>
              <p className="flex items-start gap-2 text-sm text-emerald-800">
                <span className="font-num text-lg leading-4">+</span>
                {b.gain}
              </p>
              <p className="flex items-start gap-2 text-sm text-red-800">
                <PixelIcon name="stump" size={16} />
                {b.landCost}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-12">
        <h2 className="font-pixel text-2xl font-semibold sm:text-3xl">How the game teaches</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          {TEACH.map(([icon, title, text]) => (
            <div key={title} className="pixel-panel p-4">
              <PixelIcon name={icon} size={36} />
              <div className="font-pixel mt-2 text-lg font-semibold leading-tight">{title}</div>
              <p className="mt-1 text-sm text-stone-600">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-12">
        <h2 className="font-pixel text-2xl font-semibold sm:text-3xl">How it connects to the UN SDGs</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {SDGS.map((g) => (
            <div key={g.n} className={"pixel-panel flex gap-4 p-4" + (g.core ? " sm:col-span-2" : "")}>
              <div
                className="font-pixel flex h-14 w-14 shrink-0 items-center justify-center border-[3px] border-[#2b2119] text-2xl font-bold text-white"
                style={{ background: g.color }}
              >
                {g.n}
              </div>
              <div>
                <div className="font-pixel text-lg font-semibold">
                  {g.name}
                  {g.core && <span className="ml-2 text-sm text-amber-800">(core)</span>}
                </div>
                <p className="text-sm text-stone-600">{g.how}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-14">
        <h2 className="font-pixel text-2xl font-semibold sm:text-3xl">What you do</h2>
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
          <a href="https://github.com/DaBabaBOI/shistech-hackathon" className="underline">
            Source on GitHub
          </a>
        </div>
      </footer>
    </main>
  );
}
