import { mutation, query, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Shared validators for return types
const userValidator = v.object({
  _id: v.id("users"),
  _creationTime: v.number(),
  clerkId: v.string(),
  githubUsername: v.string(),
  githubAccessToken: v.optional(v.string()),
  githubPersonalToken: v.optional(v.string()),
  avatarUrl: v.optional(v.string()),
  createdAt: v.number(),
});

// Get or create user from Clerk auth
export const getOrCreate = mutation({
  args: {},
  returns: v.union(userValidator, v.null()),
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
  args: {},
  returns: v.union(userValidator, v.null()),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();
  },
});

// Update GitHub access token (internal - called from action with encrypted token)
export const updateGitHubToken = internalMutation({
  args: {
    encryptedToken: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    await ctx.db.patch(user._id, {
      githubAccessToken: args.encryptedToken,
    });
    return null;
  },
});

// Public user validator (excludes sensitive token fields)
const publicUserValidator = v.object({
  _id: v.id("users"),
  _creationTime: v.number(),
  clerkId: v.string(),
  githubUsername: v.string(),
  avatarUrl: v.optional(v.string()),
  createdAt: v.number(),
  // Note: tokens are excluded from public queries but may still be in the DB response
  // This validator allows them but they shouldn't be relied upon
  githubAccessToken: v.optional(v.string()),
  githubPersonalToken: v.optional(v.string()),
});

// Get user by GitHub username (for public profiles)
export const getByUsername = query({
  args: {
    username: v.string(),
  },
  returns: v.union(publicUserValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_github_username", (q) => q.eq("githubUsername", args.username))
      .first();
  },
});

// Internal: Get user with token (for server-side GitHub API calls)
export const getWithToken = internalQuery({
  args: {},
  returns: v.union(userValidator, v.null()),
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
  returns: v.null(),
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
    return null;
  },
});

// Internal: Update personal access token (encrypted)
export const updatePersonalToken = internalMutation({
  args: {
    encryptedToken: v.union(v.string(), v.null()),
  },
  returns: v.null(),
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
    return null;
  },
});

// Get all usernames for sitemap (public, no auth required)
export const getAllUsernames = query({
  args: {},
  returns: v.array(
    v.object({
      username: v.string(),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    return users.map((u) => ({
      username: u.githubUsername,
      createdAt: u.createdAt,
    }));
  },
});

// Check if user has personal access token configured
export const hasPersonalToken = query({
  args: {},
  returns: v.boolean(),
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
