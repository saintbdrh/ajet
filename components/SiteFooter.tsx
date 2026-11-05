import Link from "next/link";
import { experienceCopy } from "@/lib/experiences";
import type { Dict, Locale } from "@/lib/i18n";

export default function SiteFooter({
  locale,
  brand,
  d,
  phone,
  email,
  credits = [],
}: {
  locale: Locale;
  brand: string;
  d: Dict;
  phone?: string;
  email?: string;
  credits?: [string, string][];
}) {
  return (
    <footer className="foot">
      <div className="wrap">
        <div className="foot__top">
          <div className="foot__brand">
            <Link href={`/${locale}`} className="foot__wordmark">
              <img className="brand-logo" src="/img/brand/ajet-logo.svg" width="170" height="51" alt={brand} />
            </Link>
            <p>{d.foot.tagline}</p>
            <ul className="foot__creds">
              {d.credentials.items.filter((item) => !item.includes("[")).map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>

          <nav className="foot__col" aria-label={d.foot.explore}>
            <h4>{d.foot.explore}</h4>
            <ul>
              <li><Link href={`/${locale}/estimate`}>{d.nav.estimate}</Link></li>
              <li><Link href={`/${locale}/fleet`}>{d.nav.fleet}</Link></li>
              <li><Link href={`/${locale}/services`}>{d.nav.services}</Link></li>
              <li><Link href={`/${locale}/safety`}>{d.nav.safety}</Link></li>
              <li><Link href={`/${locale}/about`}>{d.nav.about}</Link></li>
              <li><Link href={`/${locale}/helipads`}>{d.nav.helipads}</Link></li>
              <li><Link href={`/${locale}/destinations`}>{locale === "mn" ? "Аялал маршрут" : "Tour itineraries"}</Link></li>
            </ul>
          </nav>

          <nav className="foot__col" aria-label={d.foot.company}>
            <h4>{d.foot.company}</h4>
            <ul>
              <li><Link href={`/${locale}/airport-express`}>{experienceCopy[locale].express}</Link></li>
              <li><Link href={`/${locale}/lounges`}>{experienceCopy[locale].lounges}</Link></li>
              <li><Link href={`/${locale}/privacy`}>{locale === "mn" ? "Мэдээллийн нууцлал" : "Your information"}</Link></li>
              <li><Link href={`/${locale}/careers`}>{experienceCopy[locale].careers}</Link></li>
              <li><Link href={`/${locale}/quote`}>{d.nav.quote}</Link></li>


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
        {credits.length > 0 && (
          <p className="foot__note foot__note--credit">
            {locale === "mn" ? "Бусад зургийн эх сурвалж:" : "Additional photography:"}{" "}
            {credits.map(([text, url], index) => (
              <span key={text}>
                {index > 0 && " · "}
                {url ? <a href={url} target="_blank" rel="noreferrer">{text}</a> : text}
              </span>
            ))}
          </p>
        )}
      </div>
    </footer>
  );
}
