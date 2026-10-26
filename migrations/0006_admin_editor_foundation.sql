CREATE TABLE IF NOT EXISTS aircraft_display (
  aircraft_id TEXT PRIMARY KEY REFERENCES aircraft(id) ON DELETE CASCADE,
  focal_x INTEGER NOT NULL DEFAULT 50 CHECK (focal_x BETWEEN 0 AND 100),
  focal_y INTEGER NOT NULL DEFAULT 50 CHECK (focal_y BETWEEN 0 AND 100),
  alt_mn TEXT NOT NULL DEFAULT '',
  alt_en TEXT NOT NULL DEFAULT ''
) STRICT;

CREATE TABLE IF NOT EXISTS destination_display (
  destination_id TEXT PRIMARY KEY REFERENCES destinations(id) ON DELETE CASCADE,
  focal_x INTEGER NOT NULL DEFAULT 50 CHECK (focal_x BETWEEN 0 AND 100),
  focal_y INTEGER NOT NULL DEFAULT 50 CHECK (focal_y BETWEEN 0 AND 100),
  alt_mn TEXT NOT NULL DEFAULT '',
  alt_en TEXT NOT NULL DEFAULT ''
) STRICT;

INSERT OR IGNORE INTO aircraft_display (aircraft_id, focal_x, focal_y, alt_mn, alt_en)
  SELECT id, 50, 50, name, name FROM aircraft;
INSERT OR IGNORE INTO destination_display (destination_id, focal_x, focal_y, alt_mn, alt_en)
  SELECT id, 50, 50, name_mn, name_en FROM destinations;

CREATE TABLE IF NOT EXISTS media_slots (
  slot_key TEXT PRIMARY KEY,
  image_key TEXT NOT NULL,
  focal_x INTEGER NOT NULL DEFAULT 50 CHECK (focal_x BETWEEN 0 AND 100),
  focal_y INTEGER NOT NULL DEFAULT 50 CHECK (focal_y BETWEEN 0 AND 100),
  alt_mn TEXT NOT NULL DEFAULT '',
  alt_en TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by TEXT NOT NULL DEFAULT 'migration'
) STRICT;

INSERT OR IGNORE INTO media_slots (slot_key, image_key, focal_x, focal_y, alt_mn, alt_en) VALUES
  ('hero', '/img/hero.jpg', 50, 50, 'Нисдэг тэрэг уулын дээгүүр нисэж байна', 'A helicopter flying above the mountains'),
  ('membership', '/img/lake.jpg', 50, 50, 'Уулсын дундах нуур', 'A remote mountain lake'),
  ('corporate', '/img/mountains.jpg', 50, 50, 'Уулсын оргил', 'Mountain peaks'),
  ('journey-01', '/img/lake.jpg', 50, 52, '', ''),
  ('journey-02', '/img/hero.jpg', 58, 50, '', ''),
  ('journey-03', '/img/hero.jpg', 65, 50, '', ''),
  ('journey-04', '/img/mountains.jpg', 50, 48, '', ''),
  ('journey-05', '/img/lake.jpg', 50, 44, '', ''),
  ('journey-06', '/img/mountains.jpg', 50, 57, '', ''),
  ('journey-07', '/img/hero.jpg', 50, 54, '', '');

CREATE TABLE IF NOT EXISTS pricing_items (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('route', 'hourly', 'membership', 'other')),
  label_mn TEXT NOT NULL,
  label_en TEXT NOT NULL,
  note_mn TEXT NOT NULL DEFAULT '',
  note_en TEXT NOT NULL DEFAULT '',
  amount_minor INTEGER NOT NULL CHECK (amount_minor >= 0),
  currency TEXT NOT NULL CHECK (currency GLOB '[A-Z][A-Z][A-Z]'),
  unit TEXT NOT NULL CHECK (unit IN ('per_flight', 'per_hour', 'per_package')),
  destination_id TEXT REFERENCES destinations(id) ON DELETE SET NULL,
  aircraft_id TEXT REFERENCES aircraft(id) ON DELETE SET NULL,
  is_published INTEGER NOT NULL DEFAULT 0 CHECK (is_published IN (0, 1)),
  order_index INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by TEXT NOT NULL DEFAULT 'migration'
) STRICT;

CREATE TABLE IF NOT EXISTS content_revisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('copy', 'photo', 'price', 'aircraft', 'destination')),
  entity_id TEXT NOT NULL,
  snapshot_json TEXT NOT NULL,
  actor TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
) STRICT;

CREATE INDEX IF NOT EXISTS content_revisions_entity_idx
  ON content_revisions(entity_type, entity_id, id DESC);
CREATE INDEX IF NOT EXISTS pricing_items_public_order_idx
  ON pricing_items(is_published, order_index);

INSERT OR IGNORE INTO site_copy (locale, key, value) VALUES
  ('mn', 'priceDisclaimer', 'Энэ нь зөвхөн жишиг эхлэх үнэ бөгөөд эцсийн үнийг бичгээр ирүүлэх үнийн саналд баталгаажуулна.'),
  ('en', 'priceDisclaimer', 'Indicative starting prices only. Your final price will be confirmed in a written quote.');
