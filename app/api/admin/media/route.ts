import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminResponse, requireAdmin } from "@/lib/admin-api";
import { getDatabase } from "@/lib/db";
import { MAX_VIDEO_SECONDS, MEDIA_TYPES, matchesSignature, mediaUrl } from "@/lib/media";
import { createUploadUrl, deleteObject, getStorage, readObjectStart, statObject } from "@/lib/storage";

export const runtime = "nodejs";

// Two-step upload: "start" returns a presigned URL the browser PUTs the file to; "complete" verifies the stored object.
const startSchema = z.object({
  action: z.literal("start"),
  contentType: z.string(),
  size: z.number().int().positive(),
  width: z.number().int().positive().max(20000).nullable().default(null),
  height: z.number().int().positive().max(20000).nullable().default(null),
  durationMs: z.number().int().positive().nullable().default(null),
});
const completeSchema = z.object({ action: z.literal("complete"), id: z.string().uuid() });
const bodySchema = z.discriminatedUnion("action", [startSchema, completeSchema]);

const uploadsPerHour = 30;
const uploadAttempts = new Map<string, number[]>();

export async function POST(request: Request) {
  const authorization = await requireAdmin(request, ["content_editor"]);
  if (isAdminResponse(authorization)) return authorization;
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid upload request." }, { status: 400 });
  const db = await getDatabase();
  const storage = getStorage();
  if (!db || !storage) return NextResponse.json({ ok: false, error: "Media storage is unavailable." }, { status: 503 });

  if (parsed.data.action === "start") {
    const item = parsed.data;
    const type = MEDIA_TYPES[item.contentType];
    if (!type) return NextResponse.json({ ok: false, error: "Use a JPEG, PNG, WebP, MP4, or WebM file." }, { status: 415 });
    if (item.size > type.maxBytes) {
      return NextResponse.json({ ok: false, error: `Files of this type must be ${type.maxBytes / 1024 / 1024} MB or smaller.` }, { status: 413 });
    }
    if (type.kind === "video" && (item.durationMs === null || item.durationMs > MAX_VIDEO_SECONDS * 1000)) {
      return NextResponse.json({ ok: false, error: `Videos must be ${MAX_VIDEO_SECONDS} seconds or shorter.` }, { status: 400 });
    }
    // Best-effort, per server instance. Add an edge rate limit in production.
    const now = Date.now();
    const recent = (uploadAttempts.get(authorization.email) ?? []).filter((time) => now - time < 60 * 60 * 1000);
    if (recent.length >= uploadsPerHour) {
      return NextResponse.json({ ok: false, error: "Upload limit reached. Try again later." }, { status: 429 });
    }
    recent.push(now);
    uploadAttempts.set(authorization.email, recent);

    const id = crypto.randomUUID();
    const key = `uploads/${id}.${type.extension}`;
    await db.prepare(
      `INSERT INTO media_assets (id, key, kind, mime, size_bytes, width, height, duration_ms, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(id, key, type.kind, item.contentType, item.size, item.width, item.height, type.kind === "video" ? item.durationMs : null, authorization.email).run();
    const upload = await createUploadUrl(storage, key, item.contentType);
    return NextResponse.json({ ok: true, id, key, uploadUrl: upload.url, uploadHeaders: upload.headers });
  }

  const asset = await db.prepare(
    "SELECT id, key, kind, mime, size_bytes, status FROM media_assets WHERE id = ?",
  ).bind(parsed.data.id).first<{ id: string; key: string; kind: string; mime: string; size_bytes: number; status: string }>();
  if (!asset) return NextResponse.json({ ok: false, error: "Upload not found." }, { status: 404 });
  if (asset.status === "ready") {
    return NextResponse.json({ ok: true, key: asset.key, kind: asset.kind, url: mediaUrl(asset.key) });
  }
  const reject = async (status: number, error: string) => {
    await deleteObject(storage, asset.key).catch((cause) => console.error(`[admin] Could not delete rejected upload ${asset.key}.`, cause));
    await db.prepare("DELETE FROM media_assets WHERE id = ?").bind(asset.id).run();
    return NextResponse.json({ ok: false, error }, { status });
  };
  try {
    const stored = await statObject(storage, asset.key);
    if (!stored) return NextResponse.json({ ok: false, error: "The file has not finished uploading." }, { status: 409 });
    if (stored.size !== asset.size_bytes || stored.contentType !== asset.mime) {
      return reject(400, "The uploaded file does not match the requested upload.");
    }
    if (!matchesSignature(asset.mime, await readObjectStart(storage, asset.key))) {
      return reject(415, "The file contents do not match the selected file type.");
    }
  } catch (error) {
    console.error(`[admin] Could not verify upload ${asset.key}.`, error);
    return NextResponse.json({ ok: false, error: "Could not verify the upload. Try again." }, { status: 503 });
  }
  await db.prepare("UPDATE media_assets SET status = 'ready' WHERE id = ?").bind(asset.id).run();
  return NextResponse.json({ ok: true, key: asset.key, kind: asset.kind, url: mediaUrl(asset.key) });
}
