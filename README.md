# Emberline

**A sustainability trade-off game.** Grow a tribe from the Stone Age into a
Classical town without destroying the land that feeds it. Every house, fire,
woodcutter and smithy helps your people now and costs the land later. Made for
the SHISTECH Hacktrack hackathon (UN Sustainable Development Goals theme), built
around **SDG 11: Sustainable Cities and Communities**.

### Play it: https://dabababoi.github.io/shistech-hackathon/

No install needed. It runs in the browser, on a laptop or a phone.

---

![A Stone Age village](docs/images/04-village-stone.png)

**Judges:** the full documentation, mapped to each judging criterion, is in
[`docs/`](docs/README.md): [game design](docs/design.md),
[architecture diagrams](docs/architecture.md),
[process and testing](docs/process.md) and the
[finals presentation plan](docs/presentation.md), with real screenshots.

> **Still to add before judging:** a gameplay GIF (`assets/gameplay.gif`) and a
> demo video link.

---

## Why this project exists

Emberline was built for the SHISTECH Hacktrack and the UN Sustainable Development
Goals theme. The core idea is simple: the player should not be rewarded for
building endlessly without cost. Every decision changes the land, the people, and
the future of the village.

The game is about sustainable growth: gather enough food, keep the people warm,
watch the forest, and decide when a short-term win is worth a long-term loss.

## The idea: every choice is a trade-off

Most city builders reward you for building as much as you can. Emberline asks the
question SDG 11 asks: **can a settlement grow without wrecking the place it lives
in?**

Every building shows what you get and what the land pays, right where you place
it:

| You build… | You get… | The land pays… |
| --- | --- | --- |
| Woodcutter | Wood for fires and building | It fells the trees around it; once they're gone it makes no wood |
| Campfire | Warmth for 10 people | Burns wood, adds smoke, raises the risk of a wildfire in nearby trees, throws sparks that can scorch grass or burn a house next to it, and scares the animals away from a gatherer's camp next to it |
| Gatherer's Camp | Wild food, more on berry bushes | Each extra camp adds only a quarter of a camp's food, and past two camps the animals are hunted faster than they can breed |
| Wooden House | Room for 6 more people | More people eat more food and need more fires; wood burns, so sparks from a campfire next door can set it alight |
| Farmland | Lots of steady food | Clears the nearest patch of forest for good, and fewer trees means less rain, so every field grows less |
| Stone Quarry | Stone for better buildings | Cuts the hill down for good (you can watch it sink into a rocky pit), and its dust covers crops and berries nearby |
| Livestock Pen | Food, and later warm clothes so fewer fires are needed | Grazing wears down the grass |
| Bronze Smithy *(Ancient)* | Better tools: +20% food and wood | Burns wood for charcoal all the time, heavy smoke |
| Irrigation Canal *(Ancient)* | Neighbouring farms grow 50% more | Watered soil slowly turns salty |

And for the big choices there is a slower option that lasts:

- **Clear-cut** a forest for full wood now, or log **selectively** for half the
  wood and a forest that stays standing.
- **Plant saplings** to restore land you cut, or build a **Forester's Lodge**.
- Keep people warm with **fires** (wood, smoke, wildfire risk) or with
  **clothes** from your herds.
- Build a **Granary** instead of letting surplus food rot.

**Sustainability measures how much forest is still standing** around the
village (minus smoke, quarries, fields, too many gatherer camps and more). Click it to see exactly
what is pulling it down. It recovers only as fast as the forest grows back.
Push it too low for too long and the land wears out: forests stop regrowing and
harvests shrink. **Forests also bring rain**: the less forest stands, the less
rain falls and the less every field grows. You can see the damage on the map:
stumps and bare ground, quarried pits, smoke over the fires, fewer deer to hunt.

## How the game teaches

- **See the cost before you build.** Trade-off cards beside every placement
  (with warnings like "dust would cut the food of 2 buildings nearby"), stumps
  on every building card, and a Sustainability breakdown with a trend arrow.
- **A tutorial that talks to you.** Elder Ama walks you through your first fire,
  woodcutter, house, camp, scouts, warrior and farm as one conversation, handing
  over just what each step needs. She explains the stumps on each building and
  how Knowledge is earned, then says goodbye when you're ready.
- **Every advancement is earned by doing.** Each one has its own goal before you
  can research it: keep a fire burning for two minutes before Storytelling, hunt
  animals before Herding, lose food to rot before Pottery, farm, grow and store
  food before Agriculture. The card shows your progress. After you research it,
  Elder Ama and the pointing hand walk you through using it once.
- **Elder Ama's lessons.** When something happens in play (the forest shrinks,
  too many camps hunt the herds, the rains fail, food rots, smoke builds up,
  sickness spreads in crowded huts, the soil turns salty), she explains the
  lesson and links it to a real UN target.
- **Real-world event cards.** Dilemmas like a sacred grove, overhunting, a rich
  but flood-prone riverbank, or fires inside the huts. Each card says how it
  connects to the world today.
- **A debrief at the end of each era.** Achievements next to what they cost
  (forest lost, time the land was unhealthy, lives lost), every meter with its
  SDG target, and the lessons your people learned. The **best ending needs
  Sustainability of 60 or more**, so growth can't just ignore the damage. And a
  village that starves or breaks up never gets a good ending, however healthy
  the land is.

### How it maps to the SDGs

**SDG 11 (Sustainable Cities and Communities)** is the core. The game's lessons
and events also link to these goals:

| Goal | In the game |
| --- | --- |
| **11 · Sustainable Cities & Communities** | Shelter, crowding, planning growth, pollution from fires and smithies |
| 15 · Life on Land | Sustainability is the forest left standing; deforestation, lost wildlife, failing rains, worn-out and salty soil, quarried hills, replanting |
| 7 · Affordable & Clean Energy | Warmth costs wood and smoke; clothes are the efficient alternative |
| 12 · Responsible Consumption | Food waste, overhunting, charcoal eating the forest |
| 4 · Quality Education | Literacy is a meter; elders and scribe schools |
| 9 · Industry, Innovation & Infrastructure | The advancement tree: each technology opens new buildings and new trade-offs |

## What you can do

- **Explore hex islands** of grassland, forest, dry steppe, marsh and hills.
- **Build 19 kinds of buildings** across two eras, with a see-through preview and
  a trade-off card first. Sell any of them back for half.
- **Balance six meters**: Food, Shelter, Happiness, Literacy, Energy and
  Sustainability.
- **Watch your people** walk to work, sit on the logs around the fire, fall
  sick, and hunt. Hover a house to see how many live there.
- **Earn Knowledge from milestones**: your first of each building, your tribe
  growing, your first scouting trips, beating raiders, planting saplings. Elder's
  Huts and schools teach a little all the time. Elder Ama tells you when you can
  research something new. Knowledge is slow on purpose: a new era takes real
  play, not five minutes.
- **Defend against raiders.** When raiders land you choose: fight, hide in the
  houses, or pay them off with food. Your warriors march out and fight on the
  map. After Hunting Spears you can arm them (spearmen count as 1.5 warriors), and
  after Firekeeping you can build a Watch Fire on the shore to see raiders coming
  sooner.
- **Pick your people up** and drop them somewhere: on a building to help out, on
  a cold campfire to relight it. Drop them in a fire, the sea or the unexplored
  fog and you may lose them.
- **Survive sickness.** Before Herbalism your people call it a curse from the
  gods; after it, healers can help.
- **Reach the Ancient era** (research Agriculture, grow to 15 people): bronze,
  irrigation, writing, granaries, walls. You can see it: people wear dyed linen,
  paths wear into the ground between buildings, and the light turns warmer.
- **Face the Roman legion** in the Ancient era, then learn Coinage and grow to
  40 people.
- **Build a Classical town** by the river: wells and aqueducts, tall Town
  Houses (warm without campfires, but they need latrines or sickness spreads),
  a market, caravans across the sea to the Silk Steppe, paved roads, an
  academy. Each has its own cost to the land or the people.
- **Survive the great drought** that ends the Classical era: the elders warn you
  three minutes ahead, then the rain almost stops for three minutes. Water,
  full granaries and standing forests get you through.
- **Name your people**, pick a culture and a difficulty, and play on a laptop or
  a phone. A guided tutorial with a pointing hand teaches the basics. New
  players start in **First time** mode: a slower clock and a gentler start.
- **Track your progress**: a chief level that only goes up, and a goal line that
  says what to aim for next.
- **Five ways to lose**: famine, unrest (people too unhappy for too long), land
  collapse (Sustainability too low for too long), conquest by the legion, or
  being left behind (taking too long to reach the next era). Every one gives
  you a countdown first.

The game autosaves in your browser, and you can save to the cloud with a code to
carry on elsewhere. There is a leaderboard and a feedback form in the menu. An
**Updates** bar at the top of the project page and the title screen lists what's
new.

## Roadmap

**The Stone Age, the Ancient era and the Classical era are complete and
playable**, from the first campfire through the Roman legion to the great
drought and a final debrief. Next we plan to carry the same trade-offs further:

| Next | What it adds to the trade-off |
| --- | --- |
| Medieval & Renaissance | Being designed now |
| Later eras | Industry and the choice between dirty and clean energy, up to a space age. One idea we want to explore: the Kardashev scale, which ranks a civilization by how much energy it can use |
| Multiplayer | Neighbouring nations run by other players instead of the computer |

## What went wrong and how we adapted

- **Our first version was the wrong game.** We started with a simple turn-based
  city sim made of meters and buttons, then added a 3D island on top. It still
  didn't feel like a game, so we rebuilt it as a real-time hex-island builder.
- **We cut multiplayer to ship.** We had built multiplayer rooms on a hosted
  database. When we moved to free static hosting on GitHub Pages there was no
  server to run it, so we removed it and saved games in the browser instead.
  Later we brought a small hosted database back (Supabase) just for cloud
  saves, a leaderboard and feedback; the game itself still runs in the browser.
- **Emojis made it look cheap.** The first HUD used emoji icons. We replaced every
  one with hand-drawn 12×12 pixel sprites and a pixel-style interface.
- **People walked through mountains.** Villagers clipped into terrain and
  buildings, and sometimes vanished. We made them follow the ground height and
  steer around buildings, mountains and water.
- **Our pollution wasn't realistic.** Early on, woodcutters produced smog and
  grey skies, which doesn't fit the Stone Age, and forests spread over the whole
  island. We rebuilt Sustainability around the forest that's actually left,
  made smoke come only from fires, and added steppe and marsh biomes.
- **Balance swung both ways.** Food was first far too easy, then so tight that
  new players were overwhelmed, and the game felt too fast with too many
  messages at once. We slowed the clock, made the start calm and easy with no
  raids or disease early on, and let pressure build as the tribe grows.
- **Players survived without learning anything.** Playtesters were busy
  surviving and missed the point. So we put the trade-off in front of every
  decision (trade-off cards, the Sustainability breakdown), added sustainable
  alternatives (selective logging, replanting, clothes), elder lessons and
  real-world event cards.
- **The tutorial had rough edges.** Players could skip ahead, then had to wait
  for resources, and skipping it left the tribe with no fire or defense. The
  lines also read like separate orders, not a person talking. We added a
  pointing hand that blocks other clicks, started players with exactly the
  resources the tutorial needs, gave skippers the basic buildings and a warrior,
  and rewrote Elder Ama's lines as one conversation.
- **Some choices had no downside.** Gatherer camps were safe to spam, the quarry's
  cost ("digs pits") was something nobody cared about, and a trickle of
  Knowledge felt both too fast and too slow. Extra camps now add much less food
  and hurt the wildlife, quarry dust cuts nearby harvests, and Knowledge comes
  from milestones.
- **Knowledge swung from too easy to too hard.** Players reached the Ancient era
  in five minutes by spamming scouts. We slowed Knowledge down, then wrote a bot
  that plays the whole game by the real rules. It showed we had gone too far:
  the economy starved of wood, Agriculture was out of reach, raids outgrew any
  defense and the Roman legion came before bronze weapons were possible. We
  rebalanced until the bot, playing sensibly, reaches the Ancient era in about
  20 minutes and beats the legion in some games but not all.
- **The tutorial handed out a big pile.** It started players with everything the
  tutorial would buy, so the first screen showed plenty of food and wood. Now
  Elder Ama hands over each step's supplies as you reach it.
- **Thatched huts before farming.** Our first homes had straw roofs, but straw
  comes from farmed grain. The Stone Age home became a log-and-bark Wooden House,
  which also gave fire a new trade-off: sparks can burn it down.
- **You couldn't tell the eras apart.** Entering the Ancient era changed the
  buildings on offer but not how the village looked, so we added dyed clothes,
  worn paths, warmer light and a bronze trim.
- **Small bugs added up.** A lost game could be "continued" for a few seconds
  from an old save, a loss could be called "the best ending", digits 2, 5 and 8
  looked alike, countdowns skipped seconds, panels drew over each other, and
  the tutorial pointed at buttons off the edge of a phone screen. Each got fixed
  as players found it.

## Controls

| Action | Laptop | Phone |
| --- | --- | --- |
| Move the camera | Drag | Drag with one finger |
| Zoom / rotate | Scroll wheel / right-drag | Pinch / two-finger drag |
| Build | Pick a building, click a tile | Pick a building, tap a tile to preview, tap again to build |
| Building info (logging mode, upgrades) | Click the building | Tap the building |
| Cancel | `Esc`, right-click or **Cancel** | **Cancel** |
| Why is Sustainability low? | Click the leaf meter | Tap the leaf meter |
| Speed | Pause / 1× / 2× / 4× in the top bar | Same |

## How we built this

We built Emberline with the help of an AI coding assistant (Claude Code). Most of
the code was written by the assistant, following our instructions. We want to be
upfront about that.

**What the team did**

- Decided what the game is: the Stone Age start, a cost to the land on every
  building, the eras, the ways to lose, the look. Every rule is written down in
  [`AGENTS.md`](AGENTS.md).
- Played it over and over, and asked friends to play it, then turned what we
  saw into changes ("too easy", "too much at once", "nothing happens", "raiders
  look glitchy").
- Chose between options for each new feature, and checked the result in the game
  before merging it.
- Reviewed and merged every change through a pull request.

**What the assistant did**

- Wrote and changed the code, and tested it (including a bot that plays whole
  games to check the balance).
- Took the screenshots and drafted the documentation and slides, which we
  reviewed.

**Who did what on the team:** _[fill in before submitting]_

## Tech stack

- Next.js 16 (static export)
- React 19
- TypeScript
- Tailwind CSS
- React Three Fiber / Three.js
- Hosted on GitHub Pages
- Supabase for cloud saves, the leaderboard and feedback (only the public
  "publishable" key is in the code)

## Project structure

```
assets/                 Screenshots, GIF and video for this README
src/
  game/                 Pure game logic, no React
    types.ts            Game state and data shapes
    content.ts          Eras, buildings, advancements, events, lessons, tutorial (data)
    updates.ts          The "what's new" list shown in the Updates bar
    engine.ts           The simulation: reducer, ticks, meters, raids, the legion, saving
    disease.ts          Sickness: outbreaks, spread, recovery
    map.ts, hex.ts      Hex grid maths and the island map generator
    noise.ts            Seeded random + noise
    sprites.ts          Hand-drawn pixel icons
  components/civ/
    game-screen.tsx     Title screen → game, HUD layout
    game-provider.tsx   Game state, the tick loop and autosave
    guide.ts            Tutorial hand: what to point at next
    title-screen.tsx    Name, culture and difficulty picker
    hud/                Top bar, meters, bottom bar, advancements, lessons, debrief
    world/              Everything 3D: terrain, buildings, people, battles, smoke
  components/
    updates-bar.tsx     The Updates bar at the top of the pages
  lib/
    online.ts           Cloud saves, leaderboard and feedback (Supabase)
    utils.ts            Shared helpers
  app/
    play/page.tsx       The game
    not-found.tsx       Custom 404 page
public/
  index.html            Project page (for judges and visitors): plain HTML
  site/style.css        Its look: plain CSS
  site/site.js          Its "What's new" bar and Settings button
  site/fonts/           The two pixel fonts (also used by the game)
scripts/
  export-site.mjs       Makes the project page's icons and update list from the game's code
```

## Working on it

```bash
git clone https://github.com/DaBabaBOI/shistech-hackathon.git
cd shistech-hackathon
npm install
npm run dev        # http://localhost:3000, then open /play
```

**Downloaded the ZIP instead?** (Code → Download ZIP on GitHub.) It works the
same way: unzip it, open a terminal in the folder and run `npm install` then
`npm run dev`. You need [Node.js](https://nodejs.org/) 22 (see `.nvmrc`).
Double-clicking a file won't start the game; it has to be served. To just play,
use the live link at the top.

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload (project page at `/`, game at `/play`) |
| `npm run build` | Static build into `out/` |
| `npm run site` | Remake the project page's icons and "What's new" list (dev and build do this for you) |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check |
| `npm run format` | Prettier |

Every push to `main` deploys automatically to GitHub Pages.

**Conventions:** never commit straight to `main`. Branch as
`feat/<name>-<thing>` (or `fix/`, `chore/`, `docs/`), open a pull request, and
have someone else review it. Commit messages are imperative ("add farmland", not
"added farmland").

**Dev mode:** open `/play/?dev`
(https://dabababoi.github.io/shistech-hackathon/play/?dev). You can start in any
era with plenty of resources, and a dev panel lets you trigger every feature:
wildfire, raid, the Roman legion, an outbreak, any event card or elder lesson
(picked from a list), fires out, +10 people, "Goals on" (every advancement goal
counts as met), "Cut hills" (finish every quarry's cut), finish the era, each
kind of raid, Starve, Collapse, Nearly behind, a small moment, +100 XP and
"Back from fog".

**Updates log:** every change a player would notice gets a line in
`src/game/updates.ts`, which feeds the Updates bar.

**Using an AI assistant?** Point it at [`AGENTS.md`](AGENTS.md) first. It holds
the design decisions the game must stay true to.

## Design and contribution notes

Before making changes, read [AGENTS.md](AGENTS.md). It documents the game design
constraints and the project decisions that must stay intact.

This project follows a few important conventions:

- Most game rules belong in `src/game/`
- The engine should stay reducer-based and immutable
- UI and 3D code should stay separate from core game logic
- New mechanics should be added through data-driven content where possible
- Tutorial flow and balancing changes should be validated against the project
  goals in [AGENTS.md](AGENTS.md)

## Contributing

Please see [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines and
development expectations.

## Security

Please see [SECURITY.md](SECURITY.md) for vulnerability reporting guidance.

## License

This project is released into the public domain under the Unlicense. See [LICENSE](LICENSE).

## Team

Prithu Sharma · Aarav Kumar · Vagisha Sinha · Aaradhya Verma
