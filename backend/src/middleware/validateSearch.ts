import type { Request, Response, NextFunction } from "express";
import type { SearchRequest } from "../types/index.js";
import { isValidLanguage } from "../types/index.js";

const VALID_COLLECTIONS = [
  "bukhari",
  "muslim",
  "abudawud",
  "tirmidhi",
  "nasai",
  "ibnmajah",
  "malik",
  "ahmad",
  "darimi",
] as const;

function isValidCollection(id: string): boolean {
  return (VALID_COLLECTIONS as readonly string[]).includes(id);
}

export function validateSearch(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const body = req.body ?? {};

  // Validate query: required, non-empty, max 500 chars
  const query = body.query;
  if (query === undefined || query === null || typeof query !== "string" || query.trim() === "") {
    res.status(400).json({ error: "query is required and must not be empty" });
    return;
  }
  if (query.length > 500) {
    res.status(400).json({
      error: "query must not exceed 500 characters",
    });
    return;
  }

  // Validate language (optional, default "en")
  const language = body.language ?? "en";
  if (typeof language !== "string" || !isValidLanguage(language)) {
    res.status(400).json({
      error: 'language must be one of: "ar", "id", "en"',
    });
    return;
  }

  // Validate limit (optional, default 20)
  const limit = body.limit ?? 20;
  if (typeof limit !== "number" || !Number.isInteger(limit) || limit < 1 || limit > 100) {
    res.status(400).json({
      error: "limit must be an integer between 1 and 100",
    });
    return;
  }

  // Validate offset (optional, default 0)
  const offset = body.offset ?? 0;
  if (typeof offset !== "number" || !Number.isInteger(offset) || offset < 0) {
    res.status(400).json({
      error: "offset must be a non-negative integer",
    });
    return;
  }

  // Validate min_score (optional, default 0.5)
  const minScore = body.min_score ?? 0.5;
  if (typeof minScore !== "number" || minScore < 0 || minScore > 1) {
    res.status(400).json({
      error: "min_score must be a number between 0.0 and 1.0",
    });
    return;
  }

  // Validate collections (optional, default [])
  const collections: unknown = body.collections ?? [];
  if (!Array.isArray(collections)) {
    res.status(400).json({ error: "collections must be an array" });
    return;
  }
  for (const id of collections) {
    if (typeof id !== "string" || !isValidCollection(id)) {
      res.status(400).json({
        error: `Invalid collection ID: "${id}". Valid collections are: ${VALID_COLLECTIONS.join(", ")}`,
      });
      return;
    }
  }

  // Validate grade_filter (optional, default [])
  const gradeFilter: unknown = body.grade_filter ?? [];
  if (!Array.isArray(gradeFilter)) {
    res.status(400).json({ error: "grade_filter must be an array" });
    return;
  }

  // Build validated SearchRequest and attach to request
  const searchRequest: SearchRequest = {
    query: query.trim(),
    language,
    collections: collections as string[],
    grade_filter: gradeFilter as string[],
    limit,
    offset,
    min_score: minScore,
  };

  (req as Request & { searchRequest: SearchRequest }).searchRequest = searchRequest;
  next();
}

export { VALID_COLLECTIONS };
