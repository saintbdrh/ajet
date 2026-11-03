import { getDatabase } from "@/lib/db";
import { isCmsCopyKey, type CmsCopy, type Locale } from "@/lib/i18n";
import { defaultMediaSlots, type Localized, type MediaSlot } from "@/lib/media";

export { defaultMediaSlots, mediaUrl, slotStill, type Localized, type MediaSlot } from "@/lib/media";

/**
 * Picks `count` media slots whose imagery varies from tile to tile, so a preview
 * build with only a handful of photographs never shows the same picture twice in
 * a row. Order follows the slots table.
 */
export function variedSlots(slots: MediaSlot[], count: number): MediaSlot[] {
  const seen = new Set<string>();
  const unique = slots.filter((slot) => {
    if (seen.has(slot.imageKey)) return false;
    seen.add(slot.imageKey);
    return true;
  });
  const pool = unique.length > 0 ? unique : slots;
  if (pool.length === 0) return [];
  return Array.from({ length: count }, (_, index) => pool[index % pool.length]);
}

export async function getMediaSlots(): Promise<MediaSlot[]> {
  const db = await getDatabase();
  if (!db) return defaultMediaSlots;
  const result = await db.prepare(
    `SELECT slot_key, image_key, poster_key, focal_x, focal_y, alt_mn, alt_en, credit_text, credit_url
     FROM media_slots ORDER BY slot_key`,
  ).all<{
    slot_key: string; image_key: string; poster_key: string | null; focal_x: number; focal_y: number;
    alt_mn: string; alt_en: string; credit_text: string; credit_url: string;
  }>();
  if (!result.success) throw new Error(result.error ?? "Could not load section photos from the database.");
  if (!result.results.length) return defaultMediaSlots;
  return result.results.map((row) => ({
    key: row.slot_key,
    imageKey: row.image_key,
    posterKey: row.poster_key,
    focalX: row.focal_x,
    focalY: row.focal_y,
    alt: { mn: row.alt_mn, en: row.alt_en },
    creditText: row.credit_text,
    creditUrl: row.credit_url,
  }));
}

export async function getMediaSlot(key: string): Promise<MediaSlot> {
  const slots = await getMediaSlots();
  return slots.find((slot) => slot.key === key) ?? defaultMediaSlots.find((slot) => slot.key === key) ?? defaultMediaSlots[0];
}
export type Aircraft = {
  id: string; name: string; seats?: number; rangeKm?: number; cruiseKmh?: number;
  payloadKg?: number; desc?: Localized; placeholder?: boolean; imageKey?: string;
  focalX: number; focalY: number; alt: Localized;
  specificationSource?: string; specificationsVerified?: boolean;
};
export type Destination = {
  id: string; name: Localized; lat: number; lng: number; desc?: Localized; placeholder?: boolean; imageKey?: string;
  focalX: number; focalY: number; alt: Localized;
  coordinateSource?: string; coordinatesVerified?: boolean;
};
export type PricingItem = {
  id: string;
  kind: "route" | "hourly" | "membership" | "other";
  label: Localized;
  note: Localized;
  amountMinor: number;
  currency: string;
  unit: "per_flight" | "per_hour" | "per_package";
  destinationId: string | null;
  aircraftId: string | null;
  orderIndex: number;
};

// Client-supplied aircraft summary. Operations confirms configuration and availability for every request.
const seedFleet: Aircraft[] = [
  { id: "client-ec145", name: "Airbus EC145", seats: 8,
    desc: { mn: "Хувийн болон бизнес аялалд зориулсан, найм хүртэлх зорчигчтой нислэг. Боломжийг хүсэлт бүрээр баталгаажуулна.", en: "Private and business travel for up to eight passengers, with availability confirmed for each request." },
    imageKey: "/img/ajet/ec145-rooftop.webp", focalX: 50, focalY: 60,
    alt: { mn: "A-JET EC145 нисдэг тэрэг", en: "A-JET EC145 helicopter" }, specificationsVerified: false, placeholder: false },
];
const seedDest: Destination[] = [
  { id: "ub", name: { mn: "Улаанбаатар", en: "Ulaanbaatar" }, lat: 47.92, lng: 106.92, focalX: 50, focalY: 50, alt: { mn: "Улаанбаатар", en: "Ulaanbaatar" }, placeholder: true },
  { id: "terelj", name: { mn: "Тэрэлж", en: "Terelj" }, lat: 47.95, lng: 107.45, focalX: 50, focalY: 50, alt: { mn: "Тэрэлж", en: "Terelj" }, placeholder: true },
  { id: "khuvsgul", name: { mn: "Хөвсгөл", en: "Khuvsgul" }, lat: 50.45, lng: 100.16, focalX: 50, focalY: 50, alt: { mn: "Хөвсгөл", en: "Khuvsgul" }, placeholder: true },
  { id: "gobi", name: { mn: "Говь", en: "Gobi" }, lat: 43.57, lng: 104.42, focalX: 50, focalY: 50, alt: { mn: "Говь", en: "Gobi" }, placeholder: true },
];

type AircraftRow = {
  id: string; name: string; seats: number | null; range_km: number | null;
  cruise_kmh: number | null; payload_kg: number | null; description_mn: string;
  description_en: string; image_key: string | null; is_placeholder: number;
  specification_source: string; specifications_verified: number; focal_x: number; focal_y: number;
  alt_mn: string; alt_en: string;
};
type DestinationRow = {
  id: string; name_mn: string; name_en: string; latitude: number; longitude: number;
  description_mn: string; description_en: string; image_key: string | null; is_placeholder: number;
  coordinate_source: string; coordinates_verified: number; focal_x: number; focal_y: number;
  alt_mn: string; alt_en: string;
};

export async function getFleet(): Promise<Aircraft[]> {
  const db = await getDatabase();
  if (!db) return seedFleet;
  const result = await db.prepare(
    `SELECT id, name, seats, range_km, cruise_kmh, payload_kg,
      description_mn, description_en, image_key, is_placeholder,
      specification_source, specifications_verified, COALESCE(display.focal_x, 50) AS focal_x,
      COALESCE(display.focal_y, 50) AS focal_y, COALESCE(display.alt_mn, name) AS alt_mn,
      COALESCE(display.alt_en, name) AS alt_en
    FROM aircraft LEFT JOIN aircraft_display display ON display.aircraft_id = aircraft.id
    WHERE is_published = 1 ORDER BY order_index`,
  ).all<AircraftRow>();
  if (!result.success) throw new Error(result.error ?? "Could not load aircraft from the database.");
  return result.results.map((row) => ({
    id: row.id,
    name: row.name,
    seats: row.specifications_verified === 1 ? row.seats ?? undefined : undefined,
    rangeKm: row.specifications_verified === 1 ? row.range_km ?? undefined : undefined,
    cruiseKmh: row.specifications_verified === 1 ? row.cruise_kmh ?? undefined : undefined,
    payloadKg: row.specifications_verified === 1 ? row.payload_kg ?? undefined : undefined,
    desc: { mn: row.description_mn, en: row.description_en },
    imageKey: row.image_key ?? undefined,
    focalX: row.focal_x,
    focalY: row.focal_y,
    alt: { mn: row.alt_mn || row.name, en: row.alt_en || row.name },
    placeholder: row.is_placeholder === 1,
    specificationSource: row.specifications_verified === 1 ? row.specification_source : undefined,
    specificationsVerified: row.specifications_verified === 1,
  }));
}

export async function getDestinations(): Promise<Destination[]> {
  const db = await getDatabase();
  if (!db) return seedDest;
  const result = await db.prepare(
    `SELECT id, name_mn, name_en, latitude, longitude, description_mn,
      description_en, image_key, is_placeholder, coordinate_source, coordinates_verified,
      COALESCE(display.focal_x, 50) AS focal_x, COALESCE(display.focal_y, 50) AS focal_y,
      COALESCE(display.alt_mn, name_mn) AS alt_mn, COALESCE(display.alt_en, name_en) AS alt_en
    FROM destinations LEFT JOIN destination_display display ON display.destination_id = destinations.id
    WHERE is_published = 1 ORDER BY order_index`,
  ).all<DestinationRow>();
  if (!result.success) throw new Error(result.error ?? "Could not load destinations from the database.");
  return result.results.map((row) => ({
    id: row.id,
    name: { mn: row.name_mn, en: row.name_en },
    lat: row.latitude,
    lng: row.longitude,
    desc: { mn: row.description_mn, en: row.description_en },
    imageKey: row.image_key ?? undefined,
    focalX: row.focal_x,
    focalY: row.focal_y,
    alt: { mn: row.alt_mn || row.name_mn, en: row.alt_en || row.name_en },
    placeholder: row.is_placeholder === 1,
    coordinateSource: row.coordinates_verified === 1 ? row.coordinate_source : undefined,
    coordinatesVerified: row.coordinates_verified === 1,
  }));
}

export async function getPricing(): Promise<PricingItem[]> {
  const db = await getDatabase();
  if (!db) return [];
  const result = await db.prepare(
    `SELECT id, kind, label_mn, label_en, note_mn, note_en, amount_minor, currency,
      unit, destination_id, aircraft_id, order_index
     FROM pricing_items WHERE is_published = 1 ORDER BY order_index, label_en`,
  ).all<{
    id: string; kind: PricingItem["kind"]; label_mn: string; label_en: string;
    note_mn: string; note_en: string; amount_minor: number; currency: string;
    unit: PricingItem["unit"]; destination_id: string | null; aircraft_id: string | null;
    order_index: number;
  }>();
  if (!result.success) throw new Error(result.error ?? "Could not load published prices from the database.");
  return result.results.map((row) => ({
    id: row.id,
    kind: row.kind,
    label: { mn: row.label_mn, en: row.label_en },
    note: { mn: row.note_mn, en: row.note_en },
    amountMinor: row.amount_minor,
    currency: row.currency,
    unit: row.unit,
    destinationId: row.destination_id,
    aircraftId: row.aircraft_id,
    orderIndex: row.order_index,
  }));
}

export async function getSiteCopy(locale: Locale): Promise<CmsCopy> {
  const db = await getDatabase();
  if (!db) return {};
  const result = await db.prepare(
    "SELECT key, value FROM site_copy WHERE locale = ?",
  ).bind(locale).all<{ key: string; value: string }>();
  if (!result.success) throw new Error(result.error ?? "Could not load website copy from the database.");

  const copy: CmsCopy = {};
  for (const row of result.results) {
    if (isCmsCopyKey(row.key)) copy[row.key] = row.value;
  }
  return copy;
}
