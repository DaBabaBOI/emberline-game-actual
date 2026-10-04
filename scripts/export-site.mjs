// Makes the files the landing page (public/index.html) needs from the game's
// own data, so the page never goes out of date:
//   public/site/icons/<name>.svg  one picture per pixel sprite in src/game/sprites.ts
//   public/site/updates.js        the "What's new" list from src/game/updates.ts
// It also checks that the trade-offs written in public/index.html still say
// what the game's buildings say (src/game/content.ts), and stops if not.
// It runs by itself before `npm run dev` and `npm run build`. Both outputs are
// in .gitignore: edit sprites.ts or updates.ts, never the generated files.

import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PALETTE, SPRITES } from "../src/game/sprites.ts";
import { UPDATES } from "../src/game/updates.ts";
import { BUILDINGS_BY_ID } from "../src/game/content.ts";

const publicDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
const site = join(publicDir, "site");

// The buildings on the page's "Every choice is a trade-off" list.
const TRADEOFFS = ["woodcutter", "campfire", "farm", "pen", "quarry"];

// A 12x12 sprite as an SVG: one rectangle per run of same-coloured pixels in a row.
function spriteSvg(rows) {
  const rects = [];
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      let end = x + 1;
      while (end < row.length && row[end] === ch) end++;
      if (ch !== ".") rects.push(`<rect x="${x}" y="${y}" width="${end - x}" height="1" fill="${PALETTE[ch]}"/>`);
      x = end;
    }
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" shape-rendering="crispEdges">${rects.join("")}</svg>\n`;
}

const icons = join(site, "icons");
rmSync(icons, { recursive: true, force: true });
mkdirSync(icons, { recursive: true });
for (const [name, rows] of Object.entries(SPRITES)) writeFileSync(join(icons, `${name}.svg`), spriteSvg(rows));

writeFileSync(
  join(site, "updates.js"),
  `// Made by scripts/export-site.mjs from src/game/updates.ts. Do not edit.\nwindow.EMBERLINE_UPDATES = ${JSON.stringify(UPDATES, null, 2)};\n`,
);

// The page's text is HTML, so & is written &amp; there.
const page = readFileSync(join(publicDir, "index.html"), "utf8").replaceAll("&amp;", "&");
const stale = [];
for (const id of TRADEOFFS) {
  const b = BUILDINGS_BY_ID[id];
  for (const text of [b.name, b.gain, b.landCost]) if (!page.includes(text)) stale.push(`${id}: "${text}"`);
}
if (stale.length > 0) {
  console.error("public/index.html no longer matches the game. Copy these into its trade-off list:\n  " + stale.join("\n  "));
  process.exit(1);
}

console.log(`site: ${Object.keys(SPRITES).length} icons and ${UPDATES.length} update days written to public/site`);
