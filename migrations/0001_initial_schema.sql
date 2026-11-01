-- Postgres schema. Consolidated from the former D1 migrations 0001-0007 (see git history).

CREATE TABLE site_copy (
  locale TEXT NOT NULL CHECK (locale IN ('mn', 'en')),
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (locale, key)
);

CREATE TABLE aircraft (
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  specification_source TEXT NOT NULL DEFAULT '',
  specifications_verified INTEGER NOT NULL DEFAULT 0 CHECK (specifications_verified IN (0, 1))
);

CREATE TABLE destinations (
  id TEXT PRIMARY KEY,
  name_mn TEXT NOT NULL,
  name_en TEXT NOT NULL,
  description_mn TEXT NOT NULL DEFAULT '',
  description_en TEXT NOT NULL DEFAULT '',
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  image_key TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_placeholder INTEGER NOT NULL DEFAULT 0 CHECK (is_placeholder IN (0, 1)),
  is_published INTEGER NOT NULL DEFAULT 1 CHECK (is_published IN (0, 1)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  coordinate_source TEXT NOT NULL DEFAULT '',
  coordinates_verified INTEGER NOT NULL DEFAULT 0 CHECK (coordinates_verified IN (0, 1))
);

CREATE INDEX aircraft_order_idx ON aircraft(order_index);
CREATE INDEX destinations_order_idx ON destinations(order_index);

CREATE TABLE aircraft_display (
  aircraft_id TEXT PRIMARY KEY REFERENCES aircraft(id) ON DELETE CASCADE,
  focal_x INTEGER NOT NULL DEFAULT 50 CHECK (focal_x BETWEEN 0 AND 100),
  focal_y INTEGER NOT NULL DEFAULT 50 CHECK (focal_y BETWEEN 0 AND 100),
  alt_mn TEXT NOT NULL DEFAULT '',
  alt_en TEXT NOT NULL DEFAULT ''
);

CREATE TABLE destination_display (
  destination_id TEXT PRIMARY KEY REFERENCES destinations(id) ON DELETE CASCADE,
  focal_x INTEGER NOT NULL DEFAULT 50 CHECK (focal_x BETWEEN 0 AND 100),
  focal_y INTEGER NOT NULL DEFAULT 50 CHECK (focal_y BETWEEN 0 AND 100),
  alt_mn TEXT NOT NULL DEFAULT '',
  alt_en TEXT NOT NULL DEFAULT ''
);

CREATE TABLE quotes (
  id TEXT PRIMARY KEY,
  idempotency_key TEXT UNIQUE,
  request_hash TEXT,
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
  status TEXT NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested', 'in_review', 'quoted', 'approved', 'confirmed', 'declined', 'expired', 'closed')),
  assigned_aircraft_id TEXT REFERENCES aircraft(id) ON DELETE SET NULL,
  operational_approved_by TEXT,
  operational_approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX quotes_created_at_idx ON quotes(created_at DESC);
CREATE INDEX quotes_status_idx ON quotes(status);
CREATE INDEX quotes_flight_date_idx ON quotes(flight_date);

CREATE TABLE quote_revisions (
  id TEXT PRIMARY KEY,
  quote_id TEXT NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  revision INTEGER NOT NULL CHECK (revision > 0),
  amount_minor BIGINT NOT NULL CHECK (amount_minor >= 0),
  currency TEXT NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  terms TEXT NOT NULL DEFAULT '',
  expires_at TIMESTAMPTZ NOT NULL,
  approval_token_hash TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'approved', 'declined', 'expired', 'superseded')),
  created_by TEXT NOT NULL,
  sent_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (quote_id, revision)
);

CREATE INDEX quote_revisions_quote_idx ON quote_revisions(quote_id, revision DESC);
CREATE INDEX quote_revisions_expiry_idx ON quote_revisions(status, expires_at);

CREATE TABLE quote_status_history (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  quote_id TEXT NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  actor TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX quote_status_history_quote_idx ON quote_status_history(quote_id, id DESC);

CREATE TABLE quote_notification_attempts (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  quote_id TEXT NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  event TEXT NOT NULL CHECK (event IN ('request_received', 'quote_sent', 'client_approved', 'client_declined', 'flight_confirmed')),
  channel TEXT NOT NULL CHECK (channel IN ('telegram', 'email')),
  succeeded INTEGER NOT NULL CHECK (succeeded IN (0, 1)),
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE admin_audit_log (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT NOT NULL DEFAULT '',
  detail TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX admin_audit_log_created_idx ON admin_audit_log(created_at DESC);

CREATE TABLE media_slots (
  slot_key TEXT PRIMARY KEY,
  image_key TEXT NOT NULL,
  focal_x INTEGER NOT NULL DEFAULT 50 CHECK (focal_x BETWEEN 0 AND 100),
  focal_y INTEGER NOT NULL DEFAULT 50 CHECK (focal_y BETWEEN 0 AND 100),
  alt_mn TEXT NOT NULL DEFAULT '',
  alt_en TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by TEXT NOT NULL DEFAULT 'migration'
);

CREATE TABLE pricing_items (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('route', 'hourly', 'membership', 'other')),
  label_mn TEXT NOT NULL,
  label_en TEXT NOT NULL,
  note_mn TEXT NOT NULL DEFAULT '',
  note_en TEXT NOT NULL DEFAULT '',
  amount_minor BIGINT NOT NULL CHECK (amount_minor >= 0),
  currency TEXT NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  unit TEXT NOT NULL CHECK (unit IN ('per_flight', 'per_hour', 'per_package')),
  destination_id TEXT REFERENCES destinations(id) ON DELETE SET NULL,
  aircraft_id TEXT REFERENCES aircraft(id) ON DELETE SET NULL,
  is_published INTEGER NOT NULL DEFAULT 0 CHECK (is_published IN (0, 1)),
  order_index INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by TEXT NOT NULL DEFAULT 'migration'
);

CREATE INDEX pricing_items_public_order_idx ON pricing_items(is_published, order_index);

CREATE TABLE content_revisions (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('copy', 'photo', 'price', 'aircraft', 'destination')),
  entity_id TEXT NOT NULL,
  snapshot_json TEXT NOT NULL,
  actor TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX content_revisions_entity_idx ON content_revisions(entity_type, entity_id, id DESC);

-- Placeholder seed data. Replace with client-approved fleet and route details.
INSERT INTO aircraft (id, name, description_mn, description_en, order_index, is_placeholder, is_published) VALUES
  ('sample-1', 'Aircraft 1', 'Техникийн мэдээллийг захиалагч нэмнэ.', 'Technical details to be added by the client.', 0, 1, 1);

INSERT INTO destinations (id, name_mn, name_en, latitude, longitude, order_index, is_placeholder, is_published) VALUES
  ('ub', 'Улаанбаатар', 'Ulaanbaatar', 47.92, 106.92, 0, 1, 1),
  ('terelj', 'Тэрэлж', 'Terelj', 47.95, 107.45, 1, 1, 1),
  ('khuvsgul', 'Хөвсгөл', 'Khuvsgul', 50.45, 100.16, 2, 1, 1),
  ('gobi', 'Говь', 'Gobi', 43.57, 104.42, 3, 1, 1);

INSERT INTO aircraft_display (aircraft_id, focal_x, focal_y, alt_mn, alt_en)
  SELECT id, 50, 50, name, name FROM aircraft;
INSERT INTO destination_display (destination_id, focal_x, focal_y, alt_mn, alt_en)
  SELECT id, 50, 50, name_mn, name_en FROM destinations;

INSERT INTO media_slots (slot_key, image_key, focal_x, focal_y, alt_mn, alt_en) VALUES
  ('hero', '/img/hero.jpg', 50, 50, 'Нисдэг тэрэг уулын дээгүүр нисэж байна', 'A helicopter flying above the mountains'),
  ('membership', '/img/lake.jpg', 50, 50, 'Уулсын дундах нуур', 'A remote mountain lake'),
  ('corporate', '/img/mountains.jpg', 50, 50, 'Уулсын оргил', 'Mountain peaks'),
  ('journey-01', '/img/lake.jpg', 50, 52, 'Уулсын дундах нуур', 'A remote mountain lake'),
  ('journey-02', '/img/hero.jpg', 58, 50, 'Нисдэг тэрэгний бүхээг', 'A helicopter in flight'),
  ('journey-03', '/img/hero.jpg', 65, 50, 'Нисдэг тэрэг уулын дээгүүр нисэж байна', 'A helicopter flying above the mountains'),
  ('journey-04', '/img/mountains.jpg', 50, 48, 'Уулсын оргил', 'Mountain peaks'),
  ('journey-05', '/img/lake.jpg', 50, 44, 'Уулсын дундах нуур', 'A remote mountain lake'),
  ('journey-06', '/img/mountains.jpg', 50, 57, 'Уулсын дээгүүрх нислэг', 'A flight above mountain peaks'),
  ('journey-07', '/img/hero.jpg', 50, 54, 'Нисдэг тэрэг уулын дээгүүр нисэж байна', 'A helicopter flying above the mountains');

INSERT INTO site_copy (locale, key, value) VALUES
  ('mn', 'priceDisclaimer', 'Энэ нь зөвхөн жишиг эхлэх үнэ бөгөөд эцсийн үнийг бичгээр ирүүлэх үнийн саналд баталгаажуулна.'),
  ('en', 'priceDisclaimer', 'Indicative starting prices only. Your final price will be confirmed in a written quote.');
