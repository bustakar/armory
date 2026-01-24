"use node";

import { internalAction, ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import {
  HP_DRAIN_RATES,
  XP_MULTIPLIERS,
  REWARDS,
  getTodayString,
  Difficulty,
  getDiversityMultiplier,
} from "./game";
import { fetchCommits, fetchMergedPRs, fetchPRDetails, GitHubAPIError } from "./github";
import { decrypt } from "./crypto";
import { logError, getErrorMessage } from "./lib/errors";

// Track processing stats for observability
interface ProcessingStats {
  usersProcessed: number;
  usersWithErrors: number;
  rateLimitErrors: number;
  cryptoErrors: number;
  networkErrors: number;
}

// Main hourly cron job
export const processHourlyUpdates = internalAction({
  handler: async (ctx) => {
    const stats: ProcessingStats = {
      usersProcessed: 0,
      usersWithErrors: 0,
      rateLimitErrors: 0,
      cryptoErrors: 0,
      networkErrors: 0,
    };

    // Get all users with active commitments
    const usersWithCommitments = await ctx.runMutation(
      internal.scannerMutations.getUsersWithActiveCommitments
    );

    for (const userData of usersWithCommitments) {
      stats.usersProcessed++;

      try {
        // Decrypt token - prefer PAT (private repos) over OAuth (public only)
        // Both tokens are now encrypted
        let token: string | null = null;
        let tokenSource: "PAT" | "OAuth" | null = null;

        if (userData.githubPersonalToken) {
          try {
            token = decrypt(userData.githubPersonalToken);
            tokenSource = "PAT";
          } catch (error) {
            stats.cryptoErrors++;
            logError("scanner:decryptPAT", error, {
              userId: userData.userId,
              characterId: userData.characterId,
            });
          }
        }

        if (!token && userData.githubAccessToken) {
          try {
            token = decrypt(userData.githubAccessToken);
            tokenSource = "OAuth";
          } catch (error) {
            stats.cryptoErrors++;
            logError("scanner:decryptOAuth", error, {
              userId: userData.userId,
              characterId: userData.characterId,
            });
          }
        }

        if (!token) {
          stats.usersWithErrors++;
          console.warn(`[scanner] No valid token for user ${userData.userId}, skipping`);
          continue;
        }

        await processUserActivity(ctx, { ...userData, decryptedToken: token, tokenSource });
      } catch (error) {
        stats.usersWithErrors++;

        // Classify the error for better observability
        if (error instanceof GitHubAPIError) {
          if (error.isRateLimit) {
            stats.rateLimitErrors++;
            logError("scanner:processUser:rateLimit", error, {
              userId: userData.userId,
              characterId: userData.characterId,
            });
          } else {
            logError("scanner:processUser:github", error, {
              userId: userData.userId,
              characterId: userData.characterId,
              status: error.status,
            });
          }
        } else {
          const errorMessage = getErrorMessage(error);
          if (errorMessage.includes("network") || errorMessage.includes("timeout")) {
            stats.networkErrors++;
          }
          logError("scanner:processUser", error, {
            userId: userData.userId,
            characterId: userData.characterId,
          });
        }
      }
    }

    // Log summary stats for observability
    console.log(`[scanner] Processing complete:`, {
      ...stats,
      successRate: stats.usersProcessed > 0
        ? ((stats.usersProcessed - stats.usersWithErrors) / stats.usersProcessed * 100).toFixed(1) + "%"
        : "N/A",
    });
  },
});

// Check if PR body indicates it closes issues
function prClosesIssues(prBody: string | null): boolean {
  if (!prBody) return false;
  // Match patterns like: closes #123, fixes #456, resolves #789
  const closingKeywords = /\b(close[sd]?|fix(e[sd])?|resolve[sd]?)\s+#\d+/i;
  return closingKeywords.test(prBody);
}

// Process a single user's activity
async function processUserActivity(
  ctx: ActionCtx,
  userData: {
    userId: Id<"users">;
    characterId: Id<"characters">;
    githubUsername: string;
    decryptedToken: string;
    tokenSource: "PAT" | "OAuth" | null;
    difficulty: Difficulty;
    commitments: Array<{
      _id: Id<"commitments">;
      owner: string;
      repo: string;
      lastScannedAt?: number;
    }>;
  }
) {
  const now = Date.now();
  const today = getTodayString();
  let totalHpGain = 0;
  let totalXpGain = 0;

  const difficulty = userData.difficulty || "easy";
  const xpMultiplier = XP_MULTIPLIERS[difficulty];

  // Calculate HP drain based on active repo count and difficulty
  const hpDrain = HP_DRAIN_RATES[difficulty] * userData.commitments.length;

  // Process each commitment
  for (const commitment of userData.commitments) {
    const since = new Date(commitment.lastScannedAt || now - 60 * 60 * 1000);

    try {
      // Fetch GitHub activity (commits and PRs only - issues are tracked via PRs)
      const [commits, prs] = await Promise.all([
        fetchCommits(
          userData.decryptedToken,
          commitment.owner,
          commitment.repo,
          userData.githubUsername,
          since
        ),
        fetchMergedPRs(
          userData.decryptedToken,
          commitment.owner,
          commitment.repo,
          userData.githubUsername,
          since
        ),
      ]);

      // Get daily caps
      const dailyActivity = await ctx.runMutation(
        internal.scannerMutations.getDailyActivity,
        {
          commitmentId: commitment._id,
          date: today,
        }
      );

      // Calculate rewards with daily caps
      const cappedCommits = Math.min(
        commits.length,
        REWARDS.commit.dailyCap - (dailyActivity?.commits || 0)
      );

      // Commits: XP only, no HP
      const commitXp = cappedCommits * REWARDS.commit.xp * xpMultiplier;

      // PRs: Source of HP, higher reward if PR closes issues
      let prHp = 0;
      let prXp = 0;

      // Fetch PR details to check if they close issues
      for (const pr of prs) {
        const prDetails = await fetchPRDetails(
          userData.decryptedToken,
          commitment.owner,
          commitment.repo,
          pr.number
        );

        if (prClosesIssues(prDetails?.body ?? null)) {
          // PR closes issues: higher reward
          prHp += REWARDS.prMergedWithIssue.hp;
          prXp += REWARDS.prMergedWithIssue.xp * xpMultiplier;
        } else {
          // PR without issues: lower reward
          prHp += REWARDS.prMergedNoIssue.hp;
          prXp += REWARDS.prMergedNoIssue.xp * xpMultiplier;
        }
      }

      totalHpGain += prHp;
      totalXpGain += commitXp + prXp;

      // Update commitment stats
      await ctx.runMutation(internal.scannerMutations.updateCommitmentStats, {
        commitmentId: commitment._id,
        commits: commits.length,
        issuesClosed: 0, // No longer tracking issues separately
        prsMerged: prs.length,
        xpEarned: commitXp + prXp,
        lastScannedAt: now,
      });

      // Update daily activity tracking
      await ctx.runMutation(internal.scannerMutations.updateDailyActivity, {
        userId: userData.userId,
        commitmentId: commitment._id,
        date: today,
        commits: cappedCommits,
        issuesClosed: 0, // No longer tracking issues separately
      });

      // Log per-commitment activity for diversity bonus tracking
      if (commits.length > 0 || prs.length > 0) {
        await ctx.runMutation(internal.scannerMutations.logActivity, {
          userId: userData.userId,
          characterId: userData.characterId,
          commitmentId: commitment._id,
          activeRepoCount: 1,
          commits: commits.length,
          issuesClosed: 0,
          prsMerged: prs.length,
          hpDrain: 0, // Drain is logged in aggregated entry
          hpGain: prHp,
          hpNet: prHp,
          xpGained: commitXp + prXp,
        });
      }
    } catch (error) {
      // Log error but continue processing other commitments
      logError("scanner:processCommitment", error, {
        userId: userData.userId,
        commitmentId: commitment._id,
        repo: `${commitment.owner}/${commitment.repo}`,
      });
      // Re-throw rate limit errors to stop processing this user
      if (error instanceof GitHubAPIError && error.isRateLimit) {
        throw error;
      }
    }
  }

  // Calculate net HP change
  const hpNet = totalHpGain - hpDrain;

  // Update character HP and XP
  const newHp = await ctx.runMutation(internal.scannerMutations.updateCharacterHp, {
    characterId: userData.characterId,
    hpChange: hpNet,
    xpGain: totalXpGain,
  });

  // Log activity
  await ctx.runMutation(internal.scannerMutations.logActivity, {
    userId: userData.userId,
    characterId: userData.characterId,
    activeRepoCount: userData.commitments.length,
    commits: 0,
    issuesClosed: 0,
    prsMerged: 0,
    hpDrain,
    hpGain: totalHpGain,
    hpNet,
    xpGained: totalXpGain,
  });

  // Check for death
  if (newHp <= 0) {
    await ctx.runMutation(internal.scannerMutations.killCharacter, {
      characterId: userData.characterId,
      activeRepoCount: userData.commitments.length,
    });
  }
}

// Process diversity bonus every 6 hours
// Windows: 0:00-6:00, 6:00-12:00, 12:00-18:00, 18:00-24:00 UTC
export const processDiversityBonus = internalAction({
  handler: async (ctx) => {
    const now = Date.now();
    const sixHoursAgo = now - 6 * 60 * 60 * 1000;

    // Get all activities in the last 6 hours
    const activities = await ctx.runQuery(
      internal.scannerQueries.getWindowActivities,
      { since: sixHoursAgo }
    );

    // Group activities by user
    const userActivities = new Map<
      string,
      {
        userId: Id<"users">;
        characterId: Id<"characters">;
        logs: typeof activities;
      }
    >();

    for (const activity of activities) {
      const key = activity.userId;
      if (!userActivities.has(key)) {
        userActivities.set(key, {
          userId: activity.userId,
          characterId: activity.characterId,
          logs: [],
        });
      }
      userActivities.get(key)!.logs.push(activity);
    }

    let usersProcessed = 0;
    let bonusesAwarded = 0;
    let totalBonusXp = 0;

    for (const [, userData] of userActivities) {
      usersProcessed++;

      // Count unique repos with commits or PRs (must have commitmentId and activity)
      const reposWithActivity = new Set(
        userData.logs
          .filter(
            (log) =>
              log.commitmentId && (log.commits > 0 || log.prsMerged > 0)
          )
          .map((log) => log.commitmentId)
      );

      const reposCount = reposWithActivity.size;

      // Sum XP earned in window (only from per-commitment logs, not aggregated ones)
      const windowXp = userData.logs
        .filter((log) => log.commitmentId)
        .reduce((sum, log) => sum + log.xpGained, 0);

      // Calculate diversity multiplier
      const multiplier = getDiversityMultiplier(reposCount);

      if (multiplier > 1 && windowXp > 0) {
        const bonusXp = Math.round(windowXp * (multiplier - 1));

        // Verify character is still alive
        const character = await ctx.runQuery(
          internal.scannerQueries.getActiveCharacter,
          { userId: userData.userId }
        );

        if (character) {
          // Award bonus XP
          await ctx.runMutation(internal.scannerMutations.awardBonusXp, {
            characterId: character._id,
            bonusXp,
            reason: `Diversity bonus: ${reposCount} repos (${Math.round((multiplier - 1) * 100)}% bonus)`,
          });

          bonusesAwarded++;
          totalBonusXp += bonusXp;
        }
      }
    }

    console.log(`[diversityBonus] Processing complete:`, {
      usersProcessed,
      bonusesAwarded,
      totalBonusXp,
    });
  },
});
