import { publicSiteUrl } from "@/lib/site-url";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import "@fontsource/noto-sans/latin-400.css";
import "@fontsource/noto-sans/latin-600.css";
import "@fontsource/noto-sans/cyrillic-400.css";
import "@fontsource/noto-sans/cyrillic-600.css";
import type { ReactNode } from "react";
import "../globals.css";
import "../site.css";
import "../brand.css";
import "../experience.css";
import "../journey.css";
import "../immersive-hero.css";
import "../planner.css";
import "../signature.css";
import "@fontsource/manrope/latin-400.css";
import "@fontsource/manrope/latin-600.css";
import "@fontsource/manrope/latin-800.css";
import "@fontsource/manrope/cyrillic-400.css";
import "@fontsource/manrope/cyrillic-600.css";
import "@fontsource/manrope/cyrillic-800.css";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import ScrollMotion from "@/components/ScrollMotion";
import { BRAND, isLocale, locales, t } from "@/lib/i18n";
import { getMediaSlots, getSiteCopy } from "@/lib/content";

export const dynamicParams = false;
export const dynamic = "force-dynamic";
export const generateStaticParams = () => locales.map((locale) => ({ locale }));

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const d = t(locale);
  return {
    title: { default: `${BRAND} — Private Helicopter Charter in Mongolia`, template: `%s | ${BRAND}` },
    description: d.desc,
    ...(publicSiteUrl() ? { metadataBase: publicSiteUrl()! } : { robots: { index: false, follow: false } }),
    openGraph: { type: "website", siteName: "A-JET Aviation", locale: locale === "mn" ? "mn_MN" : "en_US", images: [{ url: "/img/ajet-hero-production.webp", width: 1920, height: 1080, alt: "A-JET EC145 studio portrait" }] },
  };
}

export default async function RootLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const [copy, slots] = await Promise.all([getSiteCopy(locale), getMediaSlots()]);
  const d = t(locale, copy);
  const credits: [string, string][] = Array.from(new Map(
    slots.filter((slot) => slot.creditText).map((slot) => [slot.creditText, slot.creditUrl]),
  ));

  const rawPhone = copy.contactPhone?.trim();
  const rawEmail = copy.contactEmail?.trim();
  const isReal = (value?: string) =>
    !!value && !value.includes("[") && value !== "+976 7000 0000" && !value.toLowerCase().endsWith("@example.com");
  const phone = isReal(rawPhone) ? rawPhone : undefined;
  const email = isReal(rawEmail) ? rawEmail : undefined;

  return (
    <html lang={locale} data-scroll-behavior="smooth">
      <body className="site">
        <div id="top" />
        <a className="skip-link" href="#main-content">{locale === "mn" ? "Үндсэн агуулга руу" : "Skip to content"}</a>
        <ScrollMotion />
        <SiteHeader
          locale={locale}
          brand={BRAND}
          brandTag={d.brandTag}
          phone={phone}
          labels={{
            fleet: d.nav.fleet,
            services: d.nav.services,
            safety: d.nav.safety,
            about: d.nav.about,
            helipads: d.nav.helipads,
            destinations: d.nav.destinations,
            quote: d.nav.quote,
          }}
        />
        <main id="main-content">{children}</main>
        <SiteFooter locale={locale} brand={BRAND} d={d} phone={phone} email={email} credits={credits} />
      </body>
    </html>
  );
}
