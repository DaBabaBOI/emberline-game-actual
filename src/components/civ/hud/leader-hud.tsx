"use client";

import { useEffect } from "react";
import { BUILDINGS, BUILDINGS_BY_ID, LEADER, PLANT_COST, RELIGHT_WOOD } from "@/game/content";
import { useGame } from "@/components/civ/game-provider";
import { PixelIcon } from "@/components/civ/pixel-icon";
import { WORK_TOOLS } from "@/components/civ/world/figures";
import { leader, setLeaderBuild, setLeaderMenu, setLeaderView, useLeader } from "@/components/civ/world/leader";
import { grabStore } from "@/components/civ/world/villagers";
import { hexDistance, worldToAxial } from "@/game/hex";
import { buildingCost, canAfford, isLit, isUnlocked, placementError, plantError, soilOf } from "@/game/engine";
import type { IconId } from "@/game/sprites";

// Leader mode on screen: in first person, a crosshair, what you can do right
// now (talk to a villager, strike a raider), the controls, and the job menu;
// in the build view, a way back to the chief.
export function LeaderHud() {
  const { state, dispatch } = useGame();
  const { view, prompt, menu, locked, build } = useLeader();
  // What the chief can build now, for the hotbar.
  const hotbar = BUILDINGS.filter((b) => b.era <= state.era && isUnlocked(state, b));
  const fp = !!state.leader && view === "fp";

  // 1-9 pick a building (again: put it away); the wheel runs through them all.
  useEffect(() => {
    if (!fp) return;
    const key = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      const n = Number(e.key);
      if (Number.isInteger(n) && n >= 1 && n <= 9 && hotbar[n - 1]) setLeaderBuild(build === hotbar[n - 1].id ? null : hotbar[n - 1].id);
    };
    const wheel = (e: WheelEvent) => {
      if (!document.pointerLockElement || !hotbar.length) return;
      const at = hotbar.findIndex((b) => b.id === build);
      const next = at < 0 ? 0 : (at + (e.deltaY > 0 ? 1 : -1) + hotbar.length) % hotbar.length;
      setLeaderBuild(hotbar[next].id);
    };
    window.addEventListener("keydown", key);
    window.addEventListener("wheel", wheel);
    return () => {
      window.removeEventListener("keydown", key);
      window.removeEventListener("wheel", wheel);
    };
  });

  if (!state.leader) return null;

  if (view === "map")
    return (
      <div className="pointer-events-none fixed inset-x-0 top-[5.5rem] z-[15] flex justify-center px-3">
        <div className="pixel-panel-dark font-pixel pointer-events-auto flex items-center gap-3 px-3 py-1.5 text-xs text-white" data-testid="leader-build-view">
          <span>Build view: pick a building and place it. The chief waits where you left them (the crowned figure).</span>
          <button type="button" onClick={() => setLeaderView("fp")} className="pixel-btn bg-amber-400 px-2 py-0.5 text-[#2b2119]">
            Walk (Tab)
          </button>
        </div>
      </div>
    );

  // The workplaces the chief could send someone to, nearest first.
  const here = worldToAxial(leader.x, leader.z);
  const jobs = menu
    ? state.tiles
        // Not a field lying fallow: there's nothing to do there till it's back.
        .filter((t) => t.building && WORK_TOOLS[t.building] && soilOf(state, t) !== "resting")
        .map((t) => ({ tile: t, d: hexDistance(t, { q: here.q, r: here.r }) }))
        .sort((a, b) => a.d - b.d)
        .slice(0, 8)
    : [];
  const hits = state.raid?.leaderHits ?? 0;

  return (
    <>
      {/* The crosshair. */}
      <div className="pointer-events-none fixed left-1/2 top-1/2 z-[15] -translate-x-1/2 -translate-y-1/2" aria-hidden="true">
        <span className="block h-1.5 w-1.5 rounded-full bg-white/90 shadow-[0_0_0_2px_rgba(0,0,0,0.45)]" />
      </div>

      {/* What you can do right now. */}
      {prompt && !menu && (
        <div className="pointer-events-none fixed inset-x-0 top-[58%] z-[15] flex justify-center" data-testid="leader-prompt">
          <span className="pixel-panel-dark font-pixel px-3 py-1 text-sm text-white">
            <PromptText prompt={prompt} hits={hits} />
          </span>
        </div>
      )}

      {/* Take the mouse to look around. */}
      {!locked && !menu && (
        <div className="pointer-events-none fixed inset-x-0 top-[40%] z-[15] flex justify-center">
          <span className="pixel-panel-dark font-pixel px-3 py-1.5 text-sm text-white">Click the view to look around</span>
        </div>
      )}

      {/* The hotbar: what the chief can build, right here. */}
      {hotbar.length > 0 && (
        <div className="pointer-events-none fixed inset-x-0 bottom-[3.6rem] z-[15] flex justify-center px-3" data-testid="leader-hotbar">
          <div className="pixel-panel-dark pointer-events-auto flex max-w-[94vw] gap-1 overflow-x-auto p-1">
            {hotbar.map((b, i) => {
              const cost = buildingCost(state, b);
              const afford = canAfford(state, cost);
              const on = build === b.id;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setLeaderBuild(on ? null : b.id)}
                  title={`${b.name}: ${Object.entries(cost)
                    .filter(([, v]) => v)
                    .map(([k, v]) => `${v} ${k === "currency" ? "coins" : k}`)
                    .join(", ")}`}
                  className={
                    "relative flex h-11 w-11 shrink-0 items-center justify-center border-2 " +
                    (on ? "border-amber-300 bg-amber-400/30" : "border-white/15 bg-black/30") +
                    (afford ? "" : " opacity-45")
                  }
                  data-testid={`hotbar-${b.id}`}
                >
                  <PixelIcon name={b.icon as IconId} size={26} />
                  {i < 9 && <span className="font-num absolute left-0.5 top-0 text-[10px] text-white/80">{i + 1}</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* The controls, and the way to the build view. */}
      <div className="pointer-events-none fixed bottom-1 left-1/2 z-[15] flex -translate-x-1/2 items-center justify-center gap-2 whitespace-nowrap px-3" data-testid="leader-controls">
        <span className="pixel-panel-dark font-pixel hidden px-2 py-1 text-[11px] text-white/85 md:inline">
          WASD walk · Shift run · Space jump · E talk / go in · Click act · P plant · 1-9 build · Q put away · Esc mouse
        </span>
        <button type="button" onClick={() => setLeaderView("map")} className="pixel-btn font-pixel pointer-events-auto bg-amber-400 px-3 py-1 text-sm text-[#2b2119]" data-testid="leader-to-map">
          Build view (Tab)
        </button>
      </div>

      {/* Telling a villager what to do. */}
      {menu && (
        <div className="pointer-events-auto fixed inset-0 z-[40] flex items-center justify-center bg-black/40 p-3" data-testid="leader-menu">
          <div className="pixel-panel w-[min(92vw,420px)] p-4">
            <div className="flex items-center gap-2">
              <PixelIcon name="person" size={36} />
              <div>
                <div className="font-pixel text-lg font-semibold">{menu.name}</div>
                <div className="text-sm italic text-stone-600">&quot;What should I do, Chief?&quot;</div>
              </div>
            </div>
            {jobs.length === 0 ? (
              <p className="mt-3 text-sm text-stone-600">There is nowhere to work yet. Build a farm, a woodcutter or a quarry first (Tab for the build view).</p>
            ) : (
              <div className="mt-3 grid gap-1.5">
                {jobs.map(({ tile, d }) => {
                  const def = BUILDINGS_BY_ID[tile.building!];
                  return (
                    <button
                      key={tile.id}
                      type="button"
                      onClick={() => {
                        dispatch({ type: "leaderAssign", tileId: tile.id, who: menu.name });
                        // Off they go: they walk there and get to work on arrival.
                        const w = grabStore.walkers[menu.index];
                        if (w) {
                          const a = Math.atan2(w.z - tile.z, w.x - tile.x);
                          Object.assign(w, { goWork: tile, tx: tile.x + Math.cos(a) * 0.72, tz: tile.z + Math.sin(a) * 0.72, wait: 0, sitAt: null, seat: undefined, sitting: false, working: false, workAt: null });
                        }
                        setLeaderMenu(null);
                      }}
                      className="pixel-btn flex items-center justify-between gap-2 bg-white px-3 py-1.5 text-left text-sm hover:bg-amber-50"
                      data-testid={`leader-job-${tile.building}`}
                    >
                      <span className="flex items-center gap-2">
                        <PixelIcon name={def.icon as IconId} size={20} />
                        Work at the {def.name}
                      </span>
                      <span className="text-xs text-stone-500">{d === 0 ? "here" : `${d} tile${d === 1 ? "" : "s"}`}</span>
                    </button>
                  );
                })}
              </div>
            )}
            <p className="mt-2 text-xs text-stone-500">Whoever you send works faster there for a while.</p>
            <button type="button" onClick={() => setLeaderMenu(null)} className="font-pixel mt-2 text-sm underline">
              Never mind
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// What you can do with what's under the crosshair, in words.
function PromptText({ prompt, hits }: { prompt: NonNullable<ReturnType<typeof useLeader>["prompt"]>; hits: number }) {
  const { state } = useGame();
  const { build } = useLeader();
  const key = (k: string, red = false) => <span className={red ? "text-red-300" : "text-amber-300"}>{k}</span>;
  if (prompt.kind === "talk")
    return (
      <>
        {key("E")}: talk to {prompt.name}
      </>
    );
  if (prompt.kind === "fight")
    return (
      <>
        {key("Click", true)}: strike the raiders! ({hits}/{LEADER.maxHits} blows, each +{LEADER.hit} defense)
      </>
    );
  const tile = state.tiles[prompt.tile];
  if (!tile) return null;
  if (prompt.kind === "build") {
    const def = build ? BUILDINGS_BY_ID[build] : null;
    if (!def) return null;
    const why = placementError(state, tile, def);
    return why ? (
      <>
        {def.name}: <span className="text-red-300">{why}</span>
      </>
    ) : (
      <>
        {key("Click")}: build the {def.name} here
      </>
    );
  }
  if (prompt.kind === "building") {
    const name = BUILDINGS_BY_ID[tile.building ?? ""]?.name ?? "building";
    return tile.building === "campfire" && !isLit(state, tile) ? (
      <>
        {key("E")}: relight the fire (−{RELIGHT_WOOD} wood)
      </>
    ) : (
      <>
        {key("E")}: go into the {name}
      </>
    );
  }
  if (prompt.kind === "gather")
    return prompt.what === "wood" ? (
      <>
        {key("Click")}: chop wood (+{LEADER.wood}) · {key("P")}: plant more trees here
      </>
    ) : (
      <>
        {key("Click")}: break stone (+{LEADER.stone})
      </>
    );
  const why = plantError(state, tile);
  return why ? (
    <span className="text-white/70">Can&apos;t plant here: {why}</span>
  ) : (
    <>
      {key("P")}: plant a tree here (−{PLANT_COST.food} food)
    </>
  );
}
