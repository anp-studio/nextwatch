-- =====================================================
-- MOVIES INDEX TABLE (from TMDB daily export)
-- =====================================================

CREATE TABLE IF NOT EXISTS movies_index (
    tmdb_id        INTEGER PRIMARY KEY,
    original_title TEXT,
    popularity     REAL
);

-- =====================================================
-- FULL TEXT SEARCH TABLE
-- =====================================================

CREATE VIRTUAL TABLE IF NOT EXISTS movies_fts
USING fts5(
    original_title,
    content='movies_index',
    content_rowid='tmdb_id'
);

-- =====================================================
-- TRIGGERS TO KEEP FTS INDEX IN SYNC
-- =====================================================

CREATE TRIGGER IF NOT EXISTS movies_ai
AFTER INSERT ON movies_index
BEGIN
    INSERT INTO movies_fts(rowid, original_title)
    VALUES (new.tmdb_id, new.original_title);
END;

CREATE TRIGGER IF NOT EXISTS movies_ad
AFTER DELETE ON movies_index
BEGIN
    INSERT INTO movies_fts(movies_fts, rowid, original_title)
    VALUES ('delete', old.tmdb_id, old.original_title);
END;

CREATE TRIGGER IF NOT EXISTS movies_au
AFTER UPDATE ON movies_index
BEGIN
    INSERT INTO movies_fts(movies_fts, rowid, original_title)
    VALUES ('delete', old.tmdb_id, old.original_title);

    INSERT INTO movies_fts(rowid, original_title)
    VALUES (new.tmdb_id, new.original_title);
END;

-- =====================================================
-- MOVIE METADATA CACHE
-- =====================================================

CREATE TABLE IF NOT EXISTS movies_metadata (
    tmdb_id       INTEGER PRIMARY KEY,
    title         TEXT,
    overview      TEXT,
    poster_path   TEXT,
    backdrop_path TEXT,
    release_date  TEXT,
    runtime       INTEGER,
    vote_average  REAL,
    json_data     TEXT,
    cached_at     INTEGER
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_movies_popularity
ON movies_index(popularity DESC);

CREATE INDEX IF NOT EXISTS idx_metadata_cached
ON movies_metadata(cached_at);

-- =====================================================
-- SCHEMA MIGRATIONS (for Turso/libSQL migration path)
-- =====================================================

CREATE TABLE IF NOT EXISTS _schema_migrations (
    id         INTEGER PRIMARY KEY,
    version    TEXT NOT NULL UNIQUE,
    applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO _schema_migrations (id, version)
VALUES (1, '001_movies_index_and_metadata');

INSERT OR IGNORE INTO _schema_migrations (id, version)
VALUES (2, '002_slim_movies_index');
