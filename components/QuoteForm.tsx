"use client";
import { requestId as createRequestId } from "@/lib/request-id";

import { useRef, useState, type FormEvent } from "react";
import Script from "next/script";
import Link from "next/link";
import { journeyCopy, extraIds, type ExtraId, type ServiceId } from "@/lib/journey";
import type { Dict, Locale } from "@/lib/i18n";

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

type QuoteValues = {
  service: ServiceId;
  extras: ExtraId[];
  from: string;
  to: string;
  date: string;
  time: string;
  aircraft: string;
  roundTrip: boolean;
  pax: string;
  notes: string;
  name: string;
  phone: string;
  email: string;
  org: string;
};

const initialValues: QuoteValues = {
  service: "charter",
  extras: [],
  from: "",
  to: "",
  date: "",
  time: "",
  aircraft: "",
  roundTrip: false,
  pax: "1",
  notes: "",
  name: "",
  phone: "",
  email: "",
  org: "",
};

const stepCopy = {
  en: {
    eyebrow: ["01 / YOUR JOURNEY", "02 / YOUR SCHEDULE", "03 / SERVICES", "04 / YOUR REQUIREMENTS", "05 / YOUR DETAILS"],
    title: ["Where are you travelling?", "When would you like to fly?", "Do you have an aircraft preference?", "What would make the journey right for you?", "How may our concierge reach you?"],
    description: ["Choose your departure and destination.", "Share a preferred date and, if known, departure time.", "An aircraft preference is optional. Availability is confirmed by our team.", "Tell us about your party and any special requirements.", "Review your plans, then send a private service enquiry."],
    from: "Departure", to: "Destination", date: "Preferred date", time: "Preferred departure time",
    select: "Select aircraft (optional)", noPreference: "No preference", noAircraft: "Share your route and our aviation concierge can discuss suitable aircraft when responding. Aircraft availability depends on operational review.",
    round: "Return journey", pax: "Passengers", notes: "Luggage or other requirements (optional)",
    name: "Full name", phone: "Phone", email: "Email (optional)", org: "Company (optional)",
    review: "Your journey", reviewAircraft: "Aircraft preference", reviewRound: "Return journey", yes: "Yes", no: "No",
    back: "Back", continue: "Continue", submit: "Send service enquiry", sending: "Sending request…",
    successTitle: "Your request is with our concierge", reference: "Reference", successBody: "Our team will review your request and contact you. Service availability and bookings are confirmed separately.",
    stepOf: "of", progress: "Request progress",
  },
  mn: {
    eyebrow: ["01 / ТАНЫ АЯЛАЛ", "02 / ХУВААРЬ", "03 / ҮЙЛЧИЛГЭЭ", "04 / ТУСГАЙ ХҮСЭЛТ", "05 / ТАНЫ МЭДЭЭЛЭЛ"],
    title: ["Та хаанаас хаашаа явах вэ?", "Хэзээ нисэхийг хүсэж байна вэ?", "Сонгосон онгоц бий юу?", "Таны аялалд юу хэрэгтэй вэ?", "Тантай хэрхэн холбогдох вэ?"],
    description: ["Хөөрөх болон буух газраа сонгоно уу.", "Нисэх өдрөө, боломжтой бол цагаа оруулна уу.", "Онгоц сонгох нь заавал биш. Боломжийг манай баг баталгаажуулна.", "Зорчигчдын тоо болон бусад хүсэлтээ бичнэ үү.", "Мэдээллээ шалгаад үйлчилгээний хүсэлтээ илгээнэ үү."],
    from: "Хаанаас", to: "Хаашаа", date: "Нисэх өдөр", time: "Нисэх цаг",
    select: "Нисдэг тэрэг сонгох (заавал биш)", noPreference: "Сонголтгүй", noAircraft: "Чиглэлээ илгээгээрэй. Нислэгийн зөвлөх тохирох онгоцны талаар хариу өгөхдөө ярилцана. Боломжийг үйл ажиллагааны шалгалтаар баталгаажуулна.",
    round: "Буцах нислэгтэй", pax: "Зорчигчдын тоо", notes: "Ачаа болон бусад хүсэлт (заавал биш)",
    name: "Овог нэр", phone: "Утас", email: "И-мэйл (заавал биш)", org: "Байгууллага (заавал биш)",
    review: "Таны аялал", reviewAircraft: "Онгоцны сонголт", reviewRound: "Буцах нислэг", yes: "Тийм", no: "Үгүй",
    back: "Буцах", continue: "Үргэлжлүүлэх", submit: "Үйлчилгээний хүсэлт илгээх", sending: "Хүсэлт илгээж байна...",
    successTitle: "Таны хүсэлтийг хүлээн авлаа", reference: "Дугаар", successBody: "Манай баг хүсэлтийг хянаад тантай холбогдоно. Үйлчилгээний боломж болон захиалгыг тусад нь баталгаажуулна.",
    stepOf: "/", progress: "Хүсэлтийн явц",
  },
} as const;

export default function QuoteForm({
  d,
  locale,
  places,
  aircraft,
  initialRoute,
  initialService = "charter",
  initialExtras = [],
}: {
  d: Dict["form"];
  locale: Locale;
  places: string[];
  aircraft: string[];
  initialRoute?: { from: string; to: string; notes?: string; pax?: string; roundTrip?: boolean; date?: string; aircraft?: string };
  initialService?: ServiceId;
  initialExtras?: ExtraId[];
}) {
  const [state, setState] = useState<"idle" | "sending" | "ok" | "error">("idle");
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<QuoteValues>({ ...initialValues, ...initialRoute, service: initialService, extras: initialExtras });
  const [ref, setRef] = useState("");
  const idempotencyKey = useRef<string | null>(null);
  const stepRefs = useRef<Array<HTMLFieldSetElement | null>>([]);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const copy = stepCopy[locale];
  const journey = journeyCopy[locale];
  const flight = values.service === "charter";
  const fromLabel = flight ? copy.from : (locale === "mn" ? "Үйлчилгээний байршил" : "Service location");
  const toLabel = flight ? copy.to : (locale === "mn" ? "Арга хэмжээ / төслийн товч" : "Occasion / project");
  const dateLabel = flight ? copy.date : (locale === "mn" ? "Үйлчилгээний огноо" : "Preferred date");
  const timeLabel = flight ? copy.time : (locale === "mn" ? "Хүссэн цаг" : "Preferred time");
  const partyLabel = flight ? copy.pax : (locale === "mn" ? "Зочин / оролцогчдын тоо" : "Guests / participants");
  const stepTitles = [flight ? copy.title[0] : (locale === "mn" ? "Юу төлөвлөж байна вэ?" : "What are you planning?"), flight ? copy.title[1] : (locale === "mn" ? "Үйлчилгээг хэзээ авах вэ?" : "When do you need the service?"), locale === "mn" ? "Нэмэлт үйлчилгээ хэрэгтэй юу?" : "What else may we arrange?", copy.title[3], copy.title[4]];
  const stepDescriptions = [flight ? copy.description[0] : (locale === "mn" ? "Байршил, арга хэмжээ эсвэл зураг авалтын товчоо хуваалцаарай." : "Share the location and a short description of the occasion or project."), (flight ? copy.description[1] : (locale === "mn" ? "Үйлчилгээ авах өдөр, хүссэн цагаа оруулна уу." : "Share the preferred date and time for your service.")), journey.extrasNote, copy.description[3], copy.description[4]];
  function toggleExtra(id: ExtraId) { updateValue("extras", values.extras.includes(id) ? values.extras.filter((item) => item !== id) : [...values.extras, id]); }

  function updateValue<Key extends keyof QuoteValues>(key: Key, value: QuoteValues[Key]) {
    idempotencyKey.current = null;
    setValues((current) => ({ ...current, [key]: value }));
  }

  function validateStep(stepIndex: number) {
    const currentStep = stepRefs.current[stepIndex];
    if (!currentStep) return false;
    const invalidField = (Array.from(currentStep.querySelectorAll("input, select, textarea")) as unknown as Array<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>)
      .find((field) => !field.checkValidity());
    if (!invalidField) return true;
    invalidField.reportValidity();
    invalidField.focus();
    return false;
  }

  function nextStep() {
    if (!validateStep(step)) return;
    setStep((current) => Math.min(current + 1, copy.title.length - 1));
    requestAnimationFrame(() => headingRef.current?.focus({ preventScroll: true }));
  }

  function previousStep() {
    setStep((current) => Math.max(0, current - 1));
    requestAnimationFrame(() => headingRef.current?.focus({ preventScroll: true }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === "sending") return;
    if (step < copy.title.length - 1) { nextStep(); return; }

    if (!validateStep(step)) return;

    const formData = new FormData(event.currentTarget);
    const notes = [
      flight && values.aircraft && `${copy.reviewAircraft}: ${values.aircraft}`,
      values.notes.trim(),
    ].filter(Boolean).join("\n").slice(0, 1000);
    const body = {
      idempotencyKey: idempotencyKey.current ?? (idempotencyKey.current = createRequestId()),
      locale,
      service: values.service,
      extras: values.extras,
      name: values.name,
      phone: values.phone,
      email: values.email,
      org: values.org,
      from: values.from,
      to: values.to,
      roundTrip: values.roundTrip,
      date: values.date,
      time: values.time,
      pax: values.pax,
      notes,
      website: formData.get("website"),
      token: formData.get("cf-turnstile-response") ?? undefined,
    };
    setState("sending");
    try {
      const response = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = (await response.json()) as { ok: boolean; id?: string };
      if (response.ok && result.ok) {
        setRef(result.id ?? "");
        setState("ok");
      } else {
        setState("error");
      }
    } catch {
      setState("error");
    }
  }

  if (state === "ok") {
    return (
      <section className="concierge-success" role="status" aria-live="polite">
        <p className="eyebrow">{copy.successTitle}</p>
        <h2>{copy.reference} {ref}</h2>
        <p>{copy.successBody}</p>
      </section>
    );
  }

  const stepControls = [
    <>
      <label className="concierge-full">{journey.serviceLabel}<select name="service" value={values.service} onChange={(event) => { const service = event.target.value as ServiceId; idempotencyKey.current = null; setValues((current) => ({ ...current, service, extras: current.extras.filter((id) => id !== service) })); }}>{journey.services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}</select></label>
      <datalist id="places">{places.map((place) => <option key={place} value={place} />)}</datalist>
      <label>{fromLabel}<input name="from" list="places" value={values.from} onChange={(event) => updateValue("from", event.target.value)} required minLength={2} maxLength={120} autoComplete="off" /></label>
      <label>{toLabel}<input name="to" list="places" value={values.to} onChange={(event) => updateValue("to", event.target.value)} required minLength={2} maxLength={120} autoComplete="off" /></label>
    </>,
    <>
      <label>{dateLabel}<input name="date" type="date" value={values.date} onChange={(event) => updateValue("date", event.target.value)} min={new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Ulaanbaatar" })} required /></label>
      <label>{timeLabel}<input name="time" type="time" value={values.time} onChange={(event) => updateValue("time", event.target.value)} /></label>
    </>,
    <>
      {flight && aircraft.length > 0 ? (
        <label className="concierge-full">{copy.select}
          <select name="aircraft" value={values.aircraft} onChange={(event) => updateValue("aircraft", event.target.value)}>
            <option value="">{copy.noPreference}</option>
            {aircraft.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        </label>
      ) : flight ? <p className="concierge-guidance concierge-full">{copy.noAircraft}</p> : null}
      {!flight && <p className="concierge-guidance concierge-full">{locale === "mn" ? "Энэ хүсэлтэд нислэг автоматаар орохгүй. Агаарын зураг авалт хийх бол нисдэг тэрэгний үйлчилгээг үндсэн сонголт болгож, зураг авалтыг нэмэлтээр сонгоорой." : "A flight is not automatically included. For an aerial shoot, choose helicopter charter as your main service and add photography."}</p>}
      <div className="concierge-full service-extras" role="group" aria-label={journey.extrasLabel}>{extraIds.filter((id) => id !== values.service).map((id) => <label className="check" key={id}><input type="checkbox" name={`extra-${id}`} checked={values.extras.includes(id)} onChange={() => toggleExtra(id)} />{journey[id]}</label>)}</div>
    </>,
    <>
      {flight && <label className="check concierge-full"><input name="roundTrip" type="checkbox" checked={values.roundTrip} onChange={(event) => updateValue("roundTrip", event.target.checked)} />{copy.round}</label>}
      <label>{partyLabel}<input name="pax" type="number" min={1} max={flight ? 20 : 500} value={values.pax} onChange={(event) => updateValue("pax", event.target.value)} required /></label>
      <label className="concierge-full">{copy.notes}<textarea name="notes" maxLength={600} rows={4} value={values.notes} onChange={(event) => updateValue("notes", event.target.value)} /></label>
    </>,
    <>
      <label>{copy.name}<input name="name" value={values.name} onChange={(event) => updateValue("name", event.target.value)} required minLength={2} maxLength={80} autoComplete="name" /></label>
      <label>{copy.phone}<input name="phone" type="tel" value={values.phone} onChange={(event) => updateValue("phone", event.target.value)} required pattern="[0-9+\(\)\s\x2d]{6,30}" autoComplete="tel" /></label>
      <label>{copy.email}<input name="email" type="email" value={values.email} onChange={(event) => updateValue("email", event.target.value)} maxLength={120} autoComplete="email" /></label>
      <label>{copy.org}<input name="org" value={values.org} onChange={(event) => updateValue("org", event.target.value)} maxLength={120} autoComplete="organization" /></label>
      <div className="concierge-review concierge-full">
        <p className="eyebrow">{copy.review}</p>
        <dl>
          <div><dt>{fromLabel} / {toLabel}</dt><dd>{values.from} → {values.to}</dd></div>
          <div><dt>{dateLabel} / {timeLabel}</dt><dd>{values.date}{values.time ? ` · ${values.time}` : ""}</dd></div>
          <div><dt>{journey.serviceLabel}</dt><dd>{journey.services.find((service) => service.id === values.service)?.name}</dd></div>
          {values.extras.length > 0 && <div><dt>{journey.extrasLabel}</dt><dd>{values.extras.map((id) => journey[id]).join(" · ")}</dd></div>}
          {flight && <div><dt>{copy.reviewAircraft}</dt><dd>{values.aircraft || copy.noPreference}</dd></div>}
          <div><dt>{partyLabel}</dt><dd>{values.pax}{flight && ` · ${copy.reviewRound}: ${values.roundTrip ? copy.yes : copy.no}`}</dd></div>
          <div><dt>{copy.name} / {copy.phone}</dt><dd>{values.name} · {values.phone}</dd></div>
          {values.email && <div><dt>{copy.email}</dt><dd>{values.email}</dd></div>}
          {values.org && <div><dt>{copy.org}</dt><dd>{values.org}</dd></div>}
          {values.notes && <div><dt>{copy.notes}</dt><dd>{values.notes}</dd></div>}
        </dl>
        <div className="concierge-review-edit">{[0,1,2,3].map(index=><button key={index} type="button" onClick={()=>{setStep(index);requestAnimationFrame(()=>headingRef.current?.focus());}}>{locale === "mn" ? "Засах" : "Edit"}: {copy.eyebrow[index].split(" / ")[1]}</button>)}</div>
        <p className="note note--block">{locale === "mn" ? "Таны мэдээллийг хүсэлтийг хянаж, тантай холбогдоход ашиглана." : "Your details are used to review this enquiry and contact you."} <Link href={`/${locale}/privacy`}>{locale === "mn" ? "Мэдээллийн нууцлал" : "About your information"} ↗</Link></p>
      </div>
    </>,
  ];

  return (
    <form onSubmit={onSubmit} className="form concierge-form">
      {SITE_KEY && <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" />}
      <div className="concierge-progress" aria-label={copy.progress}>
        {copy.eyebrow.map((label, index) => (
          <span className={`concierge-progress-step${index === step ? " active" : ""}${index < step ? " complete" : ""}`} aria-current={index === step ? "step" : undefined} key={label}>
            <i>{String(index + 1).padStart(2, "0")}</i><span>{label.split(" / ")[1]}</span>
          </span>
        ))}
      </div>
      {stepControls.map((controls, index) => (
        <fieldset className="concierge-step" disabled={index !== step} ref={(element) => { stepRefs.current[index] = element; }} key={index}>
          <legend className="visually-hidden">{copy.eyebrow[index]}</legend>
          {index === step && (
            <div className="concierge-step-heading">
              <p className="eyebrow">{copy.eyebrow[index]}</p>
              <h2 ref={headingRef} tabIndex={-1}>{stepTitles[index]}</h2>
              <p>{stepDescriptions[index]}</p>
            </div>
          )}
          <div className="concierge-fields">{controls}</div>
        </fieldset>
      ))}
      {SITE_KEY && step === copy.title.length - 1 && <div className="cf-turnstile concierge-full" data-sitekey={SITE_KEY} />}
      <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hp" />
      {state === "error" && <p className="notice err concierge-full" role="alert">{d.err}</p>}
      <div className="concierge-actions concierge-full">
        {step > 0 && <button className="concierge-back" type="button" onClick={previousStep} disabled={state === "sending"}>← {copy.back}</button>}
        <span className="concierge-step-count">{step + 1} {copy.stepOf} {copy.title.length}</span>
        {step < copy.title.length - 1 ? (
          <button className="btn" type="button" onClick={nextStep}>{copy.continue}<span aria-hidden="true">→</span></button>
        ) : (
          <button className="btn" type="submit" disabled={state === "sending"}>{state === "sending" ? copy.sending : copy.submit}<span aria-hidden="true">→</span></button>
        )}
      </div>
    </form>
  );
}
