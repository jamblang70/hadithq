import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock qdrant client before importing the repository
vi.mock("../db/qdrant.js", () => {
  const mockUpsert = vi.fn();
  const mockSearch = vi.fn();
  return {
    default: { upsert: mockUpsert, search: mockSearch },
    HADITH_COLLECTION_NAME: "hadith_embeddings",
  };
});

import qdrantClient from "../db/qdrant.js";
import { VectorRepository } from "./vectorRepository.js";
import type { VectorMetadata } from "./vectorRepository.js";

const mockUpsert = qdrantClient.upsert as ReturnType<typeof vi.fn>;
const mockSearch = qdrantClient.search as ReturnType<typeof vi.fn>;

describe("VectorRepository", () => {
  let repo: VectorRepository;

  beforeEach(() => {
    repo = new VectorRepository();
    mockUpsert.mockReset();
    mockSearch.mockReset();
  });

  describe("upsert", () => {
    it("upserts a point to the Qdrant collection", async () => {
      mockUpsert.mockResolvedValueOnce(undefined);

      const metadata: VectorMetadata = {
        hadith_id: "uuid-1",
        collection_id: "bukhari",
        language: "ar",
        grade: "sahih",
        hadith_number: 1,
      };

      await repo.upsert("point-1", [0.1, 0.2, 0.3], metadata);

      expect(mockUpsert).toHaveBeenCalledOnce();
      const [collectionName, params] = mockUpsert.mock.calls[0];
      expect(collectionName).toBe("hadith_embeddings");
      expect(params.points[0].id).toBe("point-1");
      expect(params.points[0].vector).toEqual([0.1, 0.2, 0.3]);
      expect(params.points[0].payload.hadith_id).toBe("uuid-1");
    });
  });

  describe("search", () => {
    it("returns mapped search results", async () => {
      mockSearch.mockResolvedValueOnce([
        {
          id: "point-1",
          score: 0.95,
          payload: {
            hadith_id: "uuid-1",
            collection_id: "bukhari",
            language: "ar",
            grade: "sahih",
            hadith_number: 1,
          },
        },
      ]);

      const results = await repo.search([0.1, 0.2], 10, undefined, 0.5);

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe("point-1");
      expect(results[0].score).toBe(0.95);
      expect(results[0].payload.hadith_id).toBe("uuid-1");

      const [collectionName, params] = mockSearch.mock.calls[0];
      expect(collectionName).toBe("hadith_embeddings");
      expect(params.limit).toBe(10);
      expect(params.score_threshold).toBe(0.5);
      expect(params.with_payload).toBe(true);
    });

    it("passes filter to Qdrant search", async () => {
      mockSearch.mockResolvedValueOnce([]);

      const filter = {
        must: [{ key: "collection_id", match: { value: "bukhari" } }],
      };

      await repo.search([0.1], 5, filter);

      const [, params] = mockSearch.mock.calls[0];
      expect(params.filter).toEqual(filter);
    });
  });
});
