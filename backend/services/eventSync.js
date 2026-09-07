/**
 * Event ingestion orchestrator.
 *
 * Pulls from every configured provider, upserts into MongoDB keyed by
 * (source, sourceId) so re-running is idempotent, and records a SyncLog.
 * User-created events are never touched.
 */
const Event = require("../models/Event");
const SyncLog = require("../models/SyncLog");

const providers = [
  require("./providers/devEvents"),
  require("./providers/nycParks"),
  require("./providers/ticketmaster"),
];

// Only these sources are ever pruned or overwritten. Anything else — including
// user-created events and legacy documents written before `source` existed —
// is off limits.
const INGESTED_SOURCES = providers.map((p) => p.name);

// Ingested events are dropped this long after they finish, so the catalogue
// stays current without a second scheduled job.
const RETAIN_PAST_DAYS = 2;

let running = false;

/** Fields refreshed on every sync. Excludes attendees/bookmarks-adjacent state. */
function updatableFields(e) {
  return {
    name: e.name,
    date: e.date,
    endDate: e.endDate ?? null,
    timezone: e.timezone ?? "",
    hasTime: e.hasTime !== false,
    location: e.location,
    venue: e.venue ?? "",
    city: e.city ?? "",
    country: e.country ?? "",
    coordinates: e.coordinates ?? null,
    isOnline: Boolean(e.isOnline),
    description: e.description ?? "",
    category: e.category || "Other",
    tags: e.tags || [],
    image: e.image || "",
    url: e.url || "",
    price: e.price || { isFree: false },
    syncedAt: new Date(),
  };
}

async function upsertBatch(events) {
  if (!events.length) return { created: 0, updated: 0 };

  const ops = events.map((e) => ({
    updateOne: {
      filter: { source: e.source, sourceId: e.sourceId },
      update: {
        $set: updatableFields(e),
        $setOnInsert: { source: e.source, sourceId: e.sourceId, attendees: [] },
      },
      upsert: true,
    },
  }));

  // ordered:false so one bad document does not abort the rest of the batch.
  const res = await Event.bulkWrite(ops, { ordered: false });
  return {
    created: res.upsertedCount || 0,
    updated: res.modifiedCount || 0,
  };
}

/** Remove ingested events that finished more than RETAIN_PAST_DAYS ago. */
async function pruneExpired() {
  const cutoff = new Date(Date.now() - RETAIN_PAST_DAYS * 24 * 60 * 60 * 1000);
  const res = await Event.deleteMany({
    source: { $in: INGESTED_SOURCES },
    $or: [
      { endDate: { $ne: null, $lt: cutoff } },
      { endDate: null, date: { $lt: cutoff } },
    ],
  });
  return res.deletedCount || 0;
}

/**
 * Run one ingestion pass.
 * @param {"cron"|"boot"|"manual"} trigger
 */
async function runSync(trigger = "manual") {
  if (running) {
    return { skipped: true, reason: "A sync is already in progress" };
  }
  running = true;

  const startedAt = new Date();
  const log = await SyncLog.create({ startedAt, trigger, status: "running" });

  const results = [];
  let created = 0;
  let updated = 0;

  for (const provider of providers) {
    const t0 = Date.now();

    if (provider.requiresKey && provider.isConfigured && !provider.isConfigured()) {
      console.log(`[sync] ${provider.label} skipped — no API key configured.`);
      results.push({
        name: provider.name, ok: true, fetched: 0, created: 0, updated: 0,
        skipped: 1, error: "Not configured (no API key)", durationMs: 0,
      });
      continue;
    }

    try {
      const fetched = await provider.fetchEvents();
      const { created: c, updated: u } = await upsertBatch(fetched);
      created += c;
      updated += u;
      results.push({
        name: provider.name, ok: true, fetched: fetched.length,
        created: c, updated: u, skipped: 0, durationMs: Date.now() - t0,
      });
      console.log(
        `[sync] ${provider.label}: ${fetched.length} fetched, ${c} new, ${u} updated.`
      );
    } catch (err) {
      results.push({
        name: provider.name, ok: false, fetched: 0, created: 0, updated: 0,
        skipped: 0, error: err.message, durationMs: Date.now() - t0,
      });
      console.error(`[sync] ${provider.label} failed — ${err.message}`);
    }
  }

  let removed = 0;
  let fatal = null;
  try {
    removed = await pruneExpired();
  } catch (err) {
    fatal = err.message;
  }

  const succeeded = results.filter((r) => r.ok).length;
  const status = fatal || succeeded === 0
    ? "failed"
    : succeeded < results.length
      ? "partial"
      : "success";

  const finishedAt = new Date();
  Object.assign(log, {
    finishedAt,
    durationMs: finishedAt - startedAt,
    status,
    created,
    updated,
    removed,
    providers: results,
    error: fatal || undefined,
  });
  await log.save();

  running = false;
  console.log(
    `[sync] done in ${log.durationMs}ms — ${created} new, ${updated} updated, ${removed} expired removed (${status}).`
  );

  return {
    status, created, updated, removed,
    durationMs: log.durationMs, providers: results, syncId: log._id,
  };
}

/** True when no successful sync has completed within `hours`. */
async function isStale(hours) {
  const last = await SyncLog.findOne({ status: { $in: ["success", "partial"] } })
    .sort({ startedAt: -1 })
    .lean();
  if (!last) return true;
  return Date.now() - new Date(last.startedAt).getTime() > hours * 60 * 60 * 1000;
}

const isRunning = () => running;

module.exports = { runSync, isStale, isRunning, providers, pruneExpired };
