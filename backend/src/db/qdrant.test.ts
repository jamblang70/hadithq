import { describe, it, expect } from "vitest";
import qdrantClient, {
  HADITH_COLLECTION_NAME,
  ensureCollection,
} from "./qdrant.js";

describe("qdrant module", () => {
  it("exports the collection name constant", () => {
    expect(HADITH_COLLECTION_NAME).toBe("hadith_embeddings");
  });

  it("exports a QdrantClient instance", () => {
    expect(qdrantClient).toBeDefined();
    expect(typeof qdrantClient.collectionExists).toBe("function");
    expect(typeof qdrantClient.createCollection).toBe("function");
    expect(typeof qdrantClient.createPayloadIndex).toBe("function");
    expect(typeof qdrantClient.search).toBe("function");
    expect(typeof qdrantClient.upsert).toBe("function");
  });

  it("exports ensureCollection function", () => {
    expect(typeof ensureCollection).toBe("function");
  });
});
