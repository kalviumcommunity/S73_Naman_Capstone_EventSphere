/**
 * Daily ingestion schedule. Runs `SYNC_CRON` (default 03:15 UTC) and, on boot,
 * catches up if the last successful sync is older than SYNC_STALE_HOURS — so a
 * server that was asleep overnight still serves fresh events.
 */
const cron = require("node-cron");
const env = require("../config/env");
const { runSync, isStale } = require("./eventSync");

function start() {
  if (!cron.validate(env.SYNC_CRON)) {
    console.error(`[scheduler] Invalid SYNC_CRON "${env.SYNC_CRON}" — daily sync disabled.`);
    return null;
  }

  const task = cron.schedule(
    env.SYNC_CRON,
    () => {
      console.log("[scheduler] Daily sync triggered.");
      runSync("cron").catch((err) => console.error("[scheduler] Sync failed —", err.message));
    },
    { timezone: env.SYNC_TIMEZONE }
  );

  console.log(`[scheduler] Daily event sync scheduled: "${env.SYNC_CRON}" (${env.SYNC_TIMEZONE}).`);

  if (env.SYNC_ON_BOOT) {
    // Deferred so it never blocks the server from accepting traffic.
    setTimeout(async () => {
      try {
        if (await isStale(env.SYNC_STALE_HOURS)) {
          console.log("[scheduler] Catalogue is stale — running catch-up sync.");
          await runSync("boot");
        } else {
          console.log("[scheduler] Catalogue is fresh — skipping boot sync.");
        }
      } catch (err) {
        console.error("[scheduler] Boot sync failed —", err.message);
      }
    }, 3000);
  }

  return task;
}

module.exports = { start };
