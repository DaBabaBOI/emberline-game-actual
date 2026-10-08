// Discovery scenes, acted out. Each scene is a little play in four lines: the
// people and things on stage, where each one is on each line, and what
// happens (seeds falling, sparks, smoke, a splash). Both kinds of cutscene
// (3D and pixel art) play the same script, so a scene means the same in both.
//
// Where things are: `x` 0-100 across the stage (left to right), `y` up from
// the ground at 18 (a thing in the air is higher). At sea, the shore is at 18
// and higher means further out on the water (from 22 on, it floats). Sizes are
// in pixels against 56 for a person.

import type { DiscoveryScene } from "./content";
import type { IconId } from "./sprites";

export type SceneLook = "villager" | "elder" | "child" | "robot";
export type SceneWork = "hoe" | "axe" | "pick" | "hammer" | "shovel" | "book" | "carry" | "pray";

// One step of a thing's part in a line. Unset fields keep what they were.
export interface Pose {
  x?: number;
  y?: number;
  show?: boolean;
  // Looks like this from now on (logs become a raft, clay becomes a jar).
  icon?: IconId;
  // 0-1: how grown it is (0 = not yet out of the ground).
  scale?: number;
  sit?: boolean;
  work?: SceneWork | null;
  // Riding on (or carried by) another thing: it moves with it, `dx` across
  // and `dy` up from it. null gets off.
  on?: string | null;
  dx?: number;
  dy?: number;
  // Which way a person looks: the x they face.
  face?: number;
  flip?: boolean;
  spin?: boolean;
  // Wait this long (s) before the step, and take this long (s) over it.
  delay?: number;
  secs?: number;
}

export interface SceneThing {
  // A person (a figure in 3D, a pixel person) or a thing (a pixel icon).
  person?: SceneLook;
  icon?: IconId;
  size?: number;
  // Its part, line by line: one step, or several in turn.
  beats: Record<number, Pose | Pose[]>;
}

export type FxKind = "seeds" | "sparks" | "smoke" | "splash" | "glow" | "dust" | "leaves" | "stars" | "rain";
export interface SceneFx {
  kind: FxKind;
  x: number;
  y?: number;
  line: number;
  // Seconds into the line it starts, and how long it lasts.
  delay?: number;
  secs?: number;
}

export interface SceneScript {
  things: Record<string, SceneThing>;
  fx?: SceneFx[];
}

// Where a thing stands, and how, once all its steps up to a point are done.
export interface Settled {
  x: number;
  y: number;
  show: boolean;
  icon?: IconId;
  scale: number;
  sit: boolean;
  work: SceneWork | null;
  on: string | null;
  dx: number;
  dy: number;
  face?: number;
  flip: boolean;
  spin: boolean;
}

const steps = (b: Pose | Pose[] | undefined) => (b === undefined ? [] : Array.isArray(b) ? b : [b]);

export function applyPose(s: Settled, p: Pose): Settled {
  return {
    x: p.x ?? s.x,
    y: p.y ?? s.y,
    show: p.show ?? s.show,
    icon: p.icon ?? s.icon,
    scale: p.scale ?? s.scale,
    sit: p.sit ?? s.sit,
    work: p.work === undefined ? s.work : p.work,
    on: p.on === undefined ? s.on : p.on,
    dx: p.dx ?? (p.on === null ? 0 : s.dx),
    dy: p.dy ?? (p.on === null ? 0 : s.dy),
    face: p.face ?? s.face,
    flip: p.flip ?? s.flip,
    spin: p.spin ?? s.spin,
  };
}

// The first line a thing is on stage.
export function firstLine(t: SceneThing) {
  return Math.min(...Object.keys(t.beats).map(Number));
}

// How a thing stands at the start of `line` (all earlier lines played out).
export function settledBefore(t: SceneThing, line: number, script?: SceneScript, depth = 0): Settled {
  let s: Settled = { x: 50, y: 18, show: false, icon: t.icon, scale: 1, sit: false, work: null, on: null, dx: 0, dy: 0, flip: false, spin: false };
  for (let l = firstLine(t); l < line; l++) s = play(t, l, Infinity, s, script, depth);
  return s;
}

// The steps a thing takes during `line` (its first line starts it on stage).
export function stepsOn(t: SceneThing, line: number): Pose[] {
  const list = steps(t.beats[line]);
  // Its first step puts it in place at once (shown, unless the step says not yet).
  if (line === firstLine(t) && list.length) return [{ ...list[0], show: list[0].show ?? true, secs: list[0].secs ?? 0 }, ...list.slice(1)];
  return list;
}

// ---- A scene with no script of its own -------------------------------------------

// The old way of laying out a scene (people in a row, things that appear and
// go, what they found), made into a script: the people walk up to it, things
// grow, sail in or are struck into being as befits them.
const GROWS: IconId[] = ["wheat", "sprout", "sapling", "herb", "leaf"];
const SAILS: IconId[] = ["boat", "raft", "cleaner", "anchor"];
const STRUCK: IconId[] = ["flint", "hammer", "pickaxe", "sword", "spear", "shield", "axe", "plough", "coin", "aetherite", "mineralx", "ore", "jade"];
// Come in on their own legs (or wheels, or tracks) from the far side.
export const WALKS: IconId[] = ["sheep", "horse", "mammoth", "rat", "robot", "tank", "train"];
// Ideas and blessings: they come down out of the sky, in light.
const DESCENDS: IconId[] = ["bulb", "scroll", "book", "smile", "scales", "star", "drop", "dove", "crown", "feather"];

export function autoScript(scene: DiscoveryScene): SceneScript {
  const things: Record<string, SceneThing> = {};
  const sea = scene.bg === "sea";
  const itemFrom = scene.itemFrom ?? 1;
  const itemX = scene.itemX ?? 74;
  scene.actors.forEach((icon, i) => {
    const slot = 12 + i * 8;
    const sit = icon.endsWith("-sit");
    const look: SceneLook = icon.startsWith("elder") ? "elder" : "villager";
    if (icon !== "person" && icon !== "elder" && !sit) {
      things[`actor${i}`] = { icon, size: 44, beats: { 0: { x: slot } } };
      return;
    }
    things[`actor${i}`] = {
      person: look,
      beats: sit
        ? { 0: { x: slot, sit: true, face: itemX } }
        : {
            0: [
              { x: -12 - i * 6, secs: 0, face: itemX },
              { x: slot, secs: 1.6 + i * 0.25 },
            ],
            // When it appears, the nearest one steps up to it.
            ...(i === 0 ? { [itemFrom]: { x: Math.max(slot, itemX - 14), secs: 1.4, face: itemX } } : {}),
          },
    };
  });
  (scene.props ?? []).forEach((p, i) => {
    const from = p.from ?? 0;
    const beats: Record<number, Pose | Pose[]> = {
      [from]: GROWS.includes(p.icon) ? [{ x: p.x, y: p.y ?? 18, scale: 0 }, { scale: 1, secs: 1.2, delay: 0.3 }] : { x: p.x, y: p.y ?? 18 },
    };
    if (p.until !== undefined) beats[p.until] = { show: false };
    things[`prop${i}`] = { icon: p.icon, size: p.size ?? 40, beats };
  });
  const fx: SceneFx[] = [{ kind: "glow", x: itemX, line: itemFrom }];
  const y = scene.bg === "cave" ? 38 : sea && SAILS.includes(scene.item) ? 26 : 18;
  let item: Pose[];
  if (sea && SAILS.includes(scene.item)) item = [{ x: 104, y: 34, secs: 0 }, { x: itemX, y, secs: 2.2 }];
  else if (WALKS.includes(scene.item)) {
    item = [{ x: 112, y }, { x: itemX, secs: 2.4 }];
    fx.push({ kind: "dust", x: itemX, line: itemFrom, delay: 1.8, secs: 0.8 });
  } else if (scene.item === "bird") item = [{ x: 112, y: 60 }, { x: itemX, y, secs: 2 }];
  else if (DESCENDS.includes(scene.item)) {
    item = [{ x: itemX, y: y + 30, scale: 0.4 }, { y: y + 6, scale: 1, secs: 1.8, delay: 0.3 }];
    fx.push({ kind: "stars", x: itemX, y: y + 10, line: itemFrom, secs: 2.2 });
  } else if (GROWS.includes(scene.item)) {
    item = [{ x: itemX, y, scale: 0 }, { scale: 1, secs: 1.4, delay: 0.8 }];
    fx.push({ kind: "seeds", x: itemX, line: itemFrom, secs: 1 });
  } else if (STRUCK.includes(scene.item)) {
    item = [{ x: itemX, y, scale: 0 }, { scale: 1, secs: 0.5, delay: 0.7 }];
    fx.push({ kind: "sparks", x: itemX, line: itemFrom, secs: 0.9 });
  } else {
    // Built: it rises out of the ground in a cloud of dust.
    item = [{ x: itemX, y, scale: 0 }, { scale: 1, secs: 1.6, delay: 0.4 }];
    fx.push({ kind: "dust", x: itemX, line: itemFrom, secs: 1.6 });
  }
  things.item = { icon: scene.item, size: 80, beats: { [itemFrom]: item } };
  return { things, fx };
}

// ---- Scenes with a script of their own -------------------------------------------

const P = (person: SceneLook, beats: SceneThing["beats"]): SceneThing => ({ person, beats });
const T = (icon: IconId, size: number, beats: SceneThing["beats"]): SceneThing => ({ icon, size, beats });
// Grows out of the ground at x (after `delay` s).
const grow = (x: number, delay = 0, secs = 1.2, y = 18): Pose[] => [{ x, y, scale: 0 }, { scale: 1, delay, secs }];
// Walks in from off the left (or right) edge to x.
const walkIn = (x: number, secs = 1.8, from = -10, extra: Pose = {}): Pose[] => [{ x: from, secs: 0 }, { x, secs, ...extra }];

export const SCENE_SCRIPTS: Record<string, SceneScript> = {
  healed: {
    things: {
      bed: T("bed-sick", 110, { 0: { x: 56, y: 14 }, 3: { icon: "bed-empty" } }),
      carer: P("villager", { 0: walkIn(36), 1: { x: 44, face: 56 }, 3: { x: 30, face: 70 } }),
      herb: T("herb", 30, { 1: [{ x: 47, y: 22, show: false }, { show: true, delay: 1 }] }),
      water: T("drop", 26, { 1: [{ x: 51, y: 22, show: false }, { show: true, delay: 1.4 }] }),
      her: P("villager", { 3: [{ x: 60, secs: 0, face: 90 }, { x: 86, delay: 0.6, secs: 2.6 }] }),
    },
    fx: [{ kind: "glow", x: 56, line: 2 }],
  },
  storytelling: {
    things: {
      fire: T("campfire", 48, { 0: { x: 40 } }),
      elder: P("elder", { 0: { x: 30, sit: true, face: 40 } }),
      kid1: P("child", { 1: [{ x: -8, secs: 0 }, { x: 50, secs: 1.8 }, { sit: true, face: 40 }] }),
      kid2: P("child", { 1: [{ x: -16, secs: 0 }, { x: 57, secs: 2.2 }, { sit: true, face: 40 }] }),
      idea: T("bulb", 44, { 2: grow(44, 0.4, 1, 38) }),
      grown: P("villager", { 3: [{ x: 110, secs: 0 }, { x: 64, secs: 2 }, { sit: true, face: 40 }] }),
    },
    fx: [
      { kind: "sparks", x: 40, y: 22, line: 0, secs: 2.5 },
      { kind: "glow", x: 44, line: 2 },
    ],
  },
  toolmaking: {
    things: {
      rock: T("rock", 48, { 0: { x: 40 } }),
      maker: P("villager", { 0: { x: 32, work: "hammer", face: 40 }, 1: { x: 50, work: "hammer", face: 58 }, 2: { work: null } }),
      flint: T("flint", 40, { 0: grow(46, 1.2, 0.4), 1: { x: 54, y: 20 } }),
      hide: T("hide", 40, { 1: { x: 58 } }),
      log: T("log", 40, { 1: { x: 66 } }),
      hunter: P("villager", { 2: [{ x: -10, secs: 0 }, { x: 110, secs: 4.2 }] }),
      hunter2: P("villager", { 2: [{ x: -18, secs: 0 }, { x: 104, secs: 4.6 }] }),
    },
    fx: [
      { kind: "sparks", x: 42, y: 20, line: 0, secs: 1.6 },
      { kind: "glow", x: 54, line: 3 },
    ],
  },
  firekeeping: {
    things: {
      logs: T("log", 44, { 0: { x: 26, y: 16 }, 3: { scale: 0.55, secs: 1 } }),
      fire: T("campfire", 56, { 0: { x: 44 }, 1: { scale: 0.45, secs: 1.6 }, 2: { scale: 1, secs: 0.8, delay: 0.6 } }),
      elder: P("elder", { 0: { x: 58, sit: true, face: 44 }, 1: [{ x: 50, sit: false, secs: 0.8 }, { work: "shovel" }], 2: [{ work: null }, { x: 58, sit: true, delay: 1 }] }),
    },
    fx: [
      { kind: "smoke", x: 44, line: 1, delay: 1, secs: 3 },
      { kind: "sparks", x: 44, y: 21, line: 2, delay: 0.6, secs: 1.4 },
    ],
  },
  fishing: {
    things: {
      // Logs drift in with a bird riding one; two men pull them ashore and tie
      // them into a raft, sit on it and push off; out on the water a fish is
      // caught, and the raft drifts out to sea with its catch.
      log1: T("log", 44, { 0: [{ x: 98, y: 30, secs: 0 }, { x: 58, y: 30, secs: 2.6 }], 1: [{ x: 44, y: 20, secs: 1.4 }, { show: false, delay: 0.8 }] }),
      log2: T("log", 44, { 0: [{ x: 108, y: 32, secs: 0 }, { x: 66, y: 32, secs: 2.8 }], 1: [{ x: 46, y: 21, secs: 1.6 }, { show: false, delay: 0.6 }] }),
      bird: T("bird", 30, { 0: { on: "log1", dx: 0, dy: 8 }, 1: [{ on: null, x: 70, y: 60, secs: 1 }, { x: 120, y: 80, secs: 1.6 }] }),
      raft: T("raft", 112, { 1: [{ x: 45, y: 20, show: false }, { show: true, delay: 2.2 }], 2: { x: 60, y: 30, secs: 3 }, 3: { x: 84, y: 40, secs: 3.4 } }),
      man1: P("villager", {
        0: { x: 20, face: 60 },
        1: [{ x: 38, secs: 1.2, face: 45, work: "hammer" }, { work: null, delay: 1 }, { on: "raft", dx: -5, dy: 15, sit: true, secs: 0.5 }],
        2: { work: "hoe", delay: 0.6 },
        3: { work: null },
      }),
      man2: P("villager", { 0: { x: 28, face: 60 }, 1: [{ x: 52, secs: 1.4, face: 45, work: "hammer" }, { work: null, delay: 0.8 }, { on: "raft", dx: 5, dy: 15, sit: true, secs: 0.5 }] }),
      fish: T("fish", 30, { 2: [{ x: 66, y: 31, show: false }, { show: true, delay: 2 }, { on: "raft", dx: 0, dy: 6, delay: 0.5, secs: 0.3 }] }),
    },
    fx: [
      { kind: "splash", x: 56, y: 22, line: 1, delay: 0.4, secs: 1 },
      { kind: "dust", x: 45, y: 20, line: 1, delay: 1.8, secs: 0.8 },
      { kind: "splash", x: 66, y: 31, line: 2, delay: 1.9, secs: 1.2 },
    ],
  },
  "early-farming": {
    things: {
      wild: T("sprout", 40, { 0: grow(36, 0.6) }),
      elder: P("elder", { 0: { x: 26, face: 36 }, 3: { x: 44, secs: 1.6, face: 70 } }),
      farmer: P("villager", { 0: walkIn(46, 1.6), 1: [{ x: 54, secs: 0.8 }, { work: "hoe" }], 2: [{ x: 70, secs: 1.2, work: null }, { work: "hoe" }], 3: { work: null } }),
      s1: T("sprout", 36, { 1: grow(58, 1.6) , 2: { icon: "wheat", scale: 1.2, secs: 1 } }),
      s2: T("sprout", 36, { 1: grow(64, 2) , 2: { icon: "wheat", scale: 1.2, secs: 1 } }),
      s3: T("wheat", 40, { 2: grow(74, 1.6) }),
      s4: T("wheat", 40, { 2: grow(80, 2) }),
      s5: T("wheat", 40, { 3: grow(88, 0.3) }),
    },
    fx: [
      { kind: "seeds", x: 60, y: 24, line: 1, delay: 0.8, secs: 1.4 },
      { kind: "seeds", x: 76, y: 24, line: 2, delay: 1, secs: 1.2 },
    ],
  },
  agriculture: {
    things: {
      w1: T("wheat", 44, { 0: { x: 16 } }),
      w2: T("wheat", 44, { 0: { x: 24 } }),
      carrier: P("villager", { 0: [{ x: 22, secs: 0, work: "carry" }, { x: 48, secs: 2.4 }], 1: { work: null, face: 90 }, 2: { x: 56, work: "hammer", face: 64 }, 3: { work: null, sit: true, face: 64 } }),
      herd: T("sheep", 44, { 0: { x: 84 }, 1: { x: 112, secs: 3 } }),
      herd2: T("sheep", 40, { 0: { x: 92 }, 1: { x: 122, secs: 3.2 } }),
      elder: P("elder", { 1: walkIn(40), 3: { sit: true, face: 64 } }),
      hut: T("hut", 80, { 2: grow(66, 0.6, 2) }),
    },
    fx: [{ kind: "dust", x: 66, line: 2, delay: 0.4, secs: 2 }],
  },
  spears: {
    things: {
      flint: T("flint", 34, { 0: { x: 42 }, 1: { show: false } }),
      stick: T("log", 34, { 0: { x: 50 }, 1: { show: false } }),
      maker: P("villager", { 0: { x: 34, work: "hammer", face: 46 }, 1: [{ work: null }, { x: 46, secs: 1 }], 2: { x: 66, secs: 1.6 }, 3: { x: 40, secs: 2 } }),
      spear: T("spear", 40, { 1: [{ x: 46, y: 18, show: false }, { show: true }, { on: "maker", dx: 3, dy: 6, delay: 1 }] }),
      herd: T("mammoth", 64, { 1: { x: 92 }, 2: { x: 112, secs: 2.6, delay: 0.6 } }),
      meat: T("meat", 30, { 3: { on: "maker", dx: -3, dy: 8 } }),
    },
    fx: [{ kind: "dust", x: 92, line: 2, delay: 0.6, secs: 2 }],
  },
  herbalism: {
    things: {
      bed: T("bed-sick", 100, { 0: { x: 54, y: 14 }, 1: { icon: "bed-empty" } }),
      healer: P("elder", { 0: [{ x: 18, secs: 0 }, { x: 42, secs: 1.6, face: 54 }], 2: { x: 66, secs: 1.4, work: "hoe" }, 3: { work: null } }),
      leaf: T("herb", 30, { 0: [{ on: "healer", dx: 3, dy: 8 }, { on: null, x: 50, y: 22, delay: 1.8 }], 1: { show: false } }),
      woman: P("villager", { 1: [{ x: 58, secs: 0, show: false }, { show: true, delay: 0.8 }, { x: 34, secs: 1.6, face: 54 }] }),
      p1: T("herb", 34, { 2: grow(72, 0.8) }),
      p2: T("herb", 34, { 2: grow(80, 1.2) }),
      p3: T("leaf", 30, { 3: grow(88, 0.3) }),
    },
    fx: [{ kind: "glow", x: 54, line: 1 }],
  },
  herding: {
    things: {
      child: P("child", { 0: [{ x: 60, secs: 0 }, { x: 20, secs: 3, face: 0 }], 2: { x: 64, secs: 3, face: 100 } }),
      lamb: T("sheep", 28, { 0: [{ x: 74, secs: 0 }, { x: 30, secs: 3.4 }], 1: { scale: 1.5, secs: 1.6 }, 2: { x: 54, secs: 3 } }),
      g1: T("sheep", 40, { 1: [{ x: 110, secs: 0 }, { x: 46, secs: 2.6, delay: 0.6 }], 2: { x: 72, secs: 3 } }),
      g2: T("sheep", 40, { 1: [{ x: 118, secs: 0 }, { x: 56, secs: 2.8, delay: 0.8 }], 2: { x: 80, secs: 3 } }),
      adult: P("villager", { 2: walkIn(48, 3) }),
    },
  },
  "hide-clothing": {
    things: {
      fire: T("campfire", 48, { 0: { x: 74 }, 2: { scale: 0, secs: 2.4 } }),
      hide1: T("hide", 38, { 0: { x: 42 }, 1: [{ x: 48, secs: 1.2 }, { show: false }] }),
      hide2: T("hide", 38, { 0: { x: 54 }, 1: [{ x: 48, secs: 1.2 }, { show: false }] }),
      tunic: T("tunic", 44, { 1: [{ x: 48, y: 18, show: false }, { show: true, delay: 1.3 }, { on: "maker", dx: 0, dy: 10, delay: 0.8 }] }),
      maker: P("villager", { 0: { x: 34, sit: true, work: "book", face: 48 }, 1: [{ work: null }, { sit: false, delay: 1.8 }], 2: { x: 30, secs: 1.4, face: 100 } }),
    },
    fx: [
      { kind: "leaves", x: 50, y: 40, line: 1, secs: 3 },
      { kind: "smoke", x: 74, line: 2, secs: 2.4 },
    ],
  },
  "cave-paintings": {
    things: {
      torch: T("torch", 34, { 0: { x: 30, y: 26 } }),
      painter: P("villager", { 0: { x: 42, work: "hammer", face: 56 }, 2: { work: null, x: 36, face: 56 } }),
      hand: T("hand", 30, { 0: grow(50, 1.6, 0.5, 30) }),
      mammoth: T("mammoth", 80, { 1: grow(58, 0.2, 2.6, 34) }),
      kid: P("child", { 2: [{ x: -8, secs: 0 }, { x: 46, secs: 1.8 }, { sit: true, face: 58 }] }),
      deer: T("sheep", 48, { 3: grow(76, 0.4, 2, 36) }),
    },
    fx: [{ kind: "glow", x: 58, line: 1, delay: 1.2 }],
  },
  writing: {
    things: {
      clay: T("mud", 40, { 0: { x: 48 }, 1: { icon: "tablet" } }),
      scribe: P("villager", { 0: { x: 40, sit: true, work: "hammer", face: 48 }, 2: [{ work: null, sit: false }, { x: 112, secs: 3 }] }),
      sheep: T("sheep", 38, { 1: grow(68, 0.4, 0.6) }),
      sack: T("basket", 34, { 1: grow(78, 1, 0.6) }),
      reader: P("villager", { 3: [{ x: -10, secs: 0 }, { x: 40, secs: 2 }, { sit: true, work: "book", face: 48 }] }),
    },
    fx: [{ kind: "glow", x: 48, line: 2 }],
  },
  pottery: {
    things: {
      fire: T("campfire", 50, { 0: { x: 36 } }),
      clay: T("mud", 34, { 0: [{ x: 46 }, { icon: "bricks", delay: 2 }] }),
      potter: P("villager", { 1: [{ x: 52, secs: 1.4 }, { sit: true, work: "hammer", face: 62 }], 2: { work: null } }),
      jar: T("amphora", 48, { 1: grow(62, 1.6, 1.4) }),
      grain: T("wheat", 34, { 2: [{ x: 80, secs: 0 }, { x: 62, y: 26, secs: 1.4, delay: 0.4 }, { scale: 0, secs: 0.5 }] }),
      rat: T("rat", 30, { 2: [{ x: 104, secs: 0 }, { x: 74, secs: 1.6, delay: 1.6 }], 3: { x: 110, secs: 1.6, flip: true } }),
      jar2: T("amphora", 44, { 3: grow(70, 0.6) }),
    },
    fx: [{ kind: "smoke", x: 36, line: 0, secs: 3 }],
  },
  bronze: {
    things: {
      fire: T("campfire", 62, { 0: { x: 46 } }),
      ore: T("ore", 34, { 0: [{ x: 62 }, { x: 47, y: 22, secs: 1.2, delay: 0.6 }, { scale: 0, secs: 0.4 }] }),
      tin: T("rock", 26, { 1: [{ x: 62 }, { x: 47, y: 22, secs: 1, delay: 0.4 }, { scale: 0, secs: 0.4 }] }),
      smith: P("villager", { 0: { x: 30, face: 46 }, 1: { x: 34, work: "hammer" }, 3: { work: null } }),
      hammer: T("hammer", 40, { 2: grow(58, 0.4, 0.5) }),
      pick: T("pickaxe", 40, { 3: grow(68, 0.2, 0.5) }),
      axe: T("axe", 40, { 3: grow(78, 0.6, 0.5) }),
    },
    fx: [
      { kind: "sparks", x: 46, y: 22, line: 0, delay: 1.6, secs: 1.6 },
      { kind: "smoke", x: 46, line: 1, secs: 3 },
      { kind: "sparks", x: 52, y: 20, line: 2, secs: 1.2 },
    ],
  },
  irrigation: {
    things: {
      big: T("wheat", 44, { 0: { x: 24, scale: 1.3 } }),
      dry1: T("wheat", 44, { 0: { x: 60, scale: 0.55 }, 2: { scale: 1.3, secs: 1.8 } }),
      dry2: T("wheat", 44, { 0: { x: 70, scale: 0.5 }, 2: { scale: 1.3, secs: 2 } }),
      digger: P("villager", { 1: [{ x: 32, secs: 0, work: "shovel" }, { x: 52, secs: 3, work: "shovel" }], 2: { work: null, x: 44 } }),
      water: T("drop", 26, { 1: [{ x: 30, y: 16, show: false }, { show: true, delay: 1.2 }, { x: 62, secs: 1.8 }], 2: { x: 72, secs: 1 } }),
    },
    fx: [{ kind: "splash", x: 62, y: 18, line: 1, delay: 3, secs: 1 }],
  },
  forestry: {
    things: {
      st1: T("stump", 36, { 0: { x: 40 } }),
      st2: T("stump", 36, { 0: { x: 52 } }),
      st3: T("stump", 36, { 0: { x: 64 } }),
      elder: P("elder", { 1: [{ x: -8, secs: 0 }, { x: 44, secs: 2 }, { work: "hoe" }], 2: { work: null, x: 30, face: 60 } }),
      sap1: T("sapling", 40, { 1: grow(47, 2.6) , 2: { scale: 1.4, secs: 1.6 } }),
      sap2: T("sapling", 40, { 2: grow(58, 0.4), 3: { scale: 1.4, secs: 1.4 } }),
      cutter: P("villager", { 3: [{ x: 110, secs: 0 }, { x: 72, secs: 2 }, { work: "axe" }] }),
    },
    fx: [{ kind: "seeds", x: 47, y: 24, line: 1, delay: 2, secs: 1 }],
  },
  wheel: {
    things: {
      log: T("log", 40, { 0: [{ x: 14, y: 34 }, { x: 46, y: 18, secs: 2.4, spin: true }], 1: { show: false } }),
      stone: T("rock", 44, { 0: { on: "log", dx: 0, dy: 6 }, 1: { on: null, x: 30 } }),
      maker: P("villager", { 1: [{ x: 38, secs: 1.2 }, { work: "hammer", face: 52 }], 2: [{ work: null }, { on: "cart", dx: -9 }] }),
      cart: T("cart", 64, { 1: grow(52, 1.2, 1), 2: { x: 104, secs: 4, delay: 0.4 } }),
      load: T("basket", 30, { 2: { on: "cart", dx: 2, dy: 7 } }),
      load2: T("wheat", 30, { 2: { on: "cart", dx: -2, dy: 8 } }),
    },
    fx: [{ kind: "dust", x: 46, line: 0, delay: 2.2, secs: 1 }],
  },
  watermill: {
    things: {
      log: T("log", 40, { 0: { x: 44, y: 12, spin: true }, 1: { show: false } }),
      mill: T("mill", 80, { 1: grow(50, 0.4, 1.8) }),
      miller: P("villager", { 2: [{ x: 14, secs: 0, work: "carry" }, { x: 40, secs: 2 }, { work: null }] }),
      grain: T("wheat", 30, { 2: [{ on: "miller", dx: 3, dy: 8 }, { on: null, x: 50, y: 22, delay: 2.2 }, { scale: 0, secs: 0.6 }] }),
      flour: T("basket", 34, { 3: grow(62, 0.4, 0.6) }),
    },
    fx: [
      { kind: "splash", x: 44, y: 14, line: 0, secs: 3 },
      { kind: "splash", x: 54, y: 16, line: 1, delay: 1.6, secs: 3 },
    ],
  },
  hydraulics: {
    things: {
      dry: T("drop", 26, { 0: { x: 50, y: 14, scale: 0.6 }, 1: { show: false } }),
      digger: P("villager", { 1: [{ x: 42, secs: 1 }, { work: "shovel" }], 2: [{ work: null }, { x: 34, secs: 1 }] }),
      water: T("drop", 30, { 1: [{ x: 50, y: 8, show: false }, { show: true, delay: 2.4 }, { y: 24, secs: 1 }], 2: { show: false } }),
      well: T("well", 70, { 2: grow(50, 0.6, 1.4) }),
      carrier: P("villager", { 3: [{ x: 110, secs: 0, work: "carry" }, { x: 62, secs: 2 }] }),
    },
    fx: [
      { kind: "dust", x: 48, line: 1, secs: 2.4 },
      { kind: "splash", x: 50, y: 22, line: 1, delay: 3, secs: 1.2 },
    ],
  },
  roads: {
    things: {
      mud: T("mud", 54, { 0: { x: 50 }, 1: { show: false, delay: 0.4 } }),
      cart: T("cart", 60, { 0: { x: 50, y: 15 }, 1: { x: 18, y: 18, secs: 1 }, 2: { x: 108, secs: 3.2 } }),
      pusher: P("villager", { 0: { x: 40, work: "carry", face: 50 }, 1: [{ work: null, x: 30 }, { x: 50, work: "hammer", delay: 0.6 }], 2: [{ work: null }, { on: "cart", dx: -8 }] }),
      r1: T("road", 40, { 1: grow(38, 0.8, 0.3) }),
      r2: T("road", 40, { 1: grow(48, 1.3, 0.3) }),
      r3: T("road", 40, { 1: grow(58, 1.8, 0.3) }),
      r4: T("road", 40, { 1: grow(68, 2.3, 0.3) }),
      r5: T("road", 40, { 1: grow(78, 2.8, 0.3) }),
    },
    fx: [{ kind: "splash", x: 50, y: 16, line: 0, secs: 2 }],
  },
  coinage: {
    things: {
      t1: P("villager", { 0: { x: 34, face: 66 }, 2: { x: 40 } }),
      t2: P("villager", { 0: { x: 66, face: 34 }, 2: { x: 60 } }),
      sheep: T("sheep", 40, { 0: { x: 22 } }),
      oil: T("amphora", 40, { 0: { x: 78 }, 2: { x: 30, secs: 1.6, delay: 1 } }),
      coin: T("coin", 34, { 1: grow(50, 0.4, 0.5, 30), 2: { x: 72, y: 22, secs: 1.4 } }),
      coin2: T("coin", 30, { 3: grow(46, 0.2, 0.4, 28) }),
      coin3: T("coin", 30, { 3: grow(54, 0.5, 0.4, 28) }),
    },
    fx: [{ kind: "glow", x: 50, line: 1 }],
  },
  seedsaving: {
    things: {
      a: T("wheat", 40, { 0: { x: 40, scale: 0.8 }, 2: { scale: 1.3, secs: 1.6 } }),
      tall: T("wheat", 40, { 0: { x: 50, scale: 1.4 } }),
      c: T("wheat", 40, { 0: { x: 60, scale: 0.75 }, 2: { scale: 1.35, secs: 1.8 } }),
      saver: P("villager", { 1: [{ x: -8, secs: 0 }, { x: 44, secs: 1.8 }, { work: "hoe", face: 50 }], 2: { work: null, x: 30 } }),
      pouch: T("basket", 28, { 1: [{ x: 46, show: false }, { show: true, delay: 2 }] }),
      d: T("wheat", 40, { 3: grow(70, 0.3) }),
      e: T("wheat", 40, { 3: grow(80, 0.7) }),
    },
    fx: [{ kind: "seeds", x: 48, y: 28, line: 1, delay: 2, secs: 1.2 }],
  },
  basketry: {
    things: {
      r1: T("sprout", 36, { 0: { x: 24 } }),
      r2: T("sprout", 36, { 0: { x: 32 } }),
      weaver: P("villager", { 0: [{ x: 26, secs: 0, work: "hoe" }, { work: null, delay: 1.6 }, { x: 44, secs: 1 }, { sit: true, work: "book", face: 54 }], 2: [{ work: null, sit: false }, { work: "carry" }], 3: { x: 110, secs: 3 } }),
      basket: T("basket", 44, { 1: grow(54, 0.4, 1.6), 2: { on: "weaver", dx: 3, dy: 8 } }),
      load: T("herb", 26, { 2: { on: "weaver", dx: 3, dy: 14 } }),
    },
  },
  smoking: {
    things: {
      fire: T("campfire", 50, { 0: { x: 46 } }),
      fish: T("fish", 34, { 0: { x: 46, y: 34 }, 2: { icon: "meat" } }),
      cook: P("villager", { 0: { x: 30, sit: true, face: 46 }, 3: [{ sit: false }, { x: 46, secs: 1 }, { work: "carry" }] }),
    },
    fx: [{ kind: "smoke", x: 46, line: 0, secs: 4 }, { kind: "smoke", x: 46, line: 1, secs: 4 }],
  },
  kilns: {
    things: {
      kiln: T("campfire", 56, { 0: { x: 50 } }),
      pot1: T("amphora", 36, { 0: [{ x: 66 }, { x: 50, y: 22, secs: 1.2, delay: 0.4 }, { show: false }], 1: { show: true, x: 62, y: 18, secs: 0 } }),
      potter: P("villager", { 0: { x: 74, face: 50 }, 1: { x: 70 } }),
      grain: T("wheat", 30, { 2: [{ x: 84 }, { x: 62, y: 26, secs: 1.2, delay: 0.4 }, { scale: 0 }] }),
      pot2: T("amphora", 40, { 3: grow(74, 0.3) }),
    },
    fx: [{ kind: "smoke", x: 50, line: 0, delay: 1.4, secs: 3 }, { kind: "glow", x: 62, line: 1 }],
  },
  starcharts: {
    things: {
      s1: T("star", 24, { 0: grow(30, 0.4, 0.4, 70) }),
      s2: T("star", 24, { 0: grow(52, 1, 0.4, 76) }),
      s3: T("star", 24, { 0: grow(72, 1.6, 0.4, 68) }),
      elder: P("elder", { 0: { x: 38, face: 52 }, 1: { sit: true, work: "book" }, 2: { sit: false, work: null } }),
      chart: T("scroll", 40, { 1: grow(48, 1, 0.6) }),
      canoe: T("boat", 40, { 2: [{ x: 110, y: 26 }, { x: 70, secs: 3 }] }),
    },
    fx: [{ kind: "stars", x: 50, y: 70, line: 0, secs: 4 }],
  },
  restdays: {
    things: {
      w1: P("villager", { 0: { x: 30, work: "hoe" }, 1: [{ work: null }, { sit: true, delay: 0.4 }], 2: { sit: false, work: "hammer" } }),
      w2: P("villager", { 0: { x: 44, work: "hammer" }, 1: [{ work: null }, { sit: true, delay: 0.8 }], 2: { sit: false, work: "hoe" } }),
      w3: P("villager", { 0: { x: 58, work: "carry" }, 1: [{ work: null }, { sit: true, delay: 1.2 }], 2: { sit: false, work: "hammer" } }),
      sun: T("sun", 44, { 1: grow(76, 0.4, 1, 56) }),
    },
  },
  townwatch: {
    things: {
      l1: T("torch", 30, { 0: grow(30, 0.3, 0.4, 20) }),
      l2: T("torch", 30, { 0: grow(50, 0.9, 0.4, 20) }),
      l3: T("torch", 30, { 0: grow(70, 1.5, 0.4, 20) }),
      watch: P("villager", { 0: [{ x: 20, secs: 0 }, { x: 80, secs: 4 }], 1: { face: 100 } }),
      far: T("spear", 24, { 1: [{ x: 110, y: 26 }, { x: 94, secs: 2 }] }),
      runner: P("villager", { 2: [{ x: 80, secs: 0 }, { x: 10, secs: 2.4 }] }),
      shield: T("shield", 40, { 3: grow(50, 0.4) }),
    },
    fx: [{ kind: "glow", x: 50, line: 0 }],
  },
  rocketry: {
    things: {
      rocket: T("rocket", 80, { 0: grow(50, 0.4, 2), 1: { y: 130, secs: 3.4, delay: 0.8 } }),
      crew: P("villager", { 0: { x: 30, face: 50 }, 1: { face: 50 } }),
      sat: T("satellite", 36, { 2: [{ x: 20, y: 60 }, { x: 80, y: 64, secs: 4 }] }),
      moon: T("moon", 40, { 3: grow(30, 0.4, 1, 62) }),
    },
    fx: [{ kind: "smoke", x: 50, line: 1, delay: 0.6, secs: 3 }, { kind: "sparks", x: 50, y: 20, line: 1, delay: 0.6, secs: 1.6 }],
  },
  rewilding: {
    things: {
      st1: T("stump", 36, { 0: { x: 36 }, 2: { show: false } }),
      st2: T("stump", 36, { 0: { x: 56 }, 2: { show: false } }),
      f1: T("sapling", 44, { 1: grow(42, 0.6, 2), 2: { scale: 1.5, secs: 2 } }),
      f2: T("sapling", 44, { 1: grow(60, 1.2, 2), 2: { scale: 1.4, secs: 2 } }),
      f3: T("sapling", 44, { 2: grow(74, 0.4, 2) }),
      deer: T("sheep", 40, { 3: [{ x: 110 }, { x: 84, secs: 2.4 }] }),
    },
    fx: [{ kind: "leaves", x: 54, y: 40, line: 2, secs: 3 }, { kind: "seeds", x: 50, y: 30, line: 1, secs: 1.4 }],
  },
  oceans: {
    things: {
      junk1: T("rock", 28, { 0: { x: 50, y: 28 }, 1: { on: "boat", dx: 0, dy: 6, delay: 2 } }),
      junk2: T("rock", 28, { 0: { x: 66, y: 32 }, 1: { on: "boat", dx: 3, dy: 6, delay: 2.8 } }),
      boat: T("cleaner", 64, { 1: [{ x: 18, y: 28 }, { x: 86, y: 30, secs: 4 }] }),
      fish: T("fish", 30, { 2: [{ x: 50, y: 30, show: false }, { show: true, delay: 0.6 }] }),
      fish2: T("fish", 30, { 2: [{ x: 62, y: 34, show: false }, { show: true, delay: 1.2 }] }),
    },
    fx: [{ kind: "splash", x: 56, y: 32, line: 2, delay: 0.6, secs: 2 }],
  },
  capture: {
    things: {
      plant: T("capture", 80, { 1: grow(62, 0.4, 1.8) }),
      sun: T("sun", 40, { 2: grow(24, 0.4, 1, 60) }),
      tree: T("sapling", 40, { 3: grow(36, 0.3) }),
    },
    fx: [{ kind: "smoke", x: 40, y: 40, line: 0, secs: 4 }, { kind: "smoke", x: 62, y: 30, line: 1, delay: 1.6, secs: 2 }],
  },
  verticalfarms: {
    things: {
      f1: T("wheat", 40, { 0: { x: 24 }, 1: { scale: 0, secs: 1 } }),
      f2: T("wheat", 40, { 0: { x: 34 }, 1: { scale: 0, secs: 1 } }),
      f3: T("wheat", 40, { 0: { x: 44 }, 1: { scale: 0, secs: 1 } }),
      tower: T("vfarm", 84, { 1: grow(70, 0.8, 2) }),
      t1: T("sapling", 40, { 2: grow(26, 0.4) }),
      t2: T("sapling", 40, { 2: grow(38, 0.9) }),
    },
    fx: [{ kind: "dust", x: 70, line: 1, delay: 0.8, secs: 2 }],
  },
  solar: {
    things: {
      sun: T("sun", 48, { 0: { x: 24, y: 64 } }),
      p1: T("solar", 48, { 1: grow(50, 0.4) }),
      p2: T("solar", 48, { 1: grow(62, 0.9) }),
      p3: T("solar", 48, { 1: grow(74, 1.4) }),
      bulb: T("bulb", 34, { 2: grow(86, 0.4, 0.6, 26) }),
    },
    fx: [{ kind: "glow", x: 62, line: 2 }],
  },
  renewables: {
    things: {
      mill: T("windmill", 70, { 0: { x: 30 } }),
      turbine: T("turbine", 80, { 1: grow(62, 0.4, 2) }),
      bulb: T("bulb", 34, { 2: grow(80, 0.6, 0.6, 26) }),
    },
    fx: [{ kind: "leaves", x: 50, y: 40, line: 0, secs: 4 }, { kind: "leaves", x: 50, y: 40, line: 1, secs: 4 }],
  },
  electricity: {
    things: {
      storm: T("storm", 50, { 0: { x: 30, y: 64 } }),
      plant: T("powerplant", 74, { 1: grow(30, 0.4, 1.8) }),
      h1: T("hut", 44, { 0: { x: 60 } }),
      h2: T("hut", 44, { 0: { x: 74 } }),
      b1: T("bulb", 26, { 2: grow(60, 0.4, 0.4, 32) }),
      b2: T("bulb", 26, { 2: grow(74, 0.9, 0.4, 32) }),
    },
    fx: [{ kind: "sparks", x: 30, y: 60, line: 0, secs: 2 }, { kind: "glow", x: 67, line: 2, delay: 0.6 }],
  },
  printing: {
    things: {
      scribe: P("villager", { 0: { x: 28, sit: true, work: "book", face: 40 } }),
      book: T("book", 30, { 0: grow(36, 1, 3) }),
      press: T("press", 70, { 1: grow(58, 0.4, 1.4) }),
      b1: T("book", 30, { 1: [{ x: 66, y: 18, show: false }, { show: true, delay: 2 }] }),
      b2: T("book", 30, { 1: [{ x: 72, y: 18, show: false }, { show: true, delay: 2.3 }] }),
      b3: T("book", 30, { 1: [{ x: 78, y: 18, show: false }, { show: true, delay: 2.6 }] }),
      porter: P("villager", { 2: [{ x: 70, secs: 1.4, work: "carry" }, { x: 112, secs: 2.6 }] }),
    },
  },
  railways: {
    things: {
      cart: T("cart", 54, { 0: [{ x: 10 }, { x: 44, secs: 4 }] }),
      r1: T("road", 40, { 1: grow(20, 0.2, 0.3) }),
      r2: T("road", 40, { 1: grow(40, 0.4, 0.3) }),
      r3: T("road", 40, { 1: grow(60, 0.6, 0.3) }),
      r4: T("road", 40, { 1: grow(80, 0.8, 0.3) }),
      train: T("train", 80, { 2: [{ x: -14 }, { x: 116, secs: 2.6 }] }),
    },
    fx: [{ kind: "smoke", x: 50, y: 28, line: 2, secs: 2.6 }],
  },
  navigation: {
    things: {
      compass: T("compass", 40, { 0: { x: 40 } }),
      boat: T("boat", 70, { 1: grow(52, 0.4, 1.4, 22), 2: { x: 78, y: 40, secs: 3.6 } }),
      sailor: P("villager", { 0: { x: 30, face: 40 }, 1: { x: 44, secs: 1 } }),
    },
    fx: [{ kind: "glow", x: 40, line: 0 }, { kind: "splash", x: 60, y: 28, line: 2, secs: 2 }],
  },
  "far-shores": {
    things: {
      boat: T("boat", 70, { 0: [{ x: 96, y: 40 }, { x: 56, y: 22, secs: 3.2 }] }),
      fruit: T("herb", 30, { 1: [{ x: 50, y: 18, show: false }, { show: true, delay: 0.4 }] }),
      teller: P("villager", { 1: [{ x: 56, y: 20, secs: 0 }, { x: 40, secs: 1.4, face: 20 }] }),
      kid: P("child", { 1: walkIn(28, 1.8, -10, { face: 40 }) }),
      glass: T("spyglass", 40, { 2: grow(66, 0.4, 0.6) }),
    },
  },
  "barter-roads": {
    things: {
      ship: T("boat", 70, { 0: [{ x: 98, y: 38 }, { x: 62, y: 22, secs: 3.2 }] }),
      silk: T("jade", 30, { 1: grow(54, 0.4, 0.4) }),
      grain: T("wheat", 34, { 1: { x: 38 }, 2: { x: 58, secs: 1.4 } }),
      us: P("villager", { 1: { x: 32, face: 60 } }),
    },
  },
  quarantine: {
    things: {
      ship: T("boat", 64, { 0: [{ x: 98, y: 40 }, { x: 70, y: 30, secs: 3 }], 3: { x: 58, y: 22, secs: 2.4 } }),
      anchor: T("anchor", 28, { 1: [{ x: 70, y: 36 }, { y: 28, secs: 1 }] }),
      guard: P("villager", { 1: { x: 40, face: 70 } }),
    },
    fx: [{ kind: "splash", x: 70, y: 28, line: 1, delay: 1, secs: 1 }],
  },
  seawalls: {
    things: {
      hut: T("hut", 50, { 0: { x: 40 } }),
      wall: T("seawall", 70, { 1: grow(58, 0.4, 1.6, 18) }),
      builder: P("villager", { 1: { x: 46, work: "hammer", face: 58 }, 2: { work: null } }),
    },
    fx: [
      { kind: "splash", x: 50, y: 20, line: 0, secs: 4 },
      { kind: "splash", x: 64, y: 24, line: 2, secs: 4 },
    ],
  },
  diplomacy: {
    things: {
      ship: T("boat", 64, { 0: [{ x: 98, y: 38 }, { x: 64, y: 24, secs: 3 }], 2: { x: 98, y: 38, secs: 3 } }),
      gift: T("amphora", 34, { 0: [{ x: 60, y: 18, show: false }, { show: true, delay: 3.2 }] }),
      dove: T("dove", 34, { 1: [{ x: 34, y: 40 }, { x: 92, y: 50, secs: 3.4 }] }),
      envoy: P("villager", { 0: { x: 40, face: 64 } }),
    },
  },
  "silk-secret": {
    things: {
      ship: T("boat", 64, { 0: [{ x: 98, y: 40 }, { x: 60, y: 22, secs: 3.2 }] }),
      jade: T("jade", 44, { 1: grow(52, 0.4, 0.6) }),
      trader: P("villager", { 1: [{ x: 60, y: 20, secs: 0 }, { x: 44, secs: 1.4, face: 52 }] }),
    },
    fx: [{ kind: "glow", x: 52, line: 1, delay: 0.6 }],
  },
  "heavy-plough": {
    things: {
      horse: T("horse", 60, { 1: [{ x: -10 }, { x: 80, secs: 4 }] }),
      plough: T("plough", 40, { 1: { on: "horse", dx: -9, dy: -2 } }),
      farmer: P("villager", { 1: [{ x: -20, secs: 0 }, { x: 64, secs: 4 }] }),
      mud: T("mud", 44, { 0: { x: 50 } }),
      w1: T("wheat", 40, { 2: grow(36, 0.4) }),
      w2: T("wheat", 40, { 2: grow(48, 0.8) }),
      w3: T("wheat", 40, { 2: grow(60, 1.2) }),
    },
    fx: [{ kind: "dust", x: 50, line: 1, delay: 1.6, secs: 2 }],
  },
  "three-field": {
    things: {
      a: T("wheat", 40, { 0: { x: 30, scale: 0.6 }, 1: { icon: "sprout", scale: 1 }, 2: { icon: "leaf" } }),
      b: T("sprout", 40, { 1: grow(50, 0.4), 2: { icon: "wheat" } }),
      c: T("leaf", 36, { 1: grow(70, 0.8), 2: { icon: "sprout" } }),
      farmer: P("villager", { 1: [{ x: 40, secs: 1.4 }, { work: "hoe" }], 2: [{ work: null }, { x: 60, secs: 1.4 }, { work: "hoe" }], 3: { work: null } }),
    },
  },
  castles: {
    things: {
      fence: T("log", 40, { 0: { x: 40 }, 1: { show: false } }),
      fire: T("flame", 34, { 0: grow(40, 0.6, 0.4, 22), 1: { show: false } }),
      castle: T("castle", 90, { 1: grow(58, 0.6, 2.4) }),
      guard: P("villager", { 2: { x: 34, face: 90 } }),
    },
    fx: [{ kind: "smoke", x: 40, line: 0, delay: 0.6, secs: 3 }, { kind: "dust", x: 58, line: 1, delay: 0.6, secs: 2.4 }],
  },
  knights: {
    things: {
      horse: T("horse", 64, { 0: { x: 30 }, 1: { x: 100, secs: 1.8 }, 2: { x: 60, secs: 1.6 } }),
      rider: P("villager", { 0: { on: "horse", dx: 0, dy: 12, sit: true } }),
      runner: P("villager", { 1: [{ x: 20, secs: 0 }, { x: 50, secs: 3 }] }),
      oats: T("wheat", 34, { 2: [{ x: 40 }, { x: 58, y: 22, secs: 1, delay: 1.4 }, { scale: 0, secs: 0.4 }] }),
    },
    fx: [{ kind: "dust", x: 60, line: 1, secs: 1.8 }],
  },
  computers: {
    things: {
      c1: P("villager", { 0: { x: 24, sit: true, work: "book" }, 2: { sit: false, work: null, face: 60 } }),
      c2: P("villager", { 0: { x: 36, sit: true, work: "book" }, 2: { sit: false, work: null, face: 60 } }),
      pc: T("computer", 60, { 1: grow(62, 0.4, 1.4) }),
      bulb: T("bulb", 30, { 2: grow(62, 0.6, 0.5, 40) }),
    },
    fx: [{ kind: "glow", x: 62, line: 1, delay: 1 }],
  },
  automation: {
    things: {
      bot: P("robot", { 0: walkIn(40, 2), 1: { work: "hoe" } }),
      bot2: P("robot", { 1: [{ x: 110, secs: 0 }, { x: 64, secs: 2 }, { work: "hammer" }] }),
      man: P("villager", { 0: { x: 20, work: "hoe" }, 1: { work: null }, 2: { sit: true } }),
      w1: T("wheat", 40, { 1: grow(48, 1.6) }),
      w2: T("wheat", 40, { 1: grow(74, 2.4) }),
    },
  },
  arcology: {
    things: {
      h1: T("insula", 44, { 0: { x: 20 }, 1: { scale: 0, secs: 1.6 } }),
      h2: T("insula", 44, { 0: { x: 34 }, 1: { scale: 0, secs: 1.6 } }),
      h3: T("insula", 44, { 0: { x: 82 }, 1: { scale: 0, secs: 1.6 } }),
      tower: T("arcology", 100, { 1: grow(56, 0.6, 2.4) }),
      t1: T("sapling", 40, { 2: grow(20, 0.4) }),
      t2: T("sapling", 40, { 2: grow(34, 0.8) }),
      t3: T("sapling", 40, { 2: grow(82, 1.2) }),
    },
    fx: [{ kind: "dust", x: 56, line: 1, delay: 0.6, secs: 2.4 }],
  },
  fusion: {
    things: {
      ring: T("fusion", 80, { 1: grow(54, 0.4, 2) }),
      water: T("drop", 30, { 2: [{ x: 30, y: 18 }, { x: 54, y: 22, secs: 1.4 }, { scale: 0 }] }),
      bulb: T("bulb", 30, { 3: grow(76, 0.4, 0.5, 30) }),
    },
    fx: [{ kind: "glow", x: 54, line: 2, delay: 1.4 }],
  },
};

// The script a discovery plays: its own, or one made from its old layout.
export function scriptFor(id: string, scene: DiscoveryScene): SceneScript {
  return SCENE_SCRIPTS[id] ?? autoScript(scene);
}

// ---- Playing a line ------------------------------------------------------------------
// Both cutscene renderers ask the same question every frame: `time` seconds into
// `line`, where is each thing and what is it doing?

const ease = (k: number) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);

// How long a step takes when the script doesn't say.
function stepSecs(p: Pose) {
  if (p.secs !== undefined) return p.secs;
  if (p.x !== undefined || p.y !== undefined) return 1.4;
  if (p.scale !== undefined) return 1;
  return 0.25;
}

export interface Now extends Settled {
  // Walking (or being moved) right now.
  moving: boolean;
  // Seconds since it came on stage in this line (null: it was already there).
  appeared: number | null;
}

// Plays a thing's steps in `line` up to `time` s, from how it stood at the
// line's start. With the script, getting on or off something starts from where
// it is on the stage (not from where it last stood on its own feet).
function play(t: SceneThing, line: number, time: number, from: Settled, script?: SceneScript, depth = 0): Now {
  let s = from;
  let appeared: number | null = null;
  let moving = false;
  let cursor = 0;
  for (const p of stepsOn(t, line)) {
    const start = cursor + (p.delay ?? 0);
    const secs = stepSecs(p);
    cursor = start + secs;
    if (time < start) break;
    if (script && depth < 4 && p.on !== undefined && p.on !== s.on) {
      if (s.on && script.things[s.on]) {
        const c = spotOf(script, s.on, line, start, depth + 1);
        s = { ...s, x: c.x + s.dx, y: c.y + s.dy, dx: 0, dy: 0, on: null };
      }
      if (p.on && script.things[p.on]) {
        const c = spotOf(script, p.on, line, start, depth + 1);
        s = { ...s, dx: s.x - c.x, dy: s.y - c.y };
      }
    }
    const after = applyPose(s, { ...p, show: p.show === false ? s.show : p.show });
    if (p.show === true && !s.show) appeared = start;
    const k = secs > 0 ? Math.min(1, (time - start) / secs) : 1;
    if (k < 1) {
      const e = ease(k);
      const mix = (a: number, b: number) => a + (b - a) * e;
      moving = after.x !== s.x || after.y !== s.y;
      s = { ...after, x: mix(s.x, after.x), y: mix(s.y, after.y), scale: mix(s.scale, after.scale), dx: mix(s.dx, after.dx), dy: mix(s.dy, after.dy) };
      break;
    }
    s = { ...after, show: p.show === false ? false : after.show };
  }
  return { ...s, moving, appeared };
}

export function poseNow(t: SceneThing, line: number, time: number, script?: SceneScript, depth = 0): Now {
  if (line < firstLine(t)) return { ...settledBefore(t, line), show: false, moving: false, appeared: null };
  return play(t, line, time, settledBefore(t, line, script, depth), script, depth);
}

// Where a thing is on the stage `time` s into `line` (a rider: where its
// carrier is, plus its offset).
export function spotOf(script: SceneScript, id: string, line: number, time: number, depth = 0): { x: number; y: number } {
  const n = poseNow(script.things[id], line, time, script, depth);
  if (n.on && script.things[n.on] && depth < 4) {
    const c = spotOf(script, n.on, line, time, depth + 1);
    return { x: c.x + n.dx, y: c.y + n.dy };
  }
  return { x: n.x, y: n.y };
}

// An effect's progress (0-1) `time` seconds into `line`, or null when it isn't on.
export function fxNow(f: SceneFx, line: number, time: number): number | null {
  if (f.line !== line) return null;
  const start = f.delay ?? 0;
  const secs = f.secs ?? 1.5;
  if (time < start || time > start + secs) return null;
  return (time - start) / secs;
}

// When the last step or effect of a line is over (s), so the line can stay up
// until what it shows has happened.
export function lineEnds(script: SceneScript, line: number): number {
  let end = 0;
  for (const t of Object.values(script.things)) {
    let cursor = 0;
    for (const p of stepsOn(t, line)) cursor += (p.delay ?? 0) + stepSecs(p);
    end = Math.max(end, cursor);
  }
  for (const f of script.fx ?? []) if (f.line === line && f.kind !== "glow") end = Math.max(end, (f.delay ?? 0) + (f.secs ?? 1.5));
  return end;
}

// Every icon a thing shows during the scene (so a renderer can have them all ready).
export function iconsOf(t: SceneThing): IconId[] {
  const out = new Set<IconId>(t.icon ? [t.icon] : []);
  for (const b of Object.values(t.beats)) for (const p of steps(b)) if (p.icon) out.add(p.icon);
  return [...out];
}
