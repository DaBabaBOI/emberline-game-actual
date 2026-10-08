"use client";

import { useEffect, useMemo, useState } from "react";
import { ERAS } from "@/game/content";
import { storyObjectiveDone } from "@/game/engine";
import { CAST, CHAPTERS } from "@/game/story";
import { useGame } from "@/components/civ/game-provider";
import { Stage3D } from "@/components/civ/cutscene/stage";
import { storySet, storyShot } from "@/components/civ/cutscene/shots";
import { useCutsceneStyle } from "@/lib/graphics";
import { PixelStoryStage } from "./pixel-scenes";
import { cn } from "@/lib/utils";
import { playSfx } from "@/lib/audio";
import { useShot } from "./letterbox";

// Story mode (The Ember Keepers): the chapter's scene, played in 3D on a
// little island of its era: Ama, Kito and Lina stand in front of the town, the
// camera goes to whoever speaks (wide over the town for the narrator), and
// their words are typed out underneath. Click, Space or Enter to go on.

export function StoryScene() {
  const { state, dispatch } = useGame();
  const shot = useShot();
  const style = useCutsceneStyle();
  const story = state.story;
  const chapter = story ? CHAPTERS[story.chapter] : null;
  const sceneName = story?.scene;
  const lines = useMemo(() => (!sceneName || !chapter ? [] : sceneName === "intro" ? chapter.intro : chapter.outro ?? []), [sceneName, chapter]);
  const key = story?.scene ? `${story.chapter}-${story.scene}` : "";
  const [at, setAt] = useState({ key, line: 0, chars: 0 });
  const line = at.key === key ? at.line : 0;
  const chars = at.key === key ? at.chars : 0;
  const text = lines[line]?.[1] ?? "";
  const typing = chars < text.length;
  const showing = !!story?.scene && !!chapter && !shot;
  const speaker = lines[line]?.[0] ?? "narrator";

  // The set for this scene, and the shot for this line (only when the speaker
  // changes, so the typing doesn't redraw the 3D scene).
  const chapterIndex = story?.chapter ?? 0;
  const scene = story?.scene ?? "intro";
  const set = useMemo(() => (chapter ? storySet(chapter, scene, chapterIndex) : null), [chapter, scene, chapterIndex]);
  // Everyone who speaks in this scene stands on stage.
  const cast = useMemo(() => Array.from(new Set(lines.map(([who]) => who).filter((w) => w !== "narrator"))) as ("ama" | "kito" | "lina")[], [lines]);
  const stageShot = useMemo(() => (set ? storyShot(`story-${key}`, set, cast, speaker) : null), [set, cast, speaker, key]);

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

  if (!showing || !story || !chapter || !stageShot) return null;
  const outro = story.scene === "outro";
  const last = !typing && line === lines.length - 1;
  return (
    <div className="pointer-events-auto fixed inset-0 z-[56] flex flex-col bg-black text-white" data-testid="story-scene" onClick={next} role="presentation">
      {/* The scene, in 3D. */}
      <div className="story-stage relative flex-1 overflow-hidden" data-era={chapter.era}>
        {style === "pixel" ? <PixelStoryStage era={chapter.era} cast={cast} speaker={speaker} /> : <Stage3D shot={stageShot} className="absolute inset-0" />}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/30" />

        {/* The chapter's title, as the scene opens. */}
        <div className="story-title font-pixel pointer-events-none absolute inset-x-0 top-[6%] text-center drop-shadow-[0_3px_0_rgba(0,0,0,0.6)]">
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

        {/* Who is on stage, the speaker lit up (the pixel stage names them itself). */}
        <div className={cn("pointer-events-none absolute bottom-3 left-3 flex gap-1.5", style === "pixel" && "hidden")}>
          {cast.map((who) => (
            <span
              key={who}
              className={cn("font-pixel px-2 py-0.5 text-xs font-semibold transition-opacity duration-300", who === speaker ? "opacity-100" : "opacity-45")}
              style={{ background: CAST[who].color }}
            >
              {CAST[who].name}
            </span>
          ))}
        </div>
      </div>

      {/* What they say. The whole line is laid out from the start (the part not
          yet typed is invisible), so words never jump from line to line. */}
      <div className="font-pixel relative h-[26vh] min-h-[9.5rem] border-t-4 border-[#2b2119] bg-[#1b140f] px-5 py-4 md:px-12" data-testid="story-line">
        {speaker !== "narrator" ? (
          <div className="mb-1 inline-block px-2 text-sm font-semibold" style={{ background: CAST[speaker].color }}>
            {CAST[speaker].name}
          </div>
        ) : (
          <div className="mb-1 text-xs uppercase tracking-[0.3em] text-amber-300/80">The story so far</div>
        )}
        <p className={cn("max-w-4xl text-base leading-relaxed md:text-xl", speaker === "narrator" && "italic text-amber-50/90")} aria-label={text}>
          <span aria-hidden="true">{text.slice(0, chars)}</span>
          {typing && (
            <span className="relative inline-block w-0" aria-hidden="true">
              <span className="story-caret absolute left-0">▌</span>
            </span>
          )}
          <span className="invisible" aria-hidden="true">
            {text.slice(chars)}
          </span>
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
      {/* How story mode works, in a line (players asked). */}
      <p className="mt-0.5 text-xs text-stone-600">Play as normal and do these. When all are ticked, a scene plays and the next chapter begins (13 in all, ending with the Ark).</p>
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
