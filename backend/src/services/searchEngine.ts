import type {
  FilterOptions,
  SearchRequest,
  SearchResponse,
  SearchResult,
} from "../types/index.js";
import type { EmbeddingService } from "./embeddingService.js";
import type { VectorRepository } from "../repositories/vectorRepository.js";
import type { HadithRepository } from "../repositories/hadithRepository.js";
import type { CacheRepository } from "../repositories/cacheRepository.js";

/**
 * Dependencies injected into semanticSearch for testability.
 */
export interface SearchDependencies {
  embeddingService: EmbeddingService;
  vectorRepository: VectorRepository;
  hadithRepository: HadithRepository;
  cacheRepository: CacheRepository;
}

/**
 * Hasil pencarian setelah re-ranking, dengan skor akhir gabungan.
 */
export interface RankedSearchResult extends SearchResult {
  final_score: number;
}

/**
 * Membangun Qdrant filter expression dari FilterOptions.
 *
 * - collections  → key "collection_id", match.any
 * - grade_filter → key "grade", match.any
 * - language     → key "language", match.value
 *
 * Semua kondisi digabung dengan AND logic (Qdrant "must" array).
 * Mengembalikan undefined jika tidak ada filter yang aktif.
 */
export function buildFilterExpression(
  filters: FilterOptions
): Record<string, unknown> | undefined {
  const must: Record<string, unknown>[] = [];

  if (filters.collections && filters.collections.length > 0) {
    must.push({
      key: "collection_id",
      match: filters.collections.length === 1
        ? { value: filters.collections[0] }
        : { any: filters.collections },
    });
  }

  if (filters.grade_filter && filters.grade_filter.length > 0) {
    must.push({
      key: "grade",
      match: filters.grade_filter.length === 1
        ? { value: filters.grade_filter[0] }
        : { any: filters.grade_filter },
    });
  }

  if (filters.language) {
    must.push({
      key: "language",
      match: { value: filters.language },
    });
  }

  if (must.length === 0) {
    return undefined;
  }

  return { must };
}

/**
 * Re-rank hasil pencarian berdasarkan derajat hadis dan koleksi.
 *
 * Bonus skor:
 * - grade "sahih"  → +0.05
 * - grade "hasan"  → +0.02
 * - koleksi "bukhari" atau "muslim" → +0.03
 *
 * final_score = MIN(1.0, similarity_score + gradeBonus + collectionBonus)
 * Hasil diurutkan descending berdasarkan final_score.
 */
export function rerank(results: SearchResult[]): RankedSearchResult[] {
  const ranked: RankedSearchResult[] = results.map((result) => {
    let gradeBonus = 0;
    if (result.hadith.grade === "sahih") {
      gradeBonus = 0.05;
    } else if (result.hadith.grade === "hasan") {
      gradeBonus = 0.02;
    }

    let collectionBonus = 0;
    if (
      result.hadith.collection_id === "bukhari" ||
      result.hadith.collection_id === "muslim"
    ) {
      collectionBonus = 0.03;
    }

    const finalScore = Math.min(
      1.0,
      result.similarity_score + gradeBonus + collectionBonus
    );

    return { ...result, final_score: finalScore };
  });

  ranked.sort((a, b) => b.final_score - a.final_score);

  return ranked;
}


/**
 * Cache TTL in seconds (1 hour).
 */
const CACHE_TTL_SECONDS = 3600;

export function buildSearchCacheKey(
  request: SearchRequest,
  cacheRepository: CacheRepository
): string {
  return cacheRepository.generateKey(
    "search",
    request.query,
    [...(request.collections ?? [])].sort().join(","),
    request.language,
    [...(request.grade_filter ?? [])].sort().join(","),
    String(request.limit),
    String(request.offset),
    String(request.min_score)
  );
}

/**
 * semanticSearch - alur pencarian utama.
 *
 * 1. Generate cache key dari query + collections + language
 * 2. Cek cache, return jika hit
 * 3. Generate embedding untuk query
 * 4. Bangun filter expression
 * 5. Search Qdrant (topK = limit * 2)
 * 6. Ambil hadith IDs dari vector results
 * 7. Fetch metadata hadis dari PostgreSQL
 * 8. Gabungkan hasil menjadi SearchResult[]
 * 9. Re-rank
 * 10. Pagination (slice offset → offset + limit)
 * 11. Bangun SearchResponse
 * 12. Simpan ke cache
 */
export async function semanticSearch(
  request: SearchRequest,
  deps: SearchDependencies
): Promise<SearchResponse> {
  const startTime = Date.now();

  // 1. Generate cache key
  const cacheKey = buildSearchCacheKey(request, deps.cacheRepository);

  // 2. Check cache
  const cached = deps.cacheRepository.get<SearchResponse>(cacheKey);
  if (cached) {
    return cached;
  }

  // 3-8. Try vector search; fallback to full-text search on failure
  let results: SearchResult[];

  try {
    // 3. Generate embedding for query
    const queryEmbedding = await deps.embeddingService.generateEmbedding(
      request.query
    );

    // 4. Build filter expression
    const filterExpr = buildFilterExpression({
      collections: request.collections,
      grade_filter: request.grade_filter,
      language: request.language,
    });

    // 5. Vector similarity search (fetch extra for re-ranking)
    const topK = request.limit * 2;
    const vectorResults = await deps.vectorRepository.search(
      queryEmbedding,
      topK,
      filterExpr,
      request.min_score
    );

    // 6. Extract hadith IDs from vector results
    const hadithIds = vectorResults.map((vr) => vr.payload.hadith_id);

    // 7. Fetch hadith metadata from PostgreSQL
    const hadiths = await deps.hadithRepository.getHadithByIds(hadithIds);
    const hadithMap = new Map(hadiths.map((h) => [h.id, h]));

    // 8. Build SearchResult array
    results = [];
    for (const vr of vectorResults) {
      const hadith = hadithMap.get(vr.payload.hadith_id);
      if (hadith) {
        results.push({
          hadith,
          similarity_score: vr.score,
          matched_language: request.language,
          highlight_text: "",
        });
      }
    }
  } catch (error) {
    // Fallback: full-text search in PostgreSQL when embedding or vector DB fails
    console.error(
      "Vector search failed, falling back to full-text search:",
      error instanceof Error ? error.message : error
    );

    const fallbackHadiths = await deps.hadithRepository.fullTextSearch(
      request.query,
      request.collections ?? [],
      request.limit * 2,
      0
    );

    results = fallbackHadiths.map((hadith) => ({
      hadith,
      similarity_score: 0,
      matched_language: request.language,
      highlight_text: "",
    }));
  }

  // 9. Re-rank
  const ranked = rerank(results);

  // 10. Pagination
  const totalCount = ranked.length;
  const paginated = ranked.slice(
    request.offset,
    request.offset + request.limit
  );

  // 11. Build SearchResponse
  const processingTimeMs = Date.now() - startTime;
  const page = Math.floor(request.offset / request.limit) + 1;
  const totalPages = Math.ceil(totalCount / request.limit);

  const response: SearchResponse = {
    results: paginated,
    total_count: totalCount,
    query: request.query,
    processing_time_ms: processingTimeMs,
    page,
    total_pages: totalPages,
  };

  // 12. Cache the response
  deps.cacheRepository.set(cacheKey, response, CACHE_TTL_SECONDS);

  return response;
}
