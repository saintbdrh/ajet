import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Reveal from "@/components/Reveal";
import ExperienceCollection from "@/components/ExperienceCollection";
import LakeTour from "@/components/LakeTour";
import RouteMap from "@/components/RouteMap";
import Value from "@/components/Value";
import { getDestinations, getMediaSlots, getSiteCopy, mediaUrl, slotStill, variedSlots } from "@/lib/content";
import { isLocale, t } from "@/lib/i18n";
import { getWeather } from "@/lib/weather";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: isLocale(locale) ? t(locale).dest.title : "" };
}

export default async function Destinations({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const [copy, dest, slots] = await Promise.all([getSiteCopy(locale), getDestinations(), getMediaSlots()]);
  const d = t(locale, copy);
  const fallbackPhotos = variedSlots(slots, Math.max(dest.length, 1));
  const wx = await Promise.all(dest.map((p) => getWeather(p.lat, p.lng)));
  const points = dest
    .filter((point) => point.placeholder || point.coordinatesVerified)
    .map((p) => ({ id: p.id, name: p.name[locale], lat: p.lat, lng: p.lng }));

  return (
    <>
      <header className="pagehead">
        <div className="wrap">
          <p className="eyebrow">{d.dest.kicker}</p>
          <h1>{locale === "mn" ? "Аялал маршрут" : "Tour itineraries"}</h1>
          <p className="lede">{d.dest.intro}</p>
        </div>
      </header>

      <LakeTour locale={locale} />
      <ExperienceCollection locale={locale} />
      <section className="section section--tight">
        <div className="wrap">
          <Reveal direction="image"><RouteMap points={points} label={d.dest.map} /></Reveal>
          <div className="notes">
            {points.length === 0 && <p className="note">{d.dest.coordinatesUnavailable}</p>}
            {dest.some((point) => point.placeholder) && <p className="note">{d.dest.locationDisclaimer}</p>}
            {wx.some((weather) => weather?.status === "available") && <p className="note">{d.dest.disclaimer}</p>}
          </div>
        </div>
      </section>

      <section className="section section--alt">
        <div className="wrap">
          <div className="destgrid destgrid--page">
            {dest.map((place, index) => (
              <article key={place.id} className="place rv">
                <div className="place__media">
                  <img
                    src={place.imageKey ? mediaUrl(place.imageKey) : mediaUrl(slotStill(fallbackPhotos[index % fallbackPhotos.length]))}
                    alt={place.alt[locale]}
                    loading="lazy"
                    style={{ objectPosition: `${place.focalX}% ${place.focalY}%` }}
                  />
                </div>
                <div className="place__body">
                  <h2>{place.name[locale]}</h2>
                  {place.desc?.[locale] && <p>{place.desc[locale]}</p>}

                  <dl className="place__meta">
                    <div><dt>{d.dest.time}</dt><dd><Value>{d.dest.pending}</Value></dd></div>
                    {wx[index]?.status === "available" && (
                      <div>
                        <dt>{d.dest.wx}</dt>
                        <dd>{wx[index].tempC} °C · {wx[index].windMs} {d.dest.ms}</dd>
                      </div>
                    )}
                  </dl>

                  {wx[index]?.status === "available" && (
                    <p className="note">
                      {d.dest.wxObserved}:{" "}
                      <time dateTime={wx[index].observedAt}>
                        {new Intl.DateTimeFormat(locale === "mn" ? "mn-MN" : "en-US", {
                          dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Ulaanbaatar",
                        }).format(new Date(wx[index].observedAt))}
                      </time>
                      {Date.now() - Date.parse(wx[index].observedAt) > 2 * 60 * 60 * 1000 && ` · ${d.dest.wxStale}`}
                    </p>
                  )}
                  {wx[index]?.status === "unavailable" && <p className="note">{d.dest.wxUnavailable}</p>}
                  {place.placeholder && <p className="note">{d.sample}</p>}
                  {!place.placeholder && !place.coordinatesVerified && <p className="note">{d.dest.coordinatesPending}</p>}
                  {place.coordinatesVerified && place.coordinateSource && (
                    <p className="note"><a href={place.coordinateSource} target="_blank" rel="noreferrer">Coordinate source ↗</a></p>
                  )}

                  <Link href={`/${locale}/quote`} className="link-arrow">{d.cta.btn}</Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="cta cta--compact">
        <div className="wrap">
          <h2>{d.cta.title}</h2>
          <p className="lede">{d.cta.sub}</p>
          <Link href={`/${locale}/quote`} className="btn">{d.cta.btn}<span aria-hidden="true">↗</span></Link>
        </div>
      </section>
    </>
  );
}
