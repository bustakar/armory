"use client";

import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Leaderboard } from "@/components/leaderboard";

export function LeaderboardContent() {
  return (
    <AppShell centered={false}>
      <div className="w-full max-w-2xl pb-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl text-[var(--pixel-gold)]">LEADERBOARD</h1>
          <Link
            href="/"
            className="text-xs text-gray-500 hover:text-gray-400"
          >
            ← Back to game
          </Link>
        </div>
        <Leaderboard />
      </div>
    </AppShell>
  );
}
