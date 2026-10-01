"use client";

import { useEffect, useState } from "react";
import { knowledgeSources, perSecond, production } from "@/game/engine";
import type { GameState } from "@/game/types";
import { PixelIcon } from "@/components/civ/pixel-icon";

// "How do I get Knowledge?": what teaches every day, and the firsts still to
// come. Opened from the Knowledge counter in the top bar.
export function KnowledgeHelp({ state, onClose }: { state: GameState; onClose: () => void }) {
  const { daily, firsts } = knowledgeSources(state);
  // The real total (wear, floods and the like included); the lines below show where it comes from.
  const total = production(state).knowledge;
  return (
    <div className="pixel-panel-dark absolute left-1/2 top-full z-30 mt-2 w-[min(92vw,22rem)] -translate-x-1/2 p-3 text-left text-xs" data-testid="knowledge-help">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1 text-sm font-semibold text-amber-300">
          <PixelIcon name="bulb" size={16} /> How to get Knowledge
        </span>
        <button type="button" onClick={onClose} className="underline">
          Close
        </button>
      </div>
      <p className="mb-2 text-white/80">Knowledge pays for Advancements. Most of it comes from doing things for the first time.</p>
      <div className="mb-1 font-semibold text-amber-200">One-time firsts</div>
      <ul className="mb-2 flex flex-col gap-0.5">
        {firsts.map((f) => (
          <li key={f.label} className="flex justify-between gap-2">
            <span>{f.label}</span>
            <span className="font-num shrink-0 text-emerald-300">+{f.gain}</span>
          </li>
        ))}
      </ul>
      <div className="mb-1 font-semibold text-amber-200">
        Every day <span className="font-num text-emerald-300">+{perSecond(total).toFixed(2)}/s</span>
      </div>
      <ul className="flex flex-col gap-0.5">
        {daily.map((d) => (
          <li key={d.label} className="flex justify-between gap-2">
            <span>{d.label}</span>
            <span className="font-num shrink-0">+{perSecond(d.perTick).toFixed(2)}/s</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-white/60">
        An Elder&apos;s Hut (after Storytelling) and, later, schools teach every day. Secret advancements give Knowledge too.
      </p>
    </div>
  );
}

// A "+N" that floats up beside the counter when Knowledge jumps (not the slow trickle).
export function KnowledgeGain({ value }: { value: number }) {
  const [last, setLast] = useState(value);
  const [gain, setGain] = useState<{ n: number; key: number } | null>(null);
  // Compare with the last value seen while rendering (React's way of reacting
  // to a prop change without an effect).
  if (value !== last) {
    const jump = Math.floor(value) - Math.floor(last);
    setLast(value);
    if (jump >= 1) setGain({ n: jump, key: (gain?.key ?? 0) + 1 });
  }
  useEffect(() => {
    if (!gain) return;
    const id = setTimeout(() => setGain(null), 2200);
    return () => clearTimeout(id);
  }, [gain]);
  if (!gain) return null;
  return (
    <span key={gain.key} className="knowledge-gain font-num pointer-events-none absolute -top-3 left-full ml-1 text-sm text-emerald-300" data-testid="knowledge-gain">
      +{gain.n}
    </span>
  );
}
