/**
 * Structured logger — output format determined by NODE_ENV.
 *
 * Production (NODE_ENV=production): JSON lines with timestamp, level, message, and meta.
 * Development / other: human-readable text like [LEVEL] message key=value.
 *
 * Requirements: 2.2, 2.3
 */

const isProduction = process.env.NODE_ENV === "production";

function formatMeta(meta: Record<string, unknown>): string {
  return Object.entries(meta)
    .map(([k, v]) => `${k}=${typeof v === "object" ? JSON.stringify(v) : v}`)
    .join(" ");
}

function log(
  level: "info" | "warn" | "error",
  message: string,
  meta?: Record<string, unknown>,
): void {
  const consoleFn =
    level === "error"
      ? console.error
      : level === "warn"
        ? console.warn
        : console.log;

  if (isProduction) {
    const entry: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...meta,
    };
    consoleFn(JSON.stringify(entry));
  } else {
    const tag = `[${level.toUpperCase()}]`;
    const suffix = meta && Object.keys(meta).length > 0 ? ` ${formatMeta(meta)}` : "";
    consoleFn(`${tag} ${message}${suffix}`);
  }
}

export const logger = {
  info: (message: string, meta?: Record<string, unknown>): void => log("info", message, meta),
  warn: (message: string, meta?: Record<string, unknown>): void => log("warn", message, meta),
  error: (message: string, meta?: Record<string, unknown>): void => log("error", message, meta),
};
