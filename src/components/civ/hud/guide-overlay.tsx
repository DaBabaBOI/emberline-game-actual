"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useGame } from "@/components/civ/game-provider";
import { guideFor, tileAnchor, type GuideTarget } from "@/components/civ/guide";
import { PixelIcon } from "@/components/civ/pixel-icon";

type Hole = { x: number; y: number; w: number; h: number };

const HAND = 52;

export function useGuide() {
  const { state, selected, panel } = useGame();
  return useMemo(() => guideFor(state, selected, panel), [state, selected, panel]);
}

function findHole(target: GuideTarget): Hole | null {
  if (target.kind === "tile") {
    if (!tileAnchor.visible) return null;
    const r = tileAnchor.r;
    return { x: tileAnchor.x - r, y: tileAnchor.y - r, w: r * 2, h: r * 2 };
  }
  for (const id of target.ids) {
    const rect = document.querySelector(`[data-guide="${id}"]`)?.getBoundingClientRect();
    if (rect && rect.width > 0) {
      return { x: rect.left - 5, y: rect.top - 5, w: rect.width + 10, h: rect.height + 10 };
    }
  }
  return null;
}

const same = (a: Hole | null, b: Hole | null) =>
  a === b ||
  (!!a && !!b && Math.abs(a.x - b.x) < 0.5 && Math.abs(a.y - b.y) < 0.5 && Math.abs(a.w - b.w) < 0.5 && a.h === b.h);

// Dims the screen, cuts a hole around the next thing to click, and points a
// hand at it. Clicks anywhere outside the hole are swallowed.
export function GuideOverlay() {
  const { target } = useGuide();
  const key = target ? JSON.stringify(target) : "";
  const [hole, setHole] = useState<Hole | null>(null);

  useEffect(() => {
    if (!key) return;
    const t = JSON.parse(key) as GuideTarget;
    let raf = 0;
    const loop = () => {
      const next = findHole(t);
      setHole((prev) => (same(prev, next) ? prev : next));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [key]);

  if (!target || !hole) return null;
  const { x, y, w, h } = hole;
  const block = (style: CSSProperties) => (
    <div
      className="pointer-events-auto absolute bg-[#140e0a]/50"
      style={style}
      onContextMenu={(e) => e.preventDefault()}
      onPointerDown={(e) => e.stopPropagation()}
    />
  );

  return (
    <div className="absolute inset-0 z-[25]" data-testid="guide">
      {block({ left: 0, top: 0, right: 0, height: Math.max(0, y) })}
      {block({ left: 0, top: y + h, right: 0, bottom: 0 })}
      {block({ left: 0, top: y, width: Math.max(0, x), height: h })}
      {block({ left: x + w, top: y, right: 0, height: h })}
      <div
        className="guide-ring pointer-events-none absolute border-[3px] border-amber-300"
        style={{ left: x, top: y, width: w, height: h }}
      />
      <div
        className="guide-hand pointer-events-none absolute"
        // The fingertip sits 5/12 of the way across the sprite.
        style={{ left: x + w / 2 - (HAND * 5) / 12, top: y - HAND - 2 }}
      >
        <PixelIcon name="hand" size={HAND} />
      </div>
    </div>
  );
}
