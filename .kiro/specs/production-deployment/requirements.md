# Dokumen Persyaratan: Production Deployment

## Pendahuluan

Dokumen ini mendefinisikan persyaratan untuk menjadikan website pencarian hadis semantik (backend Express.js + frontend React) siap produksi dan layak digunakan oleh banyak pengguna. Cakupan meliputi: setup repositori GitHub, konfigurasi produksi, kesiapan frontend dan backend, konfigurasi deployment (Vercel, Railway), CI/CD, performa, monitoring, dan penguatan keamanan.

Website saat ini sudah berfungsi secara lokal dengan fitur pencarian semantik, bookmark, copy, dan share. Persyaratan ini menjelaskan apa yang perlu DITAMBAHKAN atau DIUBAH agar arsitektur dan desainnya layak untuk deployment produksi.

## Glosarium

- **Backend**: Server Express.js yang menyediakan REST API untuk pencarian hadis, berjalan di Node.js
- **Frontend**: Aplikasi React (Vite) yang menyediakan antarmuka pengguna di browser
- **Vercel**: Platform deployment untuk aplikasi frontend
- **Railway**: Platform deployment untuk aplikasi backend (pilihan utama)
- **Render**: Platform deployment alternatif untuk backend
- **Neon**: Layanan PostgreSQL terkelola di cloud
- **Qdrant_Cloud**: Layanan vector database terkelola di cloud
- **Health_Check_Endpoint**: Endpoint HTTP yang melaporkan status kesehatan layanan dan dependensinya
- **Graceful_Shutdown**: Proses penghentian server yang menyelesaikan request aktif sebelum menutup koneksi
- **Error_Boundary**: Komponen React yang menangkap error JavaScript di child component tree dan menampilkan fallback UI
- **Structured_Log**: Log dalam format JSON yang mudah di-parse oleh sistem monitoring
- **Request_ID**: Identifier unik yang diberikan ke setiap HTTP request untuk keperluan tracing
- **CI_CD_Pipeline**: Alur otomatis yang menjalankan lint, test, build, dan deployment pada setiap perubahan kode
- **Compression_Middleware**: Middleware Express.js yang mengompres response body menggunakan gzip/brotli
- **PWA_Manifest**: File JSON yang mendefinisikan metadata aplikasi web untuk pengalaman seperti aplikasi native di perangkat mobile

## Persyaratan

### Persyaratan 1: Setup Repositori GitHub

**User Story:** Sebagai developer, saya ingin repositori GitHub yang terstruktur dengan baik, sehingga kontributor lain dapat memahami dan menjalankan proyek dengan mudah.

#### Kriteria Penerimaan

1. THE Backend SHALL memiliki file `.gitignore` di root proyek yang mengabaikan `node_modules/`, `dist/`, file `.env`, file log, dan direktori OS-specific (`.DS_Store`, `Thumbs.db`)
2. THE Backend SHALL memiliki file `README.md` di root proyek yang berisi deskripsi proyek, instruksi setup lokal (prerequisites, instalasi dependensi, konfigurasi environment variable, menjalankan development server), gambaran arsitektur sistem, dan daftar endpoint API
3. THE Backend SHALL memiliki file `LICENSE` di root proyek dengan lisensi open-source yang valid (MIT atau ISC)
4. WHEN developer menjalankan `git status` pada proyek baru yang di-clone, THE Backend SHALL menampilkan working tree bersih tanpa file yang seharusnya diabaikan

### Persyaratan 2: Konfigurasi Berbasis Environment

**User Story:** Sebagai developer, saya ingin konfigurasi yang berbeda untuk setiap environment (development, staging, production), sehingga aplikasi berperilaku sesuai dengan konteks deployment-nya.

#### Kriteria Penerimaan

1. THE Backend SHALL membaca variabel `NODE_ENV` untuk menentukan environment aktif dengan nilai yang didukung: `development`, `staging`, `production`
2. WHILE `NODE_ENV` bernilai `production`, THE Backend SHALL menulis log dalam format JSON terstruktur yang berisi field: `timestamp`, `level`, `message`, `requestId`
3. WHILE `NODE_ENV` bernilai `development`, THE Backend SHALL menulis log dalam format teks yang mudah dibaca manusia
4. WHEN Backend menerima request ke `/api/health`, THE Health_Check_Endpoint SHALL mengembalikan status koneksi PostgreSQL dan Qdrant_Cloud dalam response body dengan format `{ status: "ok" | "degraded" | "error", services: { database: "connected" | "disconnected", vectorDb: "connected" | "disconnected" } }`
5. WHEN Backend menerima sinyal `SIGTERM` atau `SIGINT`, THE Backend SHALL menjalankan Graceful_Shutdown yang menghentikan penerimaan request baru, menunggu request aktif selesai (maksimal 10 detik), menutup koneksi database pool, dan menutup koneksi Qdrant client
6. IF Graceful_Shutdown melebihi batas waktu 10 detik, THEN THE Backend SHALL memaksa proses keluar dengan exit code 1

### Persyaratan 3: Kesiapan Frontend untuk Produksi — SEO dan Meta Tags

**User Story:** Sebagai pengguna, saya ingin website pencarian hadis muncul dengan baik di hasil pencarian Google dan preview link di media sosial, sehingga lebih mudah ditemukan dan dibagikan.

#### Kriteria Penerimaan

1. THE Frontend SHALL memiliki tag `<title>` yang berisi nama aplikasi yang deskriptif (contoh: "Pencarian Hadis Semantik — Cari Hadis Berdasarkan Makna")
2. THE Frontend SHALL memiliki meta tag `description` yang menjelaskan fungsi aplikasi dalam maksimal 160 karakter
3. THE Frontend SHALL memiliki meta tag Open Graph (`og:title`, `og:description`, `og:type`, `og:url`, `og:image`) untuk preview link di media sosial
4. THE Frontend SHALL memiliki meta tag Twitter Card (`twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`) untuk preview link di Twitter/X
5. THE Frontend SHALL memiliki tag `<html lang="id">` yang menunjukkan bahasa utama konten

### Persyaratan 4: Kesiapan Frontend untuk Produksi — Aset dan UX

**User Story:** Sebagai pengguna, saya ingin website memiliki ikon yang tepat, loading state yang informatif, dan penanganan error yang baik, sehingga pengalaman menggunakan website terasa profesional.

#### Kriteria Penerimaan

1. THE Frontend SHALL memiliki favicon dalam format SVG dan PNG (192x192 dan 512x512) yang merepresentasikan identitas aplikasi
2. THE Frontend SHALL memiliki file `manifest.json` (PWA manifest) yang berisi `name`, `short_name`, `description`, `start_url`, `display`, `theme_color`, `background_color`, dan referensi ke ikon aplikasi
3. WHILE pencarian sedang berlangsung, THE Frontend SHALL menampilkan skeleton placeholder UI (bukan hanya teks "Searching...") yang menyerupai bentuk hasil pencarian
4. THE Frontend SHALL memiliki Error_Boundary di level root aplikasi yang menangkap error rendering React dan menampilkan halaman fallback dengan pesan error yang ramah pengguna serta tombol untuk memuat ulang halaman

### Persyaratan 5: Kesiapan Backend untuk Produksi — Logging dan Error

**User Story:** Sebagai operator sistem, saya ingin backend memiliki logging yang terstruktur dan response error yang konsisten, sehingga saya dapat memantau dan men-debug masalah di produksi dengan efisien.

#### Kriteria Penerimaan

1. THE Backend SHALL mencatat setiap request HTTP yang masuk dengan informasi: method, path, status code, response time dalam milidetik, dan Request_ID
2. THE Backend SHALL menghasilkan Request_ID unik (format UUID v4) untuk setiap request yang masuk dan menyertakan Request_ID tersebut di response header `X-Request-Id`
3. THE Backend SHALL mengembalikan response error dalam format konsisten: `{ error: string, requestId: string, statusCode: number }` untuk semua error response (4xx dan 5xx)
4. WHILE `NODE_ENV` bernilai `production`, THE Backend SHALL menghapus stack trace dan detail internal dari response error yang dikirim ke client
5. IF koneksi ke PostgreSQL terputus, THEN THE Backend SHALL mencatat event tersebut sebagai log level `error` dan mengubah status Health_Check_Endpoint menjadi `degraded`
6. IF koneksi ke Qdrant_Cloud terputus, THEN THE Backend SHALL mencatat event tersebut sebagai log level `error` dan mengubah status Health_Check_Endpoint menjadi `degraded`

### Persyaratan 6: Kesiapan Backend untuk Produksi — CORS dan Keamanan

**User Story:** Sebagai developer, saya ingin konfigurasi CORS yang tepat untuk domain produksi, sehingga hanya frontend yang sah yang dapat mengakses API.

#### Kriteria Penerimaan

1. THE Backend SHALL membaca daftar origin yang diizinkan dari variabel environment `ALLOWED_ORIGINS` (dipisahkan koma) untuk konfigurasi CORS
2. WHILE `NODE_ENV` bernilai `development`, THE Backend SHALL mengizinkan origin `http://localhost:5173` secara default jika `ALLOWED_ORIGINS` tidak diset
3. IF request berasal dari origin yang tidak ada dalam daftar yang diizinkan, THEN THE Backend SHALL menolak request tersebut dengan status 403

### Persyaratan 7: Konfigurasi Deployment Frontend — Vercel

**User Story:** Sebagai developer, saya ingin frontend dapat di-deploy ke Vercel dengan konfigurasi yang benar, sehingga deployment berjalan otomatis dan routing SPA berfungsi dengan baik.

#### Kriteria Penerimaan

1. THE Frontend SHALL memiliki file `vercel.json` di direktori `frontend/` yang mengkonfigurasi build command, output directory, dan rewrite rules untuk SPA routing (semua path diarahkan ke `index.html`)
2. THE Frontend SHALL mendukung environment variable `VITE_API_BASE_URL` yang dapat dikonfigurasi di Vercel dashboard untuk menunjuk ke URL backend produksi

### Persyaratan 8: Konfigurasi Deployment Backend — Railway dan Docker

**User Story:** Sebagai developer, saya ingin backend dapat di-deploy ke Railway (atau platform alternatif) menggunakan Docker, sehingga deployment konsisten di berbagai environment.

#### Kriteria Penerimaan

1. THE Backend SHALL memiliki file `Dockerfile` di direktori `backend/` yang membangun image produksi multi-stage (stage build dengan TypeScript compiler, stage runtime dengan Node.js slim)
2. THE Backend SHALL memiliki file `.dockerignore` di direktori `backend/` yang mengabaikan `node_modules/`, `dist/`, file `.env`, dan file test
3. THE Backend SHALL memiliki file `railway.json` di direktori `backend/` yang mengkonfigurasi build command dan start command untuk Railway
4. WHEN Docker image dibangun, THE Backend SHALL menghasilkan image dengan ukuran kurang dari 300MB
5. THE Backend SHALL menjalankan proses Node.js sebagai user non-root di dalam Docker container

### Persyaratan 9: CI/CD dengan GitHub Actions

**User Story:** Sebagai developer, saya ingin pipeline CI/CD yang otomatis, sehingga setiap perubahan kode divalidasi sebelum di-merge dan deployment ke produksi berjalan otomatis.

#### Kriteria Penerimaan

1. WHEN pull request dibuat atau di-update pada branch `main`, THE CI_CD_Pipeline SHALL menjalankan langkah-langkah berikut secara berurutan: install dependensi, lint (backend dan frontend), type check (backend dan frontend), jalankan test (backend dan frontend), build (backend dan frontend)
2. IF salah satu langkah CI gagal, THEN THE CI_CD_Pipeline SHALL menghentikan eksekusi dan melaporkan status gagal pada pull request
3. WHEN commit di-push ke branch `main`, THE CI_CD_Pipeline SHALL men-trigger deployment otomatis ke environment produksi (Vercel untuk frontend, Railway untuk backend)
4. THE CI_CD_Pipeline SHALL menggunakan cache untuk `node_modules` agar mempercepat waktu eksekusi pipeline

### Persyaratan 10: Performa — Kompresi dan Caching

**User Story:** Sebagai pengguna, saya ingin website memuat dengan cepat, sehingga pengalaman pencarian hadis terasa responsif.

#### Kriteria Penerimaan

1. THE Backend SHALL menggunakan Compression_Middleware yang mengompres response body dengan gzip untuk response yang lebih besar dari 1KB
2. THE Frontend SHALL mengkonfigurasi Vite build untuk menghasilkan aset statis dengan content hash di nama file (sudah default di Vite)
3. THE Backend SHALL menyertakan header `Cache-Control` dengan nilai `public, max-age=31536000, immutable` untuk aset statis yang dilayani (jika ada)
4. THE Backend SHALL mencatat waktu pemrosesan setiap request dalam log sebagai field `responseTimeMs`

### Persyaratan 11: Keamanan — Validasi Environment dan Proteksi Error

**User Story:** Sebagai operator sistem, saya ingin aplikasi memvalidasi konfigurasi saat startup dan tidak membocorkan informasi sensitif, sehingga deployment produksi aman dan stabil.

#### Kriteria Penerimaan

1. WHEN Backend dimulai, THE Backend SHALL memvalidasi bahwa semua environment variable wajib telah diset: `DATABASE_URL`, `QDRANT_URL`, `OPENAI_API_KEY`
2. IF environment variable wajib tidak diset saat startup, THEN THE Backend SHALL menampilkan pesan error yang jelas yang menyebutkan nama variabel yang hilang dan menghentikan proses dengan exit code 1
3. WHILE `NODE_ENV` bernilai `production`, THE Backend SHALL memastikan response error tidak mengandung stack trace, path file sistem, atau nama variabel environment
4. THE Backend SHALL menyertakan Request_ID di setiap log entry untuk memudahkan korelasi antara request dan log
