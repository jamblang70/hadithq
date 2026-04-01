/**
 * Validate that all required environment variables are set at startup.
 * Exits the process with code 1 if any are missing.
 *
 * Requirements: 11.1, 11.2
 */

import { logger } from "./logger.js";

const REQUIRED_VARS = [
  "DATABASE_URL",
  "QDRANT_URL",
  "OPENAI_API_KEY",
] as const;

export function validateEnv(): void {
  const missing = REQUIRED_VARS.filter((v) => !process.env[v]);

  if (missing.length > 0) {
    logger.error(`Missing required environment variables: ${missing.join(", ")}`);
    process.exit(1);
  }
}
