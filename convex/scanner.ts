import { internalAction, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      date: string;
    };
  };
}

// Fetch commits from GitHub
async function fetchGitHubCommits(
  owner: string,
  repo: string,
  since?: string
): Promise<GitHubCommit[]> {
  let url = `https://api.github.com/repos/${owner}/${repo}/commits?per_page=100`;
  if (since) {
    url += `&since=${since}`;
  }

  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github.v3+json",
      ...(process.env.GITHUB_TOKEN
        ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
        : {}),
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`);
  }

  return response.json();
}

// Check if a commit hash exists in the repo history
async function commitExists(
  owner: string,
  repo: string,
  hash: string
): Promise<boolean> {
  const url = `https://api.github.com/repos/${owner}/${repo}/commits/${hash}`;

  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github.v3+json",
      ...(process.env.GITHUB_TOKEN
        ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
        : {}),
    },
  });

  return response.ok;
}

// Process daily checks for all registered grimoires
export const processDailyChecks = internalAction({
  handler: async (ctx) => {
    // Get all registered grimoires
    const grimoires = await ctx.runQuery(internal.grimoires.listAll);

    for (const grimoire of grimoires) {
      try {
        // Check for history rewrites
        const hashExists = await commitExists(
          grimoire.owner,
          grimoire.repo,
          grimoire.lastCommitHash
        );

        if (!hashExists) {
          // History was rewritten!
          await ctx.runMutation(internal.grimoires.recordRewrite, {
            owner: grimoire.owner,
            repo: grimoire.repo,
          });
        }

        // Fetch latest commits
        const commits = await fetchGitHubCommits(
          grimoire.owner,
          grimoire.repo
        );

        if (commits.length > 0) {
          const latestHash = commits[0]!.sha.substring(0, 7);

          // Check for daily commits
          const today = new Date().toISOString().split("T")[0]!;
          const hasDailyCommit = commits.some((c) => {
            const commitDate = c.commit.author.date.split("T")[0];
            const isDailyCommit = c.commit.message.includes("DAILY");
            return commitDate === today && isDailyCommit;
          });

          // Log the daily check
          await ctx.runMutation(internal.scanner.logDailyCheck, {
            owner: grimoire.owner,
            repo: grimoire.repo,
            date: today,
            hadDailyCommit: hasDailyCommit,
          });

          // Update cache with latest hash
          await ctx.runMutation(internal.grimoires.upsert, {
            owner: grimoire.owner,
            repo: grimoire.repo,
            lastCommitHash: latestHash,
            totalCommits: commits.length,
          });
        }
      } catch (error) {
        console.error(
          `Error processing grimoire ${grimoire.owner}/${grimoire.repo}:`,
          error
        );
      }
    }
  },
});

// Log daily check result
export const logDailyCheck = internalMutation({
  args: {
    owner: v.string(),
    repo: v.string(),
    date: v.string(),
    hadDailyCommit: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Check if already logged for this date
    const existing = await ctx.db
      .query("dailyLogs")
      .withIndex("by_grimoire_date", (q) =>
        q
          .eq("owner", args.owner)
          .eq("repo", args.repo)
          .eq("date", args.date)
      )
      .first();

    if (existing) return;

    // Calculate HP change: -5 if missed daily commit, +10 if complete
    // Note: This is simplified - real implementation would parse the commit
    const hpChange = args.hadDailyCommit ? 10 : -5;

    await ctx.db.insert("dailyLogs", {
      owner: args.owner,
      repo: args.repo,
      date: args.date,
      hadDailyCommit: args.hadDailyCommit,
      hpChange,
      processedAt: Date.now(),
    });
  },
});
