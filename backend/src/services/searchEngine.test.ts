import { describe, it, expect, vi } from "vitest";
import { buildFilterExpression, buildSearchCacheKey, rerank, semanticSearch } from "./searchEngine.js";
import type { RankedSearchResult, SearchDependencies } from "./searchEngine.js";
import type { FilterOptions, SearchResult, SearchRequest, Hadith } from "../types/index.js";

/** Helper: buat Hadith minimal untuk testing */
function makeHadith(
  overrides: Partial<Hadith> = {}
): Hadith {
  return {
    id: "1",
    external_id: "ext-1",
    collection_id: "tirmidhi",
    collection_name: "Jami at-Tirmidzi",
    book_number: 1,
    book_name: "Book 1",
    hadith_number: 1,
    text_arabic: "نص عربي",
    text_indonesian: "Teks Indonesia",
    text_english: "English text",
    narrator: "Abu Hurairah",
    grade: "unknown",
    reference: "Tirmidhi 1",
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  };
}

/** Helper: buat SearchResult minimal */
function makeResult(
  similarity_score: number,
  hadithOverrides: Partial<Hadith> = {}
): SearchResult {
  return {
    hadith: makeHadith(hadithOverrides),
    similarity_score,
    matched_language: "id",
    highlight_text: "",
  };
}

describe("buildFilterExpression", () => {
  it("returns undefined when all filters are empty", () => {
    const filters: FilterOptions = { collections: [], grade_filter: [] };
    expect(buildFilterExpression(filters)).toBeUndefined();
  });

  it("builds collection filter with single value using match.value", () => {
    const filters: FilterOptions = {
      collections: ["bukhari"],
      grade_filter: [],
    };
    expect(buildFilterExpression(filters)).toEqual({
      must: [{ key: "collection_id", match: { value: "bukhari" } }],
    });
  });

  it("builds collection filter with multiple values using match.any", () => {
    const filters: FilterOptions = {
      collections: ["bukhari", "muslim"],
      grade_filter: [],
    };
    expect(buildFilterExpression(filters)).toEqual({
      must: [
        { key: "collection_id", match: { any: ["bukhari", "muslim"] } },
      ],
    });
  });

  it("builds grade filter with single value using match.value", () => {
    const filters: FilterOptions = {
      collections: [],
      grade_filter: ["sahih"],
    };
    expect(buildFilterExpression(filters)).toEqual({
      must: [{ key: "grade", match: { value: "sahih" } }],
    });
  });

  it("builds grade filter with multiple values using match.any", () => {
    const filters: FilterOptions = {
      collections: [],
      grade_filter: ["sahih", "hasan"],
    };
    expect(buildFilterExpression(filters)).toEqual({
      must: [{ key: "grade", match: { any: ["sahih", "hasan"] } }],
    });
  });

  it("builds language filter using match.value", () => {
    const filters: FilterOptions = {
      collections: [],
      grade_filter: [],
      language: "ar",
    };
    expect(buildFilterExpression(filters)).toEqual({
      must: [{ key: "language", match: { value: "ar" } }],
    });
  });

  it("combines all filters with AND logic (must array)", () => {
    const filters: FilterOptions = {
      collections: ["bukhari", "muslim"],
      grade_filter: ["sahih"],
      language: "ar",
    };
    const result = buildFilterExpression(filters);
    expect(result).toEqual({
      must: [
        { key: "collection_id", match: { any: ["bukhari", "muslim"] } },
        { key: "grade", match: { value: "sahih" } },
        { key: "language", match: { value: "ar" } },
      ],
    });
  });

  it("ignores language when undefined", () => {
    const filters: FilterOptions = {
      collections: ["bukhari"],
      grade_filter: ["sahih"],
    };
    const result = buildFilterExpression(filters);
    expect(result).toEqual({
      must: [
        { key: "collection_id", match: { value: "bukhari" } },
        { key: "grade", match: { value: "sahih" } },
      ],
    });
  });
});


describe("rerank", () => {
  it("returns empty array for empty input", () => {
    expect(rerank([])).toEqual([]);
  });

  it("adds 0.05 grade bonus for sahih hadith", () => {
    const results = [makeResult(0.8, { grade: "sahih" })];
    const ranked = rerank(results);
    expect(ranked[0].final_score).toBeCloseTo(0.85, 10);
  });

  it("adds 0.02 grade bonus for hasan hadith", () => {
    const results = [makeResult(0.8, { grade: "hasan" })];
    const ranked = rerank(results);
    expect(ranked[0].final_score).toBeCloseTo(0.82, 10);
  });

  it("adds no grade bonus for dhaif hadith", () => {
    const results = [makeResult(0.8, { grade: "dhaif" })];
    const ranked = rerank(results);
    expect(ranked[0].final_score).toBeCloseTo(0.8, 10);
  });

  it("adds 0.03 collection bonus for bukhari", () => {
    const results = [makeResult(0.8, { collection_id: "bukhari" })];
    const ranked = rerank(results);
    expect(ranked[0].final_score).toBeCloseTo(0.83, 10);
  });

  it("adds 0.03 collection bonus for muslim", () => {
    const results = [makeResult(0.8, { collection_id: "muslim" })];
    const ranked = rerank(results);
    expect(ranked[0].final_score).toBeCloseTo(0.83, 10);
  });

  it("adds no collection bonus for other collections", () => {
    const results = [makeResult(0.8, { collection_id: "tirmidhi" })];
    const ranked = rerank(results);
    expect(ranked[0].final_score).toBeCloseTo(0.8, 10);
  });

  it("combines grade and collection bonuses (sahih + bukhari = +0.08)", () => {
    const results = [
      makeResult(0.7, { grade: "sahih", collection_id: "bukhari" }),
    ];
    const ranked = rerank(results);
    expect(ranked[0].final_score).toBeCloseTo(0.78, 10);
  });

  it("caps final_score at 1.0", () => {
    const results = [
      makeResult(0.98, { grade: "sahih", collection_id: "muslim" }),
    ];
    const ranked = rerank(results);
    expect(ranked[0].final_score).toBe(1.0);
  });

  it("sorts results by final_score descending", () => {
    const results = [
      makeResult(0.7, { grade: "dhaif", collection_id: "tirmidhi" }),
      makeResult(0.65, { grade: "sahih", collection_id: "bukhari" }),
      makeResult(0.8, { grade: "unknown", collection_id: "nasai" }),
    ];
    const ranked = rerank(results);
    // 0.8 + 0 + 0 = 0.80
    // 0.65 + 0.05 + 0.03 = 0.73
    // 0.7 + 0 + 0 = 0.70
    expect(ranked[0].final_score).toBeCloseTo(0.8, 10);
    expect(ranked[1].final_score).toBeCloseTo(0.73, 10);
    expect(ranked[2].final_score).toBeCloseTo(0.7, 10);
    // Verify descending order
    expect(ranked[0].final_score).toBeGreaterThanOrEqual(ranked[1].final_score);
    expect(ranked[1].final_score).toBeGreaterThanOrEqual(ranked[2].final_score);
  });

  it("preserves the same number of results after re-ranking", () => {
    const results = [
      makeResult(0.9, { grade: "sahih" }),
      makeResult(0.8, { grade: "hasan" }),
      makeResult(0.7, { grade: "dhaif" }),
      makeResult(0.6),
    ];
    const ranked = rerank(results);
    expect(ranked).toHaveLength(results.length);
  });

  it("each result has a valid final_score between 0.0 and 1.0", () => {
    const results = [
      makeResult(0.99, { grade: "sahih", collection_id: "bukhari" }),
      makeResult(0.5, { grade: "hasan", collection_id: "muslim" }),
      makeResult(0.1, { grade: "dhaif" }),
      makeResult(0.0),
    ];
    const ranked = rerank(results);
    for (const r of ranked) {
      expect(r.final_score).toBeGreaterThanOrEqual(0.0);
      expect(r.final_score).toBeLessThanOrEqual(1.0);
    }
  });
});


describe("semanticSearch fallback", () => {
  function makeDeps(overrides: Partial<SearchDependencies> = {}): SearchDependencies {
    return {
      embeddingService: {
        generateEmbedding: vi.fn().mockResolvedValue(new Array(1536).fill(0)),
        generateBatchEmbeddings: vi.fn(),
      } as any,
      vectorRepository: {
        search: vi.fn().mockResolvedValue([]),
        upsert: vi.fn(),
      } as any,
      hadithRepository: {
        getHadithByIds: vi.fn().mockResolvedValue([]),
        fullTextSearch: vi.fn().mockResolvedValue([]),
      } as any,
      cacheRepository: {
        generateKey: vi.fn().mockReturnValue("key"),
        get: vi.fn().mockReturnValue(null),
        set: vi.fn(),
      } as any,
      ...overrides,
    };
  }

  function makeRequest(overrides: Partial<SearchRequest> = {}): SearchRequest {
    return {
      query: "sabar",
      language: "id",
      collections: [],
      grade_filter: [],
      limit: 20,
      offset: 0,
      min_score: 0.5,
      ...overrides,
    };
  }

  it("falls back to full-text search when embedding service fails", async () => {
    const fallbackHadith = makeHadith({ id: "fb-1", text_indonesian: "sabar" });
    const deps = makeDeps({
      embeddingService: {
        generateEmbedding: vi.fn().mockRejectedValue(new Error("API unavailable")),
        generateBatchEmbeddings: vi.fn(),
      } as any,
      hadithRepository: {
        getHadithByIds: vi.fn(),
        fullTextSearch: vi.fn().mockResolvedValue([fallbackHadith]),
      } as any,
    });

    const response = await semanticSearch(makeRequest(), deps);

    expect(deps.hadithRepository.fullTextSearch).toHaveBeenCalledWith("sabar", [], 40, 0);
    expect(response.results.length).toBe(1);
    expect(response.results[0].similarity_score).toBe(0);
    expect(response.results[0].hadith.id).toBe("fb-1");
  });

  it("falls back to full-text search when vector DB fails", async () => {
    const fallbackHadith = makeHadith({ id: "fb-2" });
    const deps = makeDeps({
      vectorRepository: {
        search: vi.fn().mockRejectedValue(new Error("Qdrant connection refused")),
        upsert: vi.fn(),
      } as any,
      hadithRepository: {
        getHadithByIds: vi.fn(),
        fullTextSearch: vi.fn().mockResolvedValue([fallbackHadith]),
      } as any,
    });

    const response = await semanticSearch(makeRequest(), deps);

    expect(deps.hadithRepository.fullTextSearch).toHaveBeenCalled();
    expect(response.results.length).toBe(1);
  });

  it("passes collections to fullTextSearch during fallback", async () => {
    const deps = makeDeps({
      embeddingService: {
        generateEmbedding: vi.fn().mockRejectedValue(new Error("fail")),
        generateBatchEmbeddings: vi.fn(),
      } as any,
      hadithRepository: {
        getHadithByIds: vi.fn(),
        fullTextSearch: vi.fn().mockResolvedValue([]),
      } as any,
    });

    await semanticSearch(makeRequest({ collections: ["bukhari", "muslim"] }), deps);

    expect(deps.hadithRepository.fullTextSearch).toHaveBeenCalledWith(
      "sabar",
      ["bukhari", "muslim"],
      40,
      0
    );
  });

  it("returns valid SearchResponse structure on fallback", async () => {
    const deps = makeDeps({
      embeddingService: {
        generateEmbedding: vi.fn().mockRejectedValue(new Error("fail")),
        generateBatchEmbeddings: vi.fn(),
      } as any,
    });

    const response = await semanticSearch(makeRequest(), deps);

    expect(response).toHaveProperty("results");
    expect(response).toHaveProperty("total_count");
    expect(response).toHaveProperty("query", "sabar");
    expect(response).toHaveProperty("processing_time_ms");
    expect(response).toHaveProperty("page");
    expect(response).toHaveProperty("total_pages");
    expect(response.processing_time_ms).toBeGreaterThanOrEqual(0);
  });

  it("includes filters and pagination inputs in the cache key", () => {
    const cacheRepository = {
      generateKey: vi.fn((...parts: string[]) => parts.join(":")),
    } as any;

    const cacheKey = buildSearchCacheKey(
      makeRequest({
        collections: ["muslim", "bukhari"],
        grade_filter: ["hasan", "sahih"],
        limit: 10,
        offset: 20,
        min_score: 0.15,
      }),
      cacheRepository
    );

    expect(cacheRepository.generateKey).toHaveBeenCalledWith(
      "search",
      "sabar",
      "bukhari,muslim",
      "id",
      "hasan,sahih",
      "10",
      "20",
      "0.15"
    );
    expect(cacheKey).toContain("hasan,sahih");
    expect(cacheKey).toContain("10:20:0.15");
  });

  it("bypasses an existing cache entry when pagination changes", async () => {
    const cacheStore = new Map<string, any>();
    const deps = makeDeps({
      cacheRepository: {
        generateKey: vi.fn((...parts: string[]) => parts.join(":")),
        get: vi.fn((key: string) => cacheStore.get(key) ?? null),
        set: vi.fn((key: string, value: unknown) => cacheStore.set(key, value)),
      } as any,
      vectorRepository: {
        search: vi.fn().mockResolvedValue([]),
        upsert: vi.fn(),
      } as any,
    });

    await semanticSearch(makeRequest({ limit: 20, offset: 0 }), deps);
    await semanticSearch(makeRequest({ limit: 20, offset: 20 }), deps);

    expect(deps.cacheRepository.get).toHaveBeenNthCalledWith(
      1,
      "search:sabar::id::20:0:0.5"
    );
    expect(deps.cacheRepository.get).toHaveBeenNthCalledWith(
      2,
      "search:sabar::id::20:20:0.5"
    );
  });
});
