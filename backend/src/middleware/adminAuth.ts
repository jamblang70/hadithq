import type { Request, Response, NextFunction } from "express";

function getTokenFromHeader(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    return authHeader.slice("Bearer ".length).trim() || null;
  }

  const apiKeyHeader = req.headers["x-admin-api-key"];
  if (typeof apiKeyHeader === "string" && apiKeyHeader.trim().length > 0) {
    return apiKeyHeader.trim();
  }

  return null;
}

export function adminAuth(req: Request, res: Response, next: NextFunction): void {
  const expectedApiKey = process.env.ADMIN_API_KEY;
  const providedToken = getTokenFromHeader(req);

  if (!expectedApiKey) {
    res.status(503).json({ error: "Admin endpoint is not configured" });
    return;
  }

  if (!providedToken) {
    res.status(401).json({ error: "Admin authentication required" });
    return;
  }

  if (!expectedApiKey || providedToken !== expectedApiKey) {
    res.status(403).json({ error: "Invalid admin credentials" });
    return;
  }

  next();
}
