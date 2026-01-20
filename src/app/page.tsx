"use client";

import Link from "next/link";

export default function Home() {
  const githubClientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const redirectUri = `${appUrl}/auth/callback`;

  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${githubClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=repo,user`;

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="pixel-border bg-black p-8 max-w-2xl text-center">
        {/* Title */}
        <h1 className="text-2xl text-[var(--pixel-gold)] mb-8">
          ⚔️ ARMORY ⚔️
        </h1>

        {/* Subtitle */}
        <p className="text-[var(--pixel-green)] mb-8 leading-relaxed">
          GitHub Accountability Game
        </p>

        {/* Game description */}
        <div className="text-left mb-8 space-y-4 text-xs">
          <p className="text-gray-400">
            Commit to repos. Work drains your HP hourly.
            Your code keeps you alive.
          </p>

          <div className="border-t border-[var(--pixel-border)] pt-4">
            <p className="text-[var(--pixel-red)]">
              ❤️ HP drains: 0.2/hour per active repo
            </p>
            <p className="text-[var(--pixel-green)]">
              ⚡ Commits restore: +3 HP, +10 XP
            </p>
            <p className="text-[var(--pixel-gold)]">
              ⚠️ HP = 0? Permadeath. Start over.
            </p>
          </div>
        </div>

        {/* Login button */}
        <a
          href={githubAuthUrl}
          className="inline-block bg-[var(--pixel-green)] text-black px-8 py-4 hover:bg-[var(--pixel-dark-green)] transition-colors"
        >
          🎮 LOGIN WITH GITHUB
        </a>

        {/* Footer */}
        <p className="text-gray-600 text-xs mt-8">
          30-day commitment cycles • Early exit = -50 HP penalty
        </p>
      </div>
    </main>
  );
}
