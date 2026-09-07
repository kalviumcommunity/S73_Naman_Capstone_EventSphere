const jwt = require("jsonwebtoken");
const env = require("../config/env");
const User = require("../models/User");

function readToken(req) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) return null;
  const token = header.slice(7).trim();
  return token || null;
}

/**
 * Verifies the JWT and loads the user. Loading the document (rather than
 * trusting the token payload alone) means a deleted account stops working
 * immediately instead of staying valid until the token expires.
 */
async function authMiddleware(req, res, next) {
  const token = readToken(req);
  if (!token) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: "Account no longer exists." });
    }
    req.user = user;
    req.userId = String(user._id);
    next();
  } catch (err) {
    const expired = err.name === "TokenExpiredError";
    return res.status(401).json({
      error: expired ? "Session expired. Please sign in again." : "Invalid token.",
      code: expired ? "TOKEN_EXPIRED" : "TOKEN_INVALID",
    });
  }
}

/**
 * Attaches req.user when a valid token is present but never rejects.
 * Lets public endpoints personalise responses (e.g. isBookmarked) for signed-in
 * visitors while staying open to anonymous ones.
 */
async function optionalAuth(req, res, next) {
  const token = readToken(req);
  if (!token) return next();

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (user) {
      req.user = user;
      req.userId = String(user._id);
    }
  } catch {
    // An invalid token on a public route is simply treated as anonymous.
  }
  next();
}

module.exports = authMiddleware;
module.exports.authMiddleware = authMiddleware;
module.exports.optionalAuth = optionalAuth;
