import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import StudioHero from "@/components/StudioHero";
import KmFlownStat from "@/components/KmFlownStat";
import { formatMinorAmount } from "@/lib/money";
import { getDestinations, getFleet, getPricing, getSiteCopy, mediaUrl } from "@/lib/content";
import { getDatabase } from "@/lib/db";
import { getPublicStats } from "@/lib/flight-stats";
import { isLocale, t } from "@/lib/i18n";

type Waypoint = {
  id: string;
  en: { headline: string; sentence: string };
  mn: { headline: string; sentence: string };
};

const waypoints: Waypoint[] = [
  {
    id: "ub",
    en: { headline: "Mongolia, from a different altitude.", sentence: "A private departure from Ulaanbaatar, shaped around the journey ahead." },
    mn: { headline: "Монгол орныг өндрөөс тольдоорой.", sentence: "Улаанбаатараас эхлэх хувийн нислэгийг таны аялалд нийцүүлэн төлөвлөнө." },
  },
  {
    id: "gobi",
    en: { headline: "A horizon without end.", sentence: "Find a quieter perspective across the vast landscapes of the Gobi." },
    mn: { headline: "Хязгааргүй алсын бараа.", sentence: "Говийн уудам нутгийг тэнгэрээс харах аяллаа өөрөөр төлөвлөөрэй." },
  },
  {
    id: "khuvsgul",
    en: { headline: "Still water. Open sky.", sentence: "A considered journey towards the deep blue of Khuvsgul." },
    mn: { headline: "Цэнхэр мандал, уудам тэнгэр.", sentence: "Хөвсгөлийн цэнхэр нуурыг зорих аяллыг тань хамт төлөвлөе." },
  },
  {
    id: "altai",
    en: { headline: "Where the mountains meet the sky.", sentence: "Explore Mongolia's western ranges with a route planned for you." },
    mn: { headline: "Уулс тэнгэртэй нийлэх Алтай.", sentence: "Монгол орны баруун хязгаарын аяллыг таны хүсэлтээр төлөвлөнө." },
  },
];

function priceFor(destinationId: string, prices: Awaited<ReturnType<typeof getPricing>>, locale: "mn" | "en") {
  const price = prices.find((item) =>
    item.kind === "route" &&
    item.destinationId === destinationId &&
    Number.isFinite(item.amountMinor) &&
    item.amountMinor > 0,
  );
  return price ? formatMinorAmount(price.amountMinor, price.currency, locale) : null;
}

function firstSentence(value: string | undefined, fallback: string) {
  const sentence = value?.trim().split(/(?<=[.!?])\s+/u, 1)[0]?.trim();
  return sentence || fallback;
}

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const db = await getDatabase();
  const [copy, destinations, prices, fleet, stats] = await Promise.all([
    getSiteCopy(locale),
    getDestinations(),
    getPricing(),
    getFleet(),
    getPublicStats(db),
  ]);
  const mn = locale === "mn";
  const d = t(locale, copy);
  const aircraft = fleet.find((item) => !item.placeholder && item.name.toLowerCase().includes("ec145"));
  const verifiedAircraft = aircraft?.specificationsVerified ? aircraft : undefined;

  return (
    <div className="signature-home">
      <section className="studio-return" aria-labelledby="studio-title">
        <div className="studio-return__film"><StudioHero locale={locale} /></div>
        <div className="studio-return__copy">
          <p className="eyebrow">A-JET AVIATION · {mn ? "МОНГОЛ" : "MONGOLIA"}</p>
          <h1 id="studio-title">{mn ? "Монголыг өөр өнцгөөс мэдрээрэй." : "Mongolia, from a different altitude."}</h1>
          <p className="studio-return__intro">{mn ? "Таны хэмнэлээр. Таны хүссэн зүгт. Аялал бүрийг танд зориулж төлөвлөнө." : "Your pace. Your destination. A private journey, considered around you."}</p>
          <div className="studio-return__actions">
            <Link className="studio-return__primary" href={`/${locale}/estimate`}>{mn ? "Аяллаа төлөвлөх" : "Plan your journey"}<span aria-hidden="true">↗</span></Link>
            <Link className="studio-return__secondary" href={`/${locale}/fleet`}>{mn ? "Нисэх парктай танилцах" : "Explore the fleet"}<span aria-hidden="true">→</span></Link>
          </div>
        </div>
        <div className="studio-return__footer"><span>AIRBUS EC145</span><span>{mn ? "ХУВИЙН НИСЛЭГ · ОНЦГОЙ ҮЙЛЧИЛГЭЭ" : "PRIVATE FLIGHTS · PERSONAL SERVICE"}</span></div>
      </section>

      <section className="signature-journey" aria-label={mn ? "Улаанбаатар, Говь, Хөвсгөл, Алтай чиглэлийн аялал" : "A journey through Ulaanbaatar, the Gobi, Khuvsgul and the Altai"}>
        <svg className="signature-route" viewBox="0 0 100 1000" preserveAspectRatio="none" aria-hidden="true">
          <path className="signature-route__line" pathLength="1" d="M50 0 C50 42 39 61 48 94 S70 186 51 254 S26 390 49 500 S73 649 51 750 S28 874 50 1000" />
          <circle cx="50" cy="63" r="7" />
          <circle cx="51" cy="254" r="7" />
          <circle cx="49" cy="500" r="7" />
          <circle cx="50" cy="750" r="7" />
        </svg>

        <div className="signature-destinations">
          {waypoints.slice(1).map((waypoint, index) => {
            const destination = destinations.find((item) => item.id === waypoint.id);
            const copyForWaypoint = mn ? waypoint.mn : waypoint.en;
            const name = destination?.name[locale] ?? (mn
              ? waypoint.id === "gobi" ? "Говь" : waypoint.id === "khuvsgul" ? "Хөвсгөл" : "Алтай"
              : waypoint.id === "gobi" ? "Gobi" : waypoint.id === "khuvsgul" ? "Khuvsgul" : "Altai");
            const description = firstSentence(destination?.desc?.[locale], copyForWaypoint.sentence);
            const price = priceFor(waypoint.id, prices, locale);
            const destinationPhoto = destination && !destination.placeholder ? destination.imageKey : undefined;
            return (
              <article className={`signature-destination signature-destination--${waypoint.id}`} key={waypoint.id} aria-labelledby={`destination-${waypoint.id}`}>
                {destinationPhoto ? (
                  <Image
                    className="signature-destination__image"
                    src={mediaUrl(destinationPhoto)}
                    alt={destination?.alt[locale] ?? ""}
                    width={1920}
                    height={1200}
                    sizes="100vw"
                    loading="lazy"
                    unoptimized
                    style={{ objectPosition: `${destination?.focalX ?? 50}% ${destination?.focalY ?? 50}%` }}
                  />
                ) : (
                  <div className="signature-destination__image signature-destination__image--slot" aria-hidden="true" />
                )}
                <div className="signature-destination__shade" />
                {!destinationPhoto && <span className="signature-destination__placeholder">{mn ? `${name} · БОДИТ ЗУРГИЙН ОРОН ЗАЙ` : `${name.toUpperCase()} · PHOTOGRAPHY SLOT`}</span>}
                <div className="signature-destination__content">
                  <p className="signature-waypoint"><span>0{index + 2}</span>{name}</p>
                  <h2 id={`destination-${waypoint.id}`}>{copyForWaypoint.headline}</h2>
                  <p className="signature-destination__sentence">{description}</p>
                  <div className="signature-destination__actions">
                    <span className="signature-price">
                      <span>{mn ? "ЭХЛЭХ ҮНЭ" : "FROM"}</span>
                      <strong>{price ?? (mn ? "Хүсэлтээр" : "Price on request")}</strong>
                    </span>
                    <Link className="signature-link" href={`/${locale}/quote?destination=${encodeURIComponent(name)}`}>
                      {mn ? "Чиглэл хүсэх" : "Request this route"} <span aria-hidden="true">↗</span>
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <KmFlownStat stats={stats} locale={locale} />

      <section className="signature-aircraft" id="fleet">
        <div className="signature-aircraft__copy">
          <p className="eyebrow">{mn ? "АЖЛЫН НИСЭХ ХӨЛӨГ" : "THE AIRCRAFT"}</p>
          <h2>Airbus<br />EC145</h2>
          <p>{aircraft?.desc?.[locale] ?? (mn
            ? "EC145 нисдэг тэрэгний тохиргоо болон боломжийг хүсэлт бүрээр баталгаажуулна."
            : "The EC145 cabin and aircraft availability are confirmed for every request.")}</p>
          <div className="signature-aircraft__specs" aria-label={mn ? "Баталгаажсан техникийн үзүүлэлт" : "Verified aircraft specifications"}>
            <div><strong>{verifiedAircraft?.seats ?? "—"}</strong><span>{mn ? "СУУДАЛ" : "SEATS"}</span></div>
            <div><strong>{verifiedAircraft?.cruiseKmh ?? "—"}</strong><span>{mn ? "КМ/ЦАГ" : "CRUISE KM/H"}</span></div>
            <div><strong>{verifiedAircraft?.rangeKm ?? "—"}</strong><span>{mn ? "КМ" : "RANGE KM"}</span></div>
          </div>
          <Link className="signature-link signature-link--dark" href={`/${locale}/fleet`}>
            {mn ? "Нисэх парктай танилцах" : "Explore the fleet"} <span aria-hidden="true">↗</span>
          </Link>
        </div>
        <div className="signature-aircraft__visual">
          <Image
            src={aircraft?.imageKey ? mediaUrl(aircraft.imageKey) : "/img/ajet-aircraft-side.webp"}
            alt={aircraft?.alt[locale] ?? (mn ? "A-JET EC145 нисдэг тэрэгний хажуу талаас харагдах дүрслэл" : "Side view of the A-JET EC145")}
            width={1800}
            height={800}
            sizes="(max-width: 760px) 100vw, 58vw"
            loading="lazy"
            unoptimized
          />
        </div>
      </section>

      <section className="signature-editorial">
        <Image
          className="signature-editorial__image"
          src="/img/ajet/ec145-cabin.webp"
          alt={mn ? "A-JET EC145 нисдэг тэрэгний бүхээг" : "The A-JET EC145 passenger cabin"}
          width={1333}
          height={1030}
          sizes="(max-width: 760px) 100vw, 55vw"
          loading="lazy"
          unoptimized
        />
        <div className="signature-editorial__copy">
          <p className="eyebrow">{mn ? "НИСЛЭГЭЭС ЦААШХИ АЯЛАЛ" : "MORE THAN THE FLIGHT"}</p>
          <h2>{mn ? "Таны аялалд зориулж." : "Considered around you."}</h2>
          <p>{mn
            ? "Чиглэл, хуваарь болон нэмэлт үйлчилгээний хүсэлтээ хуваалцаарай. Манай баг аяллын төлөвлөгөөг хамт боловсруулна."
            : "Share your route, schedule and any additional needs. Our team will shape a thoughtful plan around your journey."}</p>
          <Link className="signature-link signature-link--dark" href={`/${locale}/quote`}>
            {d.hero.cta} <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
