"use client";

import {
  Authenticated,
  Unauthenticated,
} from "convex/react";
import { SignInButton } from "@clerk/nextjs";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";

export default function Home() {
  return (
    <AppShell>
      <div className="pixel-border bg-black p-8 max-w-lg text-center">
        <h1 className="text-2xl text-[var(--pixel-gold)] mb-6">ARMORY</h1>
        <p className="text-sm text-gray-400 mb-2">Developer Survival Game</p>
        <p className="text-xs text-gray-600 mb-8">
          Stake your HP on GitHub activity. Survive or perish.
        </p>

        <Unauthenticated>
          <SignInButton mode="modal">
            <button className="w-full bg-[var(--pixel-green)] text-black py-3 hover:bg-[var(--pixel-dark-green)] transition-colors">
              SIGN IN WITH GITHUB
            </button>
          </SignInButton>
        </Unauthenticated>

        <Authenticated>
          <Link
            href="/dashboard"
            className="block w-full bg-[var(--pixel-green)] text-black py-3 hover:bg-[var(--pixel-dark-green)] transition-colors"
          >
            ENTER ARMORY
          </Link>
        </Authenticated>
      </div>
    </AppShell>
  );
}
