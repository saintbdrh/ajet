import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { isAdminResponse, requireAdmin } from "@/lib/admin-api";
import { withStaffDatabase } from "@/lib/staff-db";

export const runtime = "nodejs";
const privateHeaders = { "Cache-Control": "private, no-store, max-age=0" };

export async function GET(request: Request) {
  const authorization = await requireAdmin(request, ["dispatcher"]);
  if (isAdminResponse(authorization)) return authorization;
  const db = await getDatabase();
  if (!db) return NextResponse.json({ ok: false, error: "Database is unavailable." }, { status: 503, headers: privateHeaders });

  try {
    const bookings = await withStaffDatabase(db, authorization, async (tx) => {
      const quotes = await tx.prepare(
        `SELECT id, locale, name, origin, destination, round_trip, flight_date, flight_time,
          passengers, status, updated_at
         FROM quotes
         WHERE status IN ('confirmed', 'completed') AND service = 'charter'
         ORDER BY flight_date DESC, id`,
      ).all<{
        id: string; locale: "mn" | "en"; name: string; origin: string; destination: string;
        round_trip: number; flight_date: string; flight_time: string; passengers: number;
        status: "confirmed" | "completed"; updated_at: string;
      }>();
      const legs = await tx.prepare(
        `SELECT id, quote_id, leg_order, origin, destination, planned_km, actual_km,
          block_minutes, pax, completed_at
         FROM flight_legs
         WHERE quote_id IN (SELECT id FROM quotes WHERE status IN ('confirmed', 'completed') AND service = 'charter')
         ORDER BY quote_id, leg_order`,
      ).all<{
        id: string; quote_id: string; leg_order: number; origin: string; destination: string;
        planned_km: string | null; actual_km: string | null; block_minutes: number | null;
        pax: number | null; completed_at: string | null;
      }>();
      return quotes.results.map((booking) => ({
        ...booking,
        legs: legs.results.filter((leg) => leg.quote_id === booking.id).map((leg) => ({
          id: leg.id,
          legOrder: leg.leg_order,
          origin: leg.origin,
          destination: leg.destination,
          plannedKm: leg.planned_km === null ? null : Number(leg.planned_km),
          actualKm: leg.actual_km === null ? null : Number(leg.actual_km),
          blockMinutes: leg.block_minutes,
          pax: leg.pax,
          completedAt: leg.completed_at,
        })),
      }));
    });
    return NextResponse.json({ ok: true, items: bookings }, { headers: privateHeaders });
  } catch (error) {
    console.error("[staff] Could not load confirmed bookings for flight completion.", error);
    return NextResponse.json({ ok: false, error: "Could not load bookings." }, { status: 500, headers: privateHeaders });
  }
}
