import { describe, it, expect, vi } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { validateSearch, VALID_COLLECTIONS } from "./validateSearch.js";

function createMockReqRes(body: Record<string, unknown> = {}) {
  const req = { body } as Request;
  const json = vi.fn();
  const status = vi.fn(() => ({ json })) as unknown as Response["status"];
  const res = { status, json } as unknown as Response;
  const next = vi.fn() as NextFunction;
  return { req, res, next, status, json };
}

describe("validateSearch middleware", () => {
  it("passes valid request with defaults", () => {
    const { req, res, next } = createMockReqRes({ query: "patience" });
    validateSearch(req, res, next);
    expect(next).toHaveBeenCalled();
    const sr = (req as any).searchRequest;
    expect(sr.query).toBe("patience");
    expect(sr.language).toBe("en");
    expect(sr.limit).toBe(20);
    expect(sr.offset).toBe(0);
    expect(sr.min_score).toBe(0.5);
    expect(sr.collections).toEqual([]);
    expect(sr.grade_filter).toEqual([]);
  });

  it("passes valid request with all fields", () => {
    const { req, res, next } = createMockReqRes({
      query: "sabr",
      language: "ar",
      collections: ["bukhari", "muslim"],
      grade_filter: ["sahih"],
      limit: 10,
      offset: 20,
      min_score: 0.7,
    });
    validateSearch(req, res, next);
    expect(next).toHaveBeenCalled();
    const sr = (req as any).searchRequest;
    expect(sr.language).toBe("ar");
    expect(sr.limit).toBe(10);
    expect(sr.offset).toBe(20);
    expect(sr.min_score).toBe(0.7);
    expect(sr.collections).toEqual(["bukhari", "muslim"]);
  });

  it("trims query whitespace", () => {
    const { req, res, next } = createMockReqRes({ query: "  patience  " });
    validateSearch(req, res, next);
    expect(next).toHaveBeenCalled();
    expect((req as any).searchRequest.query).toBe("patience");
  });

  // --- query validation ---
  it("rejects missing query", () => {
    const { req, res, next, status, json } = createMockReqRes({});
    validateSearch(req, res, next);
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining("query") }));
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects empty query", () => {
    const { req, res, next, status } = createMockReqRes({ query: "" });
    validateSearch(req, res, next);
    expect(status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects whitespace-only query", () => {
    const { req, res, next, status } = createMockReqRes({ query: "   " });
    validateSearch(req, res, next);
    expect(status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects query exceeding 500 characters", () => {
    const { req, res, next, status, json } = createMockReqRes({ query: "a".repeat(501) });
    validateSearch(req, res, next);
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining("500") }));
    expect(next).not.toHaveBeenCalled();
  });

  it("accepts query of exactly 500 characters", () => {
    const { req, res, next } = createMockReqRes({ query: "a".repeat(500) });
    validateSearch(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  // --- language validation ---
  it("rejects invalid language", () => {
    const { req, res, next, status, json } = createMockReqRes({ query: "test", language: "fr" });
    validateSearch(req, res, next);
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining("language") }));
    expect(next).not.toHaveBeenCalled();
  });

  it("accepts all valid languages", () => {
    for (const lang of ["ar", "id", "en"]) {
      const { req, res, next } = createMockReqRes({ query: "test", language: lang });
      validateSearch(req, res, next);
      expect(next).toHaveBeenCalled();
    }
  });

  // --- limit validation ---
  it("rejects limit below 1", () => {
    const { req, res, next, status } = createMockReqRes({ query: "test", limit: 0 });
    validateSearch(req, res, next);
    expect(status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects limit above 100", () => {
    const { req, res, next, status } = createMockReqRes({ query: "test", limit: 101 });
    validateSearch(req, res, next);
    expect(status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects non-integer limit", () => {
    const { req, res, next, status } = createMockReqRes({ query: "test", limit: 10.5 });
    validateSearch(req, res, next);
    expect(status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  // --- offset validation ---
  it("rejects negative offset", () => {
    const { req, res, next, status } = createMockReqRes({ query: "test", offset: -1 });
    validateSearch(req, res, next);
    expect(status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  // --- min_score validation ---
  it("rejects min_score below 0", () => {
    const { req, res, next, status } = createMockReqRes({ query: "test", min_score: -0.1 });
    validateSearch(req, res, next);
    expect(status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects min_score above 1", () => {
    const { req, res, next, status } = createMockReqRes({ query: "test", min_score: 1.1 });
    validateSearch(req, res, next);
    expect(status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it("accepts min_score boundary values 0 and 1", () => {
    for (const score of [0, 1]) {
      const { req, res, next } = createMockReqRes({ query: "test", min_score: score });
      validateSearch(req, res, next);
      expect(next).toHaveBeenCalled();
    }
  });

  // --- collections validation ---
  it("rejects invalid collection ID", () => {
    const { req, res, next, status, json } = createMockReqRes({
      query: "test",
      collections: ["bukhari", "invalid"],
    });
    validateSearch(req, res, next);
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining("invalid") })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("accepts all valid collection IDs", () => {
    const { req, res, next } = createMockReqRes({
      query: "test",
      collections: [...VALID_COLLECTIONS],
    });
    validateSearch(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
