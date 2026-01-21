"use node";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import {
  HP_DRAIN_RATES,
  XP_MULTIPLIERS,
  REWARDS,
  getTodayString,
  Difficulty,
} from "./game";
import { fetchCommits, fetchMergedPRs, fetchPRDetails } from "./github";
import { decrypt } from "./crypto";

// Main hourly cron job
export const processHourlyUpdates = internalAction({
  handler: async (ctx) => {
    // Get all users with active commitments
    const usersWithCommitments = await ctx.runMutation(
      internal.scannerMutations.getUsersWithActiveCommitments
    );

    for (const userData of usersWithCommitments) {
      try {
        // Decrypt token - prefer PAT (private repos) over OAuth (public only)
        // Both tokens are now encrypted
        let token: string | null = null;

        if (userData.githubPersonalToken) {
          try {
            token = decrypt(userData.githubPersonalToken);
          } catch {
            console.error(`Failed to decrypt PAT for user ${userData.userId}`);
          }
        }

        if (!token && userData.githubAccessToken) {
          try {
            token = decrypt(userData.githubAccessToken);
          } catch {
            console.error(`Failed to decrypt OAuth token for user ${userData.userId}`);
          }
        }

        if (!token) {
          console.error(`No valid token for user ${userData.userId}`);
          continue;
        }

        await processUserActivity(ctx, { ...userData, decryptedToken: token });
      } catch (error) {
        console.error(`Error processing user ${userData.userId}:`, error);
      }
    }
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
  ctx: any,
  userData: {
    userId: string;
    characterId: string;
    githubUsername: string;
    decryptedToken: string;
    difficulty: Difficulty;
    commitments: Array<{
      _id: string;
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
