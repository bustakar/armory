import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { MAX_HP } from "./game";

// Get current user's character
export const get = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) return null;

    return await ctx.db
      .query("characters")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("isAlive"), true))
      .first();
  },
});

// Character name validation constants
const NAME_MIN_LENGTH = 1;
const NAME_MAX_LENGTH = 50;
// Allow alphanumeric, spaces, hyphens, underscores, apostrophes
const NAME_PATTERN = /^[a-zA-Z0-9\s\-_']+$/;

function validateCharacterName(name: string): string {
  const trimmed = name.trim();

  if (trimmed.length < NAME_MIN_LENGTH) {
    throw new Error("Character name cannot be empty");
  }

  if (trimmed.length > NAME_MAX_LENGTH) {
    throw new Error(`Character name cannot exceed ${NAME_MAX_LENGTH} characters`);
  }

  if (!NAME_PATTERN.test(trimmed)) {
    throw new Error("Character name can only contain letters, numbers, spaces, hyphens, underscores, and apostrophes");
  }

  return trimmed;
}

// Create a new character
export const create = mutation({
  args: {
    name: v.string(),
    difficulty: v.optional(v.union(v.literal("easy"), v.literal("medium"), v.literal("hard"))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Validate and sanitize character name
    const validatedName = validateCharacterName(args.name);

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

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
      name: validatedName,
      hp: MAX_HP,
      maxHp: MAX_HP,
      xp: 0,
      level: 1,
      streak: 0,
      lastHpUpdate: now,
      isAlive: true,
      createdAt: now,
      difficulty: args.difficulty || "easy",
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
      .withIndex("by_github_username", (q) => q.eq("githubUsername", args.username))
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
        difficulty: character.difficulty || "easy",
      } : null,
      commitments: commitments.map((c) => ({
        // Hide private repo details from public profile
        owner: c.isPrivate ? null : c.owner,
        repo: c.isPrivate ? null : c.repo,
        isPrivate: c.isPrivate ?? false,
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
        difficulty: g.difficulty || "easy",
      })),
    };
  },
});

// Get graveyard for current user
export const getGraveyard = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) return [];

    return await ctx.db
      .query("graveyard")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
  },
});

// Difficulty order for validation (can only increase)
const DIFFICULTY_ORDER: Record<string, number> = {
  easy: 0,
  medium: 1,
  hard: 2,
};

// Upgrade difficulty (one-way - can only increase)
export const upgradeDifficulty = mutation({
  args: {
    newDifficulty: v.union(v.literal("medium"), v.literal("hard")),
  },
  handler: async (ctx, args) => {
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

    if (!character) throw new Error("No living character found");

    const currentDifficulty = character.difficulty || "easy";
    const currentOrder = DIFFICULTY_ORDER[currentDifficulty];
    const newOrder = DIFFICULTY_ORDER[args.newDifficulty];

    // Validate upgrade direction (can only increase)
    if (newOrder <= currentOrder) {
      throw new Error("Can only upgrade to a higher difficulty");
    }

    // Update character difficulty
    await ctx.db.patch(character._id, {
      difficulty: args.newDifficulty,
    });

    return { success: true };
  },
});
