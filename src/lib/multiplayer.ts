// Multiplayer, backed by Supabase (supabase/multiplayer.sql). Everyone in a
// room plays their own copy of the same island (the room's seed); the
// scoreboard, gifts and raids go through the database. Every write goes through
// an mp_* function that checks the player's secret; anyone may read.
//
// Empty seats are bots. They need no server: every client works out the same
// bot scores, raids and gifts from the room's seed and the time since the start.
import { MP } from "@/game/content";
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

// Race: bots keep pace with the people in the room instead of a fixed curve.
// Each aims between the humans' average XP and a typical player's (weighted
// `ADAPT.follow` toward the humans, so playing well still pulls you ahead),
// times its own share plus a slow wobble so the lead changes hands; never above
// its own pace, and never an era ahead of the best human. The humans' numbers come
// from the database, so every browser works out the same bot scores.
export const ADAPT = { share: [0.82, 1.02] as const, wobble: 0.1, period: 2.2, follow: 0.8, typical: 0.8, raidShare: [0.6, 0.9] as const };

export function adaptiveBotScore(seed: number, seat: number, minutes: number, speed: Speed, humans: { xp: number; era: number }[]) {
  const base = botScore(seed, seat, minutes, speed);
  if (!humans.length) return base;
  const r = rand(seed * 17 + seat * 389)();
  const share = ADAPT.share[0] + r * (ADAPT.share[1] - ADAPT.share[0]) + ADAPT.wobble * Math.sin(minutes / ADAPT.period + seat * 1.7);
  const avg = humans.reduce((sum, h) => sum + Math.max(0, h.xp), 0) / humans.length;
  const typical = ADAPT.typical * (38 * minutes + 2.2 * minutes * minutes);
  const aim = Math.pow(Math.max(1, avg), ADAPT.follow) * Math.pow(Math.max(1, typical), 1 - ADAPT.follow);
  const best = Math.max(...humans.map((h) => h.era));
  return { ...base, xp: Math.round(Math.min(base.xp, aim * share)), era: Math.min(base.era, best) };
}

// How many warriors a bot's raid sends: what it planned, but at most a share of
// our defense (so a town with warriors can always beat it), and only a couple
// against a town with none.
export function botRaidSize(seed: number, seat: number, planned: number, defense: number) {
  const r = rand(seed * 29 + seat * 613)();
  const share = ADAPT.raidShare[0] + r * (ADAPT.raidShare[1] - ADAPT.raidShare[0]);
  // `defense` is in strength; each raider is worth MP.warriorStrength.
  const fair = Math.floor((defense * share) / MP.warriorStrength);
  return Math.max(1, Math.min(planned, Math.max(2, fair)));
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

// ---- Chat ------------------------------------------------------------------

export const CHAT = { max: 140, keep: 40, quick: ["Hi!", "Good luck!", "Nice!", "Thanks!", "Watch out!", "Good game!"] };

// A few common swear words, masked (this is played in schools). Not a full
// filter: the 20-a-minute limit on the server keeps spam down too.
const MASK = /\b(fuck\w*|shit\w*|bitch\w*|cunt\w*|dick\w*|asshole\w*|bastard\w*|slut\w*|whore\w*|piss\w*)\b/gi;

export function cleanChat(text: string) {
  return text.replace(/\s+/g, " ").trim().slice(0, CHAT.max).replace(MASK, (w) => w[0] + "*".repeat(w.length - 1));
}

export interface ChatLine {
  key: string;
  from: string;
  text: string;
  mine: boolean;
  // News from the game (a battle's result), not something a player typed.
  system?: boolean;
}

// Chat messages in a batch of events: to everyone (seat -1) or to me. My own
// are left out (they show as soon as I send them) unless `withMine`: on the
// first read, to bring back the history.
export function chatLines(events: MpEvent[], mySeat: number, nameOf: (seat: number) => string, withMine = false): ChatLine[] {
  return events
    .filter((e) => e.kind === "chat" && (withMine || e.from_seat !== mySeat) && (e.to_seat === -1 || e.to_seat === mySeat || e.from_seat === mySeat))
    .map((e) => ({ key: `e${e.id}`, from: nameOf(e.from_seat), text: cleanChat(String(e.payload.text ?? "")), mine: e.from_seat === mySeat }))
    .filter((l) => l.text);
}

export async function sendChat(s: Session, text: string) {
  const clean = cleanChat(text);
  if (!clean) return { error: "Type a message first." };
  return sendEvent(s, -1, "chat", { text: clean });
}

// ---- Battle news -------------------------------------------------------------
// When a raid on a player's town comes to blows, their browser tells the room
// ("start"), then how it ended ("end"), so the attacker can watch, anyone else
// can choose to, and everyone hears the result. They travel as chat events with
// no text (the chat leaves those out), so the database needs nothing new.

export interface Fight {
  id: string;
  att: string;
  def: string;
  attSeat: number;
  defSeat: number;
  raiders: number;
  warriors: number;
  // Set when it's over: the defenders held, or they never fought (hid or paid).
  held?: boolean;
  avoided?: boolean;
}

export function sendFight(s: Session, phase: "start" | "end", f: Fight) {
  return sendEvent(s, -1, "chat", {
    battle: phase,
    id: f.id,
    att: f.att.slice(0, 40),
    def: f.def.slice(0, 40),
    attSeat: f.attSeat,
    defSeat: f.defSeat,
    raiders: Math.round(f.raiders),
    warriors: Math.round(f.warriors),
    held: f.held ? 1 : 0,
    avoided: f.avoided ? 1 : 0,
  });
}

// The battle news in a batch of events (including my own: a raid I made on a bot).
export function fightNews(events: MpEvent[]): { phase: "start" | "end"; fight: Fight }[] {
  return events
    .filter((e) => e.kind === "chat" && (e.payload.battle === "start" || e.payload.battle === "end"))
    .map((e) => {
      const p = e.payload;
      return {
        phase: p.battle as "start" | "end",
        fight: {
          id: String(p.id),
          att: String(p.att),
          def: String(p.def),
          attSeat: Number(p.attSeat),
          defSeat: Number(p.defSeat),
          raiders: Number(p.raiders) || 0,
          warriors: Number(p.warriors) || 0,
          held: p.battle === "end" ? Number(p.held) === 1 : undefined,
          avoided: Number(p.avoided) === 1,
        },
      };
    });
}

// One line for the result, for the chat and the viewer.
export function fightResult(f: Fight, mySeat: number) {
  const att = f.attSeat === mySeat ? "Your" : `${f.att}'s`;
  const def = f.defSeat === mySeat ? "you" : f.def;
  if (f.avoided) return `${f.defSeat === mySeat ? "You" : f.def} didn't fight ${att === "Your" ? "your" : att} raiders (hid or paid them off).`;
  return f.held ? `${f.defSeat === mySeat ? "You" : f.def} drove off ${att === "Your" ? "your" : att} raiders.` : `${att} raiders beat ${def}.`;
}
