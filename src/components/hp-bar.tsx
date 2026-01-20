"use client";

import { getHpColor, getHpTextColor } from "@/lib/utils";

interface HpBarProps {
  hp: number;
  maxHp: number;
  showDrain?: number; // Optional drain rate per hour
}

export function HpBar({ hp, maxHp, showDrain }: HpBarProps) {
  const percentage = Math.max(0, Math.min(100, (hp / maxHp) * 100));
  const isDanger = percentage <= 20;

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-gray-400">HP</span>
        <span className={`text-xs ${getHpTextColor(hp, maxHp)}`}>
          {Math.floor(hp)} / {maxHp}
        </span>
      </div>
      <div className="h-6 bg-gray-800 border-2 border-gray-600 relative overflow-hidden">
        <div
          className={`h-full ${getHpColor(hp, maxHp)} transition-all duration-300 ${isDanger ? "hp-danger" : ""}`}
          style={{ width: `${percentage}%` }}
        />
        {/* Pixel segments */}
        <div className="absolute inset-0 flex">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 border-r border-gray-700 last:border-r-0"
            />
          ))}
        </div>
      </div>
      {showDrain !== undefined && showDrain > 0 && (
        <div className="text-xs text-red-400 mt-1">
          -{showDrain.toFixed(1)} HP/hour
        </div>
      )}
    </div>
  );
}
