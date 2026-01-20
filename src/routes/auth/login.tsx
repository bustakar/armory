import { createFileRoute, redirect } from "@tanstack/react-router";
import { getGitHubAuthUrl } from "~/lib/github";

export const Route = createFileRoute("/auth/login")({
  beforeLoad: () => {
    const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID;
    const redirectUri = `${import.meta.env.VITE_APP_URL || "http://localhost:3000"}/auth/callback`;
    const state = crypto.randomUUID();

    // Store state in sessionStorage for CSRF protection
    if (typeof window !== "undefined") {
      sessionStorage.setItem("oauth_state", state);
    }

    const authUrl = getGitHubAuthUrl(clientId, redirectUri, state);

    // Redirect to GitHub
    throw redirect({ href: authUrl });
  },
  component: () => null,
});
