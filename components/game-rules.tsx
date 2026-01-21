"use client";

export function GameRules() {
  return (
    <div className="grid grid-cols-3 gap-4 text-xs text-gray-600">
      <div>
        <p className="text-gray-500 mb-1">HP Drain</p>
        <p>-0.2 HP/hour per active repo</p>
        <p>~5 HP/day per repo</p>
      </div>
      <div>
        <p className="text-gray-500 mb-1">Rewards</p>
        <p>Commit: +3 HP, +10 XP</p>
        <p>Issue: +8 HP, +25 XP</p>
        <p>PR: +12 HP, +50 XP</p>
      </div>
      <div>
        <p className="text-gray-500 mb-1">Commitments</p>
        <p>30-day cycles</p>
        <p>Early exit: -50 HP</p>
        <p>HP = 0? Permadeath.</p>
      </div>
    </div>
  );
}
