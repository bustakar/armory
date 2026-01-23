"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
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

export function PublicProfileContent({ username }: { username: string }) {
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
      <article className="w-full max-w-2xl" itemScope itemType="https://schema.org/ProfilePage">
        {/* Player info */}
        <header className="flex items-center gap-4 mb-6">
          {user.avatarUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatarUrl}
              alt={`${user.githubUsername}'s avatar`}
              className="w-16 h-16 pixel-border"
              itemProp="image"
            />
          )}
          <div>
            <h1 className="text-lg text-[var(--pixel-green)]" itemProp="name">
              @{user.githubUsername}
            </h1>
            <p className="text-xs text-gray-500">Public Profile</p>
          </div>
        </header>

        {/* No character */}
        {!character ? (
          <section className="pixel-border bg-black p-6 text-center">
            <p className="text-gray-400">
              This player hasn&apos;t created a character yet.
            </p>
          </section>
        ) : (
          <>
            {/* Character card */}
            <section className="pixel-border bg-black p-4 mb-6" aria-labelledby="character-heading">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 id="character-heading" className="text-lg text-[var(--pixel-gold)]">
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
              <div className="mb-3" role="meter" aria-label="HP" aria-valuenow={character.hp} aria-valuemin={0} aria-valuemax={character.maxHp}>
                <HpBar hp={character.hp} maxHp={character.maxHp} />
              </div>

              {/* XP Bar */}
              <div role="meter" aria-label="XP">
                <XpBar xp={character.xp} level={character.level} />
              </div>

              <p className="text-xs text-gray-600 mt-3">
                <time dateTime={new Date(character.createdAt).toISOString()}>
                  Created {formatDate(character.createdAt)}
                </time>
              </p>
            </section>

            {/* Active commitments */}
            <section className="mb-6" aria-labelledby="commitments-heading">
              <h3 id="commitments-heading" className="text-sm text-gray-400 mb-3">
                ACTIVE COMMITMENTS ({commitments.length})
              </h3>
              {commitments.length === 0 ? (
                <p className="text-xs text-gray-600">No active commitments</p>
              ) : (
                <ul className="space-y-2" role="list">
                  {commitments.map((c: { owner: string | null; repo: string | null; isPrivate: boolean; commitmentEndsAt: number; renewalCount: number }, i: number) => (
                    <li key={i} className="pixel-border bg-black p-3">
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
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}

        {/* Graveyard */}
        {graveyard.length > 0 && (
          <section aria-labelledby="graveyard-heading">
            <h3 id="graveyard-heading" className="text-sm text-gray-400 mb-3">
              GRAVEYARD ({graveyard.length})
            </h3>
            <ul className="space-y-2" role="list">
              {graveyard.map((g: { name: string; level: number; deathCause: string; daysLived: number; diedAt: number; difficulty?: Difficulty }, i: number) => {
                const diff = g.difficulty || "easy";
                return (
                  <li key={i} className="pixel-border bg-black p-3 opacity-60">
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
                      Lived {g.daysLived} days - <time dateTime={new Date(g.diedAt).toISOString()}>{formatDate(g.diedAt)}</time>
                    </p>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* CTA for visitors */}
        <footer className="mt-8 text-center">
          <Link
            href="/"
            className="text-[var(--pixel-green)] hover:underline text-sm"
          >
            Start your own adventure
          </Link>
        </footer>
      </article>
    </AppShell>
  );
}
