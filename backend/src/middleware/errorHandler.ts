import type { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger.js";

const isProduction = process.env.NODE_ENV === "production";

/**
 * Patterns used to detect sensitive information that must not leak in production.
 */
const STACK_TRACE_PATTERN = /\s+at\s+.+\(.+\)/;
const FILE_PATH_PATTERN = /(?:[A-Za-z]:)?[/\\][\w./\\-]+\.\w+/;
const ENV_VAR_PATTERN = /[A-Z_]{3,}=/;

function sanitize(message: string): string {
  if (
    STACK_TRACE_PATTERN.test(message) ||
    FILE_PATH_PATTERN.test(message) ||
    ENV_VAR_PATTERN.test(message)
  ) {
    return "An unexpected error occurred";
  }
  return message;
}

/**
 * Global Express error handler.
 * Returns a consistent JSON shape: { error, requestId, statusCode }.
 *
 * In production: sanitises error messages — no stack traces, file paths, or env var names.
 * In development: includes error.message and stack for debugging.
 *
 * Requirements: 5.3, 5.4, 11.3
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const requestId: string = (res.locals.requestId as string) ?? "";
  const statusCode =
    typeof (err as Error & { statusCode?: number }).statusCode === "number"
      ? (err as Error & { statusCode?: number }).statusCode!
      : res.statusCode >= 400
        ? res.statusCode
        : 500;

  // Always log the full error server-side
  logger.error("unhandled error", {
    requestId,
    error: err.message,
    stack: err.stack,
    statusCode,
  });

  if (isProduction) {
    res.status(statusCode).json({
      error: sanitize(err.message),
      requestId,
      statusCode,
    });
  } else {
    res.status(statusCode).json({
      error: err.message,
      requestId,
      statusCode,
      stack: err.stack,
    });
  }
}
