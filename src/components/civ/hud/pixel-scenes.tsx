"use client";

import type { DiscoveryScene as Scene, SceneSky } from "@/game/content";
import { CAST, type Speaker } from "@/game/story";
import type { IconId } from "@/game/sprites";
import { PixelIcon } from "@/components/civ/pixel-icon";
import { cn } from "@/lib/utils";

// The pixel-art cutscenes (Menu > Graphics > Cutscenes: Pixel): the flat
// scenes of drawn icons the game had before its cutscenes went 3D. Some
// players like them better: they have their own look.

// ---- Discoveries ----------------------------------------------------------------

const SKIES: Record<SceneSky, { sky: string; ground: string; hills: string; far: string }> = {
  dawn: { sky: "linear-gradient(#f6b58c, #fbe3b8 70%)", ground: "#7cae4c", hills: "#5b8f3a", far: "#9aa97a" },
  day: { sky: "linear-gradient(#7cc4ee, #d6f0fb 75%)", ground: "#86c95f", hills: "#5aa24a", far: "#8fbf7a" },
  dusk: { sky: "linear-gradient(#6b4a8a, #e98b5a 80%)", ground: "#5f8a3e", hills: "#3f6a2e", far: "#8a5f6a" },
  night: { sky: "linear-gradient(#10183a, #2c3a6b 80%)", ground: "#344d2c", hills: "#24391f", far: "#2e3b52" },
  sea: { sky: "linear-gradient(#7cc4ee, #d6f0fb 70%)", ground: "#ead79c", hills: "#1f6fa8", far: "#43a9d6" },
  // Inside a cave: dark rock all round, a flat wall to paint on.
  cave: { sky: "linear-gradient(#3b2f28, #5a4637 80%)", ground: "#2e241e", hills: "#4a3a2e", far: "#6b5644" },
};

// Far off on the hills behind each scene, what the island looks like in this
// era: huts in the Stone Age, columns and aqueducts in the Classical era,
// castles and windmills, then factories, then rockets. `haze` tints the sky
// (factory smoke; the glow of the future).
const ERA_BACKDROPS: { skyline: [IconId, number][]; haze?: string; planet?: boolean }[] = [
  { skyline: [["hut", 18], ["mammoth", 50], ["sapling", 82]] },
  { skyline: [["bricks", 20], ["well", 50], ["hut", 80]] },
  { skyline: [["aqueduct", 20], ["insula", 50], ["baths", 80]] },
  { skyline: [["castle", 20], ["church", 50], ["windmill", 80]] },
  { skyline: [["factory", 24], ["mill", 76]], haze: "linear-gradient(rgba(96,84,72,0.24), rgba(96,84,72,0) 65%)" },
  { skyline: [["rocket", 26], ["insula", 74]], haze: "linear-gradient(rgba(43,116,134,0.28), rgba(43,116,134,0) 70%)", planet: true },
];

// The stage of a discovery scene, drawn flat: sky, far hills with the era's
// buildings, near hills, the ground, people walking in, and what they found
// appearing in light. Click it to go on.
export function PixelDiscoveryStage({ id, scene, lines, era, name, onAdvance }: { id: string; scene: Scene; lines: number; era: number; name: string; onAdvance: () => void }) {
  const sky = SKIES[scene.bg];
  const backdrop = ERA_BACKDROPS[Math.min(era, ERA_BACKDROPS.length - 1)];
  // Out in the open (not in a cave or at sea), the era shows on the hills.
  const outdoors = scene.bg !== "cave" && scene.bg !== "sea";
  // The stage: sky, far hills, near hills, ground, people and the discovery.
  return (
    <button
      type="button"
      aria-label={`Advance scene: ${name}`}
      onClick={onAdvance}
      className="scene-stage relative block aspect-[16/7] w-full overflow-hidden border-[3px] border-[#2b2119]"
      style={{ background: sky.sky }}
    >
      {/* The camera pushes in on the scene, like the fly-in at the start of a game. */}
      <span key={id} className="scene-camera absolute inset-0 block">
      {outdoors && backdrop.haze && <span className="absolute inset-0" style={{ background: backdrop.haze }} />}
      {outdoors && backdrop.planet && (
        // A ringed planet low in the sky.
        <span className="absolute left-[22%] top-[10%] h-6 w-6 rounded-full bg-[#c9a6e8] opacity-80">
          <span className="absolute left-[-35%] top-[40%] h-[20%] w-[170%] rotate-[-15deg] rounded-full bg-[#efe1ff]/70" />
        </span>
      )}
      {scene.bg === "cave" && (
        // The rock wall, lit warm by the torch.
        <span className="absolute inset-x-[10%] bottom-[28%] top-[12%] rounded-t-[40%]" style={{ background: "radial-gradient(circle at 30% 60%, #a5805a, #6b5644 70%)" }} />
      )}
      {scene.bg === "night" &&
        [8, 21, 35, 52, 66, 79, 90, 14, 44, 72].map((x, i) => (
          <span
            key={i}
            className="scene-twinkle absolute h-1 w-1 bg-white"
            style={{ left: `${x}%`, top: `${6 + ((i * 17) % 30)}%`, animationDelay: `${i * 0.3}s` }}
          />
        ))}
      {scene.bg !== "cave" && (
        <>
          <span className="absolute right-[8%] top-[8%]">
            <PixelIcon name={scene.bg === "night" ? "moon" : "sun"} size={34} />
          </span>
          <span className="scene-horizon absolute inset-x-[-5%] bottom-[28%] h-[30%] rounded-t-[50%]" style={{ background: sky.far }} />
          {outdoors && (
            // The era's buildings, faded by distance, on the far hills.
            <span className="scene-horizon absolute inset-x-0 bottom-[45%] h-[18%]" data-testid="scene-era" data-era={era}>
              {backdrop.skyline.map(([icon, x], i) => (
                <span
                  key={i}
                  className="absolute bottom-0 -translate-x-1/2"
                  style={{ left: `${x}%`, bottom: `${(i % 2) * 8}%`, opacity: scene.bg === "night" ? 0.28 : 0.42, filter: "saturate(0.45)" }}
                >
                  <PixelIcon name={icon} size={25} />
                </span>
              ))}
            </span>
          )}
          <span className="absolute bottom-[26%] left-[-10%] h-[26%] w-[70%] rounded-t-[60%]" style={{ background: sky.hills }} />
          <span className="absolute bottom-[26%] right-[-15%] h-[20%] w-[60%] rounded-t-[60%]" style={{ background: sky.hills }} />
        </>
      )}
      {scene.bg === "sea" && <span className="scene-waves absolute inset-x-0 bottom-[26%] h-[6%] opacity-70" />}
      <span className="absolute inset-x-0 bottom-0 h-[28%]" style={{ background: sky.ground }} />
      {scene.river === "dry" ? (
        <span className="absolute inset-x-0 bottom-[6%] h-[9%] bg-[#b79b6c]" />
      ) : (
        scene.river && (
          <span className="absolute inset-x-0 bottom-[6%] h-[9%] bg-[#4a90e2]">
            <span className="scene-waves absolute inset-x-0 top-[30%] h-[40%] opacity-60" />
          </span>
        )
      )}
      <span className="scene-ground-shade pointer-events-none absolute inset-x-0 bottom-0 h-[38%]" />

      {/* What else is there: shown from its line, gone after its `until` line. */}
      {(scene.props ?? [])
        .filter((p) => lines - 1 >= (p.from ?? 0) && (p.until === undefined || lines - 1 < p.until))
        .map((p, i) => (
          <span
            key={`${p.icon}-${i}`}
            className={(p.from ?? 0) > 0 ? "scene-prop scene-pop absolute" : "scene-prop absolute"}
            style={{ left: `${p.x}%`, bottom: `${p.y ?? 18}%`, transform: "translateX(-50%)" }}
          >
            <span className="block" style={p.flip ? { transform: "scaleX(-1)" } : undefined}>
              <PixelIcon name={p.icon} size={p.size ?? 40} />
            </span>
          </span>
        ))}

      {/* The people walk in from the left (those sitting are already there). */}
      <span className="absolute bottom-[18%] left-[8%] flex items-end gap-1">
        {scene.actors.map((a, i) =>
          a.endsWith("-sit") ? (
            <span key={i} className="scene-line block">
              <PixelIcon name={a} size={56} />
            </span>
          ) : (
            <span key={i} className="scene-walk block" style={{ animationDelay: `${i * 0.25}s` }}>
              <span className="scene-bob block" style={{ animationDelay: `${i * 0.2}s` }}>
                <PixelIcon name={a} size={56} />
              </span>
            </span>
          ),
        )}
      </span>

      {/* What they discovered appears with light around it. */}
      {lines - 1 >= (scene.itemFrom ?? 1) && (
        <span
          className="absolute flex -translate-x-1/2 items-center justify-center"
          style={{ left: `${scene.itemX ?? 74}%`, bottom: scene.bg === "cave" ? "38%" : "20%" }}
        >
          <span className="scene-rays absolute h-28 w-28 rounded-full" />
          <span className="scene-reveal relative block">
            <PixelIcon name={scene.item} size={80} />
          </span>
        </span>
      )}
      <span key={`${id}-${lines}`} className="scene-beat-wash pointer-events-none absolute inset-0" aria-hidden="true" />
      </span>
    </button>
  );
}

// ---- Story mode -----------------------------------------------------------------

const BACKDROPS: { sky: string; ground: string; hills: string; skyline: IconId[] }[] = [
  { sky: "linear-gradient(#f6b58c, #fbe3b8 70%)", ground: "#7cae4c", hills: "#5b8f3a", skyline: ["sapling", "campfire", "hut", "sapling"] },
  { sky: "linear-gradient(#7cc4ee, #d6f0fb 75%)", ground: "#a7b85a", hills: "#86a04a", skyline: ["wheat", "bricks", "well", "wheat"] },
  { sky: "linear-gradient(#e9c27a, #fbe9c4 75%)", ground: "#b8a46a", hills: "#9c8a52", skyline: ["column", "aqueduct", "insula", "baths"] },
  { sky: "linear-gradient(#6b4a8a, #e98b5a 80%)", ground: "#5f8a3e", hills: "#3f6a2e", skyline: ["windmill", "castle", "church", "boat"] },
  { sky: "linear-gradient(#5c544c, #b9ab98 80%)", ground: "#6a6a5a", hills: "#4f4f44", skyline: ["factory", "train", "powerplant", "turbine"] },
  { sky: "linear-gradient(#123a52, #6fc3d6 80%)", ground: "#4f9a5a", hills: "#3a7a46", skyline: ["solar", "arcology", "rocket", "turbine"] },
];

// The stage of a story scene, drawn flat: the era behind (its sky, hills and
// skyline), and the characters in front, whoever speaks stepping up.
export function PixelStoryStage({ era, cast, speaker }: { era: number; cast: Speaker[]; speaker: Speaker }) {
  const backdrop = BACKDROPS[Math.min(era, BACKDROPS.length - 1)];
  return (
    <div className="absolute inset-0" style={{ background: backdrop.sky }}>
      <div className="absolute inset-x-[-5%] bottom-[22%] h-[30%] rounded-t-[50%]" style={{ background: backdrop.hills }} />
      <div className="absolute inset-x-0 bottom-[44%] flex justify-around px-[8%] opacity-60" style={{ filter: "saturate(0.6)" }}>
        {backdrop.skyline.map((icon, i) => (
          <PixelIcon key={i} name={icon} size={56} />
        ))}
      </div>
      <div className="absolute inset-x-0 bottom-0 h-[24%]" style={{ background: backdrop.ground }} />
      {/* The characters: whoever speaks steps forward. */}
      <div className="absolute inset-x-0 bottom-[6%] flex items-end justify-center gap-6 md:gap-14">
        {cast.map((who) => {
          const c = CAST[who];
          const speaking = who === speaker;
          return (
            // The step in (story-actor) and the step up (scale) are separate,
            // so one never snaps the other.
            <div key={who} className="story-actor">
              <div className={cn("flex flex-col items-center transition-all duration-300", speaking ? "scale-110 opacity-100" : "scale-90 opacity-60 grayscale-[40%]")}>
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
            </div>
          );
        })}
      </div>
    </div>
  );
}
