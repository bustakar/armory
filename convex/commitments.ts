import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import {
  EARLY_EXIT_PENALTY,
  REWARDS,
  daysToMs,
  clampHp,
  getCommitmentReward,
} from "./game";

// Commitment validator
const commitmentValidator = v.object({
  _id: v.id("commitments"),
  _creationTime: v.number(),
  userId: v.id("users"),
  characterId: v.id("characters"),
  owner: v.string(),
  repo: v.string(),
  isPrivate: v.optional(v.boolean()),
  activatedAt: v.number(),
  commitmentEndsAt: v.number(),
  commitmentDays: v.optional(v.number()),
  deactivatedAt: v.optional(v.number()),
  wasEarlyExit: v.optional(v.boolean()),
  renewalCount: v.number(),
  totalCommits: v.number(),
  totalIssuesClosed: v.number(),
  totalPrsMerged: v.number(),
  xpEarned: v.number(),
  lastScannedAt: v.optional(v.number()),
});

// Get active commitments for current user
export const getActive = query({
  args: {},
  returns: v.array(commitmentValidator),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

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
  args: {},
  returns: v.array(commitmentValidator),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

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
    owner: v.string(),
    repo: v.string(),
    isPrivate: v.optional(v.boolean()),
    commitmentDays: v.optional(v.number()), // 7, 14, or 28 (defaults to 7)
  },
  returns: v.id("commitments"),
  handler: async (ctx, args) => {
    const days = args.commitmentDays ?? 7;
    if (![7, 14, 28].includes(days)) {
      throw new Error("Invalid commitment length. Must be 7, 14, or 28 days.");
    }
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

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
      isPrivate: args.isPrivate,
      activatedAt: now,
      commitmentEndsAt: now + daysToMs(days),
      commitmentDays: days,
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
    commitmentId: v.id("commitments"),
  },
  returns: v.object({ isEarlyExit: v.boolean() }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

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
      // Completed commitment bonus (scaled by commitment length)
      const character = await ctx.db.get(commitment.characterId);
      if (character && character.isAlive) {
        const reward = getCommitmentReward(commitment.commitmentDays ?? 28);
        await ctx.db.patch(commitment.characterId, {
          hp: clampHp(character.hp + reward.hp),
          xp: character.xp + reward.xp,
        });
      }
    }

    return { isEarlyExit };
  },
});

// Renew a commitment for the same length
export const renew = mutation({
  args: {
    commitmentId: v.id("commitments"),
  },
  returns: v.id("commitments"),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

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

    // Renew for the same length as the original commitment
    const days = commitment.commitmentDays ?? 28;
    await ctx.db.patch(args.commitmentId, {
      commitmentEndsAt: now + daysToMs(days),
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
