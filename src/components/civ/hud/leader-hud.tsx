"use client";

import { BUILDINGS_BY_ID, LEADER } from "@/game/content";
import { useGame } from "@/components/civ/game-provider";
import { PixelIcon } from "@/components/civ/pixel-icon";
import { WORK_TOOLS } from "@/components/civ/world/figures";
import { leader, setLeaderMenu, setLeaderView, useLeader } from "@/components/civ/world/leader";
import { grabStore } from "@/components/civ/world/villagers";
import { hexDistance, worldToAxial } from "@/game/hex";
import type { IconId } from "@/game/sprites";

// Leader mode on screen: in first person, a crosshair, what you can do right
// now (talk to a villager, strike a raider), the controls, and the job menu;
// in the build view, a way back to the chief.
export function LeaderHud() {
  const { state, dispatch } = useGame();
  const { view, prompt, menu, locked } = useLeader();
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
        .filter((t) => t.building && WORK_TOOLS[t.building])
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
            {prompt.kind === "talk" ? (
              <>
                <span className="text-amber-300">E</span>: talk to {prompt.name}
              </>
            ) : (
              <>
                <span className="text-red-300">Click</span>: strike the raiders! ({hits}/{LEADER.maxHits} blows, each +{LEADER.hit} defense)
              </>
            )}
          </span>
        </div>
      )}

      {/* Take the mouse to look around. */}
      {!locked && !menu && (
        <div className="pointer-events-none fixed inset-x-0 top-[40%] z-[15] flex justify-center">
          <span className="pixel-panel-dark font-pixel px-3 py-1.5 text-sm text-white">Click the view to look around</span>
        </div>
      )}

      {/* The controls, and the way to the build view. */}
      <div className="pointer-events-none fixed bottom-3 left-1/2 z-[15] flex -translate-x-1/2 flex-wrap items-center justify-center gap-2 px-3" data-testid="leader-controls">
        <span className="pixel-panel-dark font-pixel px-2 py-1 text-[11px] text-white/85">
          WASD / arrows: walk · Shift: run · Mouse: look · E: talk · Click: strike · Esc: free the mouse
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
