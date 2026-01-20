import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users with GitHub connection
  users: defineTable({
    githubId: v.string(),
    githubUsername: v.string(),
    githubAccessToken: v.string(),
    avatarUrl: v.optional(v.string()),
    characterName: v.optional(v.string()),
    createdAt: v.number(),
    lastLoginAt: v.number(),
  }).index("by_github_id", ["githubId"]),

  // Active repos (Zones) - repos the user is tracking
  activeRepos: defineTable({
    userId: v.id("users"),
    owner: v.string(),
    repo: v.string(),
    activatedAt: v.number(),
    // Cache
    lastScannedAt: v.optional(v.number()),
    lastCommitSha: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_user_repo", ["userId", "owner", "repo"]),

  // Cached activity data
  activityCache: defineTable({
    userId: v.id("users"),
    date: v.string(), // YYYY-MM-DD
    // Aggregated stats for the day
    commits: v.number(),
    issuesClosed: v.number(),
    prsMerged: v.number(),
    milestonesCompleted: v.number(),
    // Calculated
    xpEarned: v.number(),
    hpChange: v.number(),
    // Details (JSON stringified for flexibility)
    details: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_user_date", ["userId", "date"]),

  // Character state (calculated from activity)
  characters: defineTable({
    userId: v.id("users"),
    name: v.string(),
    level: v.number(),
    xp: v.number(),
    hp: v.number(),
    maxHp: v.number(),
    // Stats
    totalCommits: v.number(),
    totalIssuesClosed: v.number(),
    totalPrsMerged: v.number(),
    totalMilestonesCompleted: v.number(),
    currentStreak: v.number(),
    longestStreak: v.number(),
    // Timestamps
    createdAt: v.number(),
    lastActivityAt: v.optional(v.number()),
    // Death
    isAlive: v.boolean(),
    deathDate: v.optional(v.number()),
    deathCause: v.optional(v.string()),
  }).index("by_user", ["userId"]),

  // Graveyard - dead characters
  graveyard: defineTable({
    userId: v.id("users"),
    name: v.string(),
    level: v.number(),
    xp: v.number(),
    deathDate: v.number(),
    deathCause: v.string(),
    totalCommits: v.number(),
    daysPlayed: v.number(),
  }).index("by_user", ["userId"]),
});
