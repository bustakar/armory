import {
  GameAction,
  ActionType,
  GitCommit,
  GameState,
  Character,
  Path,
  Zone,
  Subregion,
  calculateLevel,
  calculateMaxHp,
} from "./types";

const ACTION_PATTERNS: { pattern: RegExp; type: ActionType }[] = [
  { pattern: /^CHARACTER CREATE "([^"]+)"/, type: "CHARACTER_CREATE" },
  { pattern: /^CHARACTER DEATH/, type: "CHARACTER_DEATH" },
  { pattern: /^CHARACTER LEVEL/, type: "CHARACTER_LEVEL" },
  { pattern: /^PATH CREATE "([^"]+)"/, type: "PATH_CREATE" },
  { pattern: /^PATH LEVEL "([^"]+)"/, type: "PATH_LEVEL" },
  { pattern: /^ZONE ENTER "([^"]+)"/, type: "ZONE_ENTER" },
  { pattern: /^ZONE MILESTONE/, type: "ZONE_MILESTONE" },
  { pattern: /^SUBREGION ACTIVATE "([^"]+)"/, type: "SUBREGION_ACTIVATE" },
  { pattern: /^SUBREGION UPDATE "([^"]+)"/, type: "SUBREGION_UPDATE" },
  { pattern: /^SUBREGION CLEAR "([^"]+)"/, type: "SUBREGION_CLEAR" },
  { pattern: /^QUEST CREATE "([^"]+)"/, type: "QUEST_CREATE" },
  { pattern: /^QUEST COMPLETE "([^"]+)"/, type: "QUEST_COMPLETE" },
  { pattern: /^QUEST ABANDON "([^"]+)"/, type: "QUEST_ABANDON" },
  { pattern: /^DAILY \d+\/\d+/, type: "DAILY" },
  { pattern: /^WORLD QUEST "([^"]+)"/, type: "WORLD_QUEST" },
  { pattern: /^ACHIEVEMENT UNLOCK "([^"]+)"/, type: "ACHIEVEMENT_UNLOCK" },
  { pattern: /^STREAK \d+/, type: "STREAK" },
  { pattern: /^PERFECT WEEK/, type: "PERFECT_WEEK" },
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
        if (quoted.length > 1) {
          details.target = quoted[1];
        }
      }

      // Extract XP
      const xpMatch = trimmed.match(/\+(\d+)\s*XP/i);
      if (xpMatch) {
        details.xp = parseInt(xpMatch[1], 10);
      }

      // Extract HP loss
      const hpMatch = trimmed.match(/-(\d+)\s*HP/i);
      if (hpMatch) {
        details.hpLoss = parseInt(hpMatch[1], 10);
      }

      // Extract daily completion
      const dailyMatch = trimmed.match(/DAILY (\d+)\/(\d+)/);
      if (dailyMatch) {
        details.completed = parseInt(dailyMatch[1], 10);
        details.total = parseInt(dailyMatch[2], 10);
      }

      // Extract "in" clause for zone/subregion
      const inMatch = trimmed.match(/in (\S+)/);
      if (inMatch) {
        details.location = inMatch[1];
      }

      // Extract level
      const levelMatch = trimmed.match(/Level (\d+)/);
      if (levelMatch) {
        details.level = parseInt(levelMatch[1], 10);
      }

      // Check for PERFECT DAY bonus
      if (trimmed.includes("PERFECT DAY")) {
        details.perfectDay = true;
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

  if (typeof details.hpLoss === "number") {
    hpChange = -details.hpLoss;
  }

  // Perfect day bonus
  if (details.perfectDay) {
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

export function buildGameState(commits: GitCommit[]): GameState {
  const actions: GameAction[] = commits.map(parseCommit).filter((a) => a.type !== "UNKNOWN");

  // Sort by timestamp (oldest first)
  actions.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  let character: Character | null = null;
  const paths: Map<string, Path> = new Map();
  const zones: Map<string, Zone> = new Map();
  const activeSubregions: Map<string, Subregion> = new Map();
  const graveyard: Character[] = [];

  let totalXp = 0;
  let totalHpLost = 0;
  let currentHp = 100;
  let questsCompleted = 0;
  let subregionsCleared = 0;
  const verificationErrors: string[] = [];

  // Track daily commits for streak calculation
  const dailyDates: Set<string> = new Set();

  for (const action of actions) {
    switch (action.type) {
      case "CHARACTER_CREATE": {
        if (character && character.isAlive) {
          // Archive current character
          graveyard.push({ ...character, isAlive: false, deathCause: "Replaced" });
        }
        character = {
          name: String(action.details.name || "Unknown"),
          title: "Newcomer",
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
        paths.clear();
        zones.clear();
        activeSubregions.clear();
        break;
      }

      case "CHARACTER_DEATH": {
        if (character) {
          character.isAlive = false;
          character.deathDate = action.timestamp;
          character.deathCause = String(action.details.cause || "Unknown");
          graveyard.push({ ...character });
          character = null;
        }
        break;
      }

      case "PATH_CREATE": {
        const pathName = String(action.details.name || "Unknown");
        paths.set(pathName, { name: pathName, level: 1, xp: 0 });
        break;
      }

      case "ZONE_ENTER": {
        const zoneName = String(action.details.name || "Unknown");
        const pathName = String(action.details.location || "Unknown");
        zones.set(zoneName, {
          name: zoneName,
          path: pathName,
          enteredAt: action.timestamp,
          subregions: [],
        });
        break;
      }

      case "SUBREGION_ACTIVATE": {
        const subregionPath = String(action.details.name || "Unknown");
        const [zoneName, subregionName] = subregionPath.includes("/")
          ? subregionPath.split("/")
          : ["Unknown", subregionPath];

        activeSubregions.set(subregionPath, {
          name: subregionName,
          zone: zoneName,
          status: "active",
          questXpEarned: 0,
          lastActivity: action.timestamp,
          daysSinceActivity: 0,
        });
        break;
      }

      case "SUBREGION_UPDATE": {
        const subregionPath = String(action.details.name || "Unknown");
        const subregion = activeSubregions.get(subregionPath);
        if (subregion) {
          subregion.lastActivity = action.timestamp;
        }
        break;
      }

      case "SUBREGION_CLEAR": {
        const subregionPath = String(action.details.name || "Unknown");
        const subregion = activeSubregions.get(subregionPath);
        if (subregion) {
          subregion.status = "cleared";
          subregionsCleared++;
        }
        totalXp += action.xpChange;
        break;
      }

      case "QUEST_COMPLETE": {
        questsCompleted++;
        totalXp += action.xpChange;

        // Update subregion activity if location specified
        const location = String(action.details.location || "");
        if (location && activeSubregions.has(location)) {
          const subregion = activeSubregions.get(location)!;
          subregion.lastActivity = action.timestamp;
          subregion.questXpEarned += action.xpChange;
        }
        break;
      }

      case "QUEST_ABANDON": {
        currentHp += action.hpChange; // hpChange is negative
        totalHpLost += Math.abs(action.hpChange);
        break;
      }

      case "DAILY": {
        totalXp += action.xpChange;
        const date = action.timestamp.split("T")[0];
        dailyDates.add(date);
        break;
      }

      case "WORLD_QUEST":
      case "ACHIEVEMENT_UNLOCK":
      case "STREAK":
      case "PERFECT_WEEK":
      case "ZONE_MILESTONE":
      case "PATH_LEVEL": {
        totalXp += action.xpChange;
        break;
      }
    }
  }

  // Calculate current level from total XP
  const { level, xpToNextLevel } = calculateLevel(totalXp);
  const maxHp = calculateMaxHp(level);

  // Ensure HP doesn't exceed max
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
      const prevDate = new Date(sortedDates[i - 1]);
      const currDate = new Date(sortedDates[i]);
      const diffDays = (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);

      if (diffDays === 1) {
        tempStreak++;
      } else {
        tempStreak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);
  }

  // Check if current streak is ongoing (last daily was yesterday or today)
  if (sortedDates.length > 0) {
    const lastDate = new Date(sortedDates[sortedDates.length - 1]);
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
      verificationErrors.push("Character HP is 0 or below - character should be dead");
    }
  }

  const finalCharacter: Character = character || {
    name: "No Character",
    title: "None",
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
    paths: Array.from(paths.values()),
    zones: Array.from(zones.values()),
    activeSubregions: Array.from(activeSubregions.values()).filter((s) => s.status === "active"),
    recentActions: actions.slice(-20).reverse(),
    totalXpEarned: totalXp,
    totalHpLost,
    questsCompleted,
    subregionsCleared,
    currentStreak,
    longestStreak,
    graveyard,
    lastUpdated: new Date().toISOString(),
    verified: verificationErrors.length === 0,
    verificationErrors,
  };
}
