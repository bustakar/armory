"use client";

import { useState } from "react";
import Link from "next/link";
import { GameRules } from "./game-rules";

interface AppShellProps {
  children: React.ReactNode;
  rightNav?: React.ReactNode;
  centered?: boolean;
}

export function AppShell({ children, rightNav, centered = true }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar - full width */}
      <header className="w-full px-4 py-3 border-b border-gray-700 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-xl text-[var(--pixel-gold)] hover:opacity-80">
            ARMORY
          </Link>
          {/* Desktop only: Rules link */}
          <Link href="/rules" className="hidden sm:block text-gray-500 hover:text-gray-400 text-xs">
            Rules
          </Link>
        </div>

        {/* Desktop nav */}
        <div className="hidden sm:flex items-center gap-4">
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

        {/* Mobile: hamburger button */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="sm:hidden p-2 text-gray-400 hover:text-white"
          aria-label="Open menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </header>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 sm:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <div
        className={`fixed top-0 right-0 h-full w-64 bg-gray-900 border-l border-gray-700 z-50 transform transition-transform duration-200 ease-in-out sm:hidden ${
          sidebarOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar header */}
          <div className="flex justify-between items-center p-4 border-b border-gray-700">
            <span className="text-[var(--pixel-gold)] font-bold">Menu</span>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 text-gray-400 hover:text-white"
              aria-label="Close menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Sidebar content */}
          <nav className="flex-1 p-4 space-y-4">
            {/* User info if provided */}
            {rightNav && (
              <div className="pb-4 border-b border-gray-700">
                {rightNav}
              </div>
            )}

            {/* Navigation links */}
            <Link
              href="/rules"
              onClick={() => setSidebarOpen(false)}
              className="block py-2 text-gray-300 hover:text-white"
            >
              Rules
            </Link>
            <a
              href="https://github.com/bustakar/armory"
              target="_blank"
              rel="noopener noreferrer"
              className="block py-2 text-gray-300 hover:text-white"
            >
              GitHub
            </a>
          </nav>
        </div>
      </div>

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
