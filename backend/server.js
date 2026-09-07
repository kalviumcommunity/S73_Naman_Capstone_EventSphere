const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const path = require("path");
const fs = require("fs");

const env = require("./config/env");
const connectDB = require("./config/db");
const { apiNotFound, errorHandler } = require("./middleware/errorHandler");
const { apiLimiter } = require("./middleware/rateLimit");
const scheduler = require("./services/scheduler");

const app = express();

// Render/Heroku style proxies terminate TLS upstream; without this the rate
// limiter sees every request as coming from the same address.
app.set("trust proxy", 1);

// ------------------------------------------------------------------ security

app.use(
  helmet({
    // The SPA is served from this same origin and pulls covers from provider
    // CDNs, so the default img-src 'self' would blank every card.
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'self'"],
      },
    },
    // Provider images are hot-linked from other origins.
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// Empty allowlist => same-origin only, which is what the unified deploy needs.
app.use(
  cors({
    origin: env.CORS_ORIGINS.length ? env.CORS_ORIGINS : true,
    credentials: true,
  })
);

app.use(compression());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(morgan(env.isProd ? "combined" : "dev"));

// --------------------------------------------------------------- static files

app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"), {
    maxAge: "7d",
    // Never let an uploaded file be interpreted as markup by the browser.
    setHeaders: (res) => {
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Content-Disposition", "inline");
    },
  })
);

// ---------------------------------------------------------------- API routes

app.use("/api", apiLimiter);
app.use("/api/auth", require("./routes/auth"));
app.use("/api", require("./routes/meta"));
app.use("/api", require("./routes/events"));
app.use("/api", require("./routes/users"));
app.use("/api", require("./routes/upload"));

// Unmatched API paths must return JSON. Previously they fell through to the SPA
// fallback below and answered 200 with index.html.
app.use("/api", apiNotFound);

// ------------------------------------------------------- SPA (production build)

const clientDist = path.join(__dirname, "..", "client", "dist");
const hasBuild = fs.existsSync(path.join(clientDist, "index.html"));

if (hasBuild) {
  app.use(
    express.static(clientDist, {
      // Hashed asset filenames can be cached hard; index.html must not be.
      setHeaders: (res, filePath) => {
        if (filePath.endsWith("index.html")) {
          res.setHeader("Cache-Control", "no-cache");
        }
      },
      maxAge: "1y",
      index: false,
    })
  );

  app.get("*", (req, res) => res.sendFile(path.join(clientDist, "index.html")));
} else {
  app.get("*", (req, res) =>
    res.status(503).send(
      "<h1>EventSphere API is running</h1>" +
        "<p>No client build found. Run <code>npm run build</code>, " +
        "or start the Vite dev server with <code>npm run dev:client</code>.</p>"
    )
  );
}

// The error handler must be registered last, after every route. It previously
// sat behind the catch-all and was therefore unreachable.
app.use(errorHandler);

// ------------------------------------------------------------------ lifecycle

async function start() {
  await connectDB();

  const server = app.listen(env.PORT, () => {
    console.log(`EventSphere API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
    if (!hasBuild) console.log("No client build found — serving API only.");
  });

  // Without this, a busy port surfaces as an unhandled 'error' event and a raw
  // stack trace instead of something actionable.
  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(
        `Port ${env.PORT} is already in use. Stop the other process, or set PORT in backend/.env.`
      );
    } else if (err.code === "EACCES") {
      console.error(`Not allowed to bind port ${env.PORT}. Try a port above 1024.`);
    } else {
      console.error("Server failed to start:", err.message);
    }
    process.exit(1);
  });

  scheduler.start();

  const shutdown = (signal) => {
    console.log(`\n${signal} received — shutting down.`);
    server.close(() => {
      require("mongoose").connection.close(false).then(() => process.exit(0));
    });
    // Do not hang forever on lingering sockets.
    setTimeout(() => process.exit(1), 10000).unref();
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

if (require.main === module) {
  start().catch((err) => {
    console.error("Failed to start server:", err);
    process.exit(1);
  });
}

module.exports = app;
