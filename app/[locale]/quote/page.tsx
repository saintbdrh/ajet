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
  return (
    <>
      <section className="pagehero"><div className="wrap">
        <p className="eyebrow">{d.hero.kicker}</p>
        <h1 style={{ maxWidth: "18ch" }}>{d.form.title}</h1>
        <p className="lead">{d.hero.sub}</p>
      </div></section>
      <section className="wrap sec" style={{ paddingTop: "3rem" }}>
        <QuoteForm
          d={d.form}
          locale={locale}
          places={dest.map((p) => p.name[locale])}
          aircraft={fleet.filter((item) => !item.placeholder).map((item) => item.name)}
        />
      </section>
    </>
  );
}