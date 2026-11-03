import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AirportExpress from "@/components/AirportExpress";
import { experienceCopy } from "@/lib/experiences";
import { isLocale } from "@/lib/i18n";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return isLocale(locale) ? { title: experienceCopy[locale].expressName, description: experienceCopy[locale].expressIntro } : {};
}
export default async function AirportExpressPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params; if (!isLocale(locale)) notFound(); const d = experienceCopy[locale];
  return <><header className="pagehead experience-head"><div className="wrap"><p className="eyebrow">{d.expressName}</p><h1>{d.expressTitle}</h1><p className="lede">{d.expressIntro}</p></div></header>
    <section className="section"><div className="wrap express-layout"><div className="experience-image"><img src="/img/brand/window-view.webp" width="1600" height="900" alt={locale === "mn" ? "Агаарын хөлгийн цонхоор харагдах тэнгэр" : "The sky through an aircraft window"} /><span>{d.directions}</span></div><AirportExpress locale={locale} /></div></section></>;
}
