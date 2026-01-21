"use client";

import { useState } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "../convex/_generated/api";

export function TokenSettings() {
  const hasToken = useQuery(api.users.hasPersonalToken);
  const saveToken = useAction(api.githubActions.savePersonalToken);
  const removeToken = useAction(api.githubActions.removePersonalToken);

  const [isOpen, setIsOpen] = useState(false);
  const [token, setToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!token.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await saveToken({ token: token.trim() });
      if (result.success) {
        setToken("");
        setIsOpen(false);
        // Reload to refresh repo list with private repos
        window.location.reload();
      } else {
        setError(result.error || "Failed to save token");
      }
    } catch {
      setError("Failed to save token");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = async () => {
    if (!confirm("Remove personal access token? You'll only see public repos.")) {
      return;
    }

    setIsLoading(true);
    try {
      await removeToken();
      window.location.reload();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="pixel-border bg-black p-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm text-[var(--pixel-gold)]">Private Repos</h3>
        {hasToken && (
          <span className="text-xs text-green-500">Connected</span>
        )}
      </div>

      {hasToken ? (
        <div>
          <p className="text-xs text-gray-500 mb-2">
            Personal access token configured. Private repos are visible.
          </p>
          <button
            onClick={handleRemove}
            disabled={isLoading}
            className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50"
          >
            {isLoading ? "Removing..." : "Remove Token"}
          </button>
        </div>
      ) : (
        <div>
          {!isOpen ? (
            <>
              <p className="text-xs text-gray-500 mb-2">
                Add a GitHub PAT to access private repositories.
              </p>
              <button
                onClick={() => setIsOpen(true)}
                className="text-xs text-[var(--pixel-green)] hover:underline"
              >
                + Add Token
              </button>
            </>
          ) : (
            <div className="space-y-2">
              <div className="text-xs text-gray-400 space-y-1">
                <p>
                  Create a{" "}
                  <a
                    href="https://github.com/settings/personal-access-tokens/new"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--pixel-green)] hover:underline"
                  >
                    fine-grained token
                  </a>{" "}
                  with:
                </p>
                <ul className="text-gray-500 ml-2">
                  <li>- Contents: Read-only</li>
                  <li>- Issues: Read-only</li>
                  <li>- Pull requests: Read-only</li>
                  <li>- Metadata: Read-only</li>
                </ul>
              </div>
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxx"
                className="w-full bg-gray-900 border border-gray-600 p-2 text-sm text-green-400 placeholder-gray-600"
              />
              {error && (
                <p className="text-xs text-red-400">{error}</p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={isLoading || !token.trim()}
                  className="bg-green-700 text-white px-3 py-1 text-xs hover:bg-green-600 disabled:opacity-50"
                >
                  {isLoading ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setToken("");
                    setError(null);
                  }}
                  className="text-xs text-gray-400 hover:text-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
