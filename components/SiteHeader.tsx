"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n";
import LangSwitch from "@/components/LangSwitch";

type NavLabels = {
  fleet: string;
  services: string;
  safety: string;
  about: string;
  helipads: string;
  destinations: string;
  quote: string;
};

export default function SiteHeader({
  locale,
  brand,
  brandTag,
  labels,
  phone,
}: {
  locale: Locale;
  brand: string;
  brandTag: string;
  labels: NavLabels;
  phone?: string;
}) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const isHome = pathname === `/${locale}`;
  const close = () => setOpen(false);

  useEffect(() => {
    close();
  }, [pathname]);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setScrolled(window.scrollY > 24));
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update);
    };
  }, [pathname]);

  useEffect(() => {
    document.body.classList.toggle("nav-open", open);
    return () => document.body.classList.remove("nav-open");
  }, [open]);

  const links: [string, string][] = [
    [`/${locale}/fleet`, labels.fleet],
    [`/${locale}/services`, labels.services],
    [`/${locale}/safety`, labels.safety],
    [`/${locale}/about`, labels.about],
    [`/${locale}/helipads`, labels.helipads],
    [`/${locale}/destinations`, labels.destinations],
  ];

  return (
    <header className={`hdr${isHome ? " hdr--over" : ""}${scrolled ? " is-scrolled" : ""}${open ? " is-open" : ""}`}>
      <div className="hdr__bar">
        <Link href={`/${locale}`} className="hdr__brand" onClick={close}>
          <span className="hdr__mark" aria-hidden="true" />
          <span className="hdr__word">
            {brand}
            <small>{brandTag}</small>
          </span>
        </Link>

        <nav className="hdr__nav" aria-label="Main">
          {links.map(([href, label]) => (
            <Link key={href} href={href} onClick={close} className={pathname.startsWith(href) ? "is-active" : undefined}>
              {label}
            </Link>
          ))}
        </nav>

        <div className="hdr__actions">
          {phone && <a className="hdr__phone" href={`tel:${phone.replace(/[^\d+]/g, "")}`}>{phone}</a>}
          <LangSwitch locale={locale} />
          <Link href={`/${locale}/quote`} className="btn btn--sm hdr__cta" onClick={close}>
            {labels.quote}
          </Link>
          <button
            className="hdr__burger"
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-navigation"
            onClick={() => setOpen((value) => !value)}
          >
            <span /><span />
          </button>
        </div>
      </div>

      <div id="mobile-navigation" className="hdr__drawer" hidden={!open}>
        {links.map(([href, label], index) => (
          <Link key={href} href={href} onClick={close}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            {label}
          </Link>
        ))}
        <Link href={`/${locale}/quote`} className="btn" onClick={close}>{labels.quote}</Link>
      </div>
    </header>
  );
}
