const mongoose = require("mongoose");

const CATEGORIES = [
  "Music",
  "Sports",
  "Tech",
  "Art",
  "Food",
  "Business",
  "Other",
];

const SOURCES = ["user", "ticketmaster", "devevents", "nycparks"];

const eventSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 3, maxlength: 160 },

    // startDate is the sort/filter key. endDate is optional (multi-day events).
    date: { type: Date, required: true, index: true },
    endDate: { type: Date },

    // IANA zone of the venue. A New York park concert must read as 12:30 PM to
    // everyone, not shifted into whatever timezone the viewer happens to be in.
    timezone: { type: String, trim: true, maxlength: 64 },
    // False when the source only published a date, so the UI can omit a time
    // instead of inventing midnight.
    hasTime: { type: Boolean, default: true },

    // Free-text location kept for backwards compatibility and display.
    location: { type: String, required: true, trim: true, minlength: 2, maxlength: 200 },
    venue: { type: String, trim: true, maxlength: 200 },
    city: { type: String, trim: true, maxlength: 100, index: true },
    country: { type: String, trim: true, maxlength: 100 },
    coordinates: {
      lat: { type: Number, min: -90, max: 90 },
      lon: { type: Number, min: -180, max: 180 },
    },
    isOnline: { type: Boolean, default: false },

    description: { type: String, trim: true, maxlength: 5000 },
    category: { type: String, enum: CATEGORIES, default: "Other", index: true },
    tags: [{ type: String, trim: true, lowercase: true, maxlength: 40 }],

    // Remote cover image (providers) or an /uploads/<file> path (user uploads).
    image: { type: String, default: "" },
    // Ticket / info page on the source platform.
    url: { type: String, default: "" },

    price: {
      min: { type: Number, min: 0 },
      max: { type: Number, min: 0 },
      currency: { type: String, trim: true, maxlength: 8 },
      isFree: { type: Boolean, default: false },
    },

    // Provenance. Ingested events have no createdBy.
    source: { type: String, enum: SOURCES, default: "user", index: true },
    sourceId: { type: String },
    syncedAt: { type: Date },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    attendees: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// One document per external event; user-created events have no sourceId and are
// excluded from the constraint by the partial filter.
eventSchema.index(
  { source: 1, sourceId: 1 },
  {
    unique: true,
    partialFilterExpression: { sourceId: { $type: "string" } },
  }
);

// Weighted text index — name matches should outrank description matches.
eventSchema.index(
  { name: "text", description: "text", location: "text", tags: "text" },
  { weights: { name: 10, tags: 5, location: 3, description: 1 }, name: "event_search" }
);

// Common access pattern: upcoming events within a category, soonest first.
eventSchema.index({ date: 1, category: 1 });

eventSchema.virtual("attendeeCount").get(function () {
  return Array.isArray(this.attendees) ? this.attendees.length : 0;
});

eventSchema.virtual("isPast").get(function () {
  const end = this.endDate || this.date;
  return end ? end.getTime() < Date.now() : false;
});

module.exports = mongoose.model("Event", eventSchema);
module.exports.CATEGORIES = CATEGORIES;
module.exports.SOURCES = SOURCES;
