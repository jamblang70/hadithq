import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { CacheRepository } from "./cacheRepository.js";

describe("CacheRepository", () => {
  let cache: CacheRepository;

  beforeEach(() => {
    cache = new CacheRepository();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("get / set", () => {
    it("returns null for a missing key", () => {
      expect(cache.get("nonexistent")).toBeNull();
    });

    it("stores and retrieves a value", () => {
      cache.set("key1", { foo: "bar" }, 60);
      expect(cache.get<{ foo: string }>("key1")).toEqual({ foo: "bar" });
    });

    it("returns null after TTL expires", () => {
      cache.set("key1", "value", 10);
      expect(cache.get("key1")).toBe("value");

      // Advance time past TTL
      vi.advanceTimersByTime(11_000);
      expect(cache.get("key1")).toBeNull();
    });

    it("returns value just before TTL expires", () => {
      cache.set("key1", "value", 10);
      vi.advanceTimersByTime(9_999);
      expect(cache.get("key1")).toBe("value");
    });

    it("overwrites existing key with new value and TTL", () => {
      cache.set("key1", "old", 5);
      cache.set("key1", "new", 60);
      expect(cache.get("key1")).toBe("new");

      // Old TTL would have expired, but new TTL is longer
      vi.advanceTimersByTime(6_000);
      expect(cache.get("key1")).toBe("new");
    });
  });

  describe("generateKey", () => {
    it("joins parts with colon separator", () => {
      expect(cache.generateKey("search", "query", "en")).toBe("search:query:en");
    });

    it("handles a single part", () => {
      expect(cache.generateKey("only")).toBe("only");
    });

    it("handles empty parts", () => {
      expect(cache.generateKey("a", "", "b")).toBe("a::b");
    });
  });
});
