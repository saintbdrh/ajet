import type { Metadata } from "next";
import { notFound } from "next/navigation";
import QuoteForm from "@/components/QuoteForm";
import { getDestinations, getFleet, getSiteCopy } from "@/lib/content";
import { isLocale, t } from "@/lib/i18n";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: isLocale(locale) ? t(locale).form.title : "" };
}

export default async function Quote({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const [copy, dest, fleet] = await Promise.all([getSiteCopy(locale), getDestinations(), getFleet()]);
  const d = t(locale, copy);
  const phone = copy.contactPhone?.trim();
  const showPhone = !!phone && !phone.includes("[");

  return (
    <>
      <header className="pagehead pagehead--quote" id="estimate">
        <div className="wrap">
          <p className="eyebrow">{d.cta.kicker}</p>
          <h1>{d.form.title}</h1>
          <p className="lede">{d.cta.sub}</p>
        </div>
      </header>

      <section className="section">
        <div className="wrap quote__grid">
          <aside className="quote__aside">
            <p className="eyebrow">{d.credentials.label}</p>
            <ul className="credrow credrow--stack">
              {d.credentials.items.map((item) => <li key={item}>{item}</li>)}
            </ul>
            <p className="note note--block">{d.credentials.note}</p>
            <ul className="quote__points">
              {d.safety.points.slice(0, 4).map((point) => <li key={point}><span aria-hidden="true">✓</span>{point}</li>)}
            </ul>
            {showPhone && phone && (
              <p className="quote__phone">
                <span>{d.hero.phone}</span>
                <a href={`tel:${phone.replace(/[^\d+]/g, "")}`}>{phone}</a>
              </p>
            )}
          </aside>

          <div className="quote__form">
            <QuoteForm
              d={d.form}
              locale={locale}
              places={dest.map((p) => p.name[locale])}
              aircraft={fleet.filter((item) => !item.placeholder).map((item) => item.name)}
            />
            <p className="note note--block">{d.foot.note}</p>
          </div>
        </div>
      </section>
    </>
  );
}
