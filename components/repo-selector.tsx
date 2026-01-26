"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { analytics } from "@/lib/analytics";

// Commitment length options with scaling XP rewards
const COMMITMENT_OPTIONS = [
  { days: 7, label: "1 week", xp: 1000 },
  { days: 14, label: "2 weeks", xp: 2500 },
  { days: 28, label: "4 weeks", xp: 10000 },
] as const;

type CommitmentDays = 7 | 14 | 28;

interface Repo {
  owner: { login: string };
  name: string;
  full_name: string;
  isPrivate?: boolean;
}

interface RepoSelectorProps {
  repos: Repo[];
  activeRepoNames: string[];
  onActivate: (owner: string, repo: string, isPrivate: boolean, days: number) => void;
  isLoading: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export function RepoSelector({
  repos,
  activeRepoNames,
  onActivate,
  isLoading,
  error,
  onRetry,
}: RepoSelectorProps) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDays, setSelectedDays] = useState<CommitmentDays>(7);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredRepos = useMemo(
    () =>
      repos.filter(
        (repo) =>
          repo.full_name.toLowerCase().includes(search.toLowerCase()) &&
          !activeRepoNames.includes(repo.full_name)
      ),
    [repos, search, activeRepoNames]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    },
    [isOpen]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="pixel-border bg-black p-4" ref={dropdownRef}>
      <h3 className="text-sm text-[var(--pixel-gold)] mb-3">
        + Add Commitment
      </h3>

      {error ? (
        <div className="bg-red-900/30 border border-red-500/50 p-3 mb-2">
          <p className="text-xs text-red-400 mb-2">{error}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              disabled={isLoading}
              className="text-xs text-red-400 hover:text-red-300 underline disabled:opacity-50"
            >
              {isLoading ? "Retrying..." : "Try again"}
            </button>
          )}
        </div>
      ) : null}

      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls="repo-dropdown"
        disabled={!!error}
        className="w-full bg-gray-800 border border-gray-600 p-2 text-left text-sm hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? "Loading..." : isOpen ? "Close" : "Select a repository…"}
      </button>

      {isOpen && (
        <div className="mt-2" id="repo-dropdown" role="listbox">
          {/* Commitment length selector */}
          <div className="flex gap-1 mb-3">
            {COMMITMENT_OPTIONS.map((opt) => (
              <button
                key={opt.days}
                type="button"
                onClick={() => setSelectedDays(opt.days)}
                className={`flex-1 px-2 py-1.5 text-xs border transition-colors ${
                  selectedDays === opt.days
                    ? "bg-green-800 border-green-600 text-green-200"
                    : "bg-gray-800 border-gray-600 text-gray-400 hover:bg-gray-700"
                }`}
              >
                <div>{opt.label}</div>
                <div className="text-[10px] opacity-75">+{opt.xp.toLocaleString()} XP</div>
              </button>
            ))}
          </div>

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search repos…"
            aria-label="Search repositories"
            className="w-full bg-gray-900 border border-gray-600 p-2 text-sm text-green-400 placeholder-gray-600 mb-2"
          />

          <div className="max-h-48 overflow-y-auto border border-gray-600">
            {filteredRepos.length === 0 ? (
              <p className="text-xs text-gray-500 p-2">No repos found</p>
            ) : (
              filteredRepos.slice(0, 10).map((repo) => (
                <button
                  key={repo.full_name}
                  role="option"
                  aria-selected={false}
                  onClick={() => {
                    analytics.commitmentActivated({ repo: repo.full_name, isPrivate: repo.isPrivate ?? false });
                    onActivate(repo.owner.login, repo.name, repo.isPrivate ?? false, selectedDays);
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
            Longer commitments = bigger XP rewards
          </p>
        </div>
      )}
    </div>
  );
}
