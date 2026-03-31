/**
 * IndexingError - Error yang terjadi saat indexing satu koleksi
 */
export interface IndexingError {
  collection: string;
  error: string;
}

/**
 * IndexingReport - Laporan hasil proses indexing
 */
export interface IndexingReport {
  start_time: Date;
  end_time: Date;
  duration_seconds: number;
  collections_processed: number;
  total_hadith_indexed: number;
  errors: IndexingError[];
  arabic_indexed?: number;
  indonesian_indexed?: number;
}

/**
 * IndexingStatus - Status proses indexing yang sedang berjalan
 */
export interface IndexingStatus {
  is_running: boolean;
  current_collection: string | null;
  collections_processed: number;
  total_collections: number;
  total_hadith_indexed: number;
  errors: IndexingError[];
}
