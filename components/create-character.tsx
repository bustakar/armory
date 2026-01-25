"use client";

import { useState } from "react";
import { analytics } from "@/lib/analytics";

type Difficulty = "easy" | "medium" | "hard";

interface CreateCharacterProps {
  githubUsername: string;
  onSubmit: (name: string, difficulty: Difficulty) => void;
  isLoading: boolean;
}

const DIFFICULTY_INFO: Record<Difficulty, { label: string; color: string; hpDrain: number; xpMultiplier: number; description: string }> = {
  easy: {
    label: "Easy",
    color: "text-green-400",
    hpDrain: 0.5,
    xpMultiplier: 1,
    description: "~8 days survival without PRs",
  },
  medium: {
    label: "Medium",
    color: "text-yellow-400",
    hpDrain: 1.5,
    xpMultiplier: 2,
    description: "~2.8 days survival without PRs",
  },
  hard: {
    label: "Hard",
    color: "text-red-400",
    hpDrain: 4.0,
    xpMultiplier: 3,
    description: "~1 day survival without PRs",
  },
};

export function CreateCharacter({
  githubUsername,
  onSubmit,
  isLoading,
}: CreateCharacterProps) {
  const [name, setName] = useState(githubUsername);
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      analytics.characterCreated({ name: name.trim(), difficulty });
      onSubmit(name.trim(), difficulty);
    }
  };

  const currentDifficulty = DIFFICULTY_INFO[difficulty];

  return (
    <div className="pixel-border bg-black p-8 max-w-md mx-auto text-center">
      <h1 className="text-xl text-[var(--pixel-gold)] mb-6">
        CREATE CHARACTER
      </h1>

      <p className="text-sm text-gray-400 mb-6">
        Welcome, brave developer! Choose a name and difficulty for your character.
      </p>

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={20}
          className="w-full bg-gray-900 border-2 border-gray-600 p-3 text-center text-[var(--pixel-green)] mb-4"
          placeholder="Character name"
        />

        {/* Difficulty selector */}
        <div className="mb-4">
          <label className="block text-xs text-gray-400 mb-2">DIFFICULTY</label>
          <div className="flex gap-2">
            {(Object.keys(DIFFICULTY_INFO) as Difficulty[]).map((d) => {
              const info = DIFFICULTY_INFO[d];
              const isSelected = difficulty === d;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDifficulty(d)}
                  className={`flex-1 py-2 border-2 transition-colors ${
                    isSelected
                      ? `${info.color} border-current bg-gray-900`
                      : "text-gray-500 border-gray-700 hover:border-gray-500"
                  }`}
                >
                  {info.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Difficulty info */}
        <div className="mb-6 p-3 bg-gray-900 border border-gray-700 text-left">
          <div className="flex justify-between items-center mb-2">
            <span className={`text-sm ${currentDifficulty.color}`}>{currentDifficulty.label}</span>
            <span className="text-xs text-purple-400">{currentDifficulty.xpMultiplier}x XP</span>
          </div>
          <p className="text-xs text-gray-400 mb-2">{currentDifficulty.description}</p>
          <div className="text-xs text-red-400">
            -{currentDifficulty.hpDrain} HP/hour per repo ({(currentDifficulty.hpDrain * 24).toFixed(0)} HP/day)
          </div>
        </div>

        <button
          type="submit"
          disabled={!name.trim() || isLoading}
          className="w-full bg-[var(--pixel-green)] text-black py-3 hover:bg-[var(--pixel-dark-green)] transition-colors disabled:opacity-50"
        >
          {isLoading ? "Creating..." : "BEGIN ADVENTURE"}
        </button>
      </form>

      <div className="mt-6 text-xs text-gray-500 space-y-1">
        <p>Starting Stats:</p>
        <p className="text-red-400">HP: 100/100</p>
        <p className="text-purple-400">XP: 0 (Level 1)</p>
        <p className="text-[var(--pixel-gold)]">Streak: 0 days</p>
      </div>
    </div>
  );
}
