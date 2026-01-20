import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    if (!code) {
      return NextResponse.json({ error: "Missing code" }, { status: 400 });
    }

    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: "Missing GitHub OAuth config" },
        { status: 500 }
      );
    }

    // Exchange code for access token
    const tokenResponse = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code,
        }),
      }
    );

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      return NextResponse.json(
        { error: tokenData.error_description || tokenData.error },
        { status: 400 }
      );
    }

    const accessToken = tokenData.access_token;

    // Fetch user info from GitHub
    const userResponse = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
      },
    });

    if (!userResponse.ok) {
      return NextResponse.json(
        { error: "Failed to fetch GitHub user" },
        { status: 500 }
      );
    }

    const githubUser = await userResponse.json();

    // Create session token
    const sessionToken = Buffer.from(
      JSON.stringify({
        githubId: String(githubUser.id),
        githubUsername: githubUser.login,
        accessToken,
        avatarUrl: githubUser.avatar_url,
      })
    ).toString("base64");

    // Return success with session token
    // Client will set the cookie for reliability
    return NextResponse.json({ success: true, sessionToken });
  } catch (error) {
    console.error("Auth callback error:", error);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }
}
