import { NextResponse } from "next/server";
import { z } from "zod";
import { getDatabase } from "@/lib/db";
import { isAdminResponse, requireAdmin } from "@/lib/admin-api";
import { contentRevisionStatement } from "@/lib/content-revisions";
import { usableMediaKind } from "@/lib/media-assets";
import { revalidatePath } from "next/cache";

export const runtime = "nodejs";

const destinationSchema = z.object({
  id: z.string().trim().regex(/^[a-z0-9-]{2,80}$/),
  nameMn: z.string().trim().min(2).max(100),
  nameEn: z.string().trim().min(2).max(100),
  descriptionMn: z.string().trim().max(2000),
  descriptionEn: z.string().trim().max(2000),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  imageKey: z.string().max(240).nullable(),
  focalX: z.number().int().min(0).max(100).default(50),
  focalY: z.number().int().min(0).max(100).default(50),
  altMn: z.string().trim().min(1).max(300),
  altEn: z.string().trim().min(1).max(300),
  coordinateSource: z.union([z.literal(""), z.string().url().max(500)]),
  coordinatesVerified: z.boolean(),
  orderIndex: z.number().int().min(0).max(10000),
  isPublished: z.boolean(),
}).superRefine((item, context) => {
  if (item.coordinatesVerified && !item.coordinateSource.startsWith("https://")) {
    context.addIssue({ code: "custom", path: ["coordinateSource"], message: "Verified coordinates require an HTTPS source." });
  }
});

type DestinationRow = {
  id: string; name_mn: string; name_en: string; description_mn: string;
  description_en: string; latitude: number; longitude: number; image_key: string | null;
  coordinate_source: string; coordinates_verified: number; order_index: number; is_published: number;
  focal_x: number; focal_y: number; alt_mn: string; alt_en: string;
};

export async function GET(request: Request) {
  const authorization = await requireAdmin(request, ["content_editor"]);
  if (isAdminResponse(authorization)) return authorization;
  const db = await getDatabase();
  if (!db) return NextResponse.json({ ok: false, error: "Database is unavailable." }, { status: 503 });
  const result = await db.prepare(
    `SELECT id, name_mn, name_en, description_mn, description_en, latitude,
      longitude, image_key, coordinate_source, coordinates_verified,
      COALESCE(display.focal_x, 50) AS focal_x, COALESCE(display.focal_y, 50) AS focal_y,
      COALESCE(display.alt_mn, name_mn) AS alt_mn, COALESCE(display.alt_en, name_en) AS alt_en,
      order_index, is_published
    FROM destinations LEFT JOIN destination_display display ON display.destination_id = destinations.id
    ORDER BY order_index, name_en`,
  ).all<DestinationRow>();
  if (!result.success) {
    console.error("[admin] Could not load destinations.", result.error);
    return NextResponse.json({ ok: false, error: "Could not load destinations." }, { status: 500 });
  }
  return NextResponse.json({
    ok: true,
    items: result.results.map((row) => ({
      id: row.id,
      nameMn: row.name_mn,
      nameEn: row.name_en,
      descriptionMn: row.description_mn,
      descriptionEn: row.description_en,
      latitude: row.latitude,
      longitude: row.longitude,
      imageKey: row.image_key,
      coordinateSource: row.coordinate_source,
      coordinatesVerified: row.coordinates_verified === 1,
      orderIndex: row.order_index,
      isPublished: row.is_published === 1,
      focalX: row.focal_x,
      focalY: row.focal_y,
      altMn: row.alt_mn || row.name_mn,
      altEn: row.alt_en || row.name_en,
    })),
  });
}

async function saveDestination(request: Request) {
  const authorization = await requireAdmin(request, ["content_editor"]);
  if (isAdminResponse(authorization)) return authorization;
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = destinationSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid destination details." }, { status: 400 });
  const db = await getDatabase();
  if (!db) return NextResponse.json({ ok: false, error: "Database is unavailable." }, { status: 503 });
  const item = parsed.data;
  if (item.imageKey !== null && await usableMediaKind(db, item.imageKey) !== "image") {
    return NextResponse.json({ ok: false, error: "Choose a photo that finished uploading." }, { status: 400 });
  }
  const previous = await db.prepare(
    `SELECT destinations.*, display.focal_x, display.focal_y, display.alt_mn, display.alt_en
     FROM destinations LEFT JOIN destination_display display ON display.destination_id = destinations.id
     WHERE destinations.id = ?`,
  ).bind(item.id).first();
  const after = {
    id: item.id,
    name_mn: item.nameMn,
    name_en: item.nameEn,
    description_mn: item.descriptionMn,
    description_en: item.descriptionEn,
    latitude: item.latitude,
    longitude: item.longitude,
    image_key: item.imageKey,
    coordinate_source: item.coordinateSource,
    coordinates_verified: item.coordinatesVerified ? 1 : 0,
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
    `INSERT INTO destinations (
      id, name_mn, name_en, description_mn, description_en, latitude, longitude,
      image_key, coordinate_source, coordinates_verified, order_index, is_placeholder, is_published, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET
      name_mn = excluded.name_mn, name_en = excluded.name_en,
      description_mn = excluded.description_mn, description_en = excluded.description_en,
      latitude = excluded.latitude, longitude = excluded.longitude,
      image_key = excluded.image_key, coordinate_source = excluded.coordinate_source,
      coordinates_verified = excluded.coordinates_verified, order_index = excluded.order_index,
      is_placeholder = 0, is_published = excluded.is_published,
      updated_at = CURRENT_TIMESTAMP`,
    ).bind(
    item.id, item.nameMn, item.nameEn, item.descriptionMn, item.descriptionEn,
    item.latitude, item.longitude, item.imageKey, item.coordinateSource,
    item.coordinatesVerified ? 1 : 0,
    item.orderIndex, item.isPublished ? 1 : 0,
    ),
    db.prepare(
    `INSERT INTO destination_display (destination_id, focal_x, focal_y, alt_mn, alt_en)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(destination_id) DO UPDATE SET focal_x = excluded.focal_x,
       focal_y = excluded.focal_y, alt_mn = excluded.alt_mn, alt_en = excluded.alt_en`,
    ).bind(item.id, item.focalX, item.focalY, item.altMn, item.altEn),
    contentRevisionStatement(db, "destination", item.id, previous, after, authorization.email),
  ]);
  if (results.some((result) => !result.success)) {
    console.error("[admin] Could not save destination and its revision.", results);
    return NextResponse.json({ ok: false, error: "Could not save destination." }, { status: 500 });
  }
  revalidatePath("/[locale]/destinations", "page");
  revalidatePath("/[locale]", "page");
  return NextResponse.json({ ok: true, id: item.id });
}

export const POST = saveDestination;
export const PUT = saveDestination;

export async function DELETE(request: Request) {
  const authorization = await requireAdmin(request, ["content_editor"]);
  if (isAdminResponse(authorization)) return authorization;
  const id = new URL(request.url).searchParams.get("id");
  if (!id || !/^[a-z0-9-]{2,80}$/.test(id)) {
    return NextResponse.json({ ok: false, error: "Invalid destination id." }, { status: 400 });
  }
  const db = await getDatabase();
  if (!db) return NextResponse.json({ ok: false, error: "Database is unavailable." }, { status: 503 });
  const permanent = new URL(request.url).searchParams.get("permanent") === "true";
  if (permanent && authorization.role !== "owner") {
    return NextResponse.json({ ok: false, error: "Only the owner can permanently remove destinations." }, { status: 403 });
  }
  const before = await db.prepare(
    `SELECT destinations.*, display.focal_x, display.focal_y, display.alt_mn, display.alt_en
     FROM destinations LEFT JOIN destination_display display ON display.destination_id = destinations.id
     WHERE destinations.id = ?`,
  ).bind(id).first();
  if (!before) return NextResponse.json({ ok: false, error: "Destination not found." }, { status: 404 });
  const after = permanent ? null : { ...before, is_published: 0 };
  const mutation = permanent
    ? db.prepare("DELETE FROM destinations WHERE id = ?").bind(id)
    : db.prepare("UPDATE destinations SET is_published = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(id);
  const results = await db.batch([
    mutation,
    contentRevisionStatement(db, "destination", id, before, after, authorization.email),
  ]);
  if (results.some((result) => !result.success)) {
    console.error("[admin] Could not delete destination and record its revision.", results);
    return NextResponse.json({ ok: false, error: "Could not delete destination." }, { status: 500 });
  }
  revalidatePath("/[locale]/destinations", "page");
  revalidatePath("/[locale]", "page");
  return NextResponse.json({ ok: true });
}
