// Illustrative records for the development-only design preview. No live customer data.
import type { AdminQuote } from "@/lib/admin-types";

const base: AdminQuote = {
  id: "demo-001", locale: "en", name: "Demo guest", phone: "", email: "guest@example.com",
  organization: "", origin: "Ulaanbaatar", destination: "Terelj", round_trip: 1,
  flight_date: "2026-11-12", flight_time: "09:00", passengers: 4,
  notes: "Illustrative request for the design preview.", status: "requested",
  assigned_aircraft_id: null, operational_approved_by: null, operational_approved_at: null,
  created_at: "2026-11-01T09:30:00Z", updated_at: "2026-11-01T09:30:00Z",
};
export const previewQuotes: AdminQuote[] = [
  base,
  { ...base, id: "demo-002", name: "Demo company", destination: "Gobi", passengers: 3, status: "in_review" },
  { ...base, id: "demo-003", name: "Demo traveller", destination: "Khuvsgul", passengers: 2, status: "quoted" },
];
