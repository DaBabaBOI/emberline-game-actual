"use client";

import dynamic from "next/dynamic";

// The game reads its save from localStorage and draws with WebGL, so it only
// ever renders in the browser.
export const PlayClient = dynamic(
  () => import("./game-screen").then((m) => m.GameScreen),
  { ssr: false, loading: () => <div className="min-h-screen bg-[#0b1220]" /> },
);
