import type { Metadata } from "next";
import { LeaderboardContent } from "./content";

export const metadata: Metadata = {
  title: "Leaderboard | Armory",
  description: "See the top players in Armory ranked by XP. View all-time rankings or filter by this month or week.",
};

export default function LeaderboardPage() {
  return <LeaderboardContent />;
}
