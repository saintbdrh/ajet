import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDatabase } from "@/lib/cloudflare";
import { isAdminResponse, requireAdmin } from "@/lib/admin-api";
import { defaultMediaSlots } from "@/lib/content";

export const runtime = "nodejs";

const entityType = z.enum(["copy", "photo", "price", "aircraft", "destination"]);
const restoreSchema = z.object({
  action: z.literal("restore"),
  entityType,
  entityId: z.string().min(1).max(100),
  revisionId: z.number().int().positive(),
});

type RevisionRow = { id: number; entity_type: string; entity_id: string; snapshot_json: string; actor: string; created_at: string };
type Snapshot = { before: Record<string, unknown> | null; after: Record<string, unknown> | null };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function summary(type: string, snapshot: Snapshot, locale: "mn" | "en") {
  const before = snapshot.before ?? {};
  const after = snapshot.after ?? {};
  const changed = [...new Set([...Object.keys(before), ...Object.keys(after)])]
    .filter((key) => JSON.stringify(before[key] ?? null) !== JSON.stringify(after[key] ?? null));
  if (type === "copy") return locale === "mn" ? "Бичвэр өөрчилсөн" : "Text updated";
  const labels: Record<string, { mn: string; en: string }> = {
    amount_minor: { mn: "Үнэ", en: "Price" }, currency: { mn: "Мөнгөн тэмдэгт", en: "Currency" },
    is_published: { mn: "Сайтад харагдах эсэх", en: "Website visibility" },
    image_key: { mn: "Зураг", en: "Photo" }, imageKey: { mn: "Зураг", en: "Photo" },
    focal_x: { mn: "Зургийн байрлал", en: "Photo position" }, focal_y: { mn: "Зургийн байрлал", en: "Photo position" },
    alt_mn: { mn: "Монгол тайлбар", en: "Mongolian description" }, alt_en: { mn: "Англи тайлбар", en: "English description" },
    name: { mn: "Нэр", en: "Name" }, name_mn: { mn: "Монгол нэр", en: "Mongolian name" },
    name_en: { mn: "Англи нэр", en: "English name" }, seats: { mn: "Суудлын тоо", en: "Seats" },
    latitude: { mn: "Байршил", en: "Coordinates" }, longitude: { mn: "Байршил", en: "Coordinates" },
  };
  const names = [...new Set(changed.map((key) => labels[key]?.[locale] ?? (locale === "mn" ? "Мэдээлэл" : "Details")))];
  const noun = type === "photo" ? (locale === "mn" ? "Зураг" : "Photo")
    : type === "price" ? (locale === "mn" ? "Үнэ" : "Price")
      : type === "aircraft" ? (locale === "mn" ? "Нисдэг тэрэг" : "Aircraft")
        : (locale === "mn" ? "Чиглэл" : "Destination");
  return `${noun}: ${names.slice(0, 3).join(", ")}`;
}

function revalidateEntity(type: string) {
  revalidatePath("/[locale]", "page");
  if (type === "price" || type === "destination") revalidatePath("/[locale]/destinations", "page");
  if (type === "aircraft") revalidatePath("/[locale]/fleet", "page");
}

export async function GET(request: Request) {
  const authorization = await requireAdmin(request, ["content_editor"]);
  if (isAdminResponse(authorization)) return authorization;
  const url = new URL(request.url);
  const parsedType = entityType.safeParse(url.searchParams.get("type"));
  const id = url.searchParams.get("id");
  const locale = url.searchParams.get("locale") === "en" ? "en" : "mn";
  if (!parsedType.success || !id || id.length > 100) {
    return NextResponse.json({ ok: false, error: "Choose an item to view its history." }, { status: 400 });
  }
  const db = await getDatabase();
  if (!db) return NextResponse.json({ ok: false, error: "D1 is unavailable." }, { status: 503 });
  const result = await db.prepare(
    `SELECT id, entity_type, entity_id, snapshot_json, actor, created_at
     FROM content_revisions WHERE entity_type = ? AND entity_id = ?
     ORDER BY id DESC LIMIT 20`,
  ).bind(parsedType.data, id).all<RevisionRow>();
  if (!result.success) return NextResponse.json({ ok: false, error: "Could not load change history." }, { status: 500 });
  const items = result.results.map((row) => {
    let parsed: Snapshot = { before: null, after: null };
    try {
      const raw: unknown = JSON.parse(row.snapshot_json);
      if (isRecord(raw)) parsed = { before: isRecord(raw.before) ? raw.before : null, after: isRecord(raw.after) ? raw.after : null };
    } catch (error) {
      console.error(`[admin] Invalid change history revision ${row.id}.`, error);
    }
    return { id: row.id, actor: row.actor, createdAt: row.created_at, summary: summary(row.entity_type, parsed, locale) };
  });
  return NextResponse.json({ ok: true, items });
}

export async function POST(request: Request) {
  const authorization = await requireAdmin(request, ["content_editor"]);
  if (isAdminResponse(authorization)) return authorization;
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = restoreSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Choose a valid previous version." }, { status: 400 });
  const { entityType: type, entityId: id, revisionId } = parsed.data;
  if (
    (type === "copy" && !/^(mn|en):[A-Za-z0-9]+$/.test(id)) ||
    (type === "photo" && !/^(hero|membership|corporate|journey-0[1-7])$/.test(id)) ||
    (type !== "copy" && type !== "photo" && !/^[a-z0-9-]{2,80}$/.test(id))
  ) return NextResponse.json({ ok: false, error: "Choose a valid item." }, { status: 400 });

  const db = await getDatabase();
  if (!db) return NextResponse.json({ ok: false, error: "D1 is unavailable." }, { status: 503 });
  const revision = await db.prepare(
    "SELECT id, entity_type, entity_id, snapshot_json FROM content_revisions WHERE id = ?",
  ).bind(revisionId).first<Pick<RevisionRow, "id" | "entity_type" | "entity_id" | "snapshot_json">>();
  if (!revision || revision.entity_type !== type || revision.entity_id !== id) {
    return NextResponse.json({ ok: false, error: "This version is no longer available." }, { status: 404 });
  }
  let rawSnapshot: unknown;
  try {
    rawSnapshot = JSON.parse(revision.snapshot_json);
  } catch {
    return NextResponse.json({ ok: false, error: "This saved version is unreadable." }, { status: 500 });
  }
  if (!isRecord(rawSnapshot) || !(rawSnapshot.before === null || isRecord(rawSnapshot.before))) {
    return NextResponse.json({ ok: false, error: "This saved version cannot be restored." }, { status: 500 });
  }
  const restore = rawSnapshot.before as Record<string, unknown> | null;
  let before: unknown;
  let after: unknown;
  let statements: D1PreparedStatement[];

  if (type === "copy") {
    const [locale, key] = id.split(":");
    before = await db.prepare("SELECT value FROM site_copy WHERE locale = ? AND key = ?").bind(locale, key).first();
    const value = restore?.value;
    statements = [value === null || value === undefined
      ? db.prepare("DELETE FROM site_copy WHERE locale = ? AND key = ?").bind(locale, key)
      : db.prepare(
        `INSERT INTO site_copy (locale, key, value, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(locale, key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
      ).bind(locale, key, String(value))];
    after = value === null || value === undefined ? null : { value: String(value) };
  } else if (type === "photo") {
    before = await db.prepare("SELECT slot_key, image_key, focal_x, focal_y, alt_mn, alt_en FROM media_slots WHERE slot_key = ?").bind(id).first();
    const photo = restore ?? {
      slot_key: id,
      image_key: defaultMediaSlots.find((slot) => slot.key === id)?.imageKey ?? "/img/hero.jpg",
      focal_x: 50, focal_y: 50, alt_mn: "", alt_en: "",
    };
    statements = [db.prepare(
      `INSERT INTO media_slots (slot_key, image_key, focal_x, focal_y, alt_mn, alt_en, updated_at, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
       ON CONFLICT(slot_key) DO UPDATE SET image_key = excluded.image_key, focal_x = excluded.focal_x,
         focal_y = excluded.focal_y, alt_mn = excluded.alt_mn, alt_en = excluded.alt_en,
         updated_at = CURRENT_TIMESTAMP, updated_by = excluded.updated_by`,
    ).bind(id, photo.image_key, photo.focal_x, photo.focal_y, photo.alt_mn, photo.alt_en, authorization.email)];
    after = photo;
  } else if (type === "price") {
    before = await db.prepare("SELECT * FROM pricing_items WHERE id = ?").bind(id).first();
    if (restore === null) {
      statements = [db.prepare("UPDATE pricing_items SET is_published = 0, updated_at = CURRENT_TIMESTAMP, updated_by = ? WHERE id = ?").bind(authorization.email, id)];
      after = { ...(isRecord(before) ? before : {}), is_published: 0 };
    } else {
      statements = [db.prepare(
        `UPDATE pricing_items SET kind = ?, label_mn = ?, label_en = ?, note_mn = ?, note_en = ?,
          amount_minor = ?, currency = ?, unit = ?, destination_id = ?, aircraft_id = ?,
          is_published = ?, order_index = ?, updated_at = CURRENT_TIMESTAMP, updated_by = ? WHERE id = ?`,
      ).bind(restore.kind, restore.label_mn, restore.label_en, restore.note_mn, restore.note_en,
        restore.amount_minor, restore.currency, restore.unit, restore.destination_id, restore.aircraft_id,
        restore.is_published, restore.order_index, authorization.email, id)];
      after = restore;
    }
  } else if (type === "aircraft") {
    before = await db.prepare(
      `SELECT aircraft.*, display.focal_x, display.focal_y, display.alt_mn, display.alt_en
       FROM aircraft LEFT JOIN aircraft_display display ON display.aircraft_id = aircraft.id WHERE aircraft.id = ?`,
    ).bind(id).first();
    if (restore === null) {
      statements = [db.prepare("UPDATE aircraft SET is_published = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(id)];
      after = { ...(isRecord(before) ? before : {}), is_published: 0 };
    } else {
      statements = [db.prepare(
        `UPDATE aircraft SET name = ?, description_mn = ?, description_en = ?, seats = ?,
          range_km = ?, cruise_kmh = ?, payload_kg = ?, image_key = ?, specification_source = ?,
          specifications_verified = ?, order_index = ?, is_placeholder = ?, is_published = ?,
          updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      ).bind(restore.name, restore.description_mn, restore.description_en, restore.seats,
        restore.range_km, restore.cruise_kmh, restore.payload_kg, restore.image_key,
        restore.specification_source, restore.specifications_verified, restore.order_index,
        restore.is_placeholder, restore.is_published, id),
        db.prepare(
        `INSERT INTO aircraft_display (aircraft_id, focal_x, focal_y, alt_mn, alt_en) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(aircraft_id) DO UPDATE SET focal_x = excluded.focal_x, focal_y = excluded.focal_y,
           alt_mn = excluded.alt_mn, alt_en = excluded.alt_en`,
      ).bind(id, restore.focal_x ?? 50, restore.focal_y ?? 50, restore.alt_mn ?? restore.name, restore.alt_en ?? restore.name)];
      after = restore;
    }
  } else {
    before = await db.prepare(
      `SELECT destinations.*, display.focal_x, display.focal_y, display.alt_mn, display.alt_en
       FROM destinations LEFT JOIN destination_display display ON display.destination_id = destinations.id
       WHERE destinations.id = ?`,
    ).bind(id).first();
    if (restore === null) {
      statements = [db.prepare("UPDATE destinations SET is_published = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(id)];
      after = { ...(isRecord(before) ? before : {}), is_published: 0 };
    } else {
      statements = [db.prepare(
        `UPDATE destinations SET name_mn = ?, name_en = ?, description_mn = ?, description_en = ?,
          latitude = ?, longitude = ?, image_key = ?, coordinate_source = ?, coordinates_verified = ?,
          order_index = ?, is_placeholder = ?, is_published = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      ).bind(restore.name_mn, restore.name_en, restore.description_mn, restore.description_en,
        restore.latitude, restore.longitude, restore.image_key, restore.coordinate_source,
        restore.coordinates_verified, restore.order_index, restore.is_placeholder, restore.is_published, id),
        db.prepare(
        `INSERT INTO destination_display (destination_id, focal_x, focal_y, alt_mn, alt_en) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(destination_id) DO UPDATE SET focal_x = excluded.focal_x, focal_y = excluded.focal_y,
           alt_mn = excluded.alt_mn, alt_en = excluded.alt_en`,
      ).bind(id, restore.focal_x ?? 50, restore.focal_y ?? 50, restore.alt_mn ?? restore.name_mn, restore.alt_en ?? restore.name_en)];
      after = restore;
    }
  }

  const results = await db.batch([
    ...statements,
    db.prepare(
      "INSERT INTO content_revisions (entity_type, entity_id, snapshot_json, actor) VALUES (?, ?, ?, ?)",
    ).bind(type, id, JSON.stringify({ before, after }), authorization.email),
  ]);
  if (results.some((result) => !result.success)) {
    console.error("[admin] Could not restore content and record its revision.", results);
    return NextResponse.json({ ok: false, error: "Could not restore this version." }, { status: 500 });
  }
  revalidateEntity(type);
  return NextResponse.json({ ok: true });
}
