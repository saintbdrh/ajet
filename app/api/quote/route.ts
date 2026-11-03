import { NextResponse } from "next/server";
import { z } from "zod";
import { extraIds, journeyCopy, serviceIds, serviceName } from "@/lib/journey";
import { getCloudflareEnv } from "@/lib/cloudflare";
import { getDatabase, type Database } from "@/lib/db";

export const runtime = "nodejs";

const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Ulaanbaatar" });
const schema = z.object({
  idempotencyKey: z.string().uuid(),
  locale: z.enum(["mn", "en"]),
  service: z.enum(serviceIds).default("charter"),
  extras: z.array(z.enum(extraIds)).max(3).default([]).transform((items) => [...new Set(items)].sort()),
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().regex(/^[0-9+()\-\s]{6,30}$/),
  email: z.union([z.literal(""), z.string().trim().email().max(120)]).optional(),
  org: z.string().trim().max(120).optional(),
  from: z.string().trim().min(2).max(120),
  to: z.string().trim().min(2).max(120),
  roundTrip: z.boolean().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value && value >= today();
  }),
  time: z.union([z.literal(""), z.string().regex(/^\d{2}:\d{2}$/)]).optional(),
  pax: z.coerce.number().int().min(1).max(500),
  notes: z.string().trim().max(1000).optional(),
  token: z.string().max(2048).optional(),
}).refine((data) => data.service !== "charter" || data.pax <= 20, { path: ["pax"], message: "Please discuss larger flight groups with operations." }).refine((data) => data.service !== "charter" || data.from.toLocaleLowerCase() !== data.to.toLocaleLowerCase(), {
  path: ["to"],
  message: "Departure and destination must be different.",
}).transform((data) => ({ ...data, extras: data.extras.filter((id) => id !== data.service), roundTrip: data.service === "charter" ? data.roundTrip : false }));

const hits = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((time) => now - time < 10 * 60_000);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 10_000) {
    for (const [key, times] of hits) {
      if (times.every((time) => now - time >= 10 * 60_000)) hits.delete(key);
    }
  }
  return recent.length > 5;
}

async function verifyTurnstile(token: string | undefined, ip: string, secret?: string): Promise<boolean | null> {
  if (!secret) return process.env.NODE_ENV === "production" ? null : true;
  if (!token) return false;
  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: new URLSearchParams({ secret, response: token, remoteip: ip }),
      signal: AbortSignal.timeout(5000),
    });
    return ((await response.json()) as { success?: boolean }).success === true;
  } catch {
    return false;
  }
}

async function sendTelegram(text: string, env: CloudflareEnv | null): Promise<boolean | null> {
  const token = env?.TELEGRAM_BOT_TOKEN ?? process.env.TELEGRAM_BOT_TOKEN;
  const chat = env?.TELEGRAM_CHAT_ID ?? process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return null;
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chat, text }),
      signal: AbortSignal.timeout(8000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function sendEmail(subject: string, text: string, to: string[], env: CloudflareEnv | null): Promise<boolean | null> {
  const key = env?.RESEND_API_KEY ?? process.env.RESEND_API_KEY;
  const from = env?.QUOTE_FROM_EMAIL ?? process.env.QUOTE_FROM_EMAIL;
  if (!key || !from || to.length === 0) return null;
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, text }),
      signal: AbortSignal.timeout(8000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function recordNotification(
  db: Database,
  quoteId: string,
  event: "request_received",
  channel: "telegram" | "email",
  succeeded: boolean,
) {
  const result = await db.prepare(
    "INSERT INTO quote_notification_attempts (quote_id, event, channel, succeeded) VALUES (?, ?, ?, ?)",
  ).bind(quoteId, event, channel, succeeded ? 1 : 0).run();
  if (!result.success) console.error(`[quote] Could not record ${channel} delivery attempt for ${quoteId}.`, result.error);
}

export async function POST(request: Request) {
  const ip = request.headers.get("cf-connecting-ip") ??
    (process.env.NODE_ENV === "development" ? request.headers.get("x-forwarded-for")?.split(",")[0].trim() : null) ??
    "unknown";
  if (limited(ip)) return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  if (Number(request.headers.get("content-length") ?? 0) > 16_384) {
    return NextResponse.json({ ok: false, error: "request_too_large" }, { status: 413 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }
  if (typeof raw === "object" && raw !== null && "website" in raw &&
    typeof raw.website === "string" && raw.website.length > 0) {
    return NextResponse.json({ ok: true, id: "Q-0" });
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  const env = await getCloudflareEnv();
  const captcha = await verifyTurnstile(
    parsed.data.token,
    ip,
    env?.TURNSTILE_SECRET_KEY ?? process.env.TURNSTILE_SECRET_KEY,
  );
  if (captcha === null) {
    console.error("[quote] Turnstile is required in production but is not configured.");
    return NextResponse.json({ ok: false, error: "protection_not_configured" }, { status: 503 });
  }
  if (!captcha) return NextResponse.json({ ok: false, error: "captcha" }, { status: 400 });

  const db = await getDatabase();
  if (!db) {
    console.error("[quote] Database is unavailable; refusing to accept an unpersisted request.");
    return NextResponse.json({ ok: false, error: "persistence_unavailable" }, { status: 503 });
  }

  const d = parsed.data;
  const serviceDescription = serviceName(d.locale, d.service);
  const extraDescription = d.extras.filter((id) => id !== d.service).map((id) => journeyCopy[d.locale][id]).join(", ");
  const combinedNote = [`Service: ${serviceDescription}`, extraDescription && `Additional services: ${extraDescription}`, d.notes ?? ""].filter(Boolean).join("\n");
  const requestHash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify({
      locale: d.locale, service: d.service, extras: d.extras, name: d.name, phone: d.phone, email: d.email ?? "", org: d.org ?? "",
      from: d.from, to: d.to, roundTrip: d.roundTrip ?? false, date: d.date,
      time: d.time ?? "", pax: d.pax, notes: d.notes ?? "",
    })),
  ).then((buffer) => Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, "0")).join(""));

  let quoteId: string;
  const existing = await db.prepare(
    "SELECT id, request_hash FROM quotes WHERE idempotency_key = ?",
  ).bind(d.idempotencyKey).first<{ id: string; request_hash: string | null }>();
  if (existing) {
    if (existing.request_hash !== requestHash) {
      return NextResponse.json({ ok: false, error: "idempotency_conflict" }, { status: 409 });
    }
    quoteId = existing.id;
  } else {
    quoteId = `Q-${d.date.replaceAll("-", "")}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const note = combinedNote;
    try {
      await db.batch([
        db.prepare(
          `INSERT INTO quotes (
            id, idempotency_key, request_hash, locale, name, phone, email, organization,
            origin, destination, round_trip, flight_date, flight_time, passengers, notes, service, extras
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?::jsonb)`,
        ).bind(
          quoteId, d.idempotencyKey, requestHash, d.locale, d.name, d.phone, d.email ?? "",
          d.org ?? "", d.from, d.to, d.roundTrip ? 1 : 0, d.date, d.time ?? "", d.pax, note, d.service, JSON.stringify(d.extras),
        ),
        db.prepare(
          "INSERT INTO quote_status_history (quote_id, from_status, to_status, actor, note) VALUES (?, NULL, 'requested', 'client', 'Request received.')",
        ).bind(quoteId),
      ]);
    } catch (error) {
      // A concurrent submit with the same idempotency key may have won the insert.
      const duplicate = await db.prepare(
        "SELECT id, request_hash FROM quotes WHERE idempotency_key = ?",
      ).bind(d.idempotencyKey).first<{ id: string; request_hash: string | null }>();
      if (!duplicate || duplicate.request_hash !== requestHash) {
        console.error("[quote] Could not persist flight request.", error);
        return NextResponse.json({ ok: false, error: "persistence_failed" }, { status: 503 });
      }
      quoteId = duplicate.id;
    }
  }

  const alreadyDelivered = await db.prepare(
    "SELECT channel FROM quote_notification_attempts WHERE quote_id = ? AND event = 'request_received' AND succeeded = 1",
  ).bind(quoteId).all<{ channel: "telegram" | "email" }>();
  const deliveredChannels = new Set(alreadyDelivered.results.map((row) => row.channel));
  const text = [
    `Service request ${quoteId}`, `Name: ${d.name}`, `Phone: ${d.phone}`, d.email && `Email: ${d.email}`,
    d.org && `Organization: ${d.org}`, `${d.service === "charter" ? "Route" : "Location / brief"}: ${d.from} -> ${d.to}${d.service === "charter" && d.roundTrip ? " (round trip)" : ""}`,
    `Date: ${d.date}${d.time ? ` ${d.time}` : ""}`, `${d.service === "charter" ? "Passengers" : "Guests / participants"}: ${d.pax}`, `Notes: ${combinedNote}`,
    `Language: ${d.locale}`,
  ].filter(Boolean).join("\n");

  const attempts: Array<Promise<void>> = [];
  let configured = false;
  let delivered = deliveredChannels.size > 0;
  if (!deliveredChannels.has("telegram")) {
    const telegramConfigured = Boolean(
      (env?.TELEGRAM_BOT_TOKEN ?? process.env.TELEGRAM_BOT_TOKEN) &&
      (env?.TELEGRAM_CHAT_ID ?? process.env.TELEGRAM_CHAT_ID),
    );
    configured ||= telegramConfigured;
    if (telegramConfigured) {
      const result = await sendTelegram(text, env);
      delivered ||= result === true;
      attempts.push(recordNotification(db, quoteId, "request_received", "telegram", result === true));
    }
  }
  if (!deliveredChannels.has("email")) {
    const recipients = (env?.QUOTE_TO_EMAIL ?? process.env.QUOTE_TO_EMAIL ?? "")
      .split(",").map((recipient: string) => recipient.trim()).filter(Boolean);
    const mailConfigured = Boolean(
      (env?.RESEND_API_KEY ?? process.env.RESEND_API_KEY) &&
      (env?.QUOTE_FROM_EMAIL ?? process.env.QUOTE_FROM_EMAIL) && recipients.length > 0,
    );
    configured ||= mailConfigured;
    if (mailConfigured) {
      const result = await sendEmail(
        `Service request ${quoteId}`,
        text,
        recipients,
        env,
      );
      delivered ||= result === true;
      attempts.push(recordNotification(db, quoteId, "request_received", "email", result === true));
    }
  }
  await Promise.all(attempts);

  if (!configured && !delivered) {
    console.error(`[quote] ${quoteId} is stored, but no dispatcher notification channel is configured.`);
    return NextResponse.json({ ok: false, id: quoteId, error: "notification_not_configured" }, { status: 503 });
  }
  if (!delivered) {
    console.error(`[quote] ${quoteId} is stored, but every configured notification channel failed.`);
    return NextResponse.json({ ok: false, id: quoteId, error: "notification_failed" }, { status: 503 });
  }
  return NextResponse.json({ ok: true, id: quoteId });
}
