import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Run every hour to check GitHub activity and update HP
crons.hourly(
  "hp-updates",
  { minuteUTC: 0 },
  internal.scanner.processHourlyUpdates
);

// Run every 6 hours to calculate diversity bonus
// Windows: 0:00, 6:00, 12:00, 18:00 UTC
crons.cron(
  "diversity-bonus",
  "0 0,6,12,18 * * *",
  internal.scanner.processDiversityBonus
);

export default crons;
