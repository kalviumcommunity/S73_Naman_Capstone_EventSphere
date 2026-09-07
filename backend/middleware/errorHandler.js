const env = require("../config/env");

/** JSON 404 for unmatched /api routes — must be registered before the SPA fallback. */
function apiNotFound(req, res) {
  res.status(404).json({ error: `No API route for ${req.method} ${req.originalUrl}` });
}

/** Translates known error shapes into clean JSON; never leaks stack traces in production. */
function errorHandler(err, req, res, _next) {
  // Mongoose validation
  if (err.name === "ValidationError") {
    return res.status(400).json({
      error: "Validation failed",
      details: Object.values(err.errors).map((e) => ({ field: e.path, message: e.message })),
    });
  }

  // Bad ObjectId in a path parameter
  if (err.name === "CastError") {
    return res.status(400).json({ error: `Invalid ${err.path}: ${err.value}` });
  }

  // Duplicate key (e.g. registering an existing email)
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || { field: 1 })[0];
    return res.status(409).json({ error: `That ${field} is already in use.` });
  }

  // Multer upload failures
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ error: "Image is too large. Maximum size is 2MB." });
  }
  if (err.code && String(err.code).startsWith("LIMIT_")) {
    return res.status(400).json({ error: err.message });
  }

  const status = err.status || err.statusCode || 500;
  if (status >= 500) console.error("[error]", err);

  res.status(status).json({
    error: status >= 500 && env.isProd ? "Something went wrong." : err.message,
    ...(env.isProd ? {} : { stack: err.stack }),
  });
}

/** Wraps an async route handler so rejections reach the error middleware. */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { apiNotFound, errorHandler, asyncHandler };
