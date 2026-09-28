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
- In the tutorial the player builds their own woodcutter (step 2). Games that
  skip the tutorial (or dev starts) get one free. The last woodcutter can't be
  sold, so the player can never soft-lock with no wood.
- **Tutorial budget:** a new game starts with exactly what the tutorial buys
  (`tutorialBudget()`, from `TUTORIAL[].buys`) plus `AFTER_TUTORIAL_RESERVE`,
  and the clock is held while the hand is guiding, so nobody waits. If you add
  or change a tutorial step, fill in its `buys`.
- **People on the map are representative:** at most 20 figures at once
  (`MAX_FIGURES` / `figureCounts()` in `world/villagers.tsx`), roughly one per
  three people and one per two warriors. Food use still scales with the real
  population.
- Buildings can be **sold** (the "Sell" tool) for a 50% refund.
- During the tutorial the player can only build **one of each** building.
- **Sustainability = land health** (`computeMeters`): mostly the share of
  forest still standing within `LAND.radius` of the start (`forestCover`), minus
  a little for campfire smoke, quarries and fields. Woodcutters really fell the
  trees near them and only make wood while trees remain (`woodcutterYield`), so
  recovery is slow: the forest has to grow back. Forests regrow only where they
  stood; they never spread onto new land.
- **Exhausted land:** while Sustainability stays below `LAND.strainLevel`,
  `strainTicks` builds up; forests stop regrowing and food harvests shrink
  (up to −40%). A warning explains it.
- **Wildfire odds** grow with every campfire near trees (`fireRisk`,
  `FIRE_RISK`), and fires start next to a campfire.
- **Biomes:** grass, forest, dry **steppe** (buildable, can't be farmed), wet
  **marsh** (gatherers only), beach, hills, mountains. The Silk Steppe island is
  mostly steppe.
- Food use scales with people (`FOOD_PER_PERSON`, `FOOD_PER_WARRIOR`); the food
  meter mostly measures "do we make enough for everyone" (45 = just enough,
  about 2× what you eat = 100), so it drops as the tribe grows. **Food should
  be a scramble**: one gatherer (0.6/s, +0.5 on berries) does not feed a tribe;
  farms give 1.1/s, fishing 0.9/s (+0.6 by fish), hunts `HUNT_FOOD`.
- **Wood is scarce** in the Stone Age by design; scouting is expensive and gets
  pricier each trip (Transport advancements make it 20% cheaper each).
- Events are rare but **hit hard** (a wildfire really burns the forest and nearby
  buildings, leaving charred ground that heals). Keep events meaningful.
- **Low-resource warnings** (food, wood, famine, unrest, no fire) show bottom-left and the
  top-bar number flashes red. Add new ones in `warnings()` in `engine.ts`.
- Numbers in the UI use the `font-num` class (VT323): Pixelify's digits 2/5/8
  are too similar.
- The Advancements screen has one tab per era; each tab lays out that era's
  nodes by branch. Cross-era prerequisites show as "Needs: …".
- **Tutorial locks:** while the tutorial runs, only what it has introduced so far
  can be used (`TUTORIAL[].unlocks`, `tutorialLocked()`); the rest shows a lock
  until the tutorial is finished or skipped. When adding a building or tool,
  decide which tutorial step (if any) introduces it.
- **Campfires burn out** after `CAMPFIRE_BURN_TICKS` (×1.5 with Firekeeping)
  and must be relit by clicking them (`RELIGHT_WOOD` = 1 wood). Only lit fires
  give warmth, energy, smoke, wildfire risk, and a place for villagers to sit.
  With no lit fire, happiness drops and a warning says how to relight. The clock
  is held during the tutorial, so the first fire can't go out mid-tutorial.
- Scouting costs food and wood and gets more expensive with each trip.
- **Dev mode** (`/play/?dev`): start in any era with plenty of resources; an
  in-game dev panel can grant resources, reveal the map and jump eras. Keep it
  working when adding eras. It must never show without `?dev`. **Every new
  feature gets a dev-panel button (or dev option) to trigger or test it**, e.g.
  Wildfire, +10 people.
- **Disease** (`src/game/disease.ts`, `DISEASE`): outbreaks start from crowding
  (more people, more crowded = likelier), hunts, fishing spots and especially
  welcomed wanderers. It spreads, people recover and are immune for a while
  (so outbreaks burn out), and some die. The sick can't work but still eat, and
  show as pale, slow figures. **Before Herbalism it is "a curse from the gods"**
  (messages still describe symptoms: fever, coughing, weakness); after it,
  it's called sickness and Healer's Huts cut spread and deaths.
- Letting a wildfire burn near the village kills people (at most a quarter of
  the tribe); a few visibly stagger and fall in the flames (`FireVictims`).
- Seven cultures (Balanced + six with bonuses), three difficulties. There are two
  ways to lose: **famine** (no food for too long) and **unrest** (happiness below
  15 for too long, after the tutorial). Both show a countdown warning first.
  Everything else is a setback.
- **Tutorial hand:** during the tutorial a pixel hand points at the next click
  and the rest of the screen is blocked (`guideFor()` in
  `src/components/civ/guide.ts`, drawn by `hud/guide-overlay.tsx`). Targets are
  elements with `data-guide="…"` or a map tile. While the player is saving up
  resources the hand lets go. New tutorial steps need a case in `guideFor()`.
- Multiplayer is **later**; design state so AI nations could be replaced by humans,
  but do not add a backend now.

**Look and feel**
- Bright, stylized low-poly (Mini Empires). Build models from multiple composed
  primitives with real detail (roofs, doors, props), never a single box or sphere.
- **Consequences must be realistic for the era.** In the Stone Age there is no
  smog: smoke comes only from fires (more campfires, thicker smoke; many fires
  haze the valley). Damage shows as cut-over forest (stumps, bare ground),
  charred land after fires, dried-out grass when the land is exhausted, and
  fewer animals (they live only in mature forest).
- **No emojis in the UI.** All icons are hand-drawn 12×12 pixel sprites in
  `src/game/sprites.ts`, rendered with `<PixelIcon>`. Need a new icon? Draw it there.
- The 2D UI is **pixel style**: the `pixel-panel` / `pixel-panel-dark` /
  `pixel-btn` classes (hard edges, chunky outlines, offset shadows, no blur,
  no rounded corners) and the Pixelify Sans `font-pixel` for headings and HUD text.

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
