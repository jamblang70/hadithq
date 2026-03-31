# HadithQ — اسأل الحديث

Cari hadis berdasarkan makna, didukung AI dan 7 koleksi kitab utama. Pencarian semantik dan AI-powered dari Bukhari, Muslim, Abu Dawud, Tirmidzi, Nasa'i, Ibnu Majah, dan Malik.

## Fitur

- 🔍 **Pencarian Semantik** — cari hadis berdasarkan makna, bukan kata kunci persis
- 🤖 **AI Search** — pencarian lebih akurat menggunakan GPT-4o-mini (RAG)
- 📖 **Hadis Harian** — hadis pilihan yang berubah setiap hari
- 🔖 **Bookmark** — simpan hadis favorit di browser
- 📋 **Copy & Share** — salin atau bagikan hadis dengan mudah
- 🌙 **Dark Mode** — toggle light/dark mode
- 🌐 **3 Bahasa** — Arab, Inggris, Indonesia

## Arsitektur

```
Frontend (React + Vite)  →  Backend (Express.js)  →  PostgreSQL (metadata)
                                                  →  Qdrant (vector search)
                                                  →  OpenAI (embeddings + AI)
```

- **Frontend**: React 19, Vite, TypeScript — deploy ke Vercel
- **Backend**: Express.js, TypeScript, Node.js 22 — deploy ke Railway (Docker)
- **Database**: PostgreSQL (Neon) untuk metadata hadis
- **Vector DB**: Qdrant Cloud untuk pencarian semantik
- **AI**: OpenAI text-embedding-3-small + GPT-4o-mini

## Prasyarat

- Node.js 22+
- PostgreSQL (atau akun Neon)
- Qdrant (atau akun Qdrant Cloud)
- OpenAI API Key

## Setup Lokal

1. Clone repositori:
   ```bash
   git clone https://github.com/YOUR_USERNAME/hadithq.git
   cd hadithq
   ```

2. Install dependensi:
   ```bash
   npm install
   ```

3. Salin dan isi environment variables:
   ```bash
   cp .env.example backend/.env
   ```
   Edit `backend/.env`:
   ```
   DATABASE_URL=postgresql://user:password@localhost:5432/hadith_search
   QDRANT_URL=http://localhost:6333
   OPENAI_API_KEY=sk-...
   ```

4. Jalankan PostgreSQL dan Qdrant (Docker):
   ```bash
   docker run -d --name postgres -e POSTGRES_USER=user -e POSTGRES_PASSWORD=password -e POSTGRES_DB=hadith_search -p 5432:5432 postgres:16
   docker run -d --name qdrant -p 6333:6333 qdrant/qdrant
   ```

5. Jalankan schema database:
   ```bash
   docker exec -i postgres psql -U user -d hadith_search < backend/src/db/schema.sql
   ```

6. Jalankan backend dan frontend:
   ```bash
   npm run dev:backend    # http://localhost:3000
   npm run dev:frontend   # http://localhost:5173
   ```

7. Index data hadis (pertama kali):
   ```bash
   curl -X POST http://localhost:3000/api/admin/index
   curl -X POST http://localhost:3000/api/admin/embed-indonesian
   ```

## API Endpoints

| Method | Path | Deskripsi |
|--------|------|-----------|
| GET | `/api/health` | Health check |
| POST | `/api/search` | Pencarian semantik |
| POST | `/api/ai-search` | Pencarian AI (RAG) |
| GET | `/api/daily` | Hadis harian |
| GET | `/api/stats` | Statistik |
| GET | `/api/collections` | Daftar koleksi |
| GET | `/api/hadith/:id` | Detail hadis |
| POST | `/api/admin/index` | Trigger indexing |
| POST | `/api/admin/embed-indonesian` | Embed teks Indonesia |

## Deployment

### Frontend — Vercel

1. Connect repo GitHub ke Vercel
2. Set root directory: `frontend/`
3. Set env: `VITE_API_BASE_URL` = URL backend produksi
4. Deploy otomatis pada push ke `main`

### Backend — Railway

1. Connect repo GitHub ke Railway
2. Set root directory: `backend/`
3. Railway menggunakan `Dockerfile` untuk build
4. Set env: `DATABASE_URL`, `QDRANT_URL`, `OPENAI_API_KEY`, `ALLOWED_ORIGINS`, `NODE_ENV=production`

## Lisensi

MIT — Crafted by Arief · 2026
