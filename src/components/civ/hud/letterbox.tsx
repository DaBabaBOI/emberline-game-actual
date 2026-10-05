"use client";

import { useEffect, useSyncExternalStore } from "react";
import { prefersLessMotion } from "@/lib/graphics";

// ---- Camera shots --------------------------------------------------------------
// A shot takes the camera for a few seconds: the fly-in over the islands when a
// new game starts, and a slow turn round the village (with the era's name) when
// a new era begins. Black bars close in top and bottom while it plays; a click
// or a key skips it. Players who ask for less motion get no shots.

export type ShotKind = "intro" | "era" | "battle";
export interface Shot {
  kind: ShotKind;
  title: string;
  subtitle: string;
  seconds: number;
  // Where to look (a battle: the field where the warriors meet the raiders).
  at?: { x: number; z: number; y?: number };
}

let shot: Shot | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

export function playShot(next: Shot) {
  if (prefersLessMotion()) return;
  shot = next;
  notify();
}

export function currentShot() {
  return shot;
}

export function endShot() {
  if (!shot) return;
  shot = null;
  notify();
}

export function useShot(): Shot | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => shot,
    () => null,
  );
}

// ---- The black bars and the title --------------------------------------------
export function Letterbox() {
  const current = useShot();
  useEffect(() => {
    if (!current) return;
    const onKey = () => endShot();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current]);
  if (!current) return null;
  return (
    <div
      className="pointer-events-auto fixed inset-0 z-[60] cursor-pointer"
      onClick={() => endShot()}
      data-testid="letterbox"
      role="button"
      aria-label="Skip the camera shot"
    >
      <div className="letterbox-bar absolute inset-x-0 top-0 h-[11vh] bg-black" />
      <div className="letterbox-bar absolute inset-x-0 bottom-0 flex h-[11vh] flex-col items-center justify-center bg-black text-white">
        <span className="font-pixel letterbox-title text-xl tracking-[0.25em] md:text-3xl">{current.title}</span>
        <span className="letterbox-title mt-1 text-xs tracking-[0.3em] text-amber-200/80 md:text-sm">{current.subtitle}</span>
      </div>
      <span className="absolute right-3 top-[11vh] mt-2 text-[11px] text-white/70 [text-shadow:0_1px_2px_#000]">Click to skip</span>
    </div>
  );
}
