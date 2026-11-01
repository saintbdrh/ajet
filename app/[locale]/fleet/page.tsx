import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import AircraftPortrait from "@/components/AircraftPortrait";
import Reveal from "@/components/Reveal";
import Value from "@/components/Value";
import { getFleet, getSiteCopy, mediaUrl } from "@/lib/content";
import { isLocale, t } from "@/lib/i18n";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: isLocale(locale) ? t(locale).fleet.title : "" };
}

export default async function Fleet({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const [copy, fleet] = await Promise.all([getSiteCopy(locale), getFleet()]);
  const d = t(locale, copy);

  return (
    <>
      <header className="pagehead">
        <div className="wrap">
          <p className="eyebrow">{d.fleet.kicker}</p>
          <h1>{d.fleet.title}</h1>
          <p className="lede">{d.fleet.intro}</p>
        </div>
      </header>

      <section className="section section--tight">
        <div className="wrap">
          <Reveal direction="image"><AircraftPortrait locale={locale} /></Reveal>
        </div>
      </section>

      <section className="section section--alt">
        <div className="wrap">
          {fleet.length === 0 && <p className="empty">{d.fleet.empty}</p>}
          <div className="fleetlist fleetlist--detail">
            {fleet.map((aircraft, index) => {
              const specs: [string, string][] = [];
              if (aircraft.seats) specs.push([d.fleet.seats, String(aircraft.seats)]);
              if (aircraft.rangeKm) specs.push([d.fleet.range, `${aircraft.rangeKm} km`]);
              if (aircraft.cruiseKmh) specs.push([d.fleet.speed, `${aircraft.cruiseKmh} km/h`]);
              if (aircraft.payloadKg) specs.push([d.fleet.payload, `${aircraft.payloadKg} kg`]);
              return (
                <article className="acft acft--wide" key={aircraft.id}>
                  <div className="acft__media">
                    {aircraft.imageKey ? (
                      <img
                        src={mediaUrl(aircraft.imageKey)}
                        alt={aircraft.alt[locale]}
                        loading="lazy"
                        style={{ objectPosition: `${aircraft.focalX}% ${aircraft.focalY}%` }}
                      />
                    ) : (
                      <div className="acft__plate">
                        <span className="acft__plate-mark" aria-hidden="true" />
                        <span>{d.fleet.noPhoto}</span>
                      </div>
                    )}
                  </div>
                  <div className="acft__body">
                    <span className="acft__index">{String(index + 1).padStart(2, "0")}</span>
                    <h2>{aircraft.name}</h2>
                    {aircraft.desc?.[locale] && <p className="lede">{aircraft.desc[locale]}</p>}
                    {specs.length > 0 && (
                      <dl className="spec">
                        {specs.map(([key, value]) => <div className="spec__row" key={key}><dt>{key}</dt><dd>{value}</dd></div>)}
                      </dl>
                    )}
                    {aircraft.placeholder && <p className="note">{d.sample}</p>}
                    {!aircraft.placeholder && !aircraft.specificationsVerified && <p className="note">{d.fleet.specificationsPending}</p>}
                    {aircraft.specificationsVerified && aircraft.specificationSource && (
                      <p className="note">
                        <a href={aircraft.specificationSource} target="_blank" rel="noreferrer">{d.fleet.verified} ↗</a>
                      </p>
                    )}
                    <Link href={`/${locale}/quote`} className="btn">{d.fleet.book}<span aria-hidden="true">↗</span></Link>
                  </div>
                </article>
              );
            })}
          </div>

          <p className="note note--block"><Value>{d.placeholderNote}</Value></p>
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
