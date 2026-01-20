export interface Character {
  name: string;
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

export interface Zone {
  name: string;
  createdAt: string;
  questsCompleted: number;
  questsActive: number;
  questsBacklog: number;
}

export interface Quest {
  name: string;
  zone: string;
  xpValue: number;
  status: "backlog" | "active" | "completed" | "abandoned" | "missed";
  createdAt: string;
  activatedAt?: string;
  completedAt?: string;
}

export interface DailyConfig {
  name: string;
  xpValue: number;
}

export interface DailyLog {
  date: string;
  completed: number;
  total: number;
  xpEarned: number;
  perfect: boolean;
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
  | "ZONE_CREATE"
  | "QUEST_CREATE"
  | "QUEST_ACTIVATE"
  | "QUEST_COMPLETE"
  | "QUEST_ABANDON"
  | "DAILY"
  | "DAILY_CONFIG"
  | "UNKNOWN";

export interface GitCommit {
  hash: string;
  message: string;
  date: string;
  author: string;
}

export interface GameState {
  character: Character;
  zones: Zone[];
  quests: Quest[];
  dailyConfig: DailyConfig[];
  dailyLogs: DailyLog[];
  recentActions: GameAction[];
  totalXpEarned: number;
  totalHpLost: number;
  totalHpGained: number;
  questsCompleted: number;
  currentStreak: number;
  longestStreak: number;
  graveyard: Character[];
  lastUpdated: string;
  verified: boolean;
  verificationErrors: string[];
  missedQuests: { name: string; date: string; hpLost: number }[];
  missedDailies: { date: string; hpLost: number }[];
}

// Simple leveling: 100 XP per level
export function calculateLevel(totalXp: number): { level: number; xpToNextLevel: number } {
  const level = Math.floor(totalXp / 100) + 1;
  const xpIntoCurrentLevel = totalXp % 100;
  const xpToNextLevel = 100 - xpIntoCurrentLevel;
  return { level, xpToNextLevel };
}

// Fixed max HP at 100
export function calculateMaxHp(): number {
  return 100;
}
