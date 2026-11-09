import assert from "node:assert/strict";

const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl) throw new Error("Set TEST_DATABASE_URL to a disposable database with migrations 0001..0006 applied.");
if (process.env.NODE_ENV === "production") throw new Error("This integration test cannot run in production.");
const databaseName = new URL(testUrl).pathname.slice(1);
if (!databaseName.toLowerCase().includes("test")) {
  throw new Error("Refusing to run destructive test fixtures: TEST_DATABASE_URL database name must include 'test'.");
}

process.env.DATABASE_URL = testUrl;
const { getDatabase } = await import("../lib/db.ts");
const { completeBooking } = await import("../lib/flight-completion.ts");
const { withStaffDatabase } = await import("../lib/staff-db.ts");
const db = await getDatabase();
if (!db) throw new Error("Could not connect to the test database.");

const within = (value, expected, tolerance) => assert.ok(
  Math.abs(Number(value) - expected) <= tolerance,
  `Expected ${value} to be within ${tolerance} of ${expected}.`,
);
const ownerEmail = `test-owner-${crypto.randomUUID()}@test.invalid`;
const dispatcherEmail = `test-dispatcher-${crypto.randomUUID()}@test.invalid`;
const bookingId = `Q-TEST-${crypto.randomUUID()}`;
const closedId = `Q-TEST-${crypto.randomUUID()}`;
const unknownDistanceId = `Q-TEST-${crypto.randomUUID()}`;
const firstLegId = `L-${crypto.randomUUID()}`;
const secondLegId = `L-${crypto.randomUUID()}`;
const closedLegId = `L-${crypto.randomUUID()}`;
const unknownDistanceLegId = `L-${crypto.randomUUID()}`;
let originalBaseline;
let fixturesCreated = false;

const withRole = (role, email, run) => withStaffDatabase(db, { role, email }, run);

try {
  const identity = await db.prepare(
    `SELECT current_database() AS database_name, current_user AS role_name,
      role.rolsuper, role.rolbypassrls
     FROM pg_roles AS role WHERE role.rolname = current_user`,
  ).first();
  console.log(`Database role: ${identity.role_name}; database: ${identity.database_name}; superuser: ${identity.rolsuper}; BYPASSRLS: ${identity.rolbypassrls}`);
  assert.equal(identity.rolsuper, false, "Use a non-superuser DB role; superusers bypass RLS even with FORCE ROW LEVEL SECURITY.");
  assert.equal(identity.rolbypassrls, false, "The application DB role must not have BYPASSRLS.");

  const statusDefinition = await db.prepare(
    `SELECT pg_get_constraintdef(oid) AS definition
     FROM pg_constraint WHERE conrelid = 'quotes'::regclass AND conname = 'quotes_status_check'`,
  ).first();
  assert.ok(statusDefinition, "quotes_status_check must exist.");
  const statuses = [...statusDefinition.definition.matchAll(/'([^']+)'/g)].map((match) => match[1]);
  assert.deepEqual(statuses, ["requested", "in_review", "quoted", "approved", "confirmed", "completed", "declined", "expired", "closed"]);
  console.log(`Booking status constraint: ${statusDefinition.definition}`);
  assert.ok(!statuses.includes("cancelled"), "The current schema uses closed, not a cancelled status.");

  const tableSecurity = await db.prepare(
    `SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity, owner.rolname AS owner_name,
      owner.rolsuper AS owner_superuser, owner.rolbypassrls AS owner_bypassrls
     FROM pg_class c JOIN pg_roles owner ON owner.oid = c.relowner
     WHERE c.oid IN ('flight_legs'::regclass, 'stats_baseline'::regclass)
     ORDER BY c.relname`,
  ).all();
  assert.equal(tableSecurity.results.length, 2);
  assert.ok(tableSecurity.results.every((table) => table.relrowsecurity && table.relforcerowsecurity));
  assert.ok(tableSecurity.results.every((table) => !table.owner_superuser && !table.owner_bypassrls));
  console.log("RLS status:", tableSecurity.results.map((table) =>
    `${table.relname} owner=${table.owner_name}, enabled=${table.relrowsecurity}, forced=${table.relforcerowsecurity}`,
  ).join("; "));

  const publicPrivileges = await db.prepare(
    `SELECT c.relname, acl.privilege_type
     FROM pg_class c
     CROSS JOIN LATERAL aclexplode(COALESCE(c.relacl, acldefault('r', c.relowner))) acl
     WHERE c.oid IN ('flight_legs'::regclass, 'stats_baseline'::regclass)
       AND acl.grantee = 0 AND acl.privilege_type IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE')`,
  ).all();
  assert.equal(publicPrivileges.results.length, 0, "PUBLIC must not have table privileges.");

  originalBaseline = await withRole("owner", ownerEmail, (tx) =>
    tx.prepare("SELECT total_km, total_hours, total_flights, as_of FROM stats_baseline WHERE id = 1")
      .first(),
  );
  assert.ok(originalBaseline, "Migration should seed one baseline row.");

  await withRole("system", "system", async (tx) => {
    await tx.prepare(
      `INSERT INTO quotes (id, locale, name, phone, origin, destination, flight_date, passengers, status, service, round_trip)
       VALUES (?, 'mn', 'Completed test booking', '000000', 'Ulaanbaatar', 'Gobi', '2026-01-01', 1, 'confirmed', 'charter', 1),
         (?, 'mn', 'Closed test booking', '000000', 'Ulaanbaatar', 'Gobi', '2026-01-01', 1, 'closed', 'charter', 0),
         (?, 'mn', 'Missing-distance test booking', '000000', 'Ulaanbaatar', 'Gobi', '2026-01-01', 1, 'confirmed', 'charter', 0)`,
    ).bind(bookingId, closedId, unknownDistanceId).run();
    await tx.prepare(
      `INSERT INTO flight_legs (id, quote_id, leg_order, origin, destination, planned_km)
       VALUES (?, ?, 1, 'Ulaanbaatar', 'Gobi', 500),
         (?, ?, 2, 'Gobi', 'Ulaanbaatar', 300),
         (?, ?, 1, 'Ulaanbaatar', 'Gobi', 400),
         (?, ?, 1, 'Ulaanbaatar', 'No verified destination', NULL)`,
    ).bind(firstLegId, bookingId, secondLegId, bookingId, closedLegId, closedId, unknownDistanceLegId, unknownDistanceId).run();
  });
  fixturesCreated = true;

  const cityPairs = await withRole("owner", ownerEmail, (tx) => tx.prepare(
    `SELECT haversine_km(40.7128, -74.0060, 51.5072, -0.1276) AS ny_london,
      haversine_km(48.8566, 2.3522, 51.5072, -0.1276) AS paris_london`,
  ).first());
  within(cityPairs.ny_london, 5570, 28);
  within(cityPairs.paris_london, 344, 2);
  console.log("Haversine city-pair checks passed (New York–London, Paris–London).");

  const missingDistance = await withRole("dispatcher", dispatcherEmail, (tx) => completeBooking(tx, unknownDistanceId, dispatcherEmail, [
    { id: unknownDistanceLegId, block_minutes: 30, pax: 1 },
  ]));
  assert.deepEqual(missingDistance, {
    error: "Төлөвлөсөн зай байхгүй тул нислэгийн хэсэг бүрийн км-ийг оруулна уу.",
    status: 400,
  });
  await assert.rejects(() => withRole("dispatcher", dispatcherEmail, async (tx) => {
    await tx.prepare(
      "UPDATE flight_legs SET block_minutes = 30, pax = 1, completed_at = CURRENT_TIMESTAMP WHERE id = ?",
    ).bind(unknownDistanceLegId).run();
  }), /flight_legs_(completion_fields|km_available)_check/);
  console.log("Null planned_km with no actual_km is rejected by completion and database constraints.");

  await withRole("owner", ownerEmail, async (tx) => {
    await tx.prepare(
      "UPDATE stats_baseline SET total_km = 1000, total_hours = 200, total_flights = 30, as_of = '2020-01-01' WHERE id = 1",
    ).run();
    await tx.prepare(
      `UPDATE flight_legs SET block_minutes = 75, pax = 1, completed_at = CURRENT_TIMESTAMP WHERE id = ?`,
    ).bind(closedLegId).run();
  });

  const completionInput = [
    { id: firstLegId, actual_km: 123.45, block_minutes: 90, pax: 1 },
    { id: secondLegId, actual_km: null, block_minutes: 120, pax: 2 },
  ];
  const concurrent = await Promise.all([
    withRole("dispatcher", dispatcherEmail, (tx) => completeBooking(tx, bookingId, dispatcherEmail, completionInput)),
    withRole("dispatcher", dispatcherEmail, (tx) => completeBooking(tx, bookingId, dispatcherEmail, completionInput)),
  ]);
  assert.equal(concurrent.filter((result) => !("error" in result) && result.changed).length, 1);
  assert.equal(concurrent.filter((result) => !("error" in result) && !result.changed).length, 1);
  console.log("Concurrent completion check passed: one write, one idempotent no-op.");

  const completedState = await withRole("owner", ownerEmail, async (tx) => {
    const legs = await tx.prepare(
      "SELECT id, actual_km, planned_km, completed_at FROM flight_legs WHERE quote_id = ? ORDER BY leg_order",
    ).bind(bookingId).all();
    const quote = await tx.prepare("SELECT status FROM quotes WHERE id = ?").bind(bookingId).first();
    return { legs: legs.results, quote };
  });
  assert.equal(completedState.quote.status, "completed");
  assert.ok(completedState.legs.every((leg) => leg.completed_at));
  assert.equal(completedState.legs[1].actual_km, null, "A planned distance can supply a missing actual distance.");
  const completedRows = await db.prepare(
    "SELECT COUNT(*) AS count FROM flight_legs WHERE quote_id = ? AND completed_at IS NOT NULL",
  ).bind(bookingId).first();
  assert.equal(Number(completedRows.count), 2);

  const firstRepeat = await withRole("dispatcher", dispatcherEmail, (tx) =>
    completeBooking(tx, bookingId, dispatcherEmail, completionInput),
  );
  assert.deepEqual(firstRepeat, { status: "completed", changed: false });

  const firstLegAuditBefore = await db.prepare(
    "SELECT COUNT(*) AS count FROM admin_audit_log WHERE entity = 'flight_legs' AND entity_id = ? AND action = 'UPDATE'",
  ).bind(firstLegId).first();
  assert.equal(Number(firstLegAuditBefore.count), 1, "The initial completion must make one audit update.");

  const correction = await withRole("dispatcher", dispatcherEmail, (tx) => completeBooking(tx, bookingId, dispatcherEmail, [
    { id: firstLegId, actual_km: 125, block_minutes: 100, pax: 2 },
    { id: secondLegId, actual_km: null, block_minutes: 120, pax: 2 },
  ]));
  assert.deepEqual(correction, { status: "completed", changed: true });
  const audit = await db.prepare(
    "SELECT detail FROM admin_audit_log WHERE entity = 'flight_legs' AND entity_id = ? AND action = 'UPDATE' ORDER BY id DESC LIMIT 1",
  ).bind(firstLegId).first();
  const auditDetail = JSON.parse(audit.detail);
  assert.equal(Number(auditDetail.before.actual_km), 123.45);
  assert.equal(Number(auditDetail.after.actual_km), 125);
  assert.equal(Number(auditDetail.before.block_minutes), 90);
  assert.equal(Number(auditDetail.after.block_minutes), 100);
  console.log("Correction audit check passed with old and new distance/time values.");

  const closedStatus = await db.prepare("SELECT status FROM quotes WHERE id = ?").bind(closedId).first();
  assert.equal(closedStatus.status, "closed");

  await withRole("dispatcher", dispatcherEmail, async (tx) => {
    const visibleLeg = await tx.prepare("SELECT id FROM flight_legs WHERE id = ?").bind(firstLegId).first();
    assert.ok(visibleLeg, "A dispatcher must read flight legs.");
    const deniedBaselineUpdate = await tx.prepare(
      "UPDATE stats_baseline SET total_km = total_km + 1 WHERE id = 1",
    ).run();
    assert.equal(deniedBaselineUpdate.meta.changes, 0, "A dispatcher must not edit the baseline.");
  });
  await withRole("content_editor", "test-editor@test.invalid", async (tx) => {
    const hiddenLeg = await tx.prepare("SELECT id FROM flight_legs WHERE id = ?").bind(firstLegId).first();
    assert.equal(hiddenLeg, null, "A content editor must not read flight legs.");
    const deniedBaselineUpdate = await tx.prepare(
      "UPDATE stats_baseline SET total_km = total_km + 1 WHERE id = 1",
    ).run();
    assert.equal(deniedBaselineUpdate.meta.changes, 0, "A content editor must not edit the baseline.");
  });
  await withRole("owner", ownerEmail, async (tx) => {
    const updated = await tx.prepare(
      "UPDATE stats_baseline SET total_km = 1000 WHERE id = 1",
    ).run();
    assert.equal(updated.meta.changes, 1, "An owner must be able to edit the baseline.");
  });

  const stats = await withRole("system", "system", async (tx) => {
    await tx.prepare("SELECT set_config('app.stats_view', 'on', true)").run();
    return tx.prepare("SELECT total_km, total_hours, total_flights, as_of FROM public_stats").first();
  });
  within(stats.total_km, 1425, 0.01);
  within(stats.total_hours, 200 + (220 / 60), 0.0001);
  assert.equal(Number(stats.total_flights), 32);
  assert.equal(String(stats.as_of).slice(0, 10), "2020-01-01");
  console.log("Baseline/view check passed: baseline and as_of are included; closed booking contributes 0; each completed leg counts once.");
  console.log("All total-km integration checks passed.");
} finally {
  if (fixturesCreated) {
    await withRole("owner", ownerEmail, async (tx) => {
      await tx.prepare("DELETE FROM quotes WHERE id IN (?, ?, ?)").bind(bookingId, closedId, unknownDistanceId).run();
      if (originalBaseline) {
        await tx.prepare(
          "UPDATE stats_baseline SET total_km = ?, total_hours = ?, total_flights = ?, as_of = ? WHERE id = 1",
        ).bind(originalBaseline.total_km, originalBaseline.total_hours, originalBaseline.total_flights, originalBaseline.as_of).run();
      }
      await tx.prepare(
        "DELETE FROM admin_audit_log WHERE actor IN (?, ?, 'test-editor@test.invalid')",
      ).bind(ownerEmail, dispatcherEmail).run();
      await tx.prepare(
        "DELETE FROM admin_audit_log WHERE entity = 'flight_legs' AND entity_id IN (?, ?, ?, ?)",
      ).bind(firstLegId, secondLegId, closedLegId, unknownDistanceLegId).run();
    });
  }
  const pool = globalThis.ajetDb?.pool;
  if (pool) await pool.end();
}
