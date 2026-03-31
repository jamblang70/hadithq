-- PostgreSQL schema for Semantic Hadith Search

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Koleksi hadis (kitab)
CREATE TABLE IF NOT EXISTS collections (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_arabic TEXT NOT NULL DEFAULT '',
  author TEXT NOT NULL DEFAULT '',
  total_hadith INTEGER NOT NULL DEFAULT 0,
  description TEXT NOT NULL DEFAULT '',
  available_languages TEXT[] NOT NULL DEFAULT '{}'
);

-- Data hadis lengkap
CREATE TABLE IF NOT EXISTS hadiths (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  external_id TEXT NOT NULL,
  collection_id TEXT NOT NULL REFERENCES collections(id),
  collection_name TEXT NOT NULL,
  book_number INTEGER NOT NULL DEFAULT 0,
  book_name TEXT NOT NULL DEFAULT '',
  hadith_number INTEGER NOT NULL CHECK (hadith_number > 0),
  text_arabic TEXT NOT NULL DEFAULT '',
  text_indonesian TEXT NOT NULL DEFAULT '',
  text_english TEXT NOT NULL DEFAULT '',
  narrator TEXT NOT NULL DEFAULT '',
  grade TEXT NOT NULL DEFAULT 'unknown' CHECK (grade IN ('sahih', 'hasan', 'dhaif', 'maudu', 'unknown')),
  reference TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_hadiths_external_collection UNIQUE (external_id, collection_id)
);

-- Tracking embedding metadata
CREATE TABLE IF NOT EXISTS hadith_embeddings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hadith_id UUID NOT NULL REFERENCES hadiths(id) ON DELETE CASCADE,
  language TEXT NOT NULL CHECK (language IN ('ar', 'id', 'en')),
  model_version TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_embedding_hadith_language UNIQUE (hadith_id, language)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_hadiths_collection_id ON hadiths(collection_id);
CREATE INDEX IF NOT EXISTS idx_hadiths_grade ON hadiths(grade);
CREATE INDEX IF NOT EXISTS idx_hadith_embeddings_hadith_id ON hadith_embeddings(hadith_id);
