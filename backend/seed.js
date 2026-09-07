/**
 * Bootstrap script.
 *
 * EventSphere no longer ships fabricated sample events — the catalogue is
 * populated from real providers by the ingestion service (see
 * services/eventSync.js), which then refreshes daily on a cron schedule.
 *
 * This script:
 *   1. creates the demo account, and
 *   2. runs one ingestion pass so a fresh install has real data immediately.
 *
 * Usage:
 *   node backend/seed.js            # demo user + full sync
 *   node backend/seed.js --no-sync  # demo user only
 */
const mongoose = require("mongoose");
const env = require("./config/env");
const User = require("./models/User");
const Event = require("./models/Event");
const { runSync } = require("./services/eventSync");

const DEMO = {
  name: "EventSphere Demo",
  email: "demo@eventsphere.com",
  password: "demo123456",
  city: "New York",
  interests: ["Music", "Tech", "Food"],
  bio: "Exploring what is on around town.",
};

async function main() {
  const skipSync = process.argv.includes("--no-sync");

  await mongoose.connect(env.MONGO_URI);
  console.log(`Connected to ${mongoose.connection.name}.`);

  await Promise.all([Event.syncIndexes(), User.syncIndexes()]);

  // Legacy documents predate the `source` field; label them so the ingestion
  // service never mistakes a user's own event for a prunable synced one.
  const backfilled = await Event.updateMany(
    { source: { $exists: false } },
    { $set: { source: "user" } }
  );
  if (backfilled.modifiedCount) {
    console.log(`Backfilled source="user" on ${backfilled.modifiedCount} legacy event(s).`);
  }

  let demo = await User.findOne({ email: DEMO.email });
  if (demo) {
    console.log("Demo account already exists.");
  } else {
    demo = await User.create(DEMO);
    console.log("Demo account created.");
  }

  if (skipSync) {
    console.log("Skipping ingestion (--no-sync).");
  } else {
    console.log("\nFetching real events from providers...");
    const result = await runSync("manual");
    console.log(
      `Ingestion ${result.status}: ${result.created} new, ${result.updated} updated, ${result.removed} expired removed.`
    );
  }

  const [total, upcoming] = await Promise.all([
    Event.countDocuments(),
    Event.countDocuments({ date: { $gte: new Date() } }),
  ]);

  console.log(`\nCatalogue: ${total} events (${upcoming} upcoming).`);
  console.log("\n--- Demo login ---");
  console.log(`Email:    ${DEMO.email}`);
  console.log(`Password: ${DEMO.password}`);
  console.log("------------------\n");

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error("Bootstrap failed:", err.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
