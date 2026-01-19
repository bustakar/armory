import { v } from "convex/values";
import { query, mutation, action } from "./_generated/server";

// Get cached grimoire data
export const get = query({
  args: { owner: v.string(), repo: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("grimoires")
      .withIndex("by_owner_repo", (q) =>
        q.eq("owner", args.owner).eq("repo", args.repo)
      )
      .first();
  },
});

// Update grimoire cache after scanning
export const upsert = mutation({
  args: {
    owner: v.string(),
    repo: v.string(),
    lastCommitHash: v.string(),
    totalCommits: v.number(),
    cachedState: v.optional(v.string()),
    historyRewritten: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("grimoires")
      .withIndex("by_owner_repo", (q) =>
        q.eq("owner", args.owner).eq("repo", args.repo)
      )
      .first();

    const now = Date.now();

    if (existing) {
      const updates: Record<string, unknown> = {
        lastCommitHash: args.lastCommitHash,
        lastScannedAt: now,
        totalCommits: args.totalCommits,
      };

      if (args.cachedState !== undefined) {
        updates.cachedState = args.cachedState;
      }

      if (args.historyRewritten) {
        updates.historyRewriteCount = existing.historyRewriteCount + 1;
        updates.lastRewriteDetectedAt = now;
      }

      await ctx.db.patch(existing._id, updates);
      return existing._id;
    } else {
      return await ctx.db.insert("grimoires", {
        owner: args.owner,
        repo: args.repo,
        lastCommitHash: args.lastCommitHash,
        lastScannedAt: now,
        totalCommits: args.totalCommits,
        historyRewriteCount: 0,
        cachedState: args.cachedState,
      });
    }
  },
});

// Record history rewrite detection
export const recordRewrite = mutation({
  args: { owner: v.string(), repo: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("grimoires")
      .withIndex("by_owner_repo", (q) =>
        q.eq("owner", args.owner).eq("repo", args.repo)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        historyRewriteCount: existing.historyRewriteCount + 1,
        lastRewriteDetectedAt: Date.now(),
      });
    }
  },
});

// Get all registered grimoires (for cron job)
export const listAll = query({
  handler: async (ctx) => {
    return await ctx.db.query("grimoires").collect();
  },
});
