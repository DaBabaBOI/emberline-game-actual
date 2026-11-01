"use client";

import { useEffect } from "react";
import { useGame } from "@/components/civ/game-provider";
import { PixelIcon } from "@/components/civ/pixel-icon";
import { useLeader } from "@/components/civ/world/leader";
import { COUNCIL, LAWS } from "@/game/council";
import { councilMembers, kingdomInfo, moodOf, secs } from "@/game/engine";
import type { IconId } from "@/game/sprites";
import type { LawId } from "@/game/types";
import { cn } from "@/lib/utils";

const MOOD_STYLE = { friendly: "bg-emerald-600", wary: "bg-amber-500", hostile: "bg-red-700" } as const;

// The Council of Islands: who sits on it, our standing, the resolutions in
// force (and how to keep them), when it meets next; join or leave.
export function CouncilPanel() {
  const { state, dispatch, setPanel } = useGame();
  const c = state.council;
  if (!c) return null;
  const members = councilMembers(state);
  const until = (t: number) => Math.max(1, Math.round(secs(Math.max(0, t - state.tick)) / 60));
  return (
    <div className="pointer-events-auto absolute inset-0 z-[27] flex items-center justify-center bg-black/30" data-testid="council-panel">
      <div className="pixel-panel max-h-[90vh] w-[min(95vw,660px)] overflow-y-auto p-4 text-xs md:text-sm">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-pixel flex items-center gap-2 text-lg font-bold">
            <PixelIcon name="dove" size={22} />
            Council of Islands
          </h3>
          <button type="button" onClick={() => setPanel(null)} className="font-pixel text-sm underline">
            Close
          </button>
        </div>
        <p className="text-[11px] text-stone-600">
          The peoples of the sea meet here to keep the peace and work together, a little like the United Nations. Every few minutes the Council votes on a resolution. When one passes, every member must keep
          it for a while: keep it and our standing rises, break it and it falls. Good standing warms every member to us; very low standing brings sanctions (half the treaty trade). Poorer members get aid.
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          {c.joined ? (
            <>
              <span className="font-pixel bg-emerald-700 px-2 py-0.5 text-white">We are a member</span>
              <button type="button" disabled={!!c.vote} onClick={() => dispatch({ type: "leaveCouncil" })} className="pixel-btn bg-[#4a3b2e] px-2 py-0.5 text-[11px] text-white" data-testid="council-leave">
                Leave the Council
              </button>
            </>
          ) : (
            <button type="button" onClick={() => dispatch({ type: "joinCouncil" })} className="pixel-btn font-pixel bg-emerald-700 px-3 py-1 text-white" data-testid="council-join">
              Join the Council
            </button>
          )}
          <span className="ml-auto text-[11px]">Next meeting in about {until(c.next)} min</span>
        </div>

        {/* Standing. */}
        <div className="mt-2">
          <div className="flex justify-between text-[11px]">
            <span>Our standing</span>
            <span className="font-num">{Math.round(c.standing)}</span>
          </div>
          <div className="relative h-3 w-full border-2 border-black/70 bg-gradient-to-r from-red-600 via-stone-300 to-emerald-600" data-testid="council-standing">
            <div className="absolute -top-1 h-4 w-1 bg-black" style={{ left: `${(c.standing + 100) / 2}%` }} />
          </div>
          <div className="flex justify-between text-[10px] text-stone-500">
            <span>Shunned ({COUNCIL.shunned}): sanctions</span>
            <span>Respected ({COUNCIL.respected}): friends</span>
          </div>
        </div>

        {/* In force. */}
        <h4 className="font-pixel mt-3 font-semibold">Resolutions in force</h4>
        {c.laws.length ? (
          <ul className="mt-1 grid gap-1.5">
            {c.laws.map((l) => (
              <li key={l.id} className={cn("flex items-start gap-2 border-2 p-1.5", l.broken ? "border-red-700 bg-red-50" : "border-[#140e0a] bg-white/60")}>
                <PixelIcon name={LAWS[l.id].icon as IconId} size={20} />
                <span className="flex-1">
                  <span className="font-pixel block font-semibold">
                    {LAWS[l.id].name} <span className="font-normal text-stone-500">· about {until(l.until)} min left</span>
                  </span>
                  <span className="block text-[11px]">{LAWS[l.id].ask}</span>
                  <span className="block text-[11px] text-stone-600">{l.broken ? "We broke it." : c.joined ? `To keep it: ${LAWS[l.id].keep}` : "We're not a member: it doesn't bind us."}</span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[11px] text-stone-500">None right now.</p>
        )}
        {c.last && (
          <p className="mt-2 text-[11px] text-stone-600">
            Last vote: {LAWS[c.last.law].name}, {c.last.yes} for and {c.last.no} against: {c.last.passed ? "passed" : "failed"}
            {c.last.ours !== undefined ? ` (we voted ${c.last.ours ? "for" : "against"})` : ""}.
          </p>
        )}

        {/* Members. */}
        <h4 className="font-pixel mt-3 font-semibold">Members</h4>
        <div className="mt-1 grid gap-1 sm:grid-cols-2">
          {members.map((id) => {
            const info = kingdomInfo(state, id);
            const mood = moodOf(state.kingdoms![id].mood);
            return (
              <div key={id} className="flex items-center gap-1.5 border-2 border-[#140e0a] bg-white/60 px-1.5 py-1 text-[11px]">
                <span className="inline-block h-3 w-3 shrink-0 border border-[#140e0a]" style={{ background: info.sail }} />
                <span className="flex-1 truncate capitalize">{info.name.replace(/^the /, "")}</span>
                <span className="text-stone-500">{info.temper}</span>
                <span className={cn("px-1 text-white", MOOD_STYLE[mood])}>{mood}</span>
              </div>
            );
          })}
        </div>
        <p className="font-pixel mt-3 flex items-start gap-1.5 border-l-4 border-[#1e4f9c] bg-[#1e4f9c]/5 px-2 py-1.5 text-[11px] text-[#1e4f9c]">
          <PixelIcon name="leaf" size={14} />
          <span>In the real world: the United Nations has 193 member countries. Its General Assembly votes on resolutions, and its 17 Sustainable Development Goals are what all of them agreed to work towards.</span>
        </p>
      </div>
    </div>
  );
}

// The Council meets: the resolution, how the members voted, and our vote (the
// game waits). In first person the mouse is freed, and 1 or 2 votes.
export function CouncilVote() {
  const { state, dispatch } = useGame();
  const fp = useLeader().view === "fp";
  const vote = state.council?.vote;
  useEffect(() => {
    if (!vote) return;
    if (document.pointerLockElement) document.exitPointerLock();
    const key = (e: KeyboardEvent) => {
      if (e.key === "1") dispatch({ type: "councilVote", yes: true });
      if (e.key === "2") dispatch({ type: "councilVote", yes: false });
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [vote, dispatch]);
  if (!vote) return null;
  const law = LAWS[vote.law as LawId];
  const yes = Object.values(vote.votes).filter(Boolean).length;
  const no = Object.keys(vote.votes).length - yes;
  return (
    <div className={cn("pointer-events-auto absolute inset-0 z-30 flex justify-center bg-black/30", fp ? "items-end pb-[7.5rem]" : "items-center")} data-testid="council-vote">
      <div className="pixel-panel w-[min(94vw,460px)] p-4">
        <p className="font-pixel text-xs text-stone-600">{fp ? "A messenger brings word: the Council of Islands is meeting." : "The Council of Islands is meeting."}</p>
        <h3 className="font-pixel mt-1 flex items-center gap-2 text-xl font-bold">
          <PixelIcon name={law.icon as IconId} size={28} />
          {law.name}
        </h3>
        <p className="mt-1 text-sm">{law.ask}</p>
        <p className="mt-1 text-xs text-stone-600">If it passes, for us: {law.keep}</p>
        <div className="mt-2 grid gap-1">
          {Object.entries(vote.votes).map(([id, v]) => (
            <div key={id} className="flex items-center gap-1.5 text-xs">
              <span className="inline-block h-3 w-3 border border-[#140e0a]" style={{ background: kingdomInfo(state, id).sail }} />
              <span className="flex-1 capitalize">{kingdomInfo(state, id).name.replace(/^the /, "")}</span>
              <span className={cn("font-pixel px-1.5 text-white", v ? "bg-emerald-600" : "bg-red-700")}>{v ? "For" : "Against"}</span>
            </div>
          ))}
        </div>
        <p className="mt-1 text-xs text-stone-600">
          So far {yes} for, {no} against. Our vote {yes === no ? "decides it" : yes > no + 1 || no > yes + 1 ? "won't change the result, but they'll remember it" : "could tip it"}.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => dispatch({ type: "councilVote", yes: true })} className="pixel-btn font-pixel bg-emerald-700 px-3 py-2 text-sm text-white" data-testid="council-yes">
            {fp && <span className="mr-1 text-amber-200">1</span>}Vote for
          </button>
          <button type="button" onClick={() => dispatch({ type: "councilVote", yes: false })} className="pixel-btn font-pixel bg-red-800 px-3 py-2 text-sm text-white" data-testid="council-no">
            {fp && <span className="mr-1 text-amber-200">2</span>}Vote against
          </button>
        </div>
      </div>
    </div>
  );
}
