import * as Sentry from "@sentry/node";
Sentry.init({
  dsn: process.env.SENTRY_DSN || undefined,
  environment: process.env.SENTRY_ENVIRONMENT,
});

import "dotenv/config";
import { join } from "path";
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth.js";
import { boss } from "./lib/boss.js";
import { startWorkers } from "./lib/workers.js";
import router from "./routes/index.js";

const app = express();
const PORT = process.env.PORT ?? 3000;

const allowedOrigins = [
  process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  process.env.CLIENT_URL ?? "http://localhost:5173",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);

const signInLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Try again in 15 minutes." },
});

if (!process.env.DISABLE_RATE_LIMIT) {
  app.use("/api/auth/sign-in", signInLimiter);
}

// Auth handler must be mounted before express.json()
app.all("/api/auth/*splat", toNodeHandler(auth));

app.use(express.json());

app.use("/api", router);

// Production: serve the built React app and handle client-side routing
if (process.env.NODE_ENV === "production") {
  const distPath = join(import.meta.dirname, "../../client/dist");
  app.use(express.static(distPath));
  app.use((req, res, next) => {
    if (req.path.startsWith("/api/")) return next();
    res.sendFile(join(distPath, "index.html"));
  });
}

Sentry.setupExpressErrorHandler(app);

boss.on("error", (err: Error) => {
  Sentry.captureException(err);
  console.error("[pg-boss]", err);
});

process.on("unhandledRejection", (reason) => {
  Sentry.captureException(reason);
  console.error("[unhandledRejection]", reason);
});

process.on("uncaughtException", (err) => {
  Sentry.captureException(err);
  console.error("[uncaughtException]", err);
  process.exit(1);
});

async function main() {
  await boss.start();
  await startWorkers();
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
