export type AdminAircraft = {
  id: string;
  name: string;
  descriptionMn: string;
  descriptionEn: string;
  seats: number | null;
  rangeKm: number | null;
  cruiseKmh: number | null;
  payloadKg: number | null;
  imageKey: string | null;
  focalX: number;
  focalY: number;
  altMn: string;
  altEn: string;
  specificationSource: string;
  specificationsVerified: boolean;
  orderIndex: number;
  isPublished: boolean;
};

export type AdminDestination = {
  id: string;
  nameMn: string;
  nameEn: string;
  descriptionMn: string;
  descriptionEn: string;
  latitude: number;
  longitude: number;
  imageKey: string | null;
  focalX: number;
  focalY: number;
  altMn: string;
  altEn: string;
  coordinateSource: string;
  coordinatesVerified: boolean;
  orderIndex: number;
  isPublished: boolean;
};

export type QuoteStatus =
  | "requested" | "in_review" | "quoted" | "approved" | "confirmed" | "completed"
  | "declined" | "expired" | "closed";

export type AdminQuote = {
  service?: "charter" | "catering" | "photography";
  extras?: string[];
  id: string;
  locale: string;
  name: string;
  phone: string;
  email: string;
  organization: string;
  origin: string;
  destination: string;
  round_trip: number;
  flight_date: string;
  flight_time: string;
  passengers: number;
  notes: string;
  status: QuoteStatus;
  assigned_aircraft_id: string | null;
  operational_approved_by: string | null;
  operational_approved_at: string | null;
  created_at: string;
  updated_at: string;
};

export type QuoteRevision = {
  id: string;
  quote_id: string;
  revision: number;
  amount_minor: number;
  currency: string;
  terms: string;
  expires_at: string;
  status: "draft" | "sent" | "approved" | "declined" | "expired" | "superseded";
  sent_at: string | null;
  responded_at: string | null;
};

export type QuoteHistory = {
  id: number;
  quote_id: string;
  from_status: string | null;
  to_status: string;
  actor: string;
  note: string;
  created_at: string;
};

export type DispatchAircraft = { id: string; name: string; seats: number | null };
