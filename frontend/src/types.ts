/**
 * Frontend types matching backend API contracts.
 */

export type HadithGrade = "sahih" | "hasan" | "dhaif" | "maudu" | "unknown";
export type SupportedLanguage = "ar" | "id" | "en";

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
  created_at: string;
  updated_at: string;
}

export interface Collection {
  id: string;
  name: string;
  name_arabic: string;
  author: string;
  total_hadith: number;
  description: string;
  available_languages: SupportedLanguage[];
}

export interface SearchResult {
  hadith: Hadith;
  similarity_score: number;
  matched_language: string;
  highlight_text: string;
}

export interface SearchResponse {
  results: SearchResult[];
  total_count: number;
  query: string;
  processing_time_ms: number;
  page: number;
  total_pages: number;
}

export interface SearchFilters {
  collections: string[];
  language: SupportedLanguage;
  grades: string[];
}

export interface SearchParams {
  query: string;
  language: SupportedLanguage;
  collections: string[];
  grade_filter: string[];
  limit: number;
  offset: number;
  min_score: number;
}
