# Emberline: project documentation

**Emberline** is a browser game about sustainability trade-offs. The player
grows a Stone Age tribe into the Ancient era. Every building helps the people
now and costs the land later. It was made by Prithu Sharma, Aarav Kumar,
Vagisha Sinha and Aaradhya Verma for the SHISTECH Hacktrack hackathon (theme:
the UN Sustainable Development Goals, with SDG 11 as our focus).

- **Play:** https://dabababoi.github.io/shistech-hackathon/ (no install, laptop or phone)
- **Dev mode, for testing any feature quickly:** https://dabababoi.github.io/shistech-hackathon/play/?dev
- **Code:** this repository. The rules are in `src/game/`; the screen and 3D world are in `src/components/civ/`.

![The village in the Stone Age](images/04-village-stone.png)

## Where to find what (by judging criterion)

| Criterion | Where to look |
| --- | --- |
| **1. Innovation & Impact** (creativity, relevance) | [Game design: the idea and why it matters](design.md#1-the-idea) and [SDG links](design.md#5-links-to-the-sdgs) |
| **2. Technical Execution** (runs smoothly, complexity) | [Architecture and schematics](architecture.md) and [Testing](process.md#3-how-we-test) |
| **3. Design & Presentation** (clarity, looks, usability) | [Look and usability](design.md#6-look-and-usability), the [screenshots](#screenshots) and the [presentation plan](presentation.md) |
| **4. Problem-Solving & Thinking** (logic, adaptability) | [Process: problems we hit and how we adapted](process.md) |
| **5. Implementation of the chosen feature** (clean, cohesive) | [The trade-off system: how it is built and how it fits](design.md#3-the-chosen-feature-trade-offs-you-can-see) |
| **6. Documentation & Completeness** | This folder, the [main README](../README.md), [`AGENTS.md`](../AGENTS.md) (every design rule), and in-code comments |

## The documents

1. [`design.md`](design.md): the idea, the core loop, the trade-off system, how
   the systems connect, SDG links, look and usability.
2. [`architecture.md`](architecture.md): diagrams of the code, the game loop, the
   data flow and the folder layout, plus the rules the code follows.
3. [`process.md`](process.md): how we worked, what went wrong, how we fixed
   it, and how we test (including the balance bot and its latest results).
4. [`presentation.md`](presentation.md): the plan for the 5–10 minute finals
   talk and live demo, with likely questions.

## Screenshots

Every picture below is a real capture of the current build. None are mock-ups.
The village pictures come from a game played by our test bot (see
[process.md](process.md#3-how-we-test)), loaded into the browser.

| | |
| --- | --- |
| ![Landing page](images/01-landing.png) **Landing page.** The pitch, and the trade-offs up front. | ![Title screen](images/02-title.png) **Title screen.** Name the nation, pick a culture and a difficulty. |
| ![Tutorial](images/03-tutorial.png) **Tutorial.** Elder Ama explains; the pixel hand points at the next click. | ![Placement card](images/09-placement.png) **Placement preview.** Every building shows its gain (+) and its cost to the land before you place it. |
| ![Sustainability breakdown](images/05-sustainability.png) **Sustainability breakdown.** Click the leaf meter to see every part pushing it down, and the trend. | ![Advancements](images/06-advancements.png) **Advancements.** Each one has a goal you must meet first (for example "Hunt animals 0/3"). |
| ![Ancient era](images/07-village-ancient.png) **Ancient era.** Dyed clothes, worn paths, warmer light, bronze trim on the top bar. | ![Legion warning](images/10-legion-warning.png) **The era's climax.** A Roman legion is coming (shown here with the dev panel open). |
| ![Debrief](images/11-debrief.png) **Debrief.** What you achieved next to what it cost, each meter linked to an SDG target. | ![Phone](images/08-phone.png) **On a phone.** Bars stack, tap once to preview and twice to build. |

**Still to add (the team):** a short gameplay video or GIF, and photos of the
team working. Put them in `docs/images/` and link them here.
