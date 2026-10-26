import { NextResponse } from "next/server";
import { z } from "zod";
import { isCmsCopyKey, isLocale } from "@/lib/i18n";
import { getDatabase } from "@/lib/cloudflare";
import { isAdminResponse, requireAdmin } from "@/lib/admin-api";
import { revalidatePath } from "next/cache";

export const runtime = "nodejs";

const updateSchema = z.object({
  locale: z.enum(["mn", "en"]),
  values: z.record(z.string(), z.string().max(2000).nullable()),
});

export async function GET(request: Request) {
  const authorization = await requireAdmin(request, ["content_editor"]);
  if (isAdminResponse(authorization)) return authorization;
  const db = await getDatabase();
  if (!db) return NextResponse.json({ ok: false, error: "D1 is unavailable." }, { status: 503 });

  const result = await db.prepare(
    "SELECT locale, key, value FROM site_copy ORDER BY locale, key",
  ).all<{ locale: string; key: string; value: string }>();
  if (!result.success) {
    console.error("[admin] Could not load site copy.", result.error);
    return NextResponse.json({ ok: false, error: "Could not load site copy." }, { status: 500 });
  }
  const values: Record<"mn" | "en", Record<string, string>> = { mn: {}, en: {} };
  for (const row of result.results) {
    if (isLocale(row.locale) && isCmsCopyKey(row.key)) {
      values[row.locale][row.key] = row.value;
    }
  }
  return NextResponse.json({ ok: true, values });
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
  const parsed = updateSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid content data." }, { status: 400 });
  const { locale, values } = parsed.data;
  const entries = Object.entries(values);
  if (entries.length === 0 || entries.some(([key]) => !isCmsCopyKey(key))) {
    return NextResponse.json({ ok: false, error: "Unsupported content field." }, { status: 400 });
  }

  const db = await getDatabase();
  if (!db) return NextResponse.json({ ok: false, error: "D1 is unavailable." }, { status: 503 });
  const existing = await db.prepare("SELECT key, value FROM site_copy WHERE locale = ?").bind(locale)
    .all<{ key: string; value: string }>();
  if (!existing.success) return NextResponse.json({ ok: false, error: "Could not read current website copy." }, { status: 500 });
  const current = new Map(existing.results.map((row) => [row.key, row.value]));
  const changes = entries.filter(([key, value]) => (current.get(key) ?? null) !== value);
  if (changes.length === 0) return NextResponse.json({ ok: true, changed: 0, page: "/mn" });
  const statements = changes.flatMap(([key, value]) => {
    const revision = JSON.stringify({ before: { value: current.get(key) ?? null }, after: { value } });
    const save = value === null
      ? db.prepare("DELETE FROM site_copy WHERE locale = ? AND key = ?").bind(locale, key)
      : db.prepare(
        `INSERT INTO site_copy (locale, key, value, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(locale, key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
      ).bind(locale, key, value);
    return [
      save,
      db.prepare(
        "INSERT INTO content_revisions (entity_type, entity_id, snapshot_json, actor) VALUES ('copy', ?, ?, ?)",
      ).bind(`${locale}:${key}`, revision, authorization.email),
    ];
  });
  const results = await db.batch(statements);
  if (results.some((result) => !result.success)) {
    console.error("[admin] Could not save site copy.", results);
    return NextResponse.json({ ok: false, error: "Could not save site copy." }, { status: 500 });
  }
  revalidatePath("/[locale]", "layout");
  revalidatePath("/[locale]/destinations", "page");
  revalidatePath("/[locale]/fleet", "page");
  return NextResponse.json({ ok: true, changed: changes.length, page: "/mn" });
}
