const express = require("express");
const router = express.Router();
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
router.post("/events", async (req, res) => {
    try {
      const { name, date, location, description } = req.body;
  
      if (!name || !date || !location) {
        return res.status(400).json({ error: "Name, date, and location are required." });
      }
  
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
  });

  

module.exports = router;

