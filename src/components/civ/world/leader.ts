import { useSyncExternalStore } from "react";

// Leader mode: where the chief stands and looks (moved every frame by the
// first-person rig, so kept out of React), and the few things the HUD shows:
// which view is on, what the chief could do right now, and the job menu.

// `hop`/`vy`: how high a jump has taken them, and how fast they're rising.
// `actAt`: when they last swung at something (the view dips with the swing).
// `walked`: they've walked in first person this game (in the base game the
// chief only stands on the map once they have).
export const leader = { x: 0, z: 0, y: 0, yaw: 0, pitch: -0.08, ready: false, moving: false, strikeAt: 0, hop: 0, vy: 0, actAt: 0, walked: false };

export type LeaderView = "fp" | "map";

// Touch screens: the on-screen stick (-1..1 each way: `ahead` forward, `side`
// to the right), and what the buttons do (filled in by the rig).
export const leaderStick = { ahead: 0, side: 0 };
export const leaderButtons: { act: () => void; use: () => void; plant: () => void; jump: () => void } = {
  act: () => {},
  use: () => {},
  plant: () => {},
  jump: () => {},
};
// What the chief could do right now, by what's in front of them: talk to a
// villager, strike a raider, step into a building (or relight a cold fire),
// chop wood or break stone, plant a tree, or (a building picked from the
// hotbar) build it where they're looking.
export type LeaderPrompt =
  | { kind: "talk"; index: number; name: string }
  | { kind: "fight" }
  | { kind: "building"; tile: number }
  | { kind: "gather"; tile: number; what: "wood" | "stone" }
  | { kind: "plant"; tile: number }
  | { kind: "build"; tile: number }
  | null;

type Snapshot = { view: LeaderView; prompt: LeaderPrompt; menu: { index: number; name: string } | null; locked: boolean; build: string | null };
let snap: Snapshot = { view: "map", prompt: null, menu: null, locked: false, build: null };
const listeners = new Set<() => void>();

function set(next: Partial<Snapshot>) {
  const merged = { ...snap, ...next };
  if (
    merged.view === snap.view &&
    merged.menu === snap.menu &&
    merged.locked === snap.locked &&
    merged.build === snap.build &&
    JSON.stringify(merged.prompt) === JSON.stringify(snap.prompt)
  )
    return;
  snap = merged;
  for (const l of listeners) l();
}

export const setLeaderView = (view: LeaderView) => set({ view, menu: null });
// A game begins (or is loaded): the chief is placed afresh on its island, in
// first person for Leader mode, on the map otherwise.
export function resetLeader(view: LeaderView) {
  Object.assign(leader, { ready: false, walked: view === "fp", hop: 0, vy: 0 });
  set({ view, menu: null, prompt: null, build: null });
}
export const setLeaderPrompt = (prompt: LeaderPrompt) => set({ prompt });
export const setLeaderMenu = (menu: Snapshot["menu"]) => set({ menu });
export const setLeaderLocked = (locked: boolean) => set({ locked });
// The building picked from the hotbar to build (null: hands free).
export const setLeaderBuild = (build: string | null) => set({ build });
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
