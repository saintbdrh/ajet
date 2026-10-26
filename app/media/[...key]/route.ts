import { NextResponse } from "next/server";
import { getCloudflareEnv } from "@/lib/cloudflare";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
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
  const env = await getCloudflareEnv();
  if (!env?.MEDIA) return NextResponse.json({ ok: false, error: "Media storage is unavailable." }, { status: 503 });
  const object = await env.MEDIA.get(key);
  if (!object) return new NextResponse(null, { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("ETag", object.httpEtag);
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  headers.set("X-Content-Type-Options", "nosniff");
  return new NextResponse(object.body, { headers });
}
