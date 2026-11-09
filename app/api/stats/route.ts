import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { getPublicStats } from "@/lib/flight-stats";

export const runtime = "nodejs";

export async function GET() {
  try {
    const stats = await getPublicStats(await getDatabase());
    return NextResponse.json(stats, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600" },
    });
  } catch (error) {
    console.error("[stats] Could not load public flight statistics.", error);
    return NextResponse.json({ ok: false, error: "Flight statistics are temporarily unavailable." }, { status: 503 });
  }
}
