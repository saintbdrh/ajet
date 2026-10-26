ALTER TABLE destinations ADD COLUMN coordinate_source TEXT NOT NULL DEFAULT '';
ALTER TABLE destinations ADD COLUMN coordinates_verified INTEGER NOT NULL DEFAULT 0
  CHECK (coordinates_verified IN (0, 1));
