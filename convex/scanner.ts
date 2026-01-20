"use node";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import {
  HP_DRAIN_PER_REPO_PER_HOUR,
  REWARDS,
  getTodayString,
} from "./game";
import { fetchCommits, fetchClosedIssues, fetchMergedPRs } from "./github";

// Main hourly cron job
export const processHourlyUpdates = internalAction({
  handler: async (ctx) => {
    // Get all users with active commitments
    const usersWithCommitments = await ctx.runMutation(
      internal.scannerMutations.getUsersWithActiveCommitments
    );

    for (const userData of usersWithCommitments) {
      try {
        await processUserActivity(ctx, userData);
      } catch (error) {
        console.error(`Error processing user ${userData.userId}:`, error);
      }
    }
  },
});

// Process a single user's activity
async function processUserActivity(
  ctx: any,
  userData: {
    userId: string;
    characterId: string;
    githubUsername: string;
    githubAccessToken: string;
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

  // Calculate HP drain based on active repo count
  const hpDrain = HP_DRAIN_PER_REPO_PER_HOUR * userData.commitments.length;

  // Process each commitment
  for (const commitment of userData.commitments) {
    const since = new Date(commitment.lastScannedAt || now - 60 * 60 * 1000);

    // Fetch GitHub activity
    const [commits, issues, prs] = await Promise.all([
      fetchCommits(
        userData.githubAccessToken,
        commitment.owner,
        commitment.repo,
        userData.githubUsername,
        since
      ),
      fetchClosedIssues(
        userData.githubAccessToken,
        commitment.owner,
        commitment.repo,
        userData.githubUsername,
        since
      ),
      fetchMergedPRs(
        userData.githubAccessToken,
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
    const cappedIssues = Math.min(
      issues.length,
      REWARDS.issueClosed.dailyCap - (dailyActivity?.issuesClosed || 0)
    );

    const commitHp = cappedCommits * REWARDS.commit.hp;
    const commitXp = cappedCommits * REWARDS.commit.xp;
    const issueHp = cappedIssues * REWARDS.issueClosed.hp;
    const issueXp = cappedIssues * REWARDS.issueClosed.xp;
    const prHp = prs.length * REWARDS.prMerged.hp;
    const prXp = prs.length * REWARDS.prMerged.xp;

    totalHpGain += commitHp + issueHp + prHp;
    totalXpGain += commitXp + issueXp + prXp;

    // Update commitment stats
    await ctx.runMutation(internal.scannerMutations.updateCommitmentStats, {
      commitmentId: commitment._id,
      commits: commits.length,
      issuesClosed: issues.length,
      prsMerged: prs.length,
      xpEarned: commitXp + issueXp + prXp,
      lastScannedAt: now,
    });

    // Update daily activity tracking
    await ctx.runMutation(internal.scannerMutations.updateDailyActivity, {
      userId: userData.userId,
      commitmentId: commitment._id,
      date: today,
      commits: cappedCommits,
      issuesClosed: cappedIssues,
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
