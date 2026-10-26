import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDatabase } from "@/lib/cloudflare";
import { isAdminResponse, requireAdmin } from "@/lib/admin-api";
import { defaultMediaSlots } from "@/lib/content";
import { contentRevisionStatement } from "@/lib/content-revisions";

export const runtime = "nodejs";

const photoSchema = z.object({
  key: z.string().regex(/^(hero|membership|corporate|journey-0[1-7])$/),
  imageKey: z.string().min(1).max(240).regex(/^(\/img\/[a-zA-Z0-9._-]+|uploads\/[a-f0-9-]+\.(jpg|png|webp))$/),
  focalX: z.number().int().min(0).max(100),
  focalY: z.number().int().min(0).max(100),
  altMn: z.string().trim().min(1).max(300),
  altEn: z.string().trim().min(1).max(300),
});

export async function GET(request: Request) {
  const authorization = await requireAdmin(request, ["content_editor"]);
  if (isAdminResponse(authorization)) return authorization;
  const db = await getDatabase();
  if (!db) return NextResponse.json({ ok: false, error: "D1 is unavailable." }, { status: 503 });
  const result = await db.prepare(
    "SELECT slot_key, image_key, focal_x, focal_y, alt_mn, alt_en, updated_at FROM media_slots ORDER BY slot_key",
  ).all();
  if (!result.success) return NextResponse.json({ ok: false, error: "Could not load section photos." }, { status: 500 });
  const items = await Promise.all(result.results.map(async (row) => {
    const revision = await db.prepare(
      "SELECT id, snapshot_json FROM content_revisions WHERE entity_type = 'photo' AND entity_id = ? ORDER BY id DESC LIMIT 1",
    ).bind(row.slot_key).first<{ id: number; snapshot_json: string }>();
    let previous: Record<string, unknown> | null = null;
    if (revision?.snapshot_json) {
      try {
        const before = JSON.parse(revision.snapshot_json).before;
        if (before) {
          previous = {
            key: before.slot_key,
            imageKey: before.image_key,
            focalX: before.focal_x,
            focalY: before.focal_y,
            alt: { mn: before.alt_mn, en: before.alt_en },
          };
        }
      } catch (error) {
        console.error(`[admin] Could not read photo history for ${row.slot_key}.`, error);
      }
    }
    return {
      key: row.slot_key,
      imageKey: row.image_key,
      focalX: row.focal_x,
      focalY: row.focal_y,
      altMn: row.alt_mn,
      altEn: row.alt_en,
      updatedAt: row.updated_at,
      previous,
      previousRevisionId: revision?.id ?? null,
    };
  }));
  return NextResponse.json({ ok: true, items });
}

export async function PUT(request: Request) {
  const authorization = await requireAdmin(request, ["content_editor"]);
  if (isAdminResponse(authorization)) return authorization;
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = photoSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Add both language descriptions and choose a valid photo." }, { status: 400 });
  const db = await getDatabase();
  if (!db) return NextResponse.json({ ok: false, error: "D1 is unavailable." }, { status: 503 });
  const item = parsed.data;
  const previous = await db.prepare(
    "SELECT slot_key, image_key, focal_x, focal_y, alt_mn, alt_en FROM media_slots WHERE slot_key = ?",
  ).bind(item.key).first();
  if (!previous) {
    const fallback = defaultMediaSlots.find((slot) => slot.key === item.key);
    if (!fallback) return NextResponse.json({ ok: false, error: "Photo section not found." }, { status: 404 });
  }
  const current = {
    slot_key: item.key,
    image_key: item.imageKey,
    focal_x: item.focalX,
    focal_y: item.focalY,
    alt_mn: item.altMn,
    alt_en: item.altEn,
  };
  const results = await db.batch([
    db.prepare(
    `INSERT INTO media_slots (slot_key, image_key, focal_x, focal_y, alt_mn, alt_en, updated_at, updated_by)
     VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
     ON CONFLICT(slot_key) DO UPDATE SET image_key = excluded.image_key,
       focal_x = excluded.focal_x, focal_y = excluded.focal_y, alt_mn = excluded.alt_mn,
       alt_en = excluded.alt_en, updated_at = CURRENT_TIMESTAMP, updated_by = excluded.updated_by`,
    ).bind(item.key, item.imageKey, item.focalX, item.focalY, item.altMn, item.altEn, authorization.email),
    contentRevisionStatement(db, "photo", item.key, previous, current, authorization.email),
  ]);
  if (results.some((result) => !result.success)) {
    console.error("[admin] Could not save photo and its revision.", results);
    return NextResponse.json({ ok: false, error: "Could not save this photo." }, { status: 500 });
  }
  revalidatePath("/[locale]", "page");
  revalidatePath("/[locale]/fleet", "page");
  revalidatePath("/[locale]/destinations", "page");
  return NextResponse.json({ ok: true, page: item.key.startsWith("journey") || ["hero", "membership", "corporate"].includes(item.key) ? "/mn" : "/mn" });
}
