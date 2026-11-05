"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import PlannerMap from "@/components/PlannerMap";
import { distanceKm, plannerCopy, plannerEnquiry, validCoordinates, type PlannerPoint } from "@/lib/planner";
import type { Locale } from "@/lib/i18n";

type AircraftOption = { name: string; seats: number; image?: string };
export type PlannerJourney = { from: PlannerPoint; to: PlannerPoint; roundTrip: boolean; pax: string; waiting: string; date: string; aircraft: string };

export default function FlightPlanner({ locale, places, aircraft, initialJourney }: { locale: Locale; places: PlannerPoint[]; aircraft: AircraftOption[]; initialJourney?: PlannerJourney }) {
  const d = plannerCopy[locale], mn = locale === "mn";
  const text = (en: string, mongolian: string) => mn ? mongolian : en;
  const [from, setFrom] = useState(initialJourney?.from ?? places[0]);
  const [to, setTo] = useState<PlannerPoint | null>(initialJourney?.to ?? null);
  const [active, setActive] = useState<"from" | "to">("to");
  const [roundTrip, setRoundTrip] = useState(initialJourney?.roundTrip ?? true);
  const [pax, setPax] = useState(initialJourney?.pax ?? String(Math.min(4, aircraft[0].seats)));
  const [waiting, setWaiting] = useState(initialJourney?.waiting ?? "2");
  const [date, setDate] = useState(initialJourney?.date ?? "");
  const [aircraftIndex, setAircraftIndex] = useState(Math.max(0, aircraft.findIndex(a => a.name === initialJourney?.aircraft)));
  const [picker, setPicker] = useState<"from" | "to" | null>(null);
  const [search, setSearch] = useState("");
  const [coordsOpen, setCoordsOpen] = useState(false);
  const [coords, setCoords] = useState({ lat: "", lng: "" });
  const [coordinateMessage, setCoordinateMessage] = useState("");
  const [restored, setRestored] = useState(false);
  const [shareStatus, setShareStatus] = useState("");
  const [shareFallback, setShareFallback] = useState("");
  const [mobileView, setMobileView] = useState<"route" | "map">("route");
  const reviewDialog = useRef<HTMLDialogElement>(null);
  const panel = useRef<HTMLElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const selected = aircraft[aircraftIndex];
  const distance = to ? distanceKm(from, to) : 0;
  const total = distance * (roundTrip ? 2 : 1);
  const number = (v: number) => new Intl.NumberFormat(mn ? "mn-MN" : "en-US", { maximumFractionDigits: v < 100 ? 1 : 0 }).format(v);
  const passengersValid = Number.isInteger(Number(pax)) && Number(pax) >= 1 && Number(pax) <= selected.seats;
  const waitingValid = waiting !== "" && Number.isFinite(Number(waiting)) && Number(waiting) >= 0 && Number(waiting) <= 168;
  const today = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ulaanbaatar',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const dateValid = !date || (/^\d{4}-\d{2}-\d{2}$/.test(date) && date >= today);
  const valid = !!to && distance >= .1 && passengersValid && waitingValid && dateValid;
  const suggestions = places.filter(p => p.id !== from.id).slice(0, 4);
  const matching = places.filter(p => p.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  useEffect(() => {
    const query = Object.fromEntries(new URLSearchParams(window.location.search));
    const saved = plannerEnquiry(query,locale,aircraft);
    if(saved) {
      const restorePoint = (name:string,lat:number,lng:number,target:string):PlannerPoint => places.find(p=>Math.abs(p.lat-lat)<.00001 && Math.abs(p.lng-lng)<.00001) ?? {id:`custom-${target}`,name,lat,lng};
      setFrom(restorePoint(saved.from,Number(query.fromLat),Number(query.fromLng),"from"));
      setTo(restorePoint(saved.to,Number(query.toLat),Number(query.toLng),"to"));
      setPax(saved.pax);setWaiting(query.waiting);setDate(saved.date);setRoundTrip(saved.roundTrip);
      setAircraftIndex(Math.max(0,aircraft.findIndex(a=>a.name===saved.aircraft)));
    }
    setRestored(true);
  },[]); // Restore the URL when browser history remounts a cached page.
  useEffect(() => { if (picker) searchInput.current?.focus({ preventScroll: true }); }, [picker]);
  useEffect(() => {
    const close = (e: KeyboardEvent) => { if (e.key === "Escape") { setPicker(null); setCoordsOpen(false); } };
    const outside = (e: PointerEvent) => { if (!panel.current?.contains(e.target as Node)) setPicker(null); };
    document.addEventListener("keydown", close); document.addEventListener("pointerdown", outside);
    return () => { document.removeEventListener("keydown", close); document.removeEventListener("pointerdown", outside); };
  }, []);
  function choosePoint(point: PlannerPoint, target = active) {
    if (target === "from") setFrom(point); else setTo(point);
    setActive(target); setCoords({ lat: String(point.lat), lng: String(point.lng) }); setCoordinateMessage(""); setPicker(null); setShareStatus(""); setShareFallback("");
  }
  function pick(lat: number, lng: number, target = active) {
    if (!validCoordinates(lat, lng)) return;
    choosePoint({ id: `custom-${target}`, name: `${text("Map point", "Сонгосон цэг")} (${lat.toFixed(4)}, ${lng.toFixed(4)})`, lat: Number(lat.toFixed(5)), lng: Number(lng.toFixed(5)) }, target);
  }
  function coordinateApply() {
    const lat = Number(coords.lat), lng = Number(coords.lng);
    if (!coords.lat.trim() || !coords.lng.trim() || !validCoordinates(lat, lng)) { setCoordinateMessage(d.invalid); return; }
    pick(lat, lng); setCoordinateMessage(d.saved);
  }
  function openPicker(target: "from" | "to") { setPicker(picker === target ? null : target); setActive(target); setSearch(""); }
  function setMapTarget(target: "from" | "to", reveal = true) {
    setActive(target); setPicker(null); const point = target === "from" ? from : to;
    setCoords({ lat: point ? String(point.lat) : "", lng: point ? String(point.lng) : "" }); setCoordinateMessage(""); if(reveal)setMobileView("map");
  }
  function reverse() {
    if (!to) return;
    setFrom(to); setTo(from); const point = active === "from" ? to : from;
    setCoords({ lat: String(point.lat), lng: String(point.lng) }); setShareStatus(""); setShareFallback("");
  }
  function reset() { setFrom(places[0]); setTo(null); setActive("to"); setRoundTrip(true); setPax(String(Math.min(4, aircraft[0].seats))); setWaiting("2"); setDate(""); setAircraftIndex(0); setCoords({ lat: "", lng: "" }); setCoordinateMessage(""); setPicker(null); setCoordsOpen(false); setShareStatus(""); setShareFallback(""); }
  const query = new URLSearchParams({ service: "charter", planner: "1", from: from.name, to: to?.name ?? "", fromLat: String(from.lat), fromLng: String(from.lng), toLat: String(to?.lat ?? ""), toLng: String(to?.lng ?? ""), roundTrip: String(roundTrip), pax, waiting, date, aircraft: selected.name });
  const serializedQuery = query.toString();
  const hasDestination = Boolean(to);
  useEffect(() => {
    if(!restored)return;
    setShareStatus(""); setShareFallback("");
    if(valid)window.history.replaceState(null,"",`/${locale}/estimate?${serializedQuery}`);
    else if(!hasDestination && window.location.search)window.history.replaceState(null,"",`/${locale}/estimate`);
  },[serializedQuery,valid,locale,hasDestination,restored]);
  async function share() {
    const url = `${window.location.origin}/${locale}/estimate?${query}`;
    try { await navigator.clipboard.writeText(url); setShareStatus(text("Journey link copied", "Аяллын холбоосыг хууллаа")); }
    catch { setShareFallback(url); setShareStatus(text("Copy your journey link below", "Доорх аяллын холбоосыг хуулна уу")); }
  }
  const activePoint = active === "from" ? from : to;
  const routeAction = valid ? d.request : text("Choose your destination", "Очих газраа сонгоорой");
  return <section className={`atlas-page atlas-page--${mobileView}`} aria-label={text("A-JET journey planner", "A-JET аялал төлөвлөгч")}>
    <div className="atlas-mobile-tabs" role="group" aria-label={text("Planner view", "Төлөвлөгчийн харагдац")}>
      <button type="button" aria-pressed={mobileView === "route"} onClick={() => setMobileView("route")}>{text("Your journey", "Таны аялал")}</button>
      <button type="button" aria-pressed={mobileView === "map"} onClick={() => setMobileView("map")}>{text("Explore the map", "Газрын зураг")} <span aria-hidden="true">↗</span></button>
    </div>
    <div className="atlas-workspace">
      <aside className="atlas-panel" ref={panel} aria-label={d.details}>
        <div className="atlas-panel-scroll">
          <header className="atlas-heading"><div className="atlas-kicker"><span>A-JET / {text("JOURNEY PLANNER", "АЯЛАЛ ТӨЛӨВЛӨЛТ")}</span><button type="button" onClick={reset} aria-label={d.reset} title={d.reset}>↺</button></div><h1>{text("Where will we\ntake you?", "Хаашаа\nнисэх вэ?")}</h1><p><a href="#khagiin-khar" className="atlas-tour-shortcut">{text("Explore the Khagiin Khar Lake tour", "Хагийн Хар нуурын аяллыг үзэх")} <span aria-hidden="true">↓</span></a></p></header>
          <ol className="atlas-progress" aria-label={text("Journey steps", "Аяллын алхмууд")}><li aria-current={!to?"step":undefined}>01 {text("Route", "Чиглэл")}</li><li aria-current={to?"step":undefined}>02 {text("Details", "Мэдээлэл")}</li><li>03 {text("Review", "Хянах")}</li></ol>
          <div className="atlas-trip-type" role="group" aria-label={text("Journey type", "Аяллын төрөл")}><button type="button" aria-pressed={!roundTrip} onClick={() => setRoundTrip(false)}>{d.oneWay}</button><button type="button" aria-pressed={roundTrip} onClick={() => setRoundTrip(true)}>{d.return}<span aria-hidden="true">⇄</span></button></div>
          <div className="atlas-route">
            {(["from", "to"] as const).map(target => { const point = target === "from" ? from : to; return <div className={`atlas-route-stop${active === target ? " is-active" : ""}`} key={target}>
              <button className="atlas-stop-dot" type="button" aria-label={`${d.point} ${target === "from" ? "A" : "B"}`} aria-pressed={active === target} onClick={() => setMapTarget(target)}>{target === "from" ? "A" : "B"}</button>
              <button className="atlas-place-button" type="button" aria-expanded={picker === target} aria-controls={picker === target ? "atlas-place-search" : undefined} onClick={() => openPicker(target)}><span>{d[target]}</span><strong>{point ? (point.id.startsWith("custom-") ? text("A place of your own", "Таны сонгосон цэг") : point.name) : text("Where would you like to go?", "Хаашаа явах вэ?")}</strong><small>{point ? `${Math.abs(point.lat).toFixed(4)}° ${point.lat >= 0 ? "N" : "S"} · ${Math.abs(point.lng).toFixed(4)}° ${point.lng >= 0 ? "E" : "W"}` : text("Choose a place or pick on the map", "Байршил эсвэл зураг дээрээс сонгох")}</small><i aria-hidden="true">⌄</i></button>
            </div>; })}
            <button className="atlas-swap" type="button" disabled={!to} aria-label={d.swap} onClick={reverse}>⇅</button>
          </div>
          {picker && <div className="atlas-place-search" id="atlas-place-search"><div><input ref={searchInput} aria-label={text("Search destinations", "Байршил хайх")} placeholder={text("Find your destination…", "Байршил хайх…")} value={search} onChange={e => setSearch(e.target.value)} /><button type="button" aria-label={text("Close places", "Байршлын жагсаалт хаах")} onClick={() => setPicker(null)}>×</button></div><ul>{matching.map(p => <li key={p.id}><button type="button" onClick={() => choosePoint(p, picker)}><span><b>{p.name}</b><small>{p.lat.toFixed(3)}° · {p.lng.toFixed(3)}°</small></span><span aria-hidden="true">↗</span></button></li>)}</ul>{matching.length === 0 && <p>{text("No matches. Choose a point on the map instead.", "Байршил олдсонгүй. Газрын зураг дээр цэг сонгоорой.")}</p>}<button className="atlas-pick-map" type="button" onClick={() => setMapTarget(picker)}>⌖ {text("Choose directly on the map", "Газрын зураг дээрээс сонгох")}</button></div>}
          <div className="atlas-compact-fields">
            <label className="atlas-date"><span>{text("Travel date", "Нисэх өдөр")}</span><input type="date" min={today} aria-invalid={!dateValid} aria-label={d.date} value={date} onChange={e => setDate(e.target.value)} /></label>
            <div className="atlas-passengers"><label htmlFor="atlas-pax">{d.passengers}</label><div><button type="button" aria-label={text("Fewer passengers", "Зорчигч хасах")} disabled={Number(pax) <= 1} onClick={() => setPax(String(Math.max(1, (Number(pax) || 1) - 1)))}>−</button><input id="atlas-pax" type="number" min="1" max={selected.seats} step="1" value={pax} aria-invalid={!passengersValid} onChange={e => setPax(e.target.value)} /><button type="button" aria-label={text("More passengers", "Зорчигч нэмэх")} disabled={Number(pax) >= selected.seats} onClick={() => setPax(String(Math.min(selected.seats, (Number(pax) || 0) + 1)))}>+</button></div></div>
          </div>
          {!dateValid && <p className="atlas-error" role="status">{text("Choose today or a future date.", "Өнөөдөр эсвэл дараагийн өдрийг сонгоно уу.")}</p>}
          {!passengersValid && <p className="atlas-error" role="status">{text(`Choose 1–${selected.seats} passengers.`, `Зорчигчийн тоог 1–${selected.seats} хооронд оруулна уу.`)}</p>}
          <details className="atlas-more"><summary>{text("Time on the ground", "Очих газарт байх хугацаа")}<span>{waiting || "0"} {d.hours} ＋</span></summary><label>{d.waiting}<input type="number" min="0" max="168" step="any" value={waiting} aria-invalid={!waitingValid} onChange={e => setWaiting(e.target.value)} /></label><p>{d.waitingNote}</p>{!waitingValid && <p className="atlas-error">{text("Enter 0–168 hours.", "0–168 цагийн хооронд оруулна уу.")}</p>}</details>
          <div className="atlas-aircraft"><img src={selected.image || "/img/ajet/studio-detail.webp"} alt="" /><div><span>{text("YOUR AIRCRAFT PREFERENCE", "НИСДЭГ ТЭРЭГНИЙ СОНГОЛТ")}</span>{aircraft.length > 1 ? <select aria-label={d.aircraft} value={aircraftIndex} onChange={e => { const index = Number(e.target.value); setAircraftIndex(index); setPax(String(Math.min(Number(pax) || 1, aircraft[index].seats))); }}>{aircraft.map((a,i) => <option key={a.name} value={i}>{a.name}</option>)}</select> : <b>{selected.name}</b>}<small>{text(`Up to ${selected.seats} guests`, `${selected.seats} хүртэл зорчигч`)} · {text("Private charter", "Хувийн нислэг")}</small></div><span className="atlas-aircraft-check" aria-hidden="true">✓</span></div>
          <details className="atlas-coordinates" open={coordsOpen} onToggle={e => setCoordsOpen(e.currentTarget.open)}><summary>{d.coordinateTitle}<span>{active === "from" ? "A" : "B"} ＋</span></summary><div className="atlas-coordinate-target"><button type="button" aria-pressed={active === "from"} onClick={() => setMapTarget("from",false)}>A · {d.from}</button><button type="button" aria-pressed={active === "to"} onClick={() => setMapTarget("to",false)}>B · {d.to}</button></div><div className="atlas-coordinate-fields"><label>{d.lat}<input inputMode="decimal" placeholder={String(activePoint?.lat ?? 47.92)} value={coords.lat} onChange={e => setCoords({ ...coords, lat: e.target.value })} /></label><label>{d.lng}<input inputMode="decimal" placeholder={String(activePoint?.lng ?? 106.92)} value={coords.lng} onChange={e => setCoords({ ...coords, lng: e.target.value })} /></label></div><button type="button" className="atlas-coordinate-apply" onClick={coordinateApply}>{d.apply} ↗</button><p role="status">{coordinateMessage}</p></details>
        </div>
        <div className="atlas-panel-footer">
          <div className="atlas-distance" aria-live="polite"><div><span>{d.total}</span><strong>{to ? number(total) : "—"}<small>{d.km}</small></strong></div><div><span>{d.direct}</span><b>{to ? number(distance) : "—"} {d.km}</b><small>{text("Direct distance", "Хоёр цэгийн шулуун зай")}</small></div></div>
          {valid ? <button type="button" className="atlas-continue" onClick={()=>reviewDialog.current?.showModal()}>{text("Review your journey", "Аяллаа хянах")}<span aria-hidden="true">↗</span></button> : <button className="atlas-continue" type="button" onClick={() => { if (!to) { openPicker("to"); setMobileView("route"); } }} disabled={!!to && !valid}>{routeAction}<span aria-hidden="true">↗</span></button>}
          {to && distance < .1 && <p className="atlas-error" role="status">{d.same}</p>}
          <p className="atlas-route-guidance">{text("Map selections are reference points, not approved landing sites. Flight time and landing arrangements are confirmed by our team.", "Сонгосон цэгүүд нь баталгаажсан буух талбай биш. Нислэгийн хугацаа, буух боломжийг манай баг шалгана.")}</p>
          <p className="atlas-private">{text("A private quotation. A journey made for you.", "Танд зориулсан аялал. Тусгайлан өгөх санал.")}</p>
        </div>
      </aside>
      <div className="atlas-map-panel">
        <PlannerMap from={from} to={to} active={active} onPick={pick} onMove={(target,lat,lng) => pick(lat,lng,target)} places={places} onPlace={point => choosePoint(point,"to")} locale={locale} label={d.mapLabel} loading={d.loading} errorText={d.mapError} />
        <div className="atlas-map-heading"><p>{text("MONGOLIA, ON YOUR TERMS", "МОНГОЛ ОРОН · ТАНЫ ХҮСЛЭЭР")}</p><h2>{to ? (to.id.startsWith("custom-") ? text("Your own corner of Mongolia.", "Таны сонгосон аялал.") : to.name) : text("Extraordinary starts here.", "Онцгой аялал эндээс.")}</h2><span>{to ? `${from.id.startsWith("custom-") ? text("Your departure", "Эхлэх цэг") : from.name} ${roundTrip ? "⇄" : "→"} ${to.id.startsWith("custom-") ? text("Your destination", "Очих цэг") : to.name}` : text("Choose a destination. Leave the rest to us.", "Чиглэлээ сонгоорой. Үлдсэнийг бид төлөвлөе.")}</span></div>
        <div className="atlas-map-actions"><button type="button" onClick={share} disabled={!valid} aria-label={text("Copy journey link", "Аяллын холбоос хуулах")}><span aria-hidden="true">↗</span>{text("Share journey", "Аяллаа хуваалцах")}</button><span role="status">{shareStatus}</span>{shareFallback && <input aria-label={text("Journey link", "Аяллын холбоос")} readOnly value={shareFallback} onFocus={e => e.target.select()} />}</div>
        <div className="atlas-discover"><div className="atlas-discover-heading"><p>{text("A LITTLE INSPIRATION", "АЯЛЛЫН САНАА")}</p><span>{text("Or choose any point on the map", "Эсвэл зураг дээр хүссэн цэгээ сонгох")}</span></div><div className="atlas-destination-cards">{suggestions.map((p,i) => <button type="button" key={p.id} className={`atlas-destination atlas-destination--${p.id}${to?.id === p.id ? " is-selected" : ""}`} onClick={() => choosePoint(p,"to")} aria-pressed={to?.id === p.id}><div className="atlas-destination-art" aria-hidden="true"><svg viewBox="0 0 160 90"><path d="M-10 80 35 32 66 57 103 5 170 76M-5 100 35 52 66 78 103 25 170 96M-10 60 35 12 66 37 103 -15 170 56"/><circle cx="120" cy="22" r="8"/></svg><span>0{i+1}</span></div><div><span><b>{p.name}</b><small>{number(distanceKm(from,p))} {d.km} · {text("direct", "шулуун зай")}</small></span><i aria-hidden="true">↗</i></div></button>)}</div></div>
        <div className="atlas-map-mobile-brief"><div><span>{to ? text("TOTAL DIRECT DISTANCE", "НИЙТ ШУЛУУН ЗАЙ") : text("YOUR NEXT JOURNEY", "ТАНЫ ДАРААГИЙН АЯЛАЛ")}</span><b>{to ? `${number(total)} ${d.km}` : text("Choose a destination", "Очих газраа сонгох")}</b></div><button type="button" onClick={() => { setMobileView("route"); if(!to)openPicker("to"); }}>{text("Trip details", "Аяллын мэдээлэл")} ↗</button></div>
      </div>
    </div>
    <dialog ref={reviewDialog} className="signature-dialog" aria-labelledby="journey-review-title"><button type="button" className="dialog-close" onClick={()=>reviewDialog.current?.close()}>{text("Back to planning", "Төлөвлөлт рүү буцах")} ×</button><p className="eyebrow">A-JET / 03</p><h2 id="journey-review-title">{text("Your journey, at a glance.", "Таны аяллын тойм.")}</h2><dl><div><dt>{d.from}</dt><dd>{from.name}</dd></div><div><dt>{d.to}</dt><dd>{to?.name}</dd></div><div><dt>{text("Journey", "Аялал")}</dt><dd>{roundTrip?d.return:d.oneWay}</dd></div><div><dt>{d.date}</dt><dd>{date||text("To be discussed", "Тохиролцоно")}</dd></div><div><dt>{d.passengers}</dt><dd>{pax}</dd></div><div><dt>{d.waiting}</dt><dd>{waiting} {d.hours}</dd></div><div><dt>{d.aircraft}</dt><dd>{selected.name}</dd></div><div><dt>{text("Total direct distance", "Нийт шулуун зай")}</dt><dd>{number(total)} {d.km}</dd></div></dl><p className="review-note">{text("This is a planning outline, not a flight reservation. Your operations team will confirm the flown route, landing permissions, aircraft, luggage allowance and written proposal. You can add catering, photography and transfers in the next step.", "Энэ нь нислэгийн захиалга бус, аяллын төлөвлөгөө юм. Манай баг нисэх маршрут, буух зөвшөөрөл, нисдэг тэрэг, ачааны боломжийг шалгаж бичгээр санал өгнө. Дараагийн алхамд кейтеринг, зураг авалт, газрын тээврээ нэмэх боломжтой.")}</p><Link className="btn" href={`/${locale}/quote?${query}`}>{text("Continue to private enquiry", "Хүсэлтээ үргэлжлүүлэх")} ↗</Link></dialog>
    <div className="atlas-afterword"><span>{text("PERSONAL BY NATURE.", "ТАНД ЗОРИУЛСАН ҮЙЛЧИЛГЭЭ.")}</span><p>{text("Map points are places to explore, not confirmed landing sites. Our team confirms the flown route, time, fuel arrangements and landing permissions with your private proposal.", "Зураг дээрх цэгүүд нь аяллын байршил бөгөөд баталгаажсан буух талбай биш. Манай баг нисэх зам, хугацаа, түлш болон буух зөвшөөрлийг шалгаж, үнийн саналтай хамт тохиролцоно.")}</p></div>
  </section>;
}
