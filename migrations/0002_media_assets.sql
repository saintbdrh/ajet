-- Uploaded files (stored in S3-compatible object storage; only metadata lives here).
CREATE TABLE media_assets (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL CHECK (kind IN ('image', 'video')),
  mime TEXT NOT NULL,
  size_bytes BIGINT NOT NULL CHECK (size_bytes > 0),
  width INTEGER CHECK (width > 0),
  height INTEGER CHECK (height > 0),
  duration_ms INTEGER CHECK (duration_ms > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ready')),
  uploaded_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX media_assets_created_idx ON media_assets(created_at DESC);

-- Photo slots can hold a video (image_key ends in .mp4/.webm) with a poster image, and carry an attribution.
ALTER TABLE media_slots
  ADD COLUMN poster_key TEXT,
  ADD COLUMN credit_text TEXT NOT NULL DEFAULT '',
  ADD COLUMN credit_url TEXT NOT NULL DEFAULT '';

UPDATE media_slots
SET credit_text = 'Vyacheslav Argenberg · CC BY 4.0',
    credit_url = 'https://commons.wikimedia.org/wiki/File:Tengboche,_Helicopter_in_flight,_Mountains_of_Nepal.jpg'
WHERE image_key = '/img/hero.jpg';
