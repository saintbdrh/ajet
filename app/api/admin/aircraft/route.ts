import { NextResponse } from "next/server";
import { z } from "zod";
import { getDatabase } from "@/lib/cloudflare";
import { isAdminResponse, requireAdmin } from "@/lib/admin-api";
import { contentRevisionStatement } from "@/lib/content-revisions";
import { revalidatePath } from "next/cache";

export const runtime = "nodejs";

const aircraftSchema = z.object({
  id: z.string().trim().regex(/^[a-z0-9-]{2,80}$/),
  name: z.string().trim().min(2).max(100),
  descriptionMn: z.string().trim().max(2000),
  descriptionEn: z.string().trim().max(2000),
  seats: z.number().int().min(1).max(30).nullable(),
  rangeKm: z.number().int().min(1).max(20000).nullable(),
  cruiseKmh: z.number().int().min(1).max(1000).nullable(),
  payloadKg: z.number().int().min(1).max(10000).nullable(),
  imageKey: z.string().max(240).nullable(),
  focalX: z.number().int().min(0).max(100).default(50),
  focalY: z.number().int().min(0).max(100).default(50),
  altMn: z.string().trim().min(1).max(300),
  altEn: z.string().trim().min(1).max(300),
  specificationSource: z.union([z.literal(""), z.string().url().max(500)]),
  specificationsVerified: z.boolean(),
  orderIndex: z.number().int().min(0).max(10000),
  isPublished: z.boolean(),
}).superRefine((item, context) => {
  if (item.specificationsVerified && !item.specificationSource.startsWith("https://")) {
    context.addIssue({ code: "custom", path: ["specificationSource"], message: "Verified specifications require an HTTPS source." });
  }
});

type AircraftRow = {
  id: string; name: string; description_mn: string; description_en: string;
  seats: number | null; range_km: number | null; cruise_kmh: number | null;
  payload_kg: number | null; image_key: string | null; order_index: number;
  is_published: number; specification_source: string; specifications_verified: number;
  focal_x: number; focal_y: number; alt_mn: string; alt_en: string;
};

export async function GET(request: Request) {
  const authorization = await requireAdmin(request, ["content_editor"]);
  if (isAdminResponse(authorization)) return authorization;
  const db = await getDatabase();
  if (!db) return NextResponse.json({ ok: false, error: "D1 is unavailable." }, { status: 503 });
  const result = await db.prepare(
    `SELECT id, name, description_mn, description_en, seats, range_km, cruise_kmh,
      payload_kg, image_key, specification_source, specifications_verified,
      COALESCE(display.focal_x, 50) AS focal_x, COALESCE(display.focal_y, 50) AS focal_y,
      COALESCE(display.alt_mn, aircraft.name) AS alt_mn, COALESCE(display.alt_en, aircraft.name) AS alt_en,
      order_index, is_published
    FROM aircraft LEFT JOIN aircraft_display display ON display.aircraft_id = aircraft.id
    ORDER BY order_index, name`,
  ).all<AircraftRow>();
  if (!result.success) {
    console.error("[admin] Could not load aircraft.", result.error);
    return NextResponse.json({ ok: false, error: "Could not load aircraft." }, { status: 500 });
  }
  return NextResponse.json({
    ok: true,
    items: result.results.map((row) => ({
      id: row.id,
      name: row.name,
      descriptionMn: row.description_mn,
      descriptionEn: row.description_en,
      seats: row.seats,
      rangeKm: row.range_km,
      cruiseKmh: row.cruise_kmh,
      payloadKg: row.payload_kg,
      imageKey: row.image_key,
      specificationSource: row.specification_source,
      specificationsVerified: row.specifications_verified === 1,
      focalX: row.focal_x,
      focalY: row.focal_y,
      altMn: row.alt_mn || row.name,
      altEn: row.alt_en || row.name,
      orderIndex: row.order_index,
      isPublished: row.is_published === 1,
    })),
  });
}

async function saveAircraft(request: Request) {
  const authorization = await requireAdmin(request, ["content_editor"]);
  if (isAdminResponse(authorization)) return authorization;
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = aircraftSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid aircraft details." }, { status: 400 });
  const db = await getDatabase();
  if (!db) return NextResponse.json({ ok: false, error: "D1 is unavailable." }, { status: 503 });
  const item = parsed.data;
  const previous = await db.prepare(
    `SELECT aircraft.*, display.focal_x, display.focal_y, display.alt_mn, display.alt_en
     FROM aircraft LEFT JOIN aircraft_display display ON display.aircraft_id = aircraft.id
     WHERE aircraft.id = ?`,
  ).bind(item.id).first();
  const after = {
    id: item.id,
    name: item.name,
    description_mn: item.descriptionMn,
    description_en: item.descriptionEn,
    seats: item.seats,
    range_km: item.rangeKm,
    cruise_kmh: item.cruiseKmh,
    payload_kg: item.payloadKg,
    image_key: item.imageKey,
    specification_source: item.specificationSource,
    specifications_verified: item.specificationsVerified ? 1 : 0,
    order_index: item.orderIndex,
    is_placeholder: 0,
    is_published: item.isPublished ? 1 : 0,
    focal_x: item.focalX,
    focal_y: item.focalY,
    alt_mn: item.altMn,
    alt_en: item.altEn,
  };
  const results = await db.batch([
    db.prepare(
    `INSERT INTO aircraft (
      id, name, description_mn, description_en, seats, range_km, cruise_kmh,
      payload_kg, image_key, specification_source, specifications_verified,
      order_index, is_placeholder, is_published, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name, description_mn = excluded.description_mn,
      description_en = excluded.description_en, seats = excluded.seats,
      range_km = excluded.range_km, cruise_kmh = excluded.cruise_kmh,
      payload_kg = excluded.payload_kg, image_key = excluded.image_key,
      specification_source = excluded.specification_source,
      specifications_verified = excluded.specifications_verified,
      order_index = excluded.order_index, is_placeholder = 0,
      is_published = excluded.is_published,
      updated_at = CURRENT_TIMESTAMP`,
    ).bind(
    item.id, item.name, item.descriptionMn, item.descriptionEn, item.seats,
    item.rangeKm, item.cruiseKmh, item.payloadKg, item.imageKey,
    item.specificationSource, item.specificationsVerified ? 1 : 0,
    item.orderIndex, item.isPublished ? 1 : 0,
    ),
    db.prepare(
    `INSERT INTO aircraft_display (aircraft_id, focal_x, focal_y, alt_mn, alt_en)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(aircraft_id) DO UPDATE SET focal_x = excluded.focal_x,
       focal_y = excluded.focal_y, alt_mn = excluded.alt_mn, alt_en = excluded.alt_en`,
    ).bind(item.id, item.focalX, item.focalY, item.altMn, item.altEn),
    contentRevisionStatement(db, "aircraft", item.id, previous, after, authorization.email),
  ]);
  if (results.some((result) => !result.success)) {
    console.error("[admin] Could not save aircraft and its revision.", results);
    return NextResponse.json({ ok: false, error: "Could not save aircraft." }, { status: 500 });
  }
  revalidatePath("/[locale]/fleet", "page");
  revalidatePath("/[locale]", "page");
  return NextResponse.json({ ok: true, id: item.id });
}

export const POST = saveAircraft;
export const PUT = saveAircraft;

export async function DELETE(request: Request) {
  const authorization = await requireAdmin(request, ["content_editor"]);
  if (isAdminResponse(authorization)) return authorization;
  const id = new URL(request.url).searchParams.get("id");
  if (!id || !/^[a-z0-9-]{2,80}$/.test(id)) {
    return NextResponse.json({ ok: false, error: "Invalid aircraft id." }, { status: 400 });
  }
  const db = await getDatabase();
  if (!db) return NextResponse.json({ ok: false, error: "D1 is unavailable." }, { status: 503 });
  const permanent = new URL(request.url).searchParams.get("permanent") === "true";
  if (permanent && authorization.role !== "owner") {
    return NextResponse.json({ ok: false, error: "Only the owner can permanently remove aircraft." }, { status: 403 });
  }
  const before = await db.prepare(
    `SELECT aircraft.*, display.focal_x, display.focal_y, display.alt_mn, display.alt_en
     FROM aircraft LEFT JOIN aircraft_display display ON display.aircraft_id = aircraft.id
     WHERE aircraft.id = ?`,
  ).bind(id).first();
  if (!before) return NextResponse.json({ ok: false, error: "Aircraft not found." }, { status: 404 });
  const after = permanent ? null : { ...before, is_published: 0 };
  const mutation = permanent
    ? db.prepare("DELETE FROM aircraft WHERE id = ?").bind(id)
    : db.prepare("UPDATE aircraft SET is_published = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(id);
  const results = await db.batch([
    mutation,
    contentRevisionStatement(db, "aircraft", id, before, after, authorization.email),
  ]);
  if (results.some((result) => !result.success)) {
    console.error("[admin] Could not delete aircraft and record its revision.", results);
    return NextResponse.json({ ok: false, error: "Could not delete aircraft." }, { status: 500 });
  }
  revalidatePath("/[locale]/fleet", "page");
  revalidatePath("/[locale]", "page");
  return NextResponse.json({ ok: true });
}
