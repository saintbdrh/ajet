"use client";
import Script from "next/script";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import type { Locale } from "@/lib/i18n";
import { experienceCopy } from "@/lib/experiences";

type Captcha = { render: (host: HTMLElement, options: Record<string, unknown>) => string; remove: (id: string) => void; reset: (id: string) => void };
const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export default function CareerInterestForm({ locale, enabled }: { locale: Locale; enabled: boolean }) {
  const d = experienceCopy[locale];
  const [state, setState] = useState<"idle" | "sending" | "ok" | "error">("idle");
  const [token, setToken] = useState("");
  const requestId = useRef<string | null>(null);
  const captchaHost = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const mountCaptcha = useCallback(() => {
    const api = (window as Window & { turnstile?: Captcha }).turnstile;
    if (siteKey && api && captchaHost.current && widget.current === null) {
      widget.current = api.render(captchaHost.current, { sitekey: siteKey, callback: setToken, "expired-callback": () => setToken(""), "error-callback": () => setToken("") });
    }
  }, []);
  useEffect(() => { mountCaptcha(); return () => { if (widget.current) (window as Window & { turnstile?: Captcha }).turnstile?.remove(widget.current); widget.current = null; }; }, [mountCaptcha]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!enabled || state === "sending") return;
    const form = new FormData(event.currentTarget);
    requestId.current ??= crypto.randomUUID(); setState("sending");
    try {
      const response = await fetch("/api/careers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        id: requestId.current, locale, name: form.get("name"), email: form.get("email"), phone: form.get("phone"),
        area: form.get("area"), experience: form.get("experience"), consent: form.get("consent") === "on", website: form.get("website"), token,
      }) });
      if (!response.ok) throw new Error("Could not register");
      setState("ok");
    } catch { setState("error"); if (widget.current) (window as Window & { turnstile?: Captcha }).turnstile?.reset(widget.current); setToken(""); }
  }
  if (state === "ok") return <div className="career-success" role="status"><h2>{d.register}</h2><p>{d.sent}</p></div>;
  return <form className="career-form" onSubmit={submit} onChange={() => { requestId.current = null; if (state === "error") setState("idle"); }}>
    <h2>{d.register}</h2>
    {!enabled && <p className="service-notice" role="status">{d.unavailable}</p>}
    <div className="career-fields"><label>{d.name}<input name="name" autoComplete="name" required minLength={2} maxLength={100} /></label><label>{d.email}<input name="email" type="email" autoComplete="email" required maxLength={160} /></label><label>{d.phone}<input name="phone" type="tel" autoComplete="tel" maxLength={30} /></label><label>{d.area}<select name="area" required>{d.areas.map((area, i) => <option key={area} value={String(i)}>{area}</option>)}</select></label></div>
    <label>{d.about}<textarea name="experience" rows={5} maxLength={2000} /></label>
    <label className="career-consent"><input name="consent" type="checkbox" required /><span>{d.consent}</span></label>
    <p className="note">{d.privacy}</p>
    <label className="hp" aria-hidden="true">Website<input name="website" autoComplete="off" tabIndex={-1} /></label>
    {siteKey && <><Script id="careers-captcha" src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" onReady={mountCaptcha} /><div ref={captchaHost} /></>}
    {state === "error" && <p className="form-error" role="alert">{d.error}</p>}
    <button className="btn" type="submit" disabled={!enabled || state === "sending" || Boolean(siteKey && !token)}>{state === "sending" ? d.sending : d.submit}<span aria-hidden="true">↗</span></button>
  </form>;
}
