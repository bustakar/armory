import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get current user by session token
export const getBySession = query({
  args: {
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.sessionToken) {
      console.log("[getBySession] No session token provided");
      return null;
    }

    try {
      // Decode base64 token - use atob for browser compatibility
      const jsonString = atob(args.sessionToken);
      console.log("[getBySession] Decoded token:", jsonString);
      const decoded = JSON.parse(jsonString);

      // First check if user exists in DB
      let user = await ctx.db
        .query("users")
        .withIndex("by_github_id", (q) => q.eq("githubId", String(decoded.githubId)))
        .first();

      // If not, return the session data so frontend can create user
      if (!user) {
        return {
          _id: null,
          githubId: decoded.githubId,
          githubUsername: decoded.githubUsername,
          githubAccessToken: decoded.accessToken,
          avatarUrl: decoded.avatarUrl,
          needsCreation: true,
        };
      }

      return user;
    } catch (error) {
      console.error("[getBySession] Error:", error);
      return null;
    }
  },
});

// Create or update user from session
export const upsertFromSession = mutation({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const jsonString = atob(args.sessionToken);
      const decoded = JSON.parse(jsonString);

      const existing = await ctx.db
        .query("users")
        .withIndex("by_github_id", (q) => q.eq("githubId", String(decoded.githubId)))
        .first();

      if (existing) {
        // Update existing user with fresh token
        await ctx.db.patch(existing._id, {
          githubUsername: decoded.githubUsername,
          githubAccessToken: decoded.accessToken,
          avatarUrl: decoded.avatarUrl,
        });
        return existing._id;
      }

      // Create new user
      return await ctx.db.insert("users", {
        githubId: String(decoded.githubId),
        githubUsername: decoded.githubUsername,
        githubAccessToken: decoded.accessToken,
        avatarUrl: decoded.avatarUrl,
        createdAt: Date.now(),
      });
    } catch (error) {
      throw new Error("Invalid session token");
    }
  },
});
