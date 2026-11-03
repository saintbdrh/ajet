import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { experienceCopy } from "@/lib/experiences";
import { isLocale } from "@/lib/i18n";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return isLocale(locale) ? { title: experienceCopy[locale].lounges, description: experienceCopy[locale].loungeIntro } : {};
}
export default async function Lounges({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params; if (!isLocale(locale)) notFound(); const d = experienceCopy[locale];
  return <><header className="pagehead experience-head"><div className="wrap"><p className="eyebrow">{d.loungeKicker}</p><h1>{d.loungeTitle}</h1><p className="lede">{d.loungeIntro}</p><span className="coming-soon">{d.loungeStatus}</span></div></header>
    <section className="section lounge-gallery"><div className="wrap"><div className="lounge-gallery__grid">{["lounge-concept.webp", "cabin-concept.webp", "comfort-concept.webp"].map((file, index) => <figure key={file}><img src={`/img/brand/${file}`} alt={d.loungeImages[index]} loading={index === 0 ? "eager" : "lazy"} /><figcaption><span>{d.loungeImages[index]}</span><small>{d.concept}</small></figcaption></figure>)}</div><p className="note note--block">{d.loungeNote}</p><Link href={`/${locale}/quote`} className="link-arrow">{locale === "mn" ? "Аяллаа төлөвлөх" : "Plan your journey"}</Link></div></section></>;
}
