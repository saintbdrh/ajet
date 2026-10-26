import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import type { ReactNode } from "react";
import "../globals.css";
import SiteHeader from "@/components/SiteHeader";
import ScrollMotion from "@/components/ScrollMotion";
import { BRAND, isLocale, locales, t } from "@/lib/i18n";
import { getSiteCopy } from "@/lib/content";

const serif = Cormorant_Garamond({ subsets: ["cyrillic", "cyrillic-ext", "latin"], weight: ["400","500","600"], variable: "--font-serif", display: "swap" });
const sans = Manrope({ subsets: ["cyrillic", "cyrillic-ext", "latin"], weight: ["400","500","600","700"], variable: "--font-sans", display: "swap" });

export const dynamicParams = false;
export const dynamic = "force-dynamic";
export const generateStaticParams = () => locales.map((locale) => ({ locale }));

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return {
    title: { default: `${BRAND} — Private Helicopter Charter`, template: `%s | ${BRAND}` },
    description: t(locale).desc,
    alternates: { languages: { mn: "/mn", en: "/en" } },
  };
}

export default async function RootLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const copy = await getSiteCopy(locale);
  const d = t(locale, copy);
  const contactPhone = copy.contactPhone?.trim();
  const contactEmail = copy.contactEmail?.trim();
  const isConfiguredPhone = contactPhone && contactPhone !== "+976 7000 0000";
  const isConfiguredEmail = contactEmail && !contactEmail.toLowerCase().endsWith("@example.com");
  return (
    <html lang={locale} data-scroll-behavior="smooth" className={`${serif.variable} ${sans.variable}`}>
      <body>
        <ScrollMotion />
        <SiteHeader
          locale={locale}
          fleetLabel={d.nav.fleet}
          destinationsLabel={d.nav.destinations}
          quoteLabel={d.nav.quote}
        />
        <main>{children}</main>
        <footer className="foot"><div className="wrap">
          <div className="cols">
            <div>
              <Link href={`/${locale}`} className="brand">{BRAND}</Link>
              <p className="note">{d.foot.tagline} {d.foot.note}</p>
            </div>
            <div><h4>{d.foot.explore}</h4><ul>
              <li><Link href={`/${locale}/fleet`}>{d.nav.fleet}</Link></li>
              <li><Link href={`/${locale}/destinations`}>{d.nav.destinations}</Link></li>
              <li><Link href={`/${locale}/quote`}>{d.nav.quote}</Link></li></ul></div>
            <div><h4>{d.foot.company}</h4><ul>
              <li><a href="#membership">{locale === "mn" ? "Гишүүнчлэл" : "Membership"}</a></li>
              <li><a href="#corporate">{locale === "mn" ? "Корпорац" : "Corporate"}</a></li>
              <li><a href="#faq">FAQ</a></li></ul></div>
            <div><h4>{d.foot.contact}</h4><ul>
              {isConfiguredPhone && <li><a href={`tel:${contactPhone.replace(/[^\d+]/g, "")}`}>{contactPhone}</a></li>}
              {isConfiguredEmail && <li><a href={`mailto:${contactEmail}`}>{contactEmail}</a></li>}
              {!isConfiguredPhone && !isConfiguredEmail && <li><Link href={`/${locale}/quote`}>{d.nav.quote}</Link></li>}
            </ul></div>
          </div>
          <div className="bar"><span>{d.foot.rights}</span><span>{d.foot.legal}</span></div>
          <p className="photo-credit">
            {locale === "mn" ? "Зургийн эх сурвалж:" : "Hero photo:"}{" "}
            <a href="https://commons.wikimedia.org/wiki/File:Tengboche,_Helicopter_in_flight,_Mountains_of_Nepal.jpg" target="_blank" rel="noreferrer">
              Vyacheslav Argenberg · CC BY 4.0
            </a>
          </p>
        </div></footer>
      </body>
    </html>
  );
}