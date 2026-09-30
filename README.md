# Emberline

A bright, browser-based civilization builder where every choice has a trade-off.
You begin with a single campfire and grow a settlement through the Stone Age,
ancient trade, and eventually into a more advanced civilization while balancing
survival, sustainability, and population growth.

Play it here:
https://dabababoi.github.io/shistech-hackathon/

## Why this project exists

Emberline was built for the SHISTECH Hacktrack and the UN Sustainable Development
Goals theme. The core idea is simple: the player should not be rewarded for
building endlessly without cost. Every decision changes the land, the people, and
the future of the village.

The game is about sustainable growth: gather enough food, keep the people warm,
watch the forest, and decide when a short-term win is worth a long-term loss.

## Gameplay overview

- Build a settlement on hand-crafted hex islands
- Explore new land with scouts and map reveals
- Gather food, wood, and stone while managing six meters
- Handle raids, weather, fires, and disease pressure
- Research advances through multiple eras
- Make trade-offs between short-term gains and long-term land health
- Progress from the first fire toward future-era civilization

## Current status

This project is structured as a playable prototype with a full game loop and
multiple systems already in place, including:

- hex-world exploration and tile-based placement
- building placement previews and placement costs
- food, wood, shelter, health, happiness, literacy, energy, and sustainability
  systems
- advancement progression and tutorial flow
- seasonal-ish simulation pressure and events
- static export deployment for GitHub Pages

## Features

- Hex-based world with fixed island layouts and hidden terrain
- Village simulation with representative figures and walking workers
- Era-based progression and research tree design
- Event cards and diplomacy-style trade-off moments
- Sustainability as a core game mechanic, not a decorative meter
- Responsive browser play, including mobile-friendly layout patterns
- Dev mode for testing and progression shortcuts

## Controls

- Drag to pan the camera
- Scroll to zoom
- Right-drag to rotate
- Select a building from the bottom bar and click a valid tile
- Use the on-screen cancel flow or right-click to dismiss placement
- Use the speed controls in the top bar to adjust time flow

## Tech stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- React Three Fiber / Three.js
- Static export for GitHub Pages

## Local development

```bash
git clone https://github.com/DaBabaBOI/shistech-hackathon.git
cd shistech-hackathon
npm install
npm run dev
```

Then open http://localhost:3000

## Available scripts

```bash
npm run dev        # run the app locally
npm run build      # production build
npm run lint       # run ESLint
npm run typecheck  # run TypeScript checks
npm run format     # run Prettier
```

## Project structure

```text
src/
  app/
    page.tsx          Landing page and project intro
    play/page.tsx     Game entry page
    not-found.tsx     Custom 404 screen
  components/
    civ/              UI and world rendering
  game/
    content.ts        Eras, buildings, events, tutorial and progression data
    engine.ts         Game reducer and simulation logic
    types.ts          Core game state and types
    map.ts            World generation helpers
    hex.ts            Hex math and coordinate logic
    noise.ts          Seeded generation utilities
  lib/
    utils.ts          Shared helper functions
```

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

Prithu Sharma
Aarav Kumar
Vagisha Sinha
Aaradhya Verma
