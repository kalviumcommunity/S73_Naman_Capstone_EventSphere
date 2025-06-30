const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const User = require("../models/User");
const Event = require("../models/Event");

// POST: Bookmark an event
router.post("/users/:userId/bookmark/:eventId", async (req, res) => {
  const { userId, eventId } = req.params;

  // Validate ObjectId format
  if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(eventId)) {
    return res.status(400).json({ error: "Invalid User ID or Event ID format" });
  }

  try {
    const user = await User.findById(userId);
    const event = await Event.findById(eventId);

    if (!user || !event) {
      return res.status(404).json({ error: "User or Event not found" });
    }

    // Use $addToSet to avoid duplicates
    await User.updateOne(
      { _id: userId },
      { $addToSet: { bookmarks: eventId } }
    );

    const updatedUser = await User.findById(userId).populate("bookmarks");

    res.status(200).json({ message: "Event bookmarked successfully", bookmarks: updatedUser.bookmarks });
  } catch (error) {
    res.status(500).json({ error: "Failed to bookmark event" });
  }
});


module.exports = router; 
