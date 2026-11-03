"use client";
import Link from "next/link";
import { useState } from "react";
import type { Locale } from "@/lib/i18n";
import { experienceCopy, expressSites, expressItinerary } from "@/lib/experiences";

export default function AirportExpress({ locale }: { locale: Locale }) {
  const d = experienceCopy[locale];
  const [direction, setDirection] = useState("to-city");
  const [site, setSite] = useState<string>(expressSites[0].id);
  const route = expressItinerary(locale, site, direction);
  const query = new URLSearchParams({ service: "airport-express", site, direction });
  return <div className="express-planner">
    <div className="express-direction" role="group" aria-label={locale === "mn" ? "Нислэгийн чиглэл" : "Transfer direction"}>
      <button type="button" aria-pressed={direction === "to-city"} onClick={() => setDirection("to-city")}>{d.toCity}</button>
      <button type="button" aria-pressed={direction === "to-airport"} onClick={() => setDirection("to-airport")}>{d.toAirport}</button>
    </div>
    <label className="express-select">{d.citySite}<select value={site} onChange={(event) => setSite(event.target.value)}>{expressSites.map((place) => <option key={place.id} value={place.id}>{place[locale]}</option>)}</select></label>
    <div className="express-route" aria-live="polite"><div><span>01</span><h3>{route.from}</h3></div><span className="express-route__line" aria-hidden="true">↓</span><div><span>02</span><h3>{route.to}</h3></div></div>
    <div className="express-summary"><div><strong>{d.duration}</strong><span>{d.durationLabel}</span></div><Link className="btn" href={`/${locale}/quote?${query}`}>{d.request}<span aria-hidden="true">↗</span></Link></div>
    <p className="note">{d.pickup}</p><p className="note">{d.flightNote}</p>
  </div>;
}
