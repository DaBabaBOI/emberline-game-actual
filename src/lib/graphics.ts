"use client";

import { useSyncExternalStore } from "react";

// Graphics quality, set in the game's Menu. "fancy" adds the film look (bloom,
// soft shadows in corners, colour grading), firelight at night and sharper
// shadows; "fast" leaves those out so phones and older laptops stay smooth.
// Its own storage key: the project page rewrites the accessibility settings
// and would drop a key it doesn't know.
export type Graphics = "fancy" | "fast";

const KEY = "emberline-graphics";
let current: Graphics | null = null;
const listeners = new Set<() => void>();

// Phones and tablets start on "fast"; everything else on "fancy".
function guess(): Graphics {
  try {
    const touch = window.matchMedia("(pointer: coarse)").matches;
    const small = Math.min(window.screen.width, window.screen.height) < 820;
    return touch && small ? "fast" : "fancy";
  } catch {
    return "fancy";
  }
}

export function getGraphics(): Graphics {
  if (current) return current;
  try {
    const saved = localStorage.getItem(KEY);
    current = saved === "fast" || saved === "fancy" ? saved : guess();
  } catch {
    current = guess();
  }
  return current;
}

export function setGraphics(next: Graphics) {
  current = next;
  try {
    localStorage.setItem(KEY, next);
  } catch {
    // Storage blocked: the choice still holds until the page is closed.
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useGraphics(): Graphics {
  return useSyncExternalStore(subscribe, getGraphics, () => "fancy");
}

// Day and night: "cycle" lets the sun rise and set; "day" keeps it always day.
export type Daylight = "cycle" | "day";
const DAY_KEY = "emberline-daylight";
let daylight: Daylight | null = null;

export function getDaylight(): Daylight {
  if (daylight) return daylight;
  try {
    daylight = localStorage.getItem(DAY_KEY) === "day" ? "day" : "cycle";
  } catch {
    daylight = "cycle";
  }
  return daylight;
}

export function setDaylight(next: Daylight) {
  daylight = next;
  try {
    localStorage.setItem(DAY_KEY, next);
  } catch {
    // Storage blocked: the choice still holds until the page is closed.
  }
  listeners.forEach((l) => l());
}

export function useDaylight(): Daylight {
  return useSyncExternalStore(subscribe, getDaylight, () => "cycle");
}

// Cutscenes: "3d" films them on little islands built like the game; "pixel"
// draws them flat in pixel art, the way they first were.
export type CutsceneStyle = "3d" | "pixel";
const SCENE_KEY = "emberline-cutscenes";
let sceneStyle: CutsceneStyle | null = null;

export function getCutsceneStyle(): CutsceneStyle {
  if (sceneStyle) return sceneStyle;
  try {
    sceneStyle = localStorage.getItem(SCENE_KEY) === "pixel" ? "pixel" : "3d";
  } catch {
    sceneStyle = "3d";
  }
  return sceneStyle;
}

export function setCutsceneStyle(next: CutsceneStyle) {
  sceneStyle = next;
  try {
    localStorage.setItem(SCENE_KEY, next);
  } catch {
    // Storage blocked: the choice still holds until the page is closed.
  }
  listeners.forEach((l) => l());
}

export function useCutsceneStyle(): CutsceneStyle {
  return useSyncExternalStore(subscribe, getCutsceneStyle, () => "3d");
}

// Players who ask their device for less motion get no camera fly-bys or shakes.
export function prefersLessMotion() {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}
