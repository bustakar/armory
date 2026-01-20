// Game constants
export const HP_DRAIN_PER_REPO_PER_HOUR = 0.2;
export const EARLY_EXIT_PENALTY = 50;
export const COMMITMENT_DAYS = 30;
export const MAX_HP = 100;
export const XP_PER_LEVEL = 100;

// Activity rewards and caps
export const REWARDS = {
  commit: { hp: 3, xp: 10, dailyCap: 5 },
  issueClosed: { hp: 8, xp: 25, dailyCap: 3 },
  prMerged: { hp: 12, xp: 50, dailyCap: null },
  milestone: { hp: 20, xp: 100, dailyCap: null },
  streak7: { hp: 5, xp: 15 },
  streak30: { hp: 15, xp: 50 },
  streak100: { hp: 30, xp: 200 },
  commitmentComplete: { hp: 10, xp: 25 },
  commitmentRenew: { xp: 25 },
} as const;

// Helper functions
export function calculateLevel(xp: number): number {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}

export function calculateHpDrain(activeRepoCount: number, hours: number = 1): number {
  return HP_DRAIN_PER_REPO_PER_HOUR * activeRepoCount * hours;
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
