import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Run daily at midnight UTC to check for missed dailies and subregion inactivity
crons.daily(
  "daily-hp-check",
  { hourUTC: 0, minuteUTC: 0 },
  internal.scanner.processDailyChecks
);

export default crons;
