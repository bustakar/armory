"use client";

import { useState } from "react";

interface CreateCharacterProps {
  githubUsername: string;
  onSubmit: (name: string) => void;
  isLoading: boolean;
}

export function CreateCharacter({
  githubUsername,
  onSubmit,
  isLoading,
}: CreateCharacterProps) {
  const [name, setName] = useState(githubUsername);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSubmit(name.trim());
    }
  };

  return (
    <div className="pixel-border bg-black p-8 max-w-md mx-auto text-center">
      <h1 className="text-xl text-[var(--pixel-gold)] mb-6">
        CREATE CHARACTER
      </h1>

      <p className="text-sm text-gray-400 mb-6">
        Welcome, brave developer! Choose a name for your character.
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
