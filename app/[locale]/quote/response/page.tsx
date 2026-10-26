import type { Metadata } from "next";
import { notFound } from "next/navigation";
import QuoteResponse from "@/components/QuoteResponse";
import { isLocale } from "@/lib/i18n";

export const metadata: Metadata = {
  robots: { index: false, follow: false, noarchive: true },
};

export default async function QuoteResponsePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <QuoteResponse locale={locale} />;
}
