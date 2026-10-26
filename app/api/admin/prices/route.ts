import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDatabase } from "@/lib/cloudflare";
import { isAdminResponse, requireAdmin } from "@/lib/admin-api";
import { contentRevisionStatement } from "@/lib/content-revisions";
import { majorToMinor } from "@/lib/money";

export const runtime = "nodejs";

const priceSchema = z.object({
  id: z.string().trim().regex(/^[a-z0-9-]{2,80}$/),
  kind: z.enum(["route", "hourly", "membership", "other"]),
  labelMn: z.string().trim().min(1).max(120),
  labelEn: z.string().trim().min(1).max(120),
  noteMn: z.string().trim().max(500),
  noteEn: z.string().trim().max(500),
  amount: z.string().trim().regex(/^\d{1,12}(?:\.\d{1,4})?$/),
  currency: z.string().trim().regex(/^[A-Z]{3}$/),
  unit: z.enum(["per_flight", "per_hour", "per_package"]),
  destinationId: z.string().trim().regex(/^[a-z0-9-]{2,80}$/).nullable(),
  aircraftId: z.string().trim().regex(/^[a-z0-9-]{2,80}$/).nullable(),
  isPublished: z.boolean(),
  orderIndex: z.number().int().min(0).max(10000),
});
const reorderSchema = z.object({
  action: z.literal("reorder"),
  items: z.array(z.object({
    id: z.string().trim().regex(/^[a-z0-9-]{2,80}$/),
    orderIndex: z.number().int().min(0).max(10000),
  })).min(1).max(100),
}).superRefine(({ items }, context) => {
  if (new Set(items.map((item) => item.id)).size !== items.length) {
    context.addIssue({ code: "custom", message: "Price ids must be unique." });
  }
  if (new Set(items.map((item) => item.orderIndex)).size !== items.length) {
    context.addIssue({ code: "custom", message: "Price order values must be unique." });
  }
});

type PriceRow = {
  id: string; kind: string; label_mn: string; label_en: string; note_mn: string; note_en: string;
  amount_minor: number; currency: string; unit: string; destination_id: string | null;
  aircraft_id: string | null; is_published: number; order_index: number; updated_at: string;
};

export async function GET(request: Request) {
  const authorization = await requireAdmin(request, ["content_editor"]);
  if (isAdminResponse(authorization)) return authorization;
  const db = await getDatabase();
  if (!db) return NextResponse.json({ ok: false, error: "D1 is unavailable." }, { status: 503 });
  const result = await db.prepare(
    `SELECT id, kind, label_mn, label_en, note_mn, note_en, amount_minor, currency, unit,
      destination_id, aircraft_id, is_published, order_index, updated_at
     FROM pricing_items ORDER BY order_index, label_en`,
  ).all<PriceRow>();
  if (!result.success) return NextResponse.json({ ok: false, error: "Could not load prices." }, { status: 500 });
  return NextResponse.json({
    ok: true,
    items: result.results.map((row) => ({
      id: row.id, kind: row.kind, labelMn: row.label_mn, labelEn: row.label_en,
      noteMn: row.note_mn, noteEn: row.note_en, amountMinor: row.amount_minor,
      currency: row.currency, unit: row.unit, destinationId: row.destination_id,
      aircraftId: row.aircraft_id, isPublished: row.is_published === 1,
      orderIndex: row.order_index, updatedAt: row.updated_at,
    })),
  });
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
  const reorder = reorderSchema.safeParse(raw);
  if (reorder.success) {
    const db = await getDatabase();
    if (!db) return NextResponse.json({ ok: false, error: "D1 is unavailable." }, { status: 503 });
    const items = reorder.data.items;
    const rows = await db.prepare(
      `SELECT * FROM pricing_items WHERE id IN (${items.map(() => "?").join(", ")})`,
    ).bind(...items.map((item) => item.id)).all<PriceRow>();
    if (!rows.success) return NextResponse.json({ ok: false, error: "Could not load prices." }, { status: 500 });
    if (rows.results.length !== items.length) return NextResponse.json({ ok: false, error: "One or more prices were not found." }, { status: 404 });
    const byId = new Map(items.map((item) => [item.id, item.orderIndex]));
    const statements = rows.results.flatMap((row) => {
      const orderIndex = byId.get(row.id);
      if (orderIndex === undefined || orderIndex === row.order_index) return [];
      const after = { ...row, order_index: orderIndex, updated_by: authorization.email };
      return [
        db.prepare(
          "UPDATE pricing_items SET order_index = ?, updated_at = CURRENT_TIMESTAMP, updated_by = ? WHERE id = ?",
        ).bind(orderIndex, authorization.email, row.id),
        contentRevisionStatement(db, "price", row.id, row, after, authorization.email),
      ];
    });
    if (statements.length > 0) {
      const results = await db.batch(statements);
      if (results.some((result) => !result.success)) {
        console.error("[admin] Could not reorder prices and record revisions.", results);
        return NextResponse.json({ ok: false, error: "Could not reorder prices." }, { status: 500 });
      }
    }
    revalidatePath("/[locale]", "page");
    revalidatePath("/[locale]/destinations", "page");
    return NextResponse.json({ ok: true });
  }
  const parsed = priceSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Check the price details and try again." }, { status: 400 });
  let amountMinor: number;
  try {
    amountMinor = majorToMinor(parsed.data.amount, parsed.data.currency);
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Invalid price amount." }, { status: 400 });
  }
  const db = await getDatabase();
  if (!db) return NextResponse.json({ ok: false, error: "D1 is unavailable." }, { status: 503 });
  const item = parsed.data;
  const previous = await db.prepare("SELECT * FROM pricing_items WHERE id = ?").bind(item.id).first();
  const current = {
    id: item.id,
    kind: item.kind,
    label_mn: item.labelMn,
    label_en: item.labelEn,
    note_mn: item.noteMn,
    note_en: item.noteEn,
    amount_minor: amountMinor,
    currency: item.currency,
    unit: item.unit,
    destination_id: item.destinationId,
    aircraft_id: item.aircraftId,
    is_published: item.isPublished ? 1 : 0,
    order_index: item.orderIndex,
    updated_by: authorization.email,
  };
  const results = await db.batch([
    db.prepare(
    `INSERT INTO pricing_items (
      id, kind, label_mn, label_en, note_mn, note_en, amount_minor, currency, unit,
      destination_id, aircraft_id, is_published, order_index, updated_at, updated_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
    ON CONFLICT(id) DO UPDATE SET kind = excluded.kind, label_mn = excluded.label_mn,
      label_en = excluded.label_en, note_mn = excluded.note_mn, note_en = excluded.note_en,
      amount_minor = excluded.amount_minor, currency = excluded.currency, unit = excluded.unit,
      destination_id = excluded.destination_id, aircraft_id = excluded.aircraft_id,
      is_published = excluded.is_published, order_index = excluded.order_index,
      updated_at = CURRENT_TIMESTAMP, updated_by = excluded.updated_by`,
    ).bind(
    item.id, item.kind, item.labelMn, item.labelEn, item.noteMn, item.noteEn, amountMinor,
    item.currency, item.unit, item.destinationId, item.aircraftId,
    item.isPublished ? 1 : 0, item.orderIndex, authorization.email,
    ),
    contentRevisionStatement(db, "price", item.id, previous, current, authorization.email),
  ]);
  if (results.some((result) => !result.success)) {
    console.error("[admin] Could not save price and its revision.", results);
    return NextResponse.json({ ok: false, error: "Could not save this price." }, { status: 500 });
  }
  revalidatePath("/[locale]", "page");
  revalidatePath("/[locale]/destinations", "page");
  return NextResponse.json({ ok: true, id: item.id, page: "/mn" });
}
