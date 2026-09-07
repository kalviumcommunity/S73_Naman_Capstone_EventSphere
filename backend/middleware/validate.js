const { validationResult } = require("express-validator");

/** Shared express-validator result handler — keeps the error shape consistent. */
function validate(req, res, next) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();

  const details = errors.array().map((e) => ({ field: e.path, message: e.msg }));
  return res.status(400).json({ error: details[0].message, details });
}

module.exports = validate;
