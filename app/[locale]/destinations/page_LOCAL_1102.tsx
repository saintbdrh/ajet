import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Reveal from "@/components/Reveal";
import RouteMap from "@/components/RouteMap";
import { getDestinations, getMediaSlots, getPricing, getSiteCopy, mediaUrl, slotStill } from "@/lib/content";
import { isLocale, t } from "@/lib/i18n";
import { getWeather } from "@/lib/weather";
import { formatMinorAmount } from "@/lib/money";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: isLocale(locale) ? t(locale).dest.title : "" };
}

export default async function Destinations({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const [copy, dest, prices, slots] = await Promise.all([getSiteCopy(locale), getDestinations(), getPricing(), getMediaSlots()]);
  const fallbackPhotos = ["corporate", "membership"].map((key) => slots.find((slot) => slot.key === key)!);
  const d = t(locale, copy);
  const wx = await Promise.all(dest.map((p) => getWeather(p.lat, p.lng)));
  const points = dest
    .filter((point) => point.placeholder || point.coordinatesVerified)
    .map((p) => ({ id: p.id, name: p.name[locale], lat: p.lat, lng: p.lng }));
  return (
    <section className="wrap sec destinations-page">
      <Reveal direction="left"><p className="eyebrow">{d.dest.kicker}</p><h1>{d.dest.title}</h1></Reveal>
      <Reveal direction="image"><RouteMap points={points} label={d.dest.map} /></Reveal>
      {points.length === 0 && <p className="sample">{d.dest.coordinatesUnavailable}</p>}
      {dest.some((point) => point.placeholder) && <p className="sample">{d.dest.locationDisclaimer}</p>}
      {wx.some((weather) => weather?.status === "available") && <p className="sample">{d.dest.disclaimer}</p>}
      <div className="grid destination-showcase">
        {dest.map((p, i) => (
          <article key={p.id} className="place-card rv">
            <div className="place-image"><img src={p.imageKey ? mediaUrl(p.imageKey) : mediaUrl(slotStill(fallbackPhotos[i % 2]))} alt={p.alt[locale]} loading="lazy" style={{ objectPosition: `${p.focalX}% ${p.focalY}%` }} /></div>
            <div className="place-body"><h2>{p.name[locale]}</h2>
              {p.desc?.[locale] && <p>{p.desc[locale]}</p>}
              {prices.filter((price) => price.destinationId === p.id).map((price) => (
                <p className="destination-price" key={price.id}>
                  <strong>{locale === "mn" ? "Үүнээс эхэлнэ" : "From"} {formatMinorAmount(price.amountMinor, price.currency, locale)}</strong>
                  <span>{price.label[locale]}{price.note[locale] ? ` · ${price.note[locale]}` : ""}</span>
                </p>
              ))}
              {prices.some((price) => price.destinationId === p.id) && <p className="sample">{d.priceDisclaimer}</p>}
              {wx[i]?.status === "available" && <>
                <p className="wx">{d.dest.wx}: {wx[i].tempC} °C, {wx[i].windMs} {d.dest.ms}</p>
                <p className="sample">{d.dest.wxObserved}: <time dateTime={wx[i].observedAt}>{new Intl.DateTimeFormat(locale === "mn" ? "mn-MN" : "en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Ulaanbaatar" }).format(new Date(wx[i].observedAt))}</time></p>
                {Date.now() - Date.parse(wx[i].observedAt) > 2 * 60 * 60 * 1000 && <p className="sample">{d.dest.wxStale}</p>}
              </>}
              {wx[i]?.status === "unavailable" && <p className="sample">{d.dest.wxUnavailable}</p>}
              {p.placeholder && <p className="sample">{d.sample}</p>}
              {!p.placeholder && !p.coordinatesVerified && <p className="sample">{d.dest.coordinatesPending}</p>}
              {p.coordinatesVerified && p.coordinateSource && <p className="sample"><a href={p.coordinateSource} target="_blank" rel="noreferrer">Coordinate source ↗</a></p>}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
