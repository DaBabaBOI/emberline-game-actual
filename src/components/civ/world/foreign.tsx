"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { kingdomInfo } from "@/game/engine";
import { isLand } from "@/game/map";
import type { GameState, Temper, Tile } from "@/game/types";
import { BUILDING_SCALE, MODELS, buildingTurn } from "./building-models";
import { Figures, HAIRS, SKINS, type Agent } from "./figures";
import { makeGround } from "./ground";
import { tileTop } from "./hex-terrain";

// The peoples across the sea have villages of their own: a few homes near the
// middle of their island and people in their colours going about their day.
// Only what has been explored is drawn: homes and people on land we can see.
// What they build follows their temper and the era.
const HOMES: Record<Temper, (era: number) => string[]> = {
  // Traders: markets once there are coins.
  traders: (era) => (era >= 1 ? ["house", "market", "house", "pen"] : ["hut", "pen", "hut", "gatherer"]),
  peaceful: (era) => (era >= 1 ? ["house", "farm", "house", "farm"] : ["hut", "gatherer", "hut", "pen"]),
  // Proud and warlike peoples keep a war camp, and a castle once there are castles.
  proud: (era) => (era >= 3 ? ["castle", "house", "house", "house"] : era >= 1 ? ["house", "warcamp", "house", "hut"] : ["hut", "warcamp", "hut", "hut"]),
  warlike: (era) => (era >= 3 ? ["castle", "warcamp", "house", "warcamp"] : ["warcamp", "hut", "warcamp", "hut"]),
};
const PEOPLE = 7;

interface Walker extends Agent {
  tx: number;
  tz: number;
  wait: number;
}

function Village({ tiles, island, centre, tunics, homes }: { tiles: Tile[]; island: number; centre: { x: number; z: number }; tunics: string[]; homes: string[] }) {
  const ground = useMemo(() => makeGround(tiles), [tiles]);
  // The tiles nearest the middle of the island: where the village stands
  // (those we have seen).
  const spots = useMemo(() => {
    return tiles
      .filter((t) => t.island === island && t.revealed && isLand(t.terrain) && t.terrain !== "mountain" && !t.building)
      .sort((a, b) => Math.hypot(a.x - centre.x, a.z - centre.z) - Math.hypot(b.x - centre.x, b.z - centre.z))
      .slice(0, 10);
  }, [tiles, island, centre.x, centre.z]);
  const walkers = useRef<Walker[]>([]);

  useFrame((_, delta) => {
    if (!spots.length) return;
    const list = walkers.current;
    while (list.length < PEOPLE) {
      const i = list.length;
      const t = spots[(i * 3) % spots.length];
      list.push({ x: t.x, z: t.z, y: tileTop(t), tx: t.x, tz: t.z, wait: i * 0.7, heading: 0, moving: false, scale: i % 4 === 3 ? 0.95 : 1.3, tunic: tunics[i % tunics.length], skin: SKINS[(i + island) % SKINS.length], hair: HAIRS[i % HAIRS.length], phase: i * 1.7 });
    }
    const dt = Math.min(delta, 0.1);
    list.forEach((w, i) => (w.tunic = tunics[i % tunics.length]));
    for (const w of list) {
      const dx = w.tx - w.x;
      const dz = w.tz - w.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.05) {
        w.moving = false;
        w.wait -= dt;
        if (w.wait <= 0) {
          const t = spots[Math.floor(Math.random() * spots.length)];
          w.tx = t.x + (Math.random() - 0.5) * 1.1;
          w.tz = t.z + (Math.random() - 0.5) * 1.1;
          w.wait = 1.5 + Math.random() * 3;
        }
      } else {
        const step = Math.min(d, 0.45 * dt);
        w.x += (dx / d) * step;
        w.z += (dz / d) * step;
        w.heading = Math.atan2(dx, dz);
        w.moving = true;
      }
      w.y = ground.heightAt(w.x, w.z);
    }
  });

  if (!spots.length) return null;
  return (
    <group>
      {homes.map((id, i) => {
        const t = spots[[0, 2, 4, 6][i] ?? i];
        const Model = MODELS[id];
        if (!t || !Model) return null;
        return (
          <group key={`${id}-${t.id}`} position={[t.x, t.height, t.z]} rotation={[0, buildingTurn(t), 0]} scale={BUILDING_SCALE}>
            <Model opacity={1} />
          </group>
        );
      })}
      <Figures agents={walkers} max={PEOPLE} colorKey={tunics.join()} />
    </group>
  );
}

// Our own people's clothes, for a kingdom we have conquered.
const OUR_TUNICS = ["#5b6f8a", "#c58b3a", "#3f5d8a"];

// A people's clothes: their colour, a lighter one and their stripe.
function tunicsOf(tunic: string, stripe: string) {
  return [tunic, stripe, tunic];
}

export function ForeignVillages({ state }: { state: GameState }) {
  return (
    <>
      {Object.keys(state.kingdoms ?? {}).map((id) => {
        const info = kingdomInfo(state, id);
        if (!info.isle || !state.tiles.some((t) => t.island === info.island && t.revealed)) return null;
        const conquered = !!state.kingdoms?.[id]?.conquered;
        return (
          <Village
            key={id}
            tiles={state.tiles}
            island={info.island}
            centre={info.isle}
            tunics={conquered ? OUR_TUNICS : tunicsOf(info.tunic, info.stripe)}
            homes={HOMES[info.temper](state.era)}
          />
        );
      })}
    </>
  );
}
