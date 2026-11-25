"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BRANCHES, BUILDINGS_BY_ID, ERAS, TREE, TREE_BY_ID, LAST_TUTORIAL, LAST } from "@/game/content";
import { goalProgress, goalsMet, newResearch, notInventedYet, perSecond, production, researchCost, tutorialLocked } from "@/game/engine";
import type { Branch, GameState, TreeNode } from "@/game/types";
import type { IconId } from "@/game/sprites";
import { useGame } from "@/components/civ/game-provider";
import { PixelIcon } from "@/components/civ/pixel-icon";
import { playSfx } from "@/lib/audio";
import { cn } from "@/lib/utils";

// The Advancements tree: an era at a time, a row for each branch, every
// advancement a card (its icon, what it costs and how close we are, its goal),
// lines from what it needs. Above, the best next steps; filters by branch or
// "ready to research". Click a card and its whole path lights up (what it
// needs, what it leads to), and the bar below tells everything about it.

const NODE_W = 178;
const NODE_H = 86;
const COL_GAP = 58;
const ROW_GAP = 16;
const LABEL_W = 132;
const PAD = 20;

const ERA_ICONS: IconId[] = ["flame", "amphora", "column", "castle", "factory", "rocket"];
const BRANCH_ICONS: Record<Branch | "root", IconId> = {
  root: "flame",
  knowledge: "book",
  construction: "hammer",
  energy: "bulb",
  transport: "cart",
  military: "sword",
  culture: "scroll",
};

type Status = "done" | "available" | "locked" | "soon" | "secret" | "future";

function statusOf(state: GameState, n: TreeNode): Status {
  if (state.researched.includes(n.id)) return "done";
  if (n.secret) return "secret";
  if (n.comingSoon) return "soon";
  if (n.requires.every((r) => state.researched.includes(r))) return notInventedYet(state, n.id) ? "future" : "available";
  return "locked";
}
// Can be researched right now: open, goals met, enough Knowledge.
const ready = (state: GameState, n: TreeNode) => statusOf(state, n) === "available" && goalsMet(state, n.id) && state.resources.knowledge >= researchCost(state, n);
// Its icon: what it unlocks, or its branch's.
const iconOf = (n: TreeNode): IconId => (n.unlocks?.[0] && BUILDINGS_BY_ID[n.unlocks[0]] ? (BUILDINGS_BY_ID[n.unlocks[0]].icon as IconId) : BRANCH_ICONS[n.branch]);
const colourOf = (n: TreeNode) => (n.branch === "root" ? "#fbbf24" : BRANCHES.find((b) => b.id === n.branch)?.color ?? "#fbbf24");
// What it opens up next (everything that lists it as needed).
const LEADS = TREE.reduce<Record<string, TreeNode[]>>((m, n) => {
  for (const r of n.requires) (m[r] ??= []).push(n);
  return m;
}, {});
// Everything it needs, all the way back; and everything that needs it, all the way on.
function chainOf(id: string) {
  const up = new Set<string>();
  const down = new Set<string>();
  const climb = (x: string) => {
    for (const r of TREE_BY_ID[x]?.requires ?? []) {
      if (up.has(r)) continue;
      up.add(r);
      climb(r);
    }
  };
  const fall = (x: string) => {
    for (const n of LEADS[x] ?? []) {
      if (down.has(n.id)) continue;
      down.add(n.id);
      fall(n.id);
    }
  };
  climb(id);
  fall(id);
  return { up, down };
}

// How far through its goals (0-1), for sorting and the card's bar.
function goalShare(state: GameState, id: string) {
  const goals = goalProgress(state, id);
  if (!goals.length) return 1;
  return goals.reduce((s, g) => s + Math.min(1, g.have / Math.max(1, g.need)), 0) / goals.length;
}

// The first unfinished goal on a card, with its progress (or "Goal met").
function GoalLine({ state, nodeId, reachable }: { state: GameState; nodeId: string; reachable: boolean }) {
  const goals = goalProgress(state, nodeId);
  // Build to Last: advancements only cost Knowledge, so there are no goals to show.
  if (!goals.length || state.mode === "last") return null;
  const next = goals.find((g) => !g.done);
  const left = goals.filter((g) => !g.done).length;
  return (
    <span className={cn("block truncate text-[10px]", next ? "text-amber-200/90" : "text-emerald-300")}>
      {!next
        ? "Goal met"
        : reachable
          ? `${next.label} ${next.have}/${next.need}${left > 1 ? ` (+${left - 1})` : ""}`
          : `Goal: ${next.label} ${next.need}`}
    </span>
  );
}

interface Placed {
  node: TreeNode;
  x: number;
  y: number;
}

// Lays out one era: a row per branch (the root sits in its own row on top),
// columns by how deep a node is within this era.
function layoutEra(era: number, hide: string[] = []) {
  const nodes = TREE.filter((n) => n.era === era && !hide.includes(n.id));
  const inEra = new Set(nodes.map((n) => n.id));
  const depth: Record<string, number> = {};
  const depthOf = (id: string): number => {
    if (depth[id] !== undefined) return depth[id];
    const local = TREE_BY_ID[id].requires.filter((r) => inEra.has(r));
    depth[id] = local.length ? 1 + Math.max(...local.map(depthOf)) : 0;
    return depth[id];
  };
  nodes.forEach((n) => depthOf(n.id));

  const rows = [...(nodes.some((n) => n.branch === "root") ? [{ id: "root" as const, name: "Origins", color: "#fbbf24" }] : []), ...BRANCHES];
  const placed: Record<string, Placed> = {};
  let y = PAD;
  const rowTops: { id: Branch | "root"; name: string; color: string; y: number; h: number }[] = [];
  let maxDepth = 0;
  for (const row of rows) {
    const inRow = nodes.filter((n) => n.branch === row.id);
    if (!inRow.length) continue;
    const perCol: Record<number, number> = {};
    let tallest = 1;
    for (const n of inRow) {
      const d = depthOf(n.id);
      maxDepth = Math.max(maxDepth, d);
      const slot = perCol[d] ?? 0;
      perCol[d] = slot + 1;
      tallest = Math.max(tallest, slot + 1);
      placed[n.id] = { node: n, x: LABEL_W + PAD + d * (NODE_W + COL_GAP), y: y + slot * (NODE_H + 10) };
    }
    const h = tallest * (NODE_H + 10) - 10;
    rowTops.push({ ...row, y, h });
    y += h + ROW_GAP;
  }
  return { placed, rowTops, width: LABEL_W + PAD * 2 + (maxDepth + 1) * (NODE_W + COL_GAP), height: y + PAD };
}

export function TreeOverlay() {
  const { state, dispatch, setPanel } = useGame();
  const [era, setEra] = useState(state.era);
  const [focus, setFocus] = useState<string | null>(null);
  // Filters: hide branches; only what can be researched now.
  const [hidden, setHidden] = useState<Branch[]>([]);
  const [onlyReady, setOnlyReady] = useState(false);
  // The card that was just discovered (a burst on it).
  const [burst, setBurst] = useState<string | null>(null);
  const hide = useMemo(() => (state.mode === "last" ? LAST.hiddenTech : []), [state.mode]);
  const { placed, rowTops, width, height } = useMemo(() => layoutEra(era, hide), [era, hide]);
  const locked = tutorialLocked(state, "advancements");
  // What's new since last time: marked on its card while this is open, and
  // counted as seen from now on.
  const [fresh] = useState(() => newResearch(state).map((n) => n.id));
  useEffect(() => {
    if (fresh.length) dispatch({ type: "seeTech", ids: fresh });
  }, [fresh, dispatch]);
  // Build to Last's guide: opening Advancements is one of its steps.
  useEffect(() => {
    if (state.lastStep !== undefined && LAST_TUTORIAL[state.lastStep]?.id === "advancements") dispatch({ type: "lastStep", from: state.lastStep });
  }, [state.lastStep, dispatch]);

  const focused = focus ? TREE_BY_ID[focus] : null;
  const focusStatus = focused ? statusOf(state, focused) : null;
  const chain = useMemo(() => (focus ? chainOf(focus) : null), [focus]);
  const eraStats = (i: number) => {
    const list = TREE.filter((n) => n.era === i && !n.secret && !hide.includes(n.id));
    return { done: list.filter((n) => state.researched.includes(n.id)).length, all: list.length };
  };
  // The best next steps, from any era so far: ready ones first, then the
  // closest to their goals, then the cheapest.
  const next = TREE.filter((n) => n.era <= state.era && !hide.includes(n.id) && statusOf(state, n) === "available")
    .sort((a, b) => Number(ready(state, b)) - Number(ready(state, a)) || goalShare(state, b.id) - goalShare(state, a.id) || researchCost(state, a) - researchCost(state, b))
    .slice(0, 4);

  const research = (id: string) => {
    dispatch({ type: "research", nodeId: id });
    setBurst(id);
    playSfx("discover");
    setTimeout(() => setBurst((b) => (b === id ? null : b)), 1400);
  };
  const jump = (id: string) => {
    const n = TREE_BY_ID[id];
    if (!n) return;
    setEra(n.era);
    setFocus(id);
  };
  const shown = (n: TreeNode) => !hidden.includes(n.branch as Branch) && (!onlyReady || statusOf(state, n) === "available");

  // Drag the tree to look around it.
  const area = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; left: number; top: number; moved: boolean } | null>(null);

  return (
    <div className="pointer-events-auto absolute inset-0 z-20 flex flex-col bg-[#1f1812]/95 text-[#fdf6e3]">
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 pt-2 md:gap-4 md:px-5 md:pt-3">
        <h2 className="font-pixel flex items-center gap-2 text-lg font-semibold md:text-2xl">
          <PixelIcon name="star" size={24} />
          Advancements
        </h2>
        <div className="font-pixel flex flex-wrap items-center gap-2 text-xs md:gap-4 md:text-sm">
          <span
            className="flex items-center gap-1"
            title="Knowledge comes from milestones (firsts, growth, victories). Elder's Huts, Scribe Schools and literacy add a little all the time."
          >
            <PixelIcon name="bulb" size={16} />
            <span className="font-num">{Math.floor(state.resources.knowledge)}</span> knowledge
            <span className="font-num text-[11px] opacity-70">(+{perSecond(production(state).knowledge).toFixed(2)}/s)</span>
          </span>
          <span>
            Secrets found: <span className="font-num">{state.secretsFound.length}</span>
          </span>
          <button type="button" data-guide="tree-close" onClick={() => setPanel(null)} className="pixel-btn bg-[#fdf6e3] px-3 py-1.5 text-[#2b2119]">
            Close
          </button>
        </div>
      </div>

      {/* The best next steps. */}
      {next.length > 0 && (
        <div className="flex gap-2 overflow-x-auto px-3 pt-2 md:px-5" data-testid="tree-next">
          <span className="font-pixel flex shrink-0 items-center text-xs text-white/60">Next steps:</span>
          {next.map((n) => {
            const r = ready(state, n);
            return (
              <div key={n.id} className={cn("flex shrink-0 items-center gap-2 border-2 px-2 py-1", r ? "border-emerald-400 bg-emerald-900/40" : "border-[#4a3b2e] bg-[#2a211a]")}>
                <button type="button" onClick={() => jump(n.id)} className="flex items-center gap-1.5 text-left">
                  <PixelIcon name={iconOf(n)} size={18} />
                  <span className="font-pixel text-xs">
                    {n.name}
                    <span className="block text-[10px] text-white/60">{r ? "Ready!" : goalShare(state, n.id) < 1 ? `Goals ${Math.round(goalShare(state, n.id) * 100)}%` : `Needs ${researchCost(state, n)} Knowledge`}</span>
                  </span>
                </button>
                {r && !locked && (
                  <button type="button" onClick={() => research(n.id)} className="pixel-btn font-pixel bg-emerald-500 px-2 py-0.5 text-[11px] text-[#2b2119]" data-testid={`quick-research-${n.id}`}>
                    Research
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Eras, and filters. */}
      <div className="flex flex-wrap items-center gap-1.5 px-3 pt-2 md:px-5">
        {/* Build to Last: only its own era. */}
        {ERAS.map((e, i) => {
          if (state.mode === "last" && i !== 4) return null;
          const { done, all } = eraStats(i);
          return (
            <button
              key={e.name}
              type="button"
              onClick={() => {
                setEra(i);
                setFocus(null);
              }}
              className={cn(
                "pixel-btn font-pixel relative flex shrink-0 items-center gap-2 overflow-hidden px-3 py-1.5 text-sm",
                era === i ? "bg-amber-400 text-[#2b2119]" : "bg-[#3a2e24] hover:bg-[#4a3b2e]",
                i > state.era && era !== i && "opacity-60",
              )}
            >
              <PixelIcon name={ERA_ICONS[i]} size={18} />
              {e.name}
              <span className="font-num text-xs opacity-70">
                {done}/{all}
              </span>
              {/* How much of the era is done. */}
              <span className="absolute inset-x-0 bottom-0 h-1 bg-black/30">
                <span className="block h-full bg-emerald-400" style={{ width: `${all ? (done / all) * 100 : 0}%` }} />
              </span>
            </button>
          );
        })}
        <span className="mx-1 hidden h-6 w-px bg-white/20 md:block" />
        {BRANCHES.map((b) => {
          const off = hidden.includes(b.id);
          return (
            <button
              key={b.id}
              type="button"
              onClick={() => setHidden((h) => (off ? h.filter((x) => x !== b.id) : [...h, b.id]))}
              className={cn("font-pixel flex items-center gap-1 border-2 px-1.5 py-0.5 text-[11px]", off ? "border-white/10 text-white/35" : "text-white")}
              style={{ borderColor: off ? undefined : b.color }}
              title={off ? `Show ${b.name}` : `Hide ${b.name}`}
            >
              <PixelIcon name={BRANCH_ICONS[b.id]} size={12} />
              {b.name}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setOnlyReady((v) => !v)}
          className={cn("font-pixel border-2 px-1.5 py-0.5 text-[11px]", onlyReady ? "border-emerald-400 bg-emerald-900/50" : "border-white/20 text-white/70")}
          data-testid="tree-only-open"
        >
          Only what I can research
        </button>
      </div>

      <div
        ref={area}
        className="relative m-2 mb-2 flex-1 cursor-grab overflow-auto border-[3px] border-[#140e0a] bg-[#2a211a] active:cursor-grabbing md:m-5 md:mb-3"
        data-tree-area
        onPointerDown={(e) => {
          if (e.pointerType !== "mouse" || (e.target as HTMLElement).closest("button")) return;
          drag.current = { x: e.clientX, y: e.clientY, left: area.current!.scrollLeft, top: area.current!.scrollTop, moved: false };
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d || !area.current) return;
          area.current.scrollLeft = d.left - (e.clientX - d.x);
          area.current.scrollTop = d.top - (e.clientY - d.y);
          d.moved = true;
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerLeave={() => (drag.current = null)}
      >
        <div className="relative" style={{ width, height, minWidth: "100%" }}>
          {rowTops.map((row, i) => (
            <div
              key={row.id}
              className={cn("absolute inset-x-0", i % 2 ? "bg-white/[0.02]" : "bg-white/[0.05]", row.id !== "root" && hidden.includes(row.id) && "opacity-30")}
              style={{ top: row.y - ROW_GAP / 2, height: row.h + ROW_GAP }}
            >
              <span className="font-pixel absolute left-3 flex h-full w-[116px] items-center gap-1.5 text-sm font-semibold leading-tight" style={{ color: row.color }}>
                <PixelIcon name={BRANCH_ICONS[row.id]} size={16} />
                {row.name}
              </span>
            </div>
          ))}

          <svg className="pointer-events-none absolute inset-0" width={width} height={height}>
            {Object.values(placed).flatMap(({ node }) =>
              node.requires
                .filter((r) => placed[r])
                .map((r) => {
                  const a = placed[r];
                  const b = placed[node.id];
                  const x1 = a.x + NODE_W;
                  const y1 = a.y + NODE_H / 2;
                  const x2 = b.x;
                  const y2 = b.y + NODE_H / 2;
                  const bend = (x2 - x1) / 2;
                  const lit = state.researched.includes(r);
                  // On the path of the card in focus.
                  const onPath = !!chain && (chain.up.has(r) || r === focus) && (chain.up.has(node.id) || node.id === focus || chain.down.has(node.id));
                  const next = lit && statusOf(state, node) === "available";
                  return (
                    <path
                      key={`${r}-${node.id}`}
                      d={`M${x1},${y1} C${x1 + bend},${y1} ${x2 - bend},${y2} ${x2},${y2}`}
                      fill="none"
                      stroke={onPath ? "#ffffff" : lit ? "#fbbf24" : "#6b5a48"}
                      strokeWidth={onPath ? 4 : 3}
                      strokeDasharray={next ? "8 6" : node.secret && !state.researched.includes(node.id) ? "6 5" : undefined}
                      opacity={chain && !onPath ? 0.35 : 1}
                    >
                      {next && <animate attributeName="stroke-dashoffset" from="28" to="0" dur="1.2s" repeatCount="indefinite" />}
                    </path>
                  );
                }),
            )}
          </svg>

          {Object.values(placed).map(({ node, x, y }) => {
            const s = statusOf(state, node);
            const color = colourOf(node);
            const fromEarlier = node.requires.filter((r) => !placed[r]);
            const r = ready(state, node);
            const cost = researchCost(state, node);
            const dim = !shown(node) || (chain && focus !== node.id && !chain.up.has(node.id) && !chain.down.has(node.id));
            return (
              <button
                key={node.id}
                type="button"
                data-guide={`tree-node-${node.id}`}
                onClick={() => {
                  if (drag.current?.moved) return;
                  setFocus(focus === node.id ? null : node.id);
                }}
                className={cn(
                  "font-pixel absolute flex items-stretch gap-2 border-[3px] p-1.5 text-left transition-opacity",
                  s === "done" && "text-[#2b2119]",
                  s === "available" && "bg-[#3a2e24] shadow-[0_0_0_3px_rgba(251,191,36,0.25)]",
                  r && "tree-ready",
                  (s === "locked" || s === "soon" || s === "future") && "bg-[#231b15] text-white/55",
                  s === "secret" && "border-dashed bg-[#231b15] text-white/70",
                  focus === node.id && "outline outline-2 outline-offset-2 outline-white",
                  dim && "opacity-30",
                  burst === node.id && "tree-burst",
                )}
                style={{
                  left: x,
                  top: y,
                  width: NODE_W,
                  height: NODE_H,
                  borderColor: s === "locked" || s === "soon" || s === "future" ? "#4a3b2e" : color,
                  background: s === "done" ? color : undefined,
                }}
              >
                {/* Its icon. */}
                <span className={cn("flex w-9 shrink-0 items-center justify-center border-2", s === "done" ? "border-[#2b2119]/40 bg-white/30" : "border-white/10 bg-black/25")}>
                  <PixelIcon name={s === "secret" ? "lock" : iconOf(node)} size={24} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col justify-center">
                  <span className="truncate text-[13px] font-semibold leading-tight">{s === "secret" ? "???" : node.name}</span>
                  {(s === "available" || s === "locked") && <GoalLine state={state} nodeId={node.id} reachable={s === "available"} />}
                  {fromEarlier.length > 0 && s !== "done" && (
                    <span className="truncate text-[9px] text-white/50">
                      + {fromEarlier.map((id) => `${TREE_BY_ID[id].name}${state.researched.includes(id) ? " ✓" : ""}`).join(", ")}
                    </span>
                  )}
                  <span className="mt-0.5 flex items-center gap-1 text-[11px] opacity-85">
                    {s === "done" && "Discovered"}
                    {s === "available" && (
                      <>
                        <PixelIcon name={goalsMet(state, node.id) ? "bulb" : "lock"} size={11} />
                        <span className="font-num">{cost}</span>
                        {/* How much of the cost we have. */}
                        <span className="ml-1 h-1.5 flex-1 bg-black/40">
                          <span className="block h-full bg-sky-400" style={{ width: `${Math.min(100, (state.resources.knowledge / Math.max(1, cost)) * 100)}%` }} />
                        </span>
                      </>
                    )}
                    {s === "locked" && (
                      <>
                        <PixelIcon name="lock" size={11} /> Locked
                      </>
                    )}
                    {s === "soon" && "Coming soon"}
                    {s === "future" && `Invented in ${notInventedYet(state, node.id)}`}
                    {s === "secret" && "Hidden goal"}
                  </span>
                </span>
                {/* On the card's corner, so a long name never cuts it off. */}
                {fresh.includes(node.id) && (
                  <span className="absolute -right-2 -top-2.5 border-2 border-[#2b2119] bg-sky-400 px-1 text-[10px] leading-tight text-[#2b2119]" data-testid="tree-new">
                    New
                  </span>
                )}
                {r && <span className="absolute -left-2 -top-2.5 border-2 border-[#2b2119] bg-emerald-400 px-1 text-[10px] leading-tight text-[#2b2119]">Ready!</span>}
                {burst === node.id && <span className="tree-burst-text absolute inset-0 flex items-center justify-center text-base font-bold text-white">Discovered!</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex min-h-[84px] flex-wrap items-center justify-between gap-2 border-t-[3px] border-[#140e0a] px-3 py-2 md:flex-nowrap md:gap-4 md:px-5 md:py-3" data-tree-details>
        {focused && focusStatus ? (
          <>
            <div className="flex min-w-0 gap-3">
              <span className="hidden h-14 w-14 shrink-0 items-center justify-center border-[3px] bg-black/30 md:flex" style={{ borderColor: colourOf(focused) }}>
                <PixelIcon name={focusStatus === "secret" ? "lock" : iconOf(focused)} size={36} />
              </span>
              <div className="min-w-0">
                <p className="font-pixel text-lg font-semibold">
                  {focusStatus === "secret" ? "??? Secret goal" : focused.name}
                  <span className="ml-2 text-xs font-normal text-white/50">
                    {focused.branch === "root" ? "Origins" : BRANCHES.find((b) => b.id === focused.branch)?.name} · {ERAS[focused.era].name}
                  </span>
                </p>
                <p className="text-sm text-white/75">
                  {focusStatus === "secret" ? "Something special is hidden here. Keep playing to discover it." : focused.description}
                  {focusStatus !== "secret" && focused.unlocks && (
                    <span className="text-emerald-300"> Unlocks: {focused.unlocks.map((u) => BUILDINGS_BY_ID[u]?.name).join(", ")}.</span>
                  )}
                  {focusStatus === "future" && (
                    <span className="text-sky-300">
                      {" "}
                      Not invented yet: it arrives in {notInventedYet(state, focused.id)}, in about {Math.ceil(notInventedYet(state, focused.id)! - state.year)} years.
                    </span>
                  )}
                </p>
                <div className="font-pixel mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs">
                  {focused.requires.length > 0 && (
                    <span className="text-white/60">
                      Needs:{" "}
                      {focused.requires.map((id, i) => (
                        <button key={id} type="button" onClick={() => jump(id)} className={cn("underline", state.researched.includes(id) ? "text-emerald-300" : "text-amber-300")}>
                          {TREE_BY_ID[id].name}
                          {state.researched.includes(id) ? " ✓" : " ✗"}
                          {i < focused.requires.length - 1 ? ", " : ""}
                        </button>
                      ))}
                    </span>
                  )}
                  {(LEADS[focused.id] ?? []).filter((n) => !n.secret).length > 0 && (
                    <span className="text-white/60">
                      Leads to:{" "}
                      {(LEADS[focused.id] ?? [])
                        .filter((n) => !n.secret)
                        .map((n, i, all) => (
                          <button key={n.id} type="button" onClick={() => jump(n.id)} className="text-sky-300 underline">
                            {n.name}
                            {i < all.length - 1 ? ", " : ""}
                          </button>
                        ))}
                    </span>
                  )}
                </div>
                {(focusStatus === "available" || focusStatus === "locked") && goalProgress(state, focused.id).length > 0 && (
                  <ul className="font-pixel mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs" data-testid="goal-list">
                    <li className="text-white/60">{focusStatus === "locked" ? "Then:" : "To research:"}</li>
                    {goalProgress(state, focused.id).map((g) => (
                      <li key={g.label} className={cn("flex items-center gap-1.5", g.done ? "text-emerald-300" : "text-amber-200")}>
                        {g.done ? "Done: " : ""}
                        {g.label} <span className="font-num">{focusStatus === "locked" ? g.need : `${g.have}/${g.need}`}</span>
                        {focusStatus === "available" && !g.done && (
                          <span className="inline-block h-1.5 w-12 bg-black/40">
                            <span className="block h-full bg-amber-300" style={{ width: `${Math.min(100, (g.have / Math.max(1, g.need)) * 100)}%` }} />
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            {focusStatus === "available" && (
              <button
                type="button"
                data-guide="tree-research"
                disabled={locked || state.resources.knowledge < researchCost(state, focused) || !goalsMet(state, focused.id)}
                onClick={() => research(focused.id)}
                className="pixel-btn font-pixel flex shrink-0 items-center gap-1.5 bg-emerald-500 px-4 py-2 text-base font-semibold text-[#2b2119] hover:bg-emerald-400 disabled:opacity-40"
              >
                Research <PixelIcon name="bulb" size={14} />
                <span className="font-num">{researchCost(state, focused)}</span>
              </button>
            )}
          </>
        ) : (
          <p className="font-pixel text-sm text-white/60">
            Click an advancement to see what it does, what it needs and what it leads to. Gold lines show what you&apos;ve unlocked; moving dashes show what you can research next. Drag to look around.
          </p>
        )}
      </div>
    </div>
  );
}
