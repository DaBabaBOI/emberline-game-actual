"use client";

// How to play: the whole game on one page, from the title screen or the
// in-game Menu. Short sections, one idea each, in the game's own words.

import { useState } from "react";
import { ERAS } from "@/game/content";
import type { IconId } from "@/game/sprites";
import { PixelIcon } from "@/components/civ/pixel-icon";
import { cn } from "@/lib/utils";

type Section = { id: string; title: string; icon: IconId; items: { icon?: IconId; text: string }[] };

const SECTIONS: Section[] = [
  {
    id: "goal",
    title: "The goal",
    icon: "flame",
    items: [
      { text: "Lead your people from a Stone Age camp to the Future, era by era." },
      { text: "Every era asks you to grow (food, homes, knowledge) without wrecking the land, the air or your people's happiness." },
      { text: "The ending you get depends on how you grew, not just how far you got." },
    ],
  },
  {
    id: "controls",
    title: "Moving around",
    icon: "compass",
    items: [
      { text: "Drag to slide the map. Right-drag (or two fingers) to turn it. Scroll or pinch to zoom." },
      { text: "Click a building to see what it does, upgrade it, repair it or remove it." },
      { text: "The top bar has pause and speed. Menu has saves, sound, graphics and this guide." },
      { text: "“Hide” on the bottom bar folds it away when you want to look at your town." },
    ],
  },
  {
    id: "build",
    title: "Building",
    icon: "hut",
    items: [
      { icon: "wheat", text: "Food: gatherers, hunters, fishing and later farms. Too little and people starve." },
      { icon: "log", text: "Wood and stone build everything. Woodcutters on selective logging spare the forest." },
      { icon: "hut", text: "Homes: people need a roof. Homeless people get sick and unhappy." },
      { icon: "flame", text: "Warmth: campfires keep people warm until you learn warm clothes." },
      { icon: "person", text: "Every building needs hands. With more jobs than people, everyone gets tired and makes less." },
    ],
  },
  {
    id: "meters",
    title: "The six meters",
    icon: "star",
    items: [
      { icon: "wheat", text: "Food, Shelter, Happiness, Learning and Energy: how your people are doing." },
      { icon: "leaf", text: "Sustainability: how the land is doing. If it falls too far, the land collapses and the game ends." },
      { text: "Click any meter to see exactly why it is where it is, and what would fix it." },
    ],
  },
  {
    id: "learn",
    title: "Advancements and eras",
    icon: "book",
    items: [
      { icon: "bulb", text: "Knowledge comes from elders, schools and new discoveries. Spend it in Advancements." },
      { icon: "star", text: "Some advancements unlock only after a goal (\"have 3 farms\"). The tree shows what each one needs." },
      { icon: "column", text: `When the era's goals are met, move on. The eras: ${ERAS.map((e) => e.name).join(", ")}.` },
      { icon: "scroll", text: "Each era ends with a big test (a legion, a drought, a crisis) and a debrief of how you did." },
    ],
  },
  {
    id: "tradeoffs",
    title: "Trade-offs",
    icon: "scales",
    items: [
      { text: "Almost every choice helps one thing and hurts another: clear-cutting gives wood fast but hurts the land; coal powers a city but warms the planet." },
      { icon: "sapling", text: "Plant trees, log selectively, use clean power and buy from traders to spare the land." },
      { icon: "coin", text: "Currency buys goods from traders, pays raiders to leave and helps after a disaster." },
    ],
  },
  {
    id: "danger",
    title: "Dangers",
    icon: "shield",
    items: [
      { icon: "sword", text: "Raiders land on the shore. Train warriors at a war camp, and choose to fight, hide or pay when they come." },
      { icon: "storm", text: "Storms, floods, earthquakes and fires happen. Some can be prepared for." },
      { icon: "sad", text: "Unhappy people leave, and from the Medieval era they can rebel." },
    ],
  },
  {
    id: "explore",
    title: "Exploring",
    icon: "spyglass",
    items: [
      { icon: "spyglass", text: "Scout: pick a spot on the edge of what you know. Scouts walk there and back, revealing the land." },
      { icon: "boat", text: "Canoe: pick a far coast or island. The canoe paddles out from your dock and comes home." },
    ],
  },
  {
    id: "tips",
    title: "Tips",
    icon: "bulb",
    items: [
      { text: "Watch the warnings just above the bottom bar: they say what's wrong and what to do." },
      { text: "A \"!\" on a bottom button means something is worth doing there." },
      { text: "Pause whenever you like. Nothing happens while the game is paused." },
    ],
  },
];

export function HowToPlay({ onClose }: { onClose: () => void }) {
  const [open, setOpen] = useState(SECTIONS[0].id);
  return (
    <div
      className="pointer-events-auto fixed inset-0 z-[60] flex items-center justify-center bg-black/45 p-2 md:p-4"
      onClick={onClose}
      data-testid="how-to-play"
      role="dialog"
      aria-label="How to play"
    >
      <div
        className="pixel-panel font-pixel flex max-h-[92dvh] w-[min(96vw,760px)] flex-col overflow-hidden bg-[#fbf7ef] text-stone-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b-[3px] border-[#2b2119] px-4 py-2">
          <h2 className="flex items-center gap-2 text-xl font-bold">
            <PixelIcon name="book" size={24} />
            How to play
          </h2>
          <button type="button" onClick={onClose} className="text-sm underline" data-testid="how-to-play-close">
            Close
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          {/* Contents: a row of tabs on phones, a list on bigger screens. */}
          <nav className="flex shrink-0 gap-1 overflow-x-auto border-b-2 border-black/10 p-2 md:w-56 md:flex-col md:overflow-visible md:border-b-0 md:border-r-2">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setOpen(s.id)}
                className={cn(
                  "flex shrink-0 items-center gap-2 px-2 py-1 text-left text-sm",
                  open === s.id ? "bg-amber-400 text-[#2b2119]" : "hover:bg-amber-100",
                )}
                data-testid={`htp-${s.id}`}
              >
                <PixelIcon name={s.icon} size={18} />
                {s.title}
              </button>
            ))}
          </nav>
          <div className="min-h-0 flex-1 overflow-y-auto p-4 md:min-h-[380px]">
            {SECTIONS.filter((s) => s.id === open).map((s) => (
              <div key={s.id} className="flex flex-col gap-3">
                <h3 className="flex items-center gap-2 text-lg font-semibold">
                  <PixelIcon name={s.icon} size={22} />
                  {s.title}
                </h3>
                <ul className="flex flex-col gap-2.5 font-sans text-sm leading-relaxed">
                  {s.items.map((it, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-0.5 shrink-0">{it.icon ? <PixelIcon name={it.icon} size={18} /> : <span className="inline-block h-[18px] w-[18px] text-center">·</span>}</span>
                      <span>{it.text}</span>
                    </li>
                  ))}
                </ul>
                {(() => {
                  const i = SECTIONS.findIndex((x) => x.id === s.id);
                  const next = SECTIONS[i + 1];
                  return next ? (
                    <button type="button" onClick={() => setOpen(next.id)} className="pixel-btn mt-2 self-end bg-emerald-600 px-3 py-1 text-sm text-white">
                      Next: {next.title} ▶
                    </button>
                  ) : (
                    <button type="button" onClick={onClose} className="pixel-btn mt-2 self-end bg-emerald-600 px-3 py-1 text-sm text-white">
                      Got it
                    </button>
                  );
                })()}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
