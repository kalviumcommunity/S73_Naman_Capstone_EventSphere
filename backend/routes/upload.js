const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");

// Storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});

// File filter
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) cb(null, true);
  else cb(new Error("Only image files allowed!"), false);
};

const upload = multer({ storage, fileFilter });

router.post("/upload", upload.single("image"), (req, res) => {
  res.json({
    message: "File uploaded successfully",
    filePath: req.file.path
  });
});

module.exports = router;
