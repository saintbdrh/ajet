import Link from "next/link";
import type { Dict, Locale } from "@/lib/i18n";

export default function SiteFooter({
  locale,
  brand,
  d,
  phone,
  email,
}: {
  locale: Locale;
  brand: string;
  d: Dict;
  phone?: string;
  email?: string;
}) {
  return (
    <footer className="foot">
      <div className="wrap">
        <div className="foot__top">
          <div className="foot__brand">
            <Link href={`/${locale}`} className="foot__wordmark">
              <span className="hdr__mark" aria-hidden="true" />
              {brand}
            </Link>
            <p>{d.foot.tagline}</p>
            <ul className="foot__creds">
              {d.credentials.items.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>

          <nav className="foot__col" aria-label={d.foot.explore}>
            <h4>{d.foot.explore}</h4>
            <ul>
              <li><Link href={`/${locale}/fleet`}>{d.nav.fleet}</Link></li>
              <li><Link href={`/${locale}/services`}>{d.nav.services}</Link></li>
              <li><Link href={`/${locale}/safety`}>{d.nav.safety}</Link></li>
              <li><Link href={`/${locale}/about`}>{d.nav.about}</Link></li>
              <li><Link href={`/${locale}/helipads`}>{d.nav.helipads}</Link></li>
              <li><Link href={`/${locale}/destinations`}>{d.nav.destinations}</Link></li>
            </ul>
          </nav>

          <nav className="foot__col" aria-label={d.foot.company}>
            <h4>{d.foot.company}</h4>
            <ul>
              <li><Link href={`/${locale}/quote`}>{d.nav.quote}</Link></li>
              <li><a href={`/${locale}#safety`}>{d.nav.safety}</a></li>
              <li><a href={`/${locale}#about`}>{d.nav.about}</a></li>
              <li><a href={`/${locale}#contact`}>{d.nav.contact}</a></li>
            </ul>
          </nav>

          <div className="foot__col" id="contact">
            <h4>{d.foot.contact}</h4>
            <ul>
              {phone && <li><a href={`tel:${phone.replace(/[^\d+]/g, "")}`}>{phone}</a></li>}
              {email && <li><a href={`mailto:${email}`}>{email}</a></li>}
              <li className="foot__address">{d.foot.address}</li>
            </ul>
          </div>
        </div>

        <div className="foot__legal">
          <span>{d.foot.rights}</span>
          <span>{d.foot.legal}</span>
          <a href="#top" className="foot__top-link">{d.foot.backToTop} <span aria-hidden="true">↑</span></a>
        </div>

        <p className="foot__note">{d.foot.note}</p>
        <p className="foot__note foot__note--credit">
          {locale === "mn" ? "Бусад зургийн эх сурвалж:" : "Additional photography:"}{" "}
          <a href="https://commons.wikimedia.org/wiki/File:Tengboche,_Helicopter_in_flight,_Mountains_of_Nepal.jpg" target="_blank" rel="noreferrer">
            Vyacheslav Argenberg · CC BY 4.0
          </a>
        </p>
      </div>
    </footer>
  );
}
