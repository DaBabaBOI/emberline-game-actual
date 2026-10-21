"use client";

import { CONTACT, RUINS_DIG } from "@/game/content";
import { canAfford, defenseStrength, giftCost, kingdomArmy, kingdomInfo, kingdomRaidDefense, ruinsFind } from "@/game/engine";
import { isleById } from "@/game/world";
import type { Resources } from "@/game/types";
import { useGame } from "@/components/civ/game-provider";
import { PixelIcon } from "@/components/civ/pixel-icon";

const costText = (cost: Partial<Resources>) =>
  Object.entries(cost)
    .map(([k, v]) => `${v} ${k === "currency" ? "coins" : k}`)
    .join(", ");

// First contact: the first time we see a people's land, they come down to the
// shore to look at us. How do we greet them? Each way moves how they feel.
export function ContactModal() {
  const { state, dispatch } = useGame();
  const c = state.contact;
  if (!c || state.debrief) return null;
  const info = kingdomInfo(state, c.kingdom);
  const cost = giftCost(state, c.kingdom);
  const strong = defenseStrength(state) >= kingdomRaidDefense(state, c.kingdom);
  const respect = info.temper === "proud" || info.temper === "warlike";
  const choices = [
    {
      id: "gifts" as const,
      label: `Bring gifts (${costText(cost)})`,
      note: `They will like us a lot more (+${CONTACT.gifts}).`,
      disabled: !canAfford(state, cost),
      tone: "bg-amber-300 text-[#2b2119] hover:bg-amber-200",
    },
    {
      id: "stories" as const,
      label: "Share a fire and swap stories",
      note: `We learn from them (+${CONTACT.knowledge} Knowledge). ${info.temper === "traders" || info.temper === "peaceful" ? "Friendly peoples love this." : "They listen, a little."}`,
      disabled: false,
      tone: "bg-sky-200 text-[#2b2119] hover:bg-sky-100",
    },
    {
      id: "spears" as const,
      label: "Show them our spears",
      note: strong ? (respect ? "They respect strength: they will think better of us." : "They will be frightened of us.") : "We are too few: they may laugh at us.",
      disabled: false,
      tone: "bg-red-800 text-white hover:bg-red-700",
    },
  ];
  return (
    <div className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center bg-black/30" data-testid="contact-modal">
      <div className="pixel-panel w-[min(92vw,420px)] p-5">
        <div className="mb-2 flex items-center gap-2">
          <span className="inline-block h-8 w-8 border-[3px] border-[#140e0a]" style={{ background: `linear-gradient(${info.sail} 60%, ${info.stripe} 60%)` }} />
          <div>
            <h3 className="font-pixel text-xl font-bold capitalize">{info.name.replace(/^the /, "")}</h3>
            <p className="text-xs text-stone-600">{info.isle?.name ?? "A far island"}</p>
          </div>
        </div>
        <p className="mb-2 text-sm text-stone-700">
          A new people! They have come down to the shore of {info.isle?.name ?? "their island"} to look at us. {info.blurb}
        </p>
        <p className="mb-3 text-xs text-stone-600">
          They have about {kingdomArmy(state, c.kingdom)} warriors. From now on you can trade, send gifts, raid or conquer them in <b>Kingdoms</b>. How do we greet them?
        </p>
        <div className="flex flex-col gap-2">
          {choices.map((ch) => (
            <button
              key={ch.id}
              type="button"
              disabled={ch.disabled}
              onClick={() => dispatch({ type: "contact", choice: ch.id })}
              className={`pixel-btn flex flex-col px-3 py-2 text-left text-sm font-medium disabled:opacity-40 ${ch.tone}`}
              data-testid={`contact-${ch.id}`}
            >
              <span>{ch.label}</span>
              <span className="text-[11px] font-normal opacity-80">{ch.note}</span>
            </button>
          ))}
          <button type="button" onClick={() => dispatch({ type: "contact", choice: "ignore" })} className="font-pixel mt-1 self-start text-xs text-stone-600 underline">
            Just watch them from afar
          </button>
        </div>
      </div>
    </div>
  );
}

// Our boat came ashore among old ruins: search carefully, dig deep, or leave
// them in peace.
export function RuinsModal() {
  const { state, dispatch } = useGame();
  const r = state.ruinsSearch;
  if (!r || state.contact || state.debrief) return null;
  const name = (state.world && isleById(state.world.seed, r.island)?.name) || "the island";
  const find = ruinsFind(state, r.island);
  return (
    <div className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center bg-black/30" data-testid="ruins-modal">
      <div className="pixel-panel w-[min(92vw,400px)] p-5">
        <PixelIcon name="tablet" size={44} className="mb-2" />
        <h3 className="font-pixel text-xl font-bold">Ruins on {name}</h3>
        <p className="mb-3 text-sm text-stone-700">
          Our sailors found fallen walls and carved stones, overgrown and silent. Someone lived here long ago. Something may still be buried.
        </p>
        <div className="flex flex-col gap-2">
          <button type="button" onClick={() => dispatch({ type: "ruins", choice: "careful" })} className="pixel-btn flex flex-col bg-[#8a6a3d] px-3 py-2 text-left text-sm font-medium text-white hover:bg-[#735630]" data-testid="ruins-careful">
            <span>Search carefully</span>
            <span className="text-[11px] font-normal opacity-80">Safe: we find what lies on top.</span>
          </button>
          <button type="button" onClick={() => dispatch({ type: "ruins", choice: "dig" })} className="pixel-btn flex flex-col bg-red-800 px-3 py-2 text-left text-sm font-medium text-white hover:bg-red-700" data-testid="ruins-dig">
            <span>Dig deep</span>
            <span className="text-[11px] font-normal opacity-80">
              {Math.round(RUINS_DIG.luck * 100)}% chance of twice as much; otherwise the old walls come down on the diggers.
            </span>
          </button>
          <button type="button" onClick={() => dispatch({ type: "ruins", choice: "honour" })} className="pixel-btn flex flex-col bg-emerald-800 px-3 py-2 text-left text-sm font-medium text-white hover:bg-emerald-700" data-testid="ruins-honour">
            <span>Leave them in peace</span>
            <span className="text-[11px] font-normal opacity-80">Our people will tell stories of the old ones (+{RUINS_DIG.honour} happiness).</span>
          </button>
        </div>
        <p className="mt-2 text-[11px] text-stone-500">Rumour says: {find.text}.</p>
      </div>
    </div>
  );
}
