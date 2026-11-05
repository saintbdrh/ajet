import Link from "next/link";
import type { Locale } from "@/lib/i18n";
import { journeyCopy } from "@/lib/journey";

export default function ServiceCollection({ locale, detailed = false }: { locale: Locale; detailed?: boolean }) {
  const d = journeyCopy[locale];
  return <div className={`journey-services${detailed ? " journey-services--detailed" : ""}`}>
    {d.services.map((service) => <article id={detailed ? service.id : undefined} className="journey-service" key={service.id}>
      <div className="journey-service__image"><img src={service.image} alt={service.alt} width="1600" height="1066" loading="lazy" />{service.id === "photography" && <span>{locale === "mn" ? "A-JET студийн дүрслэл" : "A-JET studio visualisation"}</span>}</div>
      <div className="journey-service__body"><span className="journey-service__number">{service.index}</span><h3>{service.name}</h3><p>{service.body}</p>{detailed && <p>{service.detail}</p>}<Link className="link-arrow" href={`/${locale}/services/${service.id}`}>{locale === "mn" ? "Дэлгэрэнгүй танилцах" : "Explore the service"}</Link></div>
    </article>)}
  </div>;
}
