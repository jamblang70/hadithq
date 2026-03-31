# Dokumen Persyaratan: Semantic Hadith Search

## Pendahuluan

Dokumen ini mendefinisikan persyaratan untuk sistem pencarian hadis semantik yang memungkinkan pengguna mencari hadis dari kitab-kitab hadis utama (Kutub al-Sittah dan koleksi lainnya) menggunakan pencarian berbasis makna (semantic search). Sistem menggunakan teknik embedding teks dan vector similarity search untuk menemukan hadis yang relevan secara tematik, bukan hanya pencocokan kata kunci secara literal.

## Glosarium

- **Sistem_Pencarian**: Modul inti yang mengelola alur pencarian semantik dari query pengguna hingga hasil pencarian
- **Layanan_Embedding**: Komponen yang menghasilkan vektor embedding dari teks menggunakan model bahasa (OpenAI text-embedding-3-small)
- **Layanan_Indexing**: Komponen yang mengambil data hadis dari API eksternal dan mengindeksnya ke vector database
- **Server_API**: Server REST API yang menangani request dari frontend dan mengkoordinasikan pencarian
- **Frontend**: Antarmuka web pengguna untuk pencarian hadis dan menampilkan hasil
- **Vector_DB**: Database vektor (Qdrant/Pinecone) yang menyimpan embedding hadis untuk similarity search
- **Database_Metadata**: Database PostgreSQL yang menyimpan metadata hadis (teks, perawi, kitab, derajat)
- **Cache**: Lapisan cache (Redis/in-memory) untuk menyimpan hasil pencarian yang sering dicari
- **Hadith_API**: API publik fawazahmed0 yang menyediakan data hadis dalam format JSON
- **SearchRequest**: Struktur data permintaan pencarian yang berisi query, filter, dan parameter pagination
- **SearchResponse**: Struktur data respons pencarian yang berisi hasil, total, dan metadata
- **SearchResult**: Struktur data hasil pencarian individual yang berisi hadis dan skor relevansi
- **Embedding_Vector**: Representasi numerik (vektor float) dari teks yang menangkap makna semantik
- **Similarity_Score**: Skor kesamaan semantik antara query dan hadis, bernilai 0.0 hingga 1.0
- **Koleksi_Hadis**: Kumpulan hadis dari satu kitab tertentu (contoh: Sahih Bukhari, Sahih Muslim)
- **Derajat_Hadis**: Klasifikasi kualitas hadis: "sahih", "hasan", "dhaif", "maudu", atau "unknown"

## Persyaratan

### Persyaratan 1: Pencarian Semantik Hadis

**User Story:** Sebagai pengguna, saya ingin mencari hadis berdasarkan makna/tema, sehingga saya dapat menemukan hadis yang relevan secara tematik meskipun tidak menggunakan kata kunci yang persis sama.

#### Kriteria Penerimaan

1. WHEN pengguna mengirimkan query pencarian yang valid, THE Sistem_Pencarian SHALL mengubah query menjadi Embedding_Vector dan melakukan vector similarity search di Vector_DB untuk mengembalikan daftar hadis yang relevan secara semantik
2. WHEN Sistem_Pencarian mengembalikan hasil pencarian, THE Sistem_Pencarian SHALL mengurutkan hasil berdasarkan Similarity_Score secara descending (dari skor tertinggi ke terendah)
3. WHILE pencarian berlangsung, THE Sistem_Pencarian SHALL memastikan setiap SearchResult memiliki Similarity_Score yang valid dalam rentang 0.0 hingga 1.0
4. WHEN pengguna menentukan parameter min_score dalam SearchRequest, THE Sistem_Pencarian SHALL hanya mengembalikan hasil dengan Similarity_Score yang sama dengan atau lebih besar dari min_score yang ditentukan
5. WHEN Sistem_Pencarian mengembalikan SearchResponse, THE Sistem_Pencarian SHALL menyertakan total_count, processing_time_ms, page, dan total_pages yang akurat

### Persyaratan 2: Validasi Input Pencarian

**User Story:** Sebagai pengguna, saya ingin mendapatkan pesan error yang jelas ketika input pencarian tidak valid, sehingga saya dapat memperbaiki query saya.

#### Kriteria Penerimaan

1. WHEN pengguna mengirimkan query kosong, THE Server_API SHALL menolak permintaan dengan error 400 (Bad Request) dan pesan validasi yang spesifik
2. WHEN pengguna mengirimkan query yang melebihi 500 karakter, THE Server_API SHALL menolak permintaan dengan error 400 dan pesan yang menjelaskan batas maksimal karakter
3. WHEN pengguna mengirimkan nilai language yang bukan "ar", "id", atau "en", THE Server_API SHALL menolak permintaan dengan error 400 dan daftar bahasa yang didukung
4. WHEN pengguna mengirimkan nilai limit di luar rentang 1 hingga 100, THE Server_API SHALL menolak permintaan dengan error 400 dan menjelaskan rentang yang valid
5. WHEN pengguna mengirimkan nilai offset negatif, THE Server_API SHALL menolak permintaan dengan error 400
6. WHEN pengguna mengirimkan nilai min_score di luar rentang 0.0 hingga 1.0, THE Server_API SHALL menolak permintaan dengan error 400
7. WHEN pengguna mengirimkan ID koleksi yang tidak valid dalam filter collections, THE Server_API SHALL menolak permintaan dengan error 400 dan daftar koleksi yang tersedia

### Persyaratan 3: Filter Pencarian

**User Story:** Sebagai pengguna, saya ingin memfilter hasil pencarian berdasarkan koleksi hadis, bahasa, dan derajat hadis, sehingga saya dapat mempersempit hasil sesuai kebutuhan.

#### Kriteria Penerimaan

1. WHEN pengguna menentukan filter koleksi dalam SearchRequest, THE Sistem_Pencarian SHALL hanya mengembalikan hadis dari koleksi yang diminta
2. WHEN pengguna menentukan filter derajat hadis (grade_filter), THE Sistem_Pencarian SHALL hanya mengembalikan hadis dengan derajat yang sesuai dengan filter
3. WHEN pengguna menentukan filter bahasa, THE Sistem_Pencarian SHALL melakukan pencarian pada teks hadis dalam bahasa yang diminta
4. WHEN pengguna tidak menentukan filter apapun (filter kosong), THE Sistem_Pencarian SHALL mengembalikan hasil dari semua koleksi, semua derajat, dan semua bahasa yang tersedia
5. WHEN pengguna menggabungkan beberapa filter sekaligus, THE Sistem_Pencarian SHALL menerapkan semua filter secara bersamaan (AND logic)

### Persyaratan 4: Re-ranking Hasil Pencarian

**User Story:** Sebagai pengguna, saya ingin hasil pencarian memprioritaskan hadis dengan derajat lebih tinggi dan dari koleksi utama, sehingga saya mendapatkan hadis yang paling terpercaya terlebih dahulu.

#### Kriteria Penerimaan

1. WHEN Sistem_Pencarian melakukan re-ranking, THE Sistem_Pencarian SHALL menambahkan bonus skor 0.05 untuk hadis berderajat "sahih" dan 0.02 untuk hadis berderajat "hasan"
2. WHEN Sistem_Pencarian melakukan re-ranking, THE Sistem_Pencarian SHALL menambahkan bonus skor 0.03 untuk hadis dari koleksi "bukhari" atau "muslim"
3. WHILE menghitung skor akhir (final_score), THE Sistem_Pencarian SHALL memastikan skor tetap dalam rentang 0.0 hingga 1.0 dengan menggunakan fungsi MIN(1.0, skor_gabungan)
4. WHEN re-ranking selesai, THE Sistem_Pencarian SHALL mengurutkan hasil berdasarkan final_score secara descending
5. THE Sistem_Pencarian SHALL mempertahankan jumlah hasil yang sama sebelum dan sesudah proses re-ranking


### Persyaratan 5: Pembersihan dan Normalisasi Teks

**User Story:** Sebagai pengembang, saya ingin teks hadis dibersihkan dan dinormalisasi sebelum diproses, sehingga embedding yang dihasilkan konsisten dan akurat.

#### Kriteria Penerimaan

1. WHEN teks hadis mengandung tag HTML, THE Layanan_Indexing SHALL menghapus semua tag HTML dari teks sebelum pemrosesan
2. WHEN teks hadis mengandung karakter Arab, THE Layanan_Indexing SHALL menormalisasi diakritik (harakat) dan huruf Arab (hamzah, alif) untuk konsistensi
3. WHEN teks hadis mengandung whitespace berlebih, THE Layanan_Indexing SHALL menormalisasi whitespace menjadi satu spasi dan menghapus leading/trailing whitespace
4. WHEN teks hadis mengandung karakter khusus yang tidak relevan, THE Layanan_Indexing SHALL menghapus karakter tersebut dari teks
5. WHEN teks input tidak kosong (panjang > 0), THE Layanan_Indexing SHALL menghasilkan teks output yang juga tidak kosong (panjang > 0)

### Persyaratan 6: Layanan Embedding

**User Story:** Sebagai pengembang, saya ingin sistem menghasilkan embedding vektor yang konsisten dari teks, sehingga pencarian semantik menghasilkan hasil yang dapat diandalkan.

#### Kriteria Penerimaan

1. WHEN teks dikirimkan ke Layanan_Embedding, THE Layanan_Embedding SHALL menghasilkan Embedding_Vector dengan dimensi yang sesuai model (1536 untuk text-embedding-3-small)
2. WHEN teks yang sama dikirimkan berulang kali, THE Layanan_Embedding SHALL menghasilkan Embedding_Vector yang identik (deterministik)
3. WHEN batch teks dikirimkan untuk embedding, THE Layanan_Embedding SHALL memproses semua teks dalam batch dan mengembalikan jumlah vektor yang sama dengan jumlah teks input
4. IF Layanan_Embedding gagal terhubung ke API embedding eksternal, THEN THE Layanan_Embedding SHALL melakukan retry dengan exponential backoff hingga 3 kali percobaan

### Persyaratan 7: Indexing Data Hadis

**User Story:** Sebagai administrator, saya ingin mengindeks data hadis dari API eksternal ke dalam sistem, sehingga data tersedia untuk pencarian semantik.

#### Kriteria Penerimaan

1. WHEN proses indexing dimulai, THE Layanan_Indexing SHALL mengambil daftar koleksi dari Hadith_API dan memproses setiap koleksi secara berurutan
2. WHEN memproses koleksi hadis, THE Layanan_Indexing SHALL membagi hadis menjadi batch (100 hadis per batch) untuk efisiensi pemrosesan embedding
3. WHEN sebuah hadis berhasil diindeks, THE Layanan_Indexing SHALL menyimpan Embedding_Vector di Vector_DB dan metadata hadis di Database_Metadata
4. WHEN proses indexing selesai, THE Layanan_Indexing SHALL menghasilkan IndexingReport yang berisi jumlah koleksi diproses, total hadis diindeks, daftar error, dan durasi proses
5. IF terjadi error saat mengindeks satu koleksi, THEN THE Layanan_Indexing SHALL mencatat error dalam report dan melanjutkan ke koleksi berikutnya
6. WHEN indexing dijalankan pada data yang sudah ada, THE Layanan_Indexing SHALL menggunakan operasi upsert sehingga tidak terjadi duplikasi data
7. WHEN proses indexing selesai, THE Layanan_Indexing SHALL memastikan jumlah koleksi yang berhasil diproses ditambah jumlah error sama dengan total koleksi yang tersedia

### Persyaratan 8: Caching Hasil Pencarian

**User Story:** Sebagai pengguna, saya ingin pencarian yang sering dilakukan memberikan hasil lebih cepat, sehingga pengalaman pencarian lebih responsif.

#### Kriteria Penerimaan

1. WHEN hasil pencarian berhasil diperoleh, THE Cache SHALL menyimpan hasil dengan TTL (Time-To-Live) 1 jam
2. WHEN query pencarian yang sama diterima dan cache masih valid, THE Sistem_Pencarian SHALL mengembalikan hasil dari Cache tanpa melakukan vector search ulang
3. WHEN cache key dihasilkan, THE Sistem_Pencarian SHALL memperhitungkan query, filter koleksi, dan bahasa untuk memastikan keunikan cache

### Persyaratan 9: Pagination Hasil Pencarian

**User Story:** Sebagai pengguna, saya ingin melihat hasil pencarian secara bertahap per halaman, sehingga saya tidak kewalahan dengan terlalu banyak hasil sekaligus.

#### Kriteria Penerimaan

1. THE Server_API SHALL menerapkan pagination dengan default 20 hasil per halaman
2. WHEN pengguna menentukan parameter limit dan offset, THE Server_API SHALL mengembalikan subset hasil sesuai parameter tersebut
3. WHEN SearchResponse dikembalikan, THE Server_API SHALL menyertakan informasi page (halaman saat ini) dan total_pages yang dihitung dari total_count dan limit

### Persyaratan 10: Antarmuka Pengguna (Frontend)

**User Story:** Sebagai pengguna, saya ingin antarmuka web yang intuitif untuk mencari hadis, sehingga saya dapat dengan mudah menemukan hadis yang saya cari.

#### Kriteria Penerimaan

1. THE Frontend SHALL menampilkan form pencarian dengan input teks sebagai elemen utama halaman
2. THE Frontend SHALL menampilkan komponen filter untuk koleksi hadis, bahasa, dan derajat hadis
3. WHEN hasil pencarian diterima, THE Frontend SHALL menampilkan setiap hasil dengan teks Arab, terjemahan, nama koleksi, nomor hadis, perawi, derajat, dan skor relevansi
4. WHEN pengguna memilih sebuah hadis, THE Frontend SHALL menampilkan detail hadis lengkap termasuk sanad dan referensi
5. THE Frontend SHALL responsif dan berfungsi dengan baik pada perangkat mobile dan desktop
6. WHEN hasil pencarian tersedia dalam beberapa halaman, THE Frontend SHALL menampilkan kontrol pagination untuk navigasi antar halaman

### Persyaratan 11: Penanganan Error dan Ketahanan Sistem

**User Story:** Sebagai pengguna, saya ingin sistem tetap memberikan respons yang informatif ketika terjadi masalah, sehingga saya tahu apa yang terjadi dan apa yang harus dilakukan.

#### Kriteria Penerimaan

1. IF API embedding eksternal tidak tersedia, THEN THE Server_API SHALL mengembalikan error 503 (Service Unavailable) dengan pesan yang jelas dan menggunakan cache embedding jika tersedia
2. IF Vector_DB tidak tersedia, THEN THE Server_API SHALL mengembalikan error 503 dan melakukan fallback ke pencarian teks biasa (full-text search) di Database_Metadata
3. IF Hadith_API tidak tersedia saat indexing, THEN THE Layanan_Indexing SHALL mencatat error, melanjutkan ke koleksi berikutnya, dan memungkinkan re-indexing manual nanti
4. IF terlalu banyak request diterima dari satu IP, THEN THE Server_API SHALL mengembalikan error 429 (Too Many Requests) dengan header Retry-After

### Persyaratan 12: Keamanan

**User Story:** Sebagai administrator, saya ingin sistem aman dari serangan umum, sehingga data dan layanan terlindungi.

#### Kriteria Penerimaan

1. THE Server_API SHALL menerapkan rate limiting untuk membatasi jumlah request per IP (60 request per menit)
2. THE Server_API SHALL melakukan sanitasi semua input pengguna untuk mencegah injection attacks
3. THE Server_API SHALL menyimpan API key (OpenAI, dll) di environment variables, bukan di kode sumber
4. THE Server_API SHALL menggunakan HTTPS untuk semua komunikasi
5. THE Server_API SHALL mengkonfigurasi CORS yang ketat, hanya mengizinkan domain frontend yang terdaftar
6. WHEN menampilkan teks hadis, THE Frontend SHALL merender teks sebagai plain text (bukan HTML) untuk mencegah XSS
