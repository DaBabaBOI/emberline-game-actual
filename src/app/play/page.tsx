import type { Metadata } from "next";
import { PlayClient } from "@/components/civ/play-client";

export const metadata: Metadata = {
  title: "Play · Emberline",
};

export default function PlayPage() {
  return <PlayClient />;
}
