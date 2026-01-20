"use node";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { exchangeCodeForToken, fetchGitHubUser } from "./github";

// Process OAuth callback (Node.js action)
export const processOAuthCallback = internalAction({
  args: {
    code: v.string(),
  },
  handler: async (ctx, args): Promise<{ success: boolean; sessionToken?: string; error?: string }> => {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return { success: false, error: "Missing GitHub OAuth configuration" };
    }

    try {
      // Exchange code for access token
      const accessToken = await exchangeCodeForToken(args.code, clientId, clientSecret);

      // Fetch user info from GitHub
      const githubUser = await fetchGitHubUser(accessToken);

      // Create or update user in database
      const userId = await ctx.runMutation(internal.auth.upsertUser, {
        githubId: String(githubUser.id),
        githubUsername: githubUser.login,
        githubAccessToken: accessToken,
        avatarUrl: githubUser.avatar_url,
      });

      // Create a simple session token
      const sessionToken = Buffer.from(
        JSON.stringify({ userId, githubId: githubUser.id })
      ).toString("base64");

      return { success: true, sessionToken };
    } catch (error) {
      console.error("OAuth error:", error);
      return { success: false, error: String(error) };
    }
  },
});
