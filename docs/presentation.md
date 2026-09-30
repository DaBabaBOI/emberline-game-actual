# Finals presentation plan (5–10 minutes)

Target: **about 8 minutes** of talk and live demo, leaving room for questions.
Each slide lists who could speak (change it as you like) and which judging
criterion it answers.

## Before you start

- Open https://dabababoi.github.io/shistech-hackathon/ in one tab.
- In a second tab, open `/play/?dev` and load a Stone Age game, so the demo can skip waiting.
- Keep the screenshots in `docs/images/` ready as a backup if the Wi-Fi or
  the projector struggles with 3D.

## Running order

| # | Time | Slide / action | Speaker | Criterion |
| --- | --- | --- | --- | --- |
| 1 | 0:00–0:40 | **Hook.** "Most builder games reward you for building as much as you can. Ours shows you the price." Title + landing screenshot. | Prithu | Innovation |
| 2 | 0:40–1:30 | **The problem and SDG 11.** A settlement that meets its people's needs without destroying the land it depends on. Why start at the Stone Age: the same choice, small enough to see. | Aarav | Relevance & impact |
| 3 | 1:30–4:30 | **Live demo** (script below). | Prithu (drives), Vagisha (narrates) | Functionality, usability, chosen feature |
| 4 | 4:30–5:30 | **The chosen feature: trade-offs you can see.** The six-step pattern (data → preview → rule → knock-on effect → feedback → alternative) and the systems diagram from `design.md`. | Aaradhya | Implementation, cohesion |
| 5 | 5:30–6:30 | **How it's built.** The system diagram from `architecture.md`: pure rules engine, React screen, 3D world, static hosting, save versioning, instanced 3D. | Aarav | Technical complexity |
| 6 | 6:30–7:30 | **Problem-solving.** Two stories: (a) Knowledge too easy, over-corrected, then balanced with a bot (show the results table); (b) "too many things at once", then the one-big-moment rule. | Vagisha | Logical approach, adaptability |
| 7 | 7:30–8:00 | **What's next.** The Classical era (rivers and aqueducts, towns and sanitation, roads and trade, ending in a great drought), then later eras. Close: "Can your village grow and still last?" | Aaradhya | Impact |

## Demo script (3 minutes)

1. **Title screen (10 s).** Name the nation. Point out the culture and difficulty choices.
2. **Tutorial, first step (30 s).** The pixel hand points at the Campfire.
   Hover a tile: the card shows *Warmth for 10 people* and *Burns wood, adds
   smoke, can start a wildfire*. "Every building works like this."
3. **Switch to the dev tab (60 s).** On a Stone Age village:
   - Select **Farmland** and hover next to a forest: the card says it will
     clear the forest and cut rain. Place it and show the stumps.
   - Click the **leaf meter**: the breakdown lists every cost, and the trend.
   - Click a **Woodcutter** and switch it to **selective** logging: half the
     wood, the forest lasts.
4. **Consequences (40 s).** Dev panel: **Sparks** (a wooden house near a fire
   burns) and **Clear forest** (rain drops; the food stats show it). An elder
   lesson links it to an SDG target.
5. **Advancements (20 s).** Open Advancements: each has a goal, for example
   "Hunt animals 0/3", as well as a Knowledge cost.
6. **Ending (20 s).** Dev panel: **Finish era**. The debrief shows what you
   achieved next to what it cost, each meter tied to an SDG target.

If something goes wrong live, switch to the screenshots and keep talking. The
story matters more than the click.

## Likely questions, and short answers

- **"Is it just a game, or does it teach?"** It teaches through consequences:
  you see the forest fall and the rain drop, and Elder Ama explains the real idea,
  linked to an SDG target. The debrief makes you weigh what you achieved against the cost.
- **"Where do your facts come from?"** We kept every real-world line general
  and modest, with no statistics. The SDG targets are quoted from the UN goals.
- **"How do you know it's balanced?"** A bot plays the whole game with the real
  rules. In the latest 5 runs it reached the Ancient era in 18.5–20.8 minutes
  and beat the Roman legion in 3 of 5 games.
- **"Why a Roman legion?"** It is the Ancient era's climax on purpose, and
  it grows with your population: growing huge has a price too. Historically
  Rome only becomes a power right at the end of that period.
- **"What was the hardest part?"** Balance. Fixing one thing (Knowledge too
  easy) broke three others; the bot let us see all of them at once.
- **"Why is multiplayer missing?"** We cut it to host for free with no server.
  The state is designed so it can come back later.
- **"Does it work on a phone?"** Yes: tap once to preview, twice to build.

## Slide checklist

- [ ] Title slide with the team names and the live link
- [ ] One image per slide, taken from `docs/images/`
- [ ] The systems diagram (`docs/images/diagram-systems.png`)
- [ ] The architecture diagram (`docs/images/diagram-architecture.png`)
- [ ] The bot results table (`process.md`, section 3)
- [ ] A QR code to the live game on the last slide
