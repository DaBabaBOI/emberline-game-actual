"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ERAS, formatYear } from "@/game/content";
import { makeDebrief, speedrunTime } from "@/game/engine";
import { formatRunTime } from "@/lib/online";
import type { GameState } from "@/game/types";
import type { IconId } from "@/game/sprites";
import { useGame } from "@/components/civ/game-provider";
import { PixelIcon } from "@/components/civ/pixel-icon";
import { playSfx, type Sfx } from "@/lib/audio";
import { Stage3D, type Shot } from "@/components/civ/cutscene/stage";
import { ARK_SHOTS, FALLEN_SHOTS, memoryShot, planetShot, townShot } from "@/components/civ/cutscene/shots";
import { useCutsceneStyle } from "@/lib/graphics";
import { FinalEndingPixel } from "./final-ending-pixel";

// The end of the story, as a short film. Two of them:
// - the Ember Ark launches (a town in balance): the launch, the climb out of
//   the air, the planet still green, then a look back through every era the
//   people lived through, the ship on its way to the stars, and the ones who
//   stayed home;
// - the world is lost in the Future era: the heat, the fires, the seas rising
//   over the islands, the last ships leaving, and one ember left to start again.
// Each beat is a shot filmed in 3D on a little island built like the game's
// (or out in space), with words and numbers over it; a beat with no shot keeps
// the last one behind a black (or dimmed) screen. Each plays for its time
// (click to go on, Esc or Skip to jump to the end).

type Beat = {
  ms: number;
  shot?: Shot;
  // Over the shot: an old photograph (the memories), dimmed (numbers, the title), or black.
  tone?: "memory" | "dim" | "black";
  scene?: ReactNode;
  caption?: string;
  sfx?: Sfx;
  last?: boolean;
};

// Filmed in 3D, or the pixel-art film (Menu > Graphics > Cutscenes).
export function FinalEnding() {
  return useCutsceneStyle() === "pixel" ? <FinalEndingPixel /> : <FinalEnding3D />;
}

function FinalEnding3D() {
  const { state, dispatch } = useGame();
  const ark = state.ending === "ark" && state.endingSeen === false;
  const fallen = !ark && state.phase === "gameover" && state.era >= 5 && state.mode !== "last" && !state.endingSeen;
  const done = useCallback(() => dispatch({ type: "seenEnding" }), [dispatch]);
  if (!ark && !fallen) return null;
  return <Film key={ark ? "ark" : "fallen"} beats={ark ? arkBeats(state) : fallenBeats(state)} onDone={done} />;
}

function Film({ beats, onDone }: { beats: Beat[]; onDone: () => void }) {
  const [at, setAt] = useState(0);
  const beat = beats[at];
  const next = useCallback(() => setAt((i) => Math.min(beats.length - 1, i + 1)), [beats.length]);

  useEffect(() => {
    if (beat.sfx) playSfx(beat.sfx);
    if (beat.last) return;
    const t = setTimeout(next, beat.ms);
    return () => clearTimeout(t);
  }, [beat, next]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAt(beats.length - 1);
      else if (e.key === " " || e.key === "Enter" || e.key === "ArrowRight") {
        if (!beats[at].last) next();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [at, beats, next]);

  // The 3D stage stays up the whole film: a beat without a shot keeps the last one.
  const shot = beats.slice(0, at + 1).reduceRight<Shot | undefined>((found, b) => found ?? b.shot, undefined) ?? beats.find((b) => b.shot)?.shot;
  const tone = beat.tone ?? (beat.shot ? undefined : "black");

  return (
    <div className="pointer-events-auto fixed inset-0 z-[60] overflow-hidden bg-black text-white" data-testid="final-ending" data-beat={at}>
      {shot && (
        <div className="absolute inset-0" style={tone === "memory" ? { filter: "sepia(0.5) saturate(0.85) contrast(1.05) brightness(1.03)" } : undefined}>
          <Stage3D shot={shot} className="absolute inset-0" />
        </div>
      )}
      {tone === "memory" && (
        <>
          <div className="fin-grain pointer-events-none absolute inset-0" />
          <div className="fin-vignette pointer-events-none absolute inset-0" />
        </>
      )}
      {tone === "dim" && <div className="pointer-events-none absolute inset-0 bg-black/65" />}
      {tone === "black" && <div className="pointer-events-none absolute inset-0 bg-black" />}
      <div key={at} className="fin-beat absolute inset-0" onClick={() => !beat.last && next()} role="presentation">
        {beat.scene}
      </div>
      <div key={`cut${at}`} className="fin-cut pointer-events-none absolute inset-0 bg-black" />
      {/* Black bars, like a film. */}
      <div className="fin-bar pointer-events-none absolute inset-x-0 top-0 h-[9vh] bg-black" />
      <div className="fin-bar pointer-events-none absolute inset-x-0 bottom-0 h-[9vh] bg-black" />
      {beat.caption && <div className="pointer-events-none absolute inset-x-0 bottom-[9vh] h-[20vh] bg-gradient-to-t from-black/70 to-transparent" />}
      {beat.caption && (
        <p
          key={`c${at}`}
          className="fin-caption font-pixel pointer-events-none absolute inset-x-0 bottom-[11vh] mx-auto max-w-3xl px-6 text-center text-base leading-snug text-amber-50 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] md:text-2xl"
          aria-live="polite"
        >
          {beat.caption}
        </p>
      )}
      {!beat.last && (
        <button
          type="button"
          onClick={() => setAt(beats.length - 1)}
          className="font-pixel absolute right-4 top-[2vh] z-10 text-xs text-white/60 underline hover:text-white"
        >
          Skip
        </button>
      )}
      {beat.last && (
        <div className="fin-rise-in absolute inset-x-0 bottom-[12vh] z-10 flex justify-center gap-3">
          <button
            type="button"
            autoFocus
            onClick={onDone}
            className="pixel-btn font-pixel bg-amber-400 px-5 py-2 text-sm font-semibold text-[#2b2119] md:text-base"
            data-testid="ending-continue"
          >
            See your story
          </button>
          <button type="button" onClick={() => setAt(0)} className="pixel-btn font-pixel bg-white/10 px-4 py-2 text-sm text-white">
            Watch again
          </button>
        </div>
      )}
    </div>
  );
}

// ---- Over the shots -------------------------------------------------------------

// A memory's place and time, written in the corner like on an old photograph.
function MemoryLabel({ era, line }: { era: number; line: string }) {
  return (
    <div className="font-pixel pointer-events-none absolute left-[6%] top-[12vh] text-left drop-shadow-[0_2px_3px_rgba(0,0,0,0.8)]">
      <div className="text-xs uppercase tracking-[0.3em] text-amber-100/80 md:text-sm">{ERAS[era].name}</div>
      <div className="fin-type text-xl text-amber-50 md:text-3xl">{formatYear(ERAS[era].startYear)}</div>
      <span className="sr-only">{line}</span>
    </div>
  );
}

// ---- The Ark ----------------------------------------------------------------

const MEMORIES: ((s: GameState) => string)[] = [
  (s) => `A handful of people, and one small fire on the shore. They called themselves ${s.nation ?? "the Emberfolk"}.`,
  () => "They planted the first fields, and learned what the soil could give, and what it could not.",
  () => "They carried water through stone arches, and lived through the great drought.",
  () => "Plague, kings and cathedrals. They came through all of it, together.",
  () => "Coal made them strong, and filled the sky with smoke. Then they learned to clear it.",
  () => "And at last they learned to live lightly on their world.",
];

function arkBeats(state: GameState): Beat[] {
  const d = state.debrief ?? makeDebrief(state, "final");
  const who = state.nation ?? "Our people";
  const crew = Math.max(12, Math.round(state.population * 0.08));
  const forest = Math.round((d.forestLeft ?? 0) * 100);
  const planted = Math.round(d.planted ?? 0);
  const memories: Beat[] = MEMORIES.map((line, era) => ({
    ms: 4600,
    shot: memoryShot(era),
    tone: "memory",
    caption: line(state),
    scene: <MemoryLabel era={era} line={line(state)} />,
  }));
  return [
    {
      ms: 5200,
      shot: ARK_SHOTS.night,
      caption: `${formatYear(state.year)}. On the island where it all began, everyone has come to watch.`,
    },
    {
      ms: 3600,
      shot: ARK_SHOTS.countdown,
      caption: "Fifty thousand years of fires, fields and cities, and it comes down to this.",
      scene: (
        <div className="font-pixel pointer-events-none absolute inset-0 flex items-center justify-center">
          {["3", "2", "1"].map((n, i) => (
            <span key={n} className="fin-count absolute text-[22vmin] font-bold text-amber-200/90 drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]" style={{ animationDelay: `${i * 1.1}s` }}>
              {n}
            </span>
          ))}
        </div>
      ),
    },
    {
      ms: 4800,
      sfx: "firework",
      shot: ARK_SHOTS.ignition,
      caption: "Ignition.",
      scene: <span className="fin-flash pointer-events-none absolute inset-0 block bg-white" />,
    },
    {
      ms: 5200,
      shot: ARK_SHOTS.ascent,
      caption: "Up through the clouds, through the thin blue line of the air...",
    },
    {
      ms: 6000,
      shot: planetShot(Math.min(1, forest / 100)),
      caption: forest >= 50 ? `...and there it is. Home. Still green, with ${forest}% of its old forest standing.` : "...and there it is. Home. Smaller than anyone imagined.",
    },
    {
      ms: 3400,
      caption: "Looking back, it is hard to believe how far they came.",
      scene: (
        <div className="fin-fade-in absolute inset-0 flex items-center justify-center bg-[#140e0a]">
          <div className="fin-grain absolute inset-0" />
          <span className="fin-ember-dot block h-3 w-3 rounded-full bg-amber-400" />
        </div>
      ),
    },
    ...memories,
    {
      ms: 5200,
      shot: townShot(state.era),
      tone: "dim",
      caption: `${Math.round(d.stats.peakPopulation)} people at the most. ${d.stats.built} buildings. ${planted} trees planted. ${d.stats.raidsWon} raids held off. ${d.researched} discoveries.`,
      scene: (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="font-pixel grid grid-cols-2 gap-x-10 gap-y-4 text-center md:grid-cols-5">
            {(
              [
                ["person", Math.round(d.stats.peakPopulation), "people"],
                ["hammer", d.stats.built, "buildings"],
                ["sapling", planted, "trees planted"],
                ["shield", d.stats.raidsWon, "raids held off"],
                ["bulb", d.researched, "discoveries"],
              ] as [IconId, number, string][]
            ).map(([icon, n, label], i) => (
              <div key={label} className="scene-pop flex flex-col items-center gap-1" style={{ animationDelay: `${i * 0.3}s` }}>
                <PixelIcon name={icon} size={40} />
                <span className="text-2xl text-amber-200 md:text-4xl">{n}</span>
                <span className="text-xs text-amber-50/70 md:text-sm">{label}</span>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      ms: 6200,
      shot: ARK_SHOTS.voyage,
      caption: `The Ember Ark carries ${crew} volunteers, seeds from every field, and, in a lantern, an ember from the first fire.`,
      scene: <span className="font-pixel pointer-events-none absolute right-[10%] top-[30%] text-xs text-white/60">Alpha Centauri · 4.2 light-years</span>,
    },
    {
      ms: 6200,
      shot: ARK_SHOTS.stay,
      caption: `Most of ${who} stayed. The island was green again, and this time they would keep it that way.`,
    },
    {
      ms: 0,
      last: true,
      sfx: "win",
      tone: "dim",
      scene: (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {Array.from({ length: 40 }, (_, i) => (
            <span
              key={i}
              className="fin-ember absolute bottom-[-4%] block h-1.5 w-1.5 rounded-full bg-amber-400"
              style={{ left: `${(i * 23.7) % 100}%`, animationDelay: `${(i % 10) * 0.45}s`, animationDuration: `${5 + (i % 5)}s` }}
            />
          ))}
          <h1 className="fin-title font-pixel text-[13vmin] font-bold tracking-[0.12em] text-amber-300">EMBERLINE</h1>
          <p className="fin-sub font-pixel mt-2 text-base text-amber-50 md:text-2xl">The ember still burns.</p>
          <p className="fin-sub-2 font-pixel mt-6 text-sm text-white/70 md:text-base">
            {who} · {formatYear(ERAS[0].startYear)} to {formatYear(state.year)}
          </p>
          {state.speedrun && (
            <p className="fin-sub-3 font-num mt-3 text-2xl text-amber-200 md:text-3xl" data-testid="ending-run-time">
              ⏱ {formatRunTime(speedrunTime(state))}
            </p>
          )}
          <p className="fin-sub-3 font-pixel mt-2 text-xs text-white/50 md:text-sm">Thank you for playing.</p>
        </div>
      ),
    },
  ];
}

// ---- The world lost ------------------------------------------------------------

function fallenBeats(state: GameState): Beat[] {
  const who = state.nation ?? "Our people";
  return [
    {
      ms: 5600,
      sfx: "lose",
      shot: FALLEN_SHOTS.heat,
      caption: `${formatYear(state.year)}. The air grew hotter every summer, and the seas began to rise.`,
    },
    {
      ms: 5600,
      shot: FALLEN_SHOTS.fires,
      caption: "Harvests failed. The forests burned. People argued about what to do, and waited.",
    },
    {
      ms: 6000,
      shot: FALLEN_SHOTS.flood,
      caption: "One by one, the low islands went under.",
    },
    {
      ms: 5600,
      shot: FALLEN_SHOTS.ships,
      caption: `The last ships left for higher ground. ${who} had the knowledge to save their world. They ran out of time.`,
    },
    {
      ms: 0,
      last: true,
      scene: (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black">
          <span className="fin-ember-dot mb-8 block h-3 w-3 rounded-full bg-amber-400" />
          <h1 className="fin-title font-pixel text-[10vmin] font-bold tracking-[0.12em] text-amber-300/70">EMBERLINE</h1>
          <p className="fin-sub font-pixel mt-2 px-6 text-center text-base text-amber-50 md:text-xl">But an ember, once lit, is hard to put out.</p>
          <p className="fin-sub-2 font-pixel mt-4 text-sm text-white/60 md:text-base">The world can still be saved. Try again.</p>
        </div>
      ),
    },
  ];
}
