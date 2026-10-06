"use client";

import { useState } from "react";
import { useGame } from "@/components/civ/game-provider";
import { PixelIcon } from "@/components/civ/pixel-icon";
import { TUTORIAL } from "@/game/content";
import { askAma } from "@/lib/ama";
import { useShot } from "./letterbox";

// Questions to start from, for players who don't know what to ask.
const STARTERS = ["What should I do next?", "Why are people unhappy?", "How do I get more food?"];

// Ask Elder Ama anything about your town (src/lib/ama.ts). Folded away to a
// small button until opened.
export function AskAma() {
  const { state } = useGame();
  const shot = useShot();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [reply, setReply] = useState<{ q: string; answer: string; offline: boolean } | null>(null);

  if (shot || state.tutorialStep < TUTORIAL.length || state.phase !== "playing") return null;

  const ask = async (q: string) => {
    const text = q.trim();
    if (!text || busy) return;
    setBusy(true);
    setQuestion("");
    const res = await askAma(text, state);
    setReply({ q: text, ...res });
    setBusy(false);
  };

  if (!open)
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="pixel-btn font-pixel pointer-events-auto flex items-center gap-1.5 self-start bg-[#fdf6e3] px-2 py-1 text-xs text-[#2b2119]"
        data-testid="ask-ama-open"
      >
        <PixelIcon name="elder" size={16} />
        Ask Elder Ama
      </button>
    );

  return (
    <div className="pixel-panel pointer-events-auto relative z-[15] flex w-full flex-col gap-1.5 p-2.5 text-sm" data-testid="ask-ama">
      <div className="flex items-center gap-2">
        <PixelIcon name="elder" size={20} />
        <span className="font-pixel flex-1 font-semibold">Ask Elder Ama</span>
        <button type="button" onClick={() => setOpen(false)} className="font-pixel px-1 text-xs text-stone-600 hover:text-stone-900" aria-label="Close" data-testid="ask-ama-close">
          ✕
        </button>
      </div>
      {reply && (
        <div className="border-l-4 border-amber-400 bg-amber-50 px-2 py-1" data-testid="ask-ama-reply">
          <p className="text-[11px] text-stone-500">“{reply.q}”</p>
          <p className="leading-snug" data-testid="ask-ama-answer">{reply.answer}</p>
        </div>
      )}
      {busy && <p className="text-xs text-stone-500" data-testid="ask-ama-thinking">Ama is thinking…</p>}
      {!reply && !busy && (
        <div className="flex flex-wrap gap-1">
          {STARTERS.map((s) => (
            <button key={s} type="button" onClick={() => ask(s)} className="pixel-btn bg-[#fdf6e3] px-1.5 py-0.5 text-[11px] hover:bg-amber-100" data-testid="ask-ama-starter">
              {s}
            </button>
          ))}
        </div>
      )}
      <form
        className="flex gap-1"
        onSubmit={(e) => {
          e.preventDefault();
          ask(question);
        }}
      >
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          // Typing here mustn't move the camera or trigger shortcuts.
          onKeyDown={(e) => e.stopPropagation()}
          onKeyUp={(e) => e.stopPropagation()}
          maxLength={200}
          placeholder="Ask about your town…"
          className="min-w-0 flex-1 border-2 border-[#2b2119] bg-white px-1.5 py-0.5 text-xs"
          data-testid="ask-ama-input"
        />
        <button type="submit" disabled={busy || !question.trim()} className="pixel-btn font-pixel bg-amber-400 px-2 py-0.5 text-xs font-semibold text-[#2b2119] disabled:opacity-50" data-testid="ask-ama-send">
          Ask
        </button>
      </form>
    </div>
  );
}
