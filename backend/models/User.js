const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const { CATEGORIES } = require("./Event");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 60 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        "Please enter a valid email address",
      ],
    },
    // Never returned by default — callers must opt in with .select("+password").
    password: { type: String, required: true, minlength: 6, select: false },

    // Powers the personalised "For You" feed.
    interests: [{ type: String, enum: CATEGORIES }],
    city: { type: String, trim: true, maxlength: 100 },
    bio: { type: String, trim: true, maxlength: 280 },

    bookmarks: [{ type: mongoose.Schema.Types.ObjectId, ref: "Event" }],
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    this.password = await bcrypt.hash(this.password, 10);
    next();
  } catch (err) {
    next(err);
  }
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

/** The shape sent to clients — never includes the password hash. */
userSchema.methods.toPublicJSON = function () {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    interests: this.interests || [],
    city: this.city || "",
    bio: this.bio || "",
    bookmarkCount: Array.isArray(this.bookmarks) ? this.bookmarks.length : 0,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model("User", userSchema);
