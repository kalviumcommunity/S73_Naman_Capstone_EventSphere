const express = require("express");
const router = express.Router();
const { body, validationResult } = require("express-validator");
const Event = require("../models/Event");  



// GET all events
router.get("/events", async (req, res) =>{
    try{
        const events = await Event.find();
        res.status(200).json(events);
    } catch(error) {
        res.status(500).json({ error: "Error fetching events"});
    }
});


// GET a single event by ID 
router.get("/events/:id", async (req, res) =>{
    try{
        const event = await Event.findById(req.params.id);
        if(!event) return res.status(404).json({ error: "Event not found" });

        res.status(200).json(event);
    }catch(error){
        res.status(500).json({ error: "Error fetching event" });
    }
});


// POST: Create a new event
router.post(
    "/events",
    [
      body("name")
        .isString().withMessage("Name must be a string")
        .trim()
        .notEmpty().withMessage("Name is required")
        .isLength({ min: 3, max: 100 }).withMessage("Name must be between 3 and 100 characters"),
  
      body("location")
        .isString().withMessage("Location must be a string")
        .trim()
        .notEmpty().withMessage("Location is required")
        .isLength({ min: 2, max: 100 }).withMessage("Location must be between 2 and 100 characters"),
  
      body("date")
        .notEmpty().withMessage("Date is required")
        .isISO8601().withMessage("Date must be in ISO 8601 format (YYYY-MM-DD)"),
  
      body("description")
        .optional()
        .isString().withMessage("Description must be a string")
        .trim()
        .isLength({ max: 300 }).withMessage("Description must not exceed 300 characters"),
    ],
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
  
      try {
        const { name, date, location, description } = req.body;
  
        const newEvent = new Event({
          name,
          date,
          location,
          description,
        });
  
        const savedEvent = await newEvent.save();
        res.status(201).json(savedEvent);
      } catch (error) {
        res.status(500).json({ error: "Failed to create event." });
      }
    }
  );
  

module.exports = router;

