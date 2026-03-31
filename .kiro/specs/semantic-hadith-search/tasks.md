# Implementation Plan: Semantic Hadith Search

## Overview

Implementasi sistem pencarian hadis semantik menggunakan TypeScript. Backend menggunakan Express.js dengan PostgreSQL dan Qdrant sebagai vector database. Frontend menggunakan React. Embedding dihasilkan melalui OpenAI text-embedding-3-small. Data hadis diambil dari fawazahmed0 Hadith API.

## Tasks

- [x] 1. Setup project structure dan konfigurasi dasar
  - [x] 1.1 Inisialisasi monorepo dengan backend (Express + TypeScript) dan frontend (React + TypeScript)
    - Setup `package.json`, `tsconfig.json` untuk backend dan frontend
    - Install dependencies: express, pg, qdrant-client, openai, redis, cors, helmet, express-rate-limit
    - Install dev dependencies: vitest, fast-check, supertest
    - Setup environment variables template (`.env.example`) untuk API keys dan database URLs
    - _Requirements: 12.3_

  - [x] 1.2 Definisikan semua tipe data dan interface TypeScript
    - Buat `types/hadith.ts`: Hadith, Collection, HadithEmbedding
    - Buat `types/search.ts`: SearchRequest, SearchResponse, SearchResult, FilterOptions
    - Buat `types/indexing.ts`: IndexingReport, IndexingStatus
    - Implementasi validasi enum untuk `grade` ("sahih", "hasan", "dhaif", "maudu", "unknown") dan `language` ("ar", "id", "en")
    - _Requirements: 1.1, 2.1-2.7, 3.1-3.5_

- [x] 2. Implementasi text cleaning dan normalisasi
  - [x] 2.1 Implementasi fungsi `cleanText()` untuk pembersihan dan normalisasi teks hadis
    - Hapus tag HTML dari teks
    - Normalisasi diakritik Arab (harakat) dan huruf Arab (hamzah, alif)
    - Normalisasi whitespace (collapse multiple spaces, trim)
    - Hapus karakter khusus yang tidak relevan
    - Pastikan output tidak kosong jika input tidak kosong
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ]* 2.2 Write property test: cleanText tidak pernah mengembalikan string kosong untuk input non-kosong
    - **Property CP-8 (partial): Non-empty input menghasilkan non-empty output**
    - **Validates: Requirements 5.5**

  - [ ]* 2.3 Write unit tests untuk cleanText
    - Test HTML tag removal
    - Test normalisasi karakter Arab
    - Test whitespace normalisasi
    - Test karakter khusus removal
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 3. Implementasi validasi input pencarian
  - [x] 3.1 Implementasi middleware validasi SearchRequest
    - Validasi query tidak kosong dan maksimal 500 karakter
    - Validasi language harus "ar", "id", atau "en"
    - Validasi limit antara 1-100
    - Validasi offset >= 0
    - Validasi min_score antara 0.0-1.0
    - Validasi collection IDs terhadap daftar koleksi yang valid
    - Return error 400 dengan pesan spesifik untuk setiap jenis validasi yang gagal
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [ ]* 3.2 Write property test: validasi input menolak query kosong dan limit di luar rentang
    - **Property CP-8: Query kosong dan limit invalid harus ditolak**
    - **Validates: Requirements 2.1, 2.4**

  - [ ]* 3.3 Write unit tests untuk validasi input
    - Test setiap jenis validasi error (query kosong, query terlalu panjang, language invalid, dll)
    - Test input yang valid lolos validasi
    - _Requirements: 2.1-2.7_

- [x] 4. Checkpoint - Pastikan semua tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implementasi Embedding Service
  - [x] 5.1 Implementasi `EmbeddingService` class dengan OpenAI text-embedding-3-small
    - Method `generateEmbedding(text: string): Promise<number[]>` untuk single text
    - Method `generateBatchEmbeddings(texts: string[]): Promise<number[][]>` untuk batch processing
    - Implementasi retry dengan exponential backoff (3 kali percobaan)
    - Validasi dimensi output embedding (1536)
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [ ]* 5.2 Write property test: batch embedding mengembalikan jumlah vektor yang sama dengan jumlah input
    - **Property CP-1 (partial): Batch embedding count = input count**
    - **Validates: Requirements 6.3**

  - [ ]* 5.3 Write unit tests untuk EmbeddingService
    - Test single embedding generation (mock OpenAI API)
    - Test batch embedding
    - Test retry behavior saat API gagal
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 6. Implementasi database layer
  - [x] 6.1 Setup PostgreSQL schema dan koneksi
    - Buat tabel `collections` untuk metadata koleksi hadis
    - Buat tabel `hadiths` untuk data hadis lengkap (teks Arab, terjemahan, perawi, derajat, referensi)
    - Buat tabel `hadith_embeddings` untuk tracking embedding metadata
    - Setup connection pool
    - _Requirements: 7.3_

  - [x] 6.2 Setup Qdrant vector database collection dan koneksi
    - Buat collection dengan dimensi 1536 dan cosine similarity metric
    - Definisikan payload schema untuk metadata filter (collection_id, language, grade)
    - Setup koneksi client
    - _Requirements: 1.1, 7.3_

  - [x] 6.3 Implementasi data access layer (repository pattern)
    - `HadithRepository`: CRUD operations untuk hadis dan koleksi di PostgreSQL
    - `VectorRepository`: operasi upsert dan search di Qdrant
    - `CacheRepository`: operasi get/set dengan TTL di Redis/in-memory
    - _Requirements: 1.1, 7.3, 8.1, 8.2, 8.3_

- [x] 7. Implementasi Search Engine Module
  - [x] 7.1 Implementasi `buildFilterExpression()` untuk membangun filter query Qdrant
    - Filter berdasarkan koleksi hadis (collections)
    - Filter berdasarkan derajat hadis (grade_filter)
    - Filter berdasarkan bahasa (language)
    - Filter kosong mengembalikan semua data
    - Kombinasi filter menggunakan AND logic
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 7.2 Implementasi `rerank()` untuk re-ranking hasil pencarian
    - Tambahkan bonus skor 0.05 untuk hadis berderajat "sahih"
    - Tambahkan bonus skor 0.02 untuk hadis berderajat "hasan"
    - Tambahkan bonus skor 0.03 untuk hadis dari koleksi "bukhari" atau "muslim"
    - Pastikan final_score tetap dalam rentang 0.0-1.0 dengan MIN(1.0, skor_gabungan)
    - Urutkan hasil berdasarkan final_score descending
    - Jumlah hasil tidak berubah setelah re-ranking
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ]* 7.3 Write property test: rerank selalu mengembalikan hasil terurut descending
    - **Property CP-5: Hasil terurut dari skor tertinggi ke terendah**
    - **Validates: Requirements 4.4**

  - [ ]* 7.4 Write property test: rerank mempertahankan jumlah hasil yang sama
    - **Property CP-5 (partial): Jumlah hasil sebelum dan sesudah re-ranking sama**
    - **Validates: Requirements 4.5**

  - [ ]* 7.5 Write property test: filter koleksi hanya mengembalikan hadis dari koleksi yang diminta
    - **Property CP-3: Kelengkapan filter koleksi**
    - **Validates: Requirements 3.1**

  - [x] 7.6 Implementasi `semanticSearch()` - alur pencarian utama
    - Cek cache terlebih dahulu
    - Generate embedding dari query pengguna
    - Lakukan vector similarity search di Qdrant dengan filter
    - Ambil metadata hadis dari PostgreSQL
    - Gabungkan hasil dan buat SearchResult
    - Re-rank hasil
    - Terapkan pagination (offset/limit)
    - Simpan hasil ke cache dengan TTL 1 jam
    - Bangun SearchResponse dengan total_count, processing_time_ms, page, total_pages
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 8.1, 8.2, 8.3, 9.1, 9.2, 9.3_

  - [ ]* 7.7 Write property test: semua hasil memiliki similarity_score >= min_score
    - **Property CP-4: Batas skor minimum**
    - **Validates: Requirements 1.4**

- [x] 8. Checkpoint - Pastikan semua tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Implementasi REST API endpoints
  - [x] 9.1 Implementasi `POST /api/search` endpoint
    - Terima SearchRequest dari body
    - Validasi input menggunakan middleware dari task 3.1
    - Panggil semanticSearch() dan kembalikan SearchResponse
    - _Requirements: 1.1, 1.5, 9.1, 9.2, 9.3_

  - [x] 9.2 Implementasi `GET /api/collections` endpoint
    - Kembalikan daftar semua koleksi hadis yang tersedia
    - _Requirements: 2.7_

  - [x] 9.3 Implementasi `GET /api/hadith/:id` endpoint
    - Kembalikan detail hadis lengkap termasuk sanad dan referensi
    - _Requirements: 10.4_

  - [x] 9.4 Implementasi middleware keamanan dan error handling
    - Rate limiting: 60 request per menit per IP
    - Input sanitization untuk mencegah injection attacks
    - CORS configuration (hanya izinkan domain frontend)
    - Helmet untuk security headers
    - Error handler: 400 (validasi), 429 (rate limit), 503 (service unavailable)
    - _Requirements: 11.1, 11.2, 11.4, 12.1, 12.2, 12.4, 12.5_

  - [ ]* 9.5 Write unit tests untuk API endpoints
    - Test search endpoint dengan valid dan invalid input
    - Test collections endpoint
    - Test hadith detail endpoint
    - Test rate limiting behavior
    - Test error responses (400, 429, 503)
    - _Requirements: 2.1-2.7, 11.1-11.4, 12.1_

- [x] 10. Implementasi Indexing Service
  - [x] 10.1 Implementasi `IndexingService` untuk mengambil dan mengindeks data hadis
    - Ambil daftar koleksi dari fawazahmed0 Hadith API
    - Proses setiap koleksi secara berurutan
    - Bagi hadis menjadi batch (100 per batch)
    - Bersihkan teks menggunakan cleanText()
    - Generate embeddings secara batch
    - Upsert ke Qdrant dan PostgreSQL (tidak ada duplikasi)
    - Catat error per koleksi dan lanjutkan ke koleksi berikutnya
    - Hasilkan IndexingReport (koleksi diproses, total hadis, errors, durasi)
    - Pastikan collections_processed + errors = total koleksi
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

  - [x] 10.2 Implementasi CLI command atau API endpoint untuk trigger indexing
    - `POST /api/admin/index` endpoint atau CLI script
    - Tampilkan progress dan report setelah selesai
    - _Requirements: 7.1_

  - [ ]* 10.3 Write property test: indexing bersifat idempoten (tidak ada duplikasi)
    - **Property CP-7: Menjalankan indexing dua kali tidak menghasilkan duplikasi**
    - **Validates: Requirements 7.6**

- [x] 11. Checkpoint - Pastikan semua tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Implementasi Frontend
  - [x] 12.1 Buat halaman utama dengan form pencarian
    - Input teks pencarian sebagai elemen utama
    - Komponen filter: koleksi hadis (multi-select), bahasa (dropdown), derajat hadis (multi-select)
    - Tombol pencarian
    - Responsif untuk mobile dan desktop
    - _Requirements: 10.1, 10.2, 10.5_

  - [x] 12.2 Implementasi komponen hasil pencarian
    - Tampilkan setiap hasil: teks Arab, terjemahan, nama koleksi, nomor hadis, perawi, derajat, skor relevansi
    - Render teks sebagai plain text (bukan HTML) untuk mencegah XSS
    - Kontrol pagination untuk navigasi antar halaman
    - _Requirements: 10.3, 10.6, 12.6_

  - [x] 12.3 Implementasi halaman detail hadis
    - Tampilkan detail hadis lengkap termasuk sanad dan referensi
    - Navigasi kembali ke hasil pencarian
    - _Requirements: 10.4_

  - [x] 12.4 Integrasi frontend dengan backend API
    - Service layer untuk memanggil API endpoints (search, collections, hadith detail)
    - Loading states dan error handling di UI
    - _Requirements: 10.1-10.6, 11.1, 11.2_

- [x] 13. Implementasi error handling dan fallback
  - [x] 13.1 Implementasi fallback dan graceful degradation
    - Fallback ke full-text search di PostgreSQL jika Vector DB tidak tersedia
    - Return 503 dengan pesan jelas jika embedding API tidak tersedia
    - Gunakan cache embedding jika tersedia saat API down
    - Error 429 dengan header Retry-After untuk rate limiting
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

  - [ ]* 13.2 Write integration tests untuk error handling
    - Test fallback ke full-text search
    - Test behavior saat embedding API down
    - Test rate limiting response
    - _Requirements: 11.1, 11.2, 11.4_

- [x] 14. Final checkpoint - Pastikan semua tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks dengan `*` bersifat opsional dan bisa dilewati untuk MVP yang lebih cepat
- Setiap task mereferensikan persyaratan spesifik untuk traceability
- Checkpoints memastikan validasi bertahap
- Property tests memvalidasi properti kebenaran universal dari design document
- Unit tests memvalidasi contoh spesifik dan edge cases
- Bahasa implementasi: TypeScript (backend Express.js, frontend React)
