# Emberline

**A sustainability trade-off simulator.** Grow a Stone Age settlement on a hex
island and watch every new woodcutter, quarry and farm cost your land a little
more of its health. Made for the SHISTECH Hacktrack hackathon (UN Sustainable
Development Goals theme), built around **SDG 11: Sustainable Cities and
Communities**.

### Play it: https://dabababoi.github.io/shistech-hackathon/

No install needed. It runs in the browser, best on a laptop.

---

> **Media placeholders. Replace before judging.** Files go in [`assets/`](assets/).
>
> - **[SCREENSHOT 1: PLACEHOLDER]** `assets/screenshot-village.png`: a healthy village, Sustainability high
> - **[SCREENSHOT 2: PLACEHOLDER]** `assets/screenshot-smog.png`: the same area after heavy growth, smog visible
> - **[GIF: PLACEHOLDER]** `assets/gameplay.gif`: placing buildings and the Sustainability meter reacting
> - **[DEMO VIDEO: PLACEHOLDER]** link: _to be added_

---

## The idea: growth has a cost

Most city builders reward you for building as much as you can. Emberline asks the
question SDG 11 asks: **can a settlement grow without wrecking the place it lives
in?**

Every building that feeds or shelters your people pulls on the land:

| You build… | You get… | The land pays… |
| --- | --- | --- |
| Woodcutter | Wood for fires and buildings | Sustainability drops; nearby forest thins out |
| Stone Quarry | Stone for better buildings | Sustainability drops |
| Farmland | Steady food | Sustainability drops a little |
| Campfire | Warmth and happiness | Burns wood; Sustainability drops slightly |

When Sustainability falls, you can **see it and feel it**. Below 70 a haze starts
to grey the sky; below 60 smoke rises from woodcutters, quarries and fires. Low
Sustainability also drags down Happiness, and if your people stay miserable for
too long, they leave. Events push the same way: let a wildfire burn and the
forest and nearby buildings are lost, leaving charred ground that heals slowly.

The player is always choosing between **more now** and **a healthy settlement
later**.

### How it maps to the SDGs

**SDG 11 (Sustainable Cities and Communities)** is the core of the game. It is
supported by three mechanics tied to other goals:

| Goal | Role | In the game |
| --- | --- | --- |
| **11 · Sustainable Cities & Communities** | Core trade-off | The Sustainability meter, haze and smoke, shelter for a growing population, forests that regrow only if you let them |
| 4 · Quality Education | Supporting | Literacy is one of the six meters; knowledge unlocks every advancement |
| 7 · Affordable & Clean Energy | Supporting | Energy comes from fire, and fire needs wood, so energy has a direct cost to the land |
| 9 · Industry, Innovation & Infrastructure | Supporting | The advancement tree: each new technology opens new buildings and new trade-offs |

## What you can do in the Stone Age slice

- **Explore a hex island** hidden under cloud. Scouting costs food and wood and
  gets pricier each trip.
- **Place ten buildings** (campfire, hut, gatherer, woodcutter, farmland, war camp,
  fishing spot, quarry, elder's hut, healer's hut) with a see-through preview
  first. Sell any of them back for half the cost.
- **Balance six meters**: Food, Shelter, Happiness, Literacy, Energy and
  Sustainability.
- **Watch your people** walk to work, sit around the campfire and hunt deer and boar.
- **Defend against raiders** by training warriors at a War Camp.
- **Research advancements** on a Minecraft-style tree, with hidden secret goals.
- **Respond to events** (wildfires, wanderers, traders, great hunts) whose choices
  have lasting effects.
- **Pick a culture and difficulty**: seven cultures, three difficulties.
- **Learn by doing**: a guided tutorial where a pointing hand shows each step.
- **Two ways to lose**: famine (no food for too long) or unrest (people too
  unhappy for too long). Both warn you with a countdown first.

The game autosaves in your browser.

## Roadmap

**The Stone Age is the complete, playable slice we are submitting.** Everything
in the list above works today. After the hackathon we plan to carry the same
trade-off into later eras, where the stakes get bigger:

| Next | What it adds to the trade-off |
| --- | --- |
| Ancient era | Bronze supply chains, villages and roads, schools, trade caravans, walls |
| Later eras | Larger cities, industry and cleaner energy choices, up to a space age |
| Multiplayer | Neighbouring nations run by other players instead of the computer |

## What went wrong and how we adapted

- **Our first version was the wrong game.** We started with a simple turn-based
  city sim made of meters and buttons, then added a 3D island on top. It still
  didn't feel like a game, so we rebuilt it as a real-time hex-island builder.
- **We cut multiplayer to ship.** We had built multiplayer rooms on a hosted
  database. When we moved to free static hosting on GitHub Pages there was no
  server to run it, so we removed it and saved games in the browser instead.
  Multiplayer is on the roadmap.
- **Emojis made it look cheap.** The first HUD used emoji icons. We replaced every
  one with hand-drawn 12×12 pixel sprites and a pixel-style interface.
- **People walked through mountains.** Villagers clipped into terrain and
  buildings, and sometimes vanished. We made them follow the ground height and
  steer around buildings, mountains and water.
- **Balance took several passes.** Scouting could be spammed and woodcutters made
  too much wood, so we made wood scarce and scouting expensive. Wildfires first
  came too often. We made them rarer, but then they didn't matter enough. In the
  end they became rare but damaging.
- **The tutorial let players skip ahead.** We locked anything the tutorial hadn't
  introduced yet, limited it to one of each building, and added a pointing hand
  that blocks other clicks.
- **Small readability problems added up.** The pixel font's 2, 5 and 8 looked
  alike, so numbers now use a separate, clearer pixel font. Warnings now appear
  when food or wood runs low.

## Controls

| Action | How |
| --- | --- |
| Move the camera | Drag with the mouse |
| Zoom | Scroll wheel |
| Rotate | Right-drag |
| Build | Pick a building in the bottom bar, then click a tile |
| Sell a building | Pick **Sell**, then click the building |
| Cancel | `Esc` or right-click |
| Speed | Pause / 1× / 2× / 4× in the top bar |

## Built with

Next.js (static export) · React · TypeScript · Three.js via React Three Fiber ·
Tailwind CSS. Hosted on GitHub Pages; there is no server or database.

## Project structure

```
assets/                 Screenshots, GIF and video for this README
src/
  game/                 Pure game logic, no React
    types.ts            Game state and data shapes
    content.ts          Eras, buildings, advancement tree, events, tutorial (data)
    engine.ts           The simulation: reducer, ticks, meters, raids, saving
    map.ts, hex.ts      Hex grid maths and the island map generator
    noise.ts            Seeded random + noise
    sprites.ts          Hand-drawn pixel icons
  components/civ/
    game-screen.tsx     Title screen → game, HUD layout
    game-provider.tsx   Game state, the tick loop and autosave
    guide.ts            Tutorial hand: what to point at next
    title-screen.tsx    Culture and difficulty picker
    hud/                Top bar, side meters, bottom bar, advancements, popups
    world/              Everything 3D: terrain, buildings, people, animals, smog
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
(https://dabababoi.github.io/shistech-hackathon/play/?dev) to start with plenty
of resources, reveal the map and trigger a wildfire for testing.

**Using an AI assistant?** Point it at [`AGENTS.md`](AGENTS.md) first. It holds
the design decisions the game must stay true to.

## Team

Prithu Sharma · Aarav Kumar · Vagisha Sinha · Aaradhya Verma
