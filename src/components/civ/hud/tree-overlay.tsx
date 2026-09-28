"use client";

import { useMemo, useState } from "react";
import { BRANCHES, BUILDINGS_BY_ID, ERAS, TREE, TREE_BY_ID } from "@/game/content";
import { tutorialLocked } from "@/game/engine";
import type { GameState, TreeNode } from "@/game/types";
import type { IconId } from "@/game/sprites";
import { useGame } from "@/components/civ/game-provider";
import { PixelIcon } from "@/components/civ/pixel-icon";
import { cn } from "@/lib/utils";

const NODE_W = 150;
const NODE_H = 58;
const COL_GAP = 56;
const ROW_GAP = 14;
const LABEL_W = 120;
const PAD = 20;

const ERA_ICONS: IconId[] = ["flame", "amphora", "column", "castle", "factory", "rocket"];

type Status = "done" | "available" | "locked" | "soon" | "secret";

function statusOf(state: GameState, n: TreeNode): Status {
  if (state.researched.includes(n.id)) return "done";
  if (n.secret) return "secret";
  if (n.comingSoon) return "soon";
  if (n.requires.every((r) => state.researched.includes(r))) return "available";
  return "locked";
}

interface Placed {
  node: TreeNode;
  x: number;
  y: number;
}

// Lays out one era: a row per branch (the root sits in its own row on top),
// columns by how deep a node is within this era.
function layoutEra(era: number) {
  const nodes = TREE.filter((n) => n.era === era);
  const inEra = new Set(nodes.map((n) => n.id));
  const depth: Record<string, number> = {};
  const depthOf = (id: string): number => {
    if (depth[id] !== undefined) return depth[id];
    const local = TREE_BY_ID[id].requires.filter((r) => inEra.has(r));
    depth[id] = local.length ? 1 + Math.max(...local.map(depthOf)) : 0;
    return depth[id];
  };
  nodes.forEach((n) => depthOf(n.id));

  const rows = [
    ...(nodes.some((n) => n.branch === "root") ? [{ id: "root", name: "Origins", color: "#fbbf24" }] : []),
    ...BRANCHES,
  ];
  const placed: Record<string, Placed> = {};
  let y = PAD;
  const rowTops: { id: string; name: string; color: string; y: number; h: number }[] = [];
  let maxDepth = 0;
  for (const row of rows) {
    const inRow = nodes.filter((n) => n.branch === row.id);
    const perCol: Record<number, number> = {};
    let tallest = 1;
    for (const n of inRow) {
      const d = depthOf(n.id);
      maxDepth = Math.max(maxDepth, d);
      const slot = perCol[d] ?? 0;
      perCol[d] = slot + 1;
      tallest = Math.max(tallest, slot + 1);
      placed[n.id] = { node: n, x: LABEL_W + PAD + d * (NODE_W + COL_GAP), y: y + slot * (NODE_H + 8) };
    }
    const h = tallest * (NODE_H + 8) - 8;
    rowTops.push({ ...row, y, h });
    y += h + ROW_GAP;
  }
  return {
    placed,
    rowTops,
    width: LABEL_W + PAD * 2 + (maxDepth + 1) * (NODE_W + COL_GAP),
    height: y + PAD,
  };
}

export function TreeOverlay() {
  const { state, dispatch, setPanel } = useGame();
  const [era, setEra] = useState(state.era);
  const [focus, setFocus] = useState<string | null>(null);
  const { placed, rowTops, width, height } = useMemo(() => layoutEra(era), [era]);
  const locked = tutorialLocked(state, "advancements");

  const focused = focus ? TREE_BY_ID[focus] : null;
  const focusStatus = focused ? statusOf(state, focused) : null;
  const eraDone = (i: number) => {
    const list = TREE.filter((n) => n.era === i && !n.secret);
    return `${list.filter((n) => state.researched.includes(n.id)).length}/${list.length}`;
  };

  return (
    <div className="pointer-events-auto absolute inset-0 z-20 flex flex-col bg-[#1f1812]/95 text-[#fdf6e3]">
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 pt-2 md:gap-4 md:px-5 md:pt-3">
        <h2 className="font-pixel flex items-center gap-2 text-lg font-semibold md:text-2xl">
          <PixelIcon name="star" size={24} />
          Advancements
        </h2>
        <div className="font-pixel flex flex-wrap items-center gap-2 text-xs md:gap-4 md:text-sm">
          <span className="flex items-center gap-1">
            <PixelIcon name="bulb" size={16} />
            <span className="font-num">{Math.floor(state.resources.knowledge)}</span> knowledge
          </span>
          <span>Secrets found: <span className="font-num">{state.secretsFound.length}</span></span>
          <button
            type="button"
            data-guide="tree-close"
            onClick={() => setPanel(null)}
            className="pixel-btn bg-[#fdf6e3] px-3 py-1.5 text-[#2b2119]"
          >
            Close
          </button>
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto px-3 pt-2 md:px-5 md:pt-3">
        {ERAS.map((e, i) => (
          <button
            key={e.name}
            type="button"
            onClick={() => {
              setEra(i);
              setFocus(null);
            }}
            className={cn(
              "pixel-btn font-pixel flex shrink-0 items-center gap-2 px-3 py-1.5 text-sm",
              era === i ? "bg-amber-400 text-[#2b2119]" : "bg-[#3a2e24] hover:bg-[#4a3b2e]",
              i > state.era && era !== i && "opacity-60",
            )}
          >
            <PixelIcon name={ERA_ICONS[i]} size={18} />
            {e.name}
            <span className="font-num text-xs opacity-70">{eraDone(i)}</span>
          </button>
        ))}
      </div>

      <div className="relative m-2 mb-2 flex-1 overflow-auto border-[3px] border-[#140e0a] bg-[#2a211a] md:m-5 md:mb-3">
        <div className="relative" style={{ width, height, minWidth: "100%" }}>
          {rowTops.map((row, i) => (
            <div
              key={row.id}
              className={cn("absolute inset-x-0", i % 2 ? "bg-white/[0.02]" : "bg-white/[0.05]")}
              style={{ top: row.y - ROW_GAP / 2, height: row.h + ROW_GAP }}
            >
              <span
                className="font-pixel absolute left-3 flex h-full w-[108px] items-center text-sm font-semibold leading-tight"
                style={{ color: row.color }}
              >
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
                  const mid = x1 + (x2 - x1) / 2;
                  const lit = state.researched.includes(r);
                  return (
                    <path
                      key={`${r}-${node.id}`}
                      d={`M${x1},${y1} H${mid} V${y2} H${x2}`}
                      fill="none"
                      stroke={lit ? "#fbbf24" : "#6b5a48"}
                      strokeWidth={3}
                      strokeDasharray={node.secret && !state.researched.includes(node.id) ? "6 5" : undefined}
                    />
                  );
                }),
            )}
          </svg>

          {Object.values(placed).map(({ node, x, y }) => {
            const s = statusOf(state, node);
            const color =
              node.branch === "root" ? "#fbbf24" : BRANCHES.find((b) => b.id === node.branch)?.color ?? "#fbbf24";
            const fromEarlier = node.requires.filter((r) => !placed[r]).map((r) => TREE_BY_ID[r].name);
            return (
              <button
                key={node.id}
                type="button"
                data-guide={`tree-node-${node.id}`}
                onClick={() => setFocus(node.id)}
                className={cn(
                  "font-pixel absolute flex flex-col justify-center border-[3px] px-2 text-left",
                  s === "done" && "text-[#2b2119]",
                  s === "available" && "bg-[#3a2e24] shadow-[0_0_0_3px_rgba(251,191,36,0.35)]",
                  (s === "locked" || s === "soon") && "bg-[#231b15] text-white/55",
                  s === "secret" && "border-dashed bg-[#231b15] text-white/70",
                  focus === node.id && "outline outline-2 outline-offset-2 outline-white",
                )}
                style={{
                  left: x,
                  top: y,
                  width: NODE_W,
                  height: NODE_H,
                  borderColor: s === "locked" || s === "soon" ? "#4a3b2e" : color,
                  background: s === "done" ? color : undefined,
                }}
                title={fromEarlier.length ? `Needs: ${fromEarlier.join(", ")}` : undefined}
              >
                <span className="truncate text-sm font-semibold">{s === "secret" ? "???" : node.name}</span>
                <span className="flex items-center gap-1 text-[11px] opacity-80">
                  {s === "done" && "Discovered"}
                  {s === "available" && (
                    <>
                      <PixelIcon name="bulb" size={11} />
                      <span className="font-num">{node.cost}</span>
                    </>
                  )}
                  {s === "locked" && (
                    <>
                      <PixelIcon name="lock" size={11} /> Locked
                    </>
                  )}
                  {s === "soon" && "Coming soon"}
                  {s === "secret" && "Hidden goal"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex min-h-[72px] flex-wrap items-center justify-between gap-2 border-t-[3px] border-[#140e0a] px-3 py-2 md:flex-nowrap md:gap-4 md:px-5 md:py-3">
        {focused && focusStatus ? (
          <>
            <div className="min-w-0">
              <p className="font-pixel text-lg font-semibold">
                {focusStatus === "secret" ? "??? Secret goal" : focused.name}
              </p>
              <p className="text-sm text-white/75">
                {focusStatus === "secret"
                  ? "Something special is hidden here. Keep playing to discover it."
                  : focused.description}
                {focusStatus !== "secret" && focused.unlocks && (
                  <span className="text-emerald-300">
                    {" "}
                    Unlocks: {focused.unlocks.map((u) => BUILDINGS_BY_ID[u]?.name).join(", ")}.
                  </span>
                )}
                {focusStatus === "locked" && (
                  <span className="text-amber-300">
                    {" "}
                    Needs: {focused.requires.map((r) => TREE_BY_ID[r].name).join(", ")}.
                  </span>
                )}
              </p>
            </div>
            {focusStatus === "available" && (
              <button
                type="button"
                data-guide="tree-research"
                disabled={locked || state.resources.knowledge < focused.cost}
                onClick={() => dispatch({ type: "research", nodeId: focused.id })}
                className="pixel-btn font-pixel flex shrink-0 items-center gap-1.5 bg-emerald-500 px-4 py-2 text-base font-semibold text-[#2b2119] hover:bg-emerald-400 disabled:opacity-40"
              >
                Research <PixelIcon name="bulb" size={14} />
                <span className="font-num">{focused.cost}</span>
              </button>
            )}
          </>
        ) : (
          <p className="font-pixel text-sm text-white/60">
            Click an advancement to see what it does. Gold lines show what you&apos;ve unlocked.
          </p>
        )}
      </div>
    </div>
  );
}
