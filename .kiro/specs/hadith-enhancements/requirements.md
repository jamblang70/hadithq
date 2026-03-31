# Dokumen Persyaratan: Hadith Enhancements

## Pendahuluan

Dokumen ini mendefinisikan persyaratan untuk peningkatan fitur pada website pencarian hadis semantik yang sudah ada. Peningkatan mencakup lima area utama: (1) penambahan terjemahan Bahasa Indonesia pada proses indexing, (2) penambahan teks Arab pada proses indexing, (3) fitur bookmark/simpan hadis menggunakan localStorage, (4) fitur berbagi hadis melalui clipboard dan Web Share API, dan (5) fitur salin cepat teks hadis. Semua peningkatan ini dibangun di atas arsitektur yang sudah ada tanpa memerlukan sistem autentikasi pengguna.

## Glosarium

- **Layanan_Indexing**: Komponen backend yang mengambil data hadis dari Hadith_API dan mengindeksnya ke vector database dan PostgreSQL
- **Hadith_API**: API publik fawazahmed0 (`cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1`) yang menyediakan data hadis dalam berbagai bahasa dan edisi
- **Edisi_Bahasa**: Varian bahasa dari koleksi hadis di Hadith_API, diidentifikasi dengan prefix: "eng-" (Inggris), "ara-" (Arab), "ind-" (Indonesia)
- **Frontend**: Antarmuka web React yang menampilkan hasil pencarian dan detail hadis
- **Komponen_SearchResults**: Komponen React yang menampilkan daftar hasil pencarian hadis
- **Komponen_HadithDetail**: Komponen React yang menampilkan detail lengkap satu hadis
- **Penyimpanan_Lokal**: Browser localStorage yang digunakan untuk menyimpan data bookmark tanpa memerlukan autentikasi server
- **Daftar_Bookmark**: Koleksi hadis yang disimpan pengguna di Penyimpanan_Lokal, berisi ID hadis dan metadata ringkas
- **Web_Share_API**: API browser standar (`navigator.share()`) yang memungkinkan berbagi konten ke aplikasi lain pada perangkat yang mendukung
- **Clipboard_API**: API browser standar (`navigator.clipboard.writeText()`) yang memungkinkan penyalinan teks ke clipboard sistem
- **Teks_Terformat**: Teks hadis yang diformat untuk berbagi, mencakup nama koleksi, nomor hadis, teks hadis, dan referensi
- **Database_Metadata**: Database PostgreSQL yang menyimpan metadata hadis termasuk field text_arabic, text_indonesian, dan text_english

## Persyaratan

### Persyaratan 1: Indexing Terjemahan Bahasa Indonesia

**User Story:** Sebagai pengguna, saya ingin hadis memiliki terjemahan Bahasa Indonesia, sehingga saya dapat membaca dan memahami hadis dalam bahasa saya.

#### Kriteria Penerimaan

1. WHEN proses indexing dimulai, THE Layanan_Indexing SHALL mengambil edisi Indonesia (prefix "ind-") dari Hadith_API untuk setiap koleksi yang didukung
2. WHEN edisi Indonesia berhasil diambil, THE Layanan_Indexing SHALL menyimpan teks Indonesia ke field text_indonesian pada record hadis yang sesuai di Database_Metadata
3. WHEN edisi Indonesia untuk suatu koleksi tidak tersedia di Hadith_API, THE Layanan_Indexing SHALL mencatat peringatan dan melanjutkan proses tanpa menghentikan indexing koleksi tersebut
4. WHEN mencocokkan hadis Indonesia dengan record yang sudah ada, THE Layanan_Indexing SHALL menggunakan nomor hadis (hadithnumber) dan ID koleksi sebagai kunci pencocokan
5. WHEN indexing dijalankan ulang pada data yang sudah memiliki terjemahan Indonesia, THE Layanan_Indexing SHALL memperbarui field text_indonesian menggunakan operasi upsert tanpa membuat duplikasi

### Persyaratan 2: Indexing Teks Arab

**User Story:** Sebagai pengguna, saya ingin hadis memiliki teks asli dalam Bahasa Arab, sehingga saya dapat membaca matan hadis dalam bahasa aslinya.

#### Kriteria Penerimaan

1. WHEN proses indexing dimulai, THE Layanan_Indexing SHALL mengambil edisi Arab (prefix "ara-") dari Hadith_API untuk setiap koleksi yang didukung
2. WHEN edisi Arab berhasil diambil, THE Layanan_Indexing SHALL menyimpan teks Arab ke field text_arabic pada record hadis yang sesuai di Database_Metadata
3. WHEN edisi Arab untuk suatu koleksi tidak tersedia di Hadith_API, THE Layanan_Indexing SHALL mencatat peringatan dan melanjutkan proses tanpa menghentikan indexing koleksi tersebut
4. WHEN mencocokkan hadis Arab dengan record yang sudah ada, THE Layanan_Indexing SHALL menggunakan nomor hadis (hadithnumber) dan ID koleksi sebagai kunci pencocokan
5. WHEN indexing dijalankan ulang pada data yang sudah memiliki teks Arab, THE Layanan_Indexing SHALL memperbarui field text_arabic menggunakan operasi upsert tanpa membuat duplikasi

### Persyaratan 3: Bookmark/Simpan Hadis

**User Story:** Sebagai pengguna, saya ingin menyimpan hadis favorit saya, sehingga saya dapat mengaksesnya kembali dengan mudah tanpa harus mencari ulang.

#### Kriteria Penerimaan

1. WHEN pengguna menekan tombol bookmark pada hasil pencarian atau halaman detail hadis, THE Frontend SHALL menyimpan ID hadis beserta metadata ringkas (nama koleksi, nomor hadis, cuplikan teks) ke Penyimpanan_Lokal
2. WHEN hadis sudah ada di Daftar_Bookmark, THE Frontend SHALL menampilkan indikator visual yang membedakan hadis yang sudah di-bookmark dari yang belum
3. WHEN pengguna menekan tombol bookmark pada hadis yang sudah di-bookmark, THE Frontend SHALL menghapus hadis tersebut dari Daftar_Bookmark di Penyimpanan_Lokal
4. WHEN pengguna membuka halaman daftar bookmark, THE Frontend SHALL menampilkan semua hadis yang tersimpan di Daftar_Bookmark dengan metadata ringkas
5. WHEN pengguna menekan tombol hapus pada item di halaman daftar bookmark, THE Frontend SHALL menghapus hadis tersebut dari Daftar_Bookmark dan memperbarui tampilan
6. IF Penyimpanan_Lokal tidak tersedia atau penuh, THEN THE Frontend SHALL menampilkan pesan error yang informatif kepada pengguna
7. THE Frontend SHALL memuat Daftar_Bookmark dari Penyimpanan_Lokal saat aplikasi dimulai dan menyediakan state bookmark secara global ke semua komponen yang membutuhkan

### Persyaratan 4: Berbagi Hadis (Share)

**User Story:** Sebagai pengguna, saya ingin berbagi hadis dengan orang lain, sehingga saya dapat menyebarkan ilmu hadis melalui berbagai platform.

#### Kriteria Penerimaan

1. WHEN pengguna menekan tombol share pada hasil pencarian atau halaman detail hadis, THE Frontend SHALL menampilkan opsi berbagi yang tersedia
2. WHEN pengguna memilih opsi "Salin ke Clipboard", THE Frontend SHALL menyalin Teks_Terformat ke clipboard menggunakan Clipboard_API dan menampilkan konfirmasi visual bahwa teks berhasil disalin
3. WHEN Teks_Terformat dihasilkan untuk berbagi, THE Frontend SHALL menyusun teks dengan format: nama koleksi, nomor hadis, teks hadis (Arab jika tersedia, diikuti terjemahan), dan referensi
4. WHILE perangkat pengguna mendukung Web_Share_API (navigator.share tersedia), THE Frontend SHALL menampilkan opsi "Bagikan" yang memanggil Web_Share_API dengan judul, teks, dan URL hadis
5. WHILE perangkat pengguna tidak mendukung Web_Share_API, THE Frontend SHALL menyembunyikan opsi "Bagikan" dan hanya menampilkan opsi "Salin ke Clipboard"
6. IF operasi salin ke clipboard gagal, THEN THE Frontend SHALL menampilkan pesan error yang informatif kepada pengguna

### Persyaratan 5: Salin Cepat Teks Hadis (Quick Copy)

**User Story:** Sebagai pengguna, saya ingin menyalin teks hadis dengan cepat menggunakan satu klik, sehingga saya dapat menggunakan teks hadis di aplikasi lain tanpa harus menyeleksi teks secara manual.

#### Kriteria Penerimaan

1. THE Frontend SHALL menampilkan tombol salin cepat pada setiap item di Komponen_SearchResults
2. THE Frontend SHALL menampilkan tombol salin cepat pada Komponen_HadithDetail
3. WHEN pengguna menekan tombol salin cepat, THE Frontend SHALL menyalin teks hadis (teks Arab jika tersedia, diikuti terjemahan Inggris dan/atau Indonesia yang tersedia) ke clipboard menggunakan Clipboard_API
4. WHEN teks berhasil disalin ke clipboard, THE Frontend SHALL menampilkan konfirmasi visual sementara (berubah ikon atau teks tombol) selama 2 detik sebelum kembali ke tampilan awal
5. IF operasi salin ke clipboard gagal, THEN THE Frontend SHALL menampilkan pesan error yang informatif kepada pengguna
