"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useParams } from "next/navigation";
import { HpBar } from "@/components/hp-bar";
import { XpBar } from "@/components/xp-bar";
import { formatTimeRemaining, formatDate } from "@/lib/utils";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";

type Difficulty = "easy" | "medium" | "hard";

const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  easy: "text-green-400 border-green-700 bg-green-900/30",
  medium: "text-yellow-400 border-yellow-700 bg-yellow-900/30",
  hard: "text-red-400 border-red-700 bg-red-900/30",
};

export default function PublicProfile() {
  const params = useParams();
  const username = params.username as string;

  const profile = useQuery(api.characters.getPublicProfile, { username });

  if (profile === undefined) {
    return (
      <AppShell>
        <p className="text-[var(--pixel-green)]">Loading...</p>
      </AppShell>
    );
  }

  if (profile === null) {
    return (
      <AppShell>
        <div className="pixel-border bg-black p-8 max-w-md text-center">
          <h1 className="text-xl text-red-400 mb-4">Player Not Found</h1>
          <p className="text-gray-400 mb-6">
            No adventurer named @{username} exists in the Armory.
          </p>
          <Link
            href="/"
            className="inline-block bg-gray-700 text-white px-6 py-2 hover:bg-gray-600"
          >
            Return Home
          </Link>
        </div>
      </AppShell>
    );
  }

  const { user, character, commitments, graveyard } = profile;

  return (
    <AppShell centered={false}>
      <div className="w-full max-w-2xl">
        {/* Player info */}
        <div className="flex items-center gap-4 mb-6">
          {user.avatarUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatarUrl}
              alt={user.githubUsername}
              className="w-16 h-16 pixel-border"
            />
          )}
          <div>
            <h1 className="text-lg text-[var(--pixel-green)]">
              @{user.githubUsername}
            </h1>
            <p className="text-xs text-gray-500">Public Profile</p>
          </div>
        </div>

        {/* No character */}
        {!character ? (
          <div className="pixel-border bg-black p-6 text-center">
            <p className="text-gray-400">
              This player hasn&apos;t created a character yet.
            </p>
          </div>
        ) : (
          <>
            {/* Character card */}
            <div className="pixel-border bg-black p-4 mb-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg text-[var(--pixel-gold)]">
                      {character.name}
                    </h2>
                    <span className={`text-xs px-2 py-0.5 border ${DIFFICULTY_COLORS[character.difficulty as Difficulty]}`}>
                      {(character.difficulty || "easy").toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Level {character.level} Adventurer
                  </p>
                </div>
                {character.streak > 0 && (
                  <div className="text-right">
                    <p className="text-[var(--pixel-gold)] text-sm">
                      {character.streak} day streak
                    </p>
                  </div>
                )}
              </div>

              {/* HP Bar */}
              <div className="mb-3">
                <HpBar hp={character.hp} maxHp={character.maxHp} />
              </div>

              {/* XP Bar */}
              <div>
                <XpBar xp={character.xp} level={character.level} />
              </div>

              <p className="text-xs text-gray-600 mt-3">
                Created {formatDate(character.createdAt)}
              </p>
            </div>

            {/* Active commitments */}
            <div className="mb-6">
              <h3 className="text-sm text-gray-400 mb-3">
                ACTIVE COMMITMENTS ({commitments.length})
              </h3>
              {commitments.length === 0 ? (
                <p className="text-xs text-gray-600">No active commitments</p>
              ) : (
                <div className="space-y-2">
                  {commitments.map((c: { owner: string | null; repo: string | null; isPrivate: boolean; commitmentEndsAt: number; renewalCount: number }, i: number) => (
                    <div key={i} className="pixel-border bg-black p-3">
                      <div className="flex justify-between items-center">
                        {c.isPrivate ? (
                          <span className="text-gray-500 text-sm">
                            •••/secret-project 🔒
                          </span>
                        ) : (
                          <a
                            href={`https://github.com/${c.owner}/${c.repo}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[var(--pixel-green)] hover:underline text-sm"
                          >
                            {c.owner}/{c.repo}
                          </a>
                        )}
                        <span className="text-xs text-gray-500">
                          {formatTimeRemaining(c.commitmentEndsAt)}
                        </span>
                      </div>
                      {c.renewalCount > 0 && (
                        <p className="text-xs text-gray-600 mt-1">
                          Renewed {c.renewalCount}x
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Graveyard */}
        {graveyard.length > 0 && (
          <div>
            <h3 className="text-sm text-gray-400 mb-3">
              GRAVEYARD ({graveyard.length})
            </h3>
            <div className="space-y-2">
              {graveyard.map((g: { name: string; level: number; deathCause: string; daysLived: number; diedAt: number; difficulty?: Difficulty }, i: number) => {
                const diff = g.difficulty || "easy";
                return (
                  <div key={i} className="pixel-border bg-black p-3 opacity-60">
                    <div className="flex justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">{g.name}</span>
                        <span className={`text-xs ${DIFFICULTY_COLORS[diff].split(' ')[0]}`}>
                          [{diff.toUpperCase()}]
                        </span>
                      </div>
                      <span className="text-xs text-gray-600">Lvl {g.level}</span>
                    </div>
                    <p className="text-xs text-red-400 mt-1">{g.deathCause}</p>
                    <p className="text-xs text-gray-600">
                      Lived {g.daysLived} days - {formatDate(g.diedAt)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* CTA for visitors */}
        <div className="mt-8 text-center">
          <Link
            href="/"
            className="text-[var(--pixel-green)] hover:underline text-sm"
          >
            Start your own adventure
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
