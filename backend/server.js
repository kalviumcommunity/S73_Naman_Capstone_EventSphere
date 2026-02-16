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
app.use(
    cors({
        origin: process.env.CLIENT_URL || "http://localhost:5173",
        credentials: true,
    })
);
app.use(morgan("dev"));

// Serve uploaded files as static
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes
app.use("/api", eventRoutes);
app.use("/api", uploadRoutes);
app.use("/api", userRoutes);
app.use("/api/auth", authRoutes);

app.get("/", (req, res) => {
    res.send("EventSphere API is running...");
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