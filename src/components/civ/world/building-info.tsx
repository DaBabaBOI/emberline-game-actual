"use client";

import { BUILDINGS_BY_ID, FALLOW, FIRE_SCARE, IMPROVE, LANDMARKS, NUCLEAR, QUARRY_DUST, SMOG, WEAR } from "@/game/content";
import {
  connections,
  soilOf,
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
  landmarkDone,
  nextStageCost,
  outpostUpkeep,
  powerCover,
  powerOf,
  outpostsUnpaid,
  overseasBuildings,
  stageError,
  loggingMode,
  perSecond,
  repairCost,
  tended,
  upgradeFor,
  improveNext,
  homeRoom,
  levelOf,
  wearFactor,
  wearsOut,
  woodcutterYield,
} from "@/game/engine";
import type { GameState, Tile } from "@/game/types";
import { PixelIcon } from "@/components/civ/pixel-icon";
import { CountdownFor } from "@/components/civ/hud/countdown";
import { cn } from "@/lib/utils";

// What wear means for this building, in one short line (Hard mode).
function wearHelp(tile: Tile) {
  const w = tile.worn ?? 0;
  const pace = WEAR.busyBuildings.includes(tile.building ?? "")
    ? " Busy buildings like this one wear out faster."
    : WEAR.sturdyBuildings.includes(tile.building ?? "")
      ? " Sturdy buildings like this one wear out slower."
      : "";
  if (w >= 1) return "Worn out completely: it makes nothing until you repair it.";
  if (w > WEAR.slows) return "Below 50% it makes less, and at 0% it stops. Repairing puts it back to 100%.";
  return `Buildings wear down with use. Below 50% they make less, and at 0% they stop. Repairing puts it back to 100%.${pace}`;
}

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
      {/* Fields: tired soil, and letting it rest fallow. */}
      {(() => {
        const soil = soilOf(state, tile);
        if (!soil) return null;
        if (soil === "rotation") return <p className="mt-1 text-emerald-700">Fields rest in turn (Three-Field Rotation): the soil never tires.</p>;
        if (soil === "resting")
          return (
            <p className="mt-1 text-sky-800" data-testid="field-resting">
              Resting fallow: back with fresh soil in <CountdownFor ticks={(state.fallow?.[tile.id] ?? state.tick) - state.tick} state={state} />s.
            </p>
          );
        return (
          <div className="mt-2 border-t-2 border-stone-300 pt-1.5">
            <p className="mb-1">
              {soil === "tired" ? (
                <span className="text-red-800">Tired soil: this field grows half its food.</span>
              ) : (
                <>Fresh soil. Farmed too long without a rest, a field tires and grows half the food.</>
              )}
            </p>
            <button
              type="button"
              onClick={() => dispatch({ type: "restField", tileId })}
              className={cn("pixel-btn w-full px-2 py-1 text-left", soil === "tired" ? "bg-amber-400 text-[#2b2119]" : "bg-[#fdf6e3] hover:bg-amber-100")}
              data-testid="rest-field"
            >
              <span className="font-semibold">Rest this field</span>
              <span className="block text-[11px] text-stone-700">No food for about {Math.round(FALLOW.restTicks * 1.5)}s, then fresh soil again. Like farmers before crop rotation.</span>
            </button>
          </div>
        );
      })()}

      {/* What it gets from the buildings it touches (CONNECTIONS). */}
      {connections(state, tile).map((c) => (
        <p key={c.why} className="mt-1 flex gap-1.5 text-emerald-700" data-testid="building-connection">
          <PixelIcon name="star" size={12} />
          Connected to the {c.with.map((id) => BUILDINGS_BY_ID[id]?.name ?? id).join(" and ")}: {c.room ? `+${c.room} room` : `+${Math.round(c.bonus * 100)}%`} ({c.why})
        </p>
      ))}

      {/* Our landmark: its three stages, and the masons at work. */}
      {state.landmark?.tile === tile.id && (
        <div className="mt-2 border-t-2 border-stone-300 pt-1.5" data-testid="landmark-stages">
          <div className="mb-1 flex gap-1">
            {[1, 2, 3].map((n) => (
              <span
                key={n}
                className={cn(
                  "h-2 flex-1 border border-[#140e0a]",
                  n < state.landmark!.stage || (n === state.landmark!.stage && state.tick >= state.landmark!.readyTick)
                    ? "bg-emerald-600"
                    : n === state.landmark!.stage
                      ? "bg-amber-400"
                      : "bg-stone-200",
                )}
              />
            ))}
          </div>
          {landmarkDone(state) ? (
            <p className="text-emerald-800">Finished. {LANDMARKS[state.landmark!.kind].bonus}</p>
          ) : state.tick < state.landmark!.readyTick ? (
            <p>
              The masons are working on stage {state.landmark!.stage} of 3: done in{" "}
              <CountdownFor ticks={state.landmark!.readyTick - state.tick} state={state} />s.
            </p>
          ) : (
            <>
              <p className="mb-1">Stage {state.landmark!.stage} of 3 is done. Its bonus starts when all three are.</p>
              <button
                type="button"
                disabled={!!stageError(state)}
                onClick={() => dispatch({ type: "buildStage" })}
                className="pixel-btn flex w-full items-center justify-center gap-1 bg-amber-400 px-2 py-1 text-[#2b2119] disabled:opacity-40"
                data-testid="build-stage"
              >
                <PixelIcon name="hammer" size={12} />
                Build stage {state.landmark!.stage + 1} ·{" "}
                {Object.entries(nextStageCost(state) ?? {})
                  .map(([k, v]) => `${v} ${k === "currency" ? "coins" : k}`)
                  .join(", ")}
              </button>
            </>
          )}
        </div>
      )}

      {/* Industrial era: the grid, the smoke and the carbon. */}
      {(powerOf(state, def.id) !== 0 || def.smog || def.carbon || def.captures || def.waste) && (
        <p className="mt-2 border-t-2 border-stone-300 pt-1.5" data-testid="industry-info">
          {powerOf(state, def.id) > 0 && `Makes ${powerOf(state, def.id)} power. `}
          {powerOf(state, def.id) < 0 &&
            `Needs ${-powerOf(state, def.id)} power; the grid covers ${Math.round(powerCover(state) * 100)}% of what the town needs. `}
          {def.smog ? `Smoke over homes within ${SMOG.range} tiles${state.researched.includes("cleanair") ? " (halved by Clean Air Laws)" : ""}. ` : ""}
          {def.carbon ? `Adds ${perSecond(def.carbon).toFixed(2)} ppm of carbon a second, for good.` : ""}
          {def.captures ? `Takes up to ${perSecond(def.captures).toFixed(2)} ppm of carbon a second back out of the air (less on coal power or short of power).` : ""}
          {def.waste ? `Its waste costs the land ${def.waste * (state.researched.includes("plutonium") ? NUCLEAR.breeder : 1)} Sustainability while it stands.` : ""}
        </p>
      )}

      {/* An outpost overseas: what it costs to keep supplied. */}
      {tile.island !== state.tiles[state.startTile].island && tile.island >= 0 && (
        <p className="mt-2 border-t-2 border-stone-300 pt-1.5" data-testid="outpost-upkeep">
          {outpostsUnpaid(state)
            ? "Out of coins: our outposts can't be supplied and stand idle."
            : `Overseas: our ${overseasBuildings(state)} outpost buildings cost ${perSecond(outpostUpkeep(state)).toFixed(2)} coins/s to supply, each more than the last.`}
        </p>
      )}

      {/* Hard mode: how worn it is, and a repair. */}
      {wearsOut(state) && def.id !== "campfire" && (
        <div className="mt-2 border-t-2 border-stone-300 pt-1.5" data-testid="wear">
          <div className="flex justify-between">
            <span>{(tile.worn ?? 0) >= 1 ? "Broken down: making nothing" : `Condition ${Math.round((1 - (tile.worn ?? 0)) * 100)}%`}</span>
            {(tile.worn ?? 0) > 0.5 && (tile.worn ?? 0) < 1 && <span className="text-amber-800">making {Math.round(wearFactor(tile) * 100)}%</span>}
          </div>
          <div className="my-1 h-1.5 bg-stone-300">
            <div
              className={cn("h-full", (tile.worn ?? 0) >= 0.7 ? "bg-red-600" : (tile.worn ?? 0) >= 0.3 ? "bg-amber-500" : "bg-emerald-600")}
              style={{ width: `${(1 - (tile.worn ?? 0)) * 100}%` }}
            />
          </div>
          <p className="mb-1 text-[11px] leading-snug text-stone-600" data-testid="wear-help">
            {wearHelp(tile)}
          </p>
          {(tile.worn ?? 0) > 0.05 && (
            <button
              type="button"
              disabled={!canAfford(state, repairCost(state, tile))}
              onClick={() => dispatch({ type: "repair", tileId })}
              className="pixel-btn flex w-full items-center justify-center gap-1 bg-amber-400 px-2 py-1 text-[#2b2119] disabled:opacity-40"
            >
              <PixelIcon name="hammer" size={12} />
              Repair to 100% ·{" "}
              {Object.entries(repairCost(state, tile))
                .map(([k, v]) => `${v} ${k === "currency" ? "coins" : k}`)
                .join(", ")}
            </button>
          )}
        </div>
      )}

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
            Making <span className="font-num">{perSecond((def.produces?.wood ?? 0) * woodcutterYield(state, tile) * wearFactor(tile)).toFixed(2)}</span>{" "}
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

      {/* Improving it with stone and new ores: more from the same land. */}
      {(() => {
        const next = improveNext(state, tile);
        const level = levelOf(tile);
        if (!next && level === 1) return null;
        const now = IMPROVE.tiers.find((t) => t.level === level);
        return (
          <div className="mt-2 border-t-2 border-stone-300 pt-1.5" data-testid="improve">
            {now && (
              <p className="text-[11px] text-stone-700">
                {now.name}: {def.housing ? `room for ${homeRoom(tile)} people` : `makes ${Math.round(IMPROVE.boost * 100 * (level - 1))}% more`}.
              </p>
            )}
            {next &&
              (next.needs ? (
                <p className="text-[11px] text-stone-600">Next: {next.name}, once we learn {next.needs} (Advancements).</p>
              ) : (
                <button
                  type="button"
                  disabled={!canAfford(state, next.cost)}
                  onClick={() => dispatch({ type: "improve", tileId })}
                  className="pixel-btn mt-1 w-full bg-emerald-600 px-2 py-1 text-left text-white disabled:opacity-50"
                  data-testid="improve-btn"
                >
                  <span className="font-semibold">Improve: {next.name}</span>
                  <span className="block text-[11px] text-white/90">
                    {def.housing
                      ? `Room for ${Math.floor(def.housing * (1 + IMPROVE.boost * (next.level - 1))) - homeRoom(tile)} more people, on the same land.`
                      : `+${Math.round(IMPROVE.boost * 100)}% from the same land, with no more of it cleared.`}{" "}
                    Costs{" "}
                    {Object.entries(next.cost)
                      .map(([k, v]) => `${v} ${k === "currency" ? "coins" : k}`)
                      .join(", ")}
                    .
                  </span>
                </button>
              ))}
          </div>
        );
      })()}

      {def.id === "campfire" && (
        <div className="mt-2 border-t-2 border-stone-300 pt-1.5">
          <p>
            {isLit(state, tile) ? (
              <>
                Burning: about <CountdownFor ticks={state.fires?.[tile.id] ?? 0} state={state} />s of wood left.
              </>
            ) : (
              "Burnt out. Click it to relight (1 wood)."
            )}
          </p>
          {/* The fire keeper: adds wood when it burns out, so you don't have to. */}
          <label className="mt-1 flex cursor-pointer items-start gap-2" data-testid="keeper">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={tended(state, tile)}
              onChange={(e) => dispatch({ type: "setKeeper", tileId: tile.id, on: e.target.checked })}
            />
            <span>
              Keep it lit: someone adds wood each time it burns out (1 wood). Turn off to save wood.
            </span>
          </label>
        </div>
      )}
    </div>
  );
}
