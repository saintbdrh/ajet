import { NextResponse } from "next/server";
import { z } from "zod";
import { getDatabase } from "@/lib/db";
import { getCloudflareEnv } from "@/lib/cloudflare";

export const runtime = "nodejs";
const schema = z.object({
  id: z.string().uuid(), locale: z.enum(["mn", "en"]),
  name: z.string().trim().min(2).max(100), email: z.string().trim().email().max(160).transform((s) => s.toLowerCase()),
  phone: z.string().trim().max(30).regex(/^[\d+()\-\s]*$/), area: z.enum(["0", "1", "2", "3", "4"]),
  experience: z.string().trim().max(2000), consent: z.literal(true), website: z.literal(""), token: z.string().max(2048),
});
// Best-effort process throttle; Turnstile is required in production. Email cooldown is persisted below.
const hits = new Map<string, { since: number; count: number }>();
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) return NextResponse.json({ error: "origin" }, { status: 403 });
  const ip = request.headers.get("cf-connecting-ip") ?? "local";
  const now = Date.now();
  for (const [key, value] of hits) if (now - value.since > 600_000) hits.delete(key);
  if (!hits.has(ip) && hits.size >= 10_000) return NextResponse.json({ error: "busy" }, { status: 429 });
  const bucket = hits.get(ip) ?? { since: now, count: 0 }; bucket.count++; hits.set(ip, bucket);
  if (bucket.count > 5) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  if (Number(request.headers.get("content-length") ?? 0) > 12_000) return NextResponse.json({ error: "size" }, { status: 413 });
  let data: unknown;
  try { const text = await request.text(); if (text.length > 12_000) return NextResponse.json({ error: "size" }, { status: 413 }); data = JSON.parse(text); }
  catch { return NextResponse.json({ error: "invalid" }, { status: 400 }); }
  const parsed = schema.safeParse(data);
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  try {
    const env = await getCloudflareEnv();
    const secret = env?.TURNSTILE_SECRET_KEY ?? process.env.TURNSTILE_SECRET_KEY;
    if (process.env.NODE_ENV === "production" && !secret) return NextResponse.json({ error: "unavailable" }, { status: 503 });
    if (secret) {
      if (!parsed.data.token) return NextResponse.json({ error: "verification" }, { status: 400 });
      const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: new URLSearchParams({ secret, response: parsed.data.token }), signal: AbortSignal.timeout(5000) });
      const result = await response.json() as { success?: boolean; hostname?: string };
      if (!result.success || result.hostname !== new URL(request.url).hostname) return NextResponse.json({ error: "verification" }, { status: 400 });
    }
    const db = await getDatabase();
    if (!db) return NextResponse.json({ error: "unavailable" }, { status: 503 });
    const d = parsed.data;
    const status = await db.transaction(async (tx) => {
      // Serialize submissions from the same address across app instances.
      await tx.prepare("SELECT pg_advisory_xact_lock(hashtext(?))").bind(d.email).all();
      const existing = await tx.prepare("SELECT id FROM career_interests WHERE id = ?").bind(d.id).first();
      if (existing) return "saved";
      const recent = await tx.prepare("SELECT id FROM career_interests WHERE email = ? AND created_at > CURRENT_TIMESTAMP - INTERVAL '10 minutes' LIMIT 1").bind(d.email).first();
      if (recent) return "limited";
      await tx.prepare("INSERT INTO career_interests (id, locale, full_name, email, phone, area, experience) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(d.id, d.locale, d.name, d.email, d.phone, Number(d.area), d.experience).run();
      return "saved";
    });
    return status === "limited" ? NextResponse.json({ error: "rate_limited" }, { status: 429 }) : NextResponse.json({ ok: true }, { status: 201 });
  } catch { console.error("[careers] Registration unavailable."); return NextResponse.json({ error: "unavailable" }, { status: 503 }); }
}
