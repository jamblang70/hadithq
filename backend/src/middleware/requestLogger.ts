import type { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger.js";

/**
 * Middleware that logs each HTTP request on response finish.
 * Captures method, path, statusCode, responseTimeMs, and requestId.
 *
 * Requirements: 5.1, 10.4, 11.4
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on("finish", () => {
    const responseTimeMs = Date.now() - start;
    logger.info("request completed", {
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      responseTimeMs,
      requestId: res.locals.requestId ?? "",
    });
  });

  next();
}
