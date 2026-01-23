"use node";

import { action } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { v } from "convex/values";
import { fetchUserRepos, fetchGitHubUser, GitHubAPIError } from "./github";
import { encrypt, decrypt } from "./crypto";
import { logError, success, failure, type ActionResult } from "./lib/errors";

// Result type for getUserRepos
type RepoInfo = { owner: string; name: string; fullName: string; isPrivate: boolean };

// Fetch user's GitHub repos (server-side only - token never reaches frontend)
// Prefers PAT (for private repos) over Clerk OAuth token (public only)
export const getUserRepos = action({
  handler: async (ctx): Promise<ActionResult<RepoInfo[]>> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return failure("Not authenticated", "AUTH");
    }

    // Get user from database to retrieve GitHub tokens
    const user = await ctx.runQuery(internal.users.getWithToken);

    if (!user) {
      return success([]);
    }

    // Prefer PAT (private repos access) over Clerk OAuth token (public only)
    // Both tokens are now encrypted
    let token: string | null = null;
    let tokenSource: "PAT" | "OAuth" | null = null;

    if (user.githubPersonalToken) {
      try {
        token = decrypt(user.githubPersonalToken);
        tokenSource = "PAT";
      } catch (error) {
        logError("getUserRepos:decryptPAT", error, { userId: user._id });
        // Continue to try OAuth token
      }
    }

    if (!token && user.githubAccessToken) {
      try {
        token = decrypt(user.githubAccessToken);
        tokenSource = "OAuth";
      } catch (error) {
        logError("getUserRepos:decryptOAuth", error, { userId: user._id });
        // Both tokens failed
      }
    }

    if (!token) {
      // No valid token available - this is expected for new users
      return success([]);
    }

    try {
      const repos = await fetchUserRepos(token);
      // Return only necessary data - no token exposure
      const repoData = repos.map((repo) => ({
        owner: repo.owner.login,
        name: repo.name,
        fullName: repo.full_name,
        isPrivate: repo.private,
      }));
      return success(repoData);
    } catch (error) {
      if (error instanceof GitHubAPIError) {
        logError("getUserRepos:fetchRepos", error, { userId: user._id, tokenSource });
        if (error.isRateLimit) {
          return failure("GitHub rate limit exceeded. Please try again later.", "RATE_LIMIT");
        }
        return failure("Failed to fetch repositories from GitHub", "GITHUB_API", error.message);
      }
      logError("getUserRepos:fetchRepos", error, { userId: user._id, tokenSource });
      return failure("Failed to fetch repositories", "NETWORK");
    }
  },
});

// Sync GitHub token from Clerk OAuth (called after sign-in)
export const syncGitHubToken = action({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args): Promise<ActionResult<{ username: string }>> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return failure("Not authenticated", "AUTH");
    }

    try {
      // First ensure user exists
      await ctx.runMutation(api.users.getOrCreate);

      // Encrypt and store the token
      const encryptedToken = encrypt(args.token);
      await ctx.runMutation(internal.users.updateGitHubToken, { encryptedToken });

      // Fetch and return GitHub user info to update profile
      const githubUser = await fetchGitHubUser(args.token);
      await ctx.runMutation(api.users.updateProfile, {
        githubUsername: githubUser.login,
        avatarUrl: githubUser.avatar_url,
      });

      return success({ username: githubUser.login });
    } catch (error) {
      if (error instanceof GitHubAPIError) {
        logError("syncGitHubToken:fetchUser", error);
        if (error.status === 401) {
          return failure("GitHub token is invalid or expired", "AUTH");
        }
        if (error.isRateLimit) {
          return failure("GitHub rate limit exceeded", "RATE_LIMIT");
        }
        return failure("Failed to verify GitHub token", "GITHUB_API", error.message);
      }
      logError("syncGitHubToken", error);
      return failure("Failed to sync GitHub token", "UNKNOWN");
    }
  },
});

// Save user's personal access token (encrypted)
export const savePersonalToken = action({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args): Promise<ActionResult> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return failure("Not authenticated", "AUTH");
    }

    // Validate token format (basic check)
    const trimmedToken = args.token.trim();
    if (!trimmedToken) {
      return failure("Token cannot be empty", "VALIDATION");
    }

    // Validate token by making a test API call
    try {
      const githubUser = await fetchGitHubUser(trimmedToken);

      // Encrypt and store the token
      const encryptedToken = encrypt(trimmedToken);
      await ctx.runMutation(internal.users.updatePersonalToken, {
        encryptedToken,
      });

      // Update profile with GitHub info
      await ctx.runMutation(api.users.updateProfile, {
        githubUsername: githubUser.login,
        avatarUrl: githubUser.avatar_url,
      });

      return success();
    } catch (error) {
      if (error instanceof GitHubAPIError) {
        logError("savePersonalToken:validate", error);
        if (error.status === 401) {
          return failure("Invalid token. Please check your Personal Access Token.", "AUTH");
        }
        if (error.isRateLimit) {
          return failure("GitHub rate limit exceeded. Please try again later.", "RATE_LIMIT");
        }
        return failure("Failed to validate token with GitHub", "GITHUB_API", error.message);
      }
      logError("savePersonalToken", error);
      return failure("Failed to save token", "UNKNOWN");
    }
  },
});

// Remove user's personal access token
export const removePersonalToken = action({
  handler: async (ctx): Promise<ActionResult> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return failure("Not authenticated", "AUTH");
    }

    try {
      await ctx.runMutation(internal.users.updatePersonalToken, {
        encryptedToken: null,
      });
      return success();
    } catch (error) {
      logError("removePersonalToken", error);
      return failure("Failed to remove token", "DATABASE");
    }
  },
});
