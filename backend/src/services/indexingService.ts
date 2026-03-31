import type { EmbeddingService } from "./embeddingService.js";
import type { VectorRepository, VectorMetadata } from "../repositories/vectorRepository.js";
import type { HadithRepository } from "../repositories/hadithRepository.js";
import type { IndexingReport, IndexingError } from "../types/index.js";
import { cleanText } from "../utils/cleanText.js";

/**
 * Dependencies injected into IndexingService for testability.
 */
export interface IndexingDependencies {
  embeddingService: EmbeddingService;
  vectorRepository: VectorRepository;
  hadithRepository: HadithRepository;
}

/**
 * Mapping from fawazahmed0 edition names to internal collection IDs and display names.
 */
const EDITION_MAP: Record<string, { id: string; name: string }> = {
  "eng-bukhari": { id: "bukhari", name: "Sahih al-Bukhari" },
  "eng-muslim": { id: "muslim", name: "Sahih Muslim" },
  "eng-abudawud": { id: "abudawud", name: "Sunan Abu Dawud" },
  "eng-tirmidhi": { id: "tirmidhi", name: "Jami at-Tirmidzi" },
  "eng-nasai": { id: "nasai", name: "Sunan an-Nasa'i" },
  "eng-ibnmajah": { id: "ibnmajah", name: "Sunan Ibnu Majah" },
  "eng-malik": { id: "malik", name: "Muwatta Malik" },
};

const BATCH_SIZE = 100;

/**
 * Shape of a single hadith from a language edition of the fawazahmed0 API.
 */
interface ApiLanguageHadith {
  hadithnumber: number;
  text: string;
}

/**
 * Shape of a language edition response from the fawazahmed0 API.
 */
interface ApiLanguageEditionResponse {
  metadata: { name: string };
  hadiths: ApiLanguageHadith[];
}

/**
 * Shape of a single hadith from the fawazahmed0 API.
 */
interface ApiHadith {
  hadithnumber: number;
  text: string;
  grades: Array<{ name: string; grade: string }>;
}

/**
 * Shape of a collection response from the fawazahmed0 API.
 */
interface ApiCollectionResponse {
  metadata: { name: string; sections?: Record<string, string> };
  hadiths: ApiHadith[];
}

/**
 * IndexingService - Mengambil data hadis dari fawazahmed0 Hadith API
 * dan mengindeksnya ke Qdrant (vector) dan PostgreSQL (metadata).
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7
 */
export class IndexingService {
  private deps: IndexingDependencies;
  private baseUrl: string;

  constructor(deps: IndexingDependencies) {
    this.deps = deps;
    this.baseUrl =
      process.env.HADITH_API_BASE_URL ||
      "https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1";
  }

  /**
   * Index all target English collections from the Hadith API.
   *
   * Processes each collection sequentially. Errors on one collection
   * are recorded and processing continues with the next collection.
   *
   * Postcondition: collections_processed + errors.length = total target collections
   */
  async indexAllCollections(): Promise<IndexingReport> {
    const startTime = new Date();
    const errors: IndexingError[] = [];
    let collectionsProcessed = 0;
    let totalHadithIndexed = 0;
    let arabicIndexed = 0;
    let indonesianIndexed = 0;

    const editionKeys = Object.keys(EDITION_MAP);

    for (const editionKey of editionKeys) {
      const { id: collectionId, name: collectionName } = EDITION_MAP[editionKey];
      try {
        const count = await this.indexCollection(collectionId, collectionName);
        totalHadithIndexed += count;
        collectionsProcessed++;
        console.log(
          `[IndexingService] Collection "${collectionName}" indexed: ${count} hadiths`
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error);
        errors.push({ collection: collectionId, error: message });
        console.error(
          `[IndexingService] Error indexing "${collectionId}": ${message}`
        );
      }

      // Index Arabic edition
      try {
        const araCount = await this.indexLanguageEdition(collectionId, "ara", "text_arabic");
        arabicIndexed += araCount;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push({ collection: collectionId, error: `Arabic indexing: ${message}` });
        console.error(
          `[IndexingService] Error indexing Arabic for "${collectionId}": ${message}`
        );
      }

      // Index Indonesian edition
      try {
        const indCount = await this.indexLanguageEdition(collectionId, "ind", "text_indonesian");
        indonesianIndexed += indCount;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push({ collection: collectionId, error: `Indonesian indexing: ${message}` });
        console.error(
          `[IndexingService] Error indexing Indonesian for "${collectionId}": ${message}`
        );
      }
    }

    const endTime = new Date();
    const durationSeconds =
      (endTime.getTime() - startTime.getTime()) / 1000;

    const report: IndexingReport = {
      start_time: startTime,
      end_time: endTime,
      duration_seconds: durationSeconds,
      collections_processed: collectionsProcessed,
      total_hadith_indexed: totalHadithIndexed,
      errors,
      arabic_indexed: arabicIndexed,
      indonesian_indexed: indonesianIndexed,
    };

    return report;
  }

  /**
   * Index a single collection by fetching its hadiths from the API,
   * generating embeddings in batches, and upserting to Qdrant + PostgreSQL.
   *
   * @param collectionId - Internal collection ID (e.g. "bukhari")
   * @param collectionName - Display name (e.g. "Sahih al-Bukhari")
   * @returns Number of hadiths successfully indexed
   */
  async indexCollection(
    collectionId: string,
    collectionName: string
  ): Promise<number> {
    // Find the edition key for this collection
    const editionKey = this.getEditionKey(collectionId);
    if (!editionKey) {
      throw new Error(`Unknown collection ID: ${collectionId}`);
    }

    // Fetch all hadiths for this edition
    const url = `${this.baseUrl}/editions/${editionKey}.json`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch ${url}: ${response.status} ${response.statusText}`
      );
    }

    const data = (await response.json()) as ApiCollectionResponse;
    const hadiths = data.hadiths;

    if (!hadiths || hadiths.length === 0) {
      return 0;
    }

    // Upsert the collection metadata to PostgreSQL
    await this.deps.hadithRepository.upsertCollection({
      id: collectionId,
      name: collectionName,
      name_arabic: "",
      author: "",
      total_hadith: hadiths.length,
      description: "",
      available_languages: ["en"],
    });

    // Process hadiths in batches
    let indexed = 0;
    const batches = this.splitIntoBatches(hadiths, BATCH_SIZE);

    for (const batch of batches) {
      indexed += await this.processBatch(batch, collectionId, collectionName);
    }

    return indexed;
  }

  /**
   * Fetch a language edition (Arabic or Indonesian) from the Hadith API
   * and update the corresponding field on existing hadith records.
   *
   * On fetch failure (404/network), logs a warning and returns 0 — does not throw.
   *
   * @param collectionId - Internal collection ID (e.g. "bukhari")
   * @param languagePrefix - "ara" for Arabic, "ind" for Indonesian
   * @param fieldName - Database field to update
   * @returns Number of hadiths successfully updated
   */
  private async indexLanguageEdition(
    collectionId: string,
    languagePrefix: "ara" | "ind",
    fieldName: "text_arabic" | "text_indonesian"
  ): Promise<number> {
    const editionKey = `${languagePrefix}-${collectionId}`;
    const url = `${this.baseUrl}/editions/${editionKey}.json`;

    let response: Response;
    try {
      response = await fetch(url);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(
        `[IndexingService] Warning: ${languagePrefix} edition for ${collectionId} not available: ${message}`
      );
      return 0;
    }

    if (!response.ok) {
      console.warn(
        `[IndexingService] Warning: ${languagePrefix} edition for ${collectionId} not available: ${response.status} ${response.statusText}`
      );
      return 0;
    }

    const data = (await response.json()) as ApiLanguageEditionResponse;
    const hadiths = data.hadiths;

    if (!hadiths || hadiths.length === 0) {
      return 0;
    }

    let updated = 0;
    for (const hadith of hadiths) {
      if (!hadith.text || hadith.text.trim().length === 0) {
        continue;
      }
      const success = await this.deps.hadithRepository.updateLanguageText(
        collectionId,
        hadith.hadithnumber,
        fieldName,
        hadith.text
      );
      if (success) {
        updated++;
      }
    }

    console.log(
      `[IndexingService] ${languagePrefix} edition for "${collectionId}": ${updated} hadiths updated`
    );
    return updated;
  }

  /**
   * Process a single batch of hadiths: clean text, generate embeddings,
   * upsert to PostgreSQL and Qdrant.
   */
  private async processBatch(
    batch: ApiHadith[],
    collectionId: string,
    collectionName: string
  ): Promise<number> {
    // Filter out hadiths with empty text
    const validHadiths = batch.filter(
      (h) => h.text && h.text.trim().length > 0
    );

    if (validHadiths.length === 0) {
      return 0;
    }

    // Clean texts
    const cleanedTexts = validHadiths.map((h) => cleanText(h.text));

    // Generate embeddings in batch
    const embeddings =
      await this.deps.embeddingService.generateBatchEmbeddings(cleanedTexts);

    // Upsert each hadith to PostgreSQL and Qdrant
    let count = 0;
    for (let i = 0; i < validHadiths.length; i++) {
      const apiHadith = validHadiths[i];
      const embedding = embeddings[i];

      const grade = this.normalizeGrade(apiHadith.grades);
      const externalId = `${collectionId}-${apiHadith.hadithnumber}`;

      // Upsert to PostgreSQL (returns the UUID)
      const hadithId = await this.deps.hadithRepository.upsertHadith({
        external_id: externalId,
        collection_id: collectionId,
        collection_name: collectionName,
        book_number: 0,
        book_name: "",
        hadith_number: apiHadith.hadithnumber,
        text_arabic: "",
        text_indonesian: "",
        text_english: apiHadith.text,
        narrator: "",
        grade,
        reference: `${collectionName} ${apiHadith.hadithnumber}`,
      });

      // Upsert to Qdrant
      const metadata: VectorMetadata = {
        hadith_id: hadithId,
        collection_id: collectionId,
        language: "en",
        grade,
        hadith_number: apiHadith.hadithnumber,
      };

      await this.deps.vectorRepository.upsert(hadithId, embedding, metadata);
      count++;
    }

    return count;
  }

  /**
   * Find the fawazahmed0 edition key for a given internal collection ID.
   */
  private getEditionKey(collectionId: string): string | undefined {
    for (const [key, value] of Object.entries(EDITION_MAP)) {
      if (value.id === collectionId) {
        return key;
      }
    }
    return undefined;
  }

  /**
   * Split an array into batches of the given size.
   */
  private splitIntoBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Normalize the grade from the API response to our internal grade values.
   * Takes the first grade entry if available.
   */
  private normalizeGrade(
    grades: Array<{ name: string; grade: string }> | undefined
  ): "sahih" | "hasan" | "dhaif" | "maudu" | "unknown" {
    if (!grades || grades.length === 0) {
      return "unknown";
    }

    const raw = grades[0].grade.toLowerCase().trim();

    if (raw.includes("sahih")) return "sahih";
    if (raw.includes("hasan")) return "hasan";
    if (raw.includes("daif") || raw.includes("dhaif") || raw.includes("da'if"))
      return "dhaif";
    if (raw.includes("maudu") || raw.includes("mawdu")) return "maudu";

    return "unknown";
  }
}
