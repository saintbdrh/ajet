import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSiteCopy } from "@/lib/content";
import { isLocale, t } from "@/lib/i18n";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: isLocale(locale) ? t(locale).faq.title : "" };
}

export default async function FaqPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const copy = await getSiteCopy(locale);
  const faq = t(locale, copy).faq;

  return (
    <section className="home-faq-page" aria-labelledby="faq-title">
      <header className="home-faq-page__heading">
        <p className="eyebrow">{faq.kicker}</p>
        <h1 id="faq-title">{faq.title}</h1>
      </header>
      <div className="home-faq-page__items">
        {faq.items.map(([question, answer]) => (
          <details key={question}>
            <summary>{question}</summary>
            <p>{answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
