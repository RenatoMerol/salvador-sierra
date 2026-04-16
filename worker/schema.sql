-- Schema D1 para Salvador Sierra admin
-- Aplicar con: wrangler d1 execute salvador-sierra-db --file=worker/schema.sql --remote

CREATE TABLE IF NOT EXISTS artworks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK(category IN ('pinturas','murales','colaboraciones','intervenciones')),
  technique TEXT NOT NULL,
  year INTEGER NOT NULL,
  dimensions TEXT NOT NULL,
  series TEXT,
  location TEXT,
  status TEXT NOT NULL DEFAULT 'available' CHECK(status IN ('available','featured','sold')),
  visibility TEXT NOT NULL DEFAULT 'draft' CHECK(visibility IN ('draft','published','hidden')),
  alt TEXT,
  note TEXT,
  image_url TEXT NOT NULL,
  image_key TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_artworks_visibility ON artworks(visibility);
CREATE INDEX IF NOT EXISTS idx_artworks_category ON artworks(category);
CREATE INDEX IF NOT EXISTS idx_artworks_sort ON artworks(sort_order);
