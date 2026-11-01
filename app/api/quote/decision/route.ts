import { NextResponse } from "next/server";
import { z } from "zod";
import { getCloudflareEnv } from "@/lib/cloudflare";
import { getDatabase } from "@/lib/db";
import { notifyOperations, recordNotificationOutcomes } from "@/lib/notifications";

export const runtime = "nodejs";

const tokenSchema = z.string().regex(/^[0-9a-f-]{72}$/i);
const actionSchema = z.object({
  token: tokenSchema,
  action: z.enum(["view", "approve", "decline"]),
});
const privateHeaders = { "Cache-Control": "private, no-store, max-age=0", "Referrer-Policy": "no-referrer" };

type QuoteDecisionRow = {
  revision_id: string; quote_id: string; revision: number; amount_minor: number; currency: string;
  terms: string; expires_at: string; revision_status: string; locale: "mn" | "en";
  origin: string; destination: string; round_trip: number; flight_date: string; flight_time: string;
  passengers: number; quote_status: string;
};

/** Thrown inside a transaction to roll back when the revision was already answered. */
class AnsweredError extends Error {}

async function hashToken(token: string) {
  return crypto.subtle.digest("SHA-256", new TextEncoder().encode(token))
    .then((buffer) => Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, "0")).join(""));
}

async function findRevision(token: string) {
  const db = await getDatabase();
  if (!db) return { response: NextResponse.json({ ok: false, code: "unavailable" }, { status: 503, headers: privateHeaders }) };
  const row = await db.prepare(
    `SELECT r.id AS revision_id, r.quote_id, r.revision, r.amount_minor, r.currency,
      r.terms, r.expires_at, r.status AS revision_status, q.locale, q.origin, q.destination,
      q.round_trip, q.flight_date, q.flight_time, q.passengers, q.status AS quote_status
     FROM quote_revisions r JOIN quotes q ON q.id = r.quote_id
     WHERE r.approval_token_hash = ?`,
  ).bind(await hashToken(token)).first<QuoteDecisionRow>();
  if (!row) return { response: NextResponse.json({ ok: false, code: "invalid" }, { status: 404, headers: privateHeaders }) };
  if (row.revision_status === "sent" && Date.parse(row.expires_at) <= Date.now()) {
    await db.transaction(async (tx) => {
      await tx.prepare("UPDATE quote_revisions SET status = 'expired' WHERE id = ? AND status = 'sent'").bind(row.revision_id).run();
      const quote = await tx.prepare("UPDATE quotes SET status = 'expired', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'quoted'").bind(row.quote_id).run();
      if (quote.meta.changes === 1) {
        await tx.prepare(
          "INSERT INTO quote_status_history (quote_id, from_status, to_status, actor, note) VALUES (?, 'quoted', 'expired', 'system', 'Quote expired.')",
        ).bind(row.quote_id).run();
      }
    });
    return { response: NextResponse.json({ ok: false, code: "expired" }, { status: 410, headers: privateHeaders }) };
  }
  return { db, row };
}

function quoteResponse(row: QuoteDecisionRow) {
  return {
    ok: true,
    quote: {
      id: row.quote_id,
      locale: row.locale,
      origin: row.origin,
      destination: row.destination,
      roundTrip: row.round_trip === 1,
      date: row.flight_date,
      time: row.flight_time,
      passengers: row.passengers,
      revision: row.revision,
      amountMinor: row.amount_minor,
      currency: row.currency,
      terms: row.terms,
      expiresAt: row.expires_at,
      status: row.revision_status === "approved" ? "approved" : row.revision_status === "declined" ? "declined" : row.revision_status,
      bookingStatus: row.quote_status,
    },
  };
}

export async function POST(request: Request) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ ok: false, code: "invalid" }, { status: 400, headers: privateHeaders });
  }
  const parsed = actionSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ ok: false, code: "invalid" }, { status: 400, headers: privateHeaders });
  const result = await findRevision(parsed.data.token);
  if ("response" in result) return result.response;
  const { db, row } = result;
  if (parsed.data.action === "view") {
    return NextResponse.json(quoteResponse(row), { headers: privateHeaders });
  }
  if (row.revision_status !== "sent" || row.quote_status !== "quoted") {
    return NextResponse.json({ ok: false, code: "answered" }, { status: 409, headers: privateHeaders });
  }

  const nextStatus = parsed.data.action === "approve" ? "approved" : "declined";
  const revisionStatus = parsed.data.action === "approve" ? "approved" : "declined";
  let recorded: boolean;
  try {
    recorded = await db.transaction(async (tx) => {
      const quote = await tx.prepare("UPDATE quotes SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'quoted'")
        .bind(nextStatus, row.quote_id).run();
      if (quote.meta.changes === 0) return false;
      const revision = await tx.prepare("UPDATE quote_revisions SET status = ?, responded_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'sent'")
        .bind(revisionStatus, row.revision_id).run();
      if (revision.meta.changes === 0) throw new AnsweredError();
      await tx.prepare(
        "INSERT INTO quote_status_history (quote_id, from_status, to_status, actor, note) VALUES (?, 'quoted', ?, 'client', ?)",
      ).bind(row.quote_id, nextStatus, `Client ${parsed.data.action}d quote revision ${row.revision}.`).run();
      return true;
    });
  } catch (error) {
    if (error instanceof AnsweredError) recorded = false;
    else {
      console.error(`[quote] Could not record client response for ${row.quote_id}.`, error);
      return NextResponse.json({ ok: false, code: "unavailable" }, { status: 503, headers: privateHeaders });
    }
  }
  if (!recorded) {
    return NextResponse.json({ ok: false, code: "answered" }, { status: 409, headers: privateHeaders });
  }
  const env = await getCloudflareEnv();
  const outcomes = await notifyOperations(
    `Client ${parsed.data.action}d quote ${row.quote_id}, revision ${row.revision}.`,
    env,
  );
  await recordNotificationOutcomes(
    db,
    row.quote_id,
    parsed.data.action === "approve" ? "client_approved" : "client_declined",
    outcomes,
  );
  const notificationPending = !Object.values(outcomes).some((delivered) => delivered === true);
  return NextResponse.json({
    ok: true,
    status: nextStatus,
    bookingStatus: nextStatus,
    notificationPending,
  }, { headers: privateHeaders });
}
