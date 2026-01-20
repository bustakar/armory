import type {
  GameAction,
  ActionType,
  GitCommit,
  GameState,
  Character,
  Zone,
  Quest,
  DailyConfig,
  DailyLog,
} from "./types";
import { calculateLevel, calculateMaxHp } from "./types";

const ACTION_PATTERNS: { pattern: RegExp; type: ActionType }[] = [
  { pattern: /^CHARACTER CREATE "([^"]+)"/, type: "CHARACTER_CREATE" },
  { pattern: /^ZONE CREATE "([^"]+)"/, type: "ZONE_CREATE" },
  { pattern: /^QUEST CREATE "([^"]+)"/, type: "QUEST_CREATE" },
  { pattern: /^QUEST ACTIVATE "([^"]+)"/, type: "QUEST_ACTIVATE" },
  { pattern: /^QUEST COMPLETE "([^"]+)"/, type: "QUEST_COMPLETE" },
  { pattern: /^QUEST ABANDON "([^"]+)"/, type: "QUEST_ABANDON" },
  { pattern: /^DAILY \d+\/\d+/, type: "DAILY" },
  { pattern: /^DAILY CONFIG/, type: "DAILY_CONFIG" },
];

export function parseCommitMessage(message: string): { type: ActionType; details: Record<string, unknown> } {
  const trimmed = message.trim();

  for (const { pattern, type } of ACTION_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) {
      const details: Record<string, unknown> = {};

      // Extract quoted strings
      const quotedMatches = trimmed.matchAll(/"([^"]+)"/g);
      const quoted = Array.from(quotedMatches).map((m) => m[1]);
      if (quoted.length > 0) {
        details.name = quoted[0];
      }

      // Extract XP gain
      const xpMatch = trimmed.match(/\+(\d+)\s*XP/i);
      if (xpMatch && xpMatch[1]) {
        details.xp = parseInt(xpMatch[1], 10);
      }

      // Extract XP value for quest creation (e.g., "50 in zone")
      const questXpMatch = trimmed.match(/"[^"]+"\s+(\d+)\s+in/);
      if (questXpMatch && questXpMatch[1]) {
        details.xpValue = parseInt(questXpMatch[1], 10);
      }

      // Extract daily completion
      const dailyMatch = trimmed.match(/DAILY (\d+)\/(\d+)/);
      if (dailyMatch && dailyMatch[1] && dailyMatch[2]) {
        details.completed = parseInt(dailyMatch[1], 10);
        details.total = parseInt(dailyMatch[2], 10);
      }

      // Extract "in" clause for zone
      const inMatch = trimmed.match(/in\s+(\S+)/);
      if (inMatch) {
        details.zone = inMatch[1];
      }

      // Check for PERFECT bonus
      if (trimmed.includes("PERFECT")) {
        details.perfect = true;
      }

      return { type, details };
    }
  }

  return { type: "UNKNOWN", details: {} };
}

export function parseCommit(commit: GitCommit): GameAction {
  const { type, details } = parseCommitMessage(commit.message);

  let xpChange = 0;
  let hpChange = 0;

  if (typeof details.xp === "number") {
    xpChange = details.xp;
  }

  // Perfect day bonus
  if (details.perfect) {
    xpChange += 50;
  }

  return {
    type,
    timestamp: commit.date,
    commitHash: commit.hash,
    details,
    xpChange,
    hpChange,
  };
}

function getDateString(timestamp: string): string {
  return timestamp.split("T")[0];
}

export function buildGameState(commits: GitCommit[], dailyConfig: DailyConfig[] = []): GameState {
  const actions: GameAction[] = commits.map(parseCommit).filter((a) => a.type !== "UNKNOWN");

  // Sort by timestamp (oldest first)
  actions.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  let character: Character | null = null;
  const zones: Map<string, Zone> = new Map();
  const quests: Map<string, Quest> = new Map();
  const dailyLogs: DailyLog[] = [];
  const graveyard: Character[] = [];

  let totalXp = 0;
  let totalHpLost = 0;
  let totalHpGained = 0;
  let currentHp = 100;
  let questsCompleted = 0;
  const verificationErrors: string[] = [];
  const missedQuests: { name: string; date: string; hpLost: number }[] = [];
  const missedDailies: { date: string; hpLost: number }[] = [];

  // Track active quests by date for miss detection
  const activeQuestsByDate: Map<string, Set<string>> = new Map();
  const completedQuestsByDate: Map<string, Set<string>> = new Map();
  const dailyDates: Set<string> = new Set();

  // First pass: process all actions
  for (const action of actions) {
    const date = getDateString(action.timestamp);

    switch (action.type) {
      case "CHARACTER_CREATE": {
        if (character && character.isAlive) {
          graveyard.push({ ...character, isAlive: false, deathCause: "Replaced" });
        }
        character = {
          name: String(action.details.name || "Unknown"),
          level: 1,
          xp: 0,
          xpToNextLevel: 100,
          hp: 100,
          maxHp: 100,
          createdAt: action.timestamp,
          isAlive: true,
        };
        totalXp = 0;
        currentHp = 100;
        totalHpLost = 0;
        totalHpGained = 0;
        zones.clear();
        quests.clear();
        break;
      }

      case "ZONE_CREATE": {
        const zoneName = String(action.details.name || "Unknown");
        zones.set(zoneName, {
          name: zoneName,
          createdAt: action.timestamp,
          questsCompleted: 0,
          questsActive: 0,
          questsBacklog: 0,
        });
        break;
      }

      case "QUEST_CREATE": {
        const questName = String(action.details.name || "Unknown");
        const xpValue = typeof action.details.xpValue === "number" ? action.details.xpValue : 50;
        const zone = String(action.details.zone || "unknown");
        quests.set(questName, {
          name: questName,
          zone,
          xpValue,
          status: "backlog",
          createdAt: action.timestamp,
        });
        break;
      }

      case "QUEST_ACTIVATE": {
        const questName = String(action.details.name || "Unknown");
        const quest = quests.get(questName);
        if (quest) {
          quest.status = "active";
          quest.activatedAt = action.timestamp;
        }
        // Track for miss detection
        if (!activeQuestsByDate.has(date)) {
          activeQuestsByDate.set(date, new Set());
        }
        activeQuestsByDate.get(date)!.add(questName);
        break;
      }

      case "QUEST_COMPLETE": {
        const questName = String(action.details.name || "Unknown");
        const quest = quests.get(questName);
        if (quest) {
          quest.status = "completed";
          quest.completedAt = action.timestamp;
          questsCompleted++;
          totalXp += action.xpChange;
          // +10 HP for completing a quest
          currentHp = Math.min(currentHp + 10, 100);
          totalHpGained += 10;

          // Update zone stats
          const zone = zones.get(quest.zone);
          if (zone) {
            zone.questsCompleted++;
          }
        }
        // Track completion
        if (!completedQuestsByDate.has(date)) {
          completedQuestsByDate.set(date, new Set());
        }
        completedQuestsByDate.get(date)!.add(questName);
        break;
      }

      case "QUEST_ABANDON": {
        const questName = String(action.details.name || "Unknown");
        const quest = quests.get(questName);
        if (quest) {
          quest.status = "abandoned";
          // -1x XP value as HP
          const hpLoss = quest.xpValue;
          currentHp -= hpLoss;
          totalHpLost += hpLoss;
        }
        break;
      }

      case "DAILY": {
        const completed = action.details.completed as number;
        const total = action.details.total as number;
        const perfect = action.details.perfect as boolean;

        totalXp += action.xpChange;
        dailyDates.add(date);

        dailyLogs.push({
          date,
          completed,
          total,
          xpEarned: action.xpChange,
          perfect: perfect || completed === total,
        });

        // +10 HP if all dailies completed
        if (completed === total) {
          currentHp = Math.min(currentHp + 10, 100);
          totalHpGained += 10;
        }
        break;
      }
    }
  }

  // Second pass: detect missed quests (activated but not completed same day)
  for (const [date, activatedQuests] of activeQuestsByDate) {
    const completedThisDay = completedQuestsByDate.get(date) || new Set();

    for (const questName of activatedQuests) {
      if (!completedThisDay.has(questName)) {
        const quest = quests.get(questName);
        if (quest && quest.status !== "completed" && quest.status !== "abandoned") {
          // Mark as missed and apply penalty
          quest.status = "missed";
          const hpLoss = Math.round(quest.xpValue * 0.5);
          currentHp -= hpLoss;
          totalHpLost += hpLoss;
          missedQuests.push({ name: questName, date, hpLost: hpLoss });
        }
      }
    }
  }

  // Third pass: detect missed daily days
  if (character && character.createdAt && dailyConfig.length > 0) {
    const startDate = new Date(character.createdAt);
    const today = new Date();
    const currentDate = new Date(startDate);

    while (currentDate <= today) {
      const dateStr = currentDate.toISOString().split("T")[0];
      if (!dailyDates.has(dateStr) && dateStr !== today.toISOString().split("T")[0]) {
        // No daily commit for this day - penalty for all dailies
        const totalDailyXp = dailyConfig.reduce((sum, d) => sum + d.xpValue, 0);
        const hpLoss = Math.round(totalDailyXp * 0.5);
        currentHp -= hpLoss;
        totalHpLost += hpLoss;
        missedDailies.push({ date: dateStr, hpLost: hpLoss });
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  // Calculate current level from total XP
  const { level, xpToNextLevel } = calculateLevel(totalXp);
  const maxHp = calculateMaxHp();

  // Ensure HP bounds
  currentHp = Math.min(currentHp, maxHp);
  currentHp = Math.max(currentHp, 0);

  // Calculate streaks
  const sortedDates = Array.from(dailyDates).sort();
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  for (let i = 0; i < sortedDates.length; i++) {
    if (i === 0) {
      tempStreak = 1;
    } else {
      const prevDateStr = sortedDates[i - 1];
      const currDateStr = sortedDates[i];
      if (prevDateStr && currDateStr) {
        const prevDate = new Date(prevDateStr);
        const currDate = new Date(currDateStr);
        const diffDays = (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);

        if (diffDays === 1) {
          tempStreak++;
        } else {
          tempStreak = 1;
        }
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);
  }

  // Check if current streak is ongoing
  const lastDateStr = sortedDates[sortedDates.length - 1];
  if (lastDateStr) {
    const lastDate = new Date(lastDateStr);
    const today = new Date();
    const diffDays = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 1) {
      currentStreak = tempStreak;
    }
  }

  // Update character stats
  if (character) {
    character.level = level;
    character.xp = totalXp;
    character.xpToNextLevel = xpToNextLevel;
    character.hp = currentHp;
    character.maxHp = maxHp;

    // Check for death
    if (currentHp <= 0) {
      character.isAlive = false;
      character.deathCause = "HP reached 0";
      verificationErrors.push("Character HP is 0 or below - character is dead");
    }
  }

  // Update zone stats
  for (const quest of quests.values()) {
    const zone = zones.get(quest.zone);
    if (zone) {
      if (quest.status === "active") zone.questsActive++;
      if (quest.status === "backlog") zone.questsBacklog++;
    }
  }

  const finalCharacter: Character = character || {
    name: "No Character",
    level: 0,
    xp: 0,
    xpToNextLevel: 0,
    hp: 0,
    maxHp: 0,
    createdAt: "",
    isAlive: false,
  };

  return {
    character: finalCharacter,
    zones: Array.from(zones.values()),
    quests: Array.from(quests.values()),
    dailyConfig,
    dailyLogs,
    recentActions: actions.slice(-20).reverse(),
    totalXpEarned: totalXp,
    totalHpLost,
    totalHpGained,
    questsCompleted,
    currentStreak,
    longestStreak,
    graveyard,
    lastUpdated: new Date().toISOString(),
    verified: verificationErrors.length === 0,
    verificationErrors,
    missedQuests,
    missedDailies,
  };
}
