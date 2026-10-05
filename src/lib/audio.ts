"use client";

import { useSyncExternalStore } from "react";

// Music, ambience and sound effects, all made live with the browser's Web Audio
// (no sound files, no library). Browsers only allow sound after the player has
// clicked or pressed a key, so nothing plays until then (`unlockAudio`).
//
// Music: a slow piece in each era's own scale and instruments, a few chords
// that turn over every two bars, a melody that wanders over them, and (in some
// eras) a soft drum. Quieter and slower at night; tense drums during a raid.
// Ambience: wind, the sea, birds by day and crickets at night.

// ---- Settings (Menu > Sound and Accessibility) ---------------------------------
export interface AudioSettings {
  master: number; // 0–1
  music: number; // 0–1
  sounds: number; // 0–1 (effects and ambience)
  muted: boolean;
}
const KEY = "emberline-audio";
const DEFAULTS: AudioSettings = { master: 1, music: 0.6, sounds: 0.7, muted: false };
let settings: AudioSettings | null = null;
const listeners = new Set<() => void>();

export function getAudioSettings(): AudioSettings {
  if (settings) return settings;
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<AudioSettings>;
    settings = {
      master: typeof saved.master === "number" ? Math.min(1, Math.max(0, saved.master)) : DEFAULTS.master,
      music: typeof saved.music === "number" ? Math.min(1, Math.max(0, saved.music)) : DEFAULTS.music,
      sounds: typeof saved.sounds === "number" ? Math.min(1, Math.max(0, saved.sounds)) : DEFAULTS.sounds,
      muted: Boolean(saved.muted),
    };
  } catch {
    settings = { ...DEFAULTS };
  }
  return settings;
}

export function setAudioSettings(next: Partial<AudioSettings>) {
  settings = { ...getAudioSettings(), ...next };
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // Storage blocked: the choice still holds until the page is closed.
  }
  applyVolumes();
  listeners.forEach((l) => l());
}

export function useAudioSettings(): AudioSettings {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    getAudioSettings,
    () => DEFAULTS,
  );
}

// ---- The sound engine ------------------------------------------------------------
interface Engine {
  ctx: AudioContext;
  master: GainNode;
  music: GainNode;
  sounds: GainNode;
  reverb: ConvolverNode;
  noise: AudioBuffer;
  wind: GainNode;
  sea: GainNode;
}
let engine: Engine | null = null;

// What the music should be playing, set by the game (`setMusicScene`).
export interface MusicScene {
  playing: boolean; // a game is on screen and not paused by a menu
  era: number;
  night: number; // 0 day – 1 night
  tension: boolean; // raid, legion, rebellion or disaster
}
let scene: MusicScene = { playing: false, era: 0, night: 0, tension: false };

function makeNoise(ctx: AudioContext) {
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

// A hall's echo: decaying noise, a little different in each ear.
function makeReverb(ctx: AudioContext) {
  const seconds = 2.8;
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.6);
  }
  const node = ctx.createConvolver();
  node.buffer = buffer;
  return node;
}

function looped(e: Engine, filter: BiquadFilterNode, out: GainNode) {
  const src = e.ctx.createBufferSource();
  src.buffer = e.noise;
  src.loop = true;
  src.connect(filter);
  filter.connect(out);
  src.start();
}

// Called on the first click or key press: browsers block sound before that.
export function unlockAudio() {
  if (typeof window === "undefined") return;
  if (engine) {
    if (engine.ctx.state === "suspended") void engine.ctx.resume();
    return;
  }
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return;
  const ctx = new Ctx();
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -18;
  comp.ratio.value = 3;
  comp.connect(ctx.destination);
  const master = ctx.createGain();
  master.connect(comp);
  const music = ctx.createGain();
  const sounds = ctx.createGain();
  music.connect(master);
  sounds.connect(master);
  const reverb = makeReverb(ctx);
  const wet = ctx.createGain();
  wet.gain.value = 0.35;
  reverb.connect(wet);
  wet.connect(master);
  const e: Engine = { ctx, master, music, sounds, reverb, noise: makeNoise(ctx), wind: ctx.createGain(), sea: ctx.createGain() };
  // Wind: soft noise in a band, swelling and fading.
  const windFilter = ctx.createBiquadFilter();
  windFilter.type = "bandpass";
  windFilter.frequency.value = 420;
  windFilter.Q.value = 0.6;
  e.wind.gain.value = 0;
  e.wind.connect(sounds);
  looped(e, windFilter, e.wind);
  // The sea: low rumbling noise, rising and falling like waves.
  const seaFilter = ctx.createBiquadFilter();
  seaFilter.type = "lowpass";
  seaFilter.frequency.value = 520;
  e.sea.gain.value = 0;
  e.sea.connect(sounds);
  looped(e, seaFilter, e.sea);
  engine = e;
  applyVolumes();
  startScheduler();
  // A hidden tab goes quiet.
  document.addEventListener("visibilitychange", () => {
    if (!engine) return;
    if (document.hidden) void engine.ctx.suspend();
    else void engine.ctx.resume();
  });
}

function applyVolumes() {
  if (!engine) return;
  const s = getAudioSettings();
  const now = engine.ctx.currentTime;
  engine.master.gain.setTargetAtTime(s.muted ? 0 : s.master, now, 0.05);
  engine.music.gain.setTargetAtTime(s.music * 1.1, now, 0.1);
  engine.sounds.gain.setTargetAtTime(s.sounds, now, 0.1);
}

export function setMusicScene(next: MusicScene) {
  scene = next;
}

// ---- Instruments -----------------------------------------------------------------
const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

interface Voice {
  type: OscillatorType;
  attack: number;
  release: number; // how long it rings out
  gain: number;
  vibrato?: number; // Hz of wobble depth
  harmonic?: number; // a quieter octave on top (bell / lute shimmer)
  reverb?: number; // 0–1 sent to the echo
}

function tone(dest: AudioNode, freq: number, at: number, hold: number, v: Voice) {
  if (!engine) return;
  const { ctx } = engine;
  const env = ctx.createGain();
  env.gain.setValueAtTime(0, at);
  env.gain.linearRampToValueAtTime(v.gain, at + v.attack);
  env.gain.setTargetAtTime(0, at + v.attack + hold, v.release / 4);
  env.connect(dest);
  if (v.reverb) {
    const send = ctx.createGain();
    send.gain.value = v.reverb;
    env.connect(send);
    send.connect(engine.reverb);
  }
  const end = at + v.attack + hold + v.release + 0.1;
  const oscs: OscillatorNode[] = [];
  const osc = ctx.createOscillator();
  osc.type = v.type;
  osc.frequency.value = freq;
  osc.connect(env);
  oscs.push(osc);
  if (v.harmonic) {
    const h = ctx.createOscillator();
    const hg = ctx.createGain();
    h.type = "sine";
    h.frequency.value = freq * 2;
    hg.gain.value = v.harmonic;
    h.connect(hg);
    hg.connect(env);
    oscs.push(h);
  }
  if (v.vibrato) {
    const lfo = ctx.createOscillator();
    const depth = ctx.createGain();
    lfo.frequency.value = 5;
    depth.gain.value = v.vibrato;
    lfo.connect(depth);
    depth.connect(osc.frequency);
    oscs.push(lfo);
  }
  for (const o of oscs) {
    o.start(at);
    o.stop(end);
  }
}

// A soft hand drum: a falling thump with a slap of noise.
function drum(dest: AudioNode, at: number, loud: number, low = 1) {
  if (!engine) return;
  const { ctx } = engine;
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.frequency.setValueAtTime(140 * low, at);
  osc.frequency.exponentialRampToValueAtTime(48 * low, at + 0.18);
  env.gain.setValueAtTime(loud, at);
  env.gain.exponentialRampToValueAtTime(0.001, at + 0.35);
  osc.connect(env);
  env.connect(dest);
  osc.start(at);
  osc.stop(at + 0.4);
  const slap = ctx.createBufferSource();
  slap.buffer = engine.noise;
  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = 1800;
  const sg = ctx.createGain();
  sg.gain.setValueAtTime(loud * 0.25, at);
  sg.gain.exponentialRampToValueAtTime(0.001, at + 0.06);
  slap.connect(band);
  band.connect(sg);
  sg.connect(dest);
  slap.start(at, Math.random());
  slap.stop(at + 0.08);
}

// ---- Each era's music --------------------------------------------------------------
interface EraMusic {
  root: number; // MIDI note of the key
  scale: number[];
  chords: number[]; // scale steps the chords are built on, in turn
  bpm: number;
  pad: Voice;
  lead: Voice;
  drums: number[]; // beats (of 8) with a drum, empty for none
}
const PAD: Voice = { type: "triangle", attack: 1.6, release: 2.5, gain: 0.085, reverb: 0.6 };
const ERA_MUSIC: EraMusic[] = [
  // Stone Age: a breathy flute over a low drone, a hand drum.
  { root: 45, scale: [0, 3, 5, 7, 10], chords: [0, 3, 2, 0], bpm: 72, pad: PAD, lead: { type: "sine", attack: 0.08, release: 1.2, gain: 0.126, vibrato: 3, reverb: 0.5 }, drums: [0, 3, 6] },
  // Ancient: a plucked lyre in an old eastern mode, a frame drum.
  { root: 50, scale: [0, 1, 4, 5, 7, 8, 10], chords: [0, 3, 5, 0], bpm: 80, pad: PAD, lead: { type: "triangle", attack: 0.005, release: 1.4, gain: 0.126, harmonic: 0.3, reverb: 0.45 }, drums: [0, 4, 6] },
  // Classical: bright harp-like arpeggios, no drum.
  { root: 48, scale: [0, 2, 3, 5, 7, 9, 10], chords: [0, 3, 4, 0], bpm: 84, pad: PAD, lead: { type: "triangle", attack: 0.004, release: 1.8, gain: 0.117, harmonic: 0.45, reverb: 0.55 }, drums: [] },
  // Medieval: a lute over a drone fifth, a tabor.
  { root: 50, scale: [0, 2, 3, 5, 7, 9, 10], chords: [0, 6, 3, 4], bpm: 88, pad: { ...PAD, type: "sawtooth", gain: 0.04 }, lead: { type: "triangle", attack: 0.004, release: 1.0, gain: 0.126, harmonic: 0.5, reverb: 0.35 }, drums: [0, 2, 4, 6] },
  // Industrial & Modern: a steady piano-like pulse.
  { root: 52, scale: [0, 2, 3, 5, 7, 8, 10], chords: [0, 5, 2, 6], bpm: 96, pad: PAD, lead: { type: "sine", attack: 0.004, release: 1.2, gain: 0.144, harmonic: 0.6, reverb: 0.3 }, drums: [0, 4] },
  // Future & Space: shimmering bells in a floating mode.
  { root: 53, scale: [0, 2, 4, 6, 7, 9, 11], chords: [0, 4, 1, 5], bpm: 70, pad: { ...PAD, gain: 0.1 }, lead: { type: "sine", attack: 0.003, release: 2.4, gain: 0.108, harmonic: 0.8, reverb: 0.7 }, drums: [] },
];

function note(m: EraMusic, step: number, octave = 0) {
  const n = m.scale.length;
  const o = Math.floor(step / n);
  const i = ((step % n) + n) % n;
  return midi(m.root + m.scale[i] + 12 * (o + octave));
}

// ---- The scheduler: plans the next half-second of music, four times a second.
let timer: ReturnType<typeof setInterval> | null = null;
let nextBeat = 0;
let beat = 0;
let melodyStep = 4;
let nextChirp = 0;

function startScheduler() {
  if (timer || !engine) return;
  nextBeat = engine.ctx.currentTime + 0.2;
  timer = setInterval(plan, 250);
}

function plan() {
  if (!engine) return;
  const { ctx } = engine;
  const now = ctx.currentTime;
  const s = scene;
  // Ambience follows the scene even without music.
  const day = 1 - s.night;
  engine.wind.gain.setTargetAtTime(s.playing ? 0.05 + 0.025 * Math.sin(now * 0.13) + (s.tension ? 0.03 : 0) : 0, now, 1.5);
  engine.sea.gain.setTargetAtTime(s.playing ? 0.04 + 0.03 * Math.max(0, Math.sin(now * 0.45)) : 0, now, 0.8);
  if (s.playing && now > nextChirp) {
    if (day > 0.5) birdCall(now + 0.05);
    else crickets(now + 0.05);
    nextChirp = now + (day > 0.5 ? 3 + Math.random() * 6 : 1.5 + Math.random() * 2);
  }
  if (!s.playing) {
    nextBeat = now + 0.2;
    return;
  }
  const m = ERA_MUSIC[s.era] ?? ERA_MUSIC[0];
  // Calmer at night; a raid quickens the beat.
  const bpm = m.bpm * (s.tension ? 1.25 : 1) * (1 - s.night * 0.12);
  const spb = 60 / bpm;
  while (nextBeat < now + 0.5) {
    const at = nextBeat;
    const bar = Math.floor(beat / 8);
    const inBar = beat % 8;
    const chord = m.chords[Math.floor(bar / 2) % m.chords.length];
    // A new chord every two bars: root, third and fifth of the scale, held.
    if (inBar === 0 && bar % 2 === 0) {
      for (const k of [0, 2, 4]) tone(engine.music, note(m, chord + k, -1), at, spb * 15, m.pad);
      tone(engine.music, note(m, chord, -2), at, spb * 15, { ...m.pad, gain: m.pad.gain * 0.9 });
    }
    // The melody: wanders a step or two from where it was, often resting.
    const rest = s.night > 0.6 ? 0.6 : 0.45;
    if (Math.random() > rest && (inBar % 2 === 0 || Math.random() < 0.3)) {
      melodyStep += [-2, -1, -1, 1, 1, 2, 0][Math.floor(Math.random() * 7)];
      melodyStep = Math.max(chord, Math.min(chord + 9, melodyStep));
      tone(engine.music, note(m, melodyStep, 1), at, spb * (inBar % 4 === 0 ? 1.5 : 0.7), m.lead);
    }
    // Drums; a raid adds a heavy beat on every other count.
    if (m.drums.includes(inBar) && s.night < 0.8) drum(engine.music, at, 0.38 * (1 - s.night * 0.5));
    if (s.tension && inBar % 2 === 0) drum(engine.music, at, 0.55, 0.7);
    nextBeat += spb;
    beat++;
  }
}

function birdCall(at: number) {
  if (!engine || getAudioSettings().sounds === 0) return;
  const notes = 2 + Math.floor(Math.random() * 3);
  const base = 2200 + Math.random() * 1400;
  for (let i = 0; i < notes; i++) {
    const t = at + i * (0.09 + Math.random() * 0.05);
    const osc = engine.ctx.createOscillator();
    const env = engine.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(base, t);
    osc.frequency.exponentialRampToValueAtTime(base * (1.2 + Math.random() * 0.4), t + 0.06);
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(0.025, t + 0.01);
    env.gain.exponentialRampToValueAtTime(0.0005, t + 0.08);
    osc.connect(env);
    env.connect(engine.sounds);
    osc.start(t);
    osc.stop(t + 0.1);
  }
}

function crickets(at: number) {
  if (!engine) return;
  for (let i = 0; i < 3; i++) {
    const t = at + i * 0.07;
    const osc = engine.ctx.createOscillator();
    const env = engine.ctx.createGain();
    osc.frequency.value = 4400;
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(0.008, t + 0.005);
    env.gain.linearRampToValueAtTime(0, t + 0.04);
    osc.connect(env);
    env.connect(engine.sounds);
    osc.start(t);
    osc.stop(t + 0.05);
  }
}

// ---- Sound effects --------------------------------------------------------------------
export type Sfx = "build" | "discover" | "era" | "raid" | "battle" | "event" | "click" | "step" | "win" | "lose" | "sell" | "firework" | "ama";

export function playSfx(kind: Sfx) {
  if (!engine) return;
  const { ctx } = engine;
  const at = ctx.currentTime + 0.02;
  const out = engine.sounds;
  switch (kind) {
    case "build":
      // Two knocks of a mallet on wood.
      drum(out, at, 0.5, 1.6);
      drum(out, at + 0.12, 0.35, 1.9);
      break;
    case "sell":
      drum(out, at, 0.3, 1.2);
      tone(out, midi(64), at + 0.05, 0.05, { type: "triangle", attack: 0.003, release: 0.4, gain: 0.06 });
      break;
    case "discover":
      // A rising chime.
      [72, 76, 79, 84].forEach((n, i) => tone(out, midi(n), at + i * 0.09, 0.1, { type: "sine", attack: 0.004, release: 1.2, gain: 0.07, harmonic: 0.5, reverb: 0.6 }));
      break;
    case "step":
      tone(out, midi(79), at, 0.05, { type: "sine", attack: 0.004, release: 0.6, gain: 0.05, harmonic: 0.4, reverb: 0.4 });
      break;
    case "era":
      // A fanfare: a rising fourth and fifth, then the chord.
      [60, 65, 67].forEach((n, i) => tone(out, midi(n), at + i * 0.22, 0.18, { type: "sawtooth", attack: 0.02, release: 0.5, gain: 0.035, reverb: 0.5 }));
      [60, 64, 67, 72].forEach((n) => tone(out, midi(n), at + 0.7, 1.2, { type: "triangle", attack: 0.05, release: 1.6, gain: 0.05, harmonic: 0.3, reverb: 0.7 }));
      drum(out, at + 0.7, 0.5, 0.8);
      break;
    case "raid":
      // A war horn: two long low blasts.
      [0, 0.9].forEach((d) => tone(out, midi(45), at + d, 0.6, { type: "sawtooth", attack: 0.12, release: 0.4, gain: 0.05, vibrato: 2, reverb: 0.5 }));
      break;
    case "battle": {
      // A clash: bright noise and a thud.
      const src = ctx.createBufferSource();
      src.buffer = engine.noise;
      const hp = ctx.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 2500;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.18, at);
      g.gain.exponentialRampToValueAtTime(0.001, at + 0.4);
      src.connect(hp);
      hp.connect(g);
      g.connect(out);
      src.start(at, Math.random());
      src.stop(at + 0.45);
      drum(out, at, 0.6, 0.6);
      break;
    }
    case "event":
      // A soft bell.
      tone(out, midi(67), at, 0.2, { type: "sine", attack: 0.004, release: 2.2, gain: 0.07, harmonic: 0.6, reverb: 0.6 });
      tone(out, midi(74), at + 0.02, 0.2, { type: "sine", attack: 0.004, release: 2.0, gain: 0.035, reverb: 0.6 });
      break;
    case "win":
      [60, 64, 67, 72, 76].forEach((n, i) => tone(out, midi(n), at + i * 0.12, 0.6, { type: "triangle", attack: 0.01, release: 1.8, gain: 0.05, harmonic: 0.4, reverb: 0.7 }));
      break;
    case "lose":
      [57, 53, 50].forEach((n, i) => tone(out, midi(n), at + i * 0.45, 0.5, { type: "triangle", attack: 0.05, release: 1.8, gain: 0.06, reverb: 0.7 }));
      break;
    case "firework": {
      // A crackling pop that rings out.
      const src = ctx.createBufferSource();
      src.buffer = engine.noise;
      const bp = ctx.createBiquadFilter();
      bp.type = "lowpass";
      bp.frequency.value = 1800;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.35, at);
      g.gain.exponentialRampToValueAtTime(0.001, at + 0.9);
      src.connect(bp);
      bp.connect(g);
      g.connect(out);
      const send = ctx.createGain();
      send.gain.value = 0.5;
      g.connect(send);
      send.connect(engine.reverb);
      src.start(at, Math.random());
      src.stop(at + 1);
      drum(out, at, 0.4, 0.5);
      break;
    }
    case "ama":
      // A grumpy "hmph": two low notes sliding down.
      tone(out, midi(52), at, 0.12, { type: "triangle", attack: 0.01, release: 0.2, gain: 0.08 });
      tone(out, midi(47), at + 0.16, 0.18, { type: "triangle", attack: 0.01, release: 0.3, gain: 0.08 });
      break;
    case "click":
      tone(out, midi(84), at, 0.005, { type: "sine", attack: 0.002, release: 0.05, gain: 0.025 });
      break;
  }
}
