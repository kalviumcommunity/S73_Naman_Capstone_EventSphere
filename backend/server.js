const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");
const connectDB = require("./config/db");
const eventRoutes = require("./routes/events");
const userRoutes = require("./routes/users");
const uploadRoutes = require("./routes/upload");
const authRoutes = require("./routes/auth");

dotenv.config();
connectDB();

const app = express();

// Middleware
app.use(express.json());
app.use(cors());
app.use(morgan("dev"));

// Serve uploaded files as static
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// API Routes
app.use("/api", eventRoutes);
app.use("/api", uploadRoutes);
app.use("/api", userRoutes);
app.use("/api/auth", authRoutes);

// Serve frontend in production
const clientDistPath = path.join(__dirname, "..", "client", "dist");
app.use(express.static(clientDistPath));

// SPA fallback — any non-API route serves index.html
app.get("*", (req, res) => {
    res.sendFile(path.join(clientDistPath, "index.html"));
});

// Global error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: "Something went wrong!" });
});

const PORT = process.env.PORT || 1369;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});