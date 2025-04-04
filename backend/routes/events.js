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

module.exports = router;

