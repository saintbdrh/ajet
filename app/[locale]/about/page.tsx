import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Reveal from "@/components/Reveal";
import Value from "@/components/Value";
import { getMediaSlots, getSiteCopy, mediaUrl } from "@/lib/content";
import { isLocale, t } from "@/lib/i18n";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: isLocale(locale) ? t(locale).about.title : "" };
}

export default async function About({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const [copy, slots] = await Promise.all([getSiteCopy(locale), getMediaSlots()]);
  const d = t(locale, copy);
  const slot = (key: string) => slots.find((item) => item.key === key)!;

  return (
    <>
      <header className="pagehead">
        <div className="wrap">
          <p className="eyebrow">{d.about.kicker}</p>
          <h1>{d.about.title}</h1>
          <p className="lede">{d.about.intro}</p>
        </div>
      </header>

      <section className="section">
        <div className="wrap about__grid about__grid--page">
          <Reveal direction="image">
            <div className="about__media">
              <img
                src={mediaUrl(slot("corporate").imageKey)}
                alt={slot("corporate").alt[locale]}
                loading="lazy"
                style={{ objectPosition: `${slot("corporate").focalX}% ${slot("corporate").focalY}%` }}
              />
            </div>
          </Reveal>
          <Reveal direction="right">
            <div className="about__copy">
              <p>{d.about.body}</p>
              <dl className="about__facts">
                {d.about.facts.filter(([value]) => !value.includes("[")).map(([value, label]) => (
                  <div key={label}><dt><Value>{value}</Value></dt><dd>{label}</dd></div>
                ))}
              </dl>
              <div className="about__links">
                <Link href={`/${locale}/fleet`} className="link-arrow">{d.nav.fleet}</Link>
                <Link href={`/${locale}/helipads`} className="link-arrow">{d.nav.helipads}</Link>
                <Link href={`/${locale}/safety`} className="link-arrow">{d.nav.safety}</Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {d.pads.items.some((pad) => !pad.name.includes("[")) && <section className="section section--alt">
        <div className="wrap">
          <div className="section__head">
            <Reveal direction="left">
              <p className="eyebrow">{d.pads.kicker}</p>
              <h2>{d.pads.title}</h2>
            </Reveal>
            <Reveal direction="right"><p className="lede">{d.pads.intro}</p></Reveal>
          </div>
          <div className="padlist">
            {d.pads.items.filter((pad) => !pad.name.includes("[")).slice(0, 3).map((pad, index) => (
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

      }
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
