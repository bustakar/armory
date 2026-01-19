import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start/server";
import { fetchAllCommits } from "~/lib/github";
import { buildGameState } from "~/lib/parser";
import type { GameState } from "~/lib/types";

const fetchCharacter = createServerFn({ method: "GET" })
  .validator((data: { owner: string; repo: string }) => data)
  .handler(async ({ data }) => {
    try {
      const commits = await fetchAllCommits(data.owner, data.repo);
      const gameState = buildGameState(commits);
      return { gameState, error: null };
    } catch (e) {
      return {
        gameState: null,
        error: e instanceof Error ? e.message : "Failed to load character",
      };
    }
  });

export const Route = createFileRoute("/character/$owner/$repo")({
  loader: async ({ params }) => {
    return fetchCharacter({ data: { owner: params.owner, repo: params.repo } });
  },
  component: CharacterPage,
});

function CharacterPage() {
  const { owner, repo } = Route.useParams();
  const { gameState, error } = Route.useLoaderData();

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="pixel-card p-8 text-center max-w-md">
          <h1 className="text-2xl text-health mb-4">ERROR</h1>
          <p className="text-sm text-foreground/70 mb-6">{error}</p>
          <Link to="/" className="pixel-btn inline-block">
            ← BACK
          </Link>
        </div>
      </div>
    );
  }

  if (!gameState) return null;

  const { character, paths, activeSubregions, recentActions, graveyard } =
    gameState;
  const hpPercent =
    character.maxHp > 0 ? (character.hp / character.maxHp) * 100 : 0;

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <Link to="/" className="text-foreground/50 hover:text-accent text-xs">
            ← BACK
          </Link>
          <a
            href={`https://github.com/${owner}/${repo}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground/50 hover:text-accent text-xs"
          >
            VIEW GRIMOIRE →
          </a>
        </div>

        {/* Death Banner */}
        {!character.isAlive && (
          <div className="pixel-card bg-health-bg border-health p-4 mb-6 text-center">
            <p className="text-health text-sm">☠ CHARACTER DEAD ☠</p>
            {character.deathCause && (
              <p className="text-xs text-foreground/70 mt-1">
                {character.deathCause}
              </p>
            )}
          </div>
        )}

        {/* Verification Warnings */}
        {!gameState.verified && (
          <div className="pixel-card bg-accent-dim/20 border-accent p-4 mb-6">
            <p className="text-accent text-xs mb-2">⚠ VERIFICATION ISSUES</p>
            {gameState.verificationErrors.map((err, i) => (
              <p key={i} className="text-[10px] text-foreground/60">
                • {err}
              </p>
            ))}
          </div>
        )}

        {/* Main Character Card */}
        <div className="pixel-card p-6 mb-6">
          {/* Name & Level */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <div>
              <h1 className="text-2xl text-accent mb-1">{character.name}</h1>
              <p className="text-xs text-foreground/50">{character.title}</p>
            </div>
            <div className="text-right mt-4 md:mt-0">
              <p className="text-4xl text-accent">{character.level}</p>
              <p className="text-[10px] text-foreground/50">LEVEL</p>
            </div>
          </div>

          {/* HP Bar */}
          <div className="mb-4">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-health">HP</span>
              <span className="text-foreground/50">
                {character.hp} / {character.maxHp}
              </span>
            </div>
            <div className="stat-bar stat-bar-hp">
              <div
                className="stat-bar-fill"
                style={{ width: `${hpPercent}%` }}
              />
            </div>
          </div>

          {/* XP Bar */}
          <div className="mb-6">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-xp">XP</span>
              <span className="text-foreground/50">
                {gameState.totalXpEarned.toLocaleString()} total
              </span>
            </div>
            <div className="stat-bar stat-bar-xp">
              <div
                className="stat-bar-fill"
                style={{
                  width: `${Math.min(100, (character.xp % 800) / 8)}%`,
                }}
              />
            </div>
            <p className="text-[10px] text-foreground/40 mt-1">
              {character.xpToNextLevel.toLocaleString()} XP to level{" "}
              {character.level + 1}
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatBox label="QUESTS" value={gameState.questsCompleted} />
            <StatBox label="CLEARED" value={gameState.subregionsCleared} />
            <StatBox label="STREAK" value={gameState.currentStreak} />
            <StatBox label="BEST" value={gameState.longestStreak} />
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Paths */}
          <div className="pixel-card p-4">
            <h2 className="text-sm text-accent mb-3">PATHS</h2>
            {paths.length === 0 ? (
              <p className="text-xs text-foreground/40">No paths yet</p>
            ) : (
              <div className="space-y-2">
                {paths.map((path) => (
                  <div
                    key={path.name}
                    className="flex justify-between items-center bg-background/50 p-2"
                  >
                    <span className="text-xs">{path.name}</span>
                    <span className="text-accent text-xs">Lv.{path.level}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Subregions */}
          <div className="pixel-card p-4">
            <h2 className="text-sm text-accent mb-3">ACTIVE ZONES</h2>
            {activeSubregions.length === 0 ? (
              <p className="text-xs text-foreground/40">No active subregions</p>
            ) : (
              <div className="space-y-2">
                {activeSubregions.map((sub) => (
                  <div
                    key={`${sub.zone}/${sub.name}`}
                    className="flex justify-between items-center bg-background/50 p-2"
                  >
                    <div>
                      <span className="text-xs">{sub.name}</span>
                      <span className="text-[10px] text-foreground/40 ml-1">
                        ({sub.zone})
                      </span>
                    </div>
                    {sub.daysSinceActivity !== undefined &&
                      sub.daysSinceActivity > 0 && (
                        <span className="text-health text-[10px]">
                          {sub.daysSinceActivity}d
                        </span>
                      )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="pixel-card p-4 mb-6">
          <h2 className="text-sm text-accent mb-3">ACTIVITY LOG</h2>
          {recentActions.length === 0 ? (
            <p className="text-xs text-foreground/40">No activity yet</p>
          ) : (
            <div className="space-y-1">
              {recentActions.slice(0, 10).map((action) => (
                <div
                  key={action.commitHash}
                  className="flex justify-between items-center py-1 border-b border-border/30 last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <code className="text-[10px] text-foreground/30">
                      {action.commitHash}
                    </code>
                    <span className="text-[10px]">
                      {action.type.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {action.xpChange > 0 && (
                      <span className="text-xp text-[10px]">
                        +{action.xpChange}
                      </span>
                    )}
                    {action.hpChange < 0 && (
                      <span className="text-health text-[10px]">
                        {action.hpChange}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Graveyard */}
        {graveyard.length > 0 && (
          <div className="pixel-card p-4 border-health/50">
            <h2 className="text-sm text-health mb-3">☠ GRAVEYARD</h2>
            <div className="space-y-2">
              {graveyard.map((dead, i) => (
                <div
                  key={i}
                  className="flex justify-between items-center bg-health-bg/30 p-2"
                >
                  <div>
                    <span className="text-xs text-foreground/60">
                      {dead.name}
                    </span>
                    <span className="text-[10px] text-foreground/40 ml-1">
                      Lv.{dead.level}
                    </span>
                  </div>
                  <span className="text-health text-[10px]">
                    {dead.deathCause}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-[10px] text-foreground/30">
          <p>Last updated: {new Date(gameState.lastUpdated).toLocaleString()}</p>
          <p className="mt-1">
            {gameState.verified ? (
              <span className="text-xp">✓ VERIFIED</span>
            ) : (
              <span className="text-accent">⚠ ISSUES DETECTED</span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-background/50 p-3 text-center">
      <p className="text-xl text-accent">{value}</p>
      <p className="text-[10px] text-foreground/40">{label}</p>
    </div>
  );
}
