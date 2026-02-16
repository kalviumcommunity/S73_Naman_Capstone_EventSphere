const express = require("express");
const router = express.Router();
const { body, validationResult } = require("express-validator");
const Event = require("../models/Event");
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");

// GET all events (with search/filter support)
router.get("/events", async (req, res) => {
  try {
    const { keyword, category, date, location } = req.query;
    const filter = {};

    if (keyword) {
      filter.$or = [
        { name: { $regex: keyword, $options: "i" } },
        { description: { $regex: keyword, $options: "i" } },
      ];
    }

    if (category && category !== "All") {
      filter.category = category;
    }

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      filter.date = { $gte: startOfDay, $lte: endOfDay };
    }

    if (location) {
      filter.location = { $regex: location, $options: "i" };
    }

    const events = await Event.find(filter)
      .populate("createdBy", "name email")
      .sort({ date: 1 });

    res.status(200).json(events);
  } catch (error) {
    res.status(500).json({ error: "Error fetching events" });
  }
});

// GET a single event by ID
router.get("/events/:id", async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).populate(
      "createdBy",
      "name email"
    );
    if (!event) return res.status(404).json({ error: "Event not found" });

    res.status(200).json(event);
  } catch (error) {
    res.status(500).json({ error: "Error fetching event" });
  }
});

// POST: Create a new event (protected)
router.post(
  "/events",
  authMiddleware,
  [
    body("name")
      .isString()
      .withMessage("Name must be a string")
      .trim()
      .notEmpty()
      .withMessage("Name is required")
      .isLength({ min: 3, max: 100 })
      .withMessage("Name must be between 3 and 100 characters"),

    body("location")
      .isString()
      .withMessage("Location must be a string")
      .trim()
      .notEmpty()
      .withMessage("Location is required")
      .isLength({ min: 2, max: 100 })
      .withMessage("Location must be between 2 and 100 characters"),

    body("date")
      .notEmpty()
      .withMessage("Date is required")
      .isISO8601()
      .withMessage("Date must be in ISO 8601 format (YYYY-MM-DD)"),

    body("description")
      .optional()
      .isString()
      .withMessage("Description must be a string")
      .trim()
      .isLength({ max: 500 })
      .withMessage("Description must not exceed 500 characters"),

    body("category")
      .optional()
      .isIn(["Music", "Sports", "Tech", "Art", "Food", "Business", "Other"])
      .withMessage("Invalid category"),
  ],

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { name, date, location, description, category, image } = req.body;

      const newEvent = new Event({
        name,
        date,
        location,
        description,
        category: category || "Other",
        image: image || "",
        createdBy: req.user.userId,
      });

      const savedEvent = await newEvent.save();
      const populated = await savedEvent.populate("createdBy", "name email");
      res.status(201).json(populated);
    } catch (error) {
      res.status(500).json({ error: "Failed to create event." });
    }
  }
);

// PUT: Update an existing event (protected)
router.put(
  "/events/:id",
  authMiddleware,
  [
    body("name")
      .optional()
      .isString()
      .withMessage("Name must be a string")
      .trim()
      .isLength({ min: 3, max: 100 })
      .withMessage("Name must be between 3 and 100 characters"),

    body("location")
      .optional()
      .isString()
      .withMessage("Location must be a string")
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage("Location must be between 2 and 100 characters"),

    body("date")
      .optional()
      .isISO8601()
      .withMessage("Date must be in ISO 8601 format (YYYY-MM-DD)"),

    body("description")
      .optional()
      .isString()
      .withMessage("Description must be a string")
      .trim()
      .isLength({ max: 500 })
      .withMessage("Description must not exceed 500 characters"),

    body("category")
      .optional()
      .isIn(["Music", "Sports", "Tech", "Art", "Food", "Business", "Other"])
      .withMessage("Invalid category"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const event = await Event.findById(req.params.id);
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }

      // Only the creator can update the event
      if (event.createdBy.toString() !== req.user.userId) {
        return res
          .status(403)
          .json({ error: "Not authorized to update this event" });
      }

      const updatedEvent = await Event.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      ).populate("createdBy", "name email");

      res.status(200).json(updatedEvent);
    } catch (error) {
      res.status(500).json({ error: "Failed to update event" });
    }
  }
);

// DELETE: Delete an event (protected)
router.delete("/events/:id", authMiddleware, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    // Only the creator can delete the event
    if (event.createdBy.toString() !== req.user.userId) {
      return res
        .status(403)
        .json({ error: "Not authorized to delete this event" });
    }

    await Event.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Event deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete event" });
  }
});

module.exports = router;