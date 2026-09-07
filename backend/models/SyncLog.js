const mongoose = require("mongoose");

/** One record per ingestion run, so /api/sync/status can report real history. */
const syncLogSchema = new mongoose.Schema(
  {
    startedAt: { type: Date, required: true },
    finishedAt: { type: Date },
    durationMs: { type: Number },
    status: {
      type: String,
      enum: ["running", "success", "partial", "failed"],
      default: "running",
      index: true,
    },
    trigger: { type: String, enum: ["cron", "boot", "manual"], default: "cron" },
    created: { type: Number, default: 0 },
    updated: { type: Number, default: 0 },
    removed: { type: Number, default: 0 },
    providers: [
      {
        name: String,
        ok: Boolean,
        fetched: Number,
        created: Number,
        updated: Number,
        skipped: Number,
        error: String,
        durationMs: Number,
      },
    ],
    error: { type: String },
  },
  { timestamps: true }
);

syncLogSchema.index({ startedAt: -1 });

module.exports = mongoose.model("SyncLog", syncLogSchema);
