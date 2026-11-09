import { NextResponse } from "next/server";
import { z } from "zod";
import { getDatabase } from "@/lib/db";
import { isAdminResponse, requireAdmin } from "@/lib/admin-api";
import { withStaffDatabase } from "@/lib/staff-db";
import { completeBooking } from "@/lib/flight-completion";

export const runtime = "nodejs";
const privateHeaders = { "Cache-Control": "private, no-store, max-age=0" };
const schema = z.object({
  legs: z.array(z.object({
    id: z.string().regex(/^L-[0-9a-f-]{36}$/i),
    actual_km: z.number().finite().positive().max(100000).multipleOf(0.01).nullable().optional(),
    block_minutes: z.number().int().positive().max(100000),
    pax: z.number().int().min(1).max(500),
  })).min(1).max(20).refine((legs) => new Set(legs.map((leg) => leg.id)).size === legs.length),
});

type RouteContext = { params: Promise<{ id: string }> };
export async function POST(request: Request, context: RouteContext) {
  const authorization = await requireAdmin(request, ["dispatcher"]);
  if (isAdminResponse(authorization)) return authorization;
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400, headers: privateHeaders });
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Нислэгийн хэсэг бүрийн км, хугацаа, зорчигчийн мэдээллийг зөв оруулна уу." }, { status: 400, headers: privateHeaders });
  const { id } = await context.params;
  if (id.length < 5 || id.length > 60) return NextResponse.json({ ok: false, error: "Booking not found." }, { status: 404, headers: privateHeaders });

  const db = await getDatabase();
  if (!db) return NextResponse.json({ ok: false, error: "Database is unavailable." }, { status: 503, headers: privateHeaders });

  try {
    const result = await withStaffDatabase(db, authorization, (tx) =>
      completeBooking(tx, id, authorization.email, parsed.data.legs),
    );

    if ("error" in result) {
      return NextResponse.json({ ok: false, error: result.error }, { status: result.status, headers: privateHeaders });
    }
    return NextResponse.json({ ok: true, status: result.status, changed: result.changed }, { headers: privateHeaders });
  } catch (error) {
    console.error(`[staff] Could not complete booking ${id}.`, error);
    return NextResponse.json({ ok: false, error: "Could not save completed flight details." }, { status: 500, headers: privateHeaders });
  }
}
