"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BUILDINGS_BY_ID } from "@/game/content";
import { soilOf } from "@/game/engine";
import { hexDistance, worldToAxial } from "@/game/hex";
import type { IconId } from "@/game/sprites";
import { useGame } from "@/components/civ/game-provider";
import { PixelIcon } from "@/components/civ/pixel-icon";
import { WORK_TOOLS } from "@/components/civ/world/figures";
import { leader } from "@/components/civ/world/leader";
import { grabStore } from "@/components/civ/world/villagers";
import { jobLine, talk, villagerOf, type Line } from "@/lib/villager-talk";

// Talking to a villager, face to face (first person): they greet the Chief in
// their own words, about their own day and how the village is doing; the Chief
// can ask how they are, what's new, or say anything, and send them to work
// somewhere. The game waits while you talk.

const ASKS = [
  { label: "How are you?", say: "How are you doing?" },
  { label: "What's the news?", say: "What's the news in the village?" },
  { label: "Where should you work?", say: "Where do you think you should work?" },
];

export function VillagerTalk({ index, name, onClose }: { index: number; name: string; onClose: () => void }) {
  const { state, dispatch, setAsking } = useGame();
  // Who they are, as they were when the Chief walked up.
  const [villager] = useState(() => villagerOf(index, name, grabStore.walkers[index]));
  const [lines, setLines] = useState<Line[]>([]);
  // They're thinking of what to say from the moment the Chief walks up.
  const [waiting, setWaiting] = useState(true);
  const [draft, setDraft] = useState("");
  const [leaving, setLeaving] = useState(false);
  const asked = useRef(0);
  const latest = useRef(state);
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    latest.current = state;
  });

  const say = async (text: string) => {
    if (waiting || !text) return;
    const history = lines;
    setLines((l) => [...l, { who: "chief", text }]);
    setWaiting(true);
    const { line, offline } = await talk(villager, text, history, latest.current, asked.current);
    if (!offline) asked.current++;
    setLines((l) => [...l, { who: "them", text: line }]);
    setWaiting(false);
  };

  // The game waits while they talk; they greet the Chief first.
  useEffect(() => {
    setAsking(true);
    let live = true;
    void talk(villager, "", [], latest.current, 0).then(({ line, offline }) => {
      if (!live) return;
      if (!offline) asked.current++;
      setLines([{ who: "them", text: line }]);
      setWaiting(false);
    });
    return () => {
      live = false;
      setAsking(false);
    };
  }, [villager, setAsking]);

  // Esc to say goodbye.
  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onClose]);

  // The newest line in view.
  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [lines, waiting]);

  // The workplaces the Chief could send them to, nearest first (not a field
  // lying fallow: there's nothing to do there till it's back).
  const jobs = useMemo(() => {
    const here = worldToAxial(leader.x, leader.z);
    return state.tiles
      .filter((t) => t.building && WORK_TOOLS[t.building] && soilOf(state, t) !== "resting")
      .map((t) => ({ tile: t, d: hexDistance(t, { q: here.q, r: here.r }) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, 6);
  }, [state]);

  const send = (tile: (typeof jobs)[number]["tile"]) => {
    const def = BUILDINGS_BY_ID[tile.building!];
    dispatch({ type: "leaderAssign", tileId: tile.id, who: name });
    // Off they go: they walk there and get to work on arrival.
    const w = grabStore.walkers[index];
    if (w) {
      const a = Math.atan2(w.z - tile.z, w.x - tile.x);
      Object.assign(w, { goWork: tile, tx: tile.x + Math.cos(a) * 0.72, tz: tile.z + Math.sin(a) * 0.72, wait: 0, sitAt: null, seat: undefined, sitting: false, working: false, workAt: null });
    }
    setLines((l) => [...l, { who: "chief", text: `Go and work at the ${def.name}.` }, { who: "them", text: jobLine(villager, def.name) }]);
    setLeaving(true);
    setTimeout(onClose, 1800);
  };

  return (
    <div className="pointer-events-auto fixed inset-0 z-[40] flex items-end justify-center bg-black/35 p-3 md:items-center" data-testid="leader-menu">
      <div className="pixel-panel flex max-h-[86vh] w-[min(94vw,460px)] flex-col p-4">
        <div className="flex items-center gap-2">
          <PixelIcon name="person" size={36} />
          <div className="min-w-0">
            <div className="font-pixel text-lg font-semibold">{name}</div>
            <div className="truncate text-xs text-stone-500">
              {villager.nature} · {villager.job ? `works at the ${villager.job}` : "no work yet"}
            </div>
          </div>
          <button type="button" onClick={onClose} className="font-pixel ml-auto text-sm text-stone-600 underline" data-testid="talk-bye">
            Goodbye
          </button>
        </div>

        {/* The talk so far. */}
        <div ref={scroller} className="mt-3 flex min-h-[5rem] flex-col gap-1.5 overflow-y-auto pr-1" data-testid="talk-lines" aria-live="polite">
          {lines.map((l, i) => (
            <p
              key={i}
              className={
                l.who === "them"
                  ? "max-w-[88%] self-start border-l-4 border-amber-400 bg-amber-50 px-2 py-1 text-sm text-[#2b2119]"
                  : "max-w-[80%] self-end bg-[#4a3b2e] px-2 py-1 text-sm text-white"
              }
              data-who={l.who}
            >
              {l.text}
            </p>
          ))}
          {waiting && (
            <p className="self-start px-2 py-1 text-sm text-stone-500" data-testid="talk-waiting">
              <span className="talk-dots">{name} thinks</span>
            </p>
          )}
        </div>

        {!leaving && (
          <>
            {/* Something to say. */}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {ASKS.map((a) => (
                <button key={a.label} type="button" disabled={waiting} onClick={() => void say(a.say)} className="pixel-btn bg-white px-2 py-1 text-xs hover:bg-amber-50 disabled:opacity-50">
                  {a.label}
                </button>
              ))}
            </div>
            <form
              className="mt-2 flex gap-1.5"
              onSubmit={(e) => {
                e.preventDefault();
                const text = draft.trim();
                if (!text || waiting) return;
                setDraft("");
                void say(text);
              }}
            >
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value.slice(0, 120))}
                placeholder={`Say something to ${name}...`}
                className="min-w-0 flex-1 border-2 border-[#2b2119] bg-white px-2 py-1 text-sm"
                data-testid="talk-input"
              />
              <button type="submit" disabled={waiting || !draft.trim()} className="pixel-btn font-pixel bg-amber-400 px-3 py-1 text-sm text-[#2b2119] disabled:opacity-50">
                Say
              </button>
            </form>

            {/* Send them to work. */}
            <div className="font-pixel mt-3 text-xs font-semibold text-stone-600">Send {name} to work</div>
            {jobs.length === 0 ? (
              <p className="mt-1 text-xs text-stone-500">There is nowhere to work yet. Build a farm, a woodcutter or a quarry first.</p>
            ) : (
              <div className="mt-1 grid grid-cols-2 gap-1.5">
                {jobs.map(({ tile, d }) => {
                  const def = BUILDINGS_BY_ID[tile.building!];
                  return (
                    <button
                      key={tile.id}
                      type="button"
                      onClick={() => send(tile)}
                      className="pixel-btn flex items-center justify-between gap-1 bg-white px-2 py-1 text-left text-xs hover:bg-amber-50"
                      data-testid={`leader-job-${tile.building}`}
                    >
                      <span className="flex min-w-0 items-center gap-1.5">
                        <PixelIcon name={def.icon as IconId} size={16} />
                        <span className="truncate">{def.name}</span>
                      </span>
                      <span className="shrink-0 text-[10px] text-stone-500">{d === 0 ? "here" : `${d} away`}</span>
                    </button>
                  );
                })}
              </div>
            )}
            <p className="mt-1 text-[11px] text-stone-500">Whoever you send works faster there for a while.</p>
          </>
        )}
      </div>
    </div>
  );
}
