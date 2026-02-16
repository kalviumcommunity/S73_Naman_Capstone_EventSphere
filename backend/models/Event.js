const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
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
      maxlength: 500,
    },
    category: {
      type: String,
      enum: ["Music", "Sports", "Tech", "Art", "Food", "Business", "Other"],
      default: "Other",
    },
    image: {
      type: String,
      default: "",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

// Text index for keyword search
eventSchema.index({ name: "text", description: "text", location: "text" });

module.exports = mongoose.model("Event", eventSchema);
