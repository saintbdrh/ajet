"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { Locale } from "@/lib/i18n";

type FlightLeg = {
  id: string;
  legOrder: number;
  origin: string;
  destination: string;
  plannedKm: number | null;
  actualKm: number | null;
  blockMinutes: number | null;
  pax: number | null;
  completedAt: string | null;
};

type Booking = {
  id: string;
  locale: Locale;
  name: string;
  origin: string;
  destination: string;
  flight_date: string;
  passengers: number;
  status: "confirmed" | "completed";
  legs: FlightLeg[];
};

type LegDraft = { id: string; actualKm: string; blockMinutes: string; pax: string };
type Baseline = { total_km: number; total_hours: number; total_flights: number; as_of: string };

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function fetchAdmin<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  let value: unknown;
  try {
    value = await response.json();
  } catch {
    throw new Error("Серверийн хариуг уншиж чадсангүй.");
  }
  if (!response.ok || !isObject(value) || value.ok !== true) {
    throw new Error(isObject(value) && typeof value.error === "string" ? value.error : "Хүсэлтийг гүйцэтгэж чадсангүй.");
  }
  return value as T;
}

export function FlightCompletionScreen({ locale }: { locale: Locale }) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [draft, setDraft] = useState<LegDraft[]>([]);
  const [review, setReview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const mn = locale === "mn";
  const selected = bookings.find((booking) => booking.id === selectedId);
  const hasCompletedLeg = selected?.legs.some((leg) => leg.completedAt) ?? false;

  async function loadBookings() {
    setLoading(true);
    try {
      const response = await fetchAdmin<{ items: Booking[] }>("/api/staff/bookings");
      setBookings(response.items);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Нислэгийн мэдээлэл ачаалж чадсангүй.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadBookings(); }, []);

  function chooseBooking(booking: Booking) {
    setSelectedId(booking.id);
    setReview(false);
    setError("");
    setNotice("");
    setDraft(booking.legs.map((leg) => ({
      id: leg.id,
      actualKm: String(leg.actualKm ?? leg.plannedKm ?? ""),
      blockMinutes: String(leg.blockMinutes ?? ""),
      pax: String(leg.pax ?? booking.passengers),
    })));
  }

  function updateLeg(id: string, key: keyof Omit<LegDraft, "id">, value: string) {
    setDraft((current) => current.map((leg) => leg.id === id ? { ...leg, [key]: value } : leg));
    setReview(false);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    if (!review) {
      setReview(true);
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await fetchAdmin<{ changed: boolean }>(`/api/staff/bookings/${encodeURIComponent(selected.id)}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          legs: draft.map((leg) => ({
            id: leg.id,
            actual_km: leg.actualKm.trim() === "" ? null : Number(leg.actualKm),
            block_minutes: Number(leg.blockMinutes),
            pax: Number(leg.pax),
          })),
        }),
      });
      setNotice(result.changed
        ? mn ? "Нислэгийн мэдээлэл бүртгэгдлээ." : "Flight details saved."
        : mn ? "Энэ нислэгийн мэдээлэл өмнө нь бүртгэгдсэн байна." : "This flight was already recorded.");
      setReview(false);
      await loadBookings();
      const refreshed = await fetchAdmin<{ items: Booking[] }>("/api/staff/bookings");
      const booking = refreshed.items.find((item) => item.id === selected.id);
      if (booking) chooseBooking(booking);
      else setSelectedId("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Нислэгийн мэдээлэл хадгалж чадсангүй.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="admin-panel flight-operations">
      <div className="admin-panel-heading">
        <div>
          <h2>{mn ? "Нислэг дуусгах" : "Complete a flight"}</h2>
          <p>{mn ? "Зөвхөн үйл ажиллагааны баг баталгаажуулсан нислэг энд харагдана." : "Only flights confirmed by operations appear here."}</p>
        </div>
      </div>
      {error && <p className="admin-alert error" role="alert">{error}</p>}
      {notice && <p className="admin-alert success" role="status">{notice}</p>}
      {loading ? <div className="admin-empty">{mn ? "Ачаалж байна…" : "Loading…"}</div>
        : bookings.length === 0 ? <div className="admin-empty">{mn ? "Дуусгаагүй баталгаажсан нислэг алга." : "There are no confirmed flights to complete."}</div>
          : <div className="flight-booking-list">{bookings.map((booking) => (
            <button type="button" className={`flight-booking${selectedId === booking.id ? " is-selected" : ""}`} key={booking.id} onClick={() => chooseBooking(booking)}>
              <span><strong>{booking.origin} → {booking.destination}</strong><small>{booking.id} · {booking.flight_date} · {booking.name}</small></span>
              <span className="admin-state">{booking.status === "completed" ? mn ? "Дууссан" : "Completed" : mn ? "Баталгаажсан" : "Confirmed"}</span>
            </button>
          ))}</div>}

      {selected && selected.legs.length === 0 && <p className="admin-alert error">{mn ? "Энэ захиалгад нислэгийн хэсэг байхгүй. Дэмжлэгтэй холбогдоно уу." : "This booking has no flight legs. Contact support."}</p>}
      {selected && selected.legs.length > 0 && <form className="flight-completion-form" onSubmit={submit}>
        <h3>{selected.origin} → {selected.destination}</h3>
        <p>{selected.id} · {selected.flight_date} · {selected.name}</p>
        {selected.legs.map((leg, index) => {
          const values = draft.find((item) => item.id === leg.id);
          if (!values) return null;
          return <fieldset className="flight-leg-editor" key={leg.id}>
            <legend>{mn ? `Нислэгийн хэсэг ${index + 1}` : `Leg ${index + 1}`}</legend>
            <p>{leg.origin} → {leg.destination}</p>
            <div className="flight-leg-inputs">
              <label>{mn ? "Бодит км" : "Actual km"}
                <input required={leg.plannedKm === null} type="number" inputMode="decimal" min="0.01" max="100000" step="0.01" value={values.actualKm} aria-describedby={leg.plannedKm === null ? `leg-${leg.id}-distance-help` : undefined} onInvalid={(event) => {
                  if (leg.plannedKm === null && !values.actualKm) {
                    event.currentTarget.setCustomValidity("Төлөвлөсөн зай байхгүй тул нислэгийн км-ийг заавал оруулна уу.");
                  }
                }} onInput={(event) => event.currentTarget.setCustomValidity("")} onChange={(event) => updateLeg(leg.id, "actualKm", event.target.value)} />
                <small>{mn ? "Төлөвлөсөн зай" : "Planned distance"}: {leg.plannedKm === null ? mn ? "байхгүй" : "not available" : `${leg.plannedKm.toLocaleString(locale === "mn" ? "mn-MN" : "en-US")} km`}</small>
                {leg.plannedKm === null && <small id={`leg-${leg.id}-distance-help`} role="note">Төлөвлөсөн зай байхгүй тул нислэгийн км-ийг заавал оруулна уу.</small>}
              </label>
              <label>{mn ? "Нислэгийн хугацаа (минут)" : "Block time (minutes)"}
                <input required type="number" inputMode="numeric" min="1" max="100000" step="1" value={values.blockMinutes} onChange={(event) => updateLeg(leg.id, "blockMinutes", event.target.value)} />
              </label>
              <label>{mn ? "Зорчигч" : "Passengers"}
                <input required type="number" inputMode="numeric" min="1" max="500" step="1" value={values.pax} onChange={(event) => updateLeg(leg.id, "pax", event.target.value)} />
              </label>
            </div>
          </fieldset>;
        })}
        {review && <div className="flight-confirm-step" role="status">
          <strong>{mn ? "Баталгаажуулахын өмнө шалгана уу" : "Review before confirming"}</strong>
          <p>{mn ? "Эдгээр мэдээлэл нийт ниссэн зайд нэмэгдэж, өөрчлөлт аудитын бүртгэлд хадгалагдана." : "These values will update the public totals. Changes are audit logged."}</p>
          {draft.map((leg, index) => <p key={leg.id}>{mn ? `Хэсэг ${index + 1}` : `Leg ${index + 1}`}: {Number(leg.actualKm).toLocaleString()} km · {leg.blockMinutes} min · {leg.pax} pax</p>)}
          <button type="button" className="admin-link" onClick={() => setReview(false)}>{mn ? "Буцаж засах" : "Back to edit"}</button>
        </div>}
        <div className="flight-form-actions">
          <button className="btn" type="submit" disabled={busy || selected.legs.length !== draft.length}>
            {busy ? mn ? "Хадгалж байна…" : "Saving…" : review
              ? mn ? "Нислэгийг баталгаажуулж хадгалах" : "Confirm and save flight"
              : hasCompletedLeg ? mn ? "Засварыг шалгах" : "Review corrections" : mn ? "Дуусгалтыг шалгах" : "Review completion"}
          </button>
          {review && <span>{mn ? "Дараагийн алхамд баталгаажуулна." : "A second step is required to confirm."}</span>}
        </div>
      </form>}
    </section>
  );
}

export function FlightBaselineEditor({ locale }: { locale: Locale }) {
  const [baseline, setBaseline] = useState<Baseline | null>(null);
  const [draft, setDraft] = useState<Baseline>({ total_km: 0, total_hours: 0, total_flights: 0, as_of: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const mn = locale === "mn";

  useEffect(() => {
    let active = true;
    void fetchAdmin<{ baseline: Baseline }>("/api/stats/baseline")
      .then(({ baseline: value }) => {
        if (!active) return;
        setBaseline(value);
        setDraft(value);
      })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Суурь мэдээлэл ачаалж чадсангүй."); });
    return () => { active = false; };
  }, []);

  const changed = useMemo(() => baseline !== null && (
    baseline.total_km !== Number(draft.total_km) ||
    baseline.total_hours !== Number(draft.total_hours) ||
    baseline.total_flights !== Number(draft.total_flights) ||
    baseline.as_of !== draft.as_of
  ), [baseline, draft]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetchAdmin<{ baseline: Baseline }>("/api/stats/baseline", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          total_km: Number(draft.total_km),
          total_hours: Number(draft.total_hours),
          total_flights: Number(draft.total_flights),
          as_of: draft.as_of,
        }),
      });
      setBaseline(response.baseline);
      setDraft(response.baseline);
      setNotice(mn ? "Суурь үзүүлэлт хадгалагдлаа." : "Baseline saved.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Суурь үзүүлэлтийг хадгалж чадсангүй.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="admin-panel flight-baseline">
      <div className="admin-panel-heading"><div><h2>{mn ? "Нийт статистикийн суурь" : "Historical statistics baseline"}</h2>
        <p>{mn ? "Энэ суурь нь дууссан нислэгийн бүртгэл дээр нэмэгдэж тооцогдоно." : "This baseline is added to recorded completed legs."}</p></div></div>
      {error && <p className="admin-alert error" role="alert">{error}</p>}
      {notice && <p className="admin-alert success" role="status">{notice}</p>}
      {!baseline ? <div className="admin-empty">{mn ? "Ачаалж байна…" : "Loading…"}</div> : <form className="admin-form" onSubmit={save}>
        <label>{mn ? "Нийт ниссэн км" : "Historical kilometres"}
          <input required type="number" inputMode="decimal" min="0" max="999999999999.99" step="0.01" value={draft.total_km} onChange={(event) => setDraft({ ...draft, total_km: Number(event.target.value) })} />
        </label>
        <label>{mn ? "Нислэгийн цаг" : "Historical flight hours"}
          <input required type="number" inputMode="decimal" min="0" max="999999999999.99" step="0.01" value={draft.total_hours} onChange={(event) => setDraft({ ...draft, total_hours: Number(event.target.value) })} />
        </label>
        <label>{mn ? "Нислэгийн тоо" : "Historical flights"}
          <input required type="number" inputMode="numeric" min="0" max="9007199254740991" step="1" value={draft.total_flights} onChange={(event) => setDraft({ ...draft, total_flights: Number(event.target.value) })} />
        </label>
        <label>{mn ? "Суурь огноо" : "As-of date"}
          <input required type="date" value={draft.as_of} onChange={(event) => setDraft({ ...draft, as_of: event.target.value })} />
        </label>
        <p className="admin-help">{mn ? "Засвар бүр өөрчлөлтийн бүртгэлд хадгалагдана." : "Every baseline change is audit logged."}</p>
        <button className="btn" type="submit" disabled={busy || !changed}>{busy ? mn ? "Хадгалж байна…" : "Saving…" : mn ? "Суурь хадгалах" : "Save baseline"}</button>
      </form>}
    </section>
  );
}
