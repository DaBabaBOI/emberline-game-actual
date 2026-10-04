"use client";

import { useEffect } from "react";
import { useGame } from "@/components/civ/game-provider";
import { HINT, HINTS_BY_ID, nextHint } from "@/game/hints";
import { PixelIcon } from "@/components/civ/pixel-icon";
import { useShot } from "./letterbox";

// Elder Ama's one-line hints (src/game/hints.ts): shows the next one when its
// moment comes, makes the button it talks about glow, and hides it after a
// while, when the player has done it, or on "Got it".
export function HintPanel() {
  const { state, dispatch } = useGame();
  const shot = useShot();
  const hint = state.hint ? HINTS_BY_ID[state.hint.id] : null;

  // Once a tick: show the next hint, or retire the one showing.
  useEffect(() => {
    if (state.hint) {
      const h = HINTS_BY_ID[state.hint.id];
      if (!h || state.tick - state.hint.tick >= HINT.showTicks || h.done?.(state)) dispatch({ type: "dismissHint" });
      return;
    }
    if (shot) return;
    const id = nextHint(state);
    if (id) dispatch({ type: "showHint", id });
    // Checked each tick; the rest of the state is read when it runs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.tick, state.hint, shot]);

  // The button the hint is about glows while it shows (worked out once, when
  // the hint appears).
  const target = hint?.target ? (typeof hint.target === "function" ? hint.target(state) : hint.target) : null;
  const shownAt = state.hint?.tick;
  useEffect(() => {
    if (!target) return;
    const els = Array.from(document.querySelectorAll<HTMLElement>(target));
    els.forEach((el) => el.classList.add("hint-glow"));
    return () => els.forEach((el) => el.classList.remove("hint-glow"));
    // A new hint (shownAt) re-reads the target; ticks in between don't.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shownAt]);

  if (!hint) return null;
  return (
    <div className="pixel-panel pointer-events-auto relative z-[15] flex w-full items-start gap-2 p-2.5 text-sm" data-testid="hint" data-hint={hint.id}>
      <PixelIcon name="elder" size={24} />
      <p className="flex-1 leading-snug">{hint.text(state)}</p>
      <button
        type="button"
        onClick={() => dispatch({ type: "dismissHint" })}
        className="pixel-btn font-pixel shrink-0 bg-amber-400 px-2 py-0.5 text-xs font-semibold text-[#2b2119]"
        data-testid="hint-ok"
      >
        Got it
      </button>
    </div>
  );
}
