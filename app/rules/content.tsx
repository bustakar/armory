"use client";

import Link from "next/link";
import { AppShell } from "@/components/app-shell";

export function RulesContent() {
  return (
    <AppShell centered={false}>
      <div className="w-full max-w-2xl space-y-8 pb-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl text-[var(--pixel-gold)]">GAME RULES</h1>
          <Link
            href="/"
            className="text-xs text-gray-500 hover:text-gray-400"
          >
            ← Back to game
          </Link>
        </div>

        {/* HP System */}
        <section className="pixel-border bg-black p-6">
          <h2 className="text-lg text-red-400 mb-4">HP SYSTEM</h2>
          <p className="text-sm text-gray-400 mb-4">
            Your HP drains continuously based on your active repositories and difficulty level.
            When HP reaches 0, your character dies.
          </p>
          <div className="space-y-2 text-sm">
            <p className="text-gray-500 mb-2">HP Drain Rates (per active repo):</p>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 border border-green-700 bg-green-900/20">
                <p className="text-green-400 font-bold">Easy</p>
                <p className="text-gray-400">0.5 HP/hour</p>
                <p className="text-gray-500 text-xs">12 HP/day</p>
                <p className="text-gray-500 text-xs">~8 days survival</p>
              </div>
              <div className="p-3 border border-yellow-700 bg-yellow-900/20">
                <p className="text-yellow-400 font-bold">Medium</p>
                <p className="text-gray-400">1.5 HP/hour</p>
                <p className="text-gray-500 text-xs">36 HP/day</p>
                <p className="text-gray-500 text-xs">~2.8 days survival</p>
              </div>
              <div className="p-3 border border-red-700 bg-red-900/20">
                <p className="text-red-400 font-bold">Hard</p>
                <p className="text-gray-400">4.0 HP/hour</p>
                <p className="text-gray-500 text-xs">96 HP/day</p>
                <p className="text-gray-500 text-xs">~1 day survival</p>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              * Survival time assumes 100 HP, 1 active repo, no PRs merged
            </p>
          </div>
        </section>

        {/* Earning HP */}
        <section className="pixel-border bg-black p-6">
          <h2 className="text-lg text-red-400 mb-4">EARNING HP</h2>
          <p className="text-sm text-gray-400 mb-4">
            <strong className="text-white">Pull Requests are the only way to earn HP.</strong>{" "}
            Commits give XP but no HP.
          </p>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center p-3 border border-gray-700">
              <div>
                <p className="text-white">PR merged (closes issue)</p>
                <p className="text-xs text-gray-500">PR description references and closes an issue</p>
              </div>
              <div className="text-right">
                <p className="text-red-400">+24 HP</p>
                <p className="text-purple-400">+50 XP</p>
              </div>
            </div>
            <div className="flex justify-between items-center p-3 border border-gray-700">
              <div>
                <p className="text-white">PR merged (no issue)</p>
                <p className="text-xs text-gray-500">PR merged without closing an issue</p>
              </div>
              <div className="text-right">
                <p className="text-red-400">+12 HP</p>
                <p className="text-purple-400">+25 XP</p>
              </div>
            </div>
          </div>
        </section>

        {/* Earning XP */}
        <section className="pixel-border bg-black p-6">
          <h2 className="text-lg text-purple-400 mb-4">EARNING XP</h2>
          <p className="text-sm text-gray-400 mb-4">
            XP determines your level. Every 100 XP = 1 level.
          </p>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center p-3 border border-gray-700">
              <div>
                <p className="text-white">Commit pushed</p>
                <p className="text-xs text-gray-500">Max 5 commits per day count</p>
              </div>
              <p className="text-purple-400">+10 XP</p>
            </div>
            <div className="flex justify-between items-center p-3 border border-gray-700">
              <div>
                <p className="text-white">7-day streak</p>
              </div>
              <div className="text-right">
                <p className="text-red-400">+5 HP</p>
                <p className="text-purple-400">+15 XP</p>
              </div>
            </div>
            <div className="flex justify-between items-center p-3 border border-gray-700">
              <div>
                <p className="text-white">30-day streak</p>
              </div>
              <div className="text-right">
                <p className="text-red-400">+15 HP</p>
                <p className="text-purple-400">+50 XP</p>
              </div>
            </div>
            <div className="flex justify-between items-center p-3 border border-gray-700">
              <div>
                <p className="text-white">100-day streak</p>
              </div>
              <div className="text-right">
                <p className="text-red-400">+30 HP</p>
                <p className="text-purple-400">+200 XP</p>
              </div>
            </div>
          </div>
        </section>

        {/* XP Multipliers */}
        <section className="pixel-border bg-black p-6">
          <h2 className="text-lg text-purple-400 mb-4">XP MULTIPLIERS</h2>
          <p className="text-sm text-gray-400 mb-4">
            Higher difficulty = higher XP multiplier on all rewards.
          </p>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="p-3 border border-green-700 bg-green-900/20 text-center">
              <p className="text-green-400 font-bold">Easy</p>
              <p className="text-2xl text-white">1x</p>
            </div>
            <div className="p-3 border border-yellow-700 bg-yellow-900/20 text-center">
              <p className="text-yellow-400 font-bold">Medium</p>
              <p className="text-2xl text-white">2x</p>
            </div>
            <div className="p-3 border border-red-700 bg-red-900/20 text-center">
              <p className="text-red-400 font-bold">Hard</p>
              <p className="text-2xl text-white">3x</p>
            </div>
          </div>
        </section>

        {/* Diversity Bonus */}
        <section className="pixel-border bg-black p-6">
          <h2 className="text-lg text-blue-400 mb-4">DIVERSITY BONUS</h2>
          <p className="text-sm text-gray-400 mb-4">
            Contributing to multiple repos in a 6-hour window gives an XP multiplier.
          </p>
          <div className="space-y-2 text-sm">
            <p className="text-gray-500">Formula: 1 + (repos - 1) × 0.2</p>
            <div className="grid grid-cols-4 gap-2 mt-3">
              <div className="p-2 border border-gray-700 text-center">
                <p className="text-xs text-gray-500">1 repo</p>
                <p className="text-white">1.0x</p>
              </div>
              <div className="p-2 border border-gray-700 text-center">
                <p className="text-xs text-gray-500">2 repos</p>
                <p className="text-blue-400">1.2x</p>
              </div>
              <div className="p-2 border border-gray-700 text-center">
                <p className="text-xs text-gray-500">3 repos</p>
                <p className="text-blue-400">1.4x</p>
              </div>
              <div className="p-2 border border-gray-700 text-center">
                <p className="text-xs text-gray-500">4 repos</p>
                <p className="text-blue-400">1.6x</p>
              </div>
            </div>
          </div>
        </section>

        {/* Commitments */}
        <section className="pixel-border bg-black p-6">
          <h2 className="text-lg text-[var(--pixel-gold)] mb-4">COMMITMENTS</h2>
          <p className="text-sm text-gray-400 mb-4">
            Add repos to your roster to commit to them. Each repo you add starts draining HP.
          </p>
          <div className="space-y-3 text-sm">
            <div className="p-3 border border-gray-700">
              <p className="text-white">Commitment Period</p>
              <p className="text-xs text-gray-500">30 days minimum per repo</p>
            </div>
            <div className="flex justify-between items-center p-3 border border-[var(--pixel-gold)] bg-yellow-900/20">
              <div>
                <p className="text-white">Complete commitment</p>
                <p className="text-xs text-gray-500">Stay alive for 30 days with repo active</p>
              </div>
              <div className="text-right">
                <p className="text-red-400">+100 HP (full heal!)</p>
                <p className="text-purple-400">+1000 XP</p>
              </div>
            </div>
            <div className="flex justify-between items-center p-3 border border-gray-700">
              <div>
                <p className="text-white">Renew commitment</p>
                <p className="text-xs text-gray-500">Keep repo active after 30 days</p>
              </div>
              <p className="text-purple-400">+250 XP</p>
            </div>
            <div className="flex justify-between items-center p-3 border border-red-700 bg-red-900/20">
              <div>
                <p className="text-white">Early exit penalty</p>
                <p className="text-xs text-gray-500">Remove repo before 30 days</p>
              </div>
              <p className="text-red-400">-50 HP</p>
            </div>
          </div>
        </section>

        {/* Death & Rebirth */}
        <section className="pixel-border bg-black p-6">
          <h2 className="text-lg text-gray-400 mb-4">DEATH & REBIRTH</h2>
          <p className="text-sm text-gray-400 mb-4">
            When your HP reaches 0, your character dies. You can create a new character to start fresh.
          </p>
          <div className="space-y-2 text-sm text-gray-500">
            <p>• All progress is lost (HP, XP, level, streak)</p>
            <p>• Your graveyard records fallen characters</p>
            <p>• Create a new character anytime after death</p>
            <p>• Choose a new difficulty for each life</p>
          </div>
        </section>

        {/* Difficulty Upgrade */}
        <section className="pixel-border bg-black p-6">
          <h2 className="text-lg text-yellow-400 mb-4">DIFFICULTY UPGRADE</h2>
          <p className="text-sm text-gray-400 mb-4">
            You can upgrade difficulty at any time, but you cannot downgrade.
          </p>
          <div className="space-y-2 text-sm text-gray-500">
            <p>• Easy → Medium → Hard (one-way only)</p>
            <p>• Higher difficulty = faster HP drain</p>
            <p>• Higher difficulty = more XP per action</p>
            <p>• Choose wisely - no going back!</p>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
