import { describe, it, expect, vi, beforeEach } from "vitest";
import { IndexingService } from "./indexingService.js";
import type { EmbeddingService } from "./embeddingService.js";
import type { VectorRepository } from "../repositories/vectorRepository.js";
import type { HadithRepository } from "../repositories/hadithRepository.js";

// --- Mocks for dependencies ---

function createMockEmbeddingService(): EmbeddingService {
  return {
    generateEmbedding: vi.fn(),
    generateBatchEmbeddings: vi.fn().mockImplementation((texts: string[]) =>
      Promise.resolve(texts.map(() => new Array(1536).fill(0.1)))
    ),
  } as unknown as EmbeddingService;
}

function createMockVectorRepository(): VectorRepository {
  return {
    upsert: vi.fn().mockResolvedValue(undefined),
    search: vi.fn(),
  } as unknown as VectorRepository;
}

function createMockHadithRepository(): HadithRepository {
  let callCount = 0;
  return {
    upsertCollection: vi.fn().mockResolvedValue(undefined),
    upsertHadith: vi.fn().mockImplementation(() => {
      callCount++;
      return Promise.resolve(`uuid-${callCount}`);
    }),
    updateLanguageText: vi.fn().mockResolvedValue(true),
    getHadithByIds: vi.fn(),
    getHadithById: vi.fn(),
    getCollections: vi.fn(),
    getHadithByCollection: vi.fn(),
  } as unknown as HadithRepository;
}

// --- Fake API responses ---

function fakeCollectionResponse(count: number) {
  const hadiths = Array.from({ length: count }, (_, i) => ({
    hadithnumber: i + 1,
    text: `This is hadith number ${i + 1} about patience and faith.`,
    grades: [{ name: "Scholar", grade: "Sahih" }],
  }));
  return {
    metadata: { name: "Test Collection" },
    hadiths,
  };
}

function fakeLanguageEditionResponse(count: number) {
  const hadiths = Array.from({ length: count }, (_, i) => ({
    hadithnumber: i + 1,
    text: `Language text for hadith ${i + 1}`,
  }));
  return {
    metadata: { name: "Language Edition" },
    hadiths,
  };
}

describe("IndexingService", () => {
  let embeddingService: EmbeddingService;
  let vectorRepository: VectorRepository;
  let hadithRepository: HadithRepository;
  let service: IndexingService;

  beforeEach(() => {
    vi.restoreAllMocks();
    embeddingService = createMockEmbeddingService();
    vectorRepository = createMockVectorRepository();
    hadithRepository = createMockHadithRepository();
    service = new IndexingService({
      embeddingService,
      vectorRepository,
      hadithRepository,
    });
  });

  describe("indexCollection", () => {
    it("should fetch hadiths, generate embeddings, and upsert to both stores", async () => {
      const apiResponse = fakeCollectionResponse(3);

      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(apiResponse),
      } as Response);

      (embeddingService.generateBatchEmbeddings as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(apiResponse.hadiths.map(() => new Array(1536).fill(0.1)));

      let upsertCount = 0;
      (hadithRepository.upsertHadith as ReturnType<typeof vi.fn>)
        .mockImplementation(() => {
          upsertCount++;
          return Promise.resolve(`uuid-${upsertCount}`);
        });

      const count = await service.indexCollection("bukhari", "Sahih al-Bukhari");

      expect(count).toBe(3);
      expect(hadithRepository.upsertCollection).toHaveBeenCalledOnce();
      expect(hadithRepository.upsertHadith).toHaveBeenCalledTimes(3);
      expect(vectorRepository.upsert).toHaveBeenCalledTimes(3);
      expect(embeddingService.generateBatchEmbeddings).toHaveBeenCalledOnce();
    });

    it("should process hadiths in batches of 100", async () => {
      const apiResponse = fakeCollectionResponse(250);

      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(apiResponse),
      } as Response);

      (embeddingService.generateBatchEmbeddings as ReturnType<typeof vi.fn>)
        .mockImplementation((texts: string[]) =>
          Promise.resolve(texts.map(() => new Array(1536).fill(0.1)))
        );

      let upsertCount = 0;
      (hadithRepository.upsertHadith as ReturnType<typeof vi.fn>)
        .mockImplementation(() => {
          upsertCount++;
          return Promise.resolve(`uuid-${upsertCount}`);
        });

      const count = await service.indexCollection("muslim", "Sahih Muslim");

      expect(count).toBe(250);
      // 250 hadiths / 100 per batch = 3 batches
      expect(embeddingService.generateBatchEmbeddings).toHaveBeenCalledTimes(3);
    });

    it("should throw for unknown collection ID", async () => {
      await expect(
        service.indexCollection("unknown-collection", "Unknown")
      ).rejects.toThrow("Unknown collection ID");
    });

    it("should throw when API returns non-OK response", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
      } as Response);

      await expect(
        service.indexCollection("bukhari", "Sahih al-Bukhari")
      ).rejects.toThrow("Failed to fetch");
    });

    it("should return 0 when collection has no hadiths", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ metadata: { name: "Empty" }, hadiths: [] }),
      } as Response);

      const count = await service.indexCollection("bukhari", "Sahih al-Bukhari");
      expect(count).toBe(0);
    });

    it("should skip hadiths with empty text", async () => {
      const apiResponse = {
        metadata: { name: "Test" },
        hadiths: [
          { hadithnumber: 1, text: "Valid hadith text", grades: [] },
          { hadithnumber: 2, text: "", grades: [] },
          { hadithnumber: 3, text: "   ", grades: [] },
          { hadithnumber: 4, text: "Another valid hadith", grades: [] },
        ],
      };

      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(apiResponse),
      } as Response);

      (embeddingService.generateBatchEmbeddings as ReturnType<typeof vi.fn>)
        .mockImplementation((texts: string[]) =>
          Promise.resolve(texts.map(() => new Array(1536).fill(0.1)))
        );

      let upsertCount = 0;
      (hadithRepository.upsertHadith as ReturnType<typeof vi.fn>)
        .mockImplementation(() => {
          upsertCount++;
          return Promise.resolve(`uuid-${upsertCount}`);
        });

      const count = await service.indexCollection("bukhari", "Sahih al-Bukhari");
      expect(count).toBe(2); // Only 2 valid hadiths
    });

    it("should normalize grades correctly", async () => {
      const apiResponse = {
        metadata: { name: "Test" },
        hadiths: [
          { hadithnumber: 1, text: "Hadith 1", grades: [{ name: "A", grade: "Sahih" }] },
          { hadithnumber: 2, text: "Hadith 2", grades: [{ name: "A", grade: "Hasan" }] },
          { hadithnumber: 3, text: "Hadith 3", grades: [{ name: "A", grade: "Da'if" }] },
          { hadithnumber: 4, text: "Hadith 4", grades: [] },
        ],
      };

      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(apiResponse),
      } as Response);

      (embeddingService.generateBatchEmbeddings as ReturnType<typeof vi.fn>)
        .mockImplementation((texts: string[]) =>
          Promise.resolve(texts.map(() => new Array(1536).fill(0.1)))
        );

      const grades: string[] = [];
      let upsertCount = 0;
      (hadithRepository.upsertHadith as ReturnType<typeof vi.fn>)
        .mockImplementation((hadith: { grade: string }) => {
          grades.push(hadith.grade);
          upsertCount++;
          return Promise.resolve(`uuid-${upsertCount}`);
        });

      await service.indexCollection("bukhari", "Sahih al-Bukhari");

      expect(grades).toEqual(["sahih", "hasan", "dhaif", "unknown"]);
    });
  });

  describe("indexAllCollections", () => {
    it("should process all 7 target collections and produce a report", async () => {
      const apiResponse = fakeCollectionResponse(5);
      const langResponse = fakeLanguageEditionResponse(5);

      vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
        const url = typeof input === "string" ? input : (input as Request).url;
        if (url.includes("/editions/eng-")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(apiResponse),
          } as Response);
        }
        // Arabic and Indonesian editions
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(langResponse),
        } as Response);
      });

      (embeddingService.generateBatchEmbeddings as ReturnType<typeof vi.fn>)
        .mockImplementation((texts: string[]) =>
          Promise.resolve(texts.map(() => new Array(1536).fill(0.1)))
        );

      let upsertCount = 0;
      (hadithRepository.upsertHadith as ReturnType<typeof vi.fn>)
        .mockImplementation(() => {
          upsertCount++;
          return Promise.resolve(`uuid-${upsertCount}`);
        });

      const report = await service.indexAllCollections();

      expect(report.collections_processed).toBe(7);
      expect(report.total_hadith_indexed).toBe(35); // 7 collections × 5 hadiths
      expect(report.errors).toHaveLength(0);
      expect(report.duration_seconds).toBeGreaterThanOrEqual(0);
      expect(report.start_time).toBeInstanceOf(Date);
      expect(report.end_time).toBeInstanceOf(Date);
      expect(report.arabic_indexed).toBe(35); // 7 × 5
      expect(report.indonesian_indexed).toBe(35); // 7 × 5
      // Postcondition: collections_processed + errors = total collections
      expect(report.collections_processed + report.errors.length).toBe(7);
    });

    it("should record errors per collection and continue to next", async () => {
      let engCallIndex = 0;
      vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
        const url = typeof input === "string" ? input : (input as Request).url;
        if (url.includes("/editions/eng-")) {
          engCallIndex++;
          if (engCallIndex === 2) {
            return Promise.resolve({
              ok: false,
              status: 500,
              statusText: "Internal Server Error",
            } as Response);
          }
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(fakeCollectionResponse(2)),
          } as Response);
        }
        // Language editions return successfully
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(fakeLanguageEditionResponse(2)),
        } as Response);
      });

      (embeddingService.generateBatchEmbeddings as ReturnType<typeof vi.fn>)
        .mockImplementation((texts: string[]) =>
          Promise.resolve(texts.map(() => new Array(1536).fill(0.1)))
        );

      let upsertCount = 0;
      (hadithRepository.upsertHadith as ReturnType<typeof vi.fn>)
        .mockImplementation(() => {
          upsertCount++;
          return Promise.resolve(`uuid-${upsertCount}`);
        });

      const report = await service.indexAllCollections();

      expect(report.errors.length).toBeGreaterThanOrEqual(1);
      expect(report.collections_processed).toBe(6);
      expect(report.total_hadith_indexed).toBe(12); // 6 × 2
    });

    it("should ensure collections_processed + errors = total collections even with multiple failures", async () => {
      let engCallIndex = 0;
      vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
        const url = typeof input === "string" ? input : (input as Request).url;
        if (url.includes("/editions/eng-")) {
          engCallIndex++;
          // Fail collections 1, 3, 5
          if (engCallIndex % 2 === 1) {
            return Promise.reject(new Error("Network error"));
          }
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(fakeCollectionResponse(1)),
          } as Response);
        }
        // Language editions return successfully
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(fakeLanguageEditionResponse(1)),
        } as Response);
      });

      (embeddingService.generateBatchEmbeddings as ReturnType<typeof vi.fn>)
        .mockImplementation((texts: string[]) =>
          Promise.resolve(texts.map(() => new Array(1536).fill(0.1)))
        );

      let upsertCount = 0;
      (hadithRepository.upsertHadith as ReturnType<typeof vi.fn>)
        .mockImplementation(() => {
          upsertCount++;
          return Promise.resolve(`uuid-${upsertCount}`);
        });

      const report = await service.indexAllCollections();

      // Postcondition always holds for English indexing
      expect(report.collections_processed + report.errors.filter(e => !e.error.startsWith("Arabic") && !e.error.startsWith("Indonesian")).length).toBe(7);
    });

    it("should include arabic_indexed and indonesian_indexed in report", async () => {
      const apiResponse = fakeCollectionResponse(3);

      vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
        const url = typeof input === "string" ? input : (input as Request).url;
        if (url.includes("/editions/eng-")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(apiResponse),
          } as Response);
        }
        if (url.includes("/editions/ara-")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(fakeLanguageEditionResponse(3)),
          } as Response);
        }
        // Indonesian returns 404
        return Promise.resolve({
          ok: false,
          status: 404,
          statusText: "Not Found",
        } as Response);
      });

      (embeddingService.generateBatchEmbeddings as ReturnType<typeof vi.fn>)
        .mockImplementation((texts: string[]) =>
          Promise.resolve(texts.map(() => new Array(1536).fill(0.1)))
        );

      let upsertCount = 0;
      (hadithRepository.upsertHadith as ReturnType<typeof vi.fn>)
        .mockImplementation(() => {
          upsertCount++;
          return Promise.resolve(`uuid-${upsertCount}`);
        });

      const report = await service.indexAllCollections();

      expect(report.arabic_indexed).toBe(21); // 7 × 3
      expect(report.indonesian_indexed).toBe(0); // all 404
      expect(report.collections_processed).toBe(7);
    });
  });
});
