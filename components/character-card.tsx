"use client";

import { HpBar } from "./hp-bar";
import { XpBar } from "./xp-bar";
import { HP_DRAIN_RATES, XP_MULTIPLIERS, type Difficulty } from "@/convex/game";

interface Character {
  _id: string;
  name: string;
  hp: number;
  maxHp: number;
  xp: number;
  level: number;
  streak: number;
  isAlive: boolean;
  difficulty?: Difficulty;
}

interface CharacterCardProps {
  character: Character;
  activeRepoCount: number;
  avatarUrl?: string;
  onKillCharacter?: () => void;
  onUpgradeDifficulty?: (newDifficulty: "medium" | "hard") => void;
}

const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  easy: "text-green-400 border-green-700 bg-green-900/30",
  medium: "text-yellow-400 border-yellow-700 bg-yellow-900/30",
  hard: "text-red-400 border-red-700 bg-red-900/30",
};

export function CharacterCard({ character, activeRepoCount, avatarUrl, onKillCharacter, onUpgradeDifficulty }: CharacterCardProps) {
  const difficulty = character.difficulty || "easy";
  const hourlyDrain = HP_DRAIN_RATES[difficulty] * activeRepoCount;
  const xpMultiplier = XP_MULTIPLIERS[difficulty];

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
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xl text-[var(--pixel-gold)]">{character.name}</h2>
            <span className={`text-xs px-2 py-0.5 border ${DIFFICULTY_COLORS[difficulty]}`}>
              {difficulty.toUpperCase()}
            </span>
          </div>
          <p className="text-xs text-gray-400">
            Level {character.level} Adventurer
            {xpMultiplier > 1 && (
              <span className="text-purple-400 ml-2">({xpMultiplier}x XP)</span>
            )}
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

      {/* Footer actions */}
      {(onUpgradeDifficulty || onKillCharacter) && (
        <div className="mt-4 pt-4 border-t border-gray-700 space-y-2">
          {/* Upgrade difficulty link - only show if not on hard */}
          {onUpgradeDifficulty && difficulty !== "hard" && (
            <button
              onClick={() => {
                const nextDifficulty = difficulty === "easy" ? "medium" : "hard";
                onUpgradeDifficulty(nextDifficulty);
              }}
              className="w-full text-xs text-gray-500 hover:text-yellow-400 transition-colors py-2"
            >
              Upgrade difficulty...
            </button>
          )}
          {/* Kill character button */}
          {onKillCharacter && (
            <button
              onClick={onKillCharacter}
              className="w-full text-xs text-gray-500 hover:text-red-400 transition-colors py-2"
            >
              End character...
            </button>
          )}
        </div>
      )}
    </div>
  );
}
