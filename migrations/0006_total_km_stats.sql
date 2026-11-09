CREATE FUNCTION haversine_km(
  lat1 DOUBLE PRECISION,
  lon1 DOUBLE PRECISION,
  lat2 DOUBLE PRECISION,
  lon2 DOUBLE PRECISION
) RETURNS NUMERIC
LANGUAGE SQL
IMMUTABLE
STRICT
PARALLEL SAFE
AS $$
  SELECT ROUND((
    6371.0088 * 2 * ASIN(SQRT(LEAST(1::DOUBLE PRECISION, GREATEST(
      0::DOUBLE PRECISION,
      POWER(SIN(RADIANS(lat2 - lat1) / 2), 2)
        + COS(RADIANS(lat1)) * COS(RADIANS(lat2))
        * POWER(SIN(RADIANS(lon2 - lon1) / 2), 2)
    ))))
  )::NUMERIC, 2)
$$;

CREATE TABLE flight_legs (
  id TEXT PRIMARY KEY,
  quote_id TEXT NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  leg_order SMALLINT NOT NULL CHECK (leg_order BETWEEN 1 AND 20),
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  planned_km NUMERIC(10, 2) CHECK (planned_km IS NULL OR planned_km > 0),
  actual_km NUMERIC(10, 2) CHECK (actual_km IS NULL OR actual_km > 0),
  block_minutes INTEGER CHECK (block_minutes IS NULL OR block_minutes BETWEEN 1 AND 100000),
  pax INTEGER CHECK (pax IS NULL OR pax BETWEEN 1 AND 500),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (quote_id, leg_order),
  CONSTRAINT flight_legs_completion_fields_check CHECK (
    (completed_at IS NULL AND actual_km IS NULL AND block_minutes IS NULL AND pax IS NULL)
    OR (
      completed_at IS NOT NULL
      AND COALESCE(actual_km, planned_km) IS NOT NULL
      AND block_minutes IS NOT NULL
      AND pax IS NOT NULL
    )
  ),
  CONSTRAINT flight_legs_km_available_check CHECK (
    completed_at IS NULL OR COALESCE(actual_km, planned_km) IS NOT NULL
  )
);

CREATE INDEX flight_legs_quote_idx ON flight_legs (quote_id, leg_order);
CREATE INDEX flight_legs_completed_idx ON flight_legs (completed_at) WHERE completed_at IS NOT NULL;

CREATE TABLE stats_baseline (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  total_km NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (total_km >= 0),
  total_hours NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (total_hours >= 0),
  total_flights BIGINT NOT NULL DEFAULT 0 CHECK (total_flights >= 0),
  as_of DATE NOT NULL
);

CREATE FUNCTION audit_flight_stats_change() RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  record_id TEXT;
  actor_email TEXT;
BEGIN
  actor_email := NULLIF(current_setting('app.actor_email', true), '');
  IF TG_TABLE_NAME = 'flight_legs' THEN
    record_id := NEW.id;
  ELSE
    record_id := '1';
  END IF;

  INSERT INTO admin_audit_log (actor, action, entity, entity_id, detail)
  VALUES (
    COALESCE(actor_email, 'system'),
    TG_OP,
    TG_TABLE_NAME,
    record_id,
    CASE
      WHEN TG_OP = 'INSERT' THEN jsonb_build_object('after', to_jsonb(NEW))::TEXT
      ELSE jsonb_build_object('before', to_jsonb(OLD), 'after', to_jsonb(NEW))::TEXT
    END
  );
  RETURN NEW;
END
$$;

CREATE TRIGGER flight_legs_audit_insert
AFTER INSERT ON flight_legs
FOR EACH ROW EXECUTE FUNCTION audit_flight_stats_change();

CREATE TRIGGER flight_legs_audit_update
AFTER UPDATE ON flight_legs
FOR EACH ROW EXECUTE FUNCTION audit_flight_stats_change();

CREATE TRIGGER stats_baseline_audit_insert
AFTER INSERT ON stats_baseline
FOR EACH ROW EXECUTE FUNCTION audit_flight_stats_change();

CREATE TRIGGER stats_baseline_audit_update
AFTER UPDATE ON stats_baseline
FOR EACH ROW EXECUTE FUNCTION audit_flight_stats_change();

INSERT INTO stats_baseline (id, total_km, total_hours, total_flights, as_of)
VALUES (1, 0, 0, 0, CURRENT_DATE);

WITH routes AS (
  SELECT id AS quote_id, 1::SMALLINT AS leg_order, origin, destination
  FROM quotes
  WHERE service = 'charter'
  UNION ALL
  SELECT id AS quote_id, 2::SMALLINT AS leg_order, destination AS origin, origin AS destination
  FROM quotes
  WHERE service = 'charter' AND round_trip = 1
)
INSERT INTO flight_legs (id, quote_id, leg_order, origin, destination, planned_km)
SELECT
  'L-' || gen_random_uuid()::TEXT,
  routes.quote_id,
  routes.leg_order,
  routes.origin,
  routes.destination,
  CASE
    WHEN from_location.latitude IS NOT NULL AND to_location.latitude IS NOT NULL
      THEN haversine_km(from_location.latitude, from_location.longitude, to_location.latitude, to_location.longitude)
    ELSE NULL
  END
FROM routes
LEFT JOIN LATERAL (
  SELECT MIN(latitude) AS latitude, MIN(longitude) AS longitude
  FROM destinations
  WHERE coordinates_verified = 1 AND is_published = 1
    AND (
      LOWER(BTRIM(id)) = LOWER(BTRIM(routes.origin))
      OR LOWER(BTRIM(name_mn)) = LOWER(BTRIM(routes.origin))
      OR LOWER(BTRIM(name_en)) = LOWER(BTRIM(routes.origin))
    )
  HAVING COUNT(*) = 1
) AS from_location ON TRUE
LEFT JOIN LATERAL (
  SELECT MIN(latitude) AS latitude, MIN(longitude) AS longitude
  FROM destinations
  WHERE coordinates_verified = 1 AND is_published = 1
    AND (
      LOWER(BTRIM(id)) = LOWER(BTRIM(routes.destination))
      OR LOWER(BTRIM(name_mn)) = LOWER(BTRIM(routes.destination))
      OR LOWER(BTRIM(name_en)) = LOWER(BTRIM(routes.destination))
    )
  HAVING COUNT(*) = 1
) AS to_location ON TRUE
ON CONFLICT (quote_id, leg_order) DO NOTHING;

ALTER TABLE flight_legs ENABLE ROW LEVEL SECURITY;
ALTER TABLE stats_baseline ENABLE ROW LEVEL SECURITY;

CREATE POLICY flight_legs_staff_read ON flight_legs
  FOR SELECT
  USING (current_setting('app.staff_role', true) IN ('owner', 'dispatcher'));

CREATE POLICY flight_legs_stats_read ON flight_legs
  FOR SELECT
  USING (current_setting('app.stats_view', true) = 'on');

CREATE POLICY flight_legs_staff_insert ON flight_legs
  FOR INSERT
  WITH CHECK (current_setting('app.staff_role', true) IN ('owner', 'dispatcher'));

CREATE POLICY flight_legs_system_insert ON flight_legs
  FOR INSERT
  WITH CHECK (current_setting('app.staff_role', true) = 'system');

CREATE POLICY flight_legs_staff_update ON flight_legs
  FOR UPDATE
  USING (current_setting('app.staff_role', true) IN ('owner', 'dispatcher'))
  WITH CHECK (current_setting('app.staff_role', true) IN ('owner', 'dispatcher'));

CREATE POLICY stats_baseline_staff_read ON stats_baseline
  FOR SELECT
  USING (current_setting('app.staff_role', true) IN ('owner', 'dispatcher'));

CREATE POLICY stats_baseline_stats_read ON stats_baseline
  FOR SELECT
  USING (current_setting('app.stats_view', true) = 'on');

CREATE POLICY stats_baseline_owner_insert ON stats_baseline
  FOR INSERT
  WITH CHECK (current_setting('app.staff_role', true) = 'owner');

CREATE POLICY stats_baseline_owner_update ON stats_baseline
  FOR UPDATE
  USING (current_setting('app.staff_role', true) = 'owner')
  WITH CHECK (current_setting('app.staff_role', true) = 'owner');

REVOKE ALL ON flight_legs, stats_baseline FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON flight_legs, stats_baseline FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON flight_legs, stats_baseline FROM authenticated';
  END IF;
END
$$;
ALTER TABLE flight_legs FORCE ROW LEVEL SECURITY;
ALTER TABLE stats_baseline FORCE ROW LEVEL SECURITY;

ALTER TABLE quotes DROP CONSTRAINT quotes_status_check;
ALTER TABLE quotes ADD CONSTRAINT quotes_status_check CHECK (
  status IN ('requested', 'in_review', 'quoted', 'approved', 'confirmed', 'completed', 'declined', 'expired', 'closed')
);

CREATE VIEW public_stats AS
SELECT
  baseline.total_km + COALESCE(SUM(COALESCE(legs.actual_km, legs.planned_km)), 0)::NUMERIC(14, 2) AS total_km,
  baseline.total_hours + COALESCE(SUM(legs.block_minutes), 0)::NUMERIC / 60 AS total_hours,
  baseline.total_flights + COUNT(legs.id)::BIGINT AS total_flights,
  baseline.as_of
FROM stats_baseline AS baseline
LEFT JOIN (
  SELECT legs.id, legs.actual_km, legs.block_minutes
  FROM flight_legs AS legs
  JOIN quotes AS booking ON booking.id = legs.quote_id
  WHERE legs.completed_at IS NOT NULL AND booking.status = 'completed' AND booking.service = 'charter'
) AS legs ON TRUE
WHERE baseline.id = 1
GROUP BY baseline.id;

REVOKE ALL ON flight_legs, stats_baseline FROM PUBLIC;
GRANT SELECT ON public_stats TO PUBLIC;
