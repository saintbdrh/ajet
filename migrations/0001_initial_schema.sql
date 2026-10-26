CREATE TABLE IF NOT EXISTS site_copy (
  locale TEXT NOT NULL CHECK (locale IN ('mn', 'en')),
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (locale, key)
) STRICT;

CREATE TABLE IF NOT EXISTS aircraft (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description_mn TEXT NOT NULL DEFAULT '',
  description_en TEXT NOT NULL DEFAULT '',
  seats INTEGER,
  range_km INTEGER,
  cruise_kmh INTEGER,
  payload_kg INTEGER,
  image_key TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_placeholder INTEGER NOT NULL DEFAULT 0 CHECK (is_placeholder IN (0, 1)),
  is_published INTEGER NOT NULL DEFAULT 1 CHECK (is_published IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
) STRICT;

CREATE TABLE IF NOT EXISTS destinations (
  id TEXT PRIMARY KEY,
  name_mn TEXT NOT NULL,
  name_en TEXT NOT NULL,
  description_mn TEXT NOT NULL DEFAULT '',
  description_en TEXT NOT NULL DEFAULT '',
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  image_key TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_placeholder INTEGER NOT NULL DEFAULT 0 CHECK (is_placeholder IN (0, 1)),
  is_published INTEGER NOT NULL DEFAULT 1 CHECK (is_published IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
) STRICT;

CREATE TABLE IF NOT EXISTS quotes (
  id TEXT PRIMARY KEY,
  locale TEXT NOT NULL CHECK (locale IN ('mn', 'en')),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  organization TEXT NOT NULL DEFAULT '',
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  round_trip INTEGER NOT NULL DEFAULT 0 CHECK (round_trip IN (0, 1)),
  flight_date TEXT NOT NULL,
  flight_time TEXT NOT NULL DEFAULT '',
  passengers INTEGER NOT NULL CHECK (passengers BETWEEN 1 AND 20),
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'quoted', 'booked', 'closed')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
) STRICT;

CREATE INDEX IF NOT EXISTS quotes_created_at_idx ON quotes(created_at DESC);
CREATE INDEX IF NOT EXISTS quotes_status_idx ON quotes(status);
CREATE INDEX IF NOT EXISTS aircraft_order_idx ON aircraft(order_index);
CREATE INDEX IF NOT EXISTS destinations_order_idx ON destinations(order_index);

INSERT OR IGNORE INTO aircraft (
  id, name, description_mn, description_en, order_index, is_placeholder, is_published
) VALUES (
  'sample-1',
  'Aircraft 1',
  'Техникийн мэдээллийг захиалагч нэмнэ.',
  'Technical details to be added by the client.',
  0,
  1,
  1
);

INSERT OR IGNORE INTO destinations (
  id, name_mn, name_en, latitude, longitude, order_index, is_placeholder, is_published
) VALUES
  ('ub', 'Улаанбаатар', 'Ulaanbaatar', 47.92, 106.92, 0, 1, 1),
  ('terelj', 'Тэрэлж', 'Terelj', 47.95, 107.45, 1, 1, 1),
  ('khuvsgul', 'Хөвсгөл', 'Khuvsgul', 50.45, 100.16, 2, 1, 1),
  ('gobi', 'Говь', 'Gobi', 43.57, 104.42, 3, 1, 1);
