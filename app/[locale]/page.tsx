import Link from "next/link";
import { notFound } from "next/navigation";
import AircraftPortrait from "@/components/AircraftPortrait";
import MediaView from "@/components/MediaView";
import Reveal from "@/components/Reveal";
import Value from "@/components/Value";
import { getDestinations, getFleet, getMediaSlots, getPricing, getSiteCopy, mediaUrl, slotStill, variedSlots, type MediaSlot } from "@/lib/content";
import { isVideoKey } from "@/lib/media";
import { isLocale, t } from "@/lib/i18n";
import { formatMinorAmount } from "@/lib/money";

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const [copy, fleet, dest, slots, prices] = await Promise.all([
    getSiteCopy(locale), getFleet(), getDestinations(), getMediaSlots(), getPricing(),
  ]);
  const d = t(locale, copy);
  const slot = (key: string) => slots.find((item) => item.key === key)!;
  const slotMedia = (item: MediaSlot) => ({
    src: mediaUrl(item.imageKey),
    video: isVideoKey(item.imageKey),
    poster: item.posterKey ? mediaUrl(item.posterKey) : undefined,
    style: { objectPosition: `${item.focalX}% ${item.focalY}%` },
  });
  const hero = slot("hero");
  const usesDefaultFilm = ["/img/hero.jpg", "/img/ajet-hero-poster.png"].includes(hero.imageKey);
  const published = fleet.filter((aircraft) => !aircraft.placeholder);
  const gallery = variedSlots(slots, 6);
  const destinationFallback = variedSlots(slots, Math.max(dest.length, 1));
  const fleetFallback = variedSlots(slots, Math.max(published.length, 1));

  return (
    <>
      <section className="hero">
        <div className="hero__media">
          {usesDefaultFilm ? (
            <video className="hero__film" autoPlay muted loop playsInline poster="/img/ajet-hero-poster.png" aria-hidden="true">
              <source src="/films/ajet-hero.mp4" type="video/mp4" />
            </video>
          ) : (
            <MediaView {...slotMedia(hero)} alt={hero.alt[locale]} loading="eager" fetchPriority="high" />
          )}
        </div>
        <div className="hero__scrim" aria-hidden="true" />

        <div className="hero__inner wrap">
          <p className="eyebrow">{d.hero.kicker}</p>
          <h1>{d.hero.title}</h1>
          <p className="hero__sub">{d.hero.sub}</p>
          <div className="hero__actions">
            <Link href={`/${locale}/quote`} className="btn">{d.hero.cta}<span aria-hidden="true">↗</span></Link>
            <Link href={`/${locale}/quote#estimate`} className="btn btn--ghost">{d.hero.cta2}</Link>
          </div>
        </div>

        <div className="hero__creds">
          <div className="wrap">
            <span className="hero__creds-label">{d.credentials.label}</span>
            <ul>
              {d.credentials.items.map((item) => <li key={item}><Value>{item}</Value></li>)}
            </ul>
          </div>
        </div>
      </section>

      <section className="statband" aria-label={d.credentials.label}>
        <div className="wrap">
          {d.stats.map(([value, label]) => (
            <div className="stat" key={label}>
              <b><Value>{value}</Value></b>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="section section--fleet" id="fleet">
        <div className="wrap">
          <div className="section__head">
            <Reveal direction="left">
              <p className="eyebrow">{d.fleet.kicker}</p>
              <h2>{d.fleet.title}</h2>
            </Reveal>
            <Reveal direction="right">
              <p className="lede">{d.fleet.intro}</p>
              <Link href={`/${locale}/fleet`} className="link-arrow">{d.more}</Link>
            </Reveal>
          </div>

          <Reveal direction="image"><AircraftPortrait locale={locale} /></Reveal>

          {published.length > 0 ? (
            <div className="fleetlist">              {published.map((aircraft, index) => {
                const specs: [string, string][] = [];
                if (aircraft.seats) specs.push([d.fleet.seats, String(aircraft.seats)]);
                if (aircraft.rangeKm) specs.push([d.fleet.range, `${aircraft.rangeKm} km`]);
                if (aircraft.cruiseKmh) specs.push([d.fleet.speed, `${aircraft.cruiseKmh} km/h`]);
                if (aircraft.payloadKg) specs.push([d.fleet.payload, `${aircraft.payloadKg} kg`]);
                return (
                  <article className="acft" key={aircraft.id}>
                    <div className="acft__media">
                      <img
                        src={aircraft.imageKey ? mediaUrl(aircraft.imageKey) : mediaUrl(slotStill(fleetFallback[index % fleetFallback.length]))}
                        alt={aircraft.alt[locale]}
                        loading="lazy"
                        style={{ objectPosition: `${aircraft.focalX}% ${aircraft.focalY}%` }}
                      />
                    </div>
                    <div className="acft__body">
                      <span className="acft__index">{String(index + 1).padStart(2, "0")}</span>
                      <h3>{aircraft.name}</h3>
                      {aircraft.desc?.[locale] && <p>{aircraft.desc[locale]}</p>}
                      {specs.length > 0 && (
                        <dl className="spec">
                          {specs.map(([key, value]) => (
                            <div className="spec__row" key={key}><dt>{key}</dt><dd>{value}</dd></div>
                          ))}
                        </dl>
                      )}
                      {!aircraft.specificationsVerified && <p className="note">{d.fleet.specificationsPending}</p>}
                      <Link href={`/${locale}/quote`} className="link-arrow">{d.fleet.book}</Link>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : null}
        </div>
      </section>

      <section className="section section--alt" id="services">
        <div className="wrap">
          <div className="section__head">
            <Reveal direction="left">
              <p className="eyebrow">{d.services.kicker}</p>
              <h2>{d.services.title}</h2>
            </Reveal>
            <Reveal direction="right"><p className="lede">{d.services.intro}</p></Reveal>
          </div>
          <div className="svc">
            {d.services.items.map((item) => (
              <article className="svc__item rv" key={item.name}>
                <span className="svc__index">{item.index}</span>
                <h3>{item.name}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
          <Link href={`/${locale}/services`} className="link-arrow svc__more">{d.services.more}</Link>
        </div>
      </section>

      <section className="section section--gallery" id="gallery">
        <div className="wrap">
          <div className="section__head">
            <Reveal direction="left">
              <p className="eyebrow">{d.gallery.kicker}</p>
              <h2>{d.gallery.title}</h2>
            </Reveal>
            <Reveal direction="right"><p className="lede">{d.gallery.handle}</p></Reveal>
          </div>
        </div>
        <div className="rail" role="list">
          {gallery.map((item, index) => (
            <figure className="rail__item" role="listitem" key={`${item.key}-${index}`}>
              <img src={mediaUrl(slotStill(item))} alt={item.alt[locale]} loading="lazy" style={{ objectPosition: `${item.focalX}% ${item.focalY}%` }} />
              <figcaption>{String(index + 1).padStart(2, "0")} / {d.gallery.handle}</figcaption>
            </figure>
          ))}
        </div>
        <div className="wrap"><p className="note rail__note">{d.gallery.note}</p></div>
      </section>

      <section className="section safety" id="safety">
        <div className="wrap">
          <div className="safety__head">
            <Reveal direction="left">
              <p className="eyebrow">{d.safety.kicker}</p>
              <h2>{d.safety.title}</h2>
            </Reveal>
            <Reveal direction="right"><p className="lede">{d.safety.intro}</p></Reveal>
          </div>

          <div className="safety__body">
            <ul className="checks">
              {d.safety.points.map((point) => <li key={point}><span aria-hidden="true">✓</span>{point}</li>)}
            </ul>
            <div className="certs">
              {d.safety.certs.map((cert) => (
                <article className="cert" key={cert.label}>
                  <span className="cert__label">{cert.label}</span>
                  <h3><Value>{cert.title}</Value></h3>
                  <p>{cert.body}</p>
                </article>
              ))}
            </div>
          </div>
          <Link href={`/${locale}/safety`} className="link-arrow">{d.more}</Link>
        </div>
      </section>

      <section className="section section--alt about" id="about">
        <div className="wrap about__grid">
          <Reveal direction="image">
            <div className="about__media">
              <MediaView {...slotMedia(slot("corporate"))} alt={slot("corporate").alt[locale]} />
            </div>
          </Reveal>
          <Reveal direction="right">
            <div className="about__copy">
              <p className="eyebrow">{d.about.kicker}</p>
              <h2>{d.about.title}</h2>
              <p className="lede">{d.about.intro}</p>
              <p>{d.about.body}</p>
              <dl className="about__facts">
                {d.about.facts.map(([value, label]) => (
                  <div key={label}><dt><Value>{value}</Value></dt><dd>{label}</dd></div>
                ))}
              </dl>
              <Link href={`/${locale}/about`} className="btn btn--ghost">{d.about.cta}</Link>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section pads" id="helipads">
        <div className="wrap">
          <div className="section__head">
            <Reveal direction="left">
              <p className="eyebrow">{d.pads.kicker}</p>
              <h2>{d.pads.title}</h2>
            </Reveal>
            <Reveal direction="right"><p className="lede">{d.pads.intro}</p></Reveal>
          </div>
          <div className="padlist">
            {d.pads.items.slice(0, 3).map((pad, index) => (
              <article className="pad rv" key={pad.name}>
                <span className="pad__index">{String(index + 1).padStart(2, "0")}</span>
                <span className="pad__role">{pad.role}</span>
                <h3>{pad.name}</h3>
                <p>{pad.body}</p>
                <span className="pad__coords"><Value>{pad.coords}</Value></span>
              </article>
            ))}
          </div>
          <Link href={`/${locale}/helipads`} className="link-arrow">{d.more}</Link>
        </div>
      </section>

      <section className="section section--alt section--dest" id="destinations">
        <div className="wrap">
          <div className="section__head">
            <Reveal direction="left">
              <p className="eyebrow">{d.dest.kicker}</p>
              <h2>{d.dest.title}</h2>
            </Reveal>
            <Reveal direction="right">
              <p className="lede">{d.dest.intro}</p>
              <Link href={`/${locale}/destinations`} className="link-arrow">{d.more}</Link>
            </Reveal>
          </div>
          <div className="destgrid">
            {dest.slice(0, 4).map((place, index) => (
              <Link href={`/${locale}/destinations`} className="destcard rv" key={place.id}>
                <img
                  src={place.imageKey ? mediaUrl(place.imageKey) : mediaUrl(slotStill(destinationFallback[index % destinationFallback.length]))}
                  alt={place.alt[locale]}
                  loading="lazy"
                  style={{ objectPosition: `${place.focalX}% ${place.focalY}%` }}
                />
                <span className="destcard__name">{place.name[locale]}</span>
                <span className="destcard__time">{d.dest.pending}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {prices.length > 0 && (
        <section className="section section--prices" aria-labelledby="public-prices">
          <div className="wrap">
            <Reveal direction="left">
              <p className="eyebrow">{locale === "mn" ? "Үнийн мэдээлэл" : "Indicative pricing"}</p>
              <h2 id="public-prices">{locale === "mn" ? "Эхлэх үнэ" : "Starting prices"}</h2>
            </Reveal>
            <div className="pricelist">
              {prices.map((price) => (
                <article className="priceitem" key={price.id}>
                  <div>
                    <h3>{price.label[locale]}</h3>
                    {price.note[locale] && <p>{price.note[locale]}</p>}
                  </div>
                  <strong>
                    {locale === "mn" ? "Үүнээс эхэлнэ" : "From"}{" "}
                    {formatMinorAmount(price.amountMinor, price.currency, locale)}
                  </strong>
                </article>
              ))}
            </div>
            <p className="note">{d.priceDisclaimer}</p>
          </div>
        </section>
      )}

      <section className="section section--faq" id="faq">
        <div className="wrap faq__grid">
          <Reveal direction="left">
            <p className="eyebrow">{d.faq.kicker}</p>
            <h2>{d.faq.title}</h2>
          </Reveal>
          <div className="faq__list">
            {d.faq.items.map(([question, answer]) => (
              <details className="rv" key={question}>
                <summary>{question}<span aria-hidden="true">+</span></summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="cta">
        <div className="wrap">
          <Reveal>
            <p className="eyebrow">{d.cta.kicker}</p>
            <h2>{d.cta.title}</h2>
            <p className="lede">{d.cta.sub}</p>
            <div className="cta__actions">
              <Link href={`/${locale}/quote`} className="btn">{d.cta.btn}<span aria-hidden="true">↗</span></Link>
            </div>
            <p className="note cta__note">{d.placeholderNote}</p>
          </Reveal>
        </div>
      </section>
    </>
  );
}
