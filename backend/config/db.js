const mongoose = require("mongoose");
const env = require("./env");

mongoose.set("strictQuery", true);

/**
 * Connect to MongoDB and make sure declared indexes exist.
 *
 * Index creation is awaited in development (so a schema change is reflected
 * immediately) but only kicked off in production, where a large collection can
 * take a while to build and must not delay the server accepting traffic.
 */
async function connectDB() {
  try {
    const conn = await mongoose.connect(env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
      maxPoolSize: 10,
    });

    console.log(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);

    const syncAll = Promise.all([
      require("../models/Event").syncIndexes(),
      require("../models/User").syncIndexes(),
      require("../models/SyncLog").syncIndexes(),
    ]);

    if (env.isProd) {
      syncAll.catch((err) => console.error("[db] Index sync failed:", err.message));
    } else {
      await syncAll;
    }

    mongoose.connection.on("error", (err) =>
      console.error("[db] Connection error:", err.message)
    );
    mongoose.connection.on("disconnected", () =>
      console.warn("[db] Disconnected — the driver will retry automatically.")
    );

    return conn;
  } catch (error) {
    console.error(`[db] Could not connect to MongoDB: ${error.message}`);
    console.error("[db] Check MONGO_URI in backend/.env and that the server is reachable.");
    process.exit(1);
  }
}

module.exports = connectDB;
