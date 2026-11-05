ALTER TABLE quotes ADD COLUMN IF NOT EXISTS assigned_to TEXT;
CREATE TABLE IF NOT EXISTS quote_internal_notes (
 id BIGSERIAL PRIMARY KEY,
 quote_id TEXT NOT NULL REFERENCES quotes(id),
 actor TEXT NOT NULL,
 body TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 1000),
 created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS quote_internal_notes_request_idx ON quote_internal_notes (quote_id, created_at);
