const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    minlength: 3,
    maxlength: 100,
  },
  date: {
    type: Date,
    required: true,
  },
  location: {
    type: String,
    required: true,
    minlength: 2,
    maxlength: 100,
  },
  description: {
    type: String,
    maxlength: 300,
  },
});

module.exports = mongoose.model("Event", eventSchema);
