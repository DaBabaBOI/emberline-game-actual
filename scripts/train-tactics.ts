// The raiders' chiefs study: practice battles on every kind of ground, for
// every kind of raid and stage of history, to learn which plan works where.
// Each plan they could use is played GAMES times against our army set out the
// usual way (autoLineup), with armies of about even strength. Their record is
// kept from run to run (older battles count for less each time, so they keep
// adapting when battles change), and each plan gets a weight: the better it
// does, the more often raiders choose it (never a sure thing, so every plan
// still turns up). The result goes in src/game/tactics-learned.json, which the
// game reads (see enemyLineup in src/game/battle.ts).
//
// Run: npm run train:tactics   (GAMES=16 by default; SEED to repeat a run)
// A GitHub Action runs it every day and commits the new weights.

import { readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  BIOMES,
  MAX_FIGHTERS,
  TACTICS,
  autoLineup,
  enemyLineup,
  learnedKey,
  runBattle,
  type Biome,
  type LearnedTactics,
  type RaidPlanKind,
  type Roster,
  type Tactic,
} from "../src/game/battle";
import { mulberry32 } from "../src/game/noise";

const FILE = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "src",
  "game",
  "tactics-learned.json",
);
const GAMES = Number(process.env.GAMES ?? 16);
const SEED = Number(process.env.SEED ?? Date.now() % 1_000_000);
// Older battles fade by this much each run; the record never holds more than CAP.
const DECAY = 0.85;
const CAP = 600;
// How strongly a better record turns into a preference, and the least weight a plan keeps.
const SHARPNESS = 4;
const FLOOR = 0.1;
// Our army's size against theirs (in warriors), so the battles are close
// enough to learn from (about even: an army that always wins teaches nothing).
const POWER = Number(process.env.POWER ?? 0.5);

const KINDS: RaidPlanKind[] = ["band", "party", "fire", "army"];
const BUCKETS: { name: string; eras: number[]; strength: [number, number] }[] =
  [
    { name: "early", eras: [0, 1], strength: [4, 10] },
    { name: "middle", eras: [2, 3], strength: [10, 22] },
    { name: "late", eras: [4, 5], strength: [18, 36] },
  ];

// Our army for an era, about `power` warriors strong: spears, bows (from the
// Ancient era) and riders (from the Medieval), packed into fewer, tougher
// figures when it's big (as the game does).
function ourArmy(
  power: number,
  era: number,
): { roster: Roster; usBoost: number } {
  const n = Math.max(3, Math.round(power));
  const share =
    era >= 3
      ? { spearman: 0.35, warrior: 0.2, archer: 0.25, rider: 0.2 }
      : era >= 1
        ? { spearman: 0.45, warrior: 0.25, archer: 0.3, rider: 0 }
        : { spearman: 0.4, warrior: 0.6, archer: 0, rider: 0 };
  const scale = Math.max(1, n / (MAX_FIGHTERS - 1));
  const roster: Roster = { chief: 1 };
  for (const [kind, s] of Object.entries(share))
    if (s > 0)
      roster[kind as keyof Roster] = Math.max(
        kind === "warrior" ? 1 : 0,
        Math.round((n * s) / scale),
      );
  return { roster, usBoost: scale };
}

const file: LearnedTactics = JSON.parse(readFileSync(FILE, "utf8"));
const rand = mulberry32(SEED);
let played = 0;
let raiderWins = 0;
const lines: string[] = [];

for (const biome of Object.keys(BIOMES) as Biome[])
  for (const kind of KINDS)
    for (const bucket of BUCKETS) {
      const key = learnedKey(biome, kind, bucket.eras[0]);
      const before = file.contexts[key];
      const record: Partial<Record<Tactic, [number, number]>> = {};
      // What we knew, fading a little.
      for (const [t, [g, w]] of Object.entries(before?.record ?? {}) as [
        Tactic,
        [number, number],
      ][])
        record[t] = [g * DECAY, w * DECAY];
      for (const tactic of Object.keys(TACTICS) as Tactic[]) {
        if (tactic === "hold") continue;
        for (let i = 0; i < GAMES; i++) {
          const era = bucket.eras[Math.floor(rand() * bucket.eras.length)];
          const strength = Math.round(
            bucket.strength[0] +
              rand() * (bucket.strength[1] - bucket.strength[0]),
          );
          const seed = Math.floor(rand() * 1e9);
          const them = enemyLineup(strength, kind, seed, era, biome, {
            force: tactic,
          });
          // This raid can't play that plan (no bowmen for a volley, say).
          if (them.tactic !== tactic) continue;
          const { roster, usBoost } = ourArmy(
            strength * POWER * (0.75 + rand() * 0.5),
            era,
          );
          const result = runBattle({
            seed,
            ours: autoLineup(roster, seed, biome),
            theirs: them.theirs,
            usBoost,
            themBoost: them.themBoost,
            tactic,
            biome,
          });
          const r = record[tactic] ?? [0, 0];
          record[tactic] = [r[0] + 1, r[1] + (result.won ? 0 : 1)];
          played++;
          if (!result.won) raiderWins++;
        }
      }
      // In a fixed order (so the file only changes when the numbers do).
      const tactics = (Object.keys(record) as Tactic[]).sort();
      if (!tactics.length) continue;
      // Keep the record from growing without end (the same balance of wins).
      for (const t of tactics) {
        const [g, w] = record[t]!;
        const k = g > CAP ? CAP / g : 1;
        record[t] = [Math.round(g * k * 10) / 10, Math.round(w * k * 10) / 10];
      }
      const rate = (t: Tactic) => (record[t]![1] + 1) / (record[t]![0] + 2);
      const best = Math.max(...tactics.map(rate));
      const raw = tactics.map((t) => Math.exp(SHARPNESS * (rate(t) - best)));
      const total = raw.reduce((a, b) => a + b, 0);
      const floored = raw.map((w) => Math.max(FLOOR, w / total));
      const sum = floored.reduce((a, b) => a + b, 0);
      const weights: Partial<Record<Tactic, number>> = {};
      tactics.forEach(
        (t, i) => (weights[t] = Math.round((floored[i] / sum) * 1000) / 1000),
      );
      const games = Math.round(tactics.reduce((a, t) => a + record[t]![0], 0));
      const sortedRecord: Partial<Record<Tactic, [number, number]>> = {};
      for (const t of tactics) sortedRecord[t] = record[t];
      file.contexts[key] = { games, weights, record: sortedRecord };
      const fav = [...tactics].sort(
        (a, b) => (weights[b] ?? 0) - (weights[a] ?? 0),
      )[0];
      lines.push(
        `${key.padEnd(22)} ${fav.padEnd(7)} ${tactics.map((t) => `${t} ${Math.round(rate(t) * 100)}%`).join(", ")}`,
      );
    }

file.trained = new Date().toISOString().slice(0, 10);
file.battles = Math.round((file.battles ?? 0) + played);
const sorted: LearnedTactics = {
  trained: file.trained,
  battles: file.battles,
  contexts: {},
};
for (const k of Object.keys(file.contexts).sort())
  sorted.contexts[k] = file.contexts[k];
writeFileSync(FILE, JSON.stringify(sorted, null, 2) + "\n");

const summary = [
  `Raiders studied ${played} practice battles (seed ${SEED}) and won ${Math.round((raiderWins / Math.max(1, played)) * 100)}%; ${file.battles} in all.`,
  "",
  "context                favours  raider wins by plan",
  ...lines,
].join("\n");
console.log(summary);
// In a GitHub Action, the same on the run's page.
if (process.env.GITHUB_STEP_SUMMARY)
  appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    "```\n" + summary + "\n```\n",
  );
// For the commit message.
if (process.env.GITHUB_OUTPUT)
  appendFileSync(
    process.env.GITHUB_OUTPUT,
    `played=${played}\ntotal=${file.battles}\n`,
  );
