import qdrantClient, { HADITH_COLLECTION_NAME } from "../db/qdrant.js";

/**
 * Metadata payload stored alongside each vector in Qdrant.
 */
export interface VectorMetadata {
  hadith_id: string;
  collection_id: string;
  language: string;
  grade: string;
  hadith_number: number;
}

/**
 * A single search hit returned from Qdrant.
 */
export interface VectorSearchResult {
  id: string;
  score: number;
  payload: VectorMetadata;
}

/**
 * VectorRepository - operasi upsert dan similarity search di Qdrant.
 */
export class VectorRepository {
  /**
   * Upsert a vector with metadata payload.
   */
  async upsert(
    id: string,
    vector: number[],
    metadata: VectorMetadata
  ): Promise<void> {
    await qdrantClient.upsert(HADITH_COLLECTION_NAME, {
      wait: true,
      points: [
        {
          id,
          vector,
          payload: metadata as unknown as Record<string, unknown>,
        },
      ],
    });
  }

  /**
   * Similarity search returning ids and scores.
   *
   * @param vector  - query embedding vector
   * @param topK    - maximum number of results
   * @param filter  - optional Qdrant filter object
   * @param minScore - minimum similarity score threshold
   */
  async search(
    vector: number[],
    topK: number,
    filter?: Record<string, unknown>,
    minScore?: number
  ): Promise<VectorSearchResult[]> {
    const results = await qdrantClient.search(HADITH_COLLECTION_NAME, {
      vector,
      limit: topK,
      filter: filter as any,
      score_threshold: minScore,
      with_payload: true,
    });

    return results.map((hit) => ({
      id: hit.id as string,
      score: hit.score,
      payload: hit.payload as unknown as VectorMetadata,
    }));
  }
}
