import "dotenv/config";
import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import { validateEnv } from "./utils/validateEnv.js";
import { logger } from "./utils/logger.js";
import { requestId } from "./middleware/requestId.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { errorHandler } from "./middleware/errorHandler.js";
import pool from "./db/pool.js";
import qdrantClient from "./db/qdrant.js";
import apiRouter from "./routes/api.js";

// Validate required environment variables before anything else
validateEnv();

const app = express();
const PORT = process.env.PORT || 3000;

// Security headers
app.use(helmet());

// Request ID — early in chain so all downstream middleware/routes have it
app.use(requestId);

// Request logger — after requestId so it can log the ID
app.use(requestLogger);

// Compression — compress responses > 1KB when client accepts gzip
app.use(compression({ threshold: 1024 }));

// CORS — read ALLOWED_ORIGINS env var (comma-separated).
// In development without ALLOWED_ORIGINS, default to http://localhost:5173.
const allowedOrigins: string[] = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean)
  : process.env.NODE_ENV !== "production"
    ? ["http://localhost:5173"]
    : [];

app.use(
  cors({
    origin(origin, callback) {
      // Allow requests with no origin (e.g. server-to-server, curl)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        // Don't pass an error — just don't set CORS headers
        callback(null, false);
      }
    },
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  })
);

// Body parsing
app.use(express.json());

// Basic XSS input sanitization
function sanitizeValue(value: unknown): unknown {
  if (typeof value === "string") {
    return value.replace(/[<>]/g, "");
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  if (value !== null && typeof value === "object") {
    const sanitized: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      sanitized[k] = sanitizeValue(v);
    }
    return sanitized;
  }
  return value;
}

app.use((req: Request, _res: Response, next: NextFunction) => {
  if (req.body && typeof req.body === "object") {
    req.body = sanitizeValue(req.body);
  }
  next();
});

// Rate limiting: 60 requests per minute per IP
const limiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
  handler: (_req: Request, res: Response) => {
    res.status(429).json({ error: "Too many requests, please try again later" });
  },
});
app.use("/api", limiter);

// Enhanced health check — checks PostgreSQL and Qdrant connections
app.get("/api/health", async (_req: Request, res: Response) => {
  let dbStatus: "connected" | "disconnected" = "disconnected";
  let vectorDbStatus: "connected" | "disconnected" = "disconnected";

  try {
    await pool.query("SELECT 1");
    dbStatus = "connected";
  } catch {
    logger.error("Health check: PostgreSQL connection failed");
  }

  try {
    await qdrantClient.collectionExists("hadith_embeddings");
    vectorDbStatus = "connected";
  } catch {
    logger.error("Health check: Qdrant connection failed");
  }

  const bothConnected = dbStatus === "connected" && vectorDbStatus === "connected";
  const bothDisconnected = dbStatus === "disconnected" && vectorDbStatus === "disconnected";
  const status = bothConnected ? "ok" : bothDisconnected ? "error" : "degraded";

  res.json({
    status,
    services: {
      database: dbStatus,
      vectorDb: vectorDbStatus,
    },
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.use("/api", apiRouter);

// Global error handler — consistent JSON format, sanitized in production
app.use(errorHandler);

// Start server and store reference for graceful shutdown
const server = app.listen(PORT, () => {
  logger.info("Server started", { port: Number(PORT) });
});

// Graceful shutdown handler
function shutdown(signal: string): void {
  logger.info(`Received ${signal}, shutting down gracefully...`);

  // Force exit after 10 seconds
  const forceTimeout = setTimeout(() => {
    logger.error("Forced shutdown after 10s timeout");
    process.exit(1);
  }, 10_000);
  forceTimeout.unref();

  // Stop accepting new connections
  server.close(async () => {
    logger.info("HTTP server closed");

    try {
      await pool.end();
      logger.info("Database pool closed");
    } catch (err) {
      logger.error("Error closing database pool", {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    logger.info("Shutdown complete");
    process.exit(0);
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

export default app;
export { server };
