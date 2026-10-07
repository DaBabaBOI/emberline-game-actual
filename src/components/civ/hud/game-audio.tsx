"use client";

import { useEffect, useRef } from "react";
import { useGame } from "@/components/civ/game-provider";
import { playSfx, setMusicScene, setAudioSettings, useAudioSettings } from "@/lib/audio";
import { getDaylight } from "@/lib/graphics";
import { PixelIcon } from "@/components/civ/pixel-icon";
import { cn } from "@/lib/utils";
import { dayClock } from "./time-of-day";

// How dark it is at time of day t (0 midnight, 0.5 noon), for the music.
function nightAt(t: number) {
  if (getDaylight() === "day") return 0;
  if (t > 0.26 && t < 0.76) return 0;
  if (t < 0.2 || t > 0.82) return 1;
  return t < 0.5 ? (0.26 - t) / 0.06 : (t - 0.76) / 0.06;
}

// Tells the music what is happening (era, night, danger) and plays a sound
// when something happens: a building goes up, an advancement is learned, a new
// era, a raid, a battle, an event card, a tutorial step, the end of a story.
export function GameAudio() {
  const { state } = useGame();
  const tension =
    !!state.raid || !!state.legion || state.rebellion?.stage === "risen" || (!!state.disaster && state.tick >= state.disaster.startTick && state.tick < state.disaster.endTick);
  const era = state.era;

  useEffect(() => {
    const update = () => setMusicScene({ playing: true, era, night: nightAt(dayClock.t), tension });
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [era, tension]);

  // Leaving the game (back to the title) keeps the music going quietly in the Stone Age.
  useEffect(() => () => setMusicScene({ playing: true, era: 0, night: 0, tension: false }), []);

  const built = state.tiles.reduce((n, t) => n + (t.building ? 1 : 0), 0);
  const seen = useRef({
    built,
    researched: state.researched.length,
    era: state.era,
    raid: !!state.raid,
    battle: state.raid?.fightStart ?? state.battle?.start ?? state.battle?.tick ?? null,
    event: state.event?.id ?? null,
    step: state.tutorialStep,
    debrief: !!state.debrief,
  });
  useEffect(() => {
    const was = seen.current;
    const now = {
      built,
      researched: state.researched.length,
      era: state.era,
      raid: !!state.raid,
      battle: state.raid?.fightStart ?? state.battle?.start ?? state.battle?.tick ?? null,
      event: state.event?.id ?? null,
      step: state.tutorialStep,
      debrief: !!state.debrief,
    };
    // One sound at a time, the most important first.
    if (now.debrief && !was.debrief) playSfx(state.debrief?.kind === "loss" ? "lose" : "win");
    else if (now.era > was.era) playSfx("era");
    else if (now.raid && !was.raid) playSfx("raid");
    else if (now.battle !== null && now.battle !== was.battle) playSfx("battle");
    else if (now.event && now.event !== was.event) playSfx("event");
    else if (now.researched > was.researched) playSfx("discover");
    else if (now.step > was.step) playSfx("step");
    else if (now.built > was.built) playSfx("build");
    seen.current = now;
  }, [built, state.researched.length, state.era, state.raid, state.battle, state.event, state.tutorialStep, state.debrief]);

  return null;
}

// The speaker button in the top bar: sound on or off.
export function MuteButton() {
  const audio = useAudioSettings();
  return (
    <button
      type="button"
      onClick={() => setAudioSettings({ muted: !audio.muted })}
      className={cn("flex items-center px-1.5 py-0.5", audio.muted ? "bg-white/10 opacity-60" : "bg-white/10 hover:bg-white/20")}
      aria-label={audio.muted ? "Turn sound on" : "Turn sound off"}
      aria-pressed={!audio.muted}
      title={audio.muted ? "Sound off" : "Sound on"}
      data-testid="mute"
    >
      <PixelIcon name={audio.muted ? "speakerOff" : "speaker"} size={14} />
    </button>
  );
}

// Menu > Sound: music and sound-effect volumes.
export function SoundOptions() {
  const audio = useAudioSettings();
  return (
    <div className="flex flex-col gap-1">
      <span className="font-semibold text-amber-300">Sound</span>
      {(
        [
          ["music", "Music"],
          ["sounds", "Sounds"],
        ] as const
      ).map(([key, label]) => (
        <label key={key} className="flex items-center justify-between gap-3 text-white">
          <span>{label}</span>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(audio[key] * 100)}
            onChange={(e) => setAudioSettings({ [key]: Number(e.target.value) / 100, muted: false })}
            aria-label={`${label} volume`}
            data-testid={`volume-${key}`}
            className="w-32 accent-amber-400"
          />
        </label>
      ))}
      {audio.muted && <span className="text-white/60">Sound is off (the speaker in the top bar).</span>}
    </div>
  );
}
