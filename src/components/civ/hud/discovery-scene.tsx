"use client";

import { useEffect, useMemo, useState } from "react";
import { DISCOVERIES, TREE_BY_ID } from "@/game/content";
import { useGame } from "@/components/civ/game-provider";
import { Stage3D } from "@/components/civ/cutscene/stage";
import { discoveryShot } from "@/components/civ/cutscene/shots";
import { lineEnds, scriptFor } from "@/game/scenes";
import { useCutsceneStyle } from "@/lib/graphics";
import { PixelDiscoveryStage } from "./pixel-scenes";

// How long each line stays before the next one (ms): long enough to read it
// and to see what it acts out happen, within limits.
const lineMs = (end: number) => Math.min(4400, Math.max(2600, end * 1000 + 500));

// A short scene of the moment an advancement was discovered, played in 3D on a
// little island of the era: the people walk up, and what they found appears
// (built of blocks, in light); a building it unlocks rises behind it. It plays
// when one is researched (or a secret found); the game waits meanwhile.
export function DiscoveryScene() {
  const { state, dispatch } = useGame();
  const id = state.cutscene;
  const scene = id ? DISCOVERIES[id] : null;
  const [shown, setShown] = useState({ id, lines: 1 });
  // A new scene starts again from its first line.
  const lines = shown.id === id ? shown.lines : 1;

  useEffect(() => {
    if (!scene || !id || lines >= scene.lines.length) return;
    const t = setTimeout(() => setShown({ id, lines: lines + 1 }), lineMs(lineEnds(scriptFor(id, scene), lines - 1)));
    return () => clearTimeout(t);
  }, [id, scene, lines]);

  const style = useCutsceneStyle();
  const node = id ? TREE_BY_ID[id] : null;
  const era = state.era;
  const shot = useMemo(() => (scene && id ? discoveryShot(id, scene, era, lines - 1) : null), [scene, id, era, lines]);

  if (!scene || !id || !shot) return null;
  const secret = !!node?.secret;
  const done = lines >= scene.lines.length;
  const close = () => dispatch({ type: "dismissCutscene" });

  return (
    <div className="pointer-events-auto absolute inset-0 z-[45] flex items-center justify-center bg-black/55 p-3" data-testid="discovery-scene">
      <div className="pixel-panel w-[min(94vw,860px)] p-3 md:p-4">
        <div className="font-pixel mb-2 flex items-center justify-between gap-2">
          <span className="text-lg font-bold md:text-xl">
            <span className="text-amber-700">{id === "healed" ? "Back on her feet" : secret ? "Secret found: " : "Discovered: "}</span>
            {node?.name}
          </span>
          <button type="button" onClick={close} className="text-xs text-stone-500 underline">
            Skip
          </button>
        </div>

        {/* The stage (pixel art, or 3D). Clicking it goes on to the next line. */}
        {style === "pixel" ? (
          <PixelDiscoveryStage id={id} scene={scene} lines={lines} era={era} name={node?.name ?? "discovery"} onAdvance={() => (done ? close() : setShown({ id, lines: lines + 1 }))} />
        ) : (
        <div className="relative aspect-[16/7] w-full overflow-hidden border-[3px] border-[#2b2119] bg-black">
          <Stage3D shot={shot} className="absolute inset-0" />
          <span key={`${id}-${lines}`} className="scene-beat-wash pointer-events-none absolute inset-0" aria-hidden="true" />
          <button
            type="button"
            aria-label={`Advance scene: ${node?.name ?? "discovery"}`}
            onClick={() => (done ? close() : setShown({ id, lines: lines + 1 }))}
            className="absolute inset-0 block cursor-pointer"
            data-testid="scene-stage"
            data-era={era}
          />
        </div>
        )}

        <div className="mt-3 min-h-[5.5rem] text-sm md:text-base" aria-live="polite">
          {scene.lines.slice(0, lines).map((l, i) => (
            <p key={i} className={i === lines - 1 ? "scene-line" : "text-stone-500"}>
              {l}
            </p>
          ))}
        </div>

        <div className="mt-2 flex items-center gap-2" aria-label={`Scene beat ${lines} of ${scene.lines.length}`}>
          <div className="flex flex-1 gap-1" aria-hidden="true">
            {scene.lines.map((_, i) => (
              <span key={i} className={`h-1 flex-1 ${i < lines ? "bg-amber-500" : "bg-stone-300"}`} />
            ))}
          </div>
          <span className="font-num text-xs text-stone-500">{lines}/{scene.lines.length}</span>
        </div>

        <div className="mt-2 flex justify-end">
          {done ? (
            <button
              type="button"
              autoFocus
              onClick={close}
              className="pixel-btn font-pixel bg-amber-400 px-4 py-1.5 text-sm font-semibold text-[#2b2119]"
              data-testid="scene-continue"
            >
              Continue
            </button>
          ) : (
            <span className="text-xs text-stone-500">Click the scene to go faster</span>
          )}
        </div>
      </div>
    </div>
  );
}
