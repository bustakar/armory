"use client";

export function GameRules() {
  return (
    <div className="grid grid-cols-3 gap-4 text-xs text-gray-600">
      <div>
        <p className="text-gray-500 mb-1">HP Drain (per repo)</p>
        <p className="text-green-600">Easy: -0.5/hr (~12/day)</p>
        <p className="text-yellow-600">Medium: -1.5/hr (~36/day)</p>
        <p className="text-red-600">Hard: -4.0/hr (~96/day)</p>
      </div>
      <div>
        <p className="text-gray-500 mb-1">Rewards</p>
        <p>Commit: +10 XP (no HP)</p>
        <p>PR w/issue: +24 HP, +50 XP</p>
        <p>PR only: +12 HP, +25 XP</p>
      </div>
      <div>
        <p className="text-gray-500 mb-1">XP Multipliers</p>
        <p className="text-green-600">Easy: 1x XP</p>
        <p className="text-yellow-600">Medium: 2x XP</p>
        <p className="text-red-600">Hard: 3x XP</p>
      </div>
    </div>
  );
}
