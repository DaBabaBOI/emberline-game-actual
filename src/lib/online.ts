// Optional online features, backed by Supabase: playtest feedback, a public
// leaderboard and cloud saves. The game never depends on them: every call fails
// quietly (returns null/false) and the game keeps working offline.
//
// The key below is Supabase's *publishable* key. It is meant to ship in the page;
// the database rules decide what it may do: add feedback (never read it), read and
// add leaderboard rows (never change or delete them), and save/load a game only
// through the save_game/load_game functions, by code.
import type { GameState } from "@/game/types";

const SUPABASE_URL = "https://lgfrxrnjexdcjhpwztpy.supabase.co";
const PUBLISHABLE_KEY = "sb_publishable_2ehFe1z5_RD_IxrNcSH1bg_eKQMbV5U";

async function call(path: string, body?: unknown, prefer?: string): Promise<Response | null> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        apikey: PUBLISHABLE_KEY,
        "Content-Type": "application/json",
        ...(prefer ? { Prefer: prefer } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return res.ok ? res : null;
  } catch {
    return null;
  }
}

export function minutesPlayed(state: GameState) {
  return Math.round(((state.tick * 1.5) / 60) * 10) / 10;
}

// The same limits the database enforces (its spam guard), checked here first so
// players get a clear answer without a round trip.
export const FEEDBACK_LIMITS = { minLength: 5, maxLinks: 2, cooldownMs: 60_000, minOpenMs: 3_000 };

export function feedbackProblem(message: string): string | null {
  const text = message.trim();
  if (text.length < FEEDBACK_LIMITS.minLength) return "Please write a little more.";
  if ((text.match(/https?:\/\/|www\./gi) ?? []).length > FEEDBACK_LIMITS.maxLinks) return "Too many links in one message.";
  return null;
}

// Sends feedback. Returns null when it was sent, or why not. The database's
// spam guard (rate limits, repeats, links) has the final word: its reason is
// passed on to the player.
export async function sendFeedback(state: GameState | null, message: string, version: string): Promise<string | null> {
  const text = message.trim().slice(0, 2000);
  const problem = feedbackProblem(text);
  if (problem) return problem;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/feedback`, {
      method: "POST",
      headers: { apikey: PUBLISHABLE_KEY, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({
        message: text,
        nation: state?.nation?.slice(0, 40) ?? null,
        era: state?.era ?? null,
        minutes_played: state ? minutesPlayed(state) : null,
        outcome: state ? (state.lostTo ?? (state.debrief ? state.debrief.tier : "playing")) : null,
        version,
      }),
    });
    if (res.ok) return null;
    // The spam guard's own words (errcode P0001), or a general failure.
    const body = (await res.json().catch(() => null)) as { code?: string; message?: string } | null;
    return body?.code === "P0001" && body.message ? body.message : "Couldn't send it. Try again later.";
  } catch {
    return "Couldn't send it (are you online?). Try again later.";
  }
}

export interface ScoreRow {
  nation: string;
  ending: "thriving" | "costly" | "stripped" | "lost" | "final";
  lost_to: string | null;
  era: number;
  sustainability: number;
  population: number;
  minutes: number;
  difficulty: string;
  created_at?: string;
}

export function scoreFor(state: GameState): ScoreRow | null {
  const d = state.debrief;
  if (!d) return null;
  return {
    nation: (state.nation ?? "The Emberfolk").slice(0, 40),
    ending: d.kind === "loss" ? "lost" : d.tier,
    lost_to: state.lostTo ?? null,
    era: d.era,
    sustainability: Math.round(d.meters.sustainability),
    population: Math.round(d.stats.peakPopulation),
    minutes: minutesPlayed(state),
    difficulty: state.difficulty,
  };
}

export async function postScore(row: ScoreRow): Promise<boolean> {
  return !!(await call("leaderboard", row, "return=minimal"));
}

// The best games so far: highest Sustainability first, then the quickest.
export async function topScores(limit = 10): Promise<ScoreRow[] | null> {
  const res = await call(
    `leaderboard?select=nation,ending,lost_to,era,sustainability,population,minutes,difficulty,created_at&ending=neq.lost&order=sustainability.desc,minutes.asc&limit=${limit}`,
  );
  if (!res) return null;
  try {
    return (await res.json()) as ScoreRow[];
  } catch {
    return null;
  }
}

// Save the whole game; returns a code like "K7PM-2QXA" to load it anywhere.
export async function saveToCloud(state: GameState): Promise<string | null> {
  const res = await call("rpc/save_game", { p_data: state });
  if (!res) return null;
  try {
    const code = (await res.json()) as string;
    return `${code.slice(0, 4)}-${code.slice(4)}`;
  } catch {
    return null;
  }
}

export async function loadFromCloud(code: string): Promise<GameState | null> {
  const clean = code.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  if (clean.length !== 8) return null;
  const res = await call("rpc/load_game", { p_code: clean });
  if (!res) return null;
  try {
    return ((await res.json()) as GameState | null) ?? null;
  } catch {
    return null;
  }
}
