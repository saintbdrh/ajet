"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n";
import LangSwitch from "@/components/LangSwitch";
import { experienceCopy } from "@/lib/experiences";

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
  const extra = experienceCopy[locale];
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
    [`/${locale}/airport-express`, extra.express],
    [`/${locale}/lounges`, extra.lounges],
    [`/${locale}/careers`, extra.careers],
    [`/${locale}/safety`, labels.safety],
    [`/${locale}/about`, labels.about],
    [`/${locale}/helipads`, labels.helipads],
    [`/${locale}/destinations`, labels.destinations],
  ];

  return (
    <header className={`hdr${isHome ? " hdr--over" : ""}${scrolled ? " is-scrolled" : ""}${open ? " is-open" : ""}`} onKeyDown={(event) => { if (event.key === "Escape" && open) { close(); event.currentTarget.querySelector<HTMLButtonElement>(".hdr__burger")?.focus(); } }}>
      <div className="hdr__bar">
        <Link href={`/${locale}`} className="hdr__brand" onClick={close} aria-label={`${brand} — ${brandTag}`}>
          <img className="brand-logo" src="/img/brand/ajet-logo.svg" width="138" height="41" alt={brand} />
        </Link>

        <nav className="hdr__nav" aria-label={locale === "mn" ? "Үндсэн цэс" : "Main navigation"}>
          {links.filter(([href]) => ["fleet", "services", "airport-express"].some((slug) => href.endsWith(`/${slug}`))).map(([href, label]) => (
            <Link key={href} href={href} onClick={close} className={pathname.startsWith(href) ? "is-active" : undefined}>{label}</Link>
          ))}
          <details className="hdr__explore" key={pathname} onKeyDown={(event) => { if (event.key === "Escape") { event.currentTarget.open = false; event.currentTarget.querySelector("summary")?.focus(); } }}>
            <summary>{extra.company}<span aria-hidden="true">＋</span></summary>
            <div>{links.filter(([href]) => !["fleet", "services", "airport-express"].some((slug) => href.endsWith(`/${slug}`))).map(([href, label]) => <Link key={href} href={href} onClick={(event) => { close(); const details = event.currentTarget.closest("details"); if (details) details.open = false; }} className={pathname.startsWith(href) ? "is-active" : undefined}>{label}<span aria-hidden="true">↗</span></Link>)}</div>
          </details>
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
            aria-label={open ? (locale === "mn" ? "Цэс хаах" : "Close menu") : (locale === "mn" ? "Цэс нээх" : "Open menu")}
            aria-expanded={open}
            aria-controls="mobile-navigation"
            onClick={() => setOpen((value) => !value)}
            onKeyDown={(event) => { if (event.key === "Escape") close(); }}
          >
            <span /><span />
          </button>
        </div>
      </div>

      <nav aria-label={locale === "mn" ? "Гар утасны цэс" : "Mobile navigation"} id="mobile-navigation" className="hdr__drawer" hidden={!open}>
        {links.map(([href, label], index) => (
          <Link key={href} href={href} onClick={close}>
            <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
            {label}
          </Link>
        ))}
        <Link href={`/${locale}/quote`} className="btn" onClick={close}>{labels.quote}</Link>
      </nav>
    </header>
  );
}
