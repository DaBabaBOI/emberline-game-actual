import { useSyncExternalStore } from "react";

// Leader mode: where the chief stands and looks (moved every frame by the
// first-person rig, so kept out of React), and the few things the HUD shows:
// which view is on, what the chief could do right now, and the job menu.

export const leader = { x: 0, z: 0, y: 0, yaw: 0, pitch: -0.08, ready: false, moving: false, strikeAt: 0 };

export type LeaderView = "fp" | "map";
export type LeaderPrompt = { kind: "talk"; index: number; name: string } | { kind: "fight" } | null;

type Snapshot = { view: LeaderView; prompt: LeaderPrompt; menu: { index: number; name: string } | null; locked: boolean };
let snap: Snapshot = { view: "fp", prompt: null, menu: null, locked: false };
const listeners = new Set<() => void>();

function set(next: Partial<Snapshot>) {
  const merged = { ...snap, ...next };
  if (merged.view === snap.view && merged.menu === snap.menu && merged.locked === snap.locked && JSON.stringify(merged.prompt) === JSON.stringify(snap.prompt)) return;
  snap = merged;
  for (const l of listeners) l();
}

export const setLeaderView = (view: LeaderView) => set({ view, menu: null });
export const setLeaderPrompt = (prompt: LeaderPrompt) => set({ prompt });
export const setLeaderMenu = (menu: Snapshot["menu"]) => set({ menu });
export const setLeaderLocked = (locked: boolean) => set({ locked });
export const leaderSnapshot = () => snap;

export function useLeader() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => void listeners.delete(l);
    },
    () => snap,
    () => snap,
  );
}

// A villager's name, the same each time for the same figure.
const NAMES = ["Ayo", "Mira", "Tobi", "Sana", "Rafi", "Noor", "Eli", "Kaya", "Juno", "Oren", "Lumi", "Taro", "Ines", "Bodi", "Zara", "Pell"];
export const villagerName = (index: number) => NAMES[index % NAMES.length] + (index >= NAMES.length ? ` ${Math.floor(index / NAMES.length) + 1}` : "");
