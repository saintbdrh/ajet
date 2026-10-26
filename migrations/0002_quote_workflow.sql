ALTER TABLE quotes RENAME TO quotes_legacy;
DROP INDEX IF EXISTS quotes_created_at_idx;
DROP INDEX IF EXISTS quotes_status_idx;

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
  assigned_aircraft_id TEXT,
  operational_approved_by TEXT,
  operational_approved_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (assigned_aircraft_id) REFERENCES aircraft(id) ON DELETE SET NULL
) STRICT;

INSERT INTO quotes (
  id, locale, name, phone, email, organization, origin, destination, round_trip,
  flight_date, flight_time, passengers, notes, status, created_at, updated_at
)
SELECT
  id, locale, name, phone, email, organization, origin, destination, round_trip,
  flight_date, flight_time, passengers, notes,
  CASE status
    WHEN 'new' THEN 'requested'
    WHEN 'contacted' THEN 'in_review'
    WHEN 'quoted' THEN 'quoted'
    WHEN 'booked' THEN 'approved'
    ELSE 'closed'
  END,
  created_at, updated_at
FROM quotes_legacy;

DROP TABLE quotes_legacy;

CREATE INDEX quotes_created_at_idx ON quotes(created_at DESC);
CREATE INDEX quotes_status_idx ON quotes(status);
CREATE INDEX quotes_flight_date_idx ON quotes(flight_date);

CREATE TABLE quote_revisions (
  id TEXT PRIMARY KEY,
  quote_id TEXT NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  revision INTEGER NOT NULL CHECK (revision > 0),
  amount_minor INTEGER NOT NULL CHECK (amount_minor >= 0),
  currency TEXT NOT NULL CHECK (currency GLOB '[A-Z][A-Z][A-Z]'),
  terms TEXT NOT NULL DEFAULT '',
  expires_at TEXT NOT NULL,
  approval_token_hash TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'approved', 'declined', 'expired', 'superseded')),
  created_by TEXT NOT NULL,
  sent_at TEXT,
  responded_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (quote_id, revision)
) STRICT;

CREATE INDEX quote_revisions_quote_idx ON quote_revisions(quote_id, revision DESC);
CREATE INDEX quote_revisions_expiry_idx ON quote_revisions(status, expires_at);

CREATE TABLE quote_status_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quote_id TEXT NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  actor TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
) STRICT;

INSERT INTO quote_status_history (quote_id, from_status, to_status, actor, note, created_at)
SELECT id, NULL, status, 'migration', 'Imported from the previous request status.', updated_at FROM quotes;

CREATE INDEX quote_status_history_quote_idx ON quote_status_history(quote_id, id DESC);

CREATE TABLE quote_notification_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quote_id TEXT NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('telegram', 'email')),
  succeeded INTEGER NOT NULL CHECK (succeeded IN (0, 1)),
  attempted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
) STRICT;

CREATE TABLE admin_audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT NOT NULL DEFAULT '',
  detail TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
) STRICT;

CREATE INDEX admin_audit_log_created_idx ON admin_audit_log(created_at DESC);
