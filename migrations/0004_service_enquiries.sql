ALTER TABLE quotes ADD COLUMN service TEXT NOT NULL DEFAULT 'charter'
  CHECK (service IN ('charter', 'catering', 'photography'));
ALTER TABLE quotes ADD COLUMN extras JSONB NOT NULL DEFAULT '[]'::jsonb
  CHECK (jsonb_typeof(extras) = 'array');
ALTER TABLE quotes DROP CONSTRAINT IF EXISTS quotes_passengers_check;
ALTER TABLE quotes ADD CONSTRAINT quotes_party_size_check
  CHECK (passengers BETWEEN 1 AND 500 AND (service <> 'charter' OR passengers <= 20));
