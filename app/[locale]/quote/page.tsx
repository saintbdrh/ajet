import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { journeyCopy, isServiceId } from "@/lib/journey";
import QuoteForm from "@/components/QuoteForm";
import { expressItinerary, expressSites, experienceCopy } from "@/lib/experiences";
import { getDestinations, getFleet, getSiteCopy } from "@/lib/content";
import { isLocale, t } from "@/lib/i18n";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: isLocale(locale) ? t(locale).form.title : "" };
}

export default async function Quote({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const [copy, dest, fleet] = await Promise.all([getSiteCopy(locale), getDestinations(), getFleet()]);
  const d = t(locale, copy);
  const query = await searchParams;
  const route = query.service === "airport-express" ? expressItinerary(locale, typeof query.site === "string" ? query.site : "", typeof query.direction === "string" ? query.direction : "") : undefined;
  const journey = journeyCopy[locale];
  const initialService = isServiceId(query.service) ? query.service : "charter";
  const initialExtras = query.extras === "transfers" ? ["transfers" as const] : [];
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
            <p className="eyebrow">{journey.requestsTitle}</p>
            <p className="lede">{journey.requestsBody}</p>
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
              initialService={initialService}
              initialExtras={initialExtras}
              d={d.form}
              locale={locale}
              initialRoute={route ? { ...route, notes: experienceCopy[locale].expressName } : undefined}
              places={[...new Set([...dest.map((p) => p.name[locale]), experienceCopy[locale].airport, ...expressSites.map((p) => p[locale])])]}
              aircraft={fleet.filter((item) => !item.placeholder).map((item) => item.name)}
            />
            <p className="note note--block">{d.foot.note}</p>
          </div>
        </div>
      </section>
    </>
  );
}
