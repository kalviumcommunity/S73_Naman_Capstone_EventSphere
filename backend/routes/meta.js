const express = require("express");
const mongoose = require("mongoose");
const Event = require("../models/Event");
const { CATEGORIES } = require("../models/Event");
const SyncLog = require("../models/SyncLog");
const env = require("../config/env");
const { asyncHandler } = require("../middleware/errorHandler");
const { runSync, isRunning, providers } = require("../services/eventSync");

const router = express.Router();

/** Liveness + dependency check, for uptime monitors and deploy health probes. */
router.get("/health", (req, res) => {
  const dbState = mongoose.connection.readyState; // 1 = connected
  const ok = dbState === 1;
  res.status(ok ? 200 : 503).json({
    status: ok ? "ok" : "degraded",
    database: ["disconnected", "connected", "connecting", "disconnecting"][dbState] ?? "unknown",
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

/** Headline numbers for the home page. */
router.get(
  "/stats",
  asyncHandler(async (req, res) => {
    const now = new Date();
    const [total, upcoming, cities, categories, lastSync] = await Promise.all([
      Event.countDocuments(),
      Event.countDocuments({ date: { $gte: now } }),
      Event.distinct("city", { city: { $nin: ["", null] }, date: { $gte: now } }),
      Event.aggregate([
        { $match: { date: { $gte: now } } },
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      SyncLog.findOne({ status: { $in: ["success", "partial"] } }).sort({ startedAt: -1 }).lean(),
    ]);

    res.json({
      total,
      upcoming,
      cities: cities.length,
      categories: categories.map((c) => ({ category: c._id, count: c.count })),
      lastSyncedAt: lastSync ? lastSync.finishedAt || lastSync.startedAt : null,
    });
  })
);

/** Cities with upcoming events, most active first — powers the location filter. */
router.get(
  "/cities",
  asyncHandler(async (req, res) => {
    const cities = await Event.aggregate([
      { $match: { date: { $gte: new Date() }, city: { $nin: ["", null] } } },
      { $group: { _id: "$city", count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
      { $limit: 60 },
    ]);

    res.json({ cities: cities.map((c) => ({ city: c._id, count: c.count })) });
  })
);

router.get("/categories", (req, res) => res.json({ categories: CATEGORIES }));

// -------------------------------------------------------------- sync status

router.get(
  "/sync/status",
  asyncHandler(async (req, res) => {
    const [last, recent] = await Promise.all([
      SyncLog.findOne().sort({ startedAt: -1 }).lean(),
      SyncLog.find().sort({ startedAt: -1 }).limit(5)
        .select("startedAt finishedAt status trigger created updated removed durationMs").lean(),
    ]);

    res.json({
      running: isRunning(),
      schedule: { cron: env.SYNC_CRON, timezone: env.SYNC_TIMEZONE },
      providers: providers.map((p) => ({
        name: p.name,
        label: p.label,
        requiresKey: Boolean(p.requiresKey),
        configured: p.isConfigured ? p.isConfigured() : true,
      })),
      last,
      recent,
    });
  })
);

/**
 * Manual sync trigger. Disabled unless ADMIN_SYNC_TOKEN is configured, so an
 * unguarded deployment cannot have expensive ingestion runs forced on it.
 */
router.post(
  "/sync/run",
  asyncHandler(async (req, res) => {
    if (!env.ADMIN_SYNC_TOKEN) {
      return res.status(503).json({
        error: "Manual sync is disabled. Set ADMIN_SYNC_TOKEN in the environment to enable it.",
      });
    }

    const supplied = req.get("x-admin-token") || "";
    const expected = env.ADMIN_SYNC_TOKEN;

    // Constant-time compare so the token cannot be guessed by timing.
    const a = Buffer.from(supplied);
    const b = Buffer.from(expected);
    const valid = a.length === b.length && require("crypto").timingSafeEqual(a, b);
    if (!valid) return res.status(401).json({ error: "Invalid admin token." });

    if (isRunning()) {
      return res.status(409).json({ error: "A sync is already in progress." });
    }

    const result = await runSync("manual");
    res.json(result);
  })
);

module.exports = router;
