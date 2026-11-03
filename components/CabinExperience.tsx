"use client";
import { useState } from "react";
import type { Locale } from "@/lib/i18n";
import { journeyCopy } from "@/lib/journey";

export default function CabinExperience({ locale }: { locale: Locale }) {
  const d = journeyCopy[locale]; const [exterior, setExterior] = useState(false);
  return <section className="section cabin-experience" aria-labelledby="cabin-title"><div className="wrap cabin-experience__grid">
    <div><div className="cabin-experience__image"><img src={`/img/ajet/${exterior ? "ec145-rooftop" : "ec145-cabin"}.webp`} alt={exterior ? d.exteriorAlt : d.cabinAlt} width={exterior ? 1600 : 1333} height={exterior ? 1066 : 1031} loading="lazy" /></div><div className="cabin-experience__views" role="group" aria-label={locale === "mn" ? "Нисдэг тэрэгний зураг" : "Aircraft photographs"}><button type="button" aria-pressed={!exterior} onClick={() => setExterior(false)}>{d.cabinView}</button><button type="button" aria-pressed={exterior} onClick={() => setExterior(true)}>{d.exteriorView}</button><a href="#aircraft-viewer">{d.studioView} ↗</a></div></div>
    <div className="cabin-experience__copy"><p className="eyebrow">{d.cabinKicker}</p><h2 id="cabin-title">{d.cabinTitle}</h2><p className="lede">{d.cabinIntro}</p><dl className="cabin-experience__facts"><div><dt>{d.seats}</dt><dd>{d.seatsLabel}</dd></div><div><dt>{d.engines}</dt><dd>{d.enginesLabel}</dd></div></dl><p className="note">{d.cabinNote}</p><ul>{d.care.map((care) => <li key={care.title}><h3>{care.title}</h3><p>{care.body}</p></li>)}</ul></div>
  </div></section>;
}
