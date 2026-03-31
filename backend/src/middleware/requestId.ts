import { randomUUID } from "node:crypto";
import type { Request, Response, NextFunction } from "express";

/**
 * Middleware that generates a UUID v4 request ID for each incoming request.
 * Stores it in res.locals.requestId and sets the X-Request-Id response header.
 *
 * Requirements: 5.2, 11.4
 */
export function requestId(req: Request, res: Response, next: NextFunction): void {
  const id = randomUUID();
  res.locals.requestId = id;
  res.setHeader("X-Request-Id", id);
  next();
}
