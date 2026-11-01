import { NextResponse } from "next/server";
import { z } from "zod";
import { getCloudflareEnv } from "@/lib/cloudflare";
import { getDatabase, type Database } from "@/lib/db";
import { isAdminResponse, requireAdmin } from "@/lib/admin-api";
import { currencyFractionDigits, majorToMinor } from "@/lib/money";
import { notifyClient, notifyOperations, recordNotificationOutcomes } from "@/lib/notifications";

export const runtime = "nodejs";

const privateHeaders = { "Cache-Control": "private, no-store, max-age=0" };

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("review"), id: z.string().trim().min(5).max(60), note: z.string().trim().max(500).default("") }),
  z.object({ action: z.literal("close"), id: z.string().trim().min(5).max(60), note: z.string().trim().max(500).default("") }),
  z.object({
    action: z.literal("confirm"),
    id: z.string().trim().min(5).max(60),
    aircraftId: z.string().trim().regex(/^[a-z0-9-]{2,80}$/),
    operationalApproval: z.literal(true),
    note: z.string().trim().min(10).max(500),
  }),
]);

const quoteSchema = z.object({
  id: z.string().trim().min(5).max(60),
  amount: z.string().trim().regex(/^\d{1,12}(?:\.\d{1,4})?$/),
  currency: z.string().trim().regex(/^[A-Z]{3}$/),
  terms: z.string().trim().min(4).max(3000),
  expiresAt: z.string().datetime({ offset: true }),
});

type QuoteRow = {
  id: string; locale: string; name: string; phone: string; email: string;
  organization: string; origin: string; destination: string; round_trip: number;
  flight_date: string; flight_time: string; passengers: number; notes: string;
  status: string; assigned_aircraft_id: string | null; operational_approved_by: string | null;
  operational_approved_at: string | null; created_at: string; updated_at: string;
};

type PublishedPriceRow = {
  id: string; label_mn: string; label_en: string; amount_minor: number; currency: string;
  destination_id: string | null; destination_mn: string | null; destination_en: string | null;
};

async function writeAudit(db: Database, actor: string, action: string, entityId: string, detail: string) {
  const result = await db.prepare(
    "INSERT INTO admin_audit_log (actor, action, entity, entity_id, detail) VALUES (?, ?, 'quote', ?, ?)",
  ).bind(actor, action, entityId, detail).run();
  if (!result.success) console.error("[admin] Could not record quote audit event.", result.error);
}

export async function GET(request: Request) {
  const authorization = await requireAdmin(request, ["dispatcher"]);
  if (isAdminResponse(authorization)) return authorization;
  const db = await getDatabase();
  if (!db) return NextResponse.json({ ok: false, error: "Database is unavailable." }, { status: 503, headers: privateHeaders });
  const expiring = await db.prepare(
    `SELECT q.id FROM quotes q
     JOIN quote_revisions r ON r.quote_id = q.id
     WHERE q.status = 'quoted' AND r.status = 'sent'
       AND r.revision = (SELECT MAX(latest.revision) FROM quote_revisions latest WHERE latest.quote_id = q.id)
       AND r.expires_at <= CURRENT_TIMESTAMP`,
  ).all<{ id: string }>();
  for (const expired of expiring.results) {
    try {
      await db.transaction(async (tx) => {
        const quote = await tx.prepare(
          `UPDATE quotes SET status = 'expired', updated_at = CURRENT_TIMESTAMP
           WHERE id = ? AND status = 'quoted'`,
        ).bind(expired.id).run();
        if (quote.meta.changes !== 1) return;
        const revision = await tx.prepare(
          `UPDATE quote_revisions SET status = 'expired'
           WHERE quote_id = ? AND status = 'sent' AND expires_at <= CURRENT_TIMESTAMP`,
        ).bind(expired.id).run();
        if (revision.meta.changes !== 1) return;
        await tx.prepare(
          `INSERT INTO quote_status_history (quote_id, from_status, to_status, actor, note)
           VALUES (?, 'quoted', 'expired', 'system', 'Quote expired.')`,
        ).bind(expired.id).run();
      });
    } catch (error) {
      console.error(`[admin] Could not record expiry for quote ${expired.id}.`, error);
      return NextResponse.json({ ok: false, error: "Could not update expired quotes." }, { status: 500, headers: privateHeaders });
    }
  }
  const [quotes, revisions, history, aircraft, publishedPrices] = await Promise.all([
    db.prepare(
      `SELECT id, locale, name, phone, email, organization, origin, destination,
        round_trip, flight_date, flight_time, passengers, notes, status,
        assigned_aircraft_id, operational_approved_by, operational_approved_at,
        created_at, updated_at
      FROM quotes ORDER BY created_at DESC LIMIT 250`,
    ).all<QuoteRow>(),
    db.prepare(
      `SELECT id, quote_id, revision, amount_minor, currency, terms, expires_at, status, sent_at, responded_at
       FROM quote_revisions ORDER BY quote_id, revision DESC LIMIT 1000`,
    ).all(),
    db.prepare(
      `SELECT id, quote_id, from_status, to_status, actor, note, created_at
       FROM quote_status_history ORDER BY id DESC LIMIT 1500`,
    ).all(),
    db.prepare(
      "SELECT id, name, seats FROM aircraft WHERE is_published = 1 AND is_placeholder = 0 AND specifications_verified = 1 ORDER BY order_index, name",
    ).all<{ id: string; name: string; seats: number | null }>(),
    db.prepare(
      `SELECT p.id, p.label_mn, p.label_en, p.amount_minor, p.currency, p.destination_id,
        d.name_mn AS destination_mn, d.name_en AS destination_en
       FROM pricing_items p LEFT JOIN destinations d ON d.id = p.destination_id
       WHERE p.is_published = 1 ORDER BY p.order_index, p.label_en`,
    ).all<PublishedPriceRow>(),
  ]);
  if ([quotes, revisions, history, aircraft, publishedPrices].some((result) => !result.success)) {
    console.error("[admin] Could not load quote workflow data.");
    return NextResponse.json({ ok: false, error: "Could not load quote requests." }, { status: 500, headers: privateHeaders });
  }
  return NextResponse.json({
    ok: true,
    items: quotes.results,
    revisions: revisions.results,
    history: history.results,
    aircraft: aircraft.results,
    publishedPrices: publishedPrices.results,
  }, { headers: privateHeaders });
}

export async function POST(request: Request) {
  const authorization = await requireAdmin(request, ["dispatcher"]);
  if (isAdminResponse(authorization)) return authorization;
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = quoteSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid quote details." }, { status: 400 });

  const env = await getCloudflareEnv();
  const key = env?.RESEND_API_KEY ?? process.env.RESEND_API_KEY;
  const from = env?.QUOTE_FROM_EMAIL ?? process.env.QUOTE_FROM_EMAIL;
  const publicSiteUrl = env?.PUBLIC_SITE_URL ?? process.env.PUBLIC_SITE_URL;
  const db = await getDatabase();
  if (!db) return NextResponse.json({ ok: false, error: "Database is unavailable." }, { status: 503 });
  if (!key || !from || !publicSiteUrl) {
    return NextResponse.json({ ok: false, error: "Quote email and PUBLIC_SITE_URL must be configured." }, { status: 503 });
  }
  let baseUrl: URL;
  try {
    baseUrl = new URL(publicSiteUrl);
  } catch {
    return NextResponse.json({ ok: false, error: "PUBLIC_SITE_URL is invalid." }, { status: 503 });
  }
  if (process.env.NODE_ENV === "production" && baseUrl.protocol !== "https:") {
    return NextResponse.json({ ok: false, error: "PUBLIC_SITE_URL must use HTTPS in production." }, { status: 503 });
  }

  const data = parsed.data;
  const expiresAt = new Date(data.expiresAt);
  if (expiresAt <= new Date()) {
    return NextResponse.json({ ok: false, error: "The quote expiry must be in the future." }, { status: 400 });
  }
  const quote = await db.prepare(
    "SELECT id, locale, name, email, origin, destination, round_trip, flight_date, flight_time, passengers, status FROM quotes WHERE id = ?",
  ).bind(data.id).first<{
    id: string; locale: "mn" | "en"; name: string; email: string; origin: string; destination: string;
    round_trip: number; flight_date: string; flight_time: string; passengers: number; status: string;
  }>();
  if (!quote) return NextResponse.json({ ok: false, error: "Quote request not found." }, { status: 404 });
  if (!quote.email) return NextResponse.json({ ok: false, error: "This client did not provide an email address." }, { status: 400 });
  if (!["in_review", "quoted"].includes(quote.status)) {
    return NextResponse.json({ ok: false, error: "This request can no longer receive a quote." }, { status: 409 });
  }

  let digits: number;
  try {
    digits = currencyFractionDigits(data.currency);
  } catch {
    return NextResponse.json({ ok: false, error: "Use a valid ISO 4217 currency code." }, { status: 400 });
  }
  let amountMinor: number;
  try {
    amountMinor = majorToMinor(data.amount, data.currency);
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Invalid quote amount." }, { status: 400 });
  }
  if (!Number.isSafeInteger(amountMinor) || amountMinor < 1) {
    return NextResponse.json({ ok: false, error: "Quote amount is outside the supported range." }, { status: 400 });
  }
  const previous = await db.prepare(
    "SELECT COALESCE(MAX(revision), 0) AS revision FROM quote_revisions WHERE quote_id = ?",
  ).bind(data.id).first<{ revision: number }>();
  const revision = (previous?.revision ?? 0) + 1;
  const revisionId = crypto.randomUUID();
  const token = crypto.randomUUID() + crypto.randomUUID();
  const tokenHash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token))
    .then((buffer) => Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, "0")).join(""));
  const inserted = await db.prepare(
    `INSERT INTO quote_revisions (
      id, quote_id, revision, amount_minor, currency, terms, expires_at,
      approval_token_hash, status, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?)`,
  ).bind(revisionId, data.id, revision, amountMinor, data.currency, data.terms, expiresAt.toISOString(), tokenHash, authorization.email).run();
  if (!inserted.success) {
    console.error("[admin] Could not save quote revision.", inserted.error);
    return NextResponse.json({ ok: false, error: "Could not save quote revision." }, { status: 500 });
  }

  const decisionUrl = new URL(`/${quote.locale}/quote/response`, baseUrl);
  decisionUrl.hash = token;
  const amount = new Intl.NumberFormat(quote.locale === "mn" ? "mn-MN" : "en-US", {
    style: "currency",
    currency: data.currency,
  }).format(amountMinor / (10 ** digits));
  const message = quote.locale === "mn"
    ? `Сайн байна уу, ${quote.name}.\n\n${quote.origin} → ${quote.destination}${quote.round_trip ? " (буцах нислэгтэй)" : ""}\nОгноо: ${quote.flight_date}${quote.flight_time ? ` · ${quote.flight_time}` : ""}\nЗорчигч: ${quote.passengers}\nҮнийн санал: ${amount}\nХүчинтэй хугацаа: ${expiresAt.toISOString()}\n\nНөхцөл: ${data.terms}\n\nҮнийн саналыг зөвшөөрөх эсвэл татгалзах: ${decisionUrl}`
    : `Hello ${quote.name},\n\n${quote.origin} → ${quote.destination}${quote.round_trip ? " (return)" : ""}\nDate: ${quote.flight_date}${quote.flight_time ? ` · ${quote.flight_time}` : ""}\nPassengers: ${quote.passengers}\nQuote: ${amount}\nValid until: ${expiresAt.toISOString()}\n\nTerms: ${data.terms}\n\nReview this quote and approve or decline: ${decisionUrl}\n\nClient approval does not confirm the flight; operations must still approve aircraft, crew and conditions.`;
  let sent = false;
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [quote.email],
        subject: quote.locale === "mn" ? `Нислэгийн үнийн санал ${quote.id} · R${revision}` : `Flight quote ${quote.id} · R${revision}`,
        text: message,
      }),
      signal: AbortSignal.timeout(8000),
    });
    sent = response.ok;
    if (!sent) console.error(`[admin] Quote email provider rejected revision ${revisionId}.`, response.status);
  } catch (error) {
    console.error(`[admin] Could not deliver quote revision ${revisionId}.`, error);
  }
  const notification = await db.prepare(
    "INSERT INTO quote_notification_attempts (quote_id, event, channel, succeeded) VALUES (?, 'quote_sent', 'email', ?)",
  ).bind(data.id, sent ? 1 : 0).run();
  if (!notification.success) console.error(`[admin] Could not record quote email attempt ${revisionId}.`, notification.error);
  if (!sent) {
    return NextResponse.json({ ok: false, error: "Quote was saved as a draft, but email delivery failed." }, { status: 502 });
  }

  let finalized = false;
  try {
    finalized = await db.transaction(async (tx) => {
      await tx.prepare("UPDATE quote_revisions SET status = 'superseded' WHERE quote_id = ? AND status = 'sent'").bind(data.id).run();
      await tx.prepare("UPDATE quote_revisions SET status = 'sent', sent_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'draft'").bind(revisionId).run();
      const updated = await tx.prepare("UPDATE quotes SET status = 'quoted', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status IN ('requested', 'in_review', 'quoted')").bind(data.id).run();
      if (updated.meta.changes === 0) return false;
      await tx.prepare(
        "INSERT INTO quote_status_history (quote_id, from_status, to_status, actor, note) VALUES (?, ?, 'quoted', ?, ?)",
      ).bind(data.id, quote.status, authorization.email, `Quote revision ${revision} delivered by email.`).run();
      await tx.prepare(
        "INSERT INTO admin_audit_log (actor, action, entity, entity_id, detail) VALUES (?, 'quote_sent', 'quote', ?, ?)",
      ).bind(authorization.email, data.id, `revision=${revision}`).run();
      return true;
    });
  } catch (error) {
    console.error(`[admin] Could not finalize quote revision ${revisionId}.`, error);
  }
  if (!finalized) {
    console.error(`[admin] Email was sent but quote revision ${revisionId} could not be finalized.`);
    return NextResponse.json({ ok: false, error: "Email was sent, but the request changed before it could be finalized. Contact operations before retrying." }, { status: 503 });
  }
  return NextResponse.json({ ok: true, revision });
}

export async function PATCH(request: Request) {
  const authorization = await requireAdmin(request, ["dispatcher"]);
  if (isAdminResponse(authorization)) return authorization;
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = actionSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid quote workflow action." }, { status: 400 });
  const db = await getDatabase();
  if (!db) return NextResponse.json({ ok: false, error: "Database is unavailable." }, { status: 503 });
  const action = parsed.data;
  const quote = await db.prepare(
    "SELECT id, status, passengers, locale, name, email, origin, destination, round_trip, flight_date, flight_time FROM quotes WHERE id = ?",
  ).bind(action.id).first<{
    id: string; status: string; passengers: number; locale: "mn" | "en"; name: string; email: string;
    origin: string; destination: string; round_trip: number; flight_date: string; flight_time: string;
  }>();
  if (!quote) return NextResponse.json({ ok: false, error: "Quote request not found." }, { status: 404 });

  let nextStatus: string;
  let assignedAircraftId: string | null = null;
  if (action.action === "review") {
    if (quote.status !== "requested") return NextResponse.json({ ok: false, error: "Only newly received requests can enter review." }, { status: 409 });
    nextStatus = "in_review";
  } else if (action.action === "confirm") {
    if (quote.status !== "approved") return NextResponse.json({ ok: false, error: "Only a client-approved quote can be confirmed." }, { status: 409 });
    const aircraft = await db.prepare(
      "SELECT id FROM aircraft WHERE id = ? AND is_published = 1 AND is_placeholder = 0 AND specifications_verified = 1 AND seats >= ?",
    ).bind(action.aircraftId, quote.passengers).first<{ id: string }>();
    if (!aircraft) {
      return NextResponse.json({ ok: false, error: "Select an aircraft with verified specifications and sufficient seats." }, { status: 400 });
    }
    nextStatus = "confirmed";
    assignedAircraftId = action.aircraftId;
  } else {
    if (quote.status === "confirmed") return NextResponse.json({ ok: false, error: "A confirmed flight cannot be closed here." }, { status: 409 });
    nextStatus = "closed";
  }
  const note = action.note || (action.action === "review" ? "Dispatcher started review." : "");
  const update = (conn: Database) => action.action === "confirm"
    ? conn.prepare(
      `UPDATE quotes SET status = ?, assigned_aircraft_id = ?, operational_approved_by = ?,
        operational_approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND status = ?`,
    ).bind(nextStatus, assignedAircraftId, authorization.email, action.id, quote.status)
    : conn.prepare("UPDATE quotes SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = ?")
      .bind(nextStatus, action.id, quote.status);
  let applied: boolean;
  try {
    applied = await db.transaction(async (tx) => {
      const updated = await update(tx).run();
      if (updated.meta.changes === 1) {
        await tx.prepare(
          "INSERT INTO quote_status_history (quote_id, from_status, to_status, actor, note) VALUES (?, ?, ?, ?, ?)",
        ).bind(action.id, quote.status, nextStatus, authorization.email, note).run();
      }
      await tx.prepare(
        "INSERT INTO admin_audit_log (actor, action, entity, entity_id, detail) VALUES (?, ?, 'quote', ?, ?)",
      ).bind(authorization.email, action.action === "confirm" ? "operational_confirmation" : `quote_${action.action}`, action.id, action.action === "confirm" ? `aircraft=${assignedAircraftId}; ${note}` : note).run();
      return updated.meta.changes > 0;
    });
  } catch (error) {
    console.error(`[admin] Could not apply ${action.action} workflow action to ${action.id}.`, error);
    return NextResponse.json({ ok: false, error: "Could not update quote workflow." }, { status: 500 });
  }
  if (!applied) {
    return NextResponse.json({ ok: false, error: "The request changed while you were updating it. Refresh and try again." }, { status: 409 });
  }
  let notificationPending = false;
  if (action.action === "confirm") {
    const env = await getCloudflareEnv();
    const aircraftName = await dispatchAircraftName(assignedAircraftId, db);
    const clientText = quote.locale === "mn"
      ? `Сайн байна уу, ${quote.name}. ${quote.origin} → ${quote.destination} чиглэлийн ${quote.flight_date} өдрийн нислэгийг үйл ажиллагааны баг баталгаажууллаа. Нисэх цаг: ${quote.flight_time || "диспетчертэй тохиролцоно"}. Онгоц: ${aircraftName}.`
      : `Hello ${quote.name}, your flight ${quote.origin} → ${quote.destination} on ${quote.flight_date} has been confirmed by operations. Departure time: ${quote.flight_time || "to be coordinated with dispatch"}. Assigned aircraft: ${aircraftName}.`;
    const clientEmail = await notifyClient(
      quote.email,
      quote.locale === "mn" ? `Нислэг баталгаажлаа · ${quote.id}` : `Flight confirmed · ${quote.id}`,
      clientText,
      env,
    );
    if (clientEmail !== null) {
      const recorded = await db.prepare(
        "INSERT INTO quote_notification_attempts (quote_id, event, channel, succeeded) VALUES (?, 'flight_confirmed', 'email', ?)",
      ).bind(action.id, clientEmail ? 1 : 0).run();
      if (!recorded.success) console.error(`[admin] Could not record confirmation email attempt for ${action.id}.`, recorded.error);
    }
    const opsOutcomes = await notifyOperations(
      `Flight ${action.id} confirmed by ${authorization.email}. Aircraft: ${aircraftName}.`,
      env,
    );
    await recordNotificationOutcomes(db, action.id, "flight_confirmed", opsOutcomes);
    notificationPending = clientEmail !== true || !Object.values(opsOutcomes).some((delivered) => delivered === true);
  }
  return NextResponse.json({ ok: true, status: nextStatus, notificationPending });
}

async function dispatchAircraftName(id: string | null, db: Database) {
  if (!id) return "not recorded";
  const result = await db.prepare("SELECT name FROM aircraft WHERE id = ?").bind(id).first<{ name: string }>();
  return result?.name ?? id;
}
