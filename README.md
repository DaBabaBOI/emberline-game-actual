# Emberline

**A sustainability trade-off game.** Grow a tribe from the Stone Age into the
Ancient world without destroying the land that feeds it. Every hut, fire,
woodcutter and smithy helps your people now and costs the land later. Made for
the SHISTECH Hacktrack hackathon (UN Sustainable Development Goals theme), built
around **SDG 11: Sustainable Cities and Communities**.

### Play it: https://dabababoi.github.io/shistech-hackathon/

No install needed. It runs in the browser, on a laptop or a phone.

---

> **Media placeholders. Replace before judging.** Files go in [`assets/`](assets/).
>
> - **[SCREENSHOT 1: PLACEHOLDER]** `assets/screenshot-village.png`: a healthy village, Sustainability high
> - **[SCREENSHOT 2: PLACEHOLDER]** `assets/screenshot-cutover.png`: the same area after clear-cutting: stumps, bare ground, smoke
> - **[GIF: PLACEHOLDER]** `assets/gameplay.gif`: placing a woodcutter, its trade-off card, and the Sustainability breakdown
> - **[DEMO VIDEO: PLACEHOLDER]** link: _to be added_

---

## The idea: every choice is a trade-off

Most city builders reward you for building as much as you can. Emberline asks the
question SDG 11 asks: **can a settlement grow without wrecking the place it lives
in?**

Every building shows what you get and what the land pays, right where you place
it:

| You build… | You get… | The land pays… |
| --- | --- | --- |
| Woodcutter | Wood for fires and building | It fells the trees around it; once they're gone it makes no wood |
| Campfire | Warmth for 10 people | Burns wood, adds smoke, raises the risk of a wildfire in nearby trees |
| Hut | Room for 6 more people | More people eat more food and need more fires |
| Farmland | Lots of steady food | Clears wild land for good |
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
village (minus smoke, quarry pits, fields and more). Click it to see exactly
what is pulling it down. It recovers only as fast as the forest grows back.
Push it too low for too long and the land wears out: forests stop regrowing and
harvests shrink. You can see the damage on the map: stumps and bare ground,
smoke over the fires, fewer deer to hunt.

## How the game teaches

- **See the cost before you build.** Trade-off cards on every placement, stumps
  on every building card, and a Sustainability breakdown with a trend arrow.
- **Elder Ama's lessons.** When something happens in play (the forest shrinks,
  food rots, smoke builds up, sickness spreads in crowded huts, the soil turns
  salty), she explains the lesson and links it to a real UN target.
- **Real-world event cards.** Dilemmas like a sacred grove, overhunting, a rich
  but flood-prone riverbank, or fires inside the huts. Each card says how it
  connects to the world today.
- **A debrief at the end of each era.** Achievements next to what they cost
  (forest lost, time the land was unhealthy, lives lost), every meter with its
  SDG target, and the lessons your people learned. The **best ending needs
  Sustainability of 60 or more**, so growth can't just ignore the damage.

### How it maps to the SDGs

**SDG 11 (Sustainable Cities and Communities)** is the core. The game's lessons
and events also link to these goals:

| Goal | In the game |
| --- | --- |
| **11 · Sustainable Cities & Communities** | Shelter, crowding, planning growth, pollution from fires and smithies |
| 15 · Life on Land | Sustainability is the forest left standing; deforestation, lost wildlife, worn-out and salty soil, replanting |
| 7 · Affordable & Clean Energy | Warmth costs wood and smoke; clothes are the efficient alternative |
| 12 · Responsible Consumption | Food waste, overhunting, charcoal eating the forest |
| 4 · Quality Education | Literacy is a meter; elders and scribe schools |
| 9 · Industry, Innovation & Infrastructure | The advancement tree: each technology opens new buildings and new trade-offs |

## What you can do

- **Explore hex islands** of grassland, forest, dry steppe, marsh and hills.
- **Build 18 kinds of buildings** across two eras, with a see-through preview and
  a trade-off card first. Sell any of them back for half.
- **Balance six meters**: Food, Shelter, Happiness, Literacy, Energy and
  Sustainability.
- **Watch your people** walk to work, sit around the fire, fall sick, and hunt.
- **Defend against raiders.** Your warriors march out and fight on the map.
- **Survive sickness.** Before Herbalism your people call it a curse from the
  gods; after it, healers can help.
- **Reach the Ancient era** (research Agriculture, grow to 15 people): bronze,
  irrigation, writing, granaries, walls.
- **Face the Roman legion** at the end of the Ancient era.
- **Name your people**, pick a culture and a difficulty, and play on a laptop or
  a phone. A guided tutorial with a pointing hand teaches the basics.
- **Three ways to lose**: famine, unrest (people too unhappy for too long), or
  conquest. Every warning gives you a countdown first.

The game autosaves in your browser.

## Roadmap

**The Stone Age and the Ancient era are complete and playable**, from the first
campfire to the Roman legion and a final debrief. After the hackathon we plan to
carry the same trade-offs further:

| Next | What it adds to the trade-off |
| --- | --- |
| Classical era | Larger towns, roads and trade; the Silk Road |
| Later eras | Industry and the choice between dirty and clean energy, up to a space age |
| Multiplayer | Neighbouring nations run by other players instead of the computer |

## What went wrong and how we adapted

- **Our first version was the wrong game.** We started with a simple turn-based
  city sim made of meters and buttons, then added a 3D island on top. It still
  didn't feel like a game, so we rebuilt it as a real-time hex-island builder.
- **We cut multiplayer to ship.** We had built multiplayer rooms on a hosted
  database. When we moved to free static hosting on GitHub Pages there was no
  server to run it, so we removed it and saved games in the browser instead.
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
  for resources, and skipping it left the tribe with no fire. We added a
  pointing hand that blocks other clicks, started players with exactly the
  resources the tutorial needs, and gave skippers the basic buildings.
- **Small bugs added up.** A lost game could be "continued" for a few seconds
  from an old save, digits 2, 5 and 8 looked alike, and the tutorial pointed at
  buttons off the edge of a phone screen. Each got fixed as players found it.

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

## Built with

Next.js (static export) · React · TypeScript · Three.js via React Three Fiber ·
Tailwind CSS. Hosted on GitHub Pages; there is no server or database.

## Project structure

```
assets/                 Screenshots, GIF and video for this README
src/
  game/                 Pure game logic, no React
    types.ts            Game state and data shapes
    content.ts          Eras, buildings, advancements, events, lessons, tutorial (data)
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
  app/
    page.tsx            Project page (for judges and visitors)
    play/page.tsx       The game
```

## Working on it

```bash
git clone https://github.com/DaBabaBOI/shistech-hackathon.git
cd shistech-hackathon
npm install
npm run dev        # http://localhost:3000
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Static build into `out/` |
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
wildfire, raid, the Roman legion, an outbreak, an event card, an elder lesson,
fires out, +10 people, finish the era.

**Using an AI assistant?** Point it at [`AGENTS.md`](AGENTS.md) first. It holds
the design decisions the game must stay true to.

## Team

Prithu Sharma · Aarav Kumar · Vagisha Sinha · Aaradhya Verma
