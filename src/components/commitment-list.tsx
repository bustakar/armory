"use client";

import { formatTimeRemaining } from "@/lib/utils";

interface Commitment {
  _id: string;
  owner: string;
  repo: string;
  activatedAt: number;
  commitmentEndsAt: number;
  totalCommits: number;
  totalIssuesClosed: number;
  totalPrsMerged: number;
  xpEarned: number;
}

interface CommitmentListProps {
  commitments: Commitment[];
  onDeactivate: (id: string) => void;
  onRenew: (id: string) => void;
}

export function CommitmentList({
  commitments,
  onDeactivate,
  onRenew,
}: CommitmentListProps) {
  if (commitments.length === 0) {
    return (
      <div className="pixel-border bg-black p-6 text-center">
        <p className="text-gray-400 text-sm">No active commitments</p>
        <p className="text-xs text-gray-600 mt-2">
          Activate a repo to start your survival journey
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {commitments.map((commitment) => {
        const now = Date.now();
        const isComplete = now >= commitment.commitmentEndsAt;
        const progress =
          ((now - commitment.activatedAt) /
            (commitment.commitmentEndsAt - commitment.activatedAt)) *
          100;

        return (
          <div
            key={commitment._id}
            className="pixel-border bg-black p-4"
          >
            {/* Repo name */}
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="text-[var(--pixel-green)]">
                  {commitment.owner}/{commitment.repo}
                </h3>
                <p className="text-xs text-gray-500">
                  {formatTimeRemaining(commitment.commitmentEndsAt)}
                </p>
              </div>
              <a
                href={`https://github.com/${commitment.owner}/${commitment.repo}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:underline"
              >
                View
              </a>
            </div>

            {/* Progress bar */}
            <div className="h-2 bg-gray-800 border border-gray-600 mb-3">
              <div
                className={`h-full transition-all ${isComplete ? "bg-green-500" : "bg-blue-500"}`}
                style={{ width: `${Math.min(100, progress)}%` }}
              />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 text-xs mb-3">
              <div className="text-center">
                <p className="text-gray-500">Commits</p>
                <p className="text-[var(--pixel-green)]">{commitment.totalCommits}</p>
              </div>
              <div className="text-center">
                <p className="text-gray-500">Issues</p>
                <p className="text-[var(--pixel-green)]">{commitment.totalIssuesClosed}</p>
              </div>
              <div className="text-center">
                <p className="text-gray-500">PRs</p>
                <p className="text-[var(--pixel-green)]">{commitment.totalPrsMerged}</p>
              </div>
            </div>

            {/* XP earned */}
            <div className="text-xs text-purple-400 mb-3">
              +{commitment.xpEarned} XP earned
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              {isComplete ? (
                <>
                  <button
                    onClick={() => onRenew(commitment._id)}
                    className="flex-1 bg-green-700 hover:bg-green-600 text-white text-xs py-2 px-3 transition-colors"
                  >
                    Renew (+25 XP)
                  </button>
                  <button
                    onClick={() => onDeactivate(commitment._id)}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-xs py-2 px-3 transition-colors"
                  >
                    Complete
                  </button>
                </>
              ) : (
                <button
                  onClick={() => onDeactivate(commitment._id)}
                  className="flex-1 bg-red-900 hover:bg-red-800 text-white text-xs py-2 px-3 transition-colors"
                >
                  Exit Early (-50 HP)
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
