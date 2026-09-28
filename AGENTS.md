# Guide for AI assistants working on Emberline

This file is the source of truth for **what the game is**. Read it fully before
changing anything. If a request seems to conflict with it, follow the request
from the human, but point out the conflict and update this file in the same
change so the next assistant doesn't undo it.

## What Emberline is

A single-player civilization builder in the browser, inspired by **Tapestry**
(eras, parallel advancement tracks, civ abilities) and the Roblox game
**Mini Empires** (bright, chunky, low-poly hex world). The player starts at the
dawn of fire and advances through six eras to interstellar travel. It was made
for a school hackathon about the UN SDGs, so sustainability is a core mechanic,
not decoration.

## Non-negotiable design decisions

These were decided with the project owner. Do not change them without being asked.

**World**
- Hex tiles (pointy-top, axial coords), ~1,600 tiles, 4 islands separated by water.
- The island shapes are fixed (same every game); deposits are random per game.
- The nation is **fictional**, at a Eurasian, Silk Road-style crossroads.
- Unexplored land is hidden under cloud tiles; **the sea is always blue**.
  Scouts reveal land.
- Forests spread and regrow over time; woodcutters thin them out.

**Time**
- Six main eras: Stone Age, Ancient, Classical, Medieval & Renaissance,
  Industrial & Modern, Future & Space. All six are meant to become fully playable.
- Time runs fast early and slows down each era (`ERAS[].yearsPerTick`), with
  pause/1x/2x/4x controls. **No flashing day/night cycle**; the owner finds it
  dizzying.

**Screen layout**
- The game is full screen. Nothing but the map sits in the middle.
- **Six slim meters, three on each side**: Food & Water, Shelter & Health,
  Happiness (left); Literacy, Energy, Sustainability (right). Keep them small.
- Population, currency and warriors are **numbers** in the top bar, not meters.
  Military is never a meter.
- The bottom bar holds buildings for the current era, small stats, Army, Scout,
  and **Advancements** (never call it "Tree").
- The **🚀 Space / zoom-out button only appears after the player has a rocket**
  (`flags.rocket`).
- The landing page and title screen use a **light** theme; the owner dislikes dark UI there.

**Gameplay**
- Placing a building shows a **low-opacity preview** first (green outline = OK,
  red = not allowed, with the reason) and places on click.
- Everyday buildings have simple costs. **Landmark projects** (first rockets, first
  data centers, era wonders) get real 2–3 step supply chains
  (e.g. limestone → kiln → cement). Materials are mined/produced **or** imported
  via trade deals, with visible caravans/ships. Never skip steps.
- Currency changes name each era (shells → coins → … → credits).
- People are visible, walking **representative figures** (not 1:1). Children walk
  to school/learning buildings.
- Military is a fun side system, not the main focus: visible units, auto-resolved
  fights, weapons/uniforms that change with the era. Raiders force a basic army.
- Architecture, weapons and tech must match the era and what has been researched.
- The advancement tree is Minecraft-advancement style: one root (Discover Fire),
  six branches (Knowledge, Construction, Energy, Transport, Military,
  Culture & Trade). Knowledge comes from literacy, goals, exploration and trade.
- Secret goals show as locked `???` slots and give big bonuses.
- Politics = event cards with choices + simple diplomacy with AI nations.
- "AI" in the future era means **in-game tech** (automation, data centers), not an
  AI chatbot.
- Seven cultures (Balanced + six with bonuses), three difficulties. Famine is the
  only game over; everything else is a setback.
- Multiplayer is **later**; design state so AI nations could be replaced by humans,
  but do not add a backend now.

**Look and feel**
- Bright, stylized low-poly (Mini Empires). Build models from multiple composed
  primitives with real detail (roofs, doors, props), never a single box or sphere.
- Smog, haze and grey sky appear as sustainability drops.

## Code rules

- `src/game/` is **pure TypeScript with no React or three.js**. All rules live
  there. Content (buildings, tree nodes, events, eras) is **data** in
  `content.ts`; add content there, not as special cases in components.
- `engine.ts` is a reducer: `(state, action) => newState`, never mutate state.
  Randomness uses the seeded `mulberry32`, never `Math.random()`, inside the engine.
- If you change the shape of `GameState`, **bump `SAVE_VERSION`** so old saves are
  discarded instead of crashing.
- 3D code lives in `src/components/civ/world/`. Use instanced meshes for anything
  numerous (tiles, trees, people). Moving instanced meshes need `frustumCulled={false}`.
- The site is a **static export** (`output: "export"`) deployed to GitHub Pages
  under a base path. No API routes, no server code, no dynamic routes, no env
  secrets. Use `next/link` for internal links so the base path is applied.
- Keep the tutorial (`TUTORIAL` in `content.ts`) working when you change buildings.
- Before committing, run `npm run lint`, `npm run typecheck` and `npm run build`.
  All three must pass.
- Don't rename the game, change the art style, or restructure folders unless asked.

## Roadmap (in order)

1. Ancient era (decided with the owner):
   - **Entering it:** research Agriculture *and* hit a milestone (e.g. 30 people and
     3 farms), then a short "A new era dawns" moment.
   - **Old buildings upgrade manually:** click any building to open an info panel
     with an "Upgrade to …" button; the model changes when upgraded.
   - **All four systems:** the bronze supply chain (copper + tin → furnace →
     bronze); villages and roads (houses cluster, dirt roads people walk on);
     writing and a scribes' school (kids attend, literacy rises); trade caravans.
   - **First neighbor:** steppe traders on the Silk Steppe island. Mostly want to
     trade; turn aggressive if you're weak or keep refusing.
   - **Sea travel:** research Reed Boats → build a dock → scouts and caravans can
     sail to other islands.
   - **Overseas outposts:** yes, but late in the era after a sailing advancement
     (historically accurate: Minoan/Phoenician/Greek colonies).
   - **Raiders:** bigger raids; unlock bronze spearmen, archers, and palisade/stone
     walls that protect nearby tiles.
2. Classical: coinage, roads, iron legions, philosophy, the first landmark project.
3. Medieval & Renaissance, then Industrial & Modern (pollution gets serious),
   then Future & Space (the space view, fusion, AI tech, interstellar).
4. Later: multiplayer, where human players replace AI nations.
