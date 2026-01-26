import { query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Leaderboard entry validators
const topPlayerValidator = v.object({
  rank: v.number(),
  characterName: v.string(),
  level: v.number(),
  xp: v.number(),
  githubUsername: v.string(),
  avatarUrl: v.optional(v.string()),
});

const leaderboardEntryValidator = v.object({
  rank: v.number(),
  characterName: v.string(),
  level: v.number(),
  xp: v.number(),
  streak: v.number(),
  difficulty: v.string(),
  githubUsername: v.string(),
  avatarUrl: v.optional(v.string()),
});

// Get top 10 players for homepage preview
export const getTopPlayers = query({
  args: {},
  returns: v.array(topPlayerValidator),
  handler: async (ctx) => {
    // Get all living characters sorted by XP (descending)
    const characters = await ctx.db
      .query("characters")
      .filter((q) => q.eq(q.field("isAlive"), true))
      .collect();

    // Sort by XP descending
    characters.sort((a, b) => b.xp - a.xp);

    // Take top 10
    const top10 = characters.slice(0, 10);

    // Get user data for each character
    const results = await Promise.all(
      top10.map(async (char, index) => {
        const user = await ctx.db.get(char.userId);
        return {
          rank: index + 1,
          characterName: char.name,
          level: char.level,
          xp: char.xp,
          githubUsername: user?.githubUsername || "unknown",
          avatarUrl: user?.avatarUrl,
        };
      })
    );

    return results;
  },
});

// Get full leaderboard with time filtering
export const getLeaderboard = query({
  args: {
    filter: v.union(v.literal("all"), v.literal("month"), v.literal("week")),
    limit: v.optional(v.number()),
  },
  returns: v.array(leaderboardEntryValidator),
  handler: async (ctx, args) => {
    const limit = args.limit || 100;
    const now = Date.now();

    // For "all" time, just use character XP directly (efficient)
    if (args.filter === "all") {
      const characters = await ctx.db
        .query("characters")
        .filter((q) => q.eq(q.field("isAlive"), true))
        .collect();

      // Sort by XP descending
      characters.sort((a, b) => b.xp - a.xp);

      // Take top N
      const topN = characters.slice(0, limit);

      // Get user data for each character
      const results = await Promise.all(
        topN.map(async (char, index) => {
          const user = await ctx.db.get(char.userId);
          return {
            rank: index + 1,
            characterName: char.name,
            level: char.level,
            xp: char.xp,
            streak: char.streak,
            difficulty: char.difficulty || "easy",
            githubUsername: user?.githubUsername || "unknown",
            avatarUrl: user?.avatarUrl,
          };
        })
      );

      return results;
    }

    // For time-filtered leaderboards, aggregate from activityLogs
    const startTime = args.filter === "month"
      ? now - 30 * 24 * 60 * 60 * 1000 // 30 days
      : now - 7 * 24 * 60 * 60 * 1000; // 7 days

    // Get all activity logs in the time range
    const activityLogs = await ctx.db
      .query("activityLogs")
      .collect();

    // Filter by timestamp and aggregate XP by character
    const xpByCharacter = new Map<Id<"characters">, number>();
    for (const log of activityLogs) {
      if (log.timestamp >= startTime) {
        const key = log.characterId;
        const current = xpByCharacter.get(key) || 0;
        xpByCharacter.set(key, current + log.xpGained);
      }
    }

    // Get character IDs sorted by XP in the period
    const sortedCharacterIds = Array.from(xpByCharacter.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);

    // Get character and user data
    const results = await Promise.all(
      sortedCharacterIds.map(async ([characterId, periodXp], index) => {
        const char = await ctx.db.get(characterId);
        if (!char || !char.isAlive) return null;

        const user = await ctx.db.get(char.userId);
        return {
          rank: index + 1,
          characterName: char.name,
          level: char.level,
          xp: periodXp, // XP gained in this period
          streak: char.streak,
          difficulty: char.difficulty || "easy",
          githubUsername: user?.githubUsername || "unknown",
          avatarUrl: user?.avatarUrl,
        };
      })
    );

    // Filter out nulls (dead characters) and re-rank
    return results
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .map((r, index) => ({ ...r, rank: index + 1 }));
  },
});
