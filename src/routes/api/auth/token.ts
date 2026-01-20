import { json } from "@tanstack/react-start";
import { createAPIFileRoute } from "@tanstack/react-start/api";
import { exchangeCodeForToken, GitHubClient } from "~/lib/github";

export const APIRoute = createAPIFileRoute("/api/auth/token")({
  POST: async ({ request }) => {
    try {
      const { code } = await request.json();

      if (!code) {
        return json({ error: "Missing authorization code" }, { status: 400 });
      }

      const clientId = process.env.GITHUB_CLIENT_ID;
      const clientSecret = process.env.GITHUB_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        return json({ error: "GitHub OAuth not configured" }, { status: 500 });
      }

      // Exchange code for access token
      const accessToken = await exchangeCodeForToken(clientId, clientSecret, code);

      // Get user info
      const client = new GitHubClient(accessToken);
      const user = await client.getUser();

      return json({
        access_token: accessToken,
        user: {
          id: user.id,
          login: user.login,
          avatar_url: user.avatar_url,
          name: user.name,
        },
      });
    } catch (error) {
      console.error("Token exchange error:", error);
      return json(
        { error: error instanceof Error ? error.message : "Authentication failed" },
        { status: 500 }
      );
    }
  },
});
