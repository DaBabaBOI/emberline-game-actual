"use client";

import { BUILDINGS_BY_ID, FIRE_SCARE, QUARRY_DUST } from "@/game/content";
import {
  dusty,
  rainfall,
  residents,
  scaredByFire,
  gathererShare,
  countBuildings,
  type Action,
  buildingCost,
  canAfford,
  isLit,
  loggingMode,
  perSecond,
  upgradeFor,
  woodcutterYield,
} from "@/game/engine";
import type { GameState } from "@/game/types";
import { PixelIcon } from "@/components/civ/pixel-icon";
import { CountdownFor } from "@/components/civ/hud/countdown";
import { cn } from "@/lib/utils";

// The panel that opens when you click one of your buildings: its trade-off,
// and for woodcutters the choice between clear-cutting and selective logging.
// Rendered inside the 3D scene (drei <Html>), so it gets state via props.
export function BuildingInfo({
  state,
  tileId,
  dispatch,
  onClose,
}: {
  state: GameState;
  tileId: number;
  dispatch: (a: Action) => void;
  onClose: () => void;
}) {
  const tile = state.tiles[tileId];
  const def = tile.building ? BUILDINGS_BY_ID[tile.building] : null;
  if (!def) return null;
  const mode = loggingMode(state, tile);
  return (
    <div
      className="pixel-panel font-pixel w-64 p-2.5 text-xs"
      data-testid="building-info"
      // Clicks here must not fall through to the map underneath.
      onPointerDown={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="mb-1 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm font-semibold">
          <PixelIcon name={def.icon} size={18} />
          {def.name}
        </span>
        <button type="button" onClick={onClose} className="text-stone-500 underline">
          Close
        </button>
      </div>
      <p className="flex gap-1.5 text-emerald-800">
        <span className="font-num">+</span>
        {def.gain}
      </p>
      <p className="flex gap-1.5 text-red-800">
        <PixelIcon name={def.landImpact ? "stump" : "leaf"} size={12} />
        {def.landCost}
      </p>

      {def.id === "gatherer" && gathererShare(state) < 1 && (
        <p className="mt-2 border-t-2 border-stone-300 pt-1.5 text-amber-800">
          {countBuildings(state).gatherer} camps share what the wild can give: each makes{" "}
          {Math.round(gathererShare(state) * 100)}% of a full camp.
        </p>
      )}

      {residents(state, tile) && (
        <p className="mt-2 border-t-2 border-stone-300 pt-1.5">
          {residents(state, tile)!.living} of {residents(state, tile)!.room} people live here.
        </p>
      )}

      {def.id === "quarry" && (
        <p className="mt-2 border-t-2 border-stone-300 pt-1.5 text-amber-800">
          Hillside cut away: {Math.round((tile.dug ?? 0) * 100)}%. It will never grow back.
        </p>
      )}

      {scaredByFire(state, tile) && (
        <p className="mt-2 border-t-2 border-stone-300 pt-1.5 text-amber-800">
          A campfire next door scares off the animals: making {Math.round(FIRE_SCARE.foodLoss * 100)}% less food.
        </p>
      )}

      {def.id === "farm" && (
        <p className="mt-2 border-t-2 border-stone-300 pt-1.5">
          Rain: this field grows {Math.round(rainfall(state) * 100)}%. The more forest stands, the more rain falls.
        </p>
      )}

      {dusty(state, tile) && (
        <p className="mt-2 border-t-2 border-stone-300 pt-1.5 text-amber-800">
          Covered in quarry dust: making {Math.round(QUARRY_DUST.foodLoss * 100)}% less food.
        </p>
      )}

      {def.id === "woodcutter" && (
        <div className="mt-2 border-t-2 border-stone-300 pt-1.5">
          <p className="mb-1">
            Making <span className="font-num">{perSecond((def.produces?.wood ?? 0) * woodcutterYield(state, tile)).toFixed(2)}</span>{" "}
            wood/s. How should they cut?
          </p>
          {mode === "selective" && woodcutterYield(state, tile) === 0 && (
            <p className="mb-1 text-amber-800">No trees are big enough to thin yet. They will start again as the forest grows back.</p>
          )}
          <div className="flex flex-col gap-1">
            {(
              [
                ["clear", "Clear-cut", "Every tree. Full wood now, but the forest here is stripped."],
                ["selective", "Selective", "Only big trees, always leaving the forest standing. Half the wood, but it lasts."],
              ] as const
            ).map(([id, name, text]) => (
              <button
                key={id}
                type="button"
                onClick={() => dispatch({ type: "setLogging", tileId, mode: id })}
                className={cn(
                  "pixel-btn px-2 py-1 text-left",
                  mode === id ? "bg-amber-400 text-[#2b2119]" : "bg-[#fdf6e3] hover:bg-amber-100",
                )}
              >
                <span className="font-semibold">{name}</span>
                {mode === id && " (now)"}
                <span className="block text-[11px] text-stone-700">{text}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {(() => {
        const next = upgradeFor(state, def.id);
        if (!next) return null;
        const cost = buildingCost(state, next);
        return (
          <div className="mt-2 border-t-2 border-stone-300 pt-1.5">
            <button
              type="button"
              disabled={!canAfford(state, cost)}
              onClick={() => dispatch({ type: "upgrade", tileId })}
              className="pixel-btn w-full bg-amber-400 px-2 py-1 text-left disabled:opacity-50"
            >
              <span className="font-semibold">Upgrade to {next.name}</span>
              <span className="block text-[11px] text-stone-800">
                {next.gain}. Costs{" "}
                {Object.entries(cost)
                  .map(([k, v]) => `${v} ${k}`)
                  .join(", ")}
                . {next.landCost}.
              </span>
            </button>
          </div>
        );
      })()}

      {def.id === "campfire" && (
        <p className="mt-2 border-t-2 border-stone-300 pt-1.5">
          {isLit(state, tile) ? (
            <>
              Burning: about <CountdownFor ticks={state.fires?.[tile.id] ?? 0} state={state} />s of wood left.
            </>
          ) : (
            "Burnt out. Click it to relight (1 wood)."
          )}
        </p>
      )}
    </div>
  );
}
