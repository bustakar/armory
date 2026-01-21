import { auth, clerkClient } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api, internal } from "../../../convex/_generated/api";
import { NextResponse } from "next/server";

// Server-side Convex client
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST() {
  try {
    const { userId, getToken } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get Convex token from Clerk (for authenticated Convex calls)
    const convexToken = await getToken({ template: "convex" });
    if (!convexToken) {
      return NextResponse.json({ error: "No Convex token" }, { status: 401 });
    }

    // Authenticate Convex client
    convex.setAuth(convexToken);

    // Get the GitHub OAuth access token from Clerk
    const client = await clerkClient();
    const tokens = await client.users.getUserOauthAccessToken(userId, "oauth_github");

    if (!tokens || tokens.data.length === 0) {
      return NextResponse.json({ error: "No GitHub token found" }, { status: 404 });
    }

    const githubToken = tokens.data[0].token;

    // Ensure user exists in Convex
    await convex.mutation(api.users.getOrCreate);

    // Sync token via action (handles encryption and profile update)
    // This action encrypts the token and stores it server-side
    const result = await convex.action(api.githubActions.syncGitHubToken, {
      token: githubToken,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error syncing GitHub token:", error);
    return NextResponse.json({ error: "Failed to sync token" }, { status: 500 });
  }
}
