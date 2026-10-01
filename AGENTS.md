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
  Scouts reveal land, and only scouts: placing a building never uncovers the
  clouds next to it (it used to, which made scouting pointless).
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
  `secs()` / `perSecond()`. The start after the tutorial is short and gentle
  (`GRACE_AFTER_TUTORIAL`: first event after 80 ticks, first raid after 220,
  no disease out of nowhere for 200); then events come every `EVENT_GAP`
  (100-160 ticks) and raids every `RAID_GAP` (170-250). Pressure builds as the
  tribe grows. Playtesters called the old, longer gaps "a snoozefest".
- **Small moments** (`SMALL_MOMENTS`, `MOMENTS` / `smallMoment()` in engine.ts):
  every 20-40 ticks (30-60 s) after the tutorial, one little thing happens,
  picked from those that fit the island right now (a deer herd if the forest
  stands, dust if it's gone, mice in a big store without a granary, wind blowing
  out one of several fires, a baby when there's food and room...). Each is a
  log line (toast) with a small effect; never over an event, raid or the legion,
  never the same one twice in a row, and they don't count as big moments. Tie
  new ones to the land where you can. Each also plays out on the map where it
  happens (`where` picks the tile; `state.moment`; `world/moments.tsx`) for
  `MOMENT_TICKS`, with a short label over the spot: a new moment needs a
  `where`, a scene and a label. Dev: "Moment", or pick one in "Moment...".
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
- **Skipping the tutorial gives what the tutorial gives:** a woodcutter, a lit
  campfire, a Wooden House, a gatherer, a war camp with a warrior, Early Farming
  (researched) and a Farmland. Only the after-tutorial reserve of food and wood
  is left. If the tutorial gains a step, skipping must hand that over too.
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
- **Growing is as hard as surviving** (`GROWTH_PRESSURE`): stored food above 100
  rots (no preservation yet), each lit campfire warms only 10 people (the
  rest are cold, scaled happiness penalty), and raids grow with the tribe's
  size as well as time. Disease also gets likelier as the tribe grows.
- **Planting needs Early Farming**: the Plant tool only appears once Early
  Farming is researched (`plantError()` says so too).
- **Raw food** (`RAW_FOOD`, `eatingRaw()`): after the tutorial, with no lit
  campfire nothing can be cooked, so people eat 30% more food. The no-fire
  warning says so.
- **Grass fires are rare** (`SPARKS.perGrass` 0.0001: about 1-2 per 30 minutes
  with three lit fires) and say so clearly ("Grass caught fire!").
- **Left behind** (`ERA_DEADLINE`, `behindTicksLeft()`): reach the Ancient era
  within 75 / 60 / 45 / 30 minutes (First time / Easy / Normal / Hard) of the
  tutorial ending, or the world moves on and the game is lost ("Left behind").
  A countdown warning shows for the last 5 minutes; the clock pauses once the
  tribe is ready to advance. The Ancient era has its own clock
  (`ANCIENT_DEADLINE`: 30 / 25 / 20 / 15 minutes), counted from the moment the
  Roman legion is beaten, to reach the Classical era. The Classical era ends
  with the drought, so it has none. New eras should get their own limit. The
  sensible bot never hits it on Normal. Dev: "Nearly behind". The Stone Age calendar runs at the pace of
  this deadline (`stoneAgeYear()`): 50,000 BCE when the tutorial ends, 3,000 BCE
  exactly when the world moves on, so the year never stalls and doubles as the clock.
- **Picking people up** (`world/pick-up.tsx`, `dropOutcome()` / `dropPerson` in
  the engine, `DROP`): after the tutorial, with no tool selected, the player can
  grab a villager and drop them anywhere. A ring and label under them say what
  will happen. Open ground: nothing. A working building: they help (+50% output
  for 20 ticks). A cold campfire: they relight it. A lit fire or the open sea:
  they die (-1 person, happiness -6, counted as fire / accident in the debrief).
  Shallow water or a mountain: they get sick. Cloud (unexplored land): they
  vanish and come back only 5% of the time, with a little new map; this must
  stay rare so scouting is still worth buying. Dev: "Back from fog".
  Controls: a click within `GRAB_RADIUS` (44 px) of a person, or within
  `GRAB_GROUND` of them on the ground, picks them up. A click (not a drag)
  keeps them in hand until the next click or Enter; arrow keys / WASD walk
  them (camera-relative), Esc puts them back, P picks up the person nearest
  the middle of the screen. Dragging works as before.
- **Chief level** (`XP`, `CHIEF_TITLES`, `xpToReach()`, `awardXp()` in the
  reducer): XP only goes up. It comes from what the player does (build +5, first
  of a kind +10, each new peak person +2, research +20, raid won +15, sapling +3,
  new era +50) and every minute everyone is fed / the land is healthy (+2 each).
  Levels need 25 x (L-1) x L XP in total; each gives a title and +2 Knowledge. The
  bar sits in the top bar. Dev: "+100 XP". A sensible game reaches about level 4
  by the Ancient era.
- **Goal line** (`currentGoal()`, `GoalLine`): one line under the top bar saying
  what to aim for now with live progress (Agriculture's goal and Knowledge, then
  15 people, then Rome). Hidden while the tutorial or a guided step is talking.
- **Intro story** (`intro-story.tsx`): a new (non-dev) game opens with a few
  lines of story and three boxes: your goal, then, you lose if. Keep it short.
- **Raids** (`RAID_KINDS`, `RAID_RESPONSE`, `updateRaids`): three kinds, named
  in the card: a small band (x0.7 strength, takes wood), a war party (x1.35,
  takes food and wood), a fire raid (x1.1, burns the building nearest where they
  landed, even if you hide). The first raid is always a band. When raiders land
  the player picks a response before they arrive: **Fight** (default if no
  choice; the fight lasts `fightTicks`, shown as a tug-of-war bar, and training a
  warrior can still tip it), **Hide** (nobody dies, they take a smaller share)
  or **Pay tribute** (4 food per raider, they leave but the next raid comes 60
  ticks sooner). Each War Camp holds `WARRIORS_PER_CAMP` (6); the Train button
  says "+1 camp = +6" when full. **Watch Fire** (after Hunting Spears, on the
  shore): raiders seen 8 ticks sooner, +1 defense (max 2), burns wood, -1
  Sustainability. Warriors patrol around camps and watch fires, recruits walk
  out of a camp, and warriors take at most 40% of the figures. The legion's base
  is 8 (was 6) to match the bigger armies. Dev: "Raid: band / party / fire".
- **Famine is recoverable** (`FAMINE`, `famineOptions()`): with the stores empty,
  about one person dies every 10 s (`deathsPerTick` 0.15, not a share of the
  tribe) and happiness drops by 15; the game is lost only after `famineLimit`
  (Easy 120, Normal 80, Hard 55 ticks) and the counter winds down twice as fast
  once there is food. The famine warning offers three emergency measures, each a
  trade-off: forage (+15 food, strips 3 nearby forest tiles, 40-tick cooldown),
  slaughter a herd (+30, a Livestock Pen is lost), eat the seed grain (+25,
  fields grow half as much for 80 ticks). Dev: "Starve".
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
  ending. Losing shows the same debrief. The Stone Age year reaches 3,000 BCE
  only at the "left behind" deadline (see Left behind).
- **Ancient era** (era 1), all trade-offs: Mud-brick House (Hut upgrade via
  its info panel, `upgradeFor`), Scribe School (literacy), Bronze Smithy (+20%
  food and wood per smithy up to 3, burns `SMITHY_CHARCOAL` wood/tick, −4
  Sustainability), Irrigation Canal (next to water; adjacent farms +50%, salts
  the soil −3), Granary (+`GRANARY_KEEPS` food keeps), Forester's Lodge
  (regrows thinned forest nearby), Stone Walls (+`WALL_DEFENSE`). Bronze
  Weapons doubles each warrior. Era-gated event cards use `era`.
- **The Roman legion is the Ancient era's big test** (`ROMAN_LEGION`, `updateLegion`):
  scouts see it at 1600 BCE, it lands ~90 ticks later. Size grows with
  population and difficulty; each legionary fights like 2 warriors. Lose → the
  loss debrief ("Conquered"). Win → the era goes on (`legionBeatenTick`), raids
  come back, and the "left behind" clock starts. No ordinary raids while it's coming.
- **Leaving the Ancient era** (`readyForNextEra`): the legion beaten, **Coinage**
  researched (era 1, 60 Knowledge, goal: hold 150 coins) and
  `CLASSICAL_POPULATION` (40) people. After the legion the Ancient calendar runs
  from the year of the victory to 500 BCE over `ANCIENT_DEADLINE` (`nextYear()`),
  like the Stone Age's.
- **Classical era** (era 2, a year per tick; `WATER`, `TOWN`, `CARAVAN`):
  - **River:** the home island has one (`riverPath()` in `map.ts`, terrain
    `river`: water, not land). It is fixed geography, from the hills just south
    of the village to the sea. Old saves get it added on load (only where
    nothing is built).
  - **Water:** Well (+12 people's water, past 4 wells −2 Sustainability each),
    Aqueduct (must touch the river, `needsRiver`; water for 40, fields within 3
    tiles +20% and they keep 70% in the drought; −3), Watermill (touches the
    river; fields within 2 tiles +25%; −2).
  - **Towns:** Town House (24 people, upgrade from a Mud-brick House; keeps its
    24 warm without a campfire, `TOWN.warmth`). With Town Houses standing,
    sickness starts and spreads up to 2x faster for the share without clean
    streets (`sanitation()`: Public Latrines 25 each, Bathhouses 10). Bathhouse:
    +8 happiness (up to 2), the sick recover faster, burns wood, −2.
  - **Trade:** Market (coins; traders bring a little sickness), Silk Road
    Contact → the Caravan button (one per Market at a time, 40 ticks, +60 coins
    +4 Knowledge, 20% chance of sickness; drawn as a ship to the Silk Steppe,
    `world/trade.tsx`). Paved Roads: paths become stone roads, +25% coins,
    travel 20% cheaper. Jade Road secret: 5 caravans.
  - **Also:** Academy (Philosophy, teaching building), Iron Weapons (warriors
    ×3, smithies burn 50% more charcoal). New lessons (water, sanitation, river,
    towns, trade, drought) and event cards (dirty river, timber merchant, new
    quarter). Elder Ama welcomes the player to the era (`ERA_INTROS`).
- **The great drought ends the Classical era** (`DROUGHT`, `updateDrought`):
  the elders warn at 100 AD (about 15 minutes in), it starts 120 ticks later and
  lasts 120 ticks (3 minutes). Rain falls to 10% plus up to 30% more with the
  forest standing; gatherers and pens give half. People without water
  (`waterSupply()` vs population) lose happiness and fall sick more. Granaries
  keep the stored food. In the drought the famine clock runs at half speed
  (`FAMINE.droughtClock`). No raids from the warning until the rains return.
  Coming through it → the **final debrief** ("Keep playing"). The drought parches
  the grass, muddies the river and puts dust in the air. Dev: "Drought soon /
  now / End drought", "Beat legion", "Caravan back".
- **Growth and famine in big towns:** the tribe only grows when it makes at
  least as much food as it eats (not just when the Food meter is 45+), by at most
  `GROWTH_CAP` (0.35) people a tick. In a famine, on top of the deaths, the
  people the town can't feed leave (`FAMINE.leaveShare` of them a tick).
- **Land strain is a slope:** harvests shrink by up to 40% as Sustainability
  falls from 40 to 20 (`LAND.strainDepth`), after a minute below 40. The warning
  names the biggest cost from the Sustainability breakdown. Romans wear
  crested bronze helmets and big red shields (`Figures gear="roman"`).
  (Historically Rome only becomes a power right at the end of this period; the
  legion is the Ancient era's climax on purpose.)
- **First-time mode** (difficulty `first`, `GENTLE`): the default on the title
  screen until a game has been started in this browser (`emberline-played` in
  localStorage). The clock runs at half speed for the first 100 ticks
  (`tickSeconds()`, used by the game clock and countdowns), events and raids are
  spaced 1.5x further apart until tick 600, raiders are half as strong, people
  eat 25% less, and famine/unrest take much longer (150/90 ticks).
- Seven cultures (Balanced + six with bonuses), four difficulties (First time, Easy, Normal, Hard). There are three
  ways to lose in everyday play: **famine** (no food for too long), **unrest**
  (happiness below 15 for too long, after the tutorial) and **land collapse**
  (`COLLAPSE`: Sustainability below 20 for 80 ticks, about 2 minutes, after the
  tutorial and the calm period; `collapseTicks`, winds down twice as fast once
  the land recovers). All three show a countdown warning first. The Roman
  legion is the fourth (conquest) and taking too long to leave the Stone Age is
  the fifth (**left behind**, see below). Everything else is a setback. Balance: the
  sensible bot never gets near 20; a reckless bot (clear-cutting, never
  replanting) collapses around 10 minutes. Dev: "Collapse".
- **Hard mode: wear and repairs** (`WEAR`, `wearBuildings`, `wearFactor`,
  `repairCost`, tile `worn`): in Hard only, every building but the campfire
  wears by 1/900 a tick (busy ones 1.5x, brick and stone 0.6x). Past 50% worn
  it makes less, down to nothing when broken (worn 1); a broken home holds
  half its people; costs (like a bathhouse's wood) don't shrink. A hammer
  shows over buildings 70%+ worn (red when broken) and a warning counts them.
  Repair in the building panel: 15% of its cost, scaled by how worn it is
  (at least 30%). New and upgraded buildings start fresh. Dev: "Wear".
- **Natural disasters** (`DISASTERS`, `DISASTER_HITS`, `updateDisasters` /
  `strike` in the engine, `world/disasters.tsx`): the first about 10 minutes
  after the tutorial, then one every 10–17 minutes; never over a raid, the
  legion, the drought or an event, one big moment at a time. Each is warned of
  (banner with a countdown), then strikes. Storm: all fires out, wooden
  buildings without 2 forest tiles beside them may be wrecked (rain,
  lightning, dark sky). Flood: low tiles by the river or sea go under (fewer
  with more forest standing); buildings there stop; afterwards fields there
  get silt (+40%). Earthquake: camera shake, cracks, buildings near it fall
  (brick/stone 25%, wood 8%, at most 3; lost homes kill). Landslide: only on
  hills with stripped forest or quarry cuts around them and buildings below.
  The last woodcutter is never destroyed. Deaths count as "disasters" in the
  debrief. Lessons: disasters (SDG 11.5), slopes (SDG 15.3). Dev: Storm,
  Flood, Earthquake, Landslide.
- **Discovery scenes** (`DISCOVERIES` in content, `hud/discovery-scene.tsx`,
  `state.cutscene`): researching an advancement or finding a secret plays a
  short pixel scene (sky, people walking in, the discovery appearing, three
  lines of story). The clock waits until it's closed; it can be skipped or
  sped up. Every new advancement needs a scene (lines in the tribe's voice,
  modest about history). Dev: pick one and press "Scene".
- **Accessibility settings** (`accessibility-settings.tsx`, mounted in the root
  layout): a floating Settings button on every page, except while a game is on
  screen (`data-in-game` on `<html>`, set by `GameScreen`): there the same
  options are in the game's Menu (`AccessibilityMenuSection`). Nothing may float
  over the game's bottom bar.
- **Tutorial hand:** during the tutorial a pixel hand points at the next click
  and the rest of the screen is blocked (`guideFor()` in
  `src/components/civ/guide.ts`, drawn by `hud/guide-overlay.tsx`). Targets are
  elements with `data-guide="…"` or a map tile. While the player is saving up
  resources the hand lets go. New tutorial steps need a case in `guideFor()`.
- **Endings:** a loss (famine, unrest, collapse, conquest, left behind) always gets the "lost" tier.
  Land-based tiers (thriving, costly, stripped) are only for eras that end.
- **Balance is checked with a full-game bot** (skip tutorial, sensible build order,
  selective logging, replanting, saving up for key buildings; after the legion it
  researches Coinage first, and in the Classical era gets water before the
  drought). Last check, Normal (12 seeded games): all reached the Ancient era
  at 20-26 min, 7 beat the legion (the same bot on the version before the
  Classical era: 5 of 12), and 5 of the 6 towns that reached the Classical era
  came through the drought, most losing about half their people; the one with
  no water lost to unrest. Hard (6): 3 beat the legion, all 3 came through the
  drought with heavy losses. First time (4): 3 came through, 1 ruined its land (collapse). In big towns
  sickness kills the most, which is what latrines are for. Re-run it after
  changing any rate below.
- **Knowledge:** no base trickle. Milestones pay once each (`KNOWLEDGE_MILESTONES`:
  first of each building +2, population 10 +1 (once), first raid won +6,
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
- **Judging documentation** lives in `docs/` (design, architecture diagrams,
  process and testing, the finals talk). Screenshots in `docs/images/` are real
  captures of the build, never mock-ups. When a feature changes what a doc or
  screenshot shows, update it in the same pull request, and keep every number
  there matching the code or a test run.
- Multiplayer is **later** (the owner wants it; the Supabase project above can host it, e.g. with Realtime); design state so AI nations could be replaced by humans,
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
- **Online features are optional** (`src/lib/online.ts`, Supabase project
  `shistech-hackathon`): playtest feedback (Menu > Feedback), the leaderboard
  (on the end-of-story debrief; lost games aren't listed) and cloud saves
  (Menu > Save to the cloud gives a code; the title screen loads it). Plain
  `fetch` to Supabase's REST API with the *publishable* key, no SDK. The
  database rules are the security: feedback is insert-only, the leaderboard is
  read + insert only with range checks, and saves are reachable only through the
  `save_game` / `load_game` functions. Every call must fail quietly: the game
  has to work fully offline. Never put a secret (service_role) key in the code.
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
2. Classical: built (see above). Still open: a landmark project.
3. Medieval & Renaissance, then Industrial & Modern (pollution gets serious),
   then Future & Space (the space view, fusion, AI tech, interstellar).
4. Later: multiplayer, where human players replace AI nations.
5. **Idea saved by the owner for later: the Kardashev scale.** It ranks a
   civilization by how much energy it can use (Type I: its planet's; Type II:
   its star's; Type III: its galaxy's). A possible frame for the late eras and
   the space age, and a way to tie energy back to sustainability. Not designed yet.
