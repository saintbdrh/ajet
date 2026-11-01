import { NextResponse } from "next/server";
import { getObject, getStorage } from "@/lib/storage";

export const runtime = "nodejs";

// Fallback proxy for uploaded media when NEXT_PUBLIC_MEDIA_BASE_URL is not set.
// In production, serve files straight from the bucket's public URL instead (no function time, CDN cached).
export async function GET(
  request: Request,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const { key: segments } = await params;
  const key = segments.join("/");
  if (
    !key.startsWith("uploads/") ||
    !segments.every((segment) => /^[a-zA-Z0-9._-]+$/.test(segment))
  ) {
    return new NextResponse(null, { status: 404 });
  }
  const storage = getStorage();
  if (!storage) return NextResponse.json({ ok: false, error: "Media storage is unavailable." }, { status: 503 });
  const range = request.headers.get("range")?.match(/^bytes=\d*-\d*$/)?.[0];
  let object: Awaited<ReturnType<typeof getObject>>;
  try {
    object = await getObject(storage, key, range);
  } catch (error) {
    if (error instanceof Error && (error.name === "NoSuchKey" || error.name === "NotFound")) return new NextResponse(null, { status: 404 });
    if (error instanceof Error && error.name === "InvalidRange") return new NextResponse(null, { status: 416 });
    throw error;
  }
  if (!object.Body) return new NextResponse(null, { status: 404 });

  const headers = new Headers({
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=31536000, immutable",
    "X-Content-Type-Options": "nosniff",
  });
  if (object.ContentType) headers.set("Content-Type", object.ContentType);
  if (object.ContentLength !== undefined) headers.set("Content-Length", String(object.ContentLength));
  if (object.ETag) headers.set("ETag", object.ETag);
  if (object.ContentRange) headers.set("Content-Range", object.ContentRange);
  return new NextResponse(object.Body.transformToWebStream(), { status: object.ContentRange ? 206 : 200, headers });
}
