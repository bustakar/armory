// GitHub API types
export interface GitHubUser {
  id: number;
  login: string;
  avatar_url: string;
  name: string | null;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
  };
  description: string | null;
  html_url: string;
  pushed_at: string;
  language: string | null;
}

export interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      date: string;
    };
  };
}

export interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  state: "open" | "closed";
  closed_at: string | null;
  labels: { name: string }[];
  milestone: { title: string } | null;
}

export interface GitHubPullRequest {
  id: number;
  number: number;
  title: string;
  state: "open" | "closed";
  merged_at: string | null;
}

export interface GitHubMilestone {
  id: number;
  number: number;
  title: string;
  state: "open" | "closed";
  closed_at: string | null;
  open_issues: number;
  closed_issues: number;
}

// Game types
export interface Character {
  name: string;
  level: number;
  xp: number;
  xpToNextLevel: number;
  hp: number;
  maxHp: number;
  isAlive: boolean;
  // Stats
  totalCommits: number;
  totalIssuesClosed: number;
  totalPrsMerged: number;
  totalMilestonesCompleted: number;
  currentStreak: number;
  longestStreak: number;
  // Timestamps
  createdAt: string;
  lastActivityAt?: string;
  deathDate?: string;
  deathCause?: string;
}

export interface Zone {
  owner: string;
  repo: string;
  fullName: string;
  description: string | null;
  language: string | null;
  activatedAt: string;
  // Stats
  commits: number;
  issuesClosed: number;
  openIssues: number;
  milestonesCompleted: number;
  openMilestones: number;
  lastCommitAt?: string;
}

export interface DailyActivity {
  date: string;
  commits: number;
  issuesClosed: number;
  prsMerged: number;
  milestonesCompleted: number;
  xpEarned: number;
  hpChange: number;
}

// XP/HP constants
export const XP_VALUES = {
  COMMIT: 10,
  ISSUE_CLOSED: 25,
  PR_MERGED: 50,
  MILESTONE_COMPLETED: 200,
  STREAK_BONUS: 15,
  PERFECT_DAY_BONUS: 50, // Activity in all active repos
} as const;

export const HP_VALUES = {
  MAX_HP: 100,
  DAILY_ACTIVITY: 5, // HP gain per day with activity
  NO_ACTIVITY: -10, // HP loss per day without activity
  PERFECT_DAY: 10, // Bonus HP for activity in ALL active repos
} as const;

// Level calculation: 100 XP per level
export function calculateLevel(totalXp: number): { level: number; xpToNextLevel: number } {
  const level = Math.floor(totalXp / 100) + 1;
  const xpIntoCurrentLevel = totalXp % 100;
  const xpToNextLevel = 100 - xpIntoCurrentLevel;
  return { level, xpToNextLevel };
}

// Calculate XP from daily activity
export function calculateDailyXp(activity: {
  commits: number;
  issuesClosed: number;
  prsMerged: number;
  milestonesCompleted: number;
  isStreak: boolean;
}): number {
  let xp = 0;
  xp += activity.commits * XP_VALUES.COMMIT;
  xp += activity.issuesClosed * XP_VALUES.ISSUE_CLOSED;
  xp += activity.prsMerged * XP_VALUES.PR_MERGED;
  xp += activity.milestonesCompleted * XP_VALUES.MILESTONE_COMPLETED;
  if (activity.isStreak) {
    xp += XP_VALUES.STREAK_BONUS;
  }
  return xp;
}

// Calculate HP change from daily activity
export function calculateDailyHp(hasActivity: boolean, isPerfectDay: boolean): number {
  if (!hasActivity) {
    return HP_VALUES.NO_ACTIVITY;
  }
  let hp = HP_VALUES.DAILY_ACTIVITY;
  if (isPerfectDay) {
    hp += HP_VALUES.PERFECT_DAY;
  }
  return hp;
}
