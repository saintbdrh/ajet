import type { Database } from "@/lib/db";
type Delivery = boolean | null;
export type NotificationOutcomes = { telegram: Delivery; email: Delivery };

function configured(
  env: CloudflareEnv | null,
  name: "TELEGRAM_BOT_TOKEN" | "TELEGRAM_CHAT_ID" | "RESEND_API_KEY" | "QUOTE_FROM_EMAIL" | "QUOTE_TO_EMAIL",
) {
  return env?.[name] ?? process.env[name];
}

export async function notifyOperations(text: string, env: CloudflareEnv | null): Promise<NotificationOutcomes> {
  const botToken = configured(env, "TELEGRAM_BOT_TOKEN");
  const chatId = configured(env, "TELEGRAM_CHAT_ID");
  const apiKey = configured(env, "RESEND_API_KEY");
  const from = configured(env, "QUOTE_FROM_EMAIL");
  const recipients = configured(env, "QUOTE_TO_EMAIL");

  const [telegram, email] = await Promise.all([
    botToken && chatId ? (async () => {
      try {
        const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text }),
          signal: AbortSignal.timeout(8000),
        });
        if (!response.ok) console.error("[notification] Telegram rejected an operations alert.", response.status);
        return response.ok;
      } catch (error) {
        console.error("[notification] Could not deliver Telegram operations alert.", error);
        return false;
      }
    })() : Promise.resolve(null),
    apiKey && from && recipients ? (async () => {
      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from,
            to: recipients.split(",").map((recipient) => recipient.trim()).filter(Boolean),
            subject: "Ajet flight request update",
            text,
          }),
          signal: AbortSignal.timeout(8000),
        });
        if (!response.ok) console.error("[notification] Resend rejected an operations alert.", response.status);
        return response.ok;
      } catch (error) {
        console.error("[notification] Could not deliver email operations alert.", error);
        return false;
      }
    })() : Promise.resolve(null),
  ]);
  return { telegram, email };
}

export async function notifyClient(to: string, subject: string, text: string, env: CloudflareEnv | null): Promise<Delivery> {
  const apiKey = configured(env, "RESEND_API_KEY");
  const from = configured(env, "QUOTE_FROM_EMAIL");
  if (!apiKey || !from || !to) return null;
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject, text }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) console.error("[notification] Resend rejected a client email.", response.status);
    return response.ok;
  } catch (error) {
    console.error("[notification] Could not deliver client email.", error);
    return false;
  }
}

export async function recordNotificationOutcomes(
  db: Database,
  quoteId: string,
  event: "request_received" | "quote_sent" | "client_approved" | "client_declined" | "flight_confirmed",
  outcomes: NotificationOutcomes,
) {
  const inserts = (Object.entries(outcomes) as Array<["email" | "telegram", Delivery]>)
    .filter((entry): entry is ["email" | "telegram", boolean] => entry[1] !== null)
    .map(([channel, succeeded]) => db.prepare(
      "INSERT INTO quote_notification_attempts (quote_id, event, channel, succeeded) VALUES (?, ?, ?, ?)",
    ).bind(quoteId, event, channel, succeeded ? 1 : 0));
  if (!inserts.length) return;
  const results = await db.batch(inserts);
  if (results.some((result) => !result.success)) {
    console.error(`[notification] Could not record delivery outcomes for ${quoteId}.`);
  }
}
