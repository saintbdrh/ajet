import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Reveal from "@/components/Reveal";
import { getMediaSlots, getSiteCopy, mediaUrl, variedSlots } from "@/lib/content";
import { isLocale, t } from "@/lib/i18n";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: isLocale(locale) ? t(locale).services.title : "" };
}

export default async function Services({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const [copy, slots] = await Promise.all([getSiteCopy(locale), getMediaSlots()]);
  const d = t(locale, copy);
  const imagery = variedSlots(slots, d.services.items.length);

  return (
    <>
      <header className="pagehead">
        <div className="wrap">
          <p className="eyebrow">{d.services.kicker}</p>
          <h1>{d.services.title}</h1>
          <p className="lede">{d.services.intro}</p>
        </div>
      </header>

      <section className="section">
        <div className="wrap">
          <div className="svc svc--detail">
            {d.services.items.map((item, index) => {
              const photo = imagery[index % imagery.length];
              return (
                <article className="svcblock" key={item.name}>
                  <div className="svcblock__media">
                    <img
                      src={mediaUrl(photo.imageKey)}
                      alt={photo.alt[locale]}
                      loading="lazy"
                      style={{ objectPosition: `${photo.focalX}% ${photo.focalY}%` }}
                    />
                  </div>
                  <div className="svcblock__body">
                    <span className="svc__index">{item.index}</span>
                    <h2>{item.name}</h2>
                    <p>{item.body}</p>
                    <Link href={`/${locale}/quote`} className="link-arrow">{d.cta.btn}</Link>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section safety">
        <div className="wrap">
          <Reveal direction="left">
            <p className="eyebrow">{d.safety.kicker}</p>
            <h2>{d.safety.title}</h2>
            <p className="lede">{d.safety.intro}</p>
            <Link href={`/${locale}/safety`} className="link-arrow">{d.more}</Link>
          </Reveal>
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
