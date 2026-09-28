"use client";

import { useMemo, useState } from "react";
import { BRANCHES, BUILDINGS_BY_ID, ERAS, TREE, TREE_BY_ID } from "@/game/content";
import { useGame } from "@/components/civ/game-provider";
import type { TreeNode } from "@/game/types";
import { cn } from "@/lib/utils";

const COL = 170;
const ROW = 96;
const NODE_W = 132;
const NODE_H = 54;
const PAD = 40;
const LABEL_W = 96;

interface Placed {
  node: TreeNode;
  x: number;
  y: number;
}

function layout(): { placed: Record<string, Placed>; width: number; height: number } {
  const depth: Record<string, number> = {};
  const depthOf = (id: string): number => {
    if (depth[id] !== undefined) return depth[id];
    const n = TREE_BY_ID[id];
    depth[id] = n.requires.length ? 1 + Math.max(...n.requires.map(depthOf)) : 0;
    return depth[id];
  };
  TREE.forEach((n) => depthOf(n.id));

  const slots: Record<string, number> = {};
  const placed: Record<string, Placed> = {};
  const middle = ((BRANCHES.length - 1) / 2) * ROW;
  for (const node of TREE) {
    const d = depth[node.id];
    const branchIndex = BRANCHES.findIndex((b) => b.id === node.branch);
    const slotKey = `${d}:${node.branch}`;
    const slot = slots[slotKey] ?? 0;
    slots[slotKey] = slot + 1;
    const baseY = node.branch === "root" ? middle : branchIndex * ROW;
    placed[node.id] = {
      node,
      x: PAD + LABEL_W + d * COL + slot * 18,
      y: PAD + baseY + slot * (NODE_H + 6),
    };
  }
  const maxDepth = Math.max(...Object.values(depth));
  return {
    placed,
    width: PAD * 2 + LABEL_W + maxDepth * COL + NODE_W + 40,
    height: PAD * 2 + BRANCHES.length * ROW + NODE_H,
  };
}

export function TreeOverlay() {
  const { state, dispatch, setPanel } = useGame();
  const { placed, width, height } = useMemo(() => layout(), []);
  const [focus, setFocus] = useState<string>("fire");

  const status = (n: TreeNode) => {
    if (state.researched.includes(n.id)) return "done";
    if (n.secret) return "secret";
    if (n.comingSoon) return "soon";
    if (n.requires.every((r) => state.researched.includes(r))) return "available";
    return "locked";
  };

  const eraBands = ERAS.map((era, i) => {
    const xs = Object.values(placed).filter((p) => p.node.era === i).map((p) => p.x);
    return { name: era.name, from: Math.min(...xs) - 16, to: Math.max(...xs) + NODE_W + 16 };
  });

  const focused = TREE_BY_ID[focus];
  const focusStatus = status(focused);
  const hidden = focusStatus === "secret";

  return (
    <div className="pointer-events-auto absolute inset-0 z-20 flex flex-col bg-slate-950/85 text-white backdrop-blur-sm">
      <div className="flex items-center justify-between px-5 py-3">
        <div>
          <h2 className="text-lg font-semibold">Advancements</h2>
          <p className="text-xs text-white/60">
            💡 {Math.floor(state.resources.knowledge)} knowledge · Secrets found: {state.secretsFound.length}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setPanel(null)}
          className="rounded-lg bg-white/10 px-3 py-1.5 text-sm hover:bg-white/20"
        >
          Close ✕
        </button>
      </div>

      <div className="relative flex-1 overflow-auto">
        <div className="relative" style={{ width, height }}>
          {eraBands.map((band, i) => (
            <div
              key={band.name}
              className={cn("absolute inset-y-0", i % 2 ? "bg-white/[0.03]" : "bg-white/[0.06]")}
              style={{ left: band.from, width: band.to - band.from }}
            >
              <span className="absolute left-2 top-1 text-[10px] uppercase tracking-wider text-white/40">
                {band.name}
              </span>
            </div>
          ))}

          {BRANCHES.map((b, i) => (
            <span
              key={b.id}
              className="absolute left-3 w-20 text-[10px] font-semibold uppercase leading-tight"
              style={{ top: PAD + i * ROW + NODE_H / 2 - 7, color: b.color }}
            >
              {b.name}
            </span>
          ))}

          <svg className="absolute inset-0" width={width} height={height}>
            {TREE.flatMap((n) =>
              n.requires.map((r) => {
                const a = placed[r];
                const b = placed[n.id];
                const x1 = a.x + NODE_W;
                const y1 = a.y + NODE_H / 2;
                const x2 = b.x;
                const y2 = b.y + NODE_H / 2;
                const mid = (x1 + x2) / 2;
                const color = BRANCHES.find((br) => br.id === n.branch)?.color ?? "#fff";
                const lit = state.researched.includes(r);
                return (
                  <path
                    key={`${r}-${n.id}`}
                    d={`M${x1},${y1} C${mid},${y1} ${mid},${y2} ${x2},${y2}`}
                    fill="none"
                    stroke={color}
                    strokeWidth={lit ? 3 : 2}
                    strokeOpacity={lit ? 0.9 : 0.25}
                    strokeDasharray={n.secret && !state.researched.includes(n.id) ? "4 4" : undefined}
                  />
                );
              }),
            )}
          </svg>

          {Object.values(placed).map(({ node, x, y }) => {
            const s = status(node);
            const color = BRANCHES.find((b) => b.id === node.branch)?.color ?? "#fbbf24";
            return (
              <button
                key={node.id}
                type="button"
                onClick={() => setFocus(node.id)}
                className={cn(
                  "absolute flex flex-col justify-center rounded-lg border-2 px-2 text-left transition",
                  s === "done" && "text-slate-950",
                  s === "available" && "animate-pulse bg-slate-800",
                  (s === "locked" || s === "soon") && "bg-slate-900 opacity-50",
                  s === "secret" && "border-dashed bg-slate-900 opacity-70",
                  focus === node.id && "ring-2 ring-white",
                )}
                style={{
                  left: x,
                  top: y,
                  width: NODE_W,
                  height: NODE_H,
                  borderColor: color,
                  background: s === "done" ? color : undefined,
                }}
              >
                <span className="truncate text-xs font-semibold">
                  {s === "secret" ? "???" : node.name}
                </span>
                <span className="text-[10px] opacity-75">
                  {s === "done" && "✓ discovered"}
                  {s === "available" && `💡 ${node.cost}`}
                  {s === "locked" && "🔒 locked"}
                  {s === "soon" && "coming soon"}
                  {s === "secret" && "hidden goal"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 border-t border-white/10 px-5 py-3">
        <div className="min-w-0">
          <p className="font-semibold">{hidden ? "??? Secret goal" : focused.name}</p>
          <p className="text-sm text-white/70">
            {hidden
              ? "Something special is hidden here. Keep playing to discover it."
              : focused.description}
            {!hidden && focused.unlocks && (
              <span className="text-emerald-300">
                {" "}
                Unlocks: {focused.unlocks.map((u) => BUILDINGS_BY_ID[u]?.name).join(", ")}
              </span>
            )}
          </p>
        </div>
        {focusStatus === "available" && (
          <button
            type="button"
            disabled={state.resources.knowledge < focused.cost}
            onClick={() => dispatch({ type: "research", nodeId: focused.id })}
            className="shrink-0 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-40"
          >
            Research (💡 {focused.cost})
          </button>
        )}
      </div>
    </div>
  );
}
