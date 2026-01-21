// Game constants
export const EARLY_EXIT_PENALTY = 50;
export const COMMITMENT_DAYS = 30;
export const MAX_HP = 100;
export const XP_PER_LEVEL = 100;

// Difficulty types
export type Difficulty = "easy" | "medium" | "hard";

// HP drain rates per repo per hour by difficulty
export const HP_DRAIN_RATES: Record<Difficulty, number> = {
  easy: 0.2,
  medium: 0.5,
  hard: 1.0,
};

// XP multipliers by difficulty
export const XP_MULTIPLIERS: Record<Difficulty, number> = {
  easy: 1,
  medium: 2,
  hard: 3,
};

// Legacy constant for backwards compatibility
export const HP_DRAIN_PER_REPO_PER_HOUR = HP_DRAIN_RATES.easy;

// Activity rewards and caps
// Commits: XP only, no HP
// PRs: Only source of HP, higher reward if PR closes issues
export const REWARDS = {
  commit: { hp: 0, xp: 10, dailyCap: 5 },
  prMergedWithIssue: { hp: 12, xp: 50, dailyCap: null },
  prMergedNoIssue: { hp: 6, xp: 25, dailyCap: null },
  // Streaks
  streak7: { hp: 5, xp: 15 },
  streak30: { hp: 15, xp: 50 },
  streak100: { hp: 30, xp: 200 },
  // Commitments
  commitmentComplete: { hp: 10, xp: 25 },
  commitmentRenew: { xp: 25 },
} as const;

// Helper functions
export function calculateLevel(xp: number): number {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}

export function calculateHpDrain(activeRepoCount: number, hours: number = 1, difficulty: Difficulty = "easy"): number {
  return HP_DRAIN_RATES[difficulty] * activeRepoCount * hours;
}

export function clampHp(hp: number): number {
  return Math.max(0, Math.min(MAX_HP, hp));
}

export function getDeathCause(activeRepoCount: number): string {
  const causes = [
    `Bled out from ${activeRepoCount} neglected repos`,
    `Overwhelmed by ${activeRepoCount} competing commitments`,
    `Crushed under the weight of ${activeRepoCount} abandoned projects`,
    `Lost the battle against ${activeRepoCount} hungry repos`,
    `Drained dry by ${activeRepoCount} relentless codebases`,
  ];
  return causes[Math.floor(Math.random() * causes.length)];
}

export function getTodayString(): string {
  return new Date().toISOString().split("T")[0];
}

export function msToHours(ms: number): number {
  return ms / (1000 * 60 * 60);
}

export function daysToMs(days: number): number {
  return days * 24 * 60 * 60 * 1000;
}
