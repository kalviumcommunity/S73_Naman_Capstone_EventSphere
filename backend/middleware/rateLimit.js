const rateLimit = require("express-rate-limit");
const env = require("../config/env");

const common = {
  standardHeaders: "draft-7",
  legacyHeaders: false,
  // Disabled in development so local testing is not throttled.
  skip: () => !env.isProd && process.env.FORCE_RATE_LIMIT !== "true",
};

/** Broad protection for the whole API surface. */
const apiLimiter = rateLimit({
  ...common,
  windowMs: 15 * 60 * 1000,
  limit: 600,
  message: { error: "Too many requests. Please slow down and try again shortly." },
});

/** Tight limit on credential endpoints to blunt brute-force attempts. */
const authLimiter = rateLimit({
  ...common,
  windowMs: 15 * 60 * 1000,
  limit: 20,
  skipSuccessfulRequests: true,
  message: { error: "Too many sign-in attempts. Please try again in 15 minutes." },
});

/** Writes are more expensive than reads. */
const writeLimiter = rateLimit({
  ...common,
  windowMs: 60 * 60 * 1000,
  limit: 60,
  message: { error: "You are creating content too quickly. Please try again later." },
});

module.exports = { apiLimiter, authLimiter, writeLimiter };
