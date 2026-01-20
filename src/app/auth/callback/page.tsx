"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function AuthCallback() {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("Initializing...");

  useEffect(() => {
    const code = searchParams.get("code");
    const errorParam = searchParams.get("error");

    if (errorParam) {
      setError(`GitHub OAuth error: ${errorParam}`);
      return;
    }

    if (!code) {
      setError("No authorization code received");
      return;
    }

    const exchangeCode = async () => {
      try {
        setStatus("Exchanging code with GitHub...");

        const response = await fetch("/api/auth/callback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
          credentials: "include",
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to exchange code");
        }

        // Set the cookie directly from the response data
        // This ensures the cookie is set before we redirect
        if (data.sessionToken) {
          document.cookie = `armory_session=${data.sessionToken}; path=/; max-age=${60 * 60 * 24 * 7}; samesite=lax`;
        }

        setStatus("Redirecting to dashboard...");

        // Small delay to ensure cookie is written
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Verify cookie was set
        const cookieExists = document.cookie.includes("armory_session");
        if (!cookieExists) {
          throw new Error("Failed to save session - cookie not set");
        }

        window.location.href = "/dashboard";
      } catch (err) {
        setError(err instanceof Error ? err.message : "Authentication failed");
      }
    };

    exchangeCode();
  }, [searchParams]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8">
        <div className="pixel-border bg-black p-8 max-w-md text-center">
          <h1 className="text-xl text-red-400 mb-4">Authentication Error</h1>
          <p className="text-gray-400 mb-6">{error}</p>
          <a
            href="/"
            className="inline-block bg-gray-700 text-white px-6 py-2 hover:bg-gray-600"
          >
            Try Again
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="pixel-border bg-black p-8 max-w-md text-center">
        <h1 className="text-xl text-[var(--pixel-gold)] mb-4">
          Authenticating...
        </h1>
        <div className="flex justify-center gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-3 h-3 bg-[var(--pixel-green)] animate-pulse"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
        <p className="text-gray-500 text-xs mt-4">{status}</p>
      </div>
    </div>
  );
}
