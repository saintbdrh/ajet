import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Reveal from "@/components/Reveal";
import { getFleet, getMediaSlots, getSiteCopy, mediaUrl, slotStill } from "@/lib/content";
import { isLocale, t } from "@/lib/i18n";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: isLocale(locale) ? t(locale, await getSiteCopy(locale)).fleet.title : "" };
}

export default async function Fleet({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const [copy, fleet, slots] = await Promise.all([getSiteCopy(locale), getFleet(), getMediaSlots()]);
  const fallbackPhotos = ["hero", "corporate", "membership"].map((key) => slots.find((slot) => slot.key === key)!);
  const d = t(locale, copy);
  return (
    <section className="wrap sec fleet-page">
      <Reveal direction="left"><p className="eyebrow">{d.fleet.kicker}</p><h1>{d.fleet.title}</h1>
      <p className="lead">{d.fleet.intro}</p></Reveal>
      {fleet.length === 0 && <p>{d.fleet.empty}</p>}
      <div className="fleet-grid fleet-showcase">{fleet.map((a, index) => {
        const specs: [string, string][] = [];
        if (a.seats) specs.push([d.fleet.seats, String(a.seats)]);
        if (a.rangeKm) specs.push([d.fleet.range, `${a.rangeKm} km`]);
        if (a.cruiseKmh) specs.push([d.fleet.speed, `${a.cruiseKmh} km/h`]);
        if (a.payloadKg) specs.push([d.fleet.payload, `${a.payloadKg} kg`]);
        return (
          <article key={a.id} className="ac rv">
            <div className="ph"><img src={a.imageKey ? mediaUrl(a.imageKey) : mediaUrl(slotStill(fallbackPhotos[index % 3]))} alt={a.alt[locale]} loading="lazy" style={{ objectPosition: `${a.focalX}% ${a.focalY}%` }} /></div>
            <div className="bd"><span className="tag">{d.fleet.kicker}</span>
              <h2>{a.name}</h2>
              {a.desc?.[locale] && <p>{a.desc[locale]}</p>}
              {specs.length > 0 && <dl className="specs">{specs.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>}
              {a.placeholder && <p className="sample">{d.sample}</p>}
              {!a.placeholder && !a.specificationsVerified && <p className="sample">{d.fleet.specificationsPending}</p>}
              {a.specificationsVerified && a.specificationSource && <p className="sample"><a href={a.specificationSource} target="_blank" rel="noreferrer">Specification source ↗</a></p>}
            </div>
          </article>
        );
      })}</div>
    </section>
  );
}
