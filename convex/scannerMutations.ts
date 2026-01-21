import { internalMutation, mutation } from "./_generated/server";
import { v } from "convex/values";
import { clampHp, calculateLevel, Difficulty } from "./game";
import { Id } from "./_generated/dataModel";

// Get all users with active commitments
// Optimized: Query active commitments first using index, then fetch related data
export const getUsersWithActiveCommitments = internalMutation({
  handler: async (ctx) => {
    // Use the new index to get only active commitments (deactivatedAt === undefined)
    const activeCommitments = await ctx.db
      .query("commitments")
      .withIndex("by_active", (q) => q.eq("deactivatedAt", undefined))
      .collect();

    if (activeCommitments.length === 0) return [];

    // Group commitments by userId
    const commitmentsByUser = new Map<Id<"users">, typeof activeCommitments>();
    for (const commitment of activeCommitments) {
      const userId = commitment.userId;
      if (!commitmentsByUser.has(userId)) {
        commitmentsByUser.set(userId, []);
      }
      commitmentsByUser.get(userId)!.push(commitment);
    }

    const results = [];

    // Process only users with active commitments
    for (const [userId, userCommitments] of commitmentsByUser) {
      const user = await ctx.db.get(userId);
      if (!user || !user.githubAccessToken) continue;

      const character = await ctx.db
        .query("characters")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .filter((q) => q.eq(q.field("isAlive"), true))
        .first();

      if (!character) continue;

      results.push({
        userId: user._id,
        characterId: character._id,
        githubUsername: user.githubUsername,
        // Token is encrypted - will be decrypted in the action
        githubAccessToken: user.githubAccessToken,
        githubPersonalToken: user.githubPersonalToken,
        difficulty: (character.difficulty || "easy") as Difficulty,
        commitments: userCommitments.map((c) => ({
          _id: c._id,
          owner: c.owner,
          repo: c.repo,
          lastScannedAt: c.lastScannedAt,
        })),
      });
    }

    return results;
  },
});

// Get daily activity for a commitment
export const getDailyActivity = internalMutation({
  args: {
    commitmentId: v.id("commitments"),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("dailyActivity")
      .withIndex("by_commitment_date", (q) =>
        q.eq("commitmentId", args.commitmentId).eq("date", args.date)
      )
      .first();
  },
});

// Update commitment stats
export const updateCommitmentStats = internalMutation({
  args: {
    commitmentId: v.id("commitments"),
    commits: v.number(),
    issuesClosed: v.number(),
    prsMerged: v.number(),
    xpEarned: v.number(),
    lastScannedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const commitment = await ctx.db.get(args.commitmentId);
    if (!commitment) return;

    await ctx.db.patch(args.commitmentId, {
      totalCommits: commitment.totalCommits + args.commits,
      totalIssuesClosed: commitment.totalIssuesClosed + args.issuesClosed,
      totalPrsMerged: commitment.totalPrsMerged + args.prsMerged,
      xpEarned: commitment.xpEarned + args.xpEarned,
      lastScannedAt: args.lastScannedAt,
    });
  },
});

// Update daily activity
export const updateDailyActivity = internalMutation({
  args: {
    userId: v.id("users"),
    commitmentId: v.id("commitments"),
    date: v.string(),
    commits: v.number(),
    issuesClosed: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("dailyActivity")
      .withIndex("by_commitment_date", (q) =>
        q.eq("commitmentId", args.commitmentId).eq("date", args.date)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        commits: existing.commits + args.commits,
        issuesClosed: existing.issuesClosed + args.issuesClosed,
      });
    } else {
      await ctx.db.insert("dailyActivity", {
        userId: args.userId,
        commitmentId: args.commitmentId,
        date: args.date,
        commits: args.commits,
        issuesClosed: args.issuesClosed,
      });
    }
  },
});

// Update character HP
export const updateCharacterHp = internalMutation({
  args: {
    characterId: v.id("characters"),
    hpChange: v.float64(),
    xpGain: v.number(),
  },
  handler: async (ctx, args) => {
    const character = await ctx.db.get(args.characterId);
    if (!character || !character.isAlive) return 0;

    const newHp = clampHp(character.hp + args.hpChange);
    const newXp = character.xp + args.xpGain;

    await ctx.db.patch(args.characterId, {
      hp: newHp,
      xp: newXp,
      level: calculateLevel(newXp),
      lastHpUpdate: Date.now(),
    });

    return newHp;
  },
});

// Log activity
export const logActivity = internalMutation({
  args: {
    userId: v.id("users"),
    characterId: v.id("characters"),
    activeRepoCount: v.number(),
    commits: v.number(),
    issuesClosed: v.number(),
    prsMerged: v.number(),
    hpDrain: v.float64(),
    hpGain: v.float64(),
    hpNet: v.float64(),
    xpGained: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("activityLogs", {
      userId: args.userId,
      characterId: args.characterId,
      timestamp: Date.now(),
      activeRepoCount: args.activeRepoCount,
      commits: args.commits,
      issuesClosed: args.issuesClosed,
      prsMerged: args.prsMerged,
      hpDrain: args.hpDrain,
      hpGain: args.hpGain,
      hpNet: args.hpNet,
      xpGained: args.xpGained,
    });
  },
});

// Kill character (internal - called by scanner when HP reaches 0)
export const killCharacter = internalMutation({
  args: {
    characterId: v.id("characters"),
    activeRepoCount: v.number(),
  },
  handler: async (ctx, args) => {
    const character = await ctx.db.get(args.characterId);
    if (!character || !character.isAlive) return;

    const now = Date.now();
    const daysLived = Math.floor((now - character.createdAt) / (24 * 60 * 60 * 1000));

    // Get all commitments for total stats
    const commitments = await ctx.db
      .query("commitments")
      .withIndex("by_character", (q) => q.eq("characterId", args.characterId))
      .collect();

    const totalCommits = commitments.reduce((sum, c) => sum + c.totalCommits, 0);
    const totalIssuesClosed = commitments.reduce((sum, c) => sum + c.totalIssuesClosed, 0);
    const totalPrsMerged = commitments.reduce((sum, c) => sum + c.totalPrsMerged, 0);

    // Add to graveyard
    const causes = [
      `Bled out from ${args.activeRepoCount} neglected repos`,
      `Overwhelmed by ${args.activeRepoCount} competing commitments`,
      `Crushed under the weight of ${args.activeRepoCount} abandoned projects`,
    ];

    await ctx.db.insert("graveyard", {
      userId: character.userId,
      name: character.name,
      level: character.level,
      xp: character.xp,
      diedAt: now,
      deathCause: causes[Math.floor(Math.random() * causes.length)],
      daysLived,
      totalCommits,
      totalIssuesClosed,
      totalPrsMerged,
      difficulty: character.difficulty,
    });

    // Mark character as dead
    await ctx.db.patch(args.characterId, {
      isAlive: false,
      hp: 0,
    });

    // Deactivate all commitments
    for (const commitment of commitments) {
      if (!commitment.deactivatedAt) {
        await ctx.db.patch(commitment._id, {
          deactivatedAt: now,
          wasEarlyExit: true,
        });
      }
    }
  },
});

// Voluntary death - user manually kills their character
export const voluntaryDeath = mutation({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    const character = await ctx.db
      .query("characters")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("isAlive"), true))
      .first();

    if (!character) throw new Error("No living character");

    const now = Date.now();
    const daysLived = Math.floor((now - character.createdAt) / (24 * 60 * 60 * 1000));

    // Get all commitments for total stats
    const commitments = await ctx.db
      .query("commitments")
      .withIndex("by_character", (q) => q.eq("characterId", character._id))
      .collect();

    const totalCommits = commitments.reduce((sum, c) => sum + c.totalCommits, 0);
    const totalIssuesClosed = commitments.reduce((sum, c) => sum + c.totalIssuesClosed, 0);
    const totalPrsMerged = commitments.reduce((sum, c) => sum + c.totalPrsMerged, 0);

    // Add to graveyard with voluntary death cause
    await ctx.db.insert("graveyard", {
      userId: character.userId,
      name: character.name,
      level: character.level,
      xp: character.xp,
      diedAt: now,
      deathCause: "Chose to end their journey",
      daysLived,
      totalCommits,
      totalIssuesClosed,
      totalPrsMerged,
      difficulty: character.difficulty,
    });

    // Mark character as dead
    await ctx.db.patch(character._id, {
      isAlive: false,
      hp: 0,
    });

    // Deactivate all commitments
    for (const commitment of commitments) {
      if (!commitment.deactivatedAt) {
        await ctx.db.patch(commitment._id, {
          deactivatedAt: now,
          wasEarlyExit: true,
        });
      }
    }
  },
});
