/**
 * Valid hadith grades (derajat hadis)
 */
export const HADITH_GRADES = ["sahih", "hasan", "dhaif", "maudu", "unknown"] as const;
export type HadithGrade = (typeof HADITH_GRADES)[number];

/**
 * Supported languages
 */
export const SUPPORTED_LANGUAGES = ["ar", "id", "en"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export function isValidGrade(value: string): value is HadithGrade {
  return HADITH_GRADES.includes(value as HadithGrade);
}

export function isValidLanguage(value: string): value is SupportedLanguage {
  return SUPPORTED_LANGUAGES.includes(value as SupportedLanguage);
}

/**
 * Hadith - Data hadis lengkap
 */
export interface Hadith {
  id: string;
  external_id: string;
  collection_id: string;
  collection_name: string;
  book_number: number;
  book_name: string;
  hadith_number: number;
  text_arabic: string;
  text_indonesian: string;
  text_english: string;
  narrator: string;
  grade: HadithGrade;
  reference: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Collection - Koleksi hadis (kitab)
 */
export interface Collection {
  id: string;
  name: string;
  name_arabic: string;
  author: string;
  total_hadith: number;
  description: string;
  available_languages: SupportedLanguage[];
}

/**
 * HadithEmbedding - Embedding vektor untuk hadis
 */
export interface HadithEmbedding {
  id: string;
  hadith_id: string;
  language: SupportedLanguage;
  embedding_vector: number[];
  model_version: string;
  created_at: Date;
}
