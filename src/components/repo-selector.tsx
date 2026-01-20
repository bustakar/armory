"use client";

import { useState } from "react";

interface Repo {
  owner: { login: string };
  name: string;
  full_name: string;
}

interface RepoSelectorProps {
  repos: Repo[];
  activeRepoNames: string[];
  onActivate: (owner: string, repo: string) => void;
  isLoading: boolean;
}

export function RepoSelector({
  repos,
  activeRepoNames,
  onActivate,
  isLoading,
}: RepoSelectorProps) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const filteredRepos = repos.filter(
    (repo) =>
      repo.full_name.toLowerCase().includes(search.toLowerCase()) &&
      !activeRepoNames.includes(repo.full_name)
  );

  return (
    <div className="pixel-border bg-black p-4">
      <h3 className="text-sm text-[var(--pixel-gold)] mb-3">
        + Add Commitment
      </h3>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-gray-800 border border-gray-600 p-2 text-left text-sm hover:bg-gray-700 transition-colors"
      >
        {isOpen ? "Close" : "Select a repository..."}
      </button>

      {isOpen && (
        <div className="mt-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search repos..."
            className="w-full bg-gray-900 border border-gray-600 p-2 text-sm text-green-400 placeholder-gray-600 mb-2"
          />

          <div className="max-h-48 overflow-y-auto border border-gray-600">
            {filteredRepos.length === 0 ? (
              <p className="text-xs text-gray-500 p-2">No repos found</p>
            ) : (
              filteredRepos.slice(0, 10).map((repo) => (
                <button
                  key={repo.full_name}
                  onClick={() => {
                    onActivate(repo.owner.login, repo.name);
                    setIsOpen(false);
                    setSearch("");
                  }}
                  disabled={isLoading}
                  className="w-full text-left p-2 text-sm text-green-400 hover:bg-gray-800 transition-colors border-b border-gray-700 last:border-b-0 disabled:opacity-50"
                >
                  {repo.full_name}
                </button>
              ))
            )}
          </div>

          <p className="text-xs text-gray-500 mt-2">
            30-day commitment - 0.2 HP drain/hour
          </p>
        </div>
      )}
    </div>
  );
}
