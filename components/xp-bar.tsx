"use client";

interface XpBarProps {
  xp: number;
  level: number;
}

const XP_PER_LEVEL = 100;

export function XpBar({ xp, level }: XpBarProps) {
  const xpInCurrentLevel = xp % XP_PER_LEVEL;
  const percentage = (xpInCurrentLevel / XP_PER_LEVEL) * 100;

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-purple-400">LVL {level}</span>
        <span className="text-xs text-purple-400">
          {xpInCurrentLevel} / {XP_PER_LEVEL} XP
        </span>
      </div>
      <div className="h-4 bg-gray-800 border-2 border-gray-600 relative overflow-hidden">
        <div
          className="h-full bg-purple-600 transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="text-xs text-gray-500 mt-1">
        Total: {xp} XP
      </div>
    </div>
  );
}
