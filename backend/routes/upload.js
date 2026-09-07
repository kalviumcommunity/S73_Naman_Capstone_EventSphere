const express = require("express");
const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs");
const authMiddleware = require("../middleware/authMiddleware");
const { writeLimiter } = require("../middleware/rateLimit");

const router = express.Router();

// Resolved against this file, not process.cwd(). The previous relative path
// meant uploads landed outside the directory express.static serves whenever the
// server was started from the repo root.
const UPLOAD_DIR = path.join(__dirname, "..", "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Raster formats only. SVG is deliberately excluded: it can carry script and is
// served from our own origin, which would make it a stored-XSS vector.
const ALLOWED = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
  ["image/gif", ".gif"],
  ["image/avif", ".avif"],
]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    // Extension comes from the validated MIME type, never from user input.
    const ext = ALLOWED.get(file.mimetype) || ".bin";
    cb(null, `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED.has(file.mimetype)) return cb(null, true);
    const err = new Error("Only JPG, PNG, WebP, GIF or AVIF images are allowed.");
    err.status = 400;
    cb(err);
  },
});

/** Cover-image upload. Requires a signed-in user — this was previously open to anyone. */
router.post(
  "/upload",
  authMiddleware,
  writeLimiter,
  upload.single("image"),
  (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No image was uploaded." });

    res.status(201).json({
      message: "Image uploaded successfully",
      filename: req.file.filename,
      url: `/uploads/${req.file.filename}`,
    });
  }
);

module.exports = router;
