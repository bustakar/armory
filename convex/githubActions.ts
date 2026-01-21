"use node";

import { action } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { v } from "convex/values";
import { fetchUserRepos, fetchGitHubUser } from "./github";
import { encrypt, decrypt } from "./crypto";

// Fetch user's GitHub repos (server-side only - token never reaches frontend)
// Prefers PAT (for private repos) over Clerk OAuth token (public only)
export const getUserRepos = action({
  handler: async (ctx): Promise<Array<{ owner: string; name: string; fullName: string; isPrivate: boolean }>> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Get user from database to retrieve GitHub tokens
    const user = await ctx.runQuery(internal.users.getWithToken);

    if (!user) {
      return [];
    }

    // Prefer PAT (private repos access) over Clerk OAuth token (public only)
    // Both tokens are now encrypted
    let token: string | null = null;

    if (user.githubPersonalToken) {
      try {
        token = decrypt(user.githubPersonalToken);
      } catch {
        console.error("Failed to decrypt PAT");
      }
    }

    if (!token && user.githubAccessToken) {
      try {
        token = decrypt(user.githubAccessToken);
      } catch {
        console.error("Failed to decrypt OAuth token");
      }
    }

    if (!token) {
      return [];
    }

    try {
      const repos = await fetchUserRepos(token);
      // Return only necessary data - no token exposure
      return repos.map((repo) => ({
        owner: repo.owner.login,
        name: repo.name,
        fullName: repo.full_name,
        isPrivate: repo.private,
      }));
    } catch {
      console.error("Failed to fetch repos");
      return [];
    }
  },
});

// Sync GitHub token from Clerk OAuth (called after sign-in)
export const syncGitHubToken = action({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // First ensure user exists
    await ctx.runMutation(api.users.getOrCreate);

    // Encrypt and store the token
    const encryptedToken = encrypt(args.token);
    await ctx.runMutation(internal.users.updateGitHubToken, { encryptedToken });

    // Fetch and return GitHub user info to update profile
    try {
      const githubUser = await fetchGitHubUser(args.token);
      await ctx.runMutation(api.users.updateProfile, {
        githubUsername: githubUser.login,
        avatarUrl: githubUser.avatar_url,
      });
      return { success: true, username: githubUser.login };
    } catch (error) {
      console.error("Failed to fetch GitHub user");
      return { success: false };
    }
  },
});

// Save user's personal access token (encrypted)
export const savePersonalToken = action({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Validate token by making a test API call
    try {
      const response = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${args.token}`,
          Accept: "application/vnd.github+json",
        },
      });

      if (!response.ok) {
        return { success: false, error: "Invalid token" };
      }

      // Encrypt and store the token
      const encryptedToken = encrypt(args.token);
      await ctx.runMutation(internal.users.updatePersonalToken, {
        encryptedToken,
      });

      return { success: true };
    } catch {
      return { success: false, error: "Failed to validate token" };
    }
  },
});

// Remove user's personal access token
export const removePersonalToken = action({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    await ctx.runMutation(internal.users.updatePersonalToken, {
      encryptedToken: null,
    });

    return { success: true };
  },
});
