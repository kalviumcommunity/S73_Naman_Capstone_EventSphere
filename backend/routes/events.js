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
      body("name").isString().trim().notEmpty().withMessage("Name is required"),
      body("location").isString().trim().notEmpty().withMessage("Location is required"),
      body("date").isISO8601().withMessage("Date must be in ISO 8601 format (YYYY-MM-DD)"),
      body("description").optional().isString().trim(),
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

