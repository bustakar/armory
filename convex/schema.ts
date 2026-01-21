import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users - stores GitHub tokens
  users: defineTable({
    clerkId: v.string(),
    githubUsername: v.string(),
    // Clerk OAuth token (public repos only)
    githubAccessToken: v.optional(v.string()),
    // User-provided PAT for private repos (encrypted)
    githubPersonalToken: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_clerk_id", ["clerkId"])
    .index("by_github_username", ["githubUsername"]),

  // Character state - one active character per user
  characters: defineTable({
    userId: v.id("users"),
    name: v.string(),
    hp: v.float64(), // Current HP (0-100)
    maxHp: v.number(), // Always 100
    xp: v.number(), // Total XP earned
    level: v.number(), // floor(xp/100) + 1
    streak: v.number(), // Consecutive days with activity
    lastActivityDate: v.optional(v.string()), // YYYY-MM-DD for streak calculation
    lastHpUpdate: v.number(), // Timestamp of last HP calculation
    isAlive: v.boolean(),
    createdAt: v.number(),
    difficulty: v.optional(v.union(v.literal("easy"), v.literal("medium"), v.literal("hard"))), // Defaults to "easy" for existing characters
  }).index("by_user", ["userId"]),

  // 30-day commitment cycles
  commitments: defineTable({
    userId: v.id("users"),
    characterId: v.id("characters"),
    owner: v.string(), // GitHub owner
    repo: v.string(), // GitHub repo
    isPrivate: v.optional(v.boolean()), // Whether repo is private (hidden in public profile)
    activatedAt: v.number(), // Timestamp
    commitmentEndsAt: v.number(), // activatedAt + 30 days
    deactivatedAt: v.optional(v.number()), // Set when commitment ends
    wasEarlyExit: v.optional(v.boolean()),
    renewalCount: v.number(), // Number of times renewed
    // Cached stats (for history)
    totalCommits: v.number(),
    totalIssuesClosed: v.number(),
    totalPrsMerged: v.number(),
    xpEarned: v.number(),
    lastScannedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_user_active", ["userId", "deactivatedAt"])
    .index("by_character", ["characterId"])
    .index("by_active", ["deactivatedAt"]), // For efficient cron queries

  // Activity logs - hourly snapshots
  activityLogs: defineTable({
    userId: v.id("users"),
    characterId: v.id("characters"),
    timestamp: v.number(),
    activeRepoCount: v.number(),
    // Activity in this hour
    commits: v.number(),
    issuesClosed: v.number(),
    prsMerged: v.number(),
    // HP changes
    hpDrain: v.float64(), // Negative value
    hpGain: v.float64(), // Positive value
    hpNet: v.float64(), // Net change
    xpGained: v.number(),
  }).index("by_user", ["userId"]),

  // Daily activity caps tracking
  dailyActivity: defineTable({
    userId: v.id("users"),
    commitmentId: v.id("commitments"),
    date: v.string(), // YYYY-MM-DD
    commits: v.number(), // Max 5 per day
    issuesClosed: v.number(), // Max 3 per day
  })
    .index("by_commitment_date", ["commitmentId", "date"])
    .index("by_user_date", ["userId", "date"]),

  // Graveyard - dead characters
  graveyard: defineTable({
    userId: v.id("users"),
    name: v.string(),
    level: v.number(),
    xp: v.number(),
    diedAt: v.number(),
    deathCause: v.string(),
    daysLived: v.number(),
    // Stats at death
    totalCommits: v.number(),
    totalIssuesClosed: v.number(),
    totalPrsMerged: v.number(),
    difficulty: v.optional(v.union(v.literal("easy"), v.literal("medium"), v.literal("hard"))), // Difficulty at time of death
  }).index("by_user", ["userId"]),
});
