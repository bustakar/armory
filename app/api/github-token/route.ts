import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const client = await clerkClient();

    // Get the GitHub OAuth access token from Clerk
    const tokens = await client.users.getUserOauthAccessToken(userId, "oauth_github");

    if (!tokens || tokens.data.length === 0) {
      return NextResponse.json({ error: "No GitHub token found" }, { status: 404 });
    }

    const token = tokens.data[0].token;

    return NextResponse.json({ token });
  } catch (error) {
    console.error("Error fetching GitHub token:", error);
    return NextResponse.json({ error: "Failed to fetch token" }, { status: 500 });
  }
}
