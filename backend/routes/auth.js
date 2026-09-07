const express = require("express");
const jwt = require("jsonwebtoken");
const { body } = require("express-validator");
const User = require("../models/User");
const env = require("../config/env");
const validate = require("../middleware/validate");
const authMiddleware = require("../middleware/authMiddleware");
const { asyncHandler } = require("../middleware/errorHandler");
const { authLimiter } = require("../middleware/rateLimit");

const router = express.Router();

const signToken = (user) =>
  jwt.sign({ userId: user._id }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });

router.post(
  "/register",
  authLimiter,
  [
    body("name").isString().trim().isLength({ min: 2, max: 60 })
      .withMessage("Name must be between 2 and 60 characters"),
    body("email").isEmail().withMessage("Please enter a valid email address")
      .normalizeEmail({ gmail_remove_dots: false }),
    body("password").isLength({ min: 6, max: 128 })
      .withMessage("Password must be at least 6 characters"),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { name, email, password } = req.body;

    if (await User.exists({ email })) {
      return res.status(409).json({ error: "An account with that email already exists." });
    }

    const user = await User.create({ name, email, password });

    // Return a token straight away — no second round-trip through the login form.
    res.status(201).json({ token: signToken(user), user: user.toPublicJSON() });
  })
);

router.post(
  "/login",
  authLimiter,
  [
    body("email").isEmail().withMessage("Please enter a valid email address")
      .normalizeEmail({ gmail_remove_dots: false }),
    body("password").isString().notEmpty().withMessage("Password is required"),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // password is select:false on the schema, so opt in explicitly.
    const user = await User.findOne({ email }).select("+password");

    // Same message either way, so the response cannot be used to enumerate accounts.
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    res.json({ token: signToken(user), user: user.toPublicJSON() });
  })
);

/** Lets the client validate a stored token on boot and refresh the cached profile. */
router.get(
  "/me",
  authMiddleware,
  asyncHandler(async (req, res) => {
    res.json({ user: req.user.toPublicJSON() });
  })
);

module.exports = router;
