import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("github_token");
    const userJson = localStorage.getItem("github_user");
    if (token && userJson) {
      setIsLoggedIn(true);
      try {
        const user = JSON.parse(userJson);
        setUsername(user.login);
      } catch {
        // ignore
      }
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <main className="max-w-2xl w-full text-center">
        {/* Title */}
        <div className="mb-8">
          <h1 className="text-4xl text-accent mb-4 tracking-wider">ARMORY</h1>
          <p className="text-sm text-foreground/70">
            Turn your GitHub activity into an RPG
          </p>
        </div>

        {/* Main Card */}
        <div className="pixel-card p-8 mb-8">
          {isLoggedIn ? (
            <>
              <h2 className="text-lg mb-2">WELCOME BACK</h2>
              <p className="text-xs text-foreground/60 mb-6">
                Logged in as <span className="text-accent">{username}</span>
              </p>
              <Link to="/dashboard" className="pixel-btn inline-block w-full">
                GO TO DASHBOARD
              </Link>
            </>
          ) : (
            <>
              <h2 className="text-lg mb-2">CONNECT GITHUB</h2>
              <p className="text-xs text-foreground/60 mb-6">
                Track commits, issues, and PRs. Earn XP. Don't die.
              </p>
              <Link to="/auth/login" className="pixel-btn inline-block w-full">
                LOGIN WITH GITHUB
              </Link>
            </>
          )}
        </div>

        {/* How it works */}
        <div className="grid md:grid-cols-3 gap-4 text-left mb-8">
          <div className="pixel-card p-4">
            <h3 className="text-accent text-xs mb-2">1. CONNECT</h3>
            <p className="text-[10px] text-foreground/60 leading-relaxed">
              Link your GitHub account and select repos to track
            </p>
          </div>
          <div className="pixel-card p-4">
            <h3 className="text-accent text-xs mb-2">2. CODE</h3>
            <p className="text-[10px] text-foreground/60 leading-relaxed">
              Commits, issues, PRs = XP. Milestones = boss fights.
            </p>
          </div>
          <div className="pixel-card p-4">
            <h3 className="text-accent text-xs mb-2">3. SURVIVE</h3>
            <p className="text-[10px] text-foreground/60 leading-relaxed">
              No activity = HP loss. HP = 0 = permadeath.
            </p>
          </div>
        </div>

        {/* XP Table */}
        <div className="pixel-card p-6 text-left mb-8">
          <h3 className="text-accent text-xs mb-4">XP VALUES</h3>
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className="flex justify-between">
              <span className="text-foreground/60">Commit</span>
              <span className="text-accent">+10 XP</span>
            </div>
            <div className="flex justify-between">
              <span className="text-foreground/60">Issue Closed</span>
              <span className="text-accent">+25 XP</span>
            </div>
            <div className="flex justify-between">
              <span className="text-foreground/60">PR Merged</span>
              <span className="text-accent">+50 XP</span>
            </div>
            <div className="flex justify-between">
              <span className="text-foreground/60">Milestone Done</span>
              <span className="text-accent">+200 XP</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-[10px] text-foreground/40">
          <p>Your GitHub activity is the game. No fake commits. No cheating.</p>
        </div>
      </main>
    </div>
  );
}
