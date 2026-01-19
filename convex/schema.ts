import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Cache grimoire state to avoid re-scanning every time
  grimoires: defineTable({
    owner: v.string(),
    repo: v.string(),
    // Last known commit hash - if this doesn't exist in history, it was rewritten
    lastCommitHash: v.string(),
    lastScannedAt: v.number(), // timestamp
    totalCommits: v.number(),
    // Track history rewrites (cheating detection)
    historyRewriteCount: v.number(),
    lastRewriteDetectedAt: v.optional(v.number()),
    // Cached game state
    cachedState: v.optional(v.string()), // JSON stringified GameState
  }).index("by_owner_repo", ["owner", "repo"]),

  // Track daily activity for HP calculations
  dailyLogs: defineTable({
    owner: v.string(),
    repo: v.string(),
    date: v.string(), // YYYY-MM-DD
    hadDailyCommit: v.boolean(),
    dailiesCompleted: v.optional(v.number()),
    dailiesTotal: v.optional(v.number()),
    hpChange: v.number(), // positive or negative
    processedAt: v.number(),
  })
    .index("by_grimoire", ["owner", "repo"])
    .index("by_grimoire_date", ["owner", "repo", "date"]),

  // Track subregion activity for inactivity penalties
  subregionActivity: defineTable({
    owner: v.string(),
    repo: v.string(),
    subregionPath: v.string(), // "zone/subregion"
    lastActivityAt: v.number(),
    consecutiveInactiveDays: v.number(),
    isPaused: v.boolean(),
  })
    .index("by_grimoire", ["owner", "repo"])
    .index("by_grimoire_subregion", ["owner", "repo", "subregionPath"]),
});
