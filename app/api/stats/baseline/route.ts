import { NextResponse } from "next/server";
import { z } from "zod";
import { getDatabase } from "@/lib/db";
import { isAdminResponse, requireAdmin } from "@/lib/admin-api";
import { withStaffDatabase } from "@/lib/staff-db";

export const runtime = "nodejs";
const privateHeaders = { "Cache-Control": "private, no-store, max-age=0" };
const schema = z.object({
  total_km: z.number().finite().min(0).max(999999999999.99),
  total_hours: z.number().finite().min(0).max(999999999999.99),
  total_flights: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  as_of: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
  }),
});

type BaselineRow = { total_km: string | number; total_hours: string | number; total_flights: string | number; as_of: string };
const present = (row: BaselineRow) => ({
  total_km: Number(row.total_km),
  total_hours: Number(row.total_hours),
  total_flights: Number(row.total_flights),
  as_of: row.as_of,
});

export async function GET(request: Request) {
  const authorization = await requireAdmin(request, ["owner"]);
  if (isAdminResponse(authorization)) return authorization;
  const db = await getDatabase();
  if (!db) return NextResponse.json({ ok: false, error: "Database is unavailable." }, { status: 503, headers: privateHeaders });
  try {
    const row = await withStaffDatabase(db, authorization, (tx) =>
      tx.prepare("SELECT total_km, total_hours, total_flights, as_of FROM stats_baseline WHERE id = 1")
        .first<BaselineRow>(),
    );
    if (!row) throw new Error("The stats baseline row is missing.");
    return NextResponse.json({ ok: true, baseline: present(row) }, { headers: privateHeaders });
  } catch (error) {
    console.error("[stats] Could not load the owner baseline.", error);
    return NextResponse.json({ ok: false, error: "Could not load the statistics baseline." }, { status: 500, headers: privateHeaders });
  }
}

export async function PUT(request: Request) {
  const authorization = await requireAdmin(request, ["owner"]);
  if (isAdminResponse(authorization)) return authorization;
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400, headers: privateHeaders });
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Enter valid non-negative baseline values and a valid as-of date." }, { status: 400, headers: privateHeaders });
  const db = await getDatabase();
  if (!db) return NextResponse.json({ ok: false, error: "Database is unavailable." }, { status: 503, headers: privateHeaders });
  try {
    const row = await withStaffDatabase(db, authorization, async (tx) => {
      await tx.prepare(
        `INSERT INTO stats_baseline (id, total_km, total_hours, total_flights, as_of)
         VALUES (1, ?, ?, ?, ?)
         ON CONFLICT (id) DO UPDATE SET total_km = EXCLUDED.total_km,
           total_hours = EXCLUDED.total_hours, total_flights = EXCLUDED.total_flights, as_of = EXCLUDED.as_of`,
      ).bind(parsed.data.total_km, parsed.data.total_hours, parsed.data.total_flights, parsed.data.as_of).run();
      return tx.prepare("SELECT total_km, total_hours, total_flights, as_of FROM stats_baseline WHERE id = 1")
        .first<BaselineRow>();
    });
    if (!row) throw new Error("The stats baseline row could not be read after save.");
    return NextResponse.json({ ok: true, baseline: present(row) }, { headers: privateHeaders });
  } catch (error) {
    console.error("[stats] Could not update the owner baseline.", error);
    return NextResponse.json({ ok: false, error: "Could not save the statistics baseline." }, { status: 500, headers: privateHeaders });
  }
}
