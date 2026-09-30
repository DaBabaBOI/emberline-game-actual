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
- **Event cards are trade-offs** (`EVENTS`): every choice gains something and
  costs something, and each card has a `realWorld` line linking it to today.
  Keep those lines modest and general, with no statistics. Effects available:
  resources, population, happiness, sustainability, burn, raidSooner,
  clearForest, protectForest (woodcutters never cut protected tiles),
  sickness (a chance) and gamble (rolled when chosen).
- "AI" in the future era means **in-game tech** (automation, data centers), not an
  AI chatbot.
- In the tutorial the player builds their own woodcutter (step 2). Skipping
  the tutorial gives the basics it would have built (woodcutter, lit campfire, war camp with one warrior,
  gatherer); dev starts get a woodcutter and a campfire. Unrest can't start
  during the calm period after the tutorial. The last woodcutter can't be
  sold, so the player can never soft-lock with no wood.
- **Tutorial budget:** Elder Ama hands over each step's exact cost when the step
  starts (`tutorialBudget(state, [step])` in `advanceTutorial`), plus
  `TUTORIAL_START_FOOD` (20) at the start and the rest of `AFTER_TUTORIAL_RESERVE`
  (40 food, 10 wood in all) at the goodbye. There is never a big pile. When you
  add or change a tutorial step, fill in its `buys`.
- **People on the map are representative:** at most 20 figures at once
  (`MAX_FIGURES` / `figureCounts()` in `world/villagers.tsx`), roughly one per
  three people and one per two warriors. Food use still scales with the real
  population.
- Buildings can be **sold** (the "Sell" tool) for a 50% refund.
- During the tutorial the player can only build **one of each** building.
- **Trade-offs are the point of the game. Always show them.** Every building
  has `gain`, `landCost` and `landImpact` (0–3 stumps on its card); the
  placement preview shows the trade-off. Clicking the Sustainability meter
  shows `sustainabilityBreakdown()` (every part pushing it down or up) and the
  trend over the last minute. A new building or mechanic that affects the land
  must add its own line to the breakdown and its own gain/cost text.
- **Sustainable alternatives exist for the big choices.** Clicking a building
  opens its info panel (`world/building-info.tsx`). Woodcutters can
  **clear-cut** (full wood, strips the forest) or log **selectively** (half the
  wood, only trees above `SELECTIVE_FLOOR`, the forest lasts). The **Plant**
  tool (`PLANT_TOOL`, `PLANT_COST`) turns grass/steppe into young forest or
  helps thinned forest regrow. Keep offering a slower-but-lasting option next
  to every fast-but-damaging one.
- **Elder lessons** (`LESSONS` in content.ts, `lessonDue` in engine.ts): when
  something happens in play (the forest shrinks, food rots, smoke builds up,
  sickness in crowded huts, the land is exhausted, the player plants trees…),
  Elder Ama explains the lesson and links it to a real UN SDG target. One at a
  time, `LESSON_GAP` apart, each only once, never during the tutorial. Keep
  the facts modest and general, with no statistics. New mechanics that teach
  something should get a lesson.
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
- **Pace:** one game tick = `TICK_SECONDS` (1.5 s) at 1× speed. The engine
  counts in ticks; anything shown to the player in seconds goes through
  `secs()` / `perSecond()`. The early game is deliberately calm and easy
  (`GRACE_AFTER_TUTORIAL`: first event after 150 ticks, first raid after 300,
  no disease out of nowhere for 300); pressure builds as the tribe grows.
- **Phones are supported.** Layouts use `md:` breakpoints (bars stack and
  scroll on small screens). There is no hover on touch: the first tap on a tile
  previews (ghost + trade-off card), the second tap builds. Never rely on Esc or
  right-click alone (there is an on-screen Cancel). Map labels (drei `<Html>`)
  use `zIndexRange={[15, 0]}` so HUD panels stay on top. Test new UI at a
  phone size (e.g. Playwright "Pixel 7").
- **Never flood the screen:** at most 2 toasts at once, each gone after ~5 s,
  and only the most urgent warning is shown (the rest behind "+N more").
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
- **Gatherers** (`GATHERING`): the first camp makes full food; each extra camp
  adds only 25% of a camp's food (`gathererShare()`), so food stays something to
  manage. Every camp past the second costs −2 Sustainability (overhunting). The
  placement card explains both (`gatherNote()`), and the "overhunting" lesson
  tells the ecology.
- **Fire scares game** (`FIRE_SCARE`): a gatherer camp within 1 hex of a lit
  campfire makes 30% less food. The placement card warns for both buildings
  (`fireScareNote()`); the tutorial and skip-tutorial never put the gatherer next
  to the fire.
- **Quarries cut the hill** (`QUARRY_CUT`): a working quarry cuts its tile down a
  little every tick (fully in ~600 ticks). The tile sinks by up to 45%, turns to
  bare rock, and a mountain loses its peak. The cut (`Tile.dug`) never grows back
  and keeps costing Sustainability after the quarry is sold (−1 per working
  quarry, up to −3 per cut hillside). Dev: "Cut hills".
- **Each era looks a little different** (subtle, no big UI): Ancient era =
  dyed-linen villager clothes, leather warriors, warmer sunlight, worn dirt paths
  on open ground between buildings, and a bronze trim on the top bar. New eras
  should add their own touches.
- **Sparks** (`SPARKS`, `sparks()`): each lit campfire may spark onto a
  neighbouring tile: grass scorches; a Wooden House (the Stone Age home, id
  `hut`, log walls and bark roof since there's no thatch before farming) burns
  down. Firekeeping halves it; mud-brick houses don't burn. The placement card
  warns (`sparkNote()`) and the hand avoids it. House fires count as a big moment.
- **Farms and rain** (`FARM_RAIN`): placing Farmland clears the nearest
  unprotected forest tile within 2 hexes for good (`forestToClear()`). Rainfall
  = 0.5 + 0.5 x forest cover (`rainfall()`); every field grows that share. The
  placement card, the Farmland card, the food stats ("rain %"), a warning below
  80% and the "rain" lesson explain it.
- **Quarry dust** (`QUARRY_DUST`): gatherers, farms and pens within 2 hexes of a
  quarry make 40% less food. The placement card says how many buildings a new
  quarry would hit (`dustNote()`), and dusty buildings say so in their info card.
  Quarries also cost −3 Sustainability each (the hillside is gone for good).
- **Livestock and clothing:** Herding unlocks the Livestock Pen (a little food,
  grazing wears the land: −2 Sustainability each). Warm Clothes (research) makes each pen
  keep `peoplePerPen` (6) people warm without a fire, so fewer fires are needed
  (less wood cut, less smoke). A trade-off, not a free upgrade.
- **Growing is as hard as surviving** (`GROWTH_PRESSURE`): stored food above 60
  rots (no preservation yet), each lit campfire warms only 10 people (the
  rest are cold, scaled happiness penalty), and raids grow with the tribe's
  size as well as time. Disease also gets likelier as the tribe grows.
- **Raw food** (`RAW_FOOD`, `eatingRaw()`): after the tutorial, with no lit
  campfire nothing can be cooked, so people eat 30% more food. The no-fire
  warning says so.
- **Grass fires are rare** (`SPARKS.perGrass` 0.0001: about 1-2 per 30 minutes
  with three lit fires) and say so clearly ("Grass caught fire!").
- **Disease** (`src/game/disease.ts`, `DISEASE`): outbreaks start from crowding
  (more people, more crowded = likelier), hunts, fishing spots and especially
  welcomed wanderers. It spreads, people recover and are immune for a while
  (so outbreaks burn out), and some die. The sick can't work but still eat, and
  show as pale, slow figures. **Before Herbalism it is "a curse from the gods"**
  (messages still describe symptoms: fever, coughing, weakness); after it,
  it's called sickness and Healer's Huts cut spread and deaths.
- Letting a wildfire burn near the village kills people (at most a quarter of
  the tribe); a few visibly stagger and fall in the flames (`FireVictims`).
- **Leaving the Stone Age:** research Agriculture and grow to
  `NEXT_ERA_POPULATION` (15). A button appears; it opens the **debrief**
  (`hud/debrief.tsx`): achievements vs. what they cost (forest lost, time with
  low Sustainability, lives lost by cause), all six meters with their SDG
  target (`METER_SDG`), and the lessons learned. The ending tier needs
  Sustainability ≥ `MIN_SUSTAINABILITY_FOR_BEST_ENDING` (60) for the best
  ending. Losing shows the same debrief. The Stone Age year stops just before
  the next era's start until the player moves on.
- **Ancient era** (era 1), all trade-offs: Mud-brick House (Hut upgrade via
  its info panel, `upgradeFor`), Scribe School (literacy), Bronze Smithy (+20%
  food and wood per smithy up to 3, burns `SMITHY_CHARCOAL` wood/tick, −4
  Sustainability), Irrigation Canal (next to water; adjacent farms +50%, salts
  the soil −3), Granary (+`GRANARY_KEEPS` food keeps), Forester's Lodge
  (regrows thinned forest nearby), Stone Walls (+`WALL_DEFENSE`). Bronze
  Weapons doubles each warrior. Era-gated event cards use `era`.
- **The Ancient era ends with a Roman legion** (`ROMAN_LEGION`, `updateLegion`):
  scouts see it at 1600 BCE, it lands ~90 ticks later. Size grows with
  population and difficulty; each legionary fights like 2 warriors. Win → the
  **final debrief** (ending tier as above, then "Keep playing"); lose → the
  loss debrief ("Conquered"). No ordinary raids while it's coming. Romans wear
  crested bronze helmets and big red shields (`Figures gear="roman"`).
  (Historically Rome only becomes a power right at the end of this period; the
  legion is the Ancient era's climax on purpose.)
- Seven cultures (Balanced + six with bonuses), three difficulties. There are two
  ways to lose: **famine** (no food for too long) and **unrest** (happiness below
  15 for too long, after the tutorial). Both show a countdown warning first.
  Everything else is a setback.
- **Tutorial hand:** during the tutorial a pixel hand points at the next click
  and the rest of the screen is blocked (`guideFor()` in
  `src/components/civ/guide.ts`, drawn by `hud/guide-overlay.tsx`). Targets are
  elements with `data-guide="…"` or a map tile. While the player is saving up
  resources the hand lets go. New tutorial steps need a case in `guideFor()`.
- **Endings:** a loss (famine, unrest, conquest) always gets the "lost" tier.
  Land-based tiers (thriving, costly, stripped) are only for eras that end.
- **Balance is checked with a full-game bot** (skip tutorial, sensible build order,
  selective logging, replanting, saving up for key buildings). Last check: 4 of 5
  reached the Ancient era at 17-20 min, 2 of those beat the Roman legion (the
  ones that grew huge lost: the legion scales with population). Re-run it after
  changing any rate below.
- **Knowledge:** no base trickle. Milestones pay once each (`KNOWLEDGE_MILESTONES`:
  first of each building +2, population 10/15/20/30/50 +5, first raid won +6,
  first planting +4). Only the first 5 scouting trips teach (+1, or +2 for 20+
  new tiles). Elder's Huts (0.08/tick) and Scribe Schools (0.12) teach steadily,
  each extra one of a kind adds half (`TEACHING`). Literacy adds 0.001 x literacy.
  Cave Paintings +8. Agriculture costs 80.
- **Rates:** gatherer 0.6 food (+0.4 berries), farm 1.0, fishing 0.7 (+0.4 fish),
  pen 0.35, woodcutter 0.25 wood (half when selective), quarry 0.3 stone (+0.3 on
  stone). People eat 0.15 food per tick (`FOOD_PER_PERSON`), warriors 0.12.
  Skipping the tutorial leaves only `AFTER_TUTORIAL_RESERVE` (40 food, 10 wood).
- **Raids** grow with the tribe and by one raider every `RAID_GROWTH_TICKS` (300).
  The Ancient era runs 3 years per tick, so the legion's warning (year -1600)
  comes about 12 minutes after entering it.
- **Advancement goals** (`ADVANCEMENT_GOALS`): every advancement has one goal
  (more for big ones like Agriculture and Bronze Weapons) that must be met before
  it can be researched; Knowledge is still the price. Counting goals (`tally`)
  count from the moment the advancement is reachable (`goalStart` snapshot).
  Cards show the goal and progress (`goalProgress()`). Dev: "Goals on".
- **After-steps** (`AFTER_STEPS`, `state.coach`): after researching, Elder Ama
  explains what it unlocked and the hand walks the player through using it once
  (place the building, or give a warrior a spear), with the clock held like the
  tutorial. Explanation-only steps have a "Got it" button; all can be skipped.
  Buildings from a later era wait until that era. New advancements need a goal
  and an after-step.
- **Spearmen:** after Hunting Spears, new warriors carry spears and existing ones
  can be upgraded (`SPEAR_COST`); spearmen fight 1.5x (`spearmenOf()`), plain
  warriors 1x. Figures show spears or clubs.
- **Knowledge ready:** when Knowledge first covers an advancement, Elder Ama says
  so in a toast (once per advancement, `knowledgeReady()`), and the Advancements
  button shows how many are affordable (`affordableResearch()`).
- **One big moment at a time** (`QUIET_GAP`, `quietEnough()`, `lastBigTick`):
  event cards, raid landings, elder lessons and outbreaks out of nowhere never
  start within a minute of each other; whatever is due waits. The Roman legion
  and outbreaks the player causes are exempt.
- **Updates log:** every change a player would notice gets a plain-language line
  in `UPDATES` (`src/game/updates.ts`), under today's date, newest first. It shows
  in the Updates bar at the top of the landing page and the title screen.
- **Placement card:** the trade-off card sits beside the hovered tile, never on it,
  so the player can see where they are placing.
- **The hand never teaches a harmful spot:** `suggestTile()` avoids anything
  the placement card would warn about (`placementHarm()`), and puts quarries as
  far from the village as it can (up to 8 tiles).
- **Tutorial voice:** Elder Ama's lines read as one conversation: each step
  reacts to what the player just did before asking for the next thing. When the
  last step is done she says goodbye (`TUTORIAL_FAREWELL`, shown in the lesson
  panel, not counted as a lesson). Skipping the tutorial skips the goodbye.
- **HUD stacks:** HUD panels never overlap. Top-centre stack: era prompt, raid
  banner. Left stack: dev panel, tutorial, elder lesson. Right stack: toasts.
  On small screens the stacks become one scrolling column with a capped height.
  Add new panels to a stack instead of positioning them absolutely.
- During the tutorial, the placement preview card is drawn above the guide's
  dimming so the player can read the trade-off.
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
5. **Idea saved by the owner for later: the Kardashev scale.** It ranks a
   civilization by how much energy it can use (Type I: its planet's; Type II:
   its star's; Type III: its galaxy's). A possible frame for the late eras and
   the space age, and a way to tie energy back to sustainability. Not designed yet.
