CREATE TABLE career_interests (
  id UUID PRIMARY KEY,
  locale TEXT NOT NULL CHECK (locale IN ('mn', 'en')),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  area INTEGER NOT NULL CHECK (area BETWEEN 0 AND 4),
  experience TEXT NOT NULL DEFAULT '',
  consent_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX career_interests_created_idx ON career_interests(created_at DESC, id);
CREATE INDEX career_interests_email_idx ON career_interests(email, created_at DESC);
