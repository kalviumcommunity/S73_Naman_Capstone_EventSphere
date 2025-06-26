const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Event = require("../models/Event");

// POST: Bookmark an event
router.post("/users/:userId/bookmark/:eventId", async (req, res) => {
  try {
    const { userId, eventId } = req.params;

    const user = await User.findById(userId);
    const event = await Event.findById(eventId);

    if (!user || !event) {
      return res.status(404).json({ error: "User or Event not found" });
    }

    if (!user.bookmarks.includes(eventId)) {
      user.bookmarks.push(eventId);
      await user.save();
    }

    res.status(200).json({ message: "Event bookmarked successfully", bookmarks: user.bookmarks });
  } catch (error) {
    res.status(500).json({ error: "Failed to bookmark event" });
  }
});

// GET: Get bookmarked events for a user
router.get("/users/:userId/bookmarks", async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).populate("bookmarks");

    if (!user) return res.status(404).json({ error: "User not found" });

    res.status(200).json({ bookmarks: user.bookmarks });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch bookmarks" });
  }
});

module.exports = router;
