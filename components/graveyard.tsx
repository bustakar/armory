"use client";

import { formatDate } from "@/lib/utils";

type Difficulty = "easy" | "medium" | "hard";

interface DeadCharacter {
  _id: string;
  name: string;
  level: number;
  xp: number;
  diedAt: number;
  deathCause: string;
  daysLived: number;
  totalCommits: number;
  difficulty?: Difficulty;
}

interface GraveyardProps {
  characters: DeadCharacter[];
}

const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  easy: "text-green-600",
  medium: "text-yellow-600",
  hard: "text-red-600",
};

export function Graveyard({ characters }: GraveyardProps) {
  if (characters.length === 0) {
    return null;
  }

  return (
    <div className="pixel-border bg-black p-6">
      <h2 className="text-lg text-gray-400 mb-4 text-center">
        GRAVEYARD
      </h2>

      <div className="space-y-4">
        {characters.map((char) => {
          const difficulty = char.difficulty || "easy";
          return (
            <div
              key={char._id}
              className="border border-gray-700 p-3 bg-gray-900/50"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-gray-500">{char.name}</p>
                    <span className={`text-xs ${DIFFICULTY_COLORS[difficulty]}`}>
                      [{difficulty.toUpperCase()}]
                    </span>
                  </div>
                  <p className="text-xs text-gray-600">
                    Level {char.level} - {char.xp} XP
                  </p>
                </div>
                <p className="text-xs text-gray-600">
                  {formatDate(char.diedAt)}
                </p>
              </div>
              <p className="text-xs text-red-400 mt-2 italic">
                &quot;{char.deathCause}&quot;
              </p>
              <div className="flex gap-4 mt-2 text-xs text-gray-600">
                <span>{char.daysLived} days</span>
                <span>{char.totalCommits} commits</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
