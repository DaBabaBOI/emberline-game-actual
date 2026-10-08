"use client";

import { useEffect, useState } from "react";
import { ERAS } from "@/game/content";
import { speedrunTime } from "@/game/engine";
import { useGame } from "@/components/civ/game-provider";
import { formatRunTime, postSpeedrun, speedrunFor, topSpeedruns, type SpeedrunRow } from "@/lib/online";
import { UPDATES } from "@/game/updates";

// The speedrun clock in the top bar: real time since the run began, gold once
// it is finished, grey (with the reason) when it can't count. Hover for splits.
export function SpeedrunClock() {
  const { state } = useGame();
  const run = state.speedrun;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!run || run.end) return;
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, [run]);
  if (!run) return null;
  const ms = speedrunTime(state, now);
  const splits = run.splits.map((s) => `${ERAS[s.era]?.name ?? `Era ${s.era}`}: ${formatRunTime(s.ms)}`).join("\n");
  return (
    <span
      className={`font-num px-2 py-0.5 text-base ${run.invalid ? "bg-white/10 text-white/50 line-through" : run.end ? "bg-amber-400 text-[#2b2119]" : "bg-white/10 text-amber-200"}`}
      title={`Speedrun${run.invalid ? ` (not counted: ${run.invalid})` : ""}${splits ? `\n${splits}` : ""}`}
      data-testid="speedrun-clock"
    >
      ⏱ {formatRunTime(ms)}
    </span>
  );
}

// A save changed outside the game: a small, honest label.
export function EditedBadge() {
  const { state } = useGame();
  if (!state.edited) return null;
  return (
    <span className="bg-red-800/80 px-1.5 py-0.5 text-[10px] text-white" title="This save was changed outside the game, so it can't post to the leaderboard or the speedrun records." data-testid="edited-badge">
      Edited save
    </span>
  );
}

// In the end-of-game screen: the run's time and splits, posting it, and the records.
export function SpeedrunPanel() {
  const { state } = useGame();
  const mode = state.mode === "last" ? "last" : "stone";
  const { row, why } = speedrunFor(state, UPDATES[0]?.date ?? "");
  const [posted, setPosted] = useState<"no" | "posting" | "yes" | "failed">("no");
  const [top, setTop] = useState<SpeedrunRow[] | null | undefined>(undefined);
  useEffect(() => {
    let live = true;
    topSpeedruns(mode, 10).then((rows) => live && setTop(rows));
    return () => {
      live = false;
    };
  }, [posted, mode]);
  const run = state.speedrun;
  if (!run) return null;
  return (
    <div className="mt-4 border-t-2 border-stone-300 pt-3" data-testid="speedrun-panel">
      <div className="flex flex-wrap items-baseline gap-3">
        <h3 className="font-pixel text-lg font-semibold">Speedrun</h3>
        <span className="font-num text-3xl text-amber-700">{formatRunTime(speedrunTime(state))}</span>
      </div>
      {run.splits.length > 0 && (
        <ol className="mt-1 flex flex-wrap gap-x-4 text-sm text-stone-600">
          {run.splits.map((s) => (
            <li key={s.era}>
              {ERAS[s.era]?.name}: <span className="font-num text-base">{formatRunTime(s.ms)}</span>
            </li>
          ))}
        </ol>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {row && posted !== "yes" && (
          <button
            type="button"
            disabled={posted === "posting"}
            onClick={async () => {
              setPosted("posting");
              setPosted((await postSpeedrun(row)) ? "yes" : "failed");
            }}
            className="pixel-btn font-pixel bg-amber-300 px-3 py-1 text-sm disabled:opacity-40"
            data-testid="post-speedrun"
          >
            Post {formatRunTime(row.ms)} to the speedrun records
          </button>
        )}
        {posted === "yes" && <span className="text-sm text-emerald-700">Posted!</span>}
        {posted === "failed" && <span className="text-sm text-red-700">Couldn&apos;t post (are you online?).</span>}
        {why && <span className="text-sm text-stone-500">{why}</span>}
      </div>
      <SpeedrunTable rows={top} />
    </div>
  );
}

export function SpeedrunTable({ rows }: { rows: SpeedrunRow[] | null | undefined }) {
  if (rows === undefined) return <p className="mt-2 text-sm text-stone-500">Loading the fastest runs...</p>;
  if (rows === null) return <p className="mt-2 text-sm text-stone-500">The records are offline right now.</p>;
  if (rows.length === 0) return <p className="mt-2 text-sm text-stone-500">No runs posted yet. Be the first!</p>;
  return (
    <table className="mt-2 w-full text-left text-sm" data-testid="speedrun-records">
      <thead className="font-pixel text-stone-600">
        <tr>
          <th className="py-1">#</th>
          <th>Nation</th>
          <th>Time</th>
          <th>Difficulty</th>
        </tr>
      </thead>
      <tbody className="font-num text-base">
        {rows.map((r, i) => (
          <tr key={`${r.nation}-${r.ms}-${i}`} className="border-t border-stone-200">
            <td className="py-0.5">{i + 1}</td>
            <td className="font-sans text-sm">{r.nation}</td>
            <td>{formatRunTime(r.ms)}</td>
            <td className="font-sans text-sm capitalize">{r.difficulty}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
