"use client";

import { useEffect } from "react";
import { NAME_EGGS } from "@/game/easter";
import { useGame } from "@/components/civ/game-provider";
import { PixelIcon } from "@/components/civ/pixel-icon";
import { playSfx } from "@/lib/audio";
import { useShot } from "./letterbox";

// A people named after a friend of the game: a blessing (gold, sparkling) or,
// for the same name twice in a row, a curse (purple, gloomy). Shown once, at
// the start of the game, which waits meanwhile.
export function NameEggCard() {
  const { state, dispatch } = useGame();
  const egg = state.nameEgg;
  // After the opening fly-in (or any other shot) has finished.
  const shot = useShot();
  const show = !!egg && !egg.seen && !shot;
  const cursed = !!egg?.cursed;

  useEffect(() => {
    if (show) playSfx(cursed ? "lose" : "discover");
  }, [show, cursed]);

  if (!egg || !show) return null;
  const card = cursed ? NAME_EGGS[egg.id].curseCard : NAME_EGGS[egg.id].card;
  const close = () => dispatch({ type: "seeNameEgg" });
  return (
    <div
      className={`pointer-events-auto fixed inset-0 z-[58] flex items-center justify-center p-4 ${cursed ? "bg-[#12061f]/85" : "bg-black/70"}`}
      data-testid="name-egg"
    >
      {/* Sparks rising (a blessing) or slow purple motes sinking (a curse). */}
      {Array.from({ length: 28 }, (_, i) => (
        <span
          key={i}
          className={`${cursed ? "egg-mote bg-violet-400/70" : "fin-ember bg-amber-300"} absolute block h-1.5 w-1.5 rounded-full`}
          style={{ left: `${(i * 29.3) % 100}%`, bottom: cursed ? undefined : "-4%", top: cursed ? "-4%" : undefined, animationDelay: `${(i % 9) * 0.4}s`, animationDuration: `${4 + (i % 4)}s` }}
        />
      ))}
      <div
        className={`egg-card font-pixel relative w-[min(92vw,520px)] border-4 p-6 text-center ${
          cursed ? "border-violet-400 bg-[#1e1030] text-violet-50" : "border-amber-300 bg-[#2b2119] text-amber-50"
        }`}
      >
        <div className={`text-xs uppercase tracking-[0.35em] ${cursed ? "text-violet-300" : "text-amber-300"}`}>{cursed ? "☾ A curse ☾" : "✦ A secret name ✦"}</div>
        <div className="my-3 flex justify-center">
          <span className={`egg-icon block ${cursed ? "grayscale" : ""}`}>
            <PixelIcon name={cursed ? "skull" : "crown"} size={64} />
          </span>
        </div>
        <h2 className={`text-2xl font-bold md:text-3xl ${cursed ? "text-violet-200" : "text-amber-300"}`}>{card.title}</h2>
        <div className="mt-3 space-y-2 text-sm leading-relaxed md:text-base">
          {card.lines.map((l, i) => (
            <p key={i} className="fin-caption" style={{ animationDelay: `${0.3 + i * 0.5}s` }}>
              {l}
            </p>
          ))}
        </div>
        <button
          type="button"
          autoFocus
          onClick={close}
          className={`pixel-btn mt-5 px-6 py-2 font-semibold ${cursed ? "bg-violet-500 text-white" : "bg-amber-400 text-[#2b2119]"}`}
          data-testid="name-egg-ok"
        >
          {cursed ? "Fine..." : "Let's go!"}
        </button>
      </div>
    </div>
  );
}
