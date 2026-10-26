import { NextResponse } from "next/server";
import { getCloudflareEnv } from "@/lib/cloudflare";
import { isAdminResponse, requireAdmin } from "@/lib/admin-api";

export const runtime = "nodejs";

const mediaTypes: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const maxBytes = 10 * 1024 * 1024;
const uploadsPerHour = 12;
const uploadAttempts = new Map<string, number[]>();

export async function POST(request: Request) {
  const authorization = await requireAdmin(request, ["content_editor"]);
  if (isAdminResponse(authorization)) return authorization;
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > maxBytes + 1024 * 1024) {
    return NextResponse.json({ ok: false, error: "The upload is larger than 10 MB." }, { status: 413 });
  }
  const now = Date.now();
  const recent = (uploadAttempts.get(authorization.email) ?? []).filter((time) => now - time < 60 * 60 * 1000);
  if (recent.length >= uploadsPerHour) {
    return NextResponse.json({ ok: false, error: "Upload limit reached. Try again later." }, { status: 429 });
  }
  recent.push(now);
  uploadAttempts.set(authorization.email, recent);
  const env = await getCloudflareEnv();
  if (!env?.MEDIA) return NextResponse.json({ ok: false, error: "R2 media storage is unavailable." }, { status: 503 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid upload form." }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ ok: false, error: "Choose an image file." }, { status: 400 });
  const extension = mediaTypes[file.type];
  if (!extension) return NextResponse.json({ ok: false, error: "Use a JPEG, PNG, or WebP image." }, { status: 415 });
  if (file.size === 0 || file.size > maxBytes) {
    return NextResponse.json({ ok: false, error: "Images must be 10 MB or smaller." }, { status: 413 });
  }

  const body = await file.arrayBuffer();
  const bytes = new Uint8Array(body);
  const validSignature =
    (file.type === "image/jpeg" && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) ||
    (file.type === "image/png" && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) ||
    (file.type === "image/webp" &&
      String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...bytes.slice(8, 12)) === "WEBP");
  if (!validSignature) return NextResponse.json({ ok: false, error: "The file contents do not match the selected image type." }, { status: 415 });

  const key = `uploads/${crypto.randomUUID()}.${extension}`;
  try {
    await env.MEDIA.put(key, body, {
      httpMetadata: {
        contentType: file.type,
        cacheControl: "public, max-age=31536000, immutable",
        contentDisposition: "inline",
      },
    });
    return NextResponse.json({ ok: true, key, url: `/media/${key}` }, { headers: { "X-Content-Type-Options": "nosniff" } });
  } catch (error) {
    console.error("[admin] Could not store uploaded media.", error);
    return NextResponse.json({ ok: false, error: "Could not store the photo. Try again." }, { status: 503 });
  }
}
