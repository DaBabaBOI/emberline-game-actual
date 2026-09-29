#  Emberline

**From the first fire to the stars.** A civilization builder on hand-crafted hex
islands, made for the SHISTECH Hacktrack hackathon (UN Sustainable Development
Goals theme).

### ▶ Play it: https://dabababoi.github.io/shistech-hackathon/

No install needed. It runs in the browser, best on a laptop.

---

## The game

You lead a small tribe at the crossroads of the world, on a set of islands
inspired by the old Eurasian trade routes. Starting with a single campfire, you
explore the islands, build a settlement, feed and house your people, defend them
from raiders, and research your way through six eras of history, all the way to
fusion power and interstellar travel.

How you grow matters as much as how fast: chop too many forests or burn too much
fuel and smog rolls in, the sky turns grey and your people suffer.

### Six eras

| Era | Currency | Status |
| --- | --- | --- |
|  Stone Age | Shells | Playable |
|  Ancient | Bronze coins | In development |
|  Classical | Silver coins | Planned |
|  Medieval & Renaissance | Florins | Planned |
|  Industrial & Modern | Banknotes | Planned |
|  Future & Space | Credits | Planned |

### What's in the game right now

- **A 1,600-tile hex world** of four islands. Unexplored land sits under the
  clouds until your scouts reveal it.
- **Ten Stone Age buildings** (campfire, hut, gatherer, woodcutter, farmland,
  war camp, fishing spot, quarry, elder's hut, healer's hut), each with a
  low-opacity preview before you place it.
- **Living people** who walk to work, farm the fields and take the children to the
  elder's hut, plus hunters who track down the deer and boar in the forests.
- **Raiders** who land on the shore. Train warriors at a War Camp or lose your
  food and wood.
- **Forests that spread and regrow** over time, and thin out around woodcutters.
- **Six meters**: Food & Water, Shelter & Health, Happiness (left) and
  Literacy, Energy, Sustainability (right).
- **An advancement tree** with one root (Discover Fire) and six branches, spanning
  every era, including hidden `???` secret goals.
- **Event cards** (wanderers, wildfires, traders from the east, great hunts).
- **Seven cultures** (Balanced, Traders, Builders, Scholars, Warriors, Farmers,
  Mariners) and three difficulties. Famine is the only way to lose.
- **Demolish** any building to make room (you get half its cost back).
- **Campfires** your people gather around. No fire means unhappy people.
- **Autosave** in the browser, a guided tutorial, and speed controls.

### How it connects to the SDGs

| SDG | In the game |
| --- | --- |
| 4 · Quality Education | Literacy is a core meter; knowledge drives every discovery. |
| 7 · Affordable & Clean Energy | Energy evolves from firewood to fusion, and every source has a cost. |
| 9 · Industry, Innovation & Infrastructure | Supply chains, trade routes and a tech tree from stone tools to spaceflight. |
| 11 · Sustainable Cities & Communities | Pollution visibly hurts the world and your people. |

## Controls

| Action | How |
| --- | --- |
| Move the camera | Drag with the mouse |
| Zoom | Scroll wheel |
| Rotate | Right-drag |
| Build | Pick a building in the bottom bar, then click a highlighted tile |
| Cancel building | `Esc` or right-click |
| Speed | ⏸ ▶ ▶▶ ▶▶▶ in the top bar |

## Built with

Next.js (static export) · React · TypeScript · Three.js via React Three Fiber ·
Tailwind CSS. Hosted on GitHub Pages; there is no server or database.

## Project structure

```
src/
  game/                 Pure game logic, no React
    types.ts            Game state and data shapes
    content.ts          Eras, buildings, advancement tree, events, tutorial (data)
    engine.ts           The simulation: reducer, ticks, meters, raids, saving
    map.ts, hex.ts      Hex grid maths and the island map generator
    noise.ts            Seeded random + noise
  components/civ/
    game-screen.tsx     Title screen → game, HUD layout
    game-provider.tsx   Game state, the tick loop and autosave
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

**Testing a later era?** Open `/play/?dev` (e.g.
https://dabababoi.github.io/shistech-hackathon/play/?dev) to get dev mode: start
in any era with plenty of resources, reveal the map, and jump between eras.

**Using an AI assistant?** Point it at [`AGENTS.md`](AGENTS.md) first. It holds
the design decisions the game must stay true to.

## Team

Prithu Sharma · Aarav Kumar · Vagisha Sinha · Aaradhya Verma
