"use client";

import {
  Authenticated,
  Unauthenticated,
} from "convex/react";
import { SignInButton, SignUpButton } from "@clerk/nextjs";
import Link from "next/link";

export default function Home() {
  return (
    <main id="main" className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="pixel-border bg-black p-8 max-w-lg text-center">
        <h1 className="text-2xl text-[var(--pixel-gold)] mb-6">ARMORY</h1>
        <p className="text-sm text-gray-400 mb-2">Developer Survival Game</p>
        <p className="text-xs text-gray-600 mb-8">
          Stake your HP on GitHub activity. Survive or perish.
        </p>

        <Unauthenticated>
          <div className="space-y-4">
            <SignInButton mode="modal">
              <button className="w-full bg-[var(--pixel-green)] text-black py-3 hover:bg-[var(--pixel-dark-green)] transition-colors">
                SIGN IN WITH GITHUB
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="w-full bg-gray-800 text-[var(--pixel-green)] py-3 hover:bg-gray-700 transition-colors border border-gray-600">
                CREATE ACCOUNT
              </button>
            </SignUpButton>
          </div>
        </Unauthenticated>

        <Authenticated>
          <Link
            href="/dashboard"
            className="block w-full bg-[var(--pixel-green)] text-black py-3 hover:bg-[var(--pixel-dark-green)] transition-colors"
          >
            ENTER ARMORY
          </Link>
        </Authenticated>

        {/* Game rules preview */}
        <div className="mt-8 pt-6 border-t border-gray-700 text-left">
          <h2 className="text-xs text-[var(--pixel-gold)] mb-4 text-center">HOW IT WORKS</h2>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">Commit code</span>
              <span className="text-green-400">+3 HP, +10 XP</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Close issue</span>
              <span className="text-green-400">+8 HP, +25 XP</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Merge PR</span>
              <span className="text-green-400">+12 HP, +50 XP</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Per repo/hour</span>
              <span className="text-red-400">-0.2 HP</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">HP reaches 0</span>
              <span className="text-red-400">PERMADEATH</span>
            </div>
          </div>
        </div>
      </div>

      <footer className="mt-8 text-xs text-gray-600">
        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-gray-400"
        >
          Built for GitHub developers
        </a>
      </footer>
    </main>
  );
}
