import { QdrantClient } from "@qdrant/js-client-rest";
import { EMBEDDING_DIMENSION } from "../services/embeddingService.js";

/**
 * Nama collection Qdrant untuk menyimpan embedding hadis
 */
export const HADITH_COLLECTION_NAME = "hadith_embeddings";

/**
 * Qdrant client singleton
 */
const qdrantClient = new QdrantClient({
  url: process.env.QDRANT_URL ?? "http://localhost:6333",
  apiKey: process.env.QDRANT_API_KEY,
});

export default qdrantClient;

/**
 * Pastikan collection hadith_embeddings ada di Qdrant.
 * Jika belum ada, buat collection baru dengan konfigurasi:
 * - Dimensi vektor: 1536 (sesuai model text-embedding-3-small)
 * - Distance metric: Cosine similarity
 * - Payload index untuk filter: collection_id, language, grade
 */
export async function ensureCollection(): Promise<void> {
  const { exists } = await qdrantClient.collectionExists(HADITH_COLLECTION_NAME);

  if (exists) {
    return;
  }

  await qdrantClient.createCollection(HADITH_COLLECTION_NAME, {
    vectors: {
      size: EMBEDDING_DIMENSION,
      distance: "Cosine",
    },
  });

  // Buat payload index untuk metadata filter
  await Promise.all([
    qdrantClient.createPayloadIndex(HADITH_COLLECTION_NAME, {
      field_name: "collection_id",
      field_schema: "keyword",
    }),
    qdrantClient.createPayloadIndex(HADITH_COLLECTION_NAME, {
      field_name: "language",
      field_schema: "keyword",
    }),
    qdrantClient.createPayloadIndex(HADITH_COLLECTION_NAME, {
      field_name: "grade",
      field_schema: "keyword",
    }),
  ]);
}
