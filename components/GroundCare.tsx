import Link from "next/link";
import type { Locale } from "@/lib/i18n";
import { journeyCopy } from "@/lib/journey";

export default function GroundCare({ locale }: { locale: Locale }) {
  const d = journeyCopy[locale];
  return <section className="section ground-care"><div className="wrap ground-care__grid"><div><p className="eyebrow">{d.transferKicker}</p><h2>{d.transferTitle}</h2></div><div><span className="ground-care__status">{d.transferStatus}</span><p className="lede">{d.transferBody}</p><Link href={`/${locale}/quote?extras=transfers`} className="link-arrow">{d.transferAction}</Link></div></div></section>;
}
