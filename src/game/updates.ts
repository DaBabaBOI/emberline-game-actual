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
      "Knowledge now comes from milestones: your first of each building, reaching 10, 15, 20, 30 and 50 people, every scouting trip, beating raiders and planting saplings. Elder's Huts and schools still teach a little all the time.",
      "Dev mode: pick any event card or elder lesson from a list and trigger it.",
      "Elder Ama tells you when you have learned enough to research something new, and the Advancements button shows how many you can afford.",
      "Elder Ama now explains the tree stumps on each building: how hard it is on the land, and where to look.",
      "A lit campfire right next to a gatherer's camp scares off the animals: that camp makes 30% less food. Keep fires and camps a tile apart.",
      "\"The herds are thinning\": letting the herds recover now costs food today, as holding back really would.",
      "Warriors and villagers no longer pace back and forth beside buildings: they walk to the near side and pause when their path is blocked.",
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
