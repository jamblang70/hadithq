import OpenAI from "openai";

/**
 * Dimensi output embedding untuk model text-embedding-3-small
 */
export const EMBEDDING_DIMENSION = 1536;

/**
 * Model embedding yang digunakan
 */
const EMBEDDING_MODEL = "text-embedding-3-small";

/**
 * Konfigurasi retry
 */
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

/**
 * EmbeddingService - Menghasilkan embedding vector dari teks menggunakan OpenAI API.
 *
 * Mendukung single text dan batch processing dengan retry exponential backoff.
 */
export class EmbeddingService {
  private client: OpenAI;

  constructor(client?: OpenAI) {
    this.client = client ?? new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  /**
   * Generate embedding vector untuk satu teks.
   *
   * @param text - Teks yang akan di-embed
   * @returns Vektor embedding dengan dimensi 1536
   * @throws Error jika teks kosong atau dimensi output tidak sesuai
   */
  async generateEmbedding(text: string): Promise<number[]> {
    if (!text || text.trim().length === 0) {
      throw new Error("Text must not be empty");
    }

    const response = await this.callWithRetry([text]);
    const embedding = response[0];

    this.validateDimension(embedding);

    return embedding;
  }

  /**
   * Generate embedding vectors untuk batch teks.
   *
   * @param texts - Array teks yang akan di-embed
   * @returns Array vektor embedding, satu per teks input
   * @throws Error jika array kosong atau dimensi output tidak sesuai
   */
  async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) {
      throw new Error("Texts array must not be empty");
    }

    for (const text of texts) {
      if (!text || text.trim().length === 0) {
        throw new Error("Each text in batch must not be empty");
      }
    }

    const embeddings = await this.callWithRetry(texts);

    if (embeddings.length !== texts.length) {
      throw new Error(
        `Expected ${texts.length} embeddings but received ${embeddings.length}`
      );
    }

    for (const embedding of embeddings) {
      this.validateDimension(embedding);
    }

    return embeddings;
  }

  /**
   * Panggil OpenAI embeddings API dengan retry exponential backoff.
   */
  private async callWithRetry(input: string[]): Promise<number[][]> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await this.client.embeddings.create({
          model: EMBEDDING_MODEL,
          input,
        });

        // Sort by index to ensure correct ordering
        const sorted = response.data.sort((a, b) => a.index - b.index);
        return sorted.map((item) => item.embedding);
      } catch (error) {
        lastError = error;
        if (attempt < MAX_RETRIES) {
          const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
          await this.sleep(delay);
        }
      }
    }

    throw lastError;
  }

  /**
   * Validasi bahwa embedding memiliki dimensi yang benar.
   */
  private validateDimension(embedding: number[]): void {
    if (embedding.length !== EMBEDDING_DIMENSION) {
      throw new Error(
        `Expected embedding dimension ${EMBEDDING_DIMENSION} but got ${embedding.length}`
      );
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
