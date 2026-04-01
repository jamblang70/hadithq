import pool from "../db/pool.js";
import type { Hadith, Collection, SupportedLanguage } from "../types/index.js";

/**
 * HadithRepository - CRUD operations untuk hadis dan koleksi di PostgreSQL.
 */
export class HadithRepository {
  /**
   * Upsert a collection record. Uses collection id as unique key.
   */
  async upsertCollection(collection: Collection): Promise<void> {
    const query = `
      INSERT INTO collections (id, name, name_arabic, author, total_hadith, description, available_languages)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        name_arabic = EXCLUDED.name_arabic,
        author = EXCLUDED.author,
        total_hadith = EXCLUDED.total_hadith,
        description = EXCLUDED.description,
        available_languages = EXCLUDED.available_languages
    `;
    await pool.query(query, [
      collection.id,
      collection.name,
      collection.name_arabic,
      collection.author,
      collection.total_hadith,
      collection.description,
      collection.available_languages,
    ]);
  }

  /**
   * Upsert a hadith record. Uses (external_id, collection_id) as unique key.
   */
  async upsertHadith(hadith: Omit<Hadith, "id" | "created_at" | "updated_at">): Promise<string> {
    const query = `
      INSERT INTO hadiths (
        external_id, collection_id, collection_name, book_number, book_name,
        hadith_number, text_arabic, text_indonesian, text_english,
        narrator, grade, reference
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (external_id, collection_id) DO UPDATE SET
        collection_name = EXCLUDED.collection_name,
        book_number = EXCLUDED.book_number,
        book_name = EXCLUDED.book_name,
        hadith_number = EXCLUDED.hadith_number,
        text_arabic = EXCLUDED.text_arabic,
        text_indonesian = EXCLUDED.text_indonesian,
        text_english = EXCLUDED.text_english,
        narrator = EXCLUDED.narrator,
        grade = EXCLUDED.grade,
        reference = EXCLUDED.reference,
        updated_at = NOW()
      RETURNING id
    `;
    const result = await pool.query(query, [
      hadith.external_id,
      hadith.collection_id,
      hadith.collection_name,
      hadith.book_number,
      hadith.book_name,
      hadith.hadith_number,
      hadith.text_arabic,
      hadith.text_indonesian,
      hadith.text_english,
      hadith.narrator,
      hadith.grade,
      hadith.reference,
    ]);
    return result.rows[0].id as string;
  }

  /**
   * Get multiple hadiths by their UUIDs.
   */
  async getHadithByIds(ids: string[]): Promise<Hadith[]> {
    if (ids.length === 0) return [];

    const query = `
      SELECT id, external_id, collection_id, collection_name, book_number, book_name,
             hadith_number, text_arabic, text_indonesian, text_english,
             narrator, grade, reference, created_at, updated_at
      FROM hadiths
      WHERE id = ANY($1)
    `;
    const result = await pool.query(query, [ids]);
    return result.rows as Hadith[];
  }

  /**
   * Get a single hadith by its UUID.
   */
  async getHadithById(id: string): Promise<Hadith | null> {
    const query = `
      SELECT id, external_id, collection_id, collection_name, book_number, book_name,
             hadith_number, text_arabic, text_indonesian, text_english,
             narrator, grade, reference, created_at, updated_at
      FROM hadiths
      WHERE id = $1
    `;
    const result = await pool.query(query, [id]);
    return (result.rows[0] as Hadith) ?? null;
  }

  /**
   * Get all collections.
   */
  async getCollections(): Promise<Collection[]> {
    const query = `
      SELECT id, name, name_arabic, author, total_hadith, description, available_languages
      FROM collections
      ORDER BY name
    `;
    const result = await pool.query(query);
    return result.rows as Collection[];
  }

  /**
   * Get a hadith by collection ID and hadith number.
   */
  async getHadithByNumber(collectionId: string, hadithNumber: number): Promise<Hadith | null> {
    const query = `
      SELECT id, external_id, collection_id, collection_name, book_number, book_name,
             hadith_number, text_arabic, text_indonesian, text_english,
             narrator, grade, reference, created_at, updated_at
      FROM hadiths
      WHERE collection_id = $1 AND hadith_number = $2
      LIMIT 1
    `;
    const result = await pool.query(query, [collectionId, hadithNumber]);
    return (result.rows[0] as Hadith) ?? null;
  }

  /**
   * Get hadiths by collection with pagination.
   */
  async getHadithByCollection(
    collectionId: string,
    limit: number,
    offset: number
  ): Promise<Hadith[]> {
    const query = `
      SELECT id, external_id, collection_id, collection_name, book_number, book_name,
             hadith_number, text_arabic, text_indonesian, text_english,
             narrator, grade, reference, created_at, updated_at
      FROM hadiths
      WHERE collection_id = $1
      ORDER BY hadith_number
      LIMIT $2 OFFSET $3
    `;
    const result = await pool.query(query, [collectionId, limit, offset]);
    return result.rows as Hadith[];
  }

  /**
   * Get all hadiths that have non-empty Indonesian text, with pagination.
   */
  async getHadithsWithIndonesianText(limit: number, offset: number): Promise<Hadith[]> {
    const query = `
      SELECT id, external_id, collection_id, collection_name, book_number, book_name,
             hadith_number, text_arabic, text_indonesian, text_english,
             narrator, grade, reference, created_at, updated_at
      FROM hadiths
      WHERE text_indonesian IS NOT NULL AND text_indonesian <> ''
      ORDER BY id
      LIMIT $1 OFFSET $2
    `;
    const result = await pool.query(query, [limit, offset]);
    return result.rows as Hadith[];
  }

  /**
   * Update a single language text field on a hadith matched by collection_id and hadith_number.
   * Only "text_arabic" and "text_indonesian" are allowed as fieldName.
   * Returns true if a row was updated, false otherwise.
   */
  async updateLanguageText(
    collectionId: string,
    hadithNumber: number,
    fieldName: "text_arabic" | "text_indonesian",
    text: string
  ): Promise<boolean> {
    const allowedFields = ["text_arabic", "text_indonesian"] as const;
    if (!allowedFields.includes(fieldName)) {
      throw new Error(`Invalid fieldName: ${fieldName}. Must be one of: ${allowedFields.join(", ")}`);
    }

    const query = `
      UPDATE hadiths
      SET ${fieldName} = $1, updated_at = NOW()
      WHERE collection_id = $2 AND hadith_number = $3
    `;
    const result = await pool.query(query, [text, collectionId, hadithNumber]);
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Full-text search fallback using PostgreSQL ILIKE.
   * Used when Vector DB is unavailable.
   */
  async fullTextSearch(
    query: string,
    collections: string[],
    limit: number,
    offset: number
  ): Promise<Hadith[]> {
    const pattern = `%${query}%`;
    let sql: string;
    let params: unknown[];

    if (collections.length > 0) {
      sql = `
        SELECT id, external_id, collection_id, collection_name, book_number, book_name,
               hadith_number, text_arabic, text_indonesian, text_english,
               narrator, grade, reference, created_at, updated_at
        FROM hadiths
        WHERE (text_arabic ILIKE $1 OR text_indonesian ILIKE $1 OR text_english ILIKE $1)
          AND collection_id = ANY($2)
        ORDER BY hadith_number
        LIMIT $3 OFFSET $4
      `;
      params = [pattern, collections, limit, offset];
    } else {
      sql = `
        SELECT id, external_id, collection_id, collection_name, book_number, book_name,
               hadith_number, text_arabic, text_indonesian, text_english,
               narrator, grade, reference, created_at, updated_at
        FROM hadiths
        WHERE text_arabic ILIKE $1 OR text_indonesian ILIKE $1 OR text_english ILIKE $1
        ORDER BY hadith_number
        LIMIT $2 OFFSET $3
      `;
      params = [pattern, limit, offset];
    }

    const result = await pool.query(sql, params);
    return result.rows as Hadith[];
  }

  /**
   * Get a random hadith that has non-empty text. Uses a date-based seed
   * so the same hadith is returned for the entire day.
   */
  async getDailyHadith(): Promise<Hadith | null> {
    const today = new Date().toISOString().slice(0, 10); // "2026-03-31"
    const seed = Array.from(today).reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const query = `
      SELECT id, external_id, collection_id, collection_name, book_number, book_name,
             hadith_number, text_arabic, text_indonesian, text_english,
             narrator, grade, reference, created_at, updated_at
      FROM hadiths
      WHERE text_english <> '' AND grade IN ('sahih', 'hasan')
      ORDER BY md5(id::text || $1::text)
      LIMIT 1
    `;
    const result = await pool.query(query, [seed]);
    return (result.rows[0] as Hadith) ?? null;
  }

  /**
   * Get total hadith count and collection count for stats.
   */
  async getStats(): Promise<{ totalHadith: number; totalCollections: number }> {
    const hadithResult = await pool.query("SELECT COUNT(*) as count FROM hadiths");
    const collResult = await pool.query("SELECT COUNT(*) as count FROM collections");
    return {
      totalHadith: parseInt(hadithResult.rows[0].count, 10),
      totalCollections: parseInt(collResult.rows[0].count, 10),
    };
  }
}
