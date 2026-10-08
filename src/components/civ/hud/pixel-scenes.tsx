"use client";

import { useEffect, useMemo, useRef } from "react";
import type { DiscoveryScene as Scene, SceneSky } from "@/game/content";
import { WALKS, fxNow, iconsOf, poseNow, scriptFor, type FxKind, type SceneFx, type SceneScript } from "@/game/scenes";
import { CAST, type Speaker } from "@/game/story";
import type { IconId } from "@/game/sprites";
import { PixelIcon } from "@/components/civ/pixel-icon";
import { useHoldWorld } from "@/components/civ/cutscene/active";
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
  // The game's 3D world behind stops drawing meanwhile (as for a 3D scene).
  useHoldWorld();
  // One script for the whole scene (so a re-render never restarts a line).
  const script = useMemo(() => scriptFor(id, scene), [id, scene]);
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

      {/* The scene's script, acted out: people and things moving line by line. */}
      <PixelScript script={script} line={lines - 1} sceneKey={id} sea={scene.bg === "sea"} />
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
  useHoldWorld();
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

// ---- A scene's script, drawn flat ---------------------------------------------------

// People and things are pixel icons placed by percent (left: x, bottom: y) and
// moved every frame from the script (the same timing as the 3D scene); the
// effects are little squares (seeds, sparks, splashes) and puffs (smoke, dust).
const FX_COLOR: Record<FxKind, string> = {
  seeds: "#8a5a2b",
  sparks: "#ffd860",
  smoke: "rgba(220,214,204,0.75)",
  splash: "#8fd0ff",
  glow: "#ffd23f",
  dust: "rgba(205,185,149,0.7)",
  leaves: "#5fae4a",
  stars: "#fff6c0",
  rain: "rgba(184,200,224,0.7)",
};
const FX_POOL = 80;

// Where particle i of an effect is, and how big, at this point in its life (0..1).
function fxSpot(f: SceneFx, i: number, life: number, rand: number, y0: number, time: number): [number, number, number] {
  switch (f.kind) {
    case "seeds":
      return [f.x + (rand - 0.5) * 6, y0 + 14 - life * (14 + y0 - 18), 3];
    case "sparks":
      return [f.x + Math.cos(i * 2.1) * life * 8, y0 + 6 + Math.sin(i * 1.7) * life * 8 + life * 6, 4];
    case "smoke":
      return [f.x + Math.sin(time + i) * 3 * life, y0 + 8 + life * 34, 10 + life * 22];
    case "splash":
      return [f.x + (rand - 0.5) * 10, y0 + Math.sin(life * Math.PI) * 10, 4];
    case "dust":
      return [f.x + (rand - 0.5) * 18 * life, y0 + 2 + life * 8, 10 + life * 16];
    case "leaves":
      return [f.x - 30 + life * 60, y0 + Math.sin(life * 8 + i) * 6 - life * 8, 5];
    case "stars":
      return [f.x + (rand - 0.5) * 80, y0 + Math.cos(i * 3.3) * 14, Math.abs(Math.sin(time * 3 + i)) * 5];
    case "rain":
      return [f.x + (rand - 0.5) * 80, 90 - life * 80, 2];
    default:
      return [f.x, y0, 4];
  }
}

function PixelScript({ script, line, sceneKey, sea }: { script: SceneScript; line: number; sceneKey: string; sea: boolean }) {
  const entries = useMemo(() => Object.entries(script.things), [script]);
  const els = useRef<Record<string, HTMLSpanElement | null>>({});
  const iconEls = useRef<Record<string, HTMLSpanElement | null>>({});
  const fxEls = useRef<(HTMLSpanElement | null)[]>([]);
  const glowEls = useRef<(HTMLSpanElement | null)[]>([]);
  const glowFx = useMemo(() => (script.fx ?? []).filter((f) => f.kind === "glow"), [script]);

  useEffect(() => {
    const begin = performance.now();
    let raf = 0;
    const frame = () => {
      const time = (performance.now() - begin) / 1000;
      const pose = Object.fromEntries(entries.map(([id, t]) => [id, poseNow(t, line, time, script)]));
      // Riders sit on their carrier: its spot plus their offset. At sea, what
      // is further out looks smaller, and what floats bobs on the swell.
      const spot: Record<string, { x: number; y: number; far: number }> = {};
      for (let pass = 0; pass < 3; pass++)
        for (const [id] of entries) {
          const p = pose[id];
          if (spot[id]) continue;
          if (p.on && pose[p.on]) {
            const c = spot[p.on];
            if (c) spot[id] = { x: c.x + p.dx * c.far, y: c.y + p.dy * c.far, far: c.far };
          } else {
            const afloat = sea && p.y > 21 && p.y <= 44;
            const far = afloat ? Math.max(0.6, 1 - (p.y - 21) * 0.016) : 1;
            spot[id] = { x: p.x, y: p.y + (afloat ? Math.sin(time * 1.8 + id.length * 1.7 + id.charCodeAt(0)) * 0.5 : 0), far };
          }
        }
      for (const [id, t] of entries) {
        const el = els.current[id];
        const p = pose[id];
        const at = spot[id];
        if (!el || !at) continue;
        const pop = p.appeared !== null ? Math.min(1, (time - p.appeared) / 0.35) : 1;
        const popScale = pop >= 1 ? 1 : 1 + 2.2 * Math.pow(pop - 1, 3) + 1.2 * Math.pow(pop - 1, 2);
        el.style.display = p.show && p.scale > 0.01 ? "block" : "none";
        el.style.left = `${at.x}%`;
        el.style.bottom = `${at.y}%`;
        const size = p.scale * popScale * at.far;
        el.style.transform = `translateX(-50%) scale(${(p.flip ? -1 : 1) * size}, ${size}) rotate(${p.spin ? -time * 280 : 0}deg)`;
        // People and animals step as they go (and people at work bob).
        el.classList.toggle("scene-bob-loop", !!p.work || (p.moving && (!!t.person || WALKS.includes(p.icon ?? t.icon!))));
        // People: sitting or standing; things: their icon now.
        const want = t.person ? (t.person === "elder" ? (p.sit ? "elder-sit" : "elder") : t.person === "robot" ? "robot" : p.sit ? "person-sit" : "person") : (p.icon ?? t.icon);
        for (const icon of t.person ? ["person", "person-sit", "elder", "elder-sit", "robot"] : iconsOf(t)) {
          const ie = iconEls.current[`${id}:${icon}`];
          if (ie) ie.style.display = icon === want ? "block" : "none";
        }
      }
      // Effects.
      let n = 0;
      (script.fx ?? []).forEach((f, fi) => {
        const k = fxNow(f, line, time);
        if (k === null || f.kind === "glow") return;
        const age = k * (f.secs ?? 1.5);
        for (let i = 0; i < 10 && n < FX_POOL; i++) {
          const el = fxEls.current[n++];
          if (!el) continue;
          const r = Math.sin(fi * 31 + i * 12.9898) * 43758.5453;
          const rand = r - Math.floor(r);
          const life = (age * 1.4 + i / 10) % 1;
          const y0 = f.y ?? 18;
          const [x, y, size] = fxSpot(f, i, life, rand, y0, time);
          el.style.display = "block";
          el.style.left = `${x}%`;
          el.style.bottom = `${y}%`;
          el.style.width = el.style.height = `${size}px`;
          el.style.background = FX_COLOR[f.kind];
          el.style.borderRadius = f.kind === "smoke" || f.kind === "dust" ? "50%" : "0";
          el.style.opacity = f.kind === "smoke" || f.kind === "dust" ? String(1 - life) : "1";
        }
      });
      for (let i = n; i < FX_POOL; i++) if (fxEls.current[i]) fxEls.current[i]!.style.display = "none";
      glowFx.forEach((f, i) => {
        const el = glowEls.current[i];
        if (el) el.style.display = line > f.line || (line === f.line && time >= (f.delay ?? 0)) ? "block" : "none";
      });
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [entries, line, script, glowFx, sceneKey, sea]);

  return (
    <>
      {glowFx.map((f, i) => (
        <span
          key={`glow${i}`}
          ref={(el) => void (glowEls.current[i] = el)}
          className="scene-rays pointer-events-none absolute h-28 w-28 -translate-x-1/2 rounded-full"
          style={{ left: `${f.x}%`, bottom: `${(f.y ?? 18) - 6}%`, display: "none" }}
        />
      ))}
      {entries.map(([id, t]) => (
        <span key={`${sceneKey}-${id}`} ref={(el) => void (els.current[id] = el)} className="absolute block origin-bottom" style={{ display: "none" }}>
          {(t.person ? ["person", "person-sit", "elder", "elder-sit", "robot"] : iconsOf(t)).map((icon) => (
            <span key={icon} ref={(el) => void (iconEls.current[`${id}:${icon}`] = el)} className="block" style={{ display: "none" }}>
              <PixelIcon name={icon as IconId} size={t.person ? (t.person === "child" ? 40 : 56) : (t.size ?? 40)} />
            </span>
          ))}
        </span>
      ))}
      {Array.from({ length: FX_POOL }, (_, i) => (
        <span key={`fx${i}`} ref={(el) => void (fxEls.current[i] = el)} className="pointer-events-none absolute block -translate-x-1/2" style={{ display: "none" }} />
      ))}
    </>
  );
}
