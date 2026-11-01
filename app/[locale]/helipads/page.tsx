import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Reveal from "@/components/Reveal";
import Value from "@/components/Value";
import { getSiteCopy } from "@/lib/content";
import { isLocale, t } from "@/lib/i18n";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: isLocale(locale) ? t(locale).pads.title : "" };
}

export default async function Helipads({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const copy = await getSiteCopy(locale);
  const d = t(locale, copy);

  return (
    <>
      <header className="pagehead">
        <div className="wrap">
          <p className="eyebrow">{d.pads.kicker}</p>
          <h1>{d.pads.title}</h1>
          <p className="lede">{d.pads.intro}</p>
        </div>
      </header>

      <section className="section">
        <div className="wrap">
          <div className="padlist padlist--full">
            {d.pads.items.map((pad, index) => (
              <article className="pad pad--full rv" key={pad.name}>
                <span className="pad__index">{String(index + 1).padStart(2, "0")}</span>
                <span className="pad__role">{pad.role}</span>
                <h2>{pad.name}</h2>
                <p>{pad.body}</p>
                <span className="pad__coords"><Value>{pad.coords}</Value></span>
              </article>
            ))}
          </div>
          <p className="note note--block">{d.pads.note}</p>
        </div>
      </section>

      <section className="section section--alt">
        <div className="wrap narrow">
          <Reveal>
            <p className="eyebrow">{d.dest.kicker}</p>
            <h2>{d.dest.title}</h2>
            <p className="lede">{d.dest.intro}</p>
            <Link href={`/${locale}/destinations`} className="link-arrow">{d.more}</Link>
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
