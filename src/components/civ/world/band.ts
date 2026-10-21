// Walking with your people (first person): a band of villagers comes along
// with the chief. They follow the way the chief walked (in a loose double
// file, never through the sea or a hut), gather round in front when the chief
// stops, and pitch in with their own tools when the chief chops or breaks
// stone. Everyone else turns to look as the chief passes, and waves. Now and
// then someone says something (shown as a subtitle). G calls the band or sends
// them back to what they were doing.
import type { Ground } from "./ground";
import { leader, villagerName } from "./leader";
import { daySky } from "./sky";
import type { Walker } from "./villagers";

export const BAND = {
  // How many walk with the chief, at most.
  size: 6,
  // How far away someone can be and still be called over.
  call: 14,
  // Seconds standing still before the band gathers round.
  gather: 1.2,
  // Walking and running pace (the chief's is 2.2 and 4).
  walk: 2.3,
  run: 4.4,
};

// `want`: the band is called (G toggles it). `active`: the chief is walking in
// first person. `trail`: where the chief has walked, newest first. `still`:
// seconds the chief has stood still. `helping`: the chief is working (until,
// with what, and where).
export const band = {
  want: true,
  active: false,
  trail: [] as { x: number; z: number }[],
  still: 0,
  size: 0,
  helping: { until: 0, tool: "axe" as "axe" | "pick", at: { x: 0, z: 0 } },
  // What the world is like, for what people say (set by the rig).
  context: { raid: false, hungry: false, rumour: false, era: 0 },
};

// A subtitle: who said what (the leader HUD shows it for a few seconds).
export type BandLine = { who: string; text: string; id: number };
let line: BandLine | null = null;
let lineId = 0;
const listeners = new Set<() => void>();
export const bandLine = () => line;
export function onBandLine(l: () => void) {
  listeners.add(l);
  return () => void listeners.delete(l);
}
const changed = () => {
  for (const l of listeners) l();
};
export function bandSay(who: string, text: string) {
  const mine = { who, text, id: ++lineId };
  line = mine;
  changed();
  setTimeout(() => {
    if (line !== mine) return;
    line = null;
    changed();
  }, 3600);
}

const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];

// What someone in the band might say while walking, by how things are.
function chatter(): string {
  const c = band.context;
  const lines = [
    "Lead on, Chief!",
    "Where are we off to, Chief?",
    "My feet are tired, but I'm with you.",
    "Look at how the village has grown.",
    "The children wanted to come too!",
    "I could walk all day behind you, Chief.",
  ];
  if (c.raid) lines.push("Raiders! Stay close, everyone!", "I'll stand by you, Chief.");
  if (c.hungry) lines.push("My belly's grumbling, Chief.", "We need more food in the pots.");
  if (c.rumour) lines.push("Is it true there's land across the sea?", "The fishers keep talking about what they saw out there.");
  if (daySky.night > 0.5) lines.push("It's getting dark, Chief.", "Look at all those stars.");
  if (c.era >= 1) lines.push("Remember when we lived in caves?");
  return pick(lines);
}

let nextChatter = 0;
let lastCall = 0;
const followers = (list: Walker[]) => list.filter((w) => w.follow !== undefined);
const nameOf = (list: Walker[], w: Walker) => w.cameo ?? villagerName(list.indexOf(w));

// Free someone from the band: back to their own day.
function release(w: Walker) {
  w.follow = undefined;
  w.working = false;
  w.workTool = undefined;
  w.wait = 0.5 + Math.random();
  w.tx = w.x;
  w.tz = w.z;
}

// The point `back` along the chief's trail behind them, and which way the
// trail runs there.
function alongTrail(back: number) {
  let left = back;
  let prev = { x: leader.x, z: leader.z };
  for (const p of band.trail) {
    const d = Math.hypot(p.x - prev.x, p.z - prev.z);
    if (d >= left && d > 0) {
      const k = left / d;
      return { x: prev.x + (p.x - prev.x) * k, z: prev.z + (p.z - prev.z) * k, dx: prev.x - p.x, dz: prev.z - p.z };
    }
    left -= d;
    prev = p;
  }
  // Not walked that far yet: just behind the chief.
  return { x: leader.x + Math.sin(leader.yaw) * back, z: leader.z + Math.cos(leader.yaw) * back, dx: -Math.sin(leader.yaw), dz: -Math.cos(leader.yaw) };
}

// Where follower `slot` wants to be now.
function placeFor(slot: number, ground: Ground) {
  // Standing still a moment: gather round in front of the chief, in an arc.
  // (If that's in a fire or a hut, a little further out, or further round.)
  if (band.still > BAND.gather) {
    const spread = (slot % 2 ? 1 : -1) * (0.4 + Math.floor(slot / 2) * 0.45);
    for (const turn of [0, 0.5, -0.5, 1.1, -1.1])
      for (const r of [1.6 + (slot % 3) * 0.2, 2.4, 3.1]) {
        const a = leader.yaw + spread + turn * Math.sign(spread);
        const p = { x: leader.x - Math.sin(a) * r, z: leader.z - Math.cos(a) * r };
        if (ground.walkable(p.x, p.z)) return { ...p, face: true };
      }
  }
  // Walking: two by two along the way the chief came.
  const row = Math.floor(slot / 2);
  const t = alongTrail(1.35 + row * 0.7);
  const len = Math.hypot(t.dx, t.dz) || 1;
  const side = (slot % 2 ? 1 : -1) * 0.45;
  const p = { x: t.x + (-t.dz / len) * side, z: t.z + (t.dx / len) * side };
  return ground.walkable(p.x, p.z) ? { ...p, face: false } : { x: t.x, z: t.z, face: false };
}

// Every frame (from Villagers): call the band, move it, let the rest react.
// `busy`: someone who can't come (carried, away, hunting, fleeing).
export function stepBand(list: Walker[], ground: Ground, dt: number, now: number, busy: (w: Walker) => boolean) {
  // Not walking in first person, or the band was sent back: everyone free.
  if (!band.active || !band.want) {
    for (const w of followers(list)) release(w);
    for (const w of list) w.wave = false;
    if (band.size) {
      band.size = 0;
      changed();
    }
    return;
  }
  // Too far behind, or something else came up: they go back to their day.
  for (const w of followers(list)) if (Math.hypot(w.x - leader.x, w.z - leader.z) > 26 || busy(w)) release(w);
  // Call people over, nearest first, one at a time.
  const have = followers(list);
  if (have.length < BAND.size && now - lastCall > 350) {
    const free = list
      .filter((w) => w.follow === undefined && !busy(w) && Math.hypot(w.x - leader.x, w.z - leader.z) < BAND.call)
      .sort((a, b) => Math.hypot(a.x - leader.x, a.z - leader.z) - Math.hypot(b.x - leader.x, b.z - leader.z))[0];
    if (free) {
      const taken = new Set(have.map((w) => w.follow));
      let slot = 0;
      while (taken.has(slot)) slot++;
      Object.assign(free, { follow: slot, working: false, workAt: null, goWork: null, sitAt: null, seat: undefined, sitting: false, workTool: undefined });
      lastCall = now;
      if (!have.length) bandSay(nameOf(list, free), pick(["Coming, Chief!", "Wait for us!", "We're with you, Chief!"]));
    }
  }
  const team = followers(list);
  if (band.size !== team.length) {
    band.size = team.length;
    changed();
  }
  for (const w of team) {
    const slot = w.follow!;
    // Helping the chief work: the first two come and swing their own tools.
    const helping = band.helping.until > now && slot < 2;
    let goal: { x: number; z: number; face: boolean };
    if (helping) {
      const a = (slot ? 1 : -1) * 1.2 + Math.atan2(leader.x - band.helping.at.x, leader.z - band.helping.at.z);
      const p = { x: band.helping.at.x + Math.sin(a) * 0.65, z: band.helping.at.z + Math.cos(a) * 0.65 };
      goal = ground.walkable(p.x, p.z) ? { ...p, face: false } : placeFor(slot, ground);
    } else goal = placeFor(slot, ground);
    const dx = goal.x - w.x;
    const dz = goal.z - w.z;
    const d = Math.hypot(dx, dz);
    // Running to catch up; otherwise easing into place.
    const speed = d > 2.4 ? BAND.run : Math.min(BAND.walk, d * 3 + (leader.moving ? 0.6 : 0));
    w.moving = false;
    if (d > 0.04 && dt > 0) {
      const step = Math.min(d, speed * dt);
      const nx = w.x + (dx / d) * step;
      const nz = w.z + (dz / d) * step;
      if (ground.walkable(nx, nz) || !ground.walkable(w.x, w.z)) {
        w.x = nx;
        w.z = nz;
      } else if (ground.walkable(nx, w.z)) w.x = nx;
      else if (ground.walkable(w.x, nz)) w.z = nz;
      w.heading = Math.atan2(dx, dz);
      w.moving = step > 0.004;
    }
    w.y = ground.heightAt(w.x, w.z);
    w.tx = w.x;
    w.tz = w.z;
    w.wait = 1;
    // In place: face the work, or the chief once gathered round.
    if (!w.moving) {
      if (helping) w.heading = Math.atan2(band.helping.at.x - w.x, band.helping.at.z - w.z);
      else if (goal.face) w.heading = Math.atan2(leader.x - w.x, leader.z - w.z);
    }
    w.working = helping && !w.moving;
    w.workTool = w.working ? band.helping.tool : undefined;
    w.wave = false;
  }
  // Everyone else nearby turns to look at the chief, and waves now and then.
  for (const w of list) {
    if (w.follow !== undefined || busy(w)) continue;
    const d = Math.hypot(w.x - leader.x, w.z - leader.z);
    if (d < 4.5 && !w.moving && !w.working && !w.sitting) {
      w.heading = Math.atan2(leader.x - w.x, leader.z - w.z);
      if ((w.greetAt ?? 0) < now - 25000 && d < 3.2) {
        w.greetAt = now;
        w.waveUntil = now + 1800;
        if (Math.random() < 0.35) bandSay(nameOf(list, w), pick(["Hello, Chief!", "Good day, Chief!", "Chief! Over here!", "Safe travels, Chief."]));
      }
    }
    w.wave = (w.waveUntil ?? 0) > now;
  }
  // Now and then, someone in the band says something.
  if (team.length && now > nextChatter) {
    if (nextChatter) {
      const who = team[Math.floor(Math.random() * team.length)];
      bandSay(nameOf(list, who), chatter());
    }
    nextChatter = now + 9000 + Math.random() * 9000;
  }
}

// The chief's path, newest first (from the rig, every frame).
export function trackChief(dt: number) {
  const last = band.trail[0];
  if (!last || Math.hypot(last.x - leader.x, last.z - leader.z) > 0.2) {
    band.trail.unshift({ x: leader.x, z: leader.z });
    if (band.trail.length > 80) band.trail.length = 80;
  }
  band.still = leader.moving ? 0 : band.still + dt;
}
