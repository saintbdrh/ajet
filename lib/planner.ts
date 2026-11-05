import type { Locale } from "@/lib/i18n";

export type PlannerPoint = { id: string; name: string; lat: number; lng: number };
export const referencePlaces = [
  { id: "ub", mn: "Улаанбаатар", en: "Ulaanbaatar", lat: 47.92, lng: 106.92 },
  { id: "terelj", mn: "Тэрэлж", en: "Terelj", lat: 47.95, lng: 107.45 },
  { id: "khuvsgul", mn: "Хөвсгөл", en: "Khuvsgul", lat: 50.45, lng: 100.16 },
  { id: "gobi", mn: "Говь", en: "Gobi", lat: 43.57, lng: 104.42 },
];

/** Great-circle distance. This is geographical distance, never an operational route. */
export function distanceKm(a: Pick<PlannerPoint, "lat" | "lng">, b: Pick<PlannerPoint, "lat" | "lng">): number {
  const rad = (v: number) => v * Math.PI / 180;
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(Math.max(0, Math.min(1, h))));
}
export function validCoordinates(lat: number, lng: number) {
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

/** Query values describe an enquiry only; they never authorize or price a flight. */
export function plannerEnquiry(query: Record<string, string | string[] | undefined>, locale: Locale, aircraft: { name: string; seats?: number }[]) {
  const value = (key: string) => typeof query[key] === "string" ? query[key] as string : "";
  if (value("planner") !== "1") return undefined;
  const from = value("from").replace(/[\u0000-\u001f]/g, "").trim();
  const to = value("to").replace(/[\u0000-\u001f]/g, "").trim();
  const coordinateKeys = ["fromLat", "fromLng", "toLat", "toLng"];
  if (coordinateKeys.some((key) => !value(key).trim())) return undefined;
  const [fromLat, fromLng, toLat, toLng] = coordinateKeys.map((key) => Number(value(key)));
  const pax = Number(value("pax"));
  const waiting = Number(value("waiting"));
  const selected = aircraft.find((a) => a.name === value("aircraft"));
  if (from.length < 2 || to.length < 2 || from.length > 100 || to.length > 100 || !validCoordinates(fromLat, fromLng) || !validCoordinates(toLat, toLng) || !Number.isInteger(pax) || pax < 1 || pax > Math.min(selected?.seats ?? 8, 20) || !Number.isFinite(waiting) || waiting < 0 || waiting > 168 || !value("waiting").trim()) return undefined;
  const distance = distanceKm({ lat: fromLat, lng: fromLng }, { lat: toLat, lng: toLng });
  if (distance < .1) return undefined;
  const rawDate = value("date");
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(rawDate) && !Number.isNaN(Date.parse(`${rawDate}T00:00:00Z`)) && new Date(`${rawDate}T00:00:00Z`).toISOString().slice(0, 10) === rawDate;
  const coordinates = `${fromLat.toFixed(5)}, ${fromLng.toFixed(5)} → ${toLat.toFixed(5)}, ${toLng.toFixed(5)}`;
  const notes = locale === "mn"
    ? `Аялал төлөвлөгч: ${coordinates}. Нэг талын шулуун зай ${distance.toFixed(1)} км. Очих газарт ${waiting} цаг байна. Нисэх хугацаа, түлш болон буух цэгийг баг шалгана.`
    : `Route planner: ${coordinates}. Direct one-way distance ${distance.toFixed(1)} km. Planned time at destination ${waiting} hours. Flight time, fuel and landing sites require team review.`;
  return { from, to, notes, pax: String(pax), roundTrip: value("roundTrip") === "true", date: validDate ? rawDate : "", aircraft: selected?.name ?? "" };
}

export const plannerCopy = {
  en: {
    kicker: "YOUR JOURNEY, BEFORE TAKEOFF", title: "Begin with a place.",
    intro: "Choose your departure and destination. Explore the distance, tell us who is travelling, then let our team shape the flight around you.",
    map: "Explore your route", mapLabel: "Interactive route map. Use the coordinate fields as an alternative to the map.",
    mapHint: "Choose which point to place, then tap the map. Scroll to move the page; use + and − to zoom the map.",
    from: "Departure", to: "Destination", swap: "Reverse route", choose: "Choose a place", custom: "Custom map point", customFrom: "Selected departure", customTo: "Selected destination",
    coordinateTitle: "Set precise coordinates", lat: "Latitude", lng: "Longitude", apply: "Apply coordinates", invalid: "Enter latitude from −90 to 90 and longitude from −180 to 180.",
    reference: "Place names mark general areas, not approved landing sites. Set the exact point on the map or enter coordinates.",
    details: "Your flight preferences", oneWay: "One way", return: "Return journey", passengers: "Passengers", date: "Preferred date (optional)", waiting: "Time at destination (hours)",
    aircraft: "Aircraft preference", upTo: "Up to", people: "passengers", aircraftNote: "Passenger and baggage capacity, aircraft availability and landing sites are confirmed for your request.",
    summary: "Your journey at a glance", direct: "Direct distance · one way", total: "Direct distance · total", km: "km", distanceNote: "Distances connect the selected points in a straight line. The flown route may be longer.",
    duration: "Flight time & fuel stops", reviewed: "Planned by our flight team", durationNote: "Our team checks the route, weather, load, fuel and landing permissions before confirming your itinerary.",
    price: "A proposal tailored to your journey", priceNote: "Send your plans for a private written quotation, including flight time and any waiting arrangements.",
    request: "Continue with this journey", same: "Select two different points to plan a journey.", pending: "Select your destination to begin.",
    note: "This tool helps you describe a journey. It does not confirm flight availability, landing permission or a booking.",
    mapError: "The map background could not load. You can still choose places or enter coordinates below.", loading: "Loading your map…", hours: "hours", waitingNote: "Share your planned time on the ground. Waiting terms are agreed in your quotation.",
    reset: "Reset journey", saved: "Coordinates applied.", point: "Place on map", small: "A-JET · Route planner",
  },
  mn: {
    kicker: "ХӨӨРӨХӨӨС ӨМНӨ АЯЛЛАА ТӨЛӨВЛӨЕ", title: "Аялал тань нэг цэгээс эхэлнэ.",
    intro: "Хаанаас хаашаа явахаа сонгож, замын зай болон аяллын мэдээллээ бэлдээрэй. Манай баг таны хүсэлтэд тохирсон нислэгийг төлөвлөнө.",
    map: "Чиглэлээ сонгох", mapLabel: "Аяллын чиглэл сонгох газрын зураг. Газрын зургийн оронд координатын талбаруудыг ашиглаж болно.",
    mapHint: "Тэмдэглэх цэгээ сонгоод газрын зураг дээр дарна уу. Газрын зургийг +, − товчоор томруулж, жижигрүүлнэ.",
    from: "Хаанаас", to: "Хаашаа", swap: "Чиглэл солих", choose: "Байршил сонгох", custom: "Газрын зураг дээрх цэг", customFrom: "Сонгосон эхлэх цэг", customTo: "Сонгосон очих цэг",
    coordinateTitle: "Координатаар оруулах", lat: "Өргөрөг", lng: "Уртраг", apply: "Координат оруулах", invalid: "Өргөргийг −90–90, уртрагыг −180–180 хооронд оруулна уу.",
    reference: "Жагсаалтын цэгүүд нь тухайн газрын ерөнхий байршил бөгөөд зөвшөөрөгдсөн буух талбай биш. Газрын зураг эсвэл координатаар хүссэн цэгээ нарийвчлан сонгоорой.",
    details: "Аяллын мэдээлэл", oneWay: "Нэг талдаа", return: "Очно, буцна", passengers: "Зорчигчийн тоо", date: "Хүссэн огноо (заавал биш)", waiting: "Очих газарт байх хугацаа (цаг)",
    aircraft: "Нисдэг тэрэгний сонголт", upTo: "", people: "хүртэл зорчигч", aircraftNote: "Зорчигч, тээшний багтаамж, нисдэг тэрэг болон буух талбайн боломжийг хүсэлт бүрээр баталгаажуулна.",
    summary: "Таны аяллын тойм", direct: "Шулуун зай · нэг талдаа", total: "Шулуун зай · нийт", km: "км", distanceNote: "Сонгосон хоёр цэгийн хоорондох шулуун зайг харуулж байна. Бодит нислэгийн зам урт байж болно.",
    duration: "Нисэх хугацаа, түлш авах цэг", reviewed: "Нислэгийн баг төлөвлөнө", durationNote: "Манай баг чиглэл, цаг агаар, ачаалал, түлш болон буух зөвшөөрлийг шалгасны дараа аяллыг баталгаажуулна.",
    price: "Таны аялалд тохирсон үнийн санал", priceNote: "Төлөвлөгөөгөө илгээгээрэй. Нисэх хугацаа, хүлээлгийн нөхцөл болон үнийн саналыг бичгээр тохиролцоно.",
    request: "Энэ аяллаар хүсэлт өгөх", same: "Аялал төлөвлөхийн тулд хоёр өөр цэг сонгоно уу.", pending: "Эхлэхийн тулд очих газраа сонгоно уу.",
    note: "Энэ хэсэг нь аяллын хүсэлтээ бэлтгэхэд тусална. Нислэгийн боломж, буух зөвшөөрөл болон захиалга баталгаажсан гэсэн үг биш.",
    mapError: "Газрын зургийн дэвсгэр ачаалагдсангүй. Байршлын жагсаалт эсвэл координатыг ашиглан үргэлжлүүлэх боломжтой.", loading: "Газрын зураг ачаалж байна…", hours: "цаг", waitingNote: "Газар дээр байх төлөвлөсөн хугацаагаа оруулна уу. Хүлээлгийн нөхцөлийг үнийн саналд тохиролцоно.",
    reset: "Шинээр төлөвлөх", saved: "Координатыг орууллаа.", point: "Зураг дээр тэмдэглэх", small: "A-JET · Аялал төлөвлөлт",
  },
} satisfies Record<Locale, Record<string, string>>;
