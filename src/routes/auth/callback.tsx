import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallback,
});

function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("Authenticating...");

  useEffect(() => {
    async function handleCallback() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const state = params.get("state");
      const errorParam = params.get("error");

      if (errorParam) {
        setError(`GitHub OAuth error: ${errorParam}`);
        return;
      }

      if (!code) {
        setError("No authorization code received");
        return;
      }

      // Verify state for CSRF protection
      const savedState = sessionStorage.getItem("oauth_state");
      if (state !== savedState) {
        setError("Invalid state parameter - possible CSRF attack");
        return;
      }
      sessionStorage.removeItem("oauth_state");

      setStatus("Exchanging code for token...");

      try {
        // Exchange code for token via our API
        const response = await fetch("/api/auth/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to exchange code");
        }

        const { access_token, user } = await response.json();

        // Store token and user info
        localStorage.setItem("github_token", access_token);
        localStorage.setItem("github_user", JSON.stringify(user));

        setStatus("Success! Redirecting...");

        // Redirect to dashboard
        navigate({ to: "/dashboard" });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Authentication failed");
      }
    }

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="pixel-card p-8 text-center">
        {error ? (
          <>
            <h1 className="text-health text-lg mb-4">AUTH ERROR</h1>
            <p className="text-sm text-foreground/70 mb-6">{error}</p>
            <a href="/" className="pixel-btn inline-block">
              BACK TO HOME
            </a>
          </>
        ) : (
          <>
            <h1 className="text-accent text-lg mb-4">CONNECTING</h1>
            <p className="text-sm text-foreground/70">{status}</p>
            <div className="mt-4 flex justify-center">
              <div className="animate-pulse text-accent">■ ■ ■</div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
