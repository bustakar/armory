import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { GitHubClient } from "~/lib/github";
import type { GitHubRepo, GitHubUser } from "~/lib/types";
import { XP_VALUES, HP_VALUES, calculateLevel } from "~/lib/types";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
});

interface StoredUser {
  id: number;
  login: string;
  avatar_url: string;
  name: string | null;
}

function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<StoredUser | null>(null);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [activeRepos, setActiveRepos] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Character stats (calculated from active repos)
  const [stats, setStats] = useState({
    commits: 0,
    issuesClosed: 0,
    prsMerged: 0,
    xp: 0,
    hp: 100,
  });

  useEffect(() => {
    async function init() {
      const token = localStorage.getItem("github_token");
      const userJson = localStorage.getItem("github_user");

      if (!token || !userJson) {
        navigate({ to: "/" });
        return;
      }

      try {
        const storedUser = JSON.parse(userJson) as StoredUser;
        setUser(storedUser);

        // Load saved active repos
        const savedActiveRepos = localStorage.getItem("active_repos");
        if (savedActiveRepos) {
          setActiveRepos(new Set(JSON.parse(savedActiveRepos)));
        }

        // Fetch user's repos
        const client = new GitHubClient(token);
        const userRepos = await client.getRepos();
        setRepos(userRepos);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [navigate]);

  const toggleRepo = (fullName: string) => {
    const newActive = new Set(activeRepos);
    if (newActive.has(fullName)) {
      newActive.delete(fullName);
    } else {
      newActive.add(fullName);
    }
    setActiveRepos(newActive);
    localStorage.setItem("active_repos", JSON.stringify([...newActive]));
  };

  const logout = () => {
    localStorage.removeItem("github_token");
    localStorage.removeItem("github_user");
    localStorage.removeItem("active_repos");
    navigate({ to: "/" });
  };

  const { level, xpToNextLevel } = calculateLevel(stats.xp);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="pixel-card p-8 text-center">
          <p className="text-accent">LOADING...</p>
          <div className="mt-4 animate-pulse">■ ■ ■</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="pixel-card p-8 text-center">
          <h1 className="text-health text-lg mb-4">ERROR</h1>
          <p className="text-sm text-foreground/70 mb-6">{error}</p>
          <button onClick={logout} className="pixel-btn">
            LOGOUT
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-2xl text-accent">ARMORY</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-foreground/70">{user?.login}</span>
            <button onClick={logout} className="pixel-btn text-xs">
              LOGOUT
            </button>
          </div>
        </header>

        {/* Character Card */}
        <div className="pixel-card p-6 mb-8">
          <div className="flex items-start gap-6">
            {user?.avatar_url && (
              <img
                src={user.avatar_url}
                alt={user.login}
                className="w-20 h-20 pixelated"
                style={{ imageRendering: "pixelated" }}
              />
            )}
            <div className="flex-1">
              <h2 className="text-xl text-accent mb-2">{user?.name || user?.login}</h2>
              <p className="text-xs text-foreground/60 mb-4">Level {level} Developer</p>

              {/* HP Bar */}
              <div className="mb-3">
                <div className="flex justify-between text-xs mb-1">
                  <span>HP</span>
                  <span className="text-health">{stats.hp}/{HP_VALUES.MAX_HP}</span>
                </div>
                <div className="h-4 bg-background border-2 border-foreground/30">
                  <div
                    className="h-full bg-health transition-all"
                    style={{ width: `${(stats.hp / HP_VALUES.MAX_HP) * 100}%` }}
                  />
                </div>
              </div>

              {/* XP Bar */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>XP</span>
                  <span className="text-accent">{stats.xp} / {stats.xp + xpToNextLevel}</span>
                </div>
                <div className="h-4 bg-background border-2 border-foreground/30">
                  <div
                    className="h-full bg-accent transition-all"
                    style={{ width: `${((100 - xpToNextLevel) / 100) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t border-foreground/20">
            <div className="text-center">
              <p className="text-2xl text-accent">{stats.commits}</p>
              <p className="text-[10px] text-foreground/60">COMMITS</p>
            </div>
            <div className="text-center">
              <p className="text-2xl text-accent">{stats.issuesClosed}</p>
              <p className="text-[10px] text-foreground/60">ISSUES</p>
            </div>
            <div className="text-center">
              <p className="text-2xl text-accent">{stats.prsMerged}</p>
              <p className="text-[10px] text-foreground/60">PRS</p>
            </div>
            <div className="text-center">
              <p className="text-2xl text-accent">{activeRepos.size}</p>
              <p className="text-[10px] text-foreground/60">ZONES</p>
            </div>
          </div>
        </div>

        {/* XP Values Reference */}
        <div className="pixel-card p-4 mb-8">
          <h3 className="text-xs text-accent mb-3">XP VALUES</h3>
          <div className="flex gap-6 text-[10px] text-foreground/60">
            <span>Commit: +{XP_VALUES.COMMIT}</span>
            <span>Issue: +{XP_VALUES.ISSUE_CLOSED}</span>
            <span>PR: +{XP_VALUES.PR_MERGED}</span>
            <span>Milestone: +{XP_VALUES.MILESTONE_COMPLETED}</span>
          </div>
        </div>

        {/* Repos / Zones */}
        <div className="pixel-card p-6">
          <h3 className="text-lg text-accent mb-4">SELECT ZONES</h3>
          <p className="text-xs text-foreground/60 mb-6">
            Select repositories to track. Activity in these repos = XP.
          </p>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {repos.map((repo) => (
              <button
                key={repo.id}
                onClick={() => toggleRepo(repo.full_name)}
                className={`w-full text-left p-3 border-2 transition-all ${
                  activeRepos.has(repo.full_name)
                    ? "border-accent bg-accent/10"
                    : "border-foreground/20 hover:border-foreground/40"
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm">{repo.name}</p>
                    {repo.description && (
                      <p className="text-[10px] text-foreground/60 mt-1">
                        {repo.description.slice(0, 60)}
                        {repo.description.length > 60 ? "..." : ""}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {repo.language && (
                      <span className="text-[10px] text-foreground/40">{repo.language}</span>
                    )}
                    <span
                      className={`text-lg ${
                        activeRepos.has(repo.full_name) ? "text-accent" : "text-foreground/30"
                      }`}
                    >
                      {activeRepos.has(repo.full_name) ? "■" : "□"}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {activeRepos.size > 0 && (
            <div className="mt-6 pt-4 border-t border-foreground/20">
              <p className="text-xs text-foreground/60">
                <span className="text-accent">{activeRepos.size}</span> zones active.
                No commits today = <span className="text-health">-{Math.abs(HP_VALUES.NO_ACTIVITY)} HP</span>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
