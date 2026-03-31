import type { Hadith, SupportedLanguage } from "./hadith.js";

/**
 * FilterOptions - Opsi filter untuk pencarian
 */
export interface FilterOptions {
  collections: string[];
  grade_filter: string[];
  language?: SupportedLanguage;
}

/**
 * SearchRequest - Permintaan pencarian dari pengguna
 */
export interface SearchRequest {
  query: string;
  language: SupportedLanguage;
  collections: string[];
  grade_filter: string[];
  limit: number;
  offset: number;
  min_score: number;
}

/**
 * SearchResult - Hasil pencarian individual
 */
export interface SearchResult {
  hadith: Hadith;
  similarity_score: number;
  matched_language: string;
  highlight_text: string;
}

/**
 * SearchResponse - Respons pencarian lengkap
 */
export interface SearchResponse {
  results: SearchResult[];
  total_count: number;
  query: string;
  processing_time_ms: number;
  page: number;
  total_pages: number;
}
