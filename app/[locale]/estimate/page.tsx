import LakeTour from "@/components/LakeTour";
import { notFound } from "next/navigation";
import FlightPlanner from "@/components/FlightPlanner";
import { getDestinations, getFleet } from "@/lib/content";
import { isLocale } from "@/lib/i18n";
import { plannerCopy, referencePlaces, plannerEnquiry, type PlannerPoint } from "@/lib/planner";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return { title: locale === "mn" ? "Аяллаа төлөвлөх" : "Plan your journey", description: isLocale(locale) ? plannerCopy[locale].intro : "" };
}
export default async function Estimate({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Record<string,string|string[]|undefined>> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const [destinations, fleet, query] = await Promise.all([getDestinations(), getFleet(), searchParams]);
  const places: PlannerPoint[] = referencePlaces.map((p) => ({ id: p.id, name: p[locale], lat: p.lat, lng: p.lng }));
  for (const p of destinations.filter((p) => !p.placeholder && p.coordinatesVerified)) {
    const point = { id: p.id, name: p.name[locale], lat: p.lat, lng: p.lng };
    const index = places.findIndex((item) => item.id === p.id);
    if (index === -1) places.push(point); else places[index] = point;
  }
  const aircraft = fleet.filter((a) => !a.placeholder && a.seats && a.seats > 0).map((a) => ({ name: a.name, seats: Math.min(a.seats!, 20), image: "/img/ajet/studio-detail.webp" }));
  const parsed = plannerEnquiry(query, locale, fleet.filter(a => !a.placeholder));
  const initialJourney = parsed ? {
    from: { id: "custom-from", name: parsed.from, lat: Number(query.fromLat), lng: Number(query.fromLng) },
    to: { id: "custom-to", name: parsed.to, lat: Number(query.toLat), lng: Number(query.toLng) },
    roundTrip: parsed.roundTrip, pax: parsed.pax, date: parsed.date, waiting: String(query.waiting), aircraft: parsed.aircraft,
  } : undefined;
  if(initialJourney) {
    for(const target of ["from","to"] as const) {
      const point=initialJourney[target];
      const known=places.find(p => Math.abs(p.lat-point.lat)<.00001 && Math.abs(p.lng-point.lng)<.00001);
      if(known)initialJourney[target]=known;
    }
  }
  return <>
    <FlightPlanner locale={locale} places={places} aircraft={aircraft.length ? aircraft : [{ name: "Airbus EC145", seats: 8 }]} initialJourney={initialJourney} />
    <LakeTour locale={locale} />
  </>;
}
