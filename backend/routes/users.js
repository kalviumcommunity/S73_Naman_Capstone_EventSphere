const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const User = require("../models/User");
const Event = require("../models/Event");
const authMiddleware = require("../middleware/authMiddleware");

// GET: Fetch user's bookmarked events
router.get("/users/:userId/bookmarks", authMiddleware, async (req, res) => {
  const { userId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ error: "Invalid User ID format" });
  }

  if (req.user.userId !== userId) {
    return res.status(403).json({ error: "Not authorized" });
  }

  try {
    const user = await User.findById(userId).populate({
      path: "bookmarks",
      populate: { path: "createdBy", select: "name email" },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json(user.bookmarks);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch bookmarks" });
  }
});

// POST: Bookmark an event
router.post(
  "/users/:userId/bookmark/:eventId",
  authMiddleware,
  async (req, res) => {
    const { userId, eventId } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(userId) ||
      !mongoose.Types.ObjectId.isValid(eventId)
    ) {
      return res
        .status(400)
        .json({ error: "Invalid User ID or Event ID format" });
    }

    if (req.user.userId !== userId) {
      return res.status(403).json({ error: "Not authorized" });
    }

    try {
      const user = await User.findById(userId);
      const event = await Event.findById(eventId);

      if (!user || !event) {
        return res.status(404).json({ error: "User or Event not found" });
      }

      await User.updateOne(
        { _id: userId },
        { $addToSet: { bookmarks: eventId } }
      );

      const updatedUser = await User.findById(userId).populate("bookmarks");

      res.status(200).json({
        message: "Event bookmarked successfully",
        bookmarks: updatedUser.bookmarks,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to bookmark event" });
    }
  }
);

// DELETE: Remove bookmark
router.delete(
  "/users/:userId/bookmark/:eventId",
  authMiddleware,
  async (req, res) => {
    const { userId, eventId } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(userId) ||
      !mongoose.Types.ObjectId.isValid(eventId)
    ) {
      return res
        .status(400)
        .json({ error: "Invalid User ID or Event ID format" });
    }

    if (req.user.userId !== userId) {
      return res.status(403).json({ error: "Not authorized" });
    }

    try {
      await User.updateOne(
        { _id: userId },
        { $pull: { bookmarks: eventId } }
      );

      const updatedUser = await User.findById(userId).populate("bookmarks");

      res.status(200).json({
        message: "Bookmark removed successfully",
        bookmarks: updatedUser.bookmarks,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to remove bookmark" });
    }
  }
);

module.exports = router;
