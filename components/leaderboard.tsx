"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import Link from "next/link";

type FilterType = "all" | "month" | "week";
type Difficulty = "easy" | "medium" | "hard";

const RANK_COLORS: Record<number, string> = {
  1: "text-yellow-400", // Gold
  2: "text-gray-300",   // Silver
  3: "text-amber-600",  // Bronze
};

const RANK_BG: Record<number, string> = {
  1: "bg-yellow-900/20",
  2: "bg-gray-700/20",
  3: "bg-amber-900/20",
};

const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  easy: "text-green-400",
  medium: "text-yellow-400",
  hard: "text-red-400",
};

const FILTER_LABELS: Record<FilterType, string> = {
  all: "ALL TIME",
  month: "THIS MONTH",
  week: "THIS WEEK",
};

export function Leaderboard() {
  const [filter, setFilter] = useState<FilterType>("all");
  const leaderboard = useQuery(api.leaderboard.getLeaderboard, { filter, limit: 100 });

  return (
    <div className="w-full max-w-2xl">
      {/* Filter tabs */}
      <div className="flex gap-1 bg-gray-900 p-1 border border-gray-700 w-fit mb-6">
        {(Object.keys(FILTER_LABELS) as FilterType[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 text-xs transition-colors ${
              filter === f
                ? "bg-[var(--pixel-green)] text-black"
                : "text-gray-400 hover:text-white"
            }`}
          >
            {FILTER_LABELS[f]}
          </button>
        ))}
      </div>

      {/* Loading state */}
      {leaderboard === undefined && (
        <div className="pixel-border bg-black p-8 text-center">
          <p className="text-[var(--pixel-green)]">Loading...</p>
        </div>
      )}

      {/* Empty state */}
      {leaderboard && leaderboard.length === 0 && (
        <div className="pixel-border bg-black p-8 text-center">
          <p className="text-gray-400">
            {filter === "all"
              ? "No players yet. Be the first to join!"
              : `No activity ${filter === "month" ? "this month" : "this week"}.`}
          </p>
        </div>
      )}

      {/* Leaderboard list */}
      {leaderboard && leaderboard.length > 0 && (
        <div className="pixel-border bg-black">
          {/* Table header */}
          <div className="hidden sm:grid grid-cols-[3rem_1fr_4rem_5rem_4rem_5rem] gap-2 px-4 py-2 border-b border-gray-700 text-xs text-gray-500">
            <span>RANK</span>
            <span>PLAYER</span>
            <span className="text-right">LEVEL</span>
            <span className="text-right">XP</span>
            <span className="text-right">STREAK</span>
            <span className="text-right">MODE</span>
          </div>

          {/* Players */}
          <ul>
            {leaderboard.map((player) => (
              <li
                key={player.githubUsername}
                className={`border-b border-gray-800 last:border-b-0 ${RANK_BG[player.rank] || ""}`}
              >
                <Link
                  href={`/u/${player.githubUsername}`}
                  className="flex flex-col sm:grid sm:grid-cols-[3rem_1fr_4rem_5rem_4rem_5rem] gap-2 sm:gap-2 px-4 py-3 hover:bg-gray-800/50 transition-colors"
                >
                  {/* Mobile: Row 1 - Rank, Avatar, Name */}
                  <div className="flex items-center gap-3 sm:contents">
                    {/* Rank */}
                    <span className={`text-lg sm:text-sm font-bold sm:self-center ${RANK_COLORS[player.rank] || "text-gray-500"}`}>
                      #{player.rank}
                    </span>

                    {/* Avatar + Name container */}
                    <div className="flex items-center gap-2 flex-1 sm:flex-none sm:overflow-hidden">
                      {player.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={player.avatarUrl}
                          alt=""
                          className="w-8 h-8 sm:w-6 sm:h-6 border border-gray-700"
                          style={{ imageRendering: "pixelated" }}
                        />
                      ) : (
                        <div className="w-8 h-8 sm:w-6 sm:h-6 bg-gray-800 border border-gray-700" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-200 truncate">{player.characterName}</p>
                        <p className="text-xs text-gray-500 sm:hidden">@{player.githubUsername}</p>
                      </div>
                    </div>
                  </div>

                  {/* Mobile: Row 2 - Stats */}
                  <div className="flex justify-between sm:contents text-xs sm:text-sm pl-10 sm:pl-0">
                    <span className="text-gray-400 sm:text-gray-300 sm:text-right sm:self-center">
                      <span className="sm:hidden">Lv</span>{player.level}
                    </span>
                    <span className="text-[var(--pixel-gold)] sm:text-right sm:self-center">
                      {player.xp.toLocaleString()}<span className="sm:hidden"> XP</span>
                    </span>
                    <span className="text-gray-400 sm:text-right sm:self-center">
                      {player.streak}<span className="sm:hidden">d</span>
                    </span>
                    <span className={`sm:text-right sm:self-center ${DIFFICULTY_COLORS[player.difficulty as Difficulty]}`}>
                      {(player.difficulty as string).toUpperCase()}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Filter description */}
      <p className="text-xs text-gray-600 mt-4 text-center">
        {filter === "all"
          ? "Total XP earned across all time"
          : filter === "month"
          ? "XP earned in the last 30 days"
          : "XP earned in the last 7 days"}
      </p>
    </div>
  );
}
