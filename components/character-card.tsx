"use client";

import { HpBar } from "./hp-bar";
import { XpBar } from "./xp-bar";

interface Character {
  _id: string;
  name: string;
  hp: number;
  maxHp: number;
  xp: number;
  level: number;
  streak: number;
  isAlive: boolean;
}

interface CharacterCardProps {
  character: Character;
  activeRepoCount: number;
  avatarUrl?: string;
}

const HP_DRAIN_PER_REPO_PER_HOUR = 0.2;

export function CharacterCard({ character, activeRepoCount, avatarUrl }: CharacterCardProps) {
  const hourlyDrain = HP_DRAIN_PER_REPO_PER_HOUR * activeRepoCount;

  return (
    <div className="pixel-border bg-black p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        {avatarUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt={character.name}
            loading="lazy"
            className="w-16 h-16 border-2 border-gray-600"
            style={{ imageRendering: "pixelated" }}
          />
        )}
        <div>
          <h2 className="text-xl text-[var(--pixel-gold)]">{character.name}</h2>
          <p className="text-xs text-gray-400">
            Level {character.level} Adventurer
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="space-y-4">
        <HpBar
          hp={character.hp}
          maxHp={character.maxHp}
          showDrain={hourlyDrain}
        />
        <XpBar xp={character.xp} level={character.level} />
      </div>

      {/* Streak */}
      <div className="mt-4 pt-4 border-t border-gray-700">
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-400">Streak</span>
          <span className="text-[var(--pixel-gold)]">
            {character.streak} days
          </span>
        </div>
      </div>

      {/* Active repos warning */}
      {activeRepoCount > 0 && (
        <div className="mt-4 p-2 bg-red-900/30 border border-red-700">
          <p className="text-xs text-red-400">
            {activeRepoCount} active repo{activeRepoCount > 1 ? "s" : ""} draining HP
          </p>
          <p className="text-xs text-gray-500">
            -{(hourlyDrain * 24).toFixed(1)} HP/day
          </p>
        </div>
      )}
    </div>
  );
}
