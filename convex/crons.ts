import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Run every hour to check GitHub activity and update HP
crons.hourly(
  "hp-updates",
  { minuteUTC: 0 },
  internal.scanner.processHourlyUpdates
);

export default crons;
