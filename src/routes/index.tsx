import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    let owner = "";
    let repo = "";
    const trimmed = input.trim();

    if (trimmed.includes("github.com")) {
      const match = trimmed.match(/github\.com\/([^/]+)\/([^/]+)/);
      if (match) {
        owner = match[1]!;
        repo = match[2]!.replace(/\.git$/, "");
      }
    } else if (trimmed.includes("/")) {
      const parts = trimmed.split("/");
      if (parts.length === 2) {
        owner = parts[0]!;
        repo = parts[1]!;
      }
    }

    if (!owner || !repo) {
      setError("Invalid format. Use owner/repo or GitHub URL");
      return;
    }

    navigate({ to: "/character/$owner/$repo", params: { owner, repo } });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <main className="max-w-2xl w-full text-center">
        {/* Title */}
        <div className="mb-8">
          <h1 className="text-4xl text-accent mb-4 tracking-wider">ARMORY</h1>
          <p className="text-sm text-foreground/70">
            Character Verification System
          </p>
        </div>

        {/* Search Card */}
        <div className="pixel-card p-8 mb-8">
          <h2 className="text-lg mb-2">VIEW CHARACTER</h2>
          <p className="text-xs text-foreground/60 mb-6">
            Enter a GitHub grimoire repository
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="owner/grimoire"
              className="pixel-input w-full"
            />
            {error && (
              <p className="text-health text-xs">{error}</p>
            )}
            <button type="submit" className="pixel-btn w-full">
              INSPECT
            </button>
          </form>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-4 text-left">
          <div className="pixel-card p-4">
            <h3 className="text-accent text-xs mb-2">GIT VERIFIED</h3>
            <p className="text-[10px] text-foreground/60 leading-relaxed">
              All stats calculated from commit history
            </p>
          </div>
          <div className="pixel-card p-4">
            <h3 className="text-accent text-xs mb-2">PERMADEATH</h3>
            <p className="text-[10px] text-foreground/60 leading-relaxed">
              HP = 0 means game over. View the graveyard.
            </p>
          </div>
          <div className="pixel-card p-4">
            <h3 className="text-accent text-xs mb-2">ANTI-CHEAT</h3>
            <p className="text-[10px] text-foreground/60 leading-relaxed">
              History rewrites are detected and flagged
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-[10px] text-foreground/40">
          <p>
            Character is a git-based life RPG.{" "}
            <a
              href="https://github.com/karelbusta/grimoire"
              className="text-accent hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Get Started →
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
