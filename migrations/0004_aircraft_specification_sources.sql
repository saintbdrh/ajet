ALTER TABLE aircraft ADD COLUMN specification_source TEXT NOT NULL DEFAULT '';
ALTER TABLE aircraft ADD COLUMN specifications_verified INTEGER NOT NULL DEFAULT 0
  CHECK (specifications_verified IN (0, 1));
