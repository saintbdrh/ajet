"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n";
import LangSwitch from "@/components/LangSwitch";

export default function SiteHeader({
  locale,
  fleetLabel,
  destinationsLabel,
  quoteLabel,
}: {
  locale: Locale;
  fleetLabel: string;
  destinationsLabel: string;
  quoteLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const isHome = pathname === `/${locale}`;

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    let frame = 0;
    const updateScrollState = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setScrolled(window.scrollY > 32));
    };
    updateScrollState();
    window.addEventListener("scroll", updateScrollState, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", updateScrollState);
    };
  }, [pathname]);

  return (
    <header className={`top${isHome ? " over-hero" : ""}${scrolled ? " scrolled" : ""}${open ? " menu-open" : ""}`}>
      <Link href={`/${locale}`} className="brand" onClick={() => setOpen(false)}>
        <span className="brand-mark" aria-hidden="true"><i /></span>
        <span>{process.env.NEXT_PUBLIC_BRAND ?? "Ajet"}
          <small>{locale === "mn" ? "Нислэг" : "Charter"}</small>
        </span>
      </Link>
      <button
        className={`menu-toggle${open ? " active" : ""}`}
        type="button"
        aria-label={open
          ? (locale === "mn" ? "Цэс хаах" : "Close navigation menu")
          : (locale === "mn" ? "Цэс нээх" : "Open navigation menu")}
        aria-expanded={open}
        aria-controls="primary-navigation"
        onClick={() => setOpen((value) => !value)}
      >
        <span /><span /><span />
      </button>
      <nav id="primary-navigation" className={`site-nav${open ? " open" : ""}`} aria-label="Main">
        <Link href={`/${locale}/fleet`} onClick={() => setOpen(false)}>{fleetLabel}</Link>
        <Link href={`/${locale}/destinations`} onClick={() => setOpen(false)}>{destinationsLabel}</Link>
        <LangSwitch locale={locale} />
        <Link href={`/${locale}/quote`} className="btn sm" onClick={() => setOpen(false)}>{quoteLabel}</Link>
      </nav>
    </header>
  );
}
