/** One-off ingestion run from the CLI: `npm run sync`. */
const mongoose = require("mongoose");
const env = require("../config/env");
const { runSync } = require("../services/eventSync");

(async () => {
  await mongoose.connect(env.MONGO_URI);
  const result = await runSync("manual");
  console.log(JSON.stringify(result, null, 2));
  await mongoose.disconnect();
  process.exit(result.status === "failed" ? 1 : 0);
})().catch(async (err) => {
  console.error("Sync failed:", err.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
