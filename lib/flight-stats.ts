import type { Database } from "@/lib/db";

export type FlightStats = {
  total_km: number;
  total_hours: number;
  total_flights: number;
  as_of: string;
};

type StatsRow = {
  total_km: string | number;
  total_hours: string | number;
  total_flights: string | number;
  as_of: string;
};

export async function getPublicStats(db: Database | null): Promise<FlightStats> {
  if (!db) {
    if (process.env.NODE_ENV === "production") throw new Error("Database is unavailable.");
    console.warn("[stats] Database is not configured; displaying the empty local baseline.");
    return {
      total_km: 0,
      total_hours: 0,
      total_flights: 0,
      as_of: new Date().toISOString().slice(0, 10),
    };
  }
  const row = await db.transaction(async (tx) => {
    await tx.prepare("SELECT set_config('app.stats_view', 'on', true)").run();
    return tx.prepare(
      "SELECT total_km, total_hours, total_flights, as_of FROM public_stats",
    ).first<StatsRow>();
  });
  if (!row) throw new Error("The public_stats view returned no baseline row.");
  return {
    total_km: Number(row.total_km),
    total_hours: Number(row.total_hours),
    total_flights: Number(row.total_flights),
    as_of: row.as_of,
  };
}

export type PlannedLeg = {
  id: string;
  legOrder: number;
  origin: string;
  destination: string;
  plannedKm: number | null;
};

type LocationRow = {
  id: string;
  name_mn: string;
  name_en: string;
  latitude: number;
  longitude: number;
};

function normalizedLocation(value: string) {
  return value.trim().normalize("NFKC").toLocaleLowerCase();
}

export async function createPlannedLegs(
  db: Database,
  origin: string,
  destination: string,
  roundTrip: boolean,
): Promise<PlannedLeg[]> {
  const locations = await db.prepare(
    `SELECT id, name_mn, name_en, latitude, longitude
     FROM destinations
     WHERE coordinates_verified = 1 AND is_published = 1`,
  ).all<LocationRow>();
  const resolve = (label: string) => {
    const value = normalizedLocation(label);
    const matches = locations.results.filter((item) =>
      [item.id, item.name_mn, item.name_en].some((candidate) => normalizedLocation(candidate) === value),
    );
    return matches.length === 1 ? matches[0] : null;
  };

  const routes = [{ origin, destination }, ...(roundTrip ? [{ origin: destination, destination: origin }] : [])];
  return Promise.all(routes.map(async (route, index) => {
    const from = resolve(route.origin);
    const to = resolve(route.destination);
    let plannedKm: number | null = null;
    if (from && to) {
      const result = await db.prepare(
        "SELECT haversine_km(?, ?, ?, ?) AS planned_km",
      ).bind(from.latitude, from.longitude, to.latitude, to.longitude).first<{ planned_km: string | number }>();
      if (!result) throw new Error("Could not calculate the planned flight distance.");
      plannedKm = Number(result.planned_km);
    }
    return {
      id: `L-${crypto.randomUUID()}`,
      legOrder: index + 1,
      origin: route.origin,
      destination: route.destination,
      plannedKm,
    };
  }));
}
