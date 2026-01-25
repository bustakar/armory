"use client";

import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import Link from "next/link";

const RANK_COLORS: Record<number, string> = {
  1: "text-yellow-400", // Gold
  2: "text-gray-300",   // Silver
  3: "text-amber-600",  // Bronze
};

export function LeaderboardPreview() {
  const topPlayers = useQuery(api.leaderboard.getTopPlayers);

  if (topPlayers === undefined) {
    return (
      <div className="pixel-border bg-black p-4 w-full">
        <h3 className="text-sm text-gray-400 mb-3">TOP PLAYERS</h3>
        <p className="text-xs text-gray-600">Loading...</p>
      </div>
    );
  }

  if (topPlayers.length === 0) {
    return (
      <div className="pixel-border bg-black p-4 w-full">
        <h3 className="text-sm text-gray-400 mb-3">TOP PLAYERS</h3>
        <p className="text-xs text-gray-600">No players yet. Be the first!</p>
      </div>
    );
  }

  return (
    <div className="pixel-border bg-black p-4 w-full">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm text-gray-400">TOP PLAYERS</h3>
        <Link
          href="/leaderboard"
          className="text-xs text-[var(--pixel-green)] hover:underline"
        >
          View All →
        </Link>
      </div>

      <ul className="space-y-2">
        {topPlayers.map((player) => (
          <li key={player.githubUsername} className="flex items-center gap-3">
            {/* Rank */}
            <span className={`w-6 text-sm font-bold ${RANK_COLORS[player.rank] || "text-gray-500"}`}>
              #{player.rank}
            </span>

            {/* Avatar */}
            {player.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={player.avatarUrl}
                alt=""
                className="w-6 h-6 border border-gray-700"
                style={{ imageRendering: "pixelated" }}
              />
            ) : (
              <div className="w-6 h-6 bg-gray-800 border border-gray-700" />
            )}

            {/* Name & Level */}
            <Link
              href={`/u/${player.githubUsername}`}
              className="flex-1 truncate text-sm text-gray-300 hover:text-[var(--pixel-green)]"
            >
              {player.characterName}
            </Link>

            {/* Level */}
            <span className="text-xs text-gray-500">Lv{player.level}</span>

            {/* XP */}
            <span className="text-xs text-[var(--pixel-gold)] w-16 text-right">
              {player.xp.toLocaleString()} XP
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
