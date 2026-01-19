export interface Character {
  name: string;
  title: string;
  level: number;
  xp: number;
  xpToNextLevel: number;
  hp: number;
  maxHp: number;
  createdAt: string;
  isAlive: boolean;
  deathCause?: string;
  deathDate?: string;
}

export interface Path {
  name: string;
  level: number;
  xp: number;
}

export interface Zone {
  name: string;
  path: string;
  enteredAt: string;
  subregions: Subregion[];
}

export interface Subregion {
  name: string;
  zone: string;
  status: "locked" | "active" | "paused" | "cleared";
  questXpEarned: number;
  lastActivity?: string;
  daysSinceActivity?: number;
}

export interface GameAction {
  type: ActionType;
  timestamp: string;
  commitHash: string;
  details: Record<string, unknown>;
  xpChange: number;
  hpChange: number;
}

export type ActionType =
  | "CHARACTER_CREATE"
  | "CHARACTER_DEATH"
  | "CHARACTER_LEVEL"
  | "PATH_CREATE"
  | "PATH_LEVEL"
  | "ZONE_ENTER"
  | "ZONE_MILESTONE"
  | "SUBREGION_ACTIVATE"
  | "SUBREGION_UPDATE"
  | "SUBREGION_CLEAR"
  | "QUEST_CREATE"
  | "QUEST_COMPLETE"
  | "QUEST_ABANDON"
  | "DAILY"
  | "WORLD_QUEST"
  | "ACHIEVEMENT_UNLOCK"
  | "STREAK"
  | "PERFECT_WEEK"
  | "UNKNOWN";

export interface GitCommit {
  hash: string;
  message: string;
  date: string;
  author: string;
}

export interface GameState {
  character: Character;
  paths: Path[];
  zones: Zone[];
  activeSubregions: Subregion[];
  recentActions: GameAction[];
  totalXpEarned: number;
  totalHpLost: number;
  questsCompleted: number;
  subregionsCleared: number;
  currentStreak: number;
  longestStreak: number;
  graveyard: Character[];
  lastUpdated: string;
  verified: boolean;
  verificationErrors: string[];
}

export interface LevelThreshold {
  level: number;
  totalXp: number;
}

export const LEVEL_THRESHOLDS: LevelThreshold[] = [
  { level: 1, totalXp: 0 },
  { level: 2, totalXp: 100 },
  { level: 3, totalXp: 250 },
  { level: 4, totalXp: 450 },
  { level: 5, totalXp: 700 },
  { level: 6, totalXp: 1000 },
  { level: 7, totalXp: 1400 },
  { level: 8, totalXp: 1900 },
  { level: 9, totalXp: 2500 },
  { level: 10, totalXp: 3200 },
  // After level 10, it's linear +800 per level
];

export function calculateLevel(totalXp: number): { level: number; xpToNextLevel: number } {
  // Check thresholds up to level 10
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalXp >= LEVEL_THRESHOLDS[i].totalXp) {
      if (i === LEVEL_THRESHOLDS.length - 1) {
        // Beyond level 10, linear progression
        const xpAbove10 = totalXp - LEVEL_THRESHOLDS[i].totalXp;
        const levelsAbove10 = Math.floor(xpAbove10 / 800);
        const level = 10 + levelsAbove10;
        const currentLevelXp = LEVEL_THRESHOLDS[i].totalXp + levelsAbove10 * 800;
        const nextLevelXp = currentLevelXp + 800;
        return { level, xpToNextLevel: nextLevelXp - totalXp };
      }
      const nextThreshold = LEVEL_THRESHOLDS[i + 1];
      return {
        level: LEVEL_THRESHOLDS[i].level,
        xpToNextLevel: nextThreshold.totalXp - totalXp,
      };
    }
  }
  return { level: 1, xpToNextLevel: 100 - totalXp };
}

export function calculateMaxHp(level: number): number {
  return 100 + (level - 1) * 10;
}
