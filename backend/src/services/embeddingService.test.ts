import { describe, it, expect, vi, beforeEach } from "vitest";
import { EmbeddingService, EMBEDDING_DIMENSION } from "./embeddingService.js";
import OpenAI from "openai";

/**
 * Helper: buat fake embedding vector dengan dimensi yang benar
 */
function fakeEmbedding(): number[] {
  return Array.from({ length: EMBEDDING_DIMENSION }, () => Math.random());
}

/**
 * Helper: buat mock OpenAI client
 */
function createMockClient(
  impl: (params: { input: string | string[] }) => unknown
) {
  return {
    embeddings: {
      create: vi.fn(impl),
    },
  } as unknown as OpenAI;
}

describe("EmbeddingService", () => {
  describe("generateEmbedding", () => {
    it("should return a vector of dimension 1536 for valid text", async () => {
      const emb = fakeEmbedding();
      const client = createMockClient(() => ({
        data: [{ index: 0, embedding: emb }],
      }));
      const service = new EmbeddingService(client);

      const result = await service.generateEmbedding("test text");

      expect(result).toEqual(emb);
      expect(result).toHaveLength(EMBEDDING_DIMENSION);
    });

    it("should throw on empty text", async () => {
      const client = createMockClient(() => ({}));
      const service = new EmbeddingService(client);

      await expect(service.generateEmbedding("")).rejects.toThrow(
        "Text must not be empty"
      );
      await expect(service.generateEmbedding("   ")).rejects.toThrow(
        "Text must not be empty"
      );
    });

    it("should throw when embedding dimension is wrong", async () => {
      const client = createMockClient(() => ({
        data: [{ index: 0, embedding: [0.1, 0.2, 0.3] }],
      }));
      const service = new EmbeddingService(client);

      await expect(service.generateEmbedding("test")).rejects.toThrow(
        /Expected embedding dimension 1536 but got 3/
      );
    });

    it("should retry on API failure and succeed", async () => {
      const emb = fakeEmbedding();
      let callCount = 0;
      const client = createMockClient(() => {
        callCount++;
        if (callCount < 3) {
          throw new Error("API error");
        }
        return { data: [{ index: 0, embedding: emb }] };
      });
      const service = new EmbeddingService(client);

      const result = await service.generateEmbedding("test");
      expect(result).toEqual(emb);
      expect(callCount).toBe(3);
    });

    it("should throw after exhausting all retries", async () => {
      const client = createMockClient(() => {
        throw new Error("Persistent API error");
      });
      const service = new EmbeddingService(client);

      await expect(service.generateEmbedding("test")).rejects.toThrow(
        "Persistent API error"
      );
    });
  });

  describe("generateBatchEmbeddings", () => {
    it("should return correct number of vectors for batch input", async () => {
      const texts = ["text one", "text two", "text three"];
      const embeddings = texts.map(() => fakeEmbedding());
      const client = createMockClient(() => ({
        data: embeddings.map((emb, i) => ({ index: i, embedding: emb })),
      }));
      const service = new EmbeddingService(client);

      const result = await service.generateBatchEmbeddings(texts);

      expect(result).toHaveLength(texts.length);
      for (const vec of result) {
        expect(vec).toHaveLength(EMBEDDING_DIMENSION);
      }
    });

    it("should sort results by index", async () => {
      const emb0 = fakeEmbedding();
      const emb1 = fakeEmbedding();
      // Return out of order
      const client = createMockClient(() => ({
        data: [
          { index: 1, embedding: emb1 },
          { index: 0, embedding: emb0 },
        ],
      }));
      const service = new EmbeddingService(client);

      const result = await service.generateBatchEmbeddings(["a", "b"]);

      expect(result[0]).toEqual(emb0);
      expect(result[1]).toEqual(emb1);
    });

    it("should throw on empty texts array", async () => {
      const client = createMockClient(() => ({}));
      const service = new EmbeddingService(client);

      await expect(service.generateBatchEmbeddings([])).rejects.toThrow(
        "Texts array must not be empty"
      );
    });

    it("should throw if any text in batch is empty", async () => {
      const client = createMockClient(() => ({}));
      const service = new EmbeddingService(client);

      await expect(
        service.generateBatchEmbeddings(["valid", ""])
      ).rejects.toThrow("Each text in batch must not be empty");
    });

    it("should throw when count mismatch between input and output", async () => {
      const client = createMockClient(() => ({
        data: [{ index: 0, embedding: fakeEmbedding() }],
      }));
      const service = new EmbeddingService(client);

      await expect(
        service.generateBatchEmbeddings(["a", "b"])
      ).rejects.toThrow(/Expected 2 embeddings but received 1/);
    });
  });
});
