import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import {
  COMMITMENT_DAYS,
  EARLY_EXIT_PENALTY,
  REWARDS,
  daysToMs,
  clampHp,
} from "./game";

// Helper to get user from session token
async function getUserFromSession(ctx: any, sessionToken: string) {
  try {
    const jsonString = atob(sessionToken);
    const decoded = JSON.parse(jsonString);
    return await ctx.db
      .query("users")
      .withIndex("by_github_id", (q: any) => q.eq("githubId", String(decoded.githubId)))
      .first();
  } catch {
    return null;
  }
}

// Get active commitments for current user
export const getActive = query({
  args: {
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.sessionToken) return [];

    const user = await getUserFromSession(ctx, args.sessionToken);
    if (!user) return [];

    // Get active (non-deactivated) commitments
    return await ctx.db
      .query("commitments")
      .withIndex("by_user_active", (q) =>
        q.eq("userId", user._id).eq("deactivatedAt", undefined)
      )
      .collect();
  },
});

// Get all commitments for current user (including history)
export const getAll = query({
  args: {
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.sessionToken) return [];

    const user = await getUserFromSession(ctx, args.sessionToken);
    if (!user) return [];

    return await ctx.db
      .query("commitments")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
  },
});

// Activate a repo commitment
export const activate = mutation({
  args: {
    sessionToken: v.string(),
    owner: v.string(),
    repo: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getUserFromSession(ctx, args.sessionToken);
    if (!user) throw new Error("Not authenticated");

    // Get user's living character
    const character = await ctx.db
      .query("characters")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("isAlive"), true))
      .first();
    if (!character) throw new Error("No living character. Create one first.");

    // Check if already has active commitment for this repo
    const existing = await ctx.db
      .query("commitments")
      .withIndex("by_user_active", (q) =>
        q.eq("userId", user._id).eq("deactivatedAt", undefined)
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("owner"), args.owner),
          q.eq(q.field("repo"), args.repo)
        )
      )
      .first();

    if (existing) {
      throw new Error("Already have an active commitment for this repo");
    }

    const now = Date.now();
    return await ctx.db.insert("commitments", {
      userId: user._id,
      characterId: character._id,
      owner: args.owner,
      repo: args.repo,
      activatedAt: now,
      commitmentEndsAt: now + daysToMs(COMMITMENT_DAYS),
      renewalCount: 0,
      totalCommits: 0,
      totalIssuesClosed: 0,
      totalPrsMerged: 0,
      xpEarned: 0,
    });
  },
});

// Deactivate a commitment (early exit or completion)
export const deactivate = mutation({
  args: {
    sessionToken: v.string(),
    commitmentId: v.id("commitments"),
  },
  handler: async (ctx, args) => {
    const user = await getUserFromSession(ctx, args.sessionToken);
    if (!user) throw new Error("Not authenticated");

    const commitment = await ctx.db.get(args.commitmentId);
    if (!commitment) throw new Error("Commitment not found");
    if (commitment.deactivatedAt) throw new Error("Already deactivated");

    if (commitment.userId !== user._id) {
      throw new Error("Not authorized");
    }

    const now = Date.now();
    const isEarlyExit = now < commitment.commitmentEndsAt;

    // Mark commitment as deactivated
    await ctx.db.patch(args.commitmentId, {
      deactivatedAt: now,
      wasEarlyExit: isEarlyExit,
    });

    // Apply early exit penalty to character
    if (isEarlyExit) {
      const character = await ctx.db.get(commitment.characterId);
      if (character && character.isAlive) {
        const newHp = clampHp(character.hp - EARLY_EXIT_PENALTY);
        await ctx.db.patch(commitment.characterId, { hp: newHp });

        // Check for death
        if (newHp <= 0) {
          const { internal } = await import("./_generated/api");
          await ctx.scheduler.runAfter(0, internal.scannerMutations.killCharacter, {
            characterId: commitment.characterId,
            activeRepoCount: 0,
          });
        }
      }
    } else {
      // Completed commitment bonus
      const character = await ctx.db.get(commitment.characterId);
      if (character && character.isAlive) {
        await ctx.db.patch(commitment.characterId, {
          hp: clampHp(character.hp + REWARDS.commitmentComplete.hp),
          xp: character.xp + REWARDS.commitmentComplete.xp,
        });
      }
    }

    return { isEarlyExit };
  },
});

// Renew a commitment for another 30 days
export const renew = mutation({
  args: {
    sessionToken: v.string(),
    commitmentId: v.id("commitments"),
  },
  handler: async (ctx, args) => {
    const user = await getUserFromSession(ctx, args.sessionToken);
    if (!user) throw new Error("Not authenticated");

    const commitment = await ctx.db.get(args.commitmentId);
    if (!commitment) throw new Error("Commitment not found");
    if (commitment.deactivatedAt) throw new Error("Commitment already ended");

    if (commitment.userId !== user._id) {
      throw new Error("Not authorized");
    }

    const now = Date.now();

    // Can only renew after commitment period ends
    if (now < commitment.commitmentEndsAt) {
      throw new Error("Commitment period not yet complete");
    }

    // Renew for another 30 days
    await ctx.db.patch(args.commitmentId, {
      commitmentEndsAt: now + daysToMs(COMMITMENT_DAYS),
      renewalCount: commitment.renewalCount + 1,
    });

    // Grant renewal XP bonus
    const character = await ctx.db.get(commitment.characterId);
    if (character && character.isAlive) {
      await ctx.db.patch(commitment.characterId, {
        xp: character.xp + REWARDS.commitmentRenew.xp,
      });
    }

    return commitment._id;
  },
});
