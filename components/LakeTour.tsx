"use client";
import Link from "next/link";
import { useState } from "react";
import { lakeStops, lakeTour, type LakeRoute } from "@/lib/lake-tour";
import type { Locale } from "@/lib/i18n";

export default function LakeTour({ locale }: { locale: Locale }) {
  const [route, setRoute] = useState<LakeRoute>("tuul");
  const tour = lakeTour[locale];
  const mn = locale === "mn";
  return (
    <section id="khagiin-khar" className="lake-tour section" aria-labelledby="lake-title">
      <div className="wrap lake-layout">
        <div>
          <p className="eyebrow">A-JET AVIATION</p>
          <h2 id="lake-title">{tour.title}</h2>
          <fieldset className="lake-options">
            <legend>{mn ? "Маршрутаа сонгоно уу" : "Choose your route"}</legend>
            {(["tuul", "city"] as const).map(option => (
              <label key={option}>
                <input type="radio" name="lake-route" checked={route === option} onChange={() => setRoute(option)} />
                {tour[option]}
              </label>
            ))}
          </fieldset>
          <ol className="lake-stops" aria-live="polite">
            {lakeStops(locale, route).map((stop, index) => <li key={index}>{stop}</li>)}
          </ol>
        </div>
        <aside className="lake-fare" aria-label={mn ? "Аяллын үнэ" : "Tour price"}>
          <p>{mn ? "8 хүний нийт үнэ" : "Total for 8 people"}</p>
          <strong>10,500 <small>USD</small></strong>
          <p>{mn ? "8 хүнээр тооцвол нэг хүний" : "Per person in a group of 8"} <b>1,312.50 USD</b></p>
          <p className="lake-notice">{tour.notice}</p>
          <Link className="btn" href={`/${locale}/quote?service=charter&tour=khagiin-khar&via=${route}`}>
            {mn ? "Энэ маршрутаар хүсэлт илгээх" : "Enquire about this route"} ↗
          </Link>
        </aside>
      </div>
    </section>
  );
}
