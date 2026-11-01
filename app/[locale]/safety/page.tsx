import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Reveal from "@/components/Reveal";
import Value from "@/components/Value";
import { getSiteCopy } from "@/lib/content";
import { isLocale, t } from "@/lib/i18n";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: isLocale(locale) ? t(locale).safety.title : "" };
}

export default async function Safety({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const copy = await getSiteCopy(locale);
  const d = t(locale, copy);

  return (
    <>
      <header className="pagehead pagehead--statement">
        <div className="wrap">
          <p className="eyebrow">{d.safety.kicker}</p>
          <h1>{d.safety.title}</h1>
          <p className="lede">{d.safety.intro}</p>
        </div>
      </header>

      <section className="section">
        <div className="wrap safety__body">
          <div>
            <h2 className="subhead">{locale === "mn" ? "Нислэг бүрийн өмнө" : "Before every flight"}</h2>
            <ul className="checks checks--large">
              {d.safety.points.map((point) => <li key={point}><span aria-hidden="true">✓</span>{point}</li>)}
            </ul>
          </div>
          <div className="certs certs--stack">
            {d.safety.certs.map((cert) => (
              <article className="cert" key={cert.label}>
                <span className="cert__label">{cert.label}</span>
                <h3><Value>{cert.title}</Value></h3>
                <p>{cert.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--alt">
        <div className="wrap narrow">
          <Reveal>
            <p className="eyebrow">{d.credentials.label}</p>
            <ul className="credrow">
              {d.credentials.items.map((item) => <li key={item}><Value>{item}</Value></li>)}
            </ul>
            <p className="note note--block">{d.credentials.note}</p>
            <p className="note note--block">{d.placeholderNote}</p>
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
