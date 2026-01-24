import { internalQuery } from "./_generated/server";
import { v } from "convex/values";

// Get all activity logs since a given timestamp (for diversity bonus calculation)
export const getWindowActivities = internalQuery({
  args: {
    since: v.number(),
  },
  handler: async (ctx, args) => {
    // Get all activity logs in the time window
    // We need to check each user's activities, so we'll query all and filter
    const activities = await ctx.db
      .query("activityLogs")
      .filter((q) => q.gte(q.field("timestamp"), args.since))
      .collect();

    return activities;
  },
});

// Get active character for a user
export const getActiveCharacter = internalQuery({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("characters")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("isAlive"), true))
      .first();
  },
});
