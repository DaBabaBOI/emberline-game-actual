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

// The end of the story, as a short film. Two of them:
// - the Ember Ark launches (a town in balance): the launch, the climb out of
//   the air, the planet still green, then a look back through every era the
//   people lived through, the ship on its way to the stars, and the ones who
//   stayed home;
// - the world is lost in the Future era: the heat, the fires, the seas rising
//   over the islands, the last ships leaving, and one ember left to start again.
// Each beat plays for its time (click to go on, Esc or Skip to jump to the end).

type Beat = { ms: number; scene: ReactNode; caption?: string; sfx?: Sfx; shake?: boolean; last?: boolean };

export function FinalEnding() {
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

  return (
    <div className="pointer-events-auto fixed inset-0 z-[60] overflow-hidden bg-black text-white" data-testid="final-ending">
      <div
        key={at}
        className={`fin-beat absolute inset-0 ${beat.shake ? "fin-shake" : ""}`}
        onClick={() => !beat.last && next()}
        role="presentation"
      >
        {beat.scene}
      </div>
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

// ---- Shared pieces ------------------------------------------------------------

function Stars({ n = 60, className = "" }: { n?: number; className?: string }) {
  return (
    <div className={`absolute inset-0 ${className}`}>
      {Array.from({ length: n }, (_, i) => (
        <span
          key={i}
          className="scene-twinkle absolute bg-white"
          style={{
            left: `${(i * 37.3) % 100}%`,
            top: `${(i * 53.7) % 100}%`,
            width: i % 9 === 0 ? 3 : 2,
            height: i % 9 === 0 ? 3 : 2,
            opacity: 0.35 + (i % 4) * 0.18,
            animationDelay: `${(i % 7) * 0.35}s`,
          }}
        />
      ))}
    </div>
  );
}

// Our island from the shore: hills, and the town on them as dark shapes.
function Island({ icons, color = "#0d1410", lit = false }: { icons: IconId[]; color?: string; lit?: boolean }) {
  return (
    <div className="absolute inset-x-0 bottom-0 h-[42%]">
      <div className="absolute bottom-[38%] left-[-8%] h-[40%] w-[62%] rounded-t-[60%]" style={{ background: color }} />
      <div className="absolute bottom-[38%] right-[-10%] h-[52%] w-[58%] rounded-t-[60%]" style={{ background: color }} />
      <div className="absolute inset-x-0 bottom-0 h-[40%]" style={{ background: color }} />
      {icons.map((icon, i) => (
        <span
          key={i}
          className="absolute"
          style={{ left: `${8 + i * (84 / Math.max(1, icons.length - 1))}%`, bottom: `${70 + ((i * 7) % 3) * 6}%`, filter: lit ? "brightness(0.35) saturate(0.6)" : "brightness(0)" }}
        >
          <PixelIcon name={icon} size={40} />
          {lit && i % 2 === 0 && <span className="fin-window absolute left-1/2 top-1/2 block h-1.5 w-1.5 -translate-x-1/2 bg-amber-300" />}
        </span>
      ))}
    </div>
  );
}

// The Ark on the pad: a tall ship in its tower, searchlights sweeping the night.
function LaunchPad({ rising = false, firing = false }: { rising?: boolean; firing?: boolean }) {
  return (
    <>
      <div className="absolute bottom-[40%] left-1/2 h-[46%] w-[3%] -translate-x-[260%] border-x-2 border-[#3a4150] bg-[repeating-linear-gradient(45deg,transparent_0_6px,#3a4150_6px_8px)]" />
      <div className={`absolute bottom-[40%] left-1/2 -translate-x-1/2 ${rising ? "fin-launch" : ""}`}>
        <div className="relative flex flex-col items-center">
          <span className="fin-ark-glow absolute -inset-6 rounded-full" />
          <PixelIcon name="rocket" size={150} title="The Ember Ark" />
          {firing && (
            <>
              <span className="fin-flame absolute top-[92%] block h-24 w-10 rounded-b-full" />
              <span className="fin-flame fin-flame-2 absolute top-[92%] block h-16 w-6 rounded-b-full" />
            </>
          )}
        </div>
      </div>
      {firing &&
        Array.from({ length: 9 }, (_, i) => (
          <span
            key={i}
            className="fin-smoke absolute bottom-[36%] block rounded-full bg-stone-300/80"
            style={{ left: `${44 + (i - 4) * 3}%`, width: 60 + (i % 3) * 30, height: 60 + (i % 3) * 30, animationDelay: `${i * 0.12}s`, ["--dx" as string]: `${(i - 4) * 40}px` }}
          />
        ))}
    </>
  );
}

// A memory: a warm, grainy picture of one era, with its year in the corner.
function Memory({ era, sky, ground, icons, actors, line }: { era: number; sky: string; ground: string; icons: IconId[]; actors: IconId[]; line: string }) {
  return (
    <div className="fin-memory absolute inset-0" style={{ background: sky }}>
      <div className="absolute inset-x-[-5%] bottom-[30%] h-[28%] rounded-t-[50%] opacity-70" style={{ background: ground, filter: "brightness(0.8)" }} />
      <div className="absolute inset-x-0 bottom-[38%] flex items-end justify-around px-[10%]">
        {icons.map((icon, i) => (
          <span key={i} className="scene-pop block" style={{ animationDelay: `${0.3 + i * 0.35}s` }}>
            <PixelIcon name={icon} size={i === 1 ? 92 : 72} />
          </span>
        ))}
      </div>
      <div className="absolute inset-x-0 bottom-0 h-[32%]" style={{ background: ground }} />
      <div className="absolute bottom-[22%] left-[14%] flex items-end gap-2">
        {actors.map((a, i) => (
          <span key={i} className="scene-walk block" style={{ animationDelay: `${i * 0.25}s` }}>
            <span className="scene-bob block">
              <PixelIcon name={a} size={64} />
            </span>
          </span>
        ))}
      </div>
      <div className="fin-grain absolute inset-0" />
      <div className="fin-vignette absolute inset-0" />
      <div className="font-pixel absolute left-[6%] top-[12vh] text-left">
        <div className="text-xs uppercase tracking-[0.3em] text-amber-100/70 md:text-sm">{ERAS[era].name}</div>
        <div className="fin-type text-xl text-amber-50 md:text-3xl">{formatYear(ERAS[era].startYear)}</div>
      </div>
      <span className="sr-only">{line}</span>
    </div>
  );
}

// ---- The Ark ----------------------------------------------------------------

const MEMORIES: { sky: string; ground: string; icons: IconId[]; actors: IconId[]; line: (s: GameState) => string }[] = [
  {
    sky: "linear-gradient(#f6b58c, #fbe3b8 70%)",
    ground: "#7cae4c",
    icons: ["sapling", "campfire", "mammoth"],
    actors: ["elder", "person", "person"],
    line: (s) => `A handful of people, and one small fire on the shore. They called themselves ${s.nation ?? "the Emberfolk"}.`,
  },
  {
    sky: "linear-gradient(#7cc4ee, #d6f0fb 75%)",
    ground: "#a7b85a",
    icons: ["wheat", "bricks", "well"],
    actors: ["person", "person"],
    line: () => "They planted the first fields, and learned what the soil could give, and what it could not.",
  },
  {
    sky: "linear-gradient(#e9c27a, #fbe9c4 75%)",
    ground: "#b8a46a",
    icons: ["column", "aqueduct", "insula"],
    actors: ["person", "elder"],
    line: () => "They carried water through stone arches, and lived through the great drought.",
  },
  {
    sky: "linear-gradient(#6b4a8a, #e98b5a 80%)",
    ground: "#5f8a3e",
    icons: ["windmill", "castle", "church"],
    actors: ["person", "person", "person"],
    line: () => "Plague, kings and cathedrals. They came through all of it, together.",
  },
  {
    sky: "linear-gradient(#5c544c, #b9ab98 80%)",
    ground: "#6a6a5a",
    icons: ["factory", "train", "powerplant"],
    actors: ["person", "person"],
    line: () => "Coal made them strong, and filled the sky with smoke. Then they learned to clear it.",
  },
  {
    sky: "linear-gradient(#2b7486, #bfe6ee 80%)",
    ground: "#4f9a5a",
    icons: ["solar", "turbine", "satellite"],
    actors: ["person", "robot", "person"],
    line: () => "And at last they learned to live lightly on their world.",
  },
];

function arkBeats(state: GameState): Beat[] {
  const d = state.debrief ?? makeDebrief(state, "final");
  const who = state.nation ?? "Our people";
  const crew = Math.max(12, Math.round(state.population * 0.08));
  const forest = Math.round((d.forestLeft ?? 0) * 100);
  const planted = Math.round(d.planted ?? 0);
  const memories: Beat[] = MEMORIES.map((m, era) => ({
    ms: 4600,
    caption: m.line(state),
    scene: <Memory era={era} sky={m.sky} ground={m.ground} icons={m.icons} actors={m.actors} line={m.line(state)} />,
  }));
  const night = "linear-gradient(#050816 0%, #101a3a 60%, #1c2a52 100%)";
  return [
    {
      ms: 5200,
      caption: `${formatYear(state.year)}. On the island where it all began, everyone has come to watch.`,
      scene: (
        <div className="fin-fade-in absolute inset-0" style={{ background: night }}>
          <Stars n={70} />
          <span className="fin-searchlight absolute bottom-[40%] left-[30%] block h-[80%] w-[6%] origin-bottom" />
          <span className="fin-searchlight fin-searchlight-2 absolute bottom-[40%] left-[66%] block h-[80%] w-[6%] origin-bottom" />
          <Island icons={["hut", "insula", "datacenter", "arcology", "park", "turbine", "solar", "hospital"]} lit />
          <div className="fin-push absolute inset-0">
            <LaunchPad />
          </div>
        </div>
      ),
    },
    {
      ms: 3600,
      caption: "Fifty thousand years of fires, fields and cities, and it comes down to this.",
      scene: (
        <div className="absolute inset-0" style={{ background: night }}>
          <Stars n={70} />
          <Island icons={["hut", "insula", "datacenter", "arcology", "park", "turbine", "solar", "hospital"]} lit />
          <div className="fin-push-close absolute inset-0">
            <LaunchPad />
          </div>
          <div className="font-pixel absolute inset-0 flex items-center justify-center">
            {["3", "2", "1"].map((n, i) => (
              <span key={n} className="fin-count absolute text-[22vmin] font-bold text-amber-200/90" style={{ animationDelay: `${i * 1.1}s` }}>
                {n}
              </span>
            ))}
          </div>
        </div>
      ),
    },
    {
      ms: 4800,
      sfx: "firework",
      shake: true,
      caption: "Ignition.",
      scene: (
        <div className="absolute inset-0" style={{ background: night }}>
          <Stars n={70} />
          <span className="fin-glow-ground absolute inset-x-0 bottom-0 block h-[60%]" />
          <Island icons={["hut", "insula", "datacenter", "arcology", "park", "turbine", "solar", "hospital"]} lit />
          <LaunchPad rising firing />
          <span className="fin-flash pointer-events-none absolute inset-0 block bg-white" />
        </div>
      ),
    },
    {
      ms: 5200,
      caption: "Up through the clouds, through the thin blue line of the air...",
      scene: (
        <div className="absolute inset-0 bg-black">
          <div className="fin-sky-fade absolute inset-0" style={{ background: "linear-gradient(#1d6fb8, #7cc4ee)" }} />
          <Stars n={90} className="fin-stars-in" />
          {Array.from({ length: 8 }, (_, i) => (
            <span
              key={i}
              className="fin-cloud absolute block rounded-full bg-white/85"
              style={{ left: `${(i * 29) % 90}%`, width: `${18 + (i % 3) * 10}%`, height: "7%", animationDelay: `${i * 0.3}s` }}
            />
          ))}
          <div className="fin-climb absolute left-1/2 top-[45%] -translate-x-1/2">
            <PixelIcon name="rocket" size={90} />
            <span className="fin-flame absolute left-1/2 top-[90%] block h-16 w-6 -translate-x-1/2 rounded-b-full" />
          </div>
        </div>
      ),
    },
    {
      ms: 6000,
      caption: forest >= 50 ? `...and there it is. Home. Still green, with ${forest}% of its old forest standing.` : "...and there it is. Home. Smaller than anyone imagined.",
      scene: (
        <div className="absolute inset-0 bg-black">
          <Stars n={110} />
          <div className="fin-planet absolute left-1/2 top-1/2 h-[62vmin] w-[62vmin] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full">
            <div className="absolute inset-0 rounded-full" style={{ background: "radial-gradient(circle at 35% 30%, #5bb8e8, #1b5f9e 55%, #0b2a52 100%)" }} />
            <div className="fin-land absolute inset-0">
              {[
                [22, 30, 26, 16],
                [52, 44, 30, 20],
                [30, 64, 18, 12],
                [66, 22, 14, 10],
                [74, 62, 16, 14],
              ].map(([x, y, w, h], i) => (
                <span key={i} className="absolute block rounded-[45%]" style={{ left: `${x}%`, top: `${y}%`, width: `${w}%`, height: `${h}%`, background: i === 1 ? "#3f9a4a" : "#5aa24a" }} />
              ))}
            </div>
            <div className="absolute inset-0 rounded-full" style={{ background: "radial-gradient(circle at 70% 70%, transparent 45%, rgba(0,0,0,0.65) 75%)" }} />
          </div>
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-[66vmin] w-[66vmin] -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_0_60px_12px_rgba(120,200,255,0.35)]" />
          <span className="absolute right-[12%] top-[16%]">
            <PixelIcon name="moon" size={56} />
          </span>
          <span className="absolute left-[9%] top-[20%] block h-8 w-8 rounded-full bg-[#c1440e] shadow-[inset_-6px_-5px_0_#7a2a08]" />
          <span className="fin-cross absolute top-[30%]">
            <PixelIcon name="rocket" size={34} />
          </span>
        </div>
      ),
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
      caption: `${Math.round(d.stats.peakPopulation)} people at the most. ${d.stats.built} buildings. ${planted} trees planted. ${d.stats.raidsWon} raids held off. ${d.researched} discoveries.`,
      scene: (
        <div className="fin-fade-in absolute inset-0 flex items-center justify-center bg-[#140e0a]">
          <div className="fin-grain absolute inset-0" />
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
      caption: `The Ember Ark carries ${crew} volunteers, seeds from every field, and, in a lantern, an ember from the first fire.`,
      scene: (
        <div className="absolute inset-0 bg-black">
          <div className="absolute inset-0">
            {Array.from({ length: 48 }, (_, i) => (
              // Each streak flies out from the middle along its own direction.
              <span key={i} className="absolute left-1/2 top-1/2 block" style={{ transform: `rotate(${i * 7.5 + (i % 3) * 2}deg)` }}>
                <span className="fin-warp block h-[2px] bg-white/80" style={{ animationDelay: `${(i % 8) * 0.22}s` }} />
              </span>
            ))}
          </div>
          <span className="fin-star-grow absolute right-[16%] top-[30%] block h-3 w-3 rounded-full bg-amber-100 shadow-[0_0_18px_8px_rgba(253,230,138,0.8)]" title="Alpha Centauri" />
          <div className="fin-drift absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <span className="fin-ark-glow absolute -inset-8 rounded-full" />
            <PixelIcon name="rocket" size={110} />
            <span className="fin-lantern absolute left-[56%] top-[42%] block h-2.5 w-2.5 rounded-full bg-amber-400" />
          </div>
          <span className="font-pixel absolute right-[10%] top-[36%] text-xs text-white/50">Alpha Centauri · 4.2 light-years</span>
        </div>
      ),
    },
    {
      ms: 6200,
      caption: `Most of ${who} stayed. The island was green again, and this time they would keep it that way.`,
      scene: (
        <div className="fin-fade-in absolute inset-0" style={{ background: "linear-gradient(#f6b58c, #fbe3b8 55%, #cfe8c0 100%)" }}>
          <span className="absolute right-[14%] top-[16%]">
            <PixelIcon name="sun" size={64} />
          </span>
          <span className="fin-trail absolute right-[30%] top-[10%] block h-[2px] w-[22%] origin-right bg-white/80" />
          <div className="absolute inset-x-[-5%] bottom-[28%] h-[26%] rounded-t-[50%] bg-[#5aa24a]" />
          <div className="absolute inset-x-0 bottom-0 h-[30%] bg-[#6dbb55]" />
          <div className="absolute inset-x-0 bottom-[44%] flex items-end justify-around px-[6%]">
            {(["sapling", "park", "sapling", "solar", "sapling", "turbine", "sapling"] as IconId[]).map((icon, i) => (
              <PixelIcon key={i} name={icon} size={i % 2 ? 72 : 64} />
            ))}
          </div>
          <div className="absolute bottom-[31%] left-1/2 flex -translate-x-1/2 items-end gap-2">
            {(["person", "elder", "person", "person", "robot", "person"] as IconId[]).map((a, i) => (
              <span key={i} className="scene-bob block" style={{ animationDelay: `${i * 0.2}s` }}>
                <PixelIcon name={a} size={58} />
              </span>
            ))}
          </div>
        </div>
      ),
    },
    {
      ms: 0,
      last: true,
      sfx: "win",
      scene: (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black">
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
  const town: IconId[] = ["insula", "factory", "datacenter", "powerplant", "arcology", "hospital", "train"];
  const red = "linear-gradient(#3a0d0a 0%, #8a2a12 55%, #d0662a 100%)";
  return [
    {
      ms: 5600,
      sfx: "lose",
      caption: `${formatYear(state.year)}. The air grew hotter every summer, and the seas began to rise.`,
      scene: (
        <div className="fin-fade-in absolute inset-0" style={{ background: red }}>
          <div className="fin-haze absolute inset-0" />
          <Island icons={town} color="#1a0f0c" />
        </div>
      ),
    },
    {
      ms: 5600,
      shake: true,
      caption: "Harvests failed. The forests burned. People argued about what to do, and waited.",
      scene: (
        <div className="absolute inset-0" style={{ background: red }}>
          <div className="fin-haze absolute inset-0" />
          <Island icons={town} color="#1a0f0c" />
          {Array.from({ length: 9 }, (_, i) => (
            <span key={i} className="fin-burn absolute" style={{ left: `${6 + i * 11}%`, bottom: `${30 + (i % 3) * 5}%`, animationDelay: `${i * 0.25}s` }}>
              <PixelIcon name="flame" size={44} />
            </span>
          ))}
        </div>
      ),
    },
    {
      ms: 6000,
      caption: "One by one, the low islands went under.",
      scene: (
        <div className="absolute inset-0" style={{ background: "linear-gradient(#1c1f2a, #3c4a5c 70%)" }}>
          <div className="fin-rain absolute inset-0" />
          <div className="fin-sink absolute inset-0">
            <Island icons={town} color="#141a20" />
          </div>
          <div className="fin-flood absolute inset-x-0 bottom-0 bg-[#1f4a6e]/90">
            <span className="scene-waves absolute inset-x-0 top-0 h-3 opacity-60" />
          </div>
        </div>
      ),
    },
    {
      ms: 5600,
      caption: `The last ships left for higher ground. ${who} had the knowledge to save their world. They ran out of time.`,
      scene: (
        <div className="absolute inset-0" style={{ background: "linear-gradient(#141821, #2e3646 70%)" }}>
          <div className="absolute inset-x-0 bottom-0 h-[38%] bg-[#1f3a52]">
            <span className="scene-waves absolute inset-x-0 top-0 h-3 opacity-50" />
          </div>
          <div className="absolute bottom-[34%] left-[8%] h-[10%] w-[30%] rounded-t-[60%] bg-[#0e1114]" />
          <span className="fin-sail absolute bottom-[33%]">
            <PixelIcon name="boat" size={64} />
          </span>
        </div>
      ),
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
