import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the pg pool before importing the repository
vi.mock("../db/pool.js", () => {
  const mockQuery = vi.fn();
  return { default: { query: mockQuery } };
});

import pool from "../db/pool.js";
import { HadithRepository } from "./hadithRepository.js";
import type { Collection, Hadith } from "../types/index.js";

const mockQuery = pool.query as ReturnType<typeof vi.fn>;

describe("HadithRepository", () => {
  let repo: HadithRepository;

  beforeEach(() => {
    repo = new HadithRepository();
    mockQuery.mockReset();
  });

  describe("upsertCollection", () => {
    it("executes an upsert query with collection data", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const collection: Collection = {
        id: "bukhari",
        name: "Sahih al-Bukhari",
        name_arabic: "صحيح البخاري",
        author: "Imam Bukhari",
        total_hadith: 7563,
        description: "Most authentic hadith collection",
        available_languages: ["ar", "en"],
      };

      await repo.upsertCollection(collection);

      expect(mockQuery).toHaveBeenCalledOnce();
      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toContain("INSERT INTO collections");
      expect(sql).toContain("ON CONFLICT (id) DO UPDATE");
      expect(params).toEqual([
        "bukhari",
        "Sahih al-Bukhari",
        "صحيح البخاري",
        "Imam Bukhari",
        7563,
        "Most authentic hadith collection",
        ["ar", "en"],
      ]);
    });
  });

  describe("upsertHadith", () => {
    it("executes an upsert query and returns the generated id", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: "uuid-123" }],
      });

      const hadith = {
        external_id: "ext-1",
        collection_id: "bukhari",
        collection_name: "Sahih al-Bukhari",
        book_number: 1,
        book_name: "Revelation",
        hadith_number: 1,
        text_arabic: "إنما الأعمال بالنيات",
        text_indonesian: "Sesungguhnya amal itu tergantung niatnya",
        text_english: "Actions are judged by intentions",
        narrator: "Umar ibn al-Khattab",
        grade: "sahih" as const,
        reference: "Bukhari 1",
      };

      const id = await repo.upsertHadith(hadith);

      expect(id).toBe("uuid-123");
      expect(mockQuery).toHaveBeenCalledOnce();
      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toContain("INSERT INTO hadiths");
      expect(sql).toContain("ON CONFLICT (external_id, collection_id) DO UPDATE");
      expect(params).toHaveLength(12);
    });
  });

  describe("getHadithByIds", () => {
    it("returns empty array for empty ids", async () => {
      const result = await repo.getHadithByIds([]);
      expect(result).toEqual([]);
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it("queries hadiths by ids", async () => {
      const fakeHadith = { id: "uuid-1", hadith_number: 1 };
      mockQuery.mockResolvedValueOnce({ rows: [fakeHadith] });

      const result = await repo.getHadithByIds(["uuid-1"]);

      expect(result).toEqual([fakeHadith]);
      expect(mockQuery).toHaveBeenCalledOnce();
      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toContain("WHERE id = ANY($1)");
      expect(params).toEqual([["uuid-1"]]);
    });
  });

  describe("getHadithById", () => {
    it("returns hadith when found", async () => {
      const fakeHadith = { id: "uuid-1", hadith_number: 1 };
      mockQuery.mockResolvedValueOnce({ rows: [fakeHadith] });

      const result = await repo.getHadithById("uuid-1");
      expect(result).toEqual(fakeHadith);
    });

    it("returns null when not found", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.getHadithById("nonexistent");
      expect(result).toBeNull();
    });
  });

  describe("getCollections", () => {
    it("returns all collections ordered by name", async () => {
      const fakeCollections = [
        { id: "bukhari", name: "Sahih al-Bukhari" },
        { id: "muslim", name: "Sahih Muslim" },
      ];
      mockQuery.mockResolvedValueOnce({ rows: fakeCollections });

      const result = await repo.getCollections();

      expect(result).toEqual(fakeCollections);
      const [sql] = mockQuery.mock.calls[0];
      expect(sql).toContain("ORDER BY name");
    });
  });

  describe("getHadithByCollection", () => {
    it("queries hadiths with collection filter and pagination", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await repo.getHadithByCollection("bukhari", 20, 0);

      expect(mockQuery).toHaveBeenCalledOnce();
      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toContain("WHERE collection_id = $1");
      expect(sql).toContain("LIMIT $2 OFFSET $3");
      expect(params).toEqual(["bukhari", 20, 0]);
    });
  });

  describe("fullTextSearch", () => {
    it("searches with ILIKE across text columns without collection filter", async () => {
      const fakeHadith = { id: "uuid-1", hadith_number: 1 };
      mockQuery.mockResolvedValueOnce({ rows: [fakeHadith] });

      const result = await repo.fullTextSearch("sabar", [], 20, 0);

      expect(result).toEqual([fakeHadith]);
      expect(mockQuery).toHaveBeenCalledOnce();
      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toContain("ILIKE");
      expect(params[0]).toBe("%sabar%");
      expect(params[1]).toBe(20);
      expect(params[2]).toBe(0);
    });

    it("adds collection filter when collections are provided", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await repo.fullTextSearch("sabar", ["bukhari", "muslim"], 10, 0);

      expect(mockQuery).toHaveBeenCalledOnce();
      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toContain("ILIKE");
      expect(sql).toContain("collection_id = ANY($2)");
      expect(params[0]).toBe("%sabar%");
      expect(params[1]).toEqual(["bukhari", "muslim"]);
      expect(params[2]).toBe(10);
      expect(params[3]).toBe(0);
    });
  });
});
