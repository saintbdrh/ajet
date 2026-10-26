export type Weather =
  | { status: "available"; tempC: number; windMs: number; observedAt: string }
  | { status: "unavailable" };

// Server-side only. Cached 30 min so visitors never hit the provider directly.
// Returns null on any failure so the UI simply hides the widget.
export async function getWeather(lat: number, lng: number): Promise<Weather | null> {
  const key = process.env.OPENWEATHER_API_KEY;
  if (!key) return null;
  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&units=metric&appid=${key}`;
    const res = await fetch(url, { next: { revalidate: 1800 }, signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const j = (await res.json()) as { main?: { temp?: number }; wind?: { speed?: number }; dt?: number };
    if (
      typeof j.main?.temp !== "number" || typeof j.wind?.speed !== "number" ||
      typeof j.dt !== "number" || !Number.isFinite(j.dt)
    ) return { status: "unavailable" };
    return {
      status: "available",
      tempC: Math.round(j.main.temp),
      windMs: Math.round(j.wind.speed * 10) / 10,
      observedAt: new Date(j.dt * 1000).toISOString(),
    };
  } catch {
    return { status: "unavailable" };
  }
}
