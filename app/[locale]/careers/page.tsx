import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CareerInterestForm from "@/components/CareerInterestForm";
import { experienceCopy } from "@/lib/experiences";
import { isLocale } from "@/lib/i18n";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return isLocale(locale) ? { title: experienceCopy[locale].careers, description: experienceCopy[locale].careerIntro } : {};
}
export default async function Careers({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params; if (!isLocale(locale)) notFound(); const d = experienceCopy[locale];
  const enabled = Boolean(process.env.DATABASE_URL) && (process.env.NODE_ENV !== "production" || Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY));
  return <><header className="pagehead experience-head"><div className="wrap"><p className="eyebrow">{d.careerKicker}</p><h1>{d.careerTitle}</h1><p className="lede">{d.careerIntro}</p></div></header>
    <section className="section"><div className="wrap careers-layout"><div className="career-intro"><img src="/img/ajet-studio-poster.webp" alt={locale === "mn" ? "A-JET EC145 нисдэг тэрэг" : "The A-JET EC145 helicopter"} width="1200" height="675" /><h2>{d.openPositions}</h2><p className="lede">{d.noPositions}</p></div><CareerInterestForm locale={locale} enabled={enabled} /></div></section></>;
}
