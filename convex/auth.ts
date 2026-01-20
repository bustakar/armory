import { httpAction, internalMutation, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

// Handle GitHub OAuth callback (HTTP Action - runs in Convex runtime)
export const handleGitHubCallback = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return new Response("Missing code parameter", { status: 400 });
  }

  try {
    // Call internal action to handle GitHub OAuth (runs in Node.js)
    const result = await ctx.runAction(internal.authActions.processOAuthCallback, {
      code,
    });

    if (!result.success) {
      return new Response(`OAuth error: ${result.error}`, { status: 500 });
    }

    // Redirect to dashboard with session
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    return new Response(null, {
      status: 302,
      headers: {
        Location: `${appUrl}/dashboard?session=${result.sessionToken}`,
        "Set-Cookie": `armory_session=${result.sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`,
      },
    });
  } catch (error) {
    console.error("OAuth error:", error);
    return new Response(`OAuth error: ${error}`, { status: 500 });
  }
});

// Internal mutation to create/update user
export const upsertUser = internalMutation({
  args: {
    githubId: v.string(),
    githubUsername: v.string(),
    githubAccessToken: v.string(),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_github_id", (q) => q.eq("githubId", args.githubId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        githubUsername: args.githubUsername,
        githubAccessToken: args.githubAccessToken,
        avatarUrl: args.avatarUrl,
      });
      return existing._id;
    }

    return await ctx.db.insert("users", {
      githubId: args.githubId,
      githubUsername: args.githubUsername,
      githubAccessToken: args.githubAccessToken,
      avatarUrl: args.avatarUrl,
      createdAt: Date.now(),
    });
  },
});
