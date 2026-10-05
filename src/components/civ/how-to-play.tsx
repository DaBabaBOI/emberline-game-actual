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
      { text: "Lead your people from a Stone Age camp to the Future." },
      { text: "Grow food, homes and Knowledge without breaking the land or your people's spirits." },
    ],
  },
  {
    id: "controls",
    title: "Moving around",
    icon: "compass",
    items: [
      { text: "Drag to move; right-drag/two fingers to turn; scroll/pinch to zoom." },
      { text: "Click buildings for their actions. Use the top bar for pause and speed; Menu holds settings and saves." },
    ],
  },
  {
    id: "build",
    title: "Building",
    icon: "hut",
    items: [
      { icon: "wheat", text: "Secure food, materials, homes and warmth first." },
      { icon: "log", text: "Selective logging is slower but keeps the forest standing." },
      { icon: "person", text: "Too many jobs tire everyone and reduce output." },
    ],
  },
  {
    id: "meters",
    title: "The six meters",
    icon: "star",
    items: [
      { icon: "wheat", text: "Food, Shelter, Happiness, Literacy and Energy track your people." },
      { icon: "leaf", text: "Sustainability tracks the land. Keep it healthy." },
      { text: "Click a meter for its causes and best fixes." },
    ],
  },
  {
    id: "learn",
    title: "Advancements and eras",
    icon: "book",
    items: [
      { icon: "bulb", text: "Earn Knowledge from learning and discovery, then spend it in Advancements." },
      { icon: "star", text: "Meet the era goal to move on; each era brings a new test." },
      { icon: "column", text: `Eras: ${ERAS.map((e) => e.name).join(", ")}.` },
    ],
  },
  {
    id: "tradeoffs",
    title: "Trade-offs",
    icon: "scales",
    items: [
      { text: "Most choices trade a quick gain for a cost. Check every building card before placing it." },
      { icon: "sapling", text: "Plant, log selectively, trade and use clean power to reduce the cost." },
    ],
  },
  {
    id: "danger",
    title: "Dangers",
    icon: "shield",
    items: [
      { icon: "sword", text: "Train warriors before raiders land; fight, hide or pay tribute when they arrive." },
      { icon: "storm", text: "Fires and disasters happen. Prepare where you can." },
    ],
  },
  {
    id: "explore",
    title: "Exploring",
    icon: "spyglass",
    items: [
      { icon: "spyglass", text: "Use Scout on fog at the edge of known land." },
      { icon: "boat", text: "Use Canoe from a dock to reach sea and islands." },
    ],
  },
  {
    id: "tips",
    title: "Tips",
    icon: "bulb",
    items: [
      { text: "Warnings name the problem and the next move. A ! marks an available action." },
      { text: "Pause any time to plan." },
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
