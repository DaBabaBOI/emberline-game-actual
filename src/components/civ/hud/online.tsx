"use client";

import { useEffect, useState } from "react";
import { UPDATES } from "@/game/updates";
import type { GameState } from "@/game/types";
import { useGame } from "@/components/civ/game-provider";
import { AccessibilityMenuSection } from "@/components/accessibility-settings";
import { FEEDBACK_LIMITS, postScore, saveToCloud, scoreFor, sendFeedback, topScores, type ScoreRow } from "@/lib/online";

const VERSION = UPDATES[0]?.date ?? "dev";

// A small form that sends a note to the team (playtest feedback). Spam guard:
// a hidden "website" field only bots fill in, a form sent within a few seconds
// of opening, and a minute's wait between notes (the database checks again).
const LAST_SENT = "emberline-feedback-sent";

export function FeedbackForm({ state, onDone }: { state: GameState | null; onDone?: () => void }) {
  const [text, setText] = useState("");
  const [trap, setTrap] = useState("");
  const [openedAt] = useState(() => Date.now());
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);
  if (status === "sent") return <p className="text-xs text-emerald-300">Thank you! The team will read it.</p>;
  return (
    <form
      className="flex flex-col gap-1.5"
      onSubmit={async (e) => {
        e.preventDefault();
        // A bot: say thanks and send nothing.
        if (trap || Date.now() - openedAt < FEEDBACK_LIMITS.minOpenMs) {
          setStatus("sent");
          return;
        }
        let last = 0;
        try {
          last = Number(localStorage.getItem(LAST_SENT) ?? 0);
        } catch {
          // No storage: the database still limits it.
        }
        if (Date.now() - last < FEEDBACK_LIMITS.cooldownMs) {
          setError("Please wait a minute before sending more.");
          return;
        }
        setStatus("sending");
        setError(null);
        const why = await sendFeedback(state, text, VERSION);
        if (why) {
          setError(why);
          setStatus("idle");
          return;
        }
        try {
          localStorage.setItem(LAST_SENT, String(Date.now()));
        } catch {
          // Fine without it.
        }
        setStatus("sent");
        onDone?.();
      }}
    >
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={2000}
        rows={3}
        placeholder="What was fun, confusing or broken?"
        className="w-full resize-none border-2 border-[#140e0a] bg-[#fbf7ef] p-1.5 font-sans text-xs text-stone-900"
        data-testid="feedback-text"
      />
      {/* Hidden from people (and screen readers); bots fill every field. */}
      <input
        type="text"
        name="website"
        value={trap}
        onChange={(e) => setTrap(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute -left-[9999px] h-0 w-0 opacity-0"
      />
      <button
        type="submit"
        disabled={!text.trim() || status === "sending"}
        className="pixel-btn self-start bg-emerald-700 px-2 py-1 text-xs text-white disabled:opacity-40"
      >
        {status === "sending" ? "Sending..." : "Send feedback"}
      </button>
      {error && (
        <p className="text-xs text-red-300" data-testid="feedback-error">
          {error}
        </p>
      )}
    </form>
  );
}

// The top-bar menu: save to the cloud (get a code) and send feedback.
export function GameMenu() {
  const { state } = useGame();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [saving, setSaving] = useState<"idle" | "saving" | "failed">("idle");
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={"px-2 py-0.5 text-xs " + (open ? "bg-amber-400 text-[#2b2119]" : "bg-white/10 hover:bg-white/20")}
        data-testid="game-menu"
      >
        Menu
      </button>
      {open && (
        <div className="pixel-panel-dark absolute right-0 top-8 z-30 flex w-64 flex-col gap-3 p-3 text-left text-xs">
          <div className="flex flex-col gap-1">
            <span className="font-semibold text-amber-300">Cloud save</span>
            <span className="text-white/70">Get a code to continue this game on another device.</span>
            {code ? (
              <span className="font-num text-2xl tracking-widest text-white" data-testid="cloud-code">
                {code}
              </span>
            ) : (
              <button
                type="button"
                disabled={saving === "saving"}
                onClick={async () => {
                  setSaving("saving");
                  const c = await saveToCloud(state);
                  setSaving(c ? "idle" : "failed");
                  setCode(c);
                }}
                className="pixel-btn self-start bg-[#4a3b2e] px-2 py-1 text-white disabled:opacity-40"
              >
                {saving === "saving" ? "Saving..." : "Save to the cloud"}
              </button>
            )}
            {saving === "failed" && <span className="text-red-300">Couldn&apos;t save (are you online?).</span>}
          </div>
          <div className="flex flex-col gap-1">
            <span className="font-semibold text-amber-300">Feedback</span>
            <FeedbackForm state={state} />
          </div>
          <div className="flex flex-col gap-1">
            <span className="font-semibold text-amber-300">Accessibility</span>
            <AccessibilityMenuSection />
          </div>
        </div>
      )}
    </div>
  );
}

// On the debrief: post this game to the leaderboard and show the best games.
export function LeaderboardPanel() {
  const { state } = useGame();
  const row = scoreFor(state);
  const [posted, setPosted] = useState<"no" | "posting" | "yes" | "failed">("no");
  const [top, setTop] = useState<ScoreRow[] | null | undefined>(undefined);

  useEffect(() => {
    let live = true;
    topScores(5).then((rows) => live && setTop(rows));
    return () => {
      live = false;
    };
  }, [posted]);

  if (!row) return null;
  return (
    <div className="mt-4 border-t-2 border-stone-300 pt-3" data-testid="leaderboard-panel">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-pixel text-lg font-semibold">Leaderboard</h3>
        {row.ending === "lost" ? (
          <span className="text-sm text-stone-500">Only villages that survive make the board.</span>
        ) : posted === "yes" ? (
          <span className="text-sm text-emerald-700">Posted!</span>
        ) : (
          <button
            type="button"
            disabled={posted === "posting"}
            onClick={async () => {
              setPosted("posting");
              setPosted((await postScore(row)) ? "yes" : "failed");
            }}
            className="pixel-btn font-pixel bg-amber-300 px-3 py-1 text-sm disabled:opacity-40"
          >
            Post {row.nation} to the leaderboard
          </button>
        )}
        {posted === "failed" && <span className="text-sm text-red-700">Couldn&apos;t post (are you online?).</span>}
      </div>
      <LeaderboardTable rows={top} />
    </div>
  );
}

export function LeaderboardTable({ rows }: { rows: ScoreRow[] | null | undefined }) {
  if (rows === undefined) return <p className="mt-2 text-sm text-stone-500">Loading the best games...</p>;
  if (rows === null) return <p className="mt-2 text-sm text-stone-500">The leaderboard is offline right now.</p>;
  if (rows.length === 0) return <p className="mt-2 text-sm text-stone-500">No games posted yet. Be the first!</p>;
  return (
    <table className="mt-2 w-full text-left text-sm" data-testid="leaderboard">
      <thead className="font-pixel text-stone-600">
        <tr>
          <th className="py-1">#</th>
          <th>Nation</th>
          <th>Land</th>
          <th>Era</th>
          <th>People</th>
          <th>Minutes</th>
        </tr>
      </thead>
      <tbody className="font-num text-base">
        {rows.map((r, i) => (
          <tr key={`${r.nation}${r.created_at ?? i}`} className="border-t border-stone-200">
            <td className="py-0.5">{i + 1}</td>
            <td className="font-sans text-sm">{r.nation}</td>
            <td>{r.sustainability}</td>
            <td>{r.era + 1}</td>
            <td>{r.population}</td>
            <td>{Math.round(r.minutes)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
