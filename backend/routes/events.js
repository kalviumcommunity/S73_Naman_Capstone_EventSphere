const express = require("express");
const mongoose = require("mongoose");
const { body, query, param } = require("express-validator");
const Event = require("../models/Event");
const { CATEGORIES } = require("../models/Event");
const authMiddleware = require("../middleware/authMiddleware");
const { optionalAuth } = require("../middleware/authMiddleware");
const validate = require("../middleware/validate");
const { asyncHandler } = require("../middleware/errorHandler");
const { writeLimiter } = require("../middleware/rateLimit");

const router = express.Router();

const MAX_LIMIT = 48;
const DEFAULT_LIMIT = 12;

/** Fields a user may set. Blocks mass assignment of source/createdBy/attendees. */
const EDITABLE_FIELDS = [
  "name", "date", "endDate", "location", "venue", "city", "country",
  "description", "category", "tags", "image", "url", "isOnline", "timezone",
];

function pickEditable(payload) {
  const out = {};
  for (const key of EDITABLE_FIELDS) {
    if (payload[key] !== undefined) out[key] = payload[key];
  }
  return out;
}

/** Escape user input before it reaches a $regex so metacharacters stay literal. */
function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Translate query parameters into a Mongo filter. */
function buildFilter(q, user) {
  const filter = {};
  const and = [];

  if (q.keyword) {
    const rx = new RegExp(escapeRegex(q.keyword.trim()), "i");
    and.push({ $or: [{ name: rx }, { description: rx }, { location: rx }, { tags: rx }] });
  }

  if (q.category && q.category !== "All") filter.category = q.category;

  if (q.city) filter.city = new RegExp("^" + escapeRegex(q.city.trim()) + "$", "i");
  if (q.country) filter.country = new RegExp("^" + escapeRegex(q.country.trim()) + "$", "i");

  // Free-text place match across every location-ish field.
  if (q.location) {
    const rx = new RegExp(escapeRegex(q.location.trim()), "i");
    and.push({ $or: [{ location: rx }, { city: rx }, { country: rx }, { venue: rx }] });
  }

  if (q.source) filter.source = q.source;
  if (q.free === "true") filter["price.isFree"] = true;
  if (q.online === "true") filter.isOnline = true;
  if (q.online === "false") filter.isOnline = false;

  // Date window. `date` (a single day) is kept for backwards compatibility.
  const range = {};
  if (q.date) {
    const day = new Date(q.date);
    if (!Number.isNaN(day.getTime())) {
      const start = new Date(day); start.setHours(0, 0, 0, 0);
      const end = new Date(day); end.setHours(23, 59, 59, 999);
      range.$gte = start;
      range.$lte = end;
    }
  } else {
    if (q.dateFrom) {
      const from = new Date(q.dateFrom);
      if (!Number.isNaN(from.getTime())) range.$gte = from;
    }
    if (q.dateTo) {
      const to = new Date(q.dateTo);
      if (!Number.isNaN(to.getTime())) { to.setHours(23, 59, 59, 999); range.$lte = to; }
    }
    // Hide finished events unless explicitly requested. The previous API listed
    // past events under an "Upcoming Events" heading.
    if (!range.$gte && q.includePast !== "true") range.$gte = new Date();
  }
  if (Object.keys(range).length) filter.date = range;

  // Personalised feed: restrict to the signed-in user's chosen interests.
  if (q.forYou === "true" && user && user.interests && user.interests.length) {
    filter.category = { $in: user.interests };
  }

  if (and.length) filter.$and = and;
  return filter;
}

function buildSort(sort) {
  switch (sort) {
    case "newest": return { createdAt: -1, date: 1 };
    case "priceAsc": return { "price.min": 1, date: 1 };
    default: return { date: 1 };
  }
}

/** Adds isBookmarked / isAttending / isOwner for the requesting user. */
function decorate(event, user) {
  const doc = typeof event.toObject === "function" ? event.toObject({ virtuals: true }) : event;
  const id = String(doc._id);

  doc.attendeeCount = Array.isArray(doc.attendees) ? doc.attendees.length : 0;
  doc.isPast = new Date(doc.endDate || doc.date).getTime() < Date.now();

  if (user) {
    doc.isBookmarked = (user.bookmarks || []).some((b) => String(b) === id);
    doc.isAttending = (doc.attendees || []).some((a) => String(a) === String(user._id));
    doc.isOwner = Boolean(doc.createdBy) &&
      String(doc.createdBy._id || doc.createdBy) === String(user._id);
  } else {
    doc.isBookmarked = false;
    doc.isAttending = false;
    doc.isOwner = false;
  }

  // The raw attendee list is not public information.
  delete doc.attendees;
  return doc;
}

// ---------------------------------------------------------------- read routes

router.get(
  "/events",
  optionalAuth,
  [
    query("page").optional().isInt({ min: 1 }).toInt(),
    query("limit").optional().isInt({ min: 1, max: MAX_LIMIT }).toInt(),
    query("category").optional().isIn(["All", ...CATEGORIES]),
    query("sort").optional().isIn(["date", "newest", "priceAsc"]),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const page = req.query.page || 1;
    const limit = req.query.limit || DEFAULT_LIMIT;
    const filter = buildFilter(req.query, req.user);

    const [events, total] = await Promise.all([
      Event.find(filter)
        .populate("createdBy", "name")
        .sort(buildSort(req.query.sort))
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Event.countDocuments(filter),
    ]);

    res.json({
      events: events.map((e) => decorate(e, req.user)),
      page,
      limit,
      total,
      pages: Math.ceil(total / limit) || 1,
      hasMore: page * limit < total,
    });
  })
);

/** Events created by the signed-in user. Declared before /events/:id. */
router.get(
  "/events/mine",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const events = await Event.find({ createdBy: req.user._id })
      .populate("createdBy", "name")
      .sort({ date: 1 })
      .lean();
    res.json({ events: events.map((e) => decorate(e, req.user)), total: events.length });
  })
);

router.get(
  "/events/:id",
  optionalAuth,
  [param("id").isMongoId().withMessage("Invalid event id")],
  validate,
  asyncHandler(async (req, res) => {
    const event = await Event.findById(req.params.id).populate("createdBy", "name");
    if (!event) return res.status(404).json({ error: "Event not found" });
    res.json(decorate(event, req.user));
  })
);

/** Related events: same category or city, still upcoming, nearest in time. */
router.get(
  "/events/:id/similar",
  optionalAuth,
  [param("id").isMongoId().withMessage("Invalid event id")],
  validate,
  asyncHandler(async (req, res) => {
    const event = await Event.findById(req.params.id).lean();
    if (!event) return res.status(404).json({ error: "Event not found" });

    const events = await Event.find({
      _id: { $ne: event._id },
      date: { $gte: new Date() },
      $or: [
        { category: event.category },
        ...(event.city ? [{ city: event.city }] : []),
      ],
    })
      .populate("createdBy", "name")
      .sort({ date: 1 })
      .limit(4)
      .lean();

    res.json({ events: events.map((e) => decorate(e, req.user)) });
  })
);

// --------------------------------------------------------------- write routes

const eventValidators = (optional) => {
  const maybe = (chain) => (optional ? chain.optional() : chain);
  return [
    maybe(body("name").isString().trim().isLength({ min: 3, max: 160 })
      .withMessage("Name must be between 3 and 160 characters")),
    maybe(body("date").isISO8601().withMessage("A valid start date is required")),
    maybe(body("location").isString().trim().isLength({ min: 2, max: 200 })
      .withMessage("Location must be between 2 and 200 characters")),
    body("endDate").optional({ values: "falsy" }).isISO8601()
      .withMessage("End date must be a valid date"),
    body("description").optional({ values: "falsy" }).isString().trim().isLength({ max: 5000 })
      .withMessage("Description must not exceed 5000 characters"),
    body("category").optional().isIn(CATEGORIES).withMessage("Invalid category"),
    body("city").optional({ values: "falsy" }).isString().trim().isLength({ max: 100 }),
    body("venue").optional({ values: "falsy" }).isString().trim().isLength({ max: 200 }),
    body("country").optional({ values: "falsy" }).isString().trim().isLength({ max: 100 }),
    body("url").optional({ values: "falsy" }).isURL().withMessage("Link must be a valid URL"),
    body("tags").optional().isArray({ max: 12 }).withMessage("At most 12 tags"),
    body("isOnline").optional().isBoolean().toBoolean(),
    // An IANA zone name, e.g. "Asia/Kolkata". Validated against the runtime's
    // own zone database rather than a hand-maintained list.
    body("timezone").optional({ values: "falsy" }).isString().trim().isLength({ max: 64 })
      .custom((value) => {
        try {
          new Intl.DateTimeFormat(undefined, { timeZone: value });
          return true;
        } catch {
          throw new Error("Unknown timezone");
        }
      }),
  ];
};

/** Reject an end date that precedes the start. */
function assertDateOrder(date, endDate) {
  if (!endDate) return null;
  const start = new Date(date);
  const end = new Date(endDate);
  if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end < start) {
    return "End date must be on or after the start date";
  }
  return null;
}

router.post(
  "/events",
  authMiddleware,
  writeLimiter,
  eventValidators(false),
  validate,
  asyncHandler(async (req, res) => {
    const data = pickEditable(req.body);

    const orderError = assertDateOrder(data.date, data.endDate);
    if (orderError) return res.status(400).json({ error: orderError });

    const event = await Event.create({
      ...data,
      source: "user",
      createdBy: req.user._id,
      attendees: [],
    });

    await event.populate("createdBy", "name");
    res.status(201).json(decorate(event, req.user));
  })
);

router.put(
  "/events/:id",
  authMiddleware,
  [param("id").isMongoId().withMessage("Invalid event id"), ...eventValidators(true)],
  validate,
  asyncHandler(async (req, res) => {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: "Event not found" });

    if (event.source !== "user") {
      return res.status(403).json({ error: "Events synced from partner sources cannot be edited." });
    }
    if (!event.createdBy || String(event.createdBy) !== String(req.user._id)) {
      return res.status(403).json({ error: "You can only edit events you created." });
    }

    // Only whitelisted fields are copied, so createdBy/source/attendees stay
    // under server control. Passing req.body straight through previously let a
    // caller reassign ownership and lock the real owner out.
    const updates = pickEditable(req.body);
    const orderError = assertDateOrder(
      updates.date ?? event.date,
      updates.endDate ?? event.endDate
    );
    if (orderError) return res.status(400).json({ error: orderError });

    Object.assign(event, updates);
    await event.save();
    await event.populate("createdBy", "name");

    res.json(decorate(event, req.user));
  })
);

router.delete(
  "/events/:id",
  authMiddleware,
  [param("id").isMongoId().withMessage("Invalid event id")],
  validate,
  asyncHandler(async (req, res) => {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: "Event not found" });

    if (event.source !== "user") {
      return res.status(403).json({ error: "Events synced from partner sources cannot be deleted." });
    }
    if (!event.createdBy || String(event.createdBy) !== String(req.user._id)) {
      return res.status(403).json({ error: "You can only delete events you created." });
    }

    await event.deleteOne();
    // Leave no dangling references in anyone's bookmarks.
    await mongoose.model("User").updateMany(
      { bookmarks: event._id },
      { $pull: { bookmarks: event._id } }
    );

    res.json({ message: "Event deleted successfully", id: String(event._id) });
  })
);

// --------------------------------------------------------------------- RSVP

router.post(
  "/events/:id/attend",
  authMiddleware,
  [param("id").isMongoId().withMessage("Invalid event id")],
  validate,
  asyncHandler(async (req, res) => {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: "Event not found" });

    if (new Date(event.endDate || event.date) < new Date()) {
      return res.status(400).json({ error: "This event has already taken place." });
    }

    await Event.updateOne({ _id: event._id }, { $addToSet: { attendees: req.user._id } });
    const updated = await Event.findById(event._id).select("attendees");

    res.json({ attending: true, attendeeCount: updated.attendees.length });
  })
);

router.delete(
  "/events/:id/attend",
  authMiddleware,
  [param("id").isMongoId().withMessage("Invalid event id")],
  validate,
  asyncHandler(async (req, res) => {
    const event = await Event.findById(req.params.id).select("_id");
    if (!event) return res.status(404).json({ error: "Event not found" });

    await Event.updateOne({ _id: event._id }, { $pull: { attendees: req.user._id } });
    const updated = await Event.findById(event._id).select("attendees");

    res.json({ attending: false, attendeeCount: updated.attendees.length });
  })
);

module.exports = router;
