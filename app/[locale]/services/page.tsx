import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ServiceCollection from "@/components/ServiceCollection";
import GroundCare from "@/components/GroundCare";
import { journeyCopy } from "@/lib/journey";
import { isLocale } from "@/lib/i18n";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return isLocale(locale) ? { title: journeyCopy[locale].title, description: journeyCopy[locale].intro } : {};
}
export default async function Services({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params; if (!isLocale(locale)) notFound(); const d = journeyCopy[locale];
  return <><header className="pagehead"><div className="wrap"><p className="eyebrow">{d.kicker}</p><h1>{d.title}</h1><p className="lede">{d.intro}</p><nav className="service-jumps" aria-label={locale === "mn" ? "Үйлчилгээний төрлүүд" : "Service types"}>{d.services.map((service) => <a key={service.id} href={`#${service.id}`}>{service.name}<span aria-hidden="true">↓</span></a>)}</nav></div></header>
    <section className="section"><div className="wrap"><ServiceCollection locale={locale} detailed /></div></section>
    <GroundCare locale={locale} />
    <div className="wrap"><Link className="link-arrow" href={`/${locale}/services/transfers`}>{locale === "mn" ? "Угтах, үдэх үйлчилгээг төлөвлөх" : "Explore ground transfer arrangements"} ↗</Link></div>
    <section className="section journey-missions"><div className="wrap"><h2>{d.missionsTitle}</h2><div>{d.missions.map((mission) => <article key={mission.title}><h3>{mission.title}</h3><p>{mission.body}</p></article>)}</div></div></section>
    <section className="cta cta--compact"><div className="wrap"><p className="eyebrow">{d.requestsTitle}</p><h2>{d.pricingTitle}</h2><p className="lede">{d.pricingBody}</p><Link className="btn" href={`/${locale}/quote`}>{locale === "mn" ? "Хүсэлт илгээх" : "Plan your journey"}<span aria-hidden="true">↗</span></Link><p className="note note--block">{d.requestsBody}</p></div></section>
  </>;
}
