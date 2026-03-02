-- Minimal set of indexes for Artícora
-- Purpose: keep only essential indexes that materially improve common read/lookup patterns
-- and avoid the write/maintenance cost of many rarely-used indexes.
-- Use CREATE INDEX IF NOT EXISTS so applying this file is safe on existing DBs.

PRAGMA foreign_keys = ON;

-- 1) Users: fast lookup by username/email for login, account management and dedup checks
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 2) Sources: common filters and lookups
-- Title search (prefix / LIKE optimizations, useful for autocomplete)
CREATE INDEX IF NOT EXISTS idx_sources_title ON sources(title);
-- Category/subcategory composite for /search filters
CREATE INDEX IF NOT EXISTS idx_sources_category ON sources(category_id, subcategory_id);
-- Lookup sources uploaded by a user and fast ordering by created_at
CREATE INDEX IF NOT EXISTS idx_sources_uploader ON sources(uploaded_by, created_at DESC);
-- DOI lookup (unique-ish, selective); skip nulls
CREATE INDEX IF NOT EXISTS idx_sources_doi ON sources(doi) WHERE doi IS NOT NULL;

-- 3) Ratings: aggregations and lookups by source
CREATE INDEX IF NOT EXISTS idx_ratings_source ON ratings(source_id);

-- 4) TF-IDF tables: essential for semantic search performance
CREATE INDEX IF NOT EXISTS idx_tfidf_term ON tfidf_vectors(term);
CREATE INDEX IF NOT EXISTS idx_tfidf_source_term ON tfidf_vectors(source_id, term);

-- 5) URLs: lookups and maintenance by source
CREATE INDEX IF NOT EXISTS idx_source_urls_source ON source_urls(source_id);

-- End of minimal index set