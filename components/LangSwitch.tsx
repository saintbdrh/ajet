"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n";

export default function LangSwitch({ locale }: { locale: Locale }) {
  const path = usePathname() ?? `/${locale}`;
  const router = useRouter();
  const other: Locale = locale === "mn" ? "en" : "mn";
  const href = path.replace(/^\/(mn|en)/, `/${other}`);
  return (
    <Link href={href} onClick={(event) => {
      if (window.location.search || window.location.hash) {
        event.preventDefault();
        router.push(`${href}${window.location.search}${window.location.hash}`);
      }
    }} hrefLang={other} lang={other} className="lang">
      {other === "mn" ? "МН" : "EN"}
    </Link>
  );
}
