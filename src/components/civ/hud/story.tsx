"use client";

import { useEffect, useState } from "react";
import { ERAS } from "@/game/content";
import { storyObjectiveDone } from "@/game/engine";
import { CAST, CHAPTERS, type Speaker } from "@/game/story";
import type { IconId } from "@/game/sprites";
import { useGame } from "@/components/civ/game-provider";
import { PixelIcon } from "@/components/civ/pixel-icon";
import { cn } from "@/lib/utils";
import { playSfx } from "@/lib/audio";
import { useShot } from "./letterbox";

// Story mode (The Ember Keepers): the chapter's scene, told like a picture
// book: the era behind, the characters in front (whoever speaks steps up), and
// their words typed out underneath. Click, Space or Enter to go on.

// Each era behind the scene: its sky, its ground and what stands on its hills.
const BACKDROPS: { sky: string; ground: string; hills: string; skyline: IconId[] }[] = [
  { sky: "linear-gradient(#f6b58c, #fbe3b8 70%)", ground: "#7cae4c", hills: "#5b8f3a", skyline: ["sapling", "campfire", "hut", "sapling"] },
  { sky: "linear-gradient(#7cc4ee, #d6f0fb 75%)", ground: "#a7b85a", hills: "#86a04a", skyline: ["wheat", "bricks", "well", "wheat"] },
  { sky: "linear-gradient(#e9c27a, #fbe9c4 75%)", ground: "#b8a46a", hills: "#9c8a52", skyline: ["column", "aqueduct", "insula", "baths"] },
  { sky: "linear-gradient(#6b4a8a, #e98b5a 80%)", ground: "#5f8a3e", hills: "#3f6a2e", skyline: ["windmill", "castle", "church", "boat"] },
  { sky: "linear-gradient(#5c544c, #b9ab98 80%)", ground: "#6a6a5a", hills: "#4f4f44", skyline: ["factory", "train", "powerplant", "turbine"] },
  { sky: "linear-gradient(#123a52, #6fc3d6 80%)", ground: "#4f9a5a", hills: "#3a7a46", skyline: ["solar", "arcology", "rocket", "turbine"] },
];

export function StoryScene() {
  const { state, dispatch } = useGame();
  const shot = useShot();
  const story = state.story;
  const chapter = story ? CHAPTERS[story.chapter] : null;
  const lines = !story?.scene || !chapter ? [] : story.scene === "intro" ? chapter.intro : chapter.outro ?? [];
  const key = story?.scene ? `${story.chapter}-${story.scene}` : "";
  const [at, setAt] = useState({ key, line: 0, chars: 0 });
  const line = at.key === key ? at.line : 0;
  const chars = at.key === key ? at.chars : 0;
  const text = lines[line]?.[1] ?? "";
  const typing = chars < text.length;
  const showing = !!story?.scene && !!chapter && !shot;

  // Type the line out, a few letters at a time.
  useEffect(() => {
    if (!showing || !typing) return;
    const t = setTimeout(() => setAt({ key, line, chars: Math.min(text.length, chars + 2) }), 22);
    return () => clearTimeout(t);
  }, [showing, typing, key, line, chars, text.length]);

  useEffect(() => {
    if (showing) playSfx(story?.scene === "outro" ? "win" : "discover");
  }, [showing, story?.scene, story?.chapter]);

  const next = () => {
    if (typing) return setAt({ key, line, chars: text.length });
    if (line < lines.length - 1) return setAt({ key, line: line + 1, chars: 0 });
    dispatch({ type: "storyNext" });
  };

  useEffect(() => {
    if (!showing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        next();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!showing || !story || !chapter) return null;
  const outro = story.scene === "outro";
  const speaker = lines[line]?.[0] ?? "narrator";
  const backdrop = BACKDROPS[Math.min(chapter.era, BACKDROPS.length - 1)];
  // Everyone who speaks in this scene stands on stage.
  const cast = Array.from(new Set(lines.map(([who]) => who).filter((w) => w !== "narrator"))) as Speaker[];
  const last = !typing && line === lines.length - 1;
  return (
    <div className="pointer-events-auto fixed inset-0 z-[56] flex flex-col bg-black text-white" data-testid="story-scene" onClick={next} role="presentation">
      {/* The era behind them. */}
      <div className="story-stage relative flex-1 overflow-hidden" style={{ background: backdrop.sky }}>
        <div className="absolute inset-x-[-5%] bottom-[22%] h-[30%] rounded-t-[50%]" style={{ background: backdrop.hills }} />
        <div className="absolute inset-x-0 bottom-[44%] flex justify-around px-[8%] opacity-60" style={{ filter: "saturate(0.6)" }}>
          {backdrop.skyline.map((icon, i) => (
            <PixelIcon key={i} name={icon} size={56} />
          ))}
        </div>
        <div className="absolute inset-x-0 bottom-0 h-[24%]" style={{ background: backdrop.ground }} />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/50" />

        {/* The chapter's title, as the scene opens. */}
        <div className="story-title font-pixel absolute inset-x-0 top-[8%] text-center drop-shadow-[0_3px_0_rgba(0,0,0,0.6)]">
          <div className="text-xs uppercase tracking-[0.35em] text-amber-200 md:text-sm">
            {outro ? "Chapter complete" : `Chapter ${story.chapter + 1} of ${CHAPTERS.length} · ${ERAS[chapter.era].name}`}
          </div>
          <div className="text-3xl font-bold text-white md:text-5xl">{chapter.title}</div>
          {outro && chapter.reward && (
            <div className="mt-1 text-sm text-amber-100">
              Reward:{" "}
              {Object.entries(chapter.reward)
                .map(([k, v]) => `+${v} ${k === "currency" ? "coins" : k}`)
                .join(", ")}
            </div>
          )}
        </div>

        {/* The characters: whoever speaks steps forward. */}
        <div className="absolute inset-x-0 bottom-[6%] flex items-end justify-center gap-6 md:gap-14">
          {cast.map((who) => {
            const c = CAST[who];
            const speaking = who === speaker;
            return (
              <div key={who} className={cn("story-actor flex flex-col items-center transition-all duration-300", speaking ? "scale-110 opacity-100" : "scale-90 opacity-60 grayscale-[40%]")}>
                <span className="relative block">
                  <span className={cn("block", speaking && "scene-bob")}>
                    <PixelIcon name={c.icon as IconId} size={104} />
                  </span>
                  {c.badge && (
                    <span className="absolute -right-3 bottom-2">
                      <PixelIcon name={c.badge as IconId} size={40} />
                    </span>
                  )}
                </span>
                <span className="font-pixel mt-1 px-2 text-sm font-semibold" style={{ background: c.color }}>
                  {c.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* What they say. */}
      <div className="font-pixel relative min-h-[26vh] border-t-4 border-[#2b2119] bg-[#1b140f] px-5 py-4 md:px-12" data-testid="story-line">
        {speaker !== "narrator" ? (
          <div className="mb-1 inline-block px-2 text-sm font-semibold" style={{ background: CAST[speaker].color }}>
            {CAST[speaker].name}
          </div>
        ) : (
          <div className="mb-1 text-xs uppercase tracking-[0.3em] text-amber-300/80">The story so far</div>
        )}
        <p className={cn("max-w-4xl text-base leading-relaxed md:text-xl", speaker === "narrator" && "italic text-amber-50/90")}>
          {text.slice(0, chars)}
          {typing && <span className="story-caret">▌</span>}
        </p>
        <div className="absolute bottom-3 right-5 flex items-center gap-3 text-xs text-white/60">
          <span>
            {line + 1}/{lines.length}
          </span>
          {last ? (
            <button
              type="button"
              autoFocus
              onClick={(e) => {
                e.stopPropagation();
                next();
              }}
              className="pixel-btn bg-amber-400 px-4 py-1.5 text-sm font-semibold text-[#2b2119]"
              data-testid="story-continue"
            >
              {outro ? "Next chapter" : "Begin"}
            </button>
          ) : (
            <span>Click to go on</span>
          )}
        </div>
      </div>
    </div>
  );
}

// The chapter's objectives, ticked off as they're met.
export function StoryPanel() {
  const { state } = useGame();
  const story = state.story;
  const chapter = story ? CHAPTERS[story.chapter] : null;
  if (!story || !chapter || story.scene) return null;
  return (
    <div className="pixel-panel pointer-events-auto w-full p-3 text-sm md:w-80" data-testid="story-panel">
      <div className="font-pixel text-[11px] uppercase tracking-widest text-amber-700">
        Chapter {story.chapter + 1} of {CHAPTERS.length}
      </div>
      <div className="font-pixel text-lg font-semibold leading-tight">{chapter.title}</div>
      <ul className="mt-1.5 space-y-1">
        {chapter.objectives.map((o) => {
          const done = storyObjectiveDone(state, o);
          return (
            <li key={o.label} className={cn("flex items-start gap-1.5", done && "text-emerald-700")}>
              <span className="font-num text-base leading-5">{done ? "✓" : "○"}</span>
              <span className={cn(done && "line-through decoration-emerald-600/60")}>{o.label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
