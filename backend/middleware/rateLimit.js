const rateLimit = require("express-rate-limit");
const env = require("../config/env");

// Rate limiting is ON unless explicitly switched off. Keying it to
// NODE_ENV === "production" would fail open: any host that does not set that
// variable would silently serve with no brute-force protection at all, and
// nothing in the logs would say so.
const disabled = process.env.DISABLE_RATE_LIMIT === "true";

if (disabled) {
  console.warn(
    `[security] Rate limiting is DISABLED (DISABLE_RATE_LIMIT=true)${env.isProd ? " — this is a production build." : "."}`
  );
}

const common = {
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: () => disabled,
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
