// Multiplayer, backed by Supabase (supabase/multiplayer.sql). Everyone in a
// room plays their own copy of the same island (the room's seed); the
// scoreboard, gifts and raids go through the database. Every write goes through
// an mp_* function that checks the player's secret; anyone may read.
//
// Empty seats are bots. They need no server: every client works out the same
// bot scores, raids and gifts from the room's seed and the time since the start.
import { PUBLISHABLE_KEY, SUPABASE_URL } from "./online";

export type Mode = "race" | "coop";
export type Speed = "quick" | "normal" | "long";

export interface Room {
  code: string;
  mode: Mode;
  speed: Speed;
  seed: number;
  listed: boolean;
  status: "lobby" | "playing" | "done";
  host_name: string;
  created_at: string;
  started_at: string | null;
  ends_at: string | null;
}

export interface Seat {
  seat: number;
  name: string;
  xp: number;
  era: number;
  sustainability: number;
  population: number;
  updated_at: string;
  gone: boolean;
}

export interface MpEvent {
  id: number;
  from_seat: number;
  to_seat: number;
  kind: "gift" | "raid" | "loot" | "chat";
  payload: Record<string, number | string>;
  created_at: string;
}

// Who I am in a room (kept in this browser so a reload can rejoin).
export interface Session {
  code: string;
  player: string;
  secret: string;
  seat: number;
  name: string;
}

const SESSION_KEY = "emberline-mp";

export function saveSession(s: Session | null) {
  try {
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    // storage blocked: the session lasts as long as the page
  }
}

export function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

const headers = { apikey: PUBLISHABLE_KEY, "Content-Type": "application/json" };

// Calls an mp_* function. Returns its result, or the reason it failed.
async function rpc<T>(name: string, body: Record<string, unknown>): Promise<{ data?: T; error?: string }> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, { method: "POST", headers, body: JSON.stringify(body) });
    const json = await res.json().catch(() => null);
    if (!res.ok) return { error: json?.code === "P0001" && json.message ? json.message : "Couldn't reach the game server." };
    return { data: json as T };
  } catch {
    return { error: "Couldn't reach the game server (are you online?)." };
  }
}

async function read<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

type Joined = { code: string; player: string; secret: string; seat: number };

export async function createRoom(mode: Mode, speed: Speed, listed: boolean, name: string) {
  const r = await rpc<Joined>("mp_create_room", { p_mode: mode, p_speed: speed, p_listed: listed, p_name: name });
  return r.data ? { session: { ...r.data, name } as Session } : { error: r.error };
}

export async function joinRoom(code: string, name: string) {
  const r = await rpc<Joined>("mp_join_room", { p_code: code.trim().toUpperCase(), p_name: name });
  return r.data ? { session: { ...r.data, name } as Session } : { error: r.error };
}

export async function startRoom(s: Session) {
  return rpc<{ started_at: string; ends_at: string }>("mp_start_room", { p_player: s.player, p_secret: s.secret });
}

export async function leaveRoom(s: Session) {
  await rpc("mp_leave_room", { p_player: s.player, p_secret: s.secret });
}

export async function reportScore(s: Session, score: { xp: number; era: number; sustainability: number; population: number }) {
  return rpc("mp_update_player", {
    p_player: s.player,
    p_secret: s.secret,
    p_xp: Math.round(score.xp),
    p_era: score.era,
    p_sustainability: Math.round(score.sustainability),
    p_population: Math.floor(score.population),
  });
}

export async function sendEvent(s: Session, to: number, kind: MpEvent["kind"], payload: Record<string, number | string>) {
  return rpc("mp_send_event", { p_player: s.player, p_secret: s.secret, p_to: to, p_kind: kind, p_payload: payload });
}

export async function getRoom(code: string) {
  const rows = await read<Room[]>(`mp_rooms?code=eq.${encodeURIComponent(code)}&select=code,mode,speed,seed,listed,status,host_name,created_at,started_at,ends_at`);
  return rows?.[0] ?? null;
}

export async function getSeats(code: string) {
  return (await read<Seat[]>(`mp_players?room=eq.${encodeURIComponent(code)}&select=seat,name,xp,era,sustainability,population,updated_at,gone&order=seat`)) ?? [];
}

export async function getEvents(code: string, after: number) {
  return (await read<MpEvent[]>(`mp_events?room=eq.${encodeURIComponent(code)}&id=gt.${after}&order=id&limit=50`)) ?? [];
}

// Open rooms anyone may join: listed, waiting, made in the last half hour.
export async function openRooms() {
  const since = new Date(Date.now() - 30 * 60_000).toISOString();
  const rooms = (await read<Room[]>(`mp_rooms?status=eq.lobby&listed=eq.true&created_at=gt.${since}&select=code,mode,speed,host_name,created_at&order=created_at.desc&limit=10`)) ?? [];
  return rooms;
}

export function shareLink(code: string) {
  return `${window.location.origin}${window.location.pathname}?room=${code}`;
}

// ---- Bots ----------------------------------------------------------------

export const BOT_NAMES = ["Ash Valley", "Riverfolk", "Stonewatch", "The Saltmarsh"];

function rand(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

const PACE: Record<Speed, number> = { quick: 3, normal: 2, long: 1 };

// A bot's score `minutes` into the match: a steady player with its own skill,
// a new era every so often, and land health that wanders.
export function botScore(seed: number, seat: number, minutes: number, speed: Speed): Omit<Seat, "updated_at" | "gone" | "name" | "seat"> {
  const r = rand(seed * 7 + seat * 131);
  const skill = 0.75 + r() * 0.5;
  const pace = PACE[speed];
  const era = Math.min(5, Math.floor((minutes * pace * skill) / 9));
  const xp = Math.round(skill * (38 * minutes + 2.2 * minutes * minutes) + era * 200);
  const sustainability = Math.round(Math.max(20, Math.min(95, 65 + 22 * Math.sin(minutes / 3 + seat) - era * 3 * (1 - skill))));
  return { xp, era, sustainability, population: Math.round(8 + minutes * 6 * skill * Math.sqrt(pace)) };
}

// What the bots do: raids (race) or gifts (co-op), each at a set minute, at a
// set human seat. Every client sees the same list.
export function botActions(seed: number, botSeats: number[], humanSeats: number[], mode: Mode, totalMinutes: number) {
  const out: { at: number; from: number; to: number; kind: "raid" | "gift"; size: number }[] = [];
  if (!humanSeats.length) return out;
  for (const b of botSeats) {
    const r = rand(seed * 13 + b * 977);
    for (let at = 4 + r() * 3; at < totalMinutes - 1; at += 4 + r() * 4) {
      const to = humanSeats[Math.floor(r() * humanSeats.length)];
      out.push({ at, from: b, to, kind: mode === "race" ? "raid" : "gift", size: Math.round(3 + at / 3 + r() * 3) });
    }
  }
  return out.sort((a, b) => a.at - b.at);
}
