import { mutation, query, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Get or create user from Clerk auth
export const getOrCreate = mutation({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    // Check if user exists
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (existing) return existing;

    // Create new user
    // Extract GitHub username from identity (Clerk provides this when using GitHub OAuth)
    const githubUsername = identity.nickname || identity.name || "unknown";
    const avatarUrl = identity.pictureUrl || undefined;

    const userId = await ctx.db.insert("users", {
      clerkId: identity.subject,
      githubUsername,
      avatarUrl,
      createdAt: Date.now(),
    });

    return await ctx.db.get(userId);
  },
});

// Get current user
export const get = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();
  },
});

// Update GitHub access token
export const updateGitHubToken = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    await ctx.db.patch(user._id, {
      githubAccessToken: args.token,
    });
  },
});

// Get user by GitHub username (for public profiles)
export const getByUsername = query({
  args: {
    username: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_github_username", (q) => q.eq("githubUsername", args.username))
      .first();
  },
});

// Internal: Get user with token (for server-side GitHub API calls)
export const getWithToken = internalQuery({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();
  },
});

// Update user profile (GitHub username and avatar)
export const updateProfile = mutation({
  args: {
    githubUsername: v.string(),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    await ctx.db.patch(user._id, {
      githubUsername: args.githubUsername,
      avatarUrl: args.avatarUrl,
    });
  },
});

// Internal: Update personal access token (encrypted)
export const updatePersonalToken = internalMutation({
  args: {
    encryptedToken: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    await ctx.db.patch(user._id, {
      githubPersonalToken: args.encryptedToken ?? undefined,
    });
  },
});

// Check if user has personal access token configured
export const hasPersonalToken = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return false;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    return !!user?.githubPersonalToken;
  },
});
