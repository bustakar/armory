"use client";

import Link from "next/link";
import { GameRules } from "./game-rules";

interface AppShellProps {
  children: React.ReactNode;
  rightNav?: React.ReactNode;
  centered?: boolean;
}

export function AppShell({ children, rightNav, centered = true }: AppShellProps) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar - full width */}
      <header className="w-full px-4 py-3 border-b border-gray-700 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-xl text-[var(--pixel-gold)] hover:opacity-80">
            ARMORY
          </Link>
          <Link href="/rules" className="text-gray-500 hover:text-gray-400 text-xs">
            Rules
          </Link>
        </div>
        <div className="flex items-center gap-4">
          {rightNav}
          <a
            href="https://github.com/bustakar/armory"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-500 hover:text-gray-400 text-xs"
          >
            GitHub
          </a>
        </div>
      </header>

      {/* Main content */}
      <main
        id="main"
        className={`flex-1 flex flex-col px-6 ${
          centered ? "items-center justify-center py-10" : "items-center pt-4 pb-10"
        }`}
      >
        {children}
      </main>

      {/* Footer rules - full width, pinned to bottom */}
      <footer className="w-full px-4 py-4 border-t border-gray-800">
        <GameRules />
      </footer>
    </div>
  );
}
