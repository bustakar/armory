import { auth, clerkClient } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";
import { NextResponse } from "next/server";

// Server-side Convex client
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// Error response helper with categorization
function errorResponse(
  message: string,
  status: number,
  category: "auth" | "convex" | "clerk" | "github" | "unknown" = "unknown"
) {
  return NextResponse.json(
    { error: message, category },
    { status }
  );
}

export async function POST() {
  try {
    const { userId, getToken } = await auth();

    if (!userId) {
      return errorResponse("Not authenticated", 401, "auth");
    }

    // Get Convex token from Clerk (for authenticated Convex calls)
    let convexToken: string | null = null;
    try {
      convexToken = await getToken({ template: "convex" });
    } catch (error) {
      console.error("Failed to get Convex token from Clerk:", error);
      return errorResponse("Failed to authenticate with Convex", 401, "clerk");
    }

    if (!convexToken) {
      return errorResponse("No Convex token available", 401, "clerk");
    }

    // Authenticate Convex client
    convex.setAuth(convexToken);

    // Get the GitHub OAuth access token from Clerk
    let githubToken: string | null = null;
    try {
      const client = await clerkClient();
      const tokens = await client.users.getUserOauthAccessToken(userId, "oauth_github");

      if (!tokens || tokens.data.length === 0) {
        return errorResponse("No GitHub token found. Please reconnect GitHub.", 404, "github");
      }

      githubToken = tokens.data[0].token;
    } catch (error) {
      console.error("Failed to get GitHub token from Clerk:", error);
      return errorResponse("Failed to retrieve GitHub credentials", 500, "clerk");
    }

    // Ensure user exists in Convex
    try {
      await convex.mutation(api.users.getOrCreate);
    } catch (error) {
      console.error("Failed to create/get user in Convex:", error);
      return errorResponse("Failed to initialize user", 500, "convex");
    }

    // Sync token via action (handles encryption and profile update)
    // This action encrypts the token and stores it server-side
    try {
      const result = await convex.action(api.githubActions.syncGitHubToken, {
        token: githubToken,
      });

      // Check for action-level errors
      if (!result.success && result.error) {
        console.error("GitHub sync action failed:", result.error);
        const status = result.error.category === "AUTH" ? 401 :
                       result.error.category === "RATE_LIMIT" ? 429 : 500;
        return errorResponse(result.error.message, status, "github");
      }

      return NextResponse.json(result);
    } catch (error) {
      console.error("Failed to sync GitHub token:", error);
      return errorResponse("Failed to sync GitHub token", 500, "convex");
    }
  } catch (error) {
    // Catch-all for unexpected errors
    console.error("Unexpected error in sync-github:", error);
    return errorResponse("An unexpected error occurred", 500, "unknown");
  }
}
