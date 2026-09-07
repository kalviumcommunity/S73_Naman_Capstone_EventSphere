/**
 * Centralised environment loading.
 *
 * dotenv resolves relative to process.cwd(), which breaks the documented
 * `npm start` flow (run from the repo root, .env lives in backend/). We resolve
 * explicitly against this file's directory and fall back to the repo root so
 * both `node server.js` and `node backend/server.js` behave identically.
 */
const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");

const candidates = [
  path.join(__dirname, "..", ".env"), // backend/.env
  path.join(__dirname, "..", "..", ".env"), // repo-root/.env
];

for (const file of candidates) {
  if (fs.existsSync(file)) dotenv.config({ path: file });
}

const NODE_ENV = process.env.NODE_ENV || "development";
const isProd = NODE_ENV === "production";

/** Read a required variable, failing loudly at boot instead of at first use. */
function required(key, devFallback) {
  const value = process.env[key];
  if (value) return value;
  if (!isProd && devFallback !== undefined) {
    console.warn(`[env] ${key} is not set — using development fallback.`);
    return devFallback;
  }
  console.error(
    `[env] Missing required variable ${key}. ` +
      `Create backend/.env (see .env.example) or set it in your host's dashboard.`
  );
  process.exit(1);
}

/** Parse a comma-separated list into a trimmed, non-empty array. */
function list(key, fallback = []) {
  const raw = process.env[key];
  if (!raw) return fallback;
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

const env = {
  NODE_ENV,
  isProd,
  PORT: Number(process.env.PORT) || 1369,
  MONGO_URI: required("MONGO_URI", "mongodb://127.0.0.1:27017/eventsphere"),
  JWT_SECRET: required("JWT_SECRET", "dev_only_insecure_secret_do_not_ship"),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",

  // Comma-separated allowlist. Empty => same-origin only (the unified deploy).
  CORS_ORIGINS: list("CORS_ORIGINS"),

  // --- Event ingestion -----------------------------------------------------
  TICKETMASTER_API_KEY: process.env.TICKETMASTER_API_KEY || "",
  // Cities pulled from Ticketmaster on each sync.
  SYNC_CITIES: list("SYNC_CITIES", [
    "Bengaluru",
    "Mumbai",
    "Delhi",
    "London",
    "New York",
    "San Francisco",
    "Berlin",
    "Singapore",
  ]),
  // Daily at 03:15. Standard 5-field cron.
  SYNC_CRON: process.env.SYNC_CRON || "15 3 * * *",
  SYNC_TIMEZONE: process.env.SYNC_TIMEZONE || "Etc/UTC",
  // Run a sync at boot when the newest successful sync is older than this.
  SYNC_STALE_HOURS: Number(process.env.SYNC_STALE_HOURS) || 20,
  SYNC_ON_BOOT: process.env.SYNC_ON_BOOT !== "false",
  // Guards POST /api/sync/run. Unset => the endpoint is disabled.
  ADMIN_SYNC_TOKEN: process.env.ADMIN_SYNC_TOKEN || "",
};

module.exports = env;
