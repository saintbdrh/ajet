import Link from "next/link";
import { notFound } from "next/navigation";
import JourneyExperience from "@/components/JourneyExperience";
import MediaView from "@/components/MediaView";
import Reveal from "@/components/Reveal";
import { getDestinations, getFleet, getMediaSlots, getPricing, getSiteCopy, mediaUrl, slotStill, type MediaSlot } from "@/lib/content";
import { isVideoKey } from "@/lib/media";
import { isLocale, t } from "@/lib/i18n";
import { formatMinorAmount } from "@/lib/money";

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const [copy, fleet, dest, slots, prices] = await Promise.all([getSiteCopy(locale), getFleet(), getDestinations(), getMediaSlots(), getPricing()]);
  const d = t(locale, copy);
  const slot = (key: string) => slots.find((item) => item.key === key)!;
  const journeyScenes = d.journey.map((scene, index) => {
    const photo = slot(`journey-${String(index + 1).padStart(2, "0")}`);
    return {
      ...scene,
      image: mediaUrl(photo.imageKey),
      video: isVideoKey(photo.imageKey),
      poster: photo.posterKey ? mediaUrl(photo.posterKey) : undefined,
      position: `${photo.focalX}% ${photo.focalY}%`,
    };
  });
  const slotMedia = (item: MediaSlot) => ({
    src: mediaUrl(item.imageKey),
    video: isVideoKey(item.imageKey),
    poster: item.posterKey ? mediaUrl(item.posterKey) : undefined,
    style: { objectPosition: `${item.focalX}% ${item.focalY}%` },
  });
  return (
    <>
      <section className="hero">
        <div className="hero-intro wrap">
          <div className="hero-copy">
            <p className="eyebrow">{d.hero.kicker}</p>
            <h1>{d.hero.title}</h1>
            <p className="lead">{d.hero.sub}</p>
          </div>
        </div>
        <div className="hero-stage">
          <div className="bgimg" aria-hidden="true"><MediaView {...slotMedia(slot("hero"))} alt="" loading="eager" fetchPriority="high" /></div>
          <div className="veil" aria-hidden="true" />
          <div className="hero-stage-content">
            <p className="hero-caption">{locale === "mn" ? "ТУСГАЙ НИСЛЭГ · МОНГОЛ" : "PRIVATE CHARTER · MONGOLIA"}</p>
            <div className="cta">
              <Link href={`/${locale}/quote`} className="btn">{d.hero.cta}<span aria-hidden="true">↗</span></Link>
              <Link href={`/${locale}/fleet`} className="btn ghost">{d.hero.cta2}</Link>
            </div>
          </div>
          <a className="scroll-cue" href="#experience"><span />{locale === "mn" ? "Доош гүйлгэх" : "Scroll to explore"}</a>
        </div>
      </section>

      {prices.length > 0 && <section className="sec band" aria-labelledby="public-prices">
        <div className="wrap">
          <Reveal direction="left"><p className="eyebrow">{locale === "mn" ? "ҮНИЙН МЭДЭЭЛЭЛ" : "INDICATIVE PRICING"}</p><h2 id="public-prices">{locale === "mn" ? "Эхлэх үнэ" : "Starting prices"}</h2></Reveal>
          <div className="pricing-list">{prices.map((price) => (
            <article className="pricing-item" key={price.id}>
              <div><h3>{price.label[locale]}</h3>{price.note[locale] && <p>{price.note[locale]}</p>}</div>
              <strong>{locale === "mn" ? "Үүнээс эхэлнэ" : "From"} {formatMinorAmount(price.amountMinor, price.currency, locale)}</strong>
            </article>
          ))}</div>
          <p className="sample">{d.priceDisclaimer}</p>
        </div>
      </section>}

      <section className="stats" id="experience"><div className="wrap">
        {d.stats.map(([b, s]) => <div className="stat rv" key={s}><b>{b}</b><span>{s}</span></div>)}
      </div></section>

      <JourneyExperience locale={locale} scenes={journeyScenes} kicker={d.journeyKicker} intro={d.journeyIntro} />

      <section className="sec"><div className="wrap">
        <Reveal direction="left"><p className="eyebrow">{d.how.kicker}</p><h2>{d.how.title}</h2></Reveal>
        <ol className="steps">{d.how.steps.map(([h, p]) => (
          <li className="rv" key={h}><strong>{h}</strong><span>{p}</span></li>))}</ol>
      </div></section>

      <section className="sec band"><div className="wrap">
        <div className="sec head">
          <Reveal direction="left"><p className="eyebrow">{d.fleet.kicker}</p><h2>{d.fleet.title}</h2></Reveal>
          <Reveal direction="right"><p>{d.fleet.intro}</p><Link href={`/${locale}/fleet`} className="textlink">{d.more}</Link></Reveal>
        </div>
        <div className="fleet-grid">{fleet.slice(0, 3).map((a, i) => (
          <article className="ac rv" key={a.id}>
            <div className="ph"><img src={a.imageKey ? mediaUrl(a.imageKey) : mediaUrl(slotStill(slot(["hero", "corporate", "membership"][i % 3])))} alt={a.alt[locale]} loading="lazy" style={{ objectPosition: `${a.focalX}% ${a.focalY}%` }} /></div>
            <div className="bd">
              <span className="tag">{d.fleet.kicker}</span><h3>{a.name}</h3>
              <dl className="specs">
                {a.seats && <div><dt>{d.fleet.seats}</dt><dd>{a.seats}</dd></div>}
                {a.rangeKm && <div><dt>{d.fleet.range}</dt><dd>{a.rangeKm} km</dd></div>}
                {a.cruiseKmh && <div><dt>{d.fleet.speed}</dt><dd>{a.cruiseKmh} km/h</dd></div>}
              </dl>
              {a.placeholder && <p className="sample">{d.sample}</p>}
              {!a.placeholder && !a.specificationsVerified && <p className="sample">{d.fleet.specificationsPending}</p>}
            </div>
          </article>))}</div>
      </div></section>

      <section className="sec" id="membership"><div className="wrap split">
        <Reveal direction="image"><div className="visual"><MediaView {...slotMedia(slot("membership"))} alt={slot("membership").alt[locale]} /></div></Reveal>
        <Reveal direction="right"><div>
          <p className="eyebrow">{d.member.kicker}</p><h2>{d.member.title}</h2>
          <p className="lead">{d.member.intro}</p>
          <ul className="feat">{d.member.feats.map((f) => <li key={f}>{f}</li>)}</ul>
          <Link href={`/${locale}/quote`} className="btn">{d.member.cta}</Link>
        </div></Reveal>
      </div></section>

      <section className="sec band" id="corporate"><div className="wrap split">
        <Reveal direction="left"><div>
          <p className="eyebrow">{d.corporate.kicker}</p><h2>{d.corporate.title}</h2>
          <p className="lead">{d.corporate.intro}</p>
          <Link href={`/${locale}/quote`} className="btn ghost">{d.corporate.cta}</Link>
        </div></Reveal>
        <Reveal direction="image"><div className="visual"><MediaView {...slotMedia(slot("corporate"))} alt={slot("corporate").alt[locale]} /></div></Reveal>
      </div></section>

      <section className="sec"><div className="wrap">
        <div className="sec head">
          <Reveal direction="left"><p className="eyebrow">{d.dest.kicker}</p><h2>{d.dest.title}</h2></Reveal>
          <Reveal direction="right"><Link href={`/${locale}/destinations`} className="textlink">{d.more}</Link></Reveal>
        </div>
        <div className="dest-grid">{dest.slice(0, 4).map((p, i) => (
          <Link href={`/${locale}/destinations`} className="dest rv" key={p.id}>
            <img src={p.imageKey ? mediaUrl(p.imageKey) : mediaUrl(slotStill(slot(["hero", "membership", "corporate"][i % 3])))} alt={p.alt[locale]} loading="lazy" style={{ objectPosition: `${p.focalX}% ${p.focalY}%` }} />
            <div className="ov"><h3>{p.name[locale]}</h3></div>
          </Link>))}</div>
      </div></section>

      <section className="sec band"><div className="wrap">
        <Reveal><div className="quoteblock">
          <p className="eyebrow" style={{ justifyContent: "center" }}>{d.testi.kicker}</p>
          <blockquote>{d.testi.text}”</blockquote><cite>{d.testi.cite}</cite>
        </div></Reveal>
      </div></section>

      <section className="sec" id="faq"><div className="wrap">
        <Reveal><p className="eyebrow">{d.faq.kicker}</p><h2>{d.faq.title}</h2></Reveal>
        <div className="faq">{d.faq.items.map(([q, a]) => (
          <details className="rv" key={q}><summary>{q}</summary><p>{a}</p></details>))}</div>
      </div></section>

      <section className="sec" style={{ textAlign: "center" }}><div className="wrap narrow">
        <Reveal><div>
          <p className="eyebrow" style={{ justifyContent: "center" }}>{d.cta.kicker}</p>
          <h2>{d.cta.title}</h2>
          <p className="lead" style={{ margin: "0 auto 2rem" }}>{d.cta.sub}</p>
          <Link href={`/${locale}/quote`} className="btn">{d.cta.btn}</Link>
        </div></Reveal>
      </div></section>
    </>
  );
}