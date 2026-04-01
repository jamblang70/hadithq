import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { adminAuth } from "./adminAuth.js";

function makeResponse(): Response {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
  } as unknown as Response;

  vi.mocked(res.status).mockReturnValue(res);
  return res;
}

describe("adminAuth middleware", () => {
  const originalApiKey = process.env.ADMIN_API_KEY;

  beforeEach(() => {
    process.env.ADMIN_API_KEY = "secret-admin-key";
  });

  afterEach(() => {
    process.env.ADMIN_API_KEY = originalApiKey;
  });

  it("rejects requests without admin credentials", () => {
    const req = { headers: {} } as Request;
    const res = makeResponse();
    const next = vi.fn() as NextFunction;

    adminAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Admin authentication required" });
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects requests with an invalid bearer token", () => {
    const req = {
      headers: { authorization: "Bearer wrong-key" },
    } as unknown as Request;
    const res = makeResponse();
    const next = vi.fn() as NextFunction;

    adminAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid admin credentials" });
    expect(next).not.toHaveBeenCalled();
  });

  it("accepts requests with a valid bearer token", () => {
    const req = {
      headers: { authorization: "Bearer secret-admin-key" },
    } as unknown as Request;
    const res = makeResponse();
    const next = vi.fn() as NextFunction;

    adminAuth(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("accepts requests with x-admin-api-key", () => {
    const req = {
      headers: { "x-admin-api-key": "secret-admin-key" },
    } as unknown as Request;
    const res = makeResponse();
    const next = vi.fn() as NextFunction;

    adminAuth(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });
});
