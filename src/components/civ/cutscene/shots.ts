import type { ActorSpec, Extra, Shot } from "./stage";
import type { IconId } from "@/game/sprites";
import { at } from "./diorama";

// The sets the cutscenes are filmed on: each era's town (by axial position on
// the little island, the middle left open), and the people standing about.

type Placed = [number, number, string][];

export const ERA_SETS: Placed[] = [
  [[0, 0, "campfire"], [1, -1, "hut"], [-1, 0, "hut"], [0, -1, "hut"], [-1, 2, "gatherer"], [2, -2, "woodcutter"]],
  [[0, 0, "campfire"], [1, -1, "house"], [-1, 0, "house"], [0, -1, "house"], [1, 1, "farm"], [2, 0, "farm"], [-1, 1, "well"], [-2, 1, "granary"]],
  [[1, -1, "townhouse"], [-1, 0, "townhouse"], [0, -1, "townhouse"], [2, -1, "aqueduct"], [2, -2, "aqueduct"], [-1, 1, "temple"], [1, 0, "market"], [0, 1, "baths"], [2, 0, "farm"]],
  [[-2, 1, "castle"], [2, -1, "windmill"], [0, -1, "cathedral"], [1, -1, "townhouse"], [-1, 0, "townhouse"], [1, 0, "market"], [2, 0, "farm"], [1, 1, "farm"], [-1, 1, "university"]],
  [[1, -1, "factory"], [2, -2, "coalplant"], [1, 0, "station"], [-1, 0, "apartments"], [0, -1, "apartments"], [-1, 1, "hospital"], [0, 1, "park"], [2, 0, "farm"]],
  [[-1, 0, "arcology"], [2, -1, "solarfarm"], [2, 0, "solarfarm"], [-2, 1, "windfarm"], [-2, 2, "windfarm"], [0, 1, "park"], [1, 1, "vfarm"], [0, -1, "datacenter"], [1, -1, "apartments"]],
];

// Villagers about the town: some walking, some working, some by the fire.
export function townsfolk(era: number, seed: number, n = 8): ActorSpec[] {
  const people: ActorSpec[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + seed;
    const r = 1.4 + ((i * 7 + seed) % 3) * 0.5;
    const [x, z] = [Math.cos(a) * r, Math.sin(a) * r];
    const b = a + 1.2;
    people.push({
      x,
      z,
      look: era >= 5 && i % 4 === 3 ? "robot" : "villager",
      walkTo: i % 2 ? [Math.cos(b) * r, Math.sin(b) * r] : undefined,
      speed: 0.5,
      sit: era === 0 && i % 3 === 0,
      face: i % 2 ? undefined : [0, 0],
    });
  }
  return people;
}

const [padX, padZ] = at(0, 0);

// The crowd watching the Ark: in front of the pad, looking at it.
function crowd(): ActorSpec[] {
  const out: ActorSpec[] = [];
  for (let i = 0; i < 14; i++) {
    const x = -3 + (i % 7) * 1;
    const z = 3.2 + Math.floor(i / 7) * 0.8 + ((i * 3) % 2) * 0.2;
    out.push({ x, z, face: [padX, padZ], look: i === 3 ? "elder" : i === 5 ? "kito" : i === 8 ? "lina" : i % 5 === 4 ? "robot" : "villager", lively: i % 3 === 0 });
  }
  return out;
}

const futureTown = ERA_SETS[5].filter(([q, r]) => !(q === 0 && r === 0));
const launchTown = { seed: 51, buildings: futureTown, forest: 0.35, open: { x: 0, z: 3.4, r: 3.4 } };

export const ARK_SHOTS = {
  night: {
    key: "night",
    island: launchTown,
    sky: "night",
    actors: crowd(),
    extras: [{ kind: "launch", x: padX, z: padZ }],
    camera: { from: [0, 9, 17], to: [0, 3.4, 12], lookFrom: [0, 1.5, 0], lookTo: [0, 2, 0], seconds: 5.2 },
  },
  countdown: {
    key: "countdown",
    island: launchTown,
    sky: "night",
    actors: crowd(),
    extras: [{ kind: "launch", x: padX, z: padZ }],
    camera: { from: [3, 1.3, 6.8], to: [2.2, 1.2, 5.4], lookFrom: [0, 2, 0], lookTo: [0, 2.8, 0], seconds: 3.6 },
  },
  ignition: {
    key: "ignition",
    island: launchTown,
    sky: "night",
    actors: crowd(),
    extras: [{ kind: "launch", x: padX, z: padZ, liftAt: 0.8 }],
    camera: { from: [6, 2.2, 11], to: [6.5, 3.4, 12], lookFrom: [0, 2.5, 0], lookTo: [0, 14, 0], seconds: 4.8, shake: { at: 0.8, for: 3.4, amp: 0.3 } },
  },
  ascent: {
    key: "ascent",
    island: null,
    sky: "day",
    extras: [{ kind: "ascent" }],
    camera: { from: [5, 36, 9], to: [4, 44, 8], lookFrom: [0, 41, 0], lookTo: [0, 43, 0], seconds: 5.2 },
  },
  voyage: {
    key: "voyage",
    island: null,
    sky: "space",
    extras: [{ kind: "warp" }],
    camera: { from: [4, 2.5, 9], to: [2.5, 1.2, 6.5], lookFrom: [0, 0, -10], lookTo: [0, 0, -30], seconds: 6.2 },
  },
  stay: {
    key: "stay",
    // A green island, low and planted; the three watching where the Ark went.
    island: {
      seed: 53,
      buildings: [[2, -2, "solarfarm"], [2, -1, "solarfarm"], [-3, 1, "windfarm"], [-2, 0, "windfarm"], [-1, -1, "park"], [1, -2, "vfarm"], [0, -2, "park"]],
      forest: 0.6,
      young: true,
      open: { x: 0, z: 3.5, r: 2.6 },
    },
    sky: "dawn",
    actors: [
      { x: -0.8, z: 2.6, look: "elder", face: [0.4, -20] },
      { x: 0.2, z: 2.8, look: "kito", face: [0.4, -20] },
      { x: 1.1, z: 2.5, look: "lina", face: [0.4, -20], lively: true },
      ...townsfolk(5, 2, 6).filter((a) => a.z < 1),
    ],
    camera: { from: [0.6, 1.5, 6.4], to: [0.2, 2.3, 5.6], lookFrom: [0, 1.1, 0], lookTo: [0.4, 2.1, -14], seconds: 6.2 },
  },
} satisfies Record<string, Shot>;

// A planet as green as the land is healthy (0–1).
export function planetShot(green: number): Shot {
  return {
    key: "planet",
    island: null,
    sky: "space",
    extras: [{ kind: "planet", green }],
    camera: { from: [0, 3, 30], to: [0, 1, 19], lookFrom: [0, 0, 0], seconds: 6 },
  };
}

// A memory of one era: its town on a sunny day, people about, the camera drifting round.
export function memoryShot(era: number): Shot {
  const a = era * 1.1;
  return {
    key: `memory-${era}`,
    island: { seed: 60 + era, buildings: ERA_SETS[era], forest: era <= 1 ? 0.5 : 0.3, river: era === 2, mountains: era === 0 },
    sky: era === 3 ? "dusk" : era === 0 ? "dawn" : "day",
    actors: townsfolk(era, era),
    camera: { from: [Math.sin(a) * 11, 6, Math.cos(a) * 11], to: [Math.sin(a + 0.5) * 8.5, 4.2, Math.cos(a + 0.5) * 8.5], lookFrom: [0, 0.8, 0], seconds: 4.6 },
  };
}

// The town today, for the numbers to sit over.
export function townShot(era: number): Shot {
  return {
    key: "town",
    island: { seed: 70, buildings: ERA_SETS[Math.min(era, 5)], forest: 0.4 },
    sky: "dusk",
    actors: townsfolk(era, 3),
    camera: { from: [10, 8, 10], to: [8, 6, -8], lookFrom: [0, 0.5, 0], seconds: 8 },
  };
}

// ---- The world lost ---------------------------------------------------------

const lostTown = { seed: 81, buildings: [...ERA_SETS[4], [0, 0, "datacenter"] as [number, number, string]], forest: 0.5, burning: true };

export const FALLEN_SHOTS = {
  heat: {
    key: "heat",
    island: { ...lostTown, burning: false },
    sky: "red",
    actors: townsfolk(4, 1, 6),
    camera: { from: [12, 7, 12], to: [9, 5, 9], lookFrom: [0, 0.6, 0], seconds: 5.6 },
  },
  fires: {
    key: "fires",
    island: lostTown,
    sky: "red",
    actors: townsfolk(4, 4, 6).map((a, i) => ({ ...a, walkTo: [a.x * 2.5, a.z * 2.5] as [number, number], speed: 1.4, face: undefined, lively: i % 2 === 0 })),
    camera: { from: [-6, 3, 9], to: [-3, 2.5, 7], lookFrom: [0, 1, 0], seconds: 5.6, shake: { at: 0.5, for: 5, amp: 0.06 } },
  },
  flood: {
    key: "flood",
    island: { ...lostTown, burning: false },
    sky: "storm",
    extras: [{ kind: "flood", from: 0.1, to: 1.25, seconds: 6 }, { kind: "rain" }],
    camera: { from: [0, 6, 14], to: [0, 4, 11], lookFrom: [0, 0.8, 0], seconds: 6 },
  },
  ships: {
    key: "ships",
    island: { ...lostTown, burning: false },
    sky: "storm",
    extras: [{ kind: "flood", from: 1.25, to: 1.25, seconds: 1 }, { kind: "rain" }, { kind: "boat", from: [3, 6], to: [9, 15], seconds: 5.6, y: 1.25 }],
    // Low over the water, the ship sailing off and the drowned town behind it.
    camera: { from: [11, 3, 16], to: [13, 2.8, 20.5], lookFrom: [2, 1.3, 4], lookTo: [6, 1.4, 10], seconds: 5.6 },
  },
} satisfies Record<string, Shot>;

// ---- Story mode -------------------------------------------------------------

// Where Ama, Kito and Lina stand: in a row in front of the town, facing us.
const CAST_Z = 2.7;
const CAST_X: Record<"ama" | "kito" | "lina", number> = { ama: -1.05, kito: 0, lina: 1.05 };
const CAST_LOOK: Record<"ama" | "kito" | "lina", ActorSpec["look"]> = { ama: "elder", kito: "kito", lina: "lina" };

// Each chapter's weather, opening and closing.
const STORY_SKY: Record<string, [Shot["sky"], Shot["sky"]]> = {
  "last-ember": ["dusk", "night"],
  "kitos-hunt": ["dawn", "day"],
  seeds: ["day", "dawn"],
  "mud-and-brick": ["day", "day"],
  legion: ["dusk", "day"],
  water: ["day", "day"],
  drought: ["dusk", "dawn"],
  kings: ["day", "dusk"],
  plague: ["storm", "dawn"],
  smoke: ["storm", "day"],
  warming: ["red", "dawn"],
  "type-one": ["day", "day"],
  ark: ["night", "night"],
};

// The town behind the cast: only what stands behind them, so nobody is hidden.
const behind = (set: Placed, z = 1.2) => set.filter(([q, r]) => at(q, r)[1] < z);

export function storySet(chapter: { id: string; era: number }, scene: "intro" | "outro", index: number) {
  const era = Math.min(chapter.era, 5);
  // The first scene of all: they have only just arrived, with nothing built.
  const buildings = index === 0 && scene === "intro" ? [] : behind(ERA_SETS[era]);
  return {
    island: {
      seed: 100 + index,
      buildings,
      forest: chapter.id === "drought" ? 0.12 : 0.45,
      steppe: chapter.id === "drought",
      river: era === 2 && chapter.id !== "drought",
      mountains: era === 0,
      open: { x: 0, z: 3.6, r: 3.6 },
    },
    sky: (STORY_SKY[chapter.id] ?? ["day", "day"])[scene === "intro" ? 0 : 1],
    folk: townsfolk(era, index, 6).filter((a) => a.z < 1.3 && (!a.walkTo || a.walkTo[1] < 1.3)),
  };
}

// One line of a story scene: the cast in their places, whoever speaks bobbing
// and facing us, the others turned to listen; the camera on the speaker (or
// wide over the town for the narrator), gliding from one to the next.
export function storyShot(
  key: string,
  set: ReturnType<typeof storySet>,
  cast: ("ama" | "kito" | "lina")[],
  speaker: "ama" | "kito" | "lina" | "narrator",
): Shot {
  const actors: ActorSpec[] = [
    ...cast.map((who): ActorSpec => {
      const x = CAST_X[who];
      const speaking = who === speaker;
      const face: [number, number] = speaking || speaker === "narrator" ? [x * 0.4, 12] : [CAST_X[speaker as "ama"], CAST_Z + 0.6];
      return { x, z: CAST_Z, look: CAST_LOOK[who], face, lively: speaking, scale: 1.05 };
    }),
    ...set.folk,
  ];
  const wide = { from: [7, 5.6, 11.5] as [number, number, number], lookFrom: [0, 0.7, 0.5] as [number, number, number] };
  if (speaker === "narrator")
    return { key, island: set.island, sky: set.sky, actors, camera: { ...wide, to: [4.8, 3.6, 9.4], lookTo: [0, 0.8, 1.2], seconds: 7, key: "wide", blend: true } };
  const x = CAST_X[speaker];
  return {
    key,
    island: set.island,
    sky: set.sky,
    actors,
    camera: { ...wide, to: [x * 0.7 + 0.45, 1.5, CAST_Z + 2.75], lookTo: [x * 0.85, 1.0, CAST_Z], seconds: 1.8, key: speaker, blend: true },
  };
}

// ---- Discoveries -----------------------------------------------------------------

// A discovery scene is laid out like the old flat ones (`x` 0-100 across, `y`
// up from the ground at 18, sizes in pixels against 56 for a person), and here
// stood up in 3D: a strip of ground in front of the town, the camera facing it.
// At sea the camera stands on the shore and looks out, and things up off the
// ground (y above 20) float on the water.
export interface DiscoveryLayout {
  bg: "dawn" | "day" | "dusk" | "night" | "sea" | "cave";
  actors: string[];
  item: IconId;
  itemFrom?: number;
  itemX?: number;
  props?: { icon: IconId; x: number; y?: number; from?: number; until?: number; size?: number; flip?: boolean }[];
}

const STRIP_Z = 2.6;
const PX = 0.63 / 56;

export function discoveryShot(id: string, d: DiscoveryLayout, era: number, line: number, unlocks: string | null): Shot {
  const sea = d.bg === "sea";
  const cave = d.bg === "cave";
  // From the scene's x (0-100) to the world: across the strip, left to right as we look.
  const across = (pct: number) => (sea ? -1 : 1) * (pct / 100 - 0.5) * 7;
  const stripZ = sea ? 5.4 : cave ? 0 : STRIP_Z;
  const ground = 0.5;
  const place = (pct: number, y = 18) => {
    const inWater = sea && y > 20;
    return {
      x: across(pct),
      z: inWater ? stripZ + 2.2 : stripZ,
      y: inWater ? 0.16 : ground + Math.max(0, (y - 18) / 100) * 3.8,
    };
  };
  const turn = sea ? Math.PI : 0;
  const itemPct = d.itemX ?? 74;
  const item = place(itemPct);
  const shown = line >= (d.itemFrom ?? 1);

  // The people walk in from the side and stop in a row, facing what they find
  // (those sitting are already there).
  const actors: ActorSpec[] = [];
  const extras: Extra[] = [];
  d.actors.forEach((icon, i) => {
    const slot = place(12 + i * 8);
    const sit = icon.endsWith("-sit");
    const look: ActorSpec["look"] = icon.startsWith("elder") ? "elder" : "villager";
    if (icon !== "person" && icon !== "elder" && !sit) {
      extras.push({ kind: "voxel", id: `actor-${i}`, icon: icon as IconId, ...slot, size: 0.55, turn });
      return;
    }
    const start = place(-14 - i * 6);
    actors.push(
      sit
        ? { ...slot, look, sit: true, face: [item.x, item.z] }
        : { x: start.x, z: start.z, walkTo: [slot.x, slot.z], walkAt: i * 0.25, speed: 1.5, look, face: [item.x, item.z] },
    );
  });
  (d.props ?? []).forEach((p, i) => {
    if (line < (p.from ?? 0) || (p.until !== undefined && line >= p.until)) return;
    const at = place(p.x, p.y);
    // People in the props are people.
    if (p.icon === "person" || p.icon === "person-sit" || p.icon === "elder" || p.icon === "elder-sit") {
      actors.push({ x: at.x, z: at.z, look: p.icon.startsWith("elder") ? "elder" : "villager", sit: p.icon.endsWith("-sit"), face: [across(p.flip ? 0 : 100), at.z] });
      return;
    }
    extras.push({ kind: "voxel", id: `prop-${i}-${p.icon}`, icon: p.icon, ...at, size: (p.size ?? 40) * PX, flip: p.flip, turn });
  });
  if (shown) {
    extras.push({ kind: "glow", x: item.x, z: item.z });
    extras.push({ kind: "voxel", id: `item-${d.item}`, icon: d.item, x: item.x, z: item.z, y: item.y + 0.12, size: 80 * PX, spin: true, turn });
    // What it lets them build rises behind it.
    if (unlocks && !sea && !cave) extras.push({ kind: "rise", x: item.x + (item.x > 0 ? -0.2 : 0.2), z: stripZ - 1.7, building: unlocks });
  }
  if (cave) extras.push({ kind: "cave" });

  const town = ERA_SETS[Math.min(era, 5)].filter(([q, r]) => {
    const [x, z] = at(q, r);
    if (sea) return z < -1;
    // Keep clear of the strip, and of where a new building rises.
    return z < STRIP_Z - 1.4 && !(unlocks && Math.hypot(x - item.x, z - (stripZ - 1.7)) < 1.4);
  });
  const camera: Shot["camera"] = sea
    ? { from: [0, 2.4, 0], to: [0, 1.8, 1.4], lookFrom: [0, 0.5, 6.5], seconds: 7 }
    : cave
      ? { from: [0, 1.9, 7], to: [0, 1.6, 5.6], lookFrom: [0, 1, 0], seconds: 7 }
      : { from: [0, 2.3, STRIP_Z + 5.6], to: [0, 1.65, STRIP_Z + 4.1], lookFrom: [0, 0.85, STRIP_Z - 0.2], seconds: 7 };
  return {
    key: `discovery-${id}`,
    island: cave
      ? null
      : { seed: 200 + era, buildings: town, forest: 0.4, mountains: era === 0, open: sea ? { x: 0, z: 2.5, r: 4.2 } : { x: 0, z: STRIP_Z + 1.2, r: 4 } },
    sky: d.bg === "sea" ? "day" : d.bg,
    actors,
    extras,
    camera,
  };
}
