import type { Database } from "@/lib/db";

export type CompletedLegInput = { id: string; actual_km?: number | null; block_minutes: number; pax: number };
type LegRow = { id: string; planned_km: string | null; actual_km: string | null; block_minutes: number | null; pax: number | null };
export type CompletionResult =
  | { error: string; status: 400 | 404 | 409 }
  | { status: "completed"; changed: boolean };

export async function completeBooking(
  tx: Database,
  bookingId: string,
  actor: string,
  legs: CompletedLegInput[],
): Promise<CompletionResult> {
  const booking = await tx.prepare(
    "SELECT id, status FROM quotes WHERE id = ? AND service = 'charter' FOR UPDATE",
  ).bind(bookingId).first<{ id: string; status: string }>();
  if (!booking) return { error: "Booking not found.", status: 404 };
  if (booking.status !== "confirmed" && booking.status !== "completed") {
    return { error: "Only confirmed bookings can be completed.", status: 409 };
  }

  const stored = await tx.prepare(
    "SELECT id, planned_km, actual_km, block_minutes, pax FROM flight_legs WHERE quote_id = ? ORDER BY leg_order FOR UPDATE",
  ).bind(bookingId).all<LegRow>();
  const submitted = new Map(legs.map((leg) => [leg.id, leg]));
  if (stored.results.length !== submitted.size || stored.results.some((leg) => !submitted.has(leg.id))) {
    return { error: "Submit completion details for every flight leg.", status: 400 };
  }
  const missingDistance = stored.results.some((leg) =>
    (submitted.get(leg.id)?.actual_km ?? null) === null && leg.planned_km === null,
  );
  if (missingDistance) {
    return { error: "Төлөвлөсөн зай байхгүй тул нислэгийн хэсэг бүрийн км-ийг оруулна уу.", status: 400 };
  }

  let changed = false;
  for (const leg of stored.results) {
    const values = submitted.get(leg.id);
    if (!values) throw new Error("A submitted flight leg disappeared during completion.");
    const actualKm = values.actual_km ?? null;
    if (
      (leg.actual_km === null ? null : Number(leg.actual_km)) === actualKm &&
      leg.block_minutes === values.block_minutes &&
      leg.pax === values.pax
    ) continue;
    changed = true;
    await tx.prepare(
      `UPDATE flight_legs
       SET actual_km = ?, block_minutes = ?, pax = ?, completed_at = COALESCE(completed_at, CURRENT_TIMESTAMP),
         updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND quote_id = ?`,
    ).bind(actualKm, values.block_minutes, values.pax, leg.id, bookingId).run();
  }

  if (booking.status === "confirmed") {
    await tx.prepare(
      "UPDATE quotes SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'confirmed'",
    ).bind(bookingId).run();
    await tx.prepare(
      `INSERT INTO quote_status_history (quote_id, from_status, to_status, actor, note)
       VALUES (?, 'confirmed', 'completed', ?, 'Flight legs recorded as completed.')`,
    ).bind(bookingId, actor).run();
    await tx.prepare(
      `INSERT INTO admin_audit_log (actor, action, entity, entity_id, detail)
       VALUES (?, 'flight_completed', 'quote', ?, ?)`,
    ).bind(actor, bookingId, `Recorded ${stored.results.length} completed flight leg(s).`).run();
    return { status: "completed", changed: true };
  }
  if (changed) {
    await tx.prepare(
      `INSERT INTO admin_audit_log (actor, action, entity, entity_id, detail)
       VALUES (?, 'flight_leg_corrected', 'quote', ?, 'Corrected completed flight leg measurements.')`,
    ).bind(actor, bookingId).run();
  }
  return { status: "completed", changed };
}
