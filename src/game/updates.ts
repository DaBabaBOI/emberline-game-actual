// What's new, newest first. Shown at the top of the landing page and the title
// screen. Add a line here for every change a player would notice.
export interface Update {
  date: string; // YYYY-MM-DD
  items: string[];
}

export const UPDATES: Update[] = [
  {
    date: "2026-09-29",
    items: [
      "The campfire warning now says cold people become unhappy.",
      "Gatherer camps are no longer free to spam: the wild only has so much, so each extra camp adds just 25% of a camp's food, and every camp past the second hunts animals faster than they breed (−2 Sustainability each). Elder Ama explains why.",
      "Losing (famine, unrest or conquest) is never called the best ending any more, however healthy the land is.",
      "Elder Ama's tutorial now reads like one conversation, explains how Knowledge is earned, and says goodbye when you're ready.",
      "Stone quarries throw up dust: gatherers, farms and pens within 2 tiles make 40% less food.",
      "Panels no longer draw over each other, and the building card stays bright during the tutorial.",
      "Countdowns tick down every second instead of jumping.",
      "The Advancements panel shows how fast you earn Knowledge.",
      "Hide Clothing is now called Warm Clothes.",
      "The building card sits beside the tile, so you can see where you're placing.",
      "An Updates bar at the top of the pages lists what's new.",
      "Villagers sit on the logs around the campfire, the war camp no longer has a stray fire, and the book icon looks like a book.",
    ],
  },
];
