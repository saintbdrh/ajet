"use client";

import { useEffect, useRef, useState } from "react";
import type { Locale } from "@/lib/i18n";

type Quote = {
  id: string;
  origin: string;
  destination: string;
  roundTrip: boolean;
  date: string;
  time: string;
  passengers: number;
  revision: number;
  amountMinor: number;
  currency: string;
  terms: string;
  expiresAt: string;
  status: string;
  bookingStatus: string;
};

const copy = {
  en: {
    eyebrow: "PRIVATE FLIGHT QUOTE",
    title: "Review your flight proposal",
    loading: "Retrieving your private quote…",
    error: "We could not retrieve this quote. Please contact the dispatch team.",
    itinerary: "Itinerary",
    passengers: "Passengers",
    validUntil: "Valid until",
    terms: "Quote terms",
    approve: "Approve this quote",
    decline: "Decline",
    sending: "Saving your response…",
    approved: "Quote approved. Our dispatch team must still confirm the aircraft, crew and operational conditions. Your flight is not yet confirmed.",
    declined: "Your response has been recorded.",
    notAvailable: "This quote cannot be changed from this link.",
    confirmed: "Your flight has been confirmed by operations.",
    dispatchPending: "Your response was recorded, but dispatch may not have been notified. Please contact the team directly.",
    expired: "This quote has expired. Please contact the dispatch team.",
    answered: "This quote has already been answered or replaced.",
    serviceUnavailable: "The quote service is temporarily unavailable. Please contact dispatch.",
    date: "Flight date",
    time: "Departure time",
    quote: "Quote",
    revision: "Revision",
    return: "Return flight",
  },
  mn: {
    eyebrow: "ХУВИЙ НИСЛЭГИЙН ҮНИЙН САНАЛ",
    title: "Нислэгийн саналаа шалгана уу",
    loading: "Таны хувийн үнийн саналыг ачаалж байна…",
    error: "Үнийн саналыг ачаалж чадсангүй. Диспетчер багтай холбогдоно уу.",
    itinerary: "Аяллын чиглэл",
    passengers: "Зорчигч",
    validUntil: "Хүчинтэй хугацаа",
    terms: "Үнийн саналын нөхцөл",
    approve: "Үнийн саналыг зөвшөөрөх",
    decline: "Татгалзах",
    sending: "Хариуг хадгалж байна…",
    approved: "Үнийн саналыг зөвшөөрлөө. Диспетчер баг онгоц, экипаж болон үйл ажиллагааны нөхцөлийг баталгаажуулах шаардлагатай. Нислэг одоогоор баталгаажаагүй.",
    declined: "Таны хариуг хадгаллаа.",
    notAvailable: "Энэ холбоосоор үнийн саналыг өөрчлөх боломжгүй.",
    confirmed: "Нислэгийг үйл ажиллагааны баг баталгаажууллаа.",
    dispatchPending: "Таны хариуг хадгалсан боловч диспетчер багт мэдэгдээгүй байж болзошгүй. Багтай шууд холбогдоно уу.",
    expired: "Үнийн саналын хугацаа дууссан. Диспетчер багтай холбогдоно уу.",
    answered: "Энэ үнийн саналд аль хэдийн хариу өгсөн эсвэл шинэ хувилбараар солигдсон байна.",
    serviceUnavailable: "Үнийн саналын үйлчилгээ түр боломжгүй байна. Диспетчертэй холбогдоно уу.",
    date: "Нисэх өдөр",
    time: "Нисэх цаг",
    quote: "Үнийн санал",
    revision: "Хувилбар",
    return: "Буцах нислэгтэй",
  },
} as const;

export default function QuoteResponse({ locale }: { locale: Locale }) {
  const text = copy[locale];
  const [quote, setQuote] = useState<Quote | null>(null);
  const [token, setToken] = useState("");
  const linkToken = useRef<string | null>(null);
  const [error, setError] = useState("");
  const [response, setResponse] = useState<"approved" | "declined" | "">("");
  const [notificationPending, setNotificationPending] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    if (linkToken.current === null) {
      linkToken.current = window.location.hash.slice(1);
    }
    const tokenValue = linkToken.current;
    if (!tokenValue) {
      setError(text.error);
      return () => { active = false; };
    }
    setToken(tokenValue);
    void fetch("/api/quote/decision", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: tokenValue, action: "view" }),
      cache: "no-store",
    })
      .then(async (res) => {
        const body = await res.json() as { ok?: boolean; quote?: Quote; code?: string };
        if (!res.ok || !body.ok || !body.quote) {
          const message = body.code === "expired" ? text.expired
            : body.code === "answered" ? text.answered
              : body.code === "unavailable" ? text.serviceUnavailable
                : text.error;
          throw new Error(message);
        }
        if (active) setQuote(body.quote);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : text.error);
      });
    return () => { active = false; };
  }, [text.error]);

  async function decide(action: "approve" | "decline") {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/quote/decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, action }),
      });
      const body = await res.json() as { ok?: boolean; status?: string; code?: string; notificationPending?: boolean };
      if (!res.ok || !body.ok) {
        const message = body.code === "expired" ? text.expired
          : body.code === "answered" ? text.answered
            : body.code === "unavailable" ? text.serviceUnavailable
              : text.error;
        throw new Error(message);
      }
      setResponse(action === "approve" ? "approved" : "declined");
      setNotificationPending(body.notificationPending === true);
      if (quote) setQuote({ ...quote, status: action === "approve" ? "approved" : "declined" });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : text.error);
    } finally {
      setBusy(false);
    }
  }

  const complete = response || quote?.status === "approved" || quote?.status === "declined";
  const amount = quote ? new Intl.NumberFormat(locale === "mn" ? "mn-MN" : "en-US", {
    style: "currency",
    currency: quote.currency,
  }).format(quote.amountMinor / (10 ** (new Intl.NumberFormat("en", {
    style: "currency",
    currency: quote.currency,
  }).resolvedOptions().maximumFractionDigits ?? 2))) : "";

  return (
    <section className="wrap sec quote-response">
      <p className="eyebrow">{text.eyebrow}</p>
      <h1>{text.title}</h1>
      {!quote && !error && <p role="status">{text.loading}</p>}
      {error && <p className="notice err" role="alert">{error}</p>}
      {quote && (
        <div className="concierge-review">
          <p className="eyebrow">{quote.id} · {text.revision} {quote.revision}</p>
          <dl>
            <div><dt>{text.itinerary}</dt><dd>{quote.origin} → {quote.destination}{quote.roundTrip ? ` · ${text.return}` : ""}</dd></div>
            <div><dt>{text.date} / {text.time}</dt><dd>{quote.date}{quote.time ? ` · ${quote.time}` : ""}</dd></div>
            <div><dt>{text.passengers}</dt><dd>{quote.passengers}</dd></div>
            <div><dt>{text.quote}</dt><dd>{amount}</dd></div>
            <div><dt>{text.validUntil}</dt><dd><time dateTime={quote.expiresAt}>{new Intl.DateTimeFormat(locale === "mn" ? "mn-MN" : "en-US", { dateStyle: "long", timeStyle: "short" }).format(new Date(quote.expiresAt))}</time></dd></div>
          </dl>
          <h2>{text.terms}</h2>
          <p>{quote.terms}</p>
        </div>
      )}
      {(response === "approved" || (!response && quote?.status === "approved")) && <p role="status">{text.approved}</p>}
      {(response === "declined" || (!response && quote?.status === "declined")) && <p role="status">{text.declined}</p>}
      {quote?.bookingStatus === "confirmed" && <p role="status">{text.confirmed}</p>}
      {notificationPending && <p className="notice err" role="status">{text.dispatchPending}</p>}
      {quote && !complete && quote.status === "sent" && (
        <div className="concierge-actions">
          <button className="btn" type="button" onClick={() => void decide("approve")} disabled={busy}>{busy ? text.sending : text.approve}</button>
          <button className="concierge-back" type="button" onClick={() => void decide("decline")} disabled={busy}>{text.decline}</button>
        </div>
      )}
      {quote && !complete && quote.status !== "sent" && <p role="status">{text.notAvailable}</p>}
    </section>
  );
}
