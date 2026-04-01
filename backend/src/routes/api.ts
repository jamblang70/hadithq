import { Router, type Request, type Response } from "express";
import { validateSearch } from "../middleware/validateSearch.js";
import { semanticSearch } from "../services/searchEngine.js";
import { AiSearchService } from "../services/aiSearchService.js";
import { AiChatService, type ChatMessage } from "../services/aiChatService.js";
import { EmbeddingService } from "../services/embeddingService.js";
import { VectorRepository } from "../repositories/vectorRepository.js";
import { HadithRepository } from "../repositories/hadithRepository.js";
import { CacheRepository } from "../repositories/cacheRepository.js";
import { ensureCollection } from "../db/qdrant.js";
import { IndexingService } from "../services/indexingService.js";
import type { SearchRequest } from "../types/index.js";

const router = Router();

// Shared dependency instances
const embeddingService = new EmbeddingService();
const vectorRepository = new VectorRepository();
const hadithRepository = new HadithRepository();
const cacheRepository = new CacheRepository();
const aiSearchService = new AiSearchService();
const aiChatService = new AiChatService();

/**
 * POST /api/search
 * Semantic hadith search endpoint.
 */
router.post(
  "/search",
  validateSearch,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const searchRequest = (req as Request & { searchRequest: SearchRequest })
        .searchRequest;

      const response = await semanticSearch(searchRequest, {
        embeddingService,
        vectorRepository,
        hadithRepository,
        cacheRepository,
      });

      res.json(response);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Internal server error";
      res.status(503).json({ error: message });
    }
  }
);

/**
 * POST /api/ai-search
 * AI-powered hadith search using RAG (vector search + LLM re-ranking).
 */
router.post(
  "/ai-search",
  validateSearch,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const searchRequest = (req as Request & { searchRequest: SearchRequest })
        .searchRequest;

      const response = await aiSearchService.search(searchRequest, {
        embeddingService,
        vectorRepository,
        hadithRepository,
        cacheRepository,
      });

      res.json(response);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Internal server error";
      res.status(503).json({ error: message });
    }
  }
);

/**
 * POST /api/chat
 * AI chat about hadith — conversational Q&A with hadith references.
 */
router.post("/chat", async (req: Request, res: Response): Promise<void> => {
  try {
    const { message, history } = req.body as { message: string; history?: ChatMessage[] };

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      res.status(400).json({ error: "message is required" });
      return;
    }

    const result = await aiChatService.chat(message.trim(), history || [], {
      embeddingService,
      vectorRepository,
      hadithRepository,
      cacheRepository,
    });

    res.json(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Internal server error";
    res.status(503).json({ error: msg });
  }
});

/**
 * GET /api/daily
 * Returns the hadith of the day (same hadith for the entire day).
 */
router.get("/daily", async (_req: Request, res: Response): Promise<void> => {
  try {
    const hadith = await hadithRepository.getDailyHadith();
    if (!hadith) {
      res.status(404).json({ error: "No hadith available" });
      return;
    }
    res.json({ hadith });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    res.status(503).json({ error: message });
  }
});

/**
 * GET /api/stats
 * Returns total hadith count and collection count.
 */
router.get("/stats", async (_req: Request, res: Response): Promise<void> => {
  try {
    const stats = await hadithRepository.getStats();
    res.json(stats);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    res.status(503).json({ error: message });
  }
});

/**
 * GET /api/collections
 * Returns all available hadith collections.
 */
router.get("/collections", async (_req: Request, res: Response): Promise<void> => {
  try {
    const collections = await hadithRepository.getCollections();
    res.json({ collections });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    res.status(503).json({ error: message });
  }
});

/**
 * GET /api/hadith/lookup/:collection/:number
 * Lookup a hadith by collection ID and hadith number.
 */
router.get("/hadith/lookup/:collection/:number", async (req: Request, res: Response): Promise<void> => {
  try {
    const { collection, number } = req.params;
    const hadithNumber = parseFloat(number);
    if (isNaN(hadithNumber) || hadithNumber <= 0) {
      res.status(400).json({ error: "Invalid hadith number" });
      return;
    }
    const hadith = await hadithRepository.getHadithByNumber(collection, hadithNumber);
    if (!hadith) {
      res.status(404).json({ error: `Hadith ${collection} #${number} not found` });
      return;
    }
    res.json({ hadith });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    res.status(503).json({ error: message });
  }
});

/**
 * GET /api/hadith/:id
 * Returns full hadith detail by UUID.
 */
router.get("/hadith/:id", async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  try {
    const hadith = await hadithRepository.getHadithById(req.params.id);
    if (!hadith) {
      res.status(404).json({ error: "Hadith not found" });
      return;
    }
    res.json({ hadith });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    res.status(503).json({ error: message });
  }
});

/**
 * POST /api/admin/index
 * Triggers full hadith indexing from the external API.
 * Ensures the Qdrant collection exists, then indexes all collections.
 */
router.post("/admin/index", async (_req: Request, res: Response): Promise<void> => {
  try {
    await ensureCollection();

    const indexingService = new IndexingService({
      embeddingService,
      vectorRepository,
      hadithRepository,
    });

    const report = await indexingService.indexAllCollections();
    res.json(report);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    res.status(503).json({ error: message });
  }
});

/**
 * POST /api/admin/embed-indonesian
 * Embeds Indonesian text from existing hadiths into Qdrant.
 * Each hadith gets a second vector point with ID "{hadithId}-id" for Indonesian search.
 */
router.post("/admin/embed-indonesian", async (_req: Request, res: Response): Promise<void> => {
  try {
    await ensureCollection();

    const BATCH_SIZE = 100;
    let offset = 0;
    let totalEmbedded = 0;

    while (true) {
      const hadiths = await hadithRepository.getHadithsWithIndonesianText(BATCH_SIZE, offset);
      if (hadiths.length === 0) break;

      const texts = hadiths.map((h) => h.text_indonesian).filter((t) => t && t.trim().length > 0);
      const validHadiths = hadiths.filter((h) => h.text_indonesian && h.text_indonesian.trim().length > 0);

      if (texts.length > 0) {
        const embeddings = await embeddingService.generateBatchEmbeddings(texts);

        for (let i = 0; i < validHadiths.length; i++) {
          const hadith = validHadiths[i];
          // Use a deterministic UUID-like ID by replacing last char with 'a' to differentiate from English vector
          const pointId = hadith.id.slice(0, -1) + "a";
          await vectorRepository.upsert(pointId, embeddings[i], {
            hadith_id: hadith.id,
            collection_id: hadith.collection_id,
            language: "id",
            grade: hadith.grade,
            hadith_number: hadith.hadith_number,
          });
        }

        totalEmbedded += validHadiths.length;
        console.log(`[EmbedIndonesian] Embedded ${totalEmbedded} hadiths so far...`);
      }

      offset += BATCH_SIZE;
    }

    res.json({ total_embedded: totalEmbedded });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    console.error("[EmbedIndonesian] Error:", message);
    res.status(503).json({ error: message });
  }
});

export default router;
