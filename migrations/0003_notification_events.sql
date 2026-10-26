ALTER TABLE quote_notification_attempts RENAME TO quote_notification_attempts_legacy;

CREATE TABLE quote_notification_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quote_id TEXT NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  event TEXT NOT NULL CHECK (event IN ('request_received', 'quote_sent', 'client_approved', 'client_declined', 'flight_confirmed')),
  channel TEXT NOT NULL CHECK (channel IN ('telegram', 'email')),
  succeeded INTEGER NOT NULL CHECK (succeeded IN (0, 1)),
  attempted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
) STRICT;

INSERT INTO quote_notification_attempts (id, quote_id, event, channel, succeeded, attempted_at)
SELECT id, quote_id, 'request_received', channel, succeeded, attempted_at FROM quote_notification_attempts_legacy;

DROP TABLE quote_notification_attempts_legacy;
