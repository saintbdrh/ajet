DROP VIEW public_stats;

DROP TRIGGER flight_legs_audit_insert ON flight_legs;
DROP TRIGGER flight_legs_audit_update ON flight_legs;
DROP TRIGGER stats_baseline_audit_insert ON stats_baseline;
DROP TRIGGER stats_baseline_audit_update ON stats_baseline;
DROP FUNCTION audit_flight_stats_change();

UPDATE quotes SET status = 'confirmed', updated_at = CURRENT_TIMESTAMP WHERE status = 'completed';
DELETE FROM quote_status_history
WHERE from_status = 'confirmed' AND to_status = 'completed'
  AND note = 'Flight legs recorded as completed.';
DELETE FROM admin_audit_log WHERE entity IN ('flight_legs', 'stats_baseline')
  OR action IN ('flight_completed', 'flight_leg_corrected');
DELETE FROM admin_audit_log WHERE entity = 'quote'
  AND detail = 'Flight legs recorded as completed.';

ALTER TABLE quotes DROP CONSTRAINT quotes_status_check;
ALTER TABLE quotes ADD CONSTRAINT quotes_status_check CHECK (
  status IN ('requested', 'in_review', 'quoted', 'approved', 'confirmed', 'declined', 'expired', 'closed')
);

ALTER TABLE flight_legs NO FORCE ROW LEVEL SECURITY;
ALTER TABLE stats_baseline NO FORCE ROW LEVEL SECURITY;
DROP POLICY flight_legs_staff_read ON flight_legs;
DROP POLICY flight_legs_stats_read ON flight_legs;
DROP POLICY flight_legs_staff_insert ON flight_legs;
DROP POLICY flight_legs_system_insert ON flight_legs;
DROP POLICY flight_legs_staff_update ON flight_legs;
DROP POLICY stats_baseline_staff_read ON stats_baseline;
DROP POLICY stats_baseline_stats_read ON stats_baseline;
DROP POLICY stats_baseline_owner_insert ON stats_baseline;
DROP POLICY stats_baseline_owner_update ON stats_baseline;
DROP TABLE flight_legs;
DROP TABLE stats_baseline;
DROP FUNCTION haversine_km(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION);
