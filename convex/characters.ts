import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { MAX_HP } from "./game";

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

// Get current user's character
export const get = query({
  args: {
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.sessionToken) return null;

    const user = await getUserFromSession(ctx, args.sessionToken);
    if (!user) return null;

    const character = await ctx.db
      .query("characters")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("isAlive"), true))
      .first();

    return character;
  },
});

// Get user with character
export const getUserWithCharacter = query({
  args: {
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.sessionToken) return null;

    const user = await getUserFromSession(ctx, args.sessionToken);
    if (!user) return null;

    const character = await ctx.db
      .query("characters")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("isAlive"), true))
      .first();

    return { user, character };
  },
});

// Create a new character
export const create = mutation({
  args: {
    name: v.string(),
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getUserFromSession(ctx, args.sessionToken);
    if (!user) throw new Error("Not authenticated");

    // Check if user already has a living character
    const existingCharacter = await ctx.db
      .query("characters")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("isAlive"), true))
      .first();

    if (existingCharacter) {
      throw new Error("You already have a living character");
    }

    const now = Date.now();
    return await ctx.db.insert("characters", {
      userId: user._id,
      name: args.name,
      hp: MAX_HP,
      maxHp: MAX_HP,
      xp: 0,
      level: 1,
      streak: 0,
      lastHpUpdate: now,
      isAlive: true,
      createdAt: now,
    });
  },
});

// Get public character profile by GitHub username
export const getPublicProfile = query({
  args: {
    username: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("githubUsername"), args.username))
      .first();

    if (!user) return null;

    const character = await ctx.db
      .query("characters")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("isAlive"), true))
      .first();

    // Get active commitments
    const commitments = await ctx.db
      .query("commitments")
      .withIndex("by_user_active", (q) =>
        q.eq("userId", user._id).eq("deactivatedAt", undefined)
      )
      .collect();

    // Get graveyard
    const graveyard = await ctx.db
      .query("graveyard")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    return {
      user: {
        githubUsername: user.githubUsername,
        avatarUrl: user.avatarUrl,
      },
      character: character ? {
        name: character.name,
        hp: character.hp,
        maxHp: character.maxHp,
        xp: character.xp,
        level: character.level,
        streak: character.streak,
        createdAt: character.createdAt,
      } : null,
      commitments: commitments.map((c) => ({
        owner: c.owner,
        repo: c.repo,
        activatedAt: c.activatedAt,
        commitmentEndsAt: c.commitmentEndsAt,
        renewalCount: c.renewalCount,
      })),
      graveyard: graveyard.map((g) => ({
        name: g.name,
        level: g.level,
        xp: g.xp,
        diedAt: g.diedAt,
        deathCause: g.deathCause,
        daysLived: g.daysLived,
      })),
    };
  },
});

// Get graveyard for current user
export const getGraveyard = query({
  args: {
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.sessionToken) return [];

    const user = await getUserFromSession(ctx, args.sessionToken);
    if (!user) return [];

    return await ctx.db
      .query("graveyard")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
  },
});
