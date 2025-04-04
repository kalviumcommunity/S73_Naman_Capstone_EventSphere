const express = require("express");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const cors = require("cors")
const morgan = require("morgan");
const connectDB = require("./config/db");
const eventRoutes = require("./routes/events");

dotenv.config();
connectDB();

const app = express();
app.use(express.json());
app.use(cors());

app.use(morgan("dev"));

app.use("/api", eventRoutes);

app.get("/", (req, res) =>{
    res.send("Local Event Finder API is running...");
});

const PORT = process.env.PORT || 1369;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`)
})