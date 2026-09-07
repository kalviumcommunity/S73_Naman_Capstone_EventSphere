const express = require("express");
const { body, param } = require("express-validator");
const User = require("../models/User");
const Event = require("../models/Event");
const { CATEGORIES } = require("../models/Event");
const authMiddleware = require("../middleware/authMiddleware");
const validate = require("../middleware/validate");
const { asyncHandler } = require("../middleware/errorHandler");

const router = express.Router();

/**
 * Bookmark routes previously took a :userId and compared it to the token.
 * The token already identifies the user, so the parameter was redundant and
 * easy to get wrong. These routes act on the authenticated user only; the
 * legacy :userId shape is still accepted below for backwards compatibility.
 */

const bookmarkList = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate({
    path: "bookmarks",
    populate: { path: "createdBy", select: "name" },
    options: { sort: { date: 1 } },
  });

  const events = (user.bookmarks || []).map((e) => {
    const doc = e.toObject({ virtuals: true });
    doc.isBookmarked = true;
    doc.attendeeCount = Array.isArray(doc.attendees) ? doc.attendees.length : 0;
    doc.isAttending = (doc.attendees || []).some((a) => String(a) === String(req.user._id));
    doc.isOwner = Boolean(doc.createdBy) &&
      String(doc.createdBy._id || doc.createdBy) === String(req.user._id);
    doc.isPast = new Date(doc.endDate || doc.date).getTime() < Date.now();
    delete doc.attendees;
    return doc;
  });

  res.json({ events, total: events.length });
});

const addBookmark = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  if (!(await Event.exists({ _id: eventId }))) {
    return res.status(404).json({ error: "Event not found" });
  }

  await User.updateOne({ _id: req.user._id }, { $addToSet: { bookmarks: eventId } });
  const count = await User.findById(req.user._id).select("bookmarks");

  res.json({ bookmarked: true, bookmarkCount: count.bookmarks.length, eventId });
});

const removeBookmark = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  await User.updateOne({ _id: req.user._id }, { $pull: { bookmarks: eventId } });
  const count = await User.findById(req.user._id).select("bookmarks");

  res.json({ bookmarked: false, bookmarkCount: count.bookmarks.length, eventId });
});

const eventIdParam = [param("eventId").isMongoId().withMessage("Invalid event id")];

// Current shape — the token identifies the user.
router.get("/me/bookmarks", authMiddleware, bookmarkList);
router.post("/me/bookmarks/:eventId", authMiddleware, eventIdParam, validate, addBookmark);
router.delete("/me/bookmarks/:eventId", authMiddleware, eventIdParam, validate, removeBookmark);

/** Ensure a legacy :userId path really is the caller before proceeding. */
const assertSelf = (req, res, next) => {
  if (String(req.user._id) !== req.params.userId) {
    return res.status(403).json({ error: "Not authorized" });
  }
  next();
};

const legacyParams = [
  param("userId").isMongoId().withMessage("Invalid user id"),
];

// Legacy shape, kept so older clients keep working.
router.get("/users/:userId/bookmarks", authMiddleware, legacyParams, validate, assertSelf, bookmarkList);
router.post("/users/:userId/bookmark/:eventId", authMiddleware, [...legacyParams, ...eventIdParam], validate, assertSelf, addBookmark);
router.delete("/users/:userId/bookmark/:eventId", authMiddleware, [...legacyParams, ...eventIdParam], validate, assertSelf, removeBookmark);

// ------------------------------------------------------------------ profile

router.get(
  "/me",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const [createdCount, attendingCount] = await Promise.all([
      Event.countDocuments({ createdBy: req.user._id }),
      Event.countDocuments({ attendees: req.user._id }),
    ]);

    res.json({ user: { ...req.user.toPublicJSON(), createdCount, attendingCount } });
  })
);

router.patch(
  "/me",
  authMiddleware,
  [
    body("name").optional().isString().trim().isLength({ min: 2, max: 60 })
      .withMessage("Name must be between 2 and 60 characters"),
    body("city").optional({ values: "falsy" }).isString().trim().isLength({ max: 100 }),
    body("bio").optional({ values: "falsy" }).isString().trim().isLength({ max: 280 })
      .withMessage("Bio must not exceed 280 characters"),
    body("interests").optional().isArray({ max: 7 }).withMessage("At most 7 interests"),
    body("interests.*").optional().isIn(CATEGORIES).withMessage("Unknown interest"),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { name, city, bio, interests } = req.body;

    if (name !== undefined) req.user.name = name;
    if (city !== undefined) req.user.city = city;
    if (bio !== undefined) req.user.bio = bio;
    if (interests !== undefined) req.user.interests = [...new Set(interests)];

    await req.user.save();
    res.json({ user: req.user.toPublicJSON() });
  })
);

/** Events the user has RSVP'd to. */
router.get(
  "/me/attending",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const events = await Event.find({ attendees: req.user._id })
      .populate("createdBy", "name")
      .sort({ date: 1 })
      .lean();

    const decorated = events.map((doc) => {
      doc.attendeeCount = Array.isArray(doc.attendees) ? doc.attendees.length : 0;
      doc.isAttending = true;
      doc.isBookmarked = (req.user.bookmarks || []).some((b) => String(b) === String(doc._id));
      doc.isOwner = Boolean(doc.createdBy) &&
        String(doc.createdBy._id || doc.createdBy) === String(req.user._id);
      doc.isPast = new Date(doc.endDate || doc.date).getTime() < Date.now();
      delete doc.attendees;
      return doc;
    });

    res.json({ events: decorated, total: decorated.length });
  })
);

module.exports = router;
